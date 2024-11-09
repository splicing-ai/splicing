import json
import logging

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, HumanMessage

from app.api.dependencies import RedisClient, get_redis_client
from app.api.endpoints.section import set_current_block
from app.generated.schema import ConversationPayload, SectionType
from app.utils.agent.checkpointer import AsyncRedisSaver
from app.utils.agent.graph import create_graph
from app.utils.agent.tools import CODE_GENERATOR_NAME
from app.utils.converse import (
    get_execution_error_user_message,
    get_generate_code_system_message,
    get_initial_messages,
)
from app.utils.helper import (
    CHUNK_DELIMITER,
    convert_message_to_dict,
    merge_if_anthropic_content_blocks,
)
from app.utils.project_helper import add_chat_messages, get_llm_for_project

router = APIRouter()

logger = logging.getLogger(__name__)


@router.post("/converse/{project_id}")
async def conversation(
    project_id: str,
    payload: ConversationPayload,
    redis_client: RedisClient = Depends(get_redis_client),
) -> StreamingResponse:
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

    hidden_user_messages = []
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
                hidden_user_messages.append(generate_code_system_message)
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
                    execution_error_user_message = get_execution_error_user_message(
                        section_type, error=execute_result["error"]
                    )
                    hidden_user_messages.append(execution_error_user_message)
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

    if hidden_user_messages:
        await graph.aupdate_state(
            config, {"messages": hidden_user_messages}, as_node="chatbot"
        )

    async def event_generator():
        async for msg, metadata in graph.astream(
            {"messages": [message]}, config, stream_mode="messages"
        ):
            if msg.content and metadata["langgraph_node"] == "chatbot":
                yield json.dumps(
                    {
                        "type": "message",
                        "data": merge_if_anthropic_content_blocks(msg.content),
                    }
                ) + CHUNK_DELIMITER

        snapshot = await graph.aget_state(config)
        response = snapshot.values["messages"][-1]
        logger.debug("CONVERSE - response: %s", response)
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
                chunk = {
                    "type": "message",
                    "data": response.content,
                }
                yield json.dumps(chunk) + CHUNK_DELIMITER
                break
            else:
                # trigger tool and stream the response
                async for event in graph.astream_events(None, config, version="v2"):
                    chunk = None
                    if (
                        event["event"] == "on_chat_model_stream"
                        and event["metadata"]["langgraph_node"] == "chatbot"
                        and event["data"]["chunk"].content
                    ):
                        chunk = {
                            "type": "message",
                            "data": merge_if_anthropic_content_blocks(
                                event["data"]["chunk"].content
                            ),
                        }
                    elif (
                        event["event"] == "on_custom_event"
                        and event["name"] == "generate-result"
                    ):
                        chunk = {
                            "type": "generate-result",
                            "data": json.dumps(event["data"]),
                        }
                    if chunk:
                        yield json.dumps(chunk) + CHUNK_DELIMITER

                # get the new snapshot
                snapshot = await graph.aget_state(config)
                response = snapshot.values["messages"][-1]

            logger.debug("CONVERSE - response: %s", response)

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")


@router.patch("/reset/{project_id}")
async def reset_conversation(
    project_id: str,
    redis_client: RedisClient = Depends(get_redis_client),
) -> list[dict[str, str]]:
    checkpointer = AsyncRedisSaver(redis_client.redis)
    await checkpointer.adelete_checkpoint(project_id)
    initial_messages = get_initial_messages()
    await add_chat_messages(redis_client, project_id, *initial_messages)
    return [convert_message_to_dict(message) for message in initial_messages]
