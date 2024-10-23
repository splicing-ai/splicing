from typing import TYPE_CHECKING, Annotated

from langchain_core.language_models import BaseChatModel
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langgraph.graph import START, StateGraph
from langgraph.graph.graph import CompiledGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from typing_extensions import TypedDict

from app.generated.schema import SectionType, LLMType
from app.utils.agent.checkpointer import AsyncRedisSaver
from app.utils.agent.tools import create_tools

if TYPE_CHECKING:
    from app.utils.redis_client import RedisClient


class State(TypedDict):
    messages: Annotated[list, add_messages]


def create_graph(
    redis_client: "RedisClient",
    llm: BaseChatModel,
    section_type: SectionType | None = None,
) -> CompiledGraph:
    graph_builder = StateGraph(State)
    
    # Determine the LLM type
    llm_type = LLMType.OPENAI if isinstance(llm, ChatOpenAI) else LLMType.ANTHROPIC if isinstance(llm, ChatAnthropic) else None

    if section_type:
        tools = create_tools(redis_client, section_type)
        
        # Adjust binding based on LLM type as Anthropic does not support parallel tool calls
        if llm_type == LLMType.OPENAI:
            llm_with_tools = llm.bind_tools(tools, parallel_tool_calls=False)
        elif llm_type == LLMType.ANTHROPIC:
            llm_with_tools = llm.bind_tools(tools)
        else:
            # Default behavior if LLM type is unknown
            llm_with_tools = llm.bind_tools(tools)

        def chatbot(state: State):
            return {"messages": [llm_with_tools.invoke(state["messages"])]}

        graph_builder.add_node("chatbot", chatbot)

        tool_node = ToolNode(tools=tools)
        graph_builder.add_node("tools", tool_node)

        graph_builder.add_conditional_edges(
            "chatbot",
            tools_condition,
        )
        graph_builder.add_edge("tools", "chatbot")
    else:

        def chatbot(state: State):
            return {"messages": [llm.invoke(state["messages"])]}

        graph_builder.add_node("chatbot", chatbot)

    graph_builder.add_edge(START, "chatbot")

    memory = AsyncRedisSaver(redis_client.redis)
    return graph_builder.compile(
        checkpointer=memory,
        interrupt_before=["tools"] if section_type else None,
    )
