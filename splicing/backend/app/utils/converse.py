import os

from langchain_core.messages import AIMessage, BaseMessage, SystemMessage, HumanMessage

from app.generated.schema import SectionType, TransformationTool
from app.utils.prompt_manager import PromptManager

dir_path = os.path.dirname(os.path.realpath(__file__))
prompt_manager = PromptManager(os.path.join(dir_path, "prompts.yaml"))


def get_initial_messages() -> list[BaseMessage]:
    return [
        SystemMessage(
            content=prompt_manager.get_prompt("conversation", "initial_system_message"),
        ),
        AIMessage(
            content=prompt_manager.get_prompt(
                "conversation", "initial_assistant_message"
            ),
        ),
    ]


def get_section_update_context_message(
    section_type: SectionType, block_setup: dict | None
) -> BaseMessage:
    filtered_keys = {"sourceSectionId", "sourceBlockId"}
    block_setup_str = (
        "\n".join(
            [
                f"{key}: {value}"
                for key, value in block_setup.items()
                if key not in filtered_keys
            ]
        )
        if block_setup
        else None
    )
    if block_setup_str:
        context = f"Here is some information about current data engineering tasks:\n{block_setup_str}"
    else:
        context = ""
    content = prompt_manager.get_prompt(
        "conversation",
        "section_update_context_message",
        section_type=section_type.value.lower(),
        context=context,
    )
    return HumanMessage(content=content)


def get_generate_code_context_message(
    section_type: SectionType, tool: str, **kwargs
) -> BaseMessage:
    if (
        section_type == SectionType.TRANSFORMATION
        and TransformationTool(tool) == TransformationTool.DBT
    ):
        content = prompt_manager.get_prompt(
            "conversation", "generate_dbt_code_context_message", **kwargs
        )
    else:
        content = prompt_manager.get_prompt(
            "conversation",
            "generate_python_code_context_message",
            section_type=section_type.value.lower(),
            **kwargs,
        )
    return HumanMessage(content=content)


def get_execution_error_context_message(
    section_type: SectionType, **kwargs
) -> BaseMessage:
    content = prompt_manager.get_prompt(
        "conversation",
        "execution_error_context_message",
        section_type=section_type.value.lower(),
        **kwargs,
    )
    return HumanMessage(content=content)
