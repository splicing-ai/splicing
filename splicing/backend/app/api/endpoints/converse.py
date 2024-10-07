from fastapi import APIRouter, Depends
from langchain_core.messages import AIMessage, HumanMessage

from app.api.dependencies import RedisClient, get_redis_client
from app.api.endpoints.section import set_current_block
from app.schema import ConversationPayload
from app.utils.agent.checkpointer import AsyncRedisSaver
from app.utils.agent.graph import create_graph
from app.utils.agent.tools import CODE_GENERATOR_NAME
from app.utils.converse import (
    get_execution_error_system_message,
    get_generate_code_system_message,
    get_initial_messages,
)
from app.utils.helper import convert_message_to_dict
from app.utils.project_helper import add_chat_messages, get_llm_for_project
from app.utils.types import SectionType

router = APIRouter()


@router.post("/converse/{project_id}")
async def conversation(
    project_id: str,
    payload: ConversationPayload,
    redis_client: RedisClient = Depends(get_redis_client),
) -> dict[str, str]:
    section_id = payload.currentSectionId
    block_id = await redis_client.get_section_data(
        project_id, section_id, "current_block_id"
    )
    section_type, block_setup = None, None
    if section_id:
        section_metadata = await redis_client.get_section_data(
            project_id, section_id, "metadata"
        )
        section_type = SectionType(section_metadata["sectionType"])
        if block_id:
            block_setup = await redis_client.get_block_data(
                project_id, section_id, block_id, "setup"
            )
            await set_current_block(project_id, section_id, block_id, redis_client)

    system_messages = []
    if section_id and block_id:
        # It's possible the value is None, which means this section/block doesn't exist anymore,
        # or the block is not in that session
        is_generate_result_added_to_conversation = await redis_client.get_block_data(
            project_id, section_id, block_id, "is_generate_result_added_to_conversation"
        )
        if is_generate_result_added_to_conversation is False:
            generate_result = await redis_client.get_block_data(
                project_id, section_id, block_id, "generate_result"
            )
            if block_setup is not None and generate_result is not None:
                generate_code_system_message = get_generate_code_system_message(
                    section_type,
                    tool=block_setup["tool"],
                    **generate_result,
                )
                system_messages.append(generate_code_system_message)
                await redis_client.set_block_data(
                    project_id,
                    section_id,
                    block_id,
                    "is_generate_result_added_to_conversation",
                    True,
                )

        is_execution_error_added_to_conversation = await redis_client.get_block_data(
            project_id, section_id, block_id, "is_execution_error_added_to_conversation"
        )
        if is_execution_error_added_to_conversation is False:
            execute_result = await redis_client.get_block_data(
                project_id, section_id, block_id, "execute_result"
            )
            if execute_result is not None:
                error = execute_result.get("error")
                if error:
                    execution_error_system_message = get_execution_error_system_message(
                        section_type, error=execute_result["error"]
                    )
                    system_messages.append(execution_error_system_message)
                    await redis_client.set_block_data(
                        project_id,
                        section_id,
                        block_id,
                        "is_execution_error_added_to_conversation",
                        True,
                    )

    message = HumanMessage(content=payload.message["content"])
    llm = await get_llm_for_project(redis_client, project_id)
    graph = create_graph(redis_client, llm, section_type)
    config = {
        "configurable": {
            "thread_id": project_id,
            "section_id": section_id,
            "block_id": block_id,
        }
    }

    if system_messages:
        await graph.aupdate_state(
            config, {"messages": system_messages}, as_node="chatbot"
        )

    await graph.ainvoke({"messages": [message]}, config)
    snapshot = await graph.aget_state(config)
    response = snapshot.values["messages"][-1]
    while snapshot.next == ("tools",):
        tool_call = response.tool_calls[0]
        tool = tool_call["name"]
        new_message = None
        if tool == CODE_GENERATOR_NAME:
            if block_setup is None:
                new_message = "Please select a block or complete setup of the current block before asking for code generation."
        if new_message:
            # replace the original message
            response = AIMessage(content=new_message, id=response.id)
            await graph.aupdate_state(
                config, {"messages": [response]}, as_node="chatbot"
            )
            break
        else:
            # trigger tool
            result = await graph.ainvoke(None, config)
            response = result["messages"][-1]
        snapshot = await graph.aget_state(config)
    # print(snapshot)
    return convert_message_to_dict(response)


@router.patch("/reset/{project_id}")
async def reset_conversation(
    project_id: str,
    redis_client: RedisClient = Depends(get_redis_client),
):
    checkpointer = AsyncRedisSaver(redis_client.redis)
    await checkpointer.adelete_checkpoint(project_id)
    initial_messages = get_initial_messages()
    await add_chat_messages(redis_client, project_id, *initial_messages)
    return [convert_message_to_dict(message) for message in initial_messages]
