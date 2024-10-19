import logging
import os
from collections import defaultdict

import pandas as pd
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import BaseMessage

from app.core.config import settings
from app.generated.schema import (
    LLMType,
    SectionType,
    SettingsSectionType,
    TransformationTool,
)
from app.utils.agent.graph import create_graph
from app.utils.converse import get_context_update_system_message
from app.utils.helper import deserialize_df, get_llm, serialize_df, standardize_name
from app.utils.redis_client import RedisClient

logger = logging.getLogger(__name__)


def get_app_dir() -> str:
    return os.path.join(settings.SOURCE_DIR, f".{settings.APP_NAME.lower()}")


async def get_project_dir(redis_client: RedisClient, project_id: str) -> str:
    project_metadata = await redis_client.get_project_data(project_id, "metadata")
    return project_metadata.get("projectDir", get_app_dir())


async def get_llm_for_project(
    redis_client: RedisClient, project_id: str
) -> BaseChatModel:
    project_metadata = await redis_client.get_project_data(project_id, "metadata")
    llm_type = LLMType(project_metadata["llm"])
    settings = await redis_client.get_settings_data(
        SettingsSectionType.LLM.value, llm_type.value
    )
    return get_llm(llm_type, settings)


async def add_chat_messages(
    redis_client: RedisClient, project_id: str, *messages: BaseMessage
) -> None:
    llm = await get_llm_for_project(redis_client, project_id)
    graph = create_graph(redis_client, llm)
    config = {"configurable": {"thread_id": project_id}}
    await graph.aupdate_state(config, {"messages": list(messages)}, as_node="chatbot")


async def get_chat_history(
    redis_client: RedisClient, project_id: str
) -> list[BaseMessage]:
    llm = await get_llm_for_project(redis_client, project_id)
    graph = create_graph(redis_client, llm)
    config = {"configurable": {"thread_id": project_id}}
    snapshot = await graph.aget_state(config)
    return snapshot.values["messages"]


async def set_data_dict_in_block(
    redis_client: RedisClient,
    project_id: str,
    section_id: str,
    block_id: str,
    data_dict: dict[str, pd.DataFrame],
) -> None:
    serialized_dict = {k: serialize_df(v) for k, v in data_dict.items()}
    await redis_client.set_block_data(
        project_id, section_id, block_id, "data", serialized_dict
    )


async def get_data_dict_in_block(
    redis_client: RedisClient, project_id: str, section_id: str, block_id: str
) -> dict[str, pd.DataFrame]:
    serialized_dict = await redis_client.get_block_data(
        project_id, section_id, block_id, "data"
    )
    if serialized_dict is None:
        return {}
    return {k: deserialize_df(v) for k, v in serialized_dict.items()}


async def context_update(
    redis_client: RedisClient,
    project_id: str,
    section_id: str,
    block_id: str,
    is_block_setup_updated: bool = False,
) -> None:
    # every time when we switch the section or work on a new block, we need to let LLM know
    # It's possible the value is None, which means there is no section before
    last_worked_section_id = await redis_client.get_project_data(
        project_id, "last_worked_section_id"
    )
    if last_worked_section_id != section_id:
        await redis_client.set_project_data(
            project_id, "last_worked_section_id", section_id
        )
        add_sys_msg = True
    else:
        current_block_id = await redis_client.get_section_data(
            project_id, section_id, "current_block_id"
        )
        add_sys_msg = is_block_setup_updated or bool(current_block_id != block_id)
    if add_sys_msg:
        section_metadata = await redis_client.get_section_data(
            project_id, section_id, "metadata"
        )
        block_setup = await redis_client.get_block_data(
            project_id, section_id, block_id, "setup"
        )
        system_message = get_context_update_system_message(
            SectionType(section_metadata["sectionType"]), block_setup
        )
        await add_chat_messages(redis_client, project_id, system_message)


async def build_dag(redis_client: RedisClient, project_id: str) -> dict[str, dict]:
    section_ids = await redis_client.get_all_section_ids(project_id)
    node_definitions, adj_list = {}, defaultdict(list)
    for section_id in section_ids:
        section_metadata = await redis_client.get_section_data(
            project_id, section_id, "metadata"
        )
        section_type = SectionType(section_metadata["sectionType"])
        if section_type != SectionType.ORCHESTRATION:
            block_ids = await redis_client.get_all_block_ids(project_id, section_id)
            for block_id in block_ids:
                block_setup = await redis_client.get_block_data(
                    project_id, section_id, block_id, "setup"
                )
                generate_result = await redis_client.get_block_data(
                    project_id, section_id, block_id, "generate_result"
                )
                section_file_name = standardize_name(
                    f"{section_type.value.lower()}_{section_metadata['title']}"
                )
                if block_setup is not None and generate_result is not None:
                    tool = block_setup["tool"]
                    if (
                        section_type == SectionType.TRANSFORMATION
                        and TransformationTool(tool) == TransformationTool.DBT
                    ):
                        required_fields = {
                            k: v
                            for k, v in generate_result.items()
                            if k not in ["model", "properties"]
                        }
                        project_name = section_file_name
                        target = standardize_name(block_setup["source"])
                        node_definitions[block_id] = {
                            **required_fields,
                            "tool": tool,
                            "project_name": project_name,
                            "project_dir": project_name,
                            "profile_name": project_name,
                            "profile_dir": "dbt_profiles",
                            "target": target,
                        }
                    else:
                        required_fields = {
                            k: v for k, v in generate_result.items() if k != "code"
                        }
                        python_file_name = f"{section_file_name}.py"
                        node_definitions[block_id] = {
                            **required_fields,
                            "tool": tool,
                            "file": python_file_name,
                        }
                    source_section_id = block_setup.get("sourceSectionId")
                    source_block_id = block_setup.get("sourceBlockId")
                    if source_section_id and source_block_id:
                        adj_list[source_block_id].append(block_id)

    # ensure all node is in adjacent list even if it has no outgoing edges
    for node in node_definitions:
        if node not in adj_list:
            adj_list[node] = []

    logger.debug(
        "BUILD DAG - node definitions: %s, adjacent list: %s",
        node_definitions,
        adj_list,
    )
    return {"node_definitions": node_definitions, "adj_list": adj_list}
