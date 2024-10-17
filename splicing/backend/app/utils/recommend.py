import logging
import os

import pandas as pd
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from pydantic import BaseModel

from app.generated.schema import SectionType
from app.utils.helper import get_schema
from app.utils.prompt_manager import PromptManager

dir_path = os.path.dirname(os.path.realpath(__file__))
prompt_manager = PromptManager(os.path.join(dir_path, "prompts.yaml"))

logger = logging.getLogger(__name__)


class RecommendResult(BaseModel):
    recommendations: list[str] | None


def recommend(
    *,
    llm: BaseChatModel,
    section_type: SectionType,
    data_dict: dict[str, pd.DataFrame],
    **kwargs,
) -> list[str] | None:
    system_message = prompt_manager.get_prompt(
        "recommend", "system_message", section_type=section_type.value.lower()
    )
    dataset_summary = []
    for name, data in data_dict.items():
        schema = get_schema(data)
        dataset_summary.append(
            prompt_manager.get_prompt(
                "data_instruction",
                "dataset_summary",
                dataset_name=name,
                schema=schema,
            )
        )
    # we don't need source details to give recommendations
    data_instruction = prompt_manager.get_prompt(
        "data_instruction",
        "with_data",
        dataset_summary="\n".join(dataset_summary),
        context="",
    )
    user_message = prompt_manager.get_prompt(
        "recommend",
        "user_message",
        section_type.value.lower(),
        data_instruction=data_instruction,
        **kwargs,
    )
    messages = [
        SystemMessage(content=system_message),
        HumanMessage(content=user_message),
    ]
    structured_llm = llm.with_structured_output(RecommendResult, method="json_mode")
    response = structured_llm.invoke(messages)
    logger.debug("RECOMMEND - messages: %s, response: %s", messages, response)
    return response.recommendations


def get_recommend_assistant_message(
    section_type: SectionType, recommendations: list[str]
) -> BaseMessage:
    recommendations_str = "\n".join(
        f"{idx+1}. {item}" for idx, item in enumerate(recommendations)
    )
    content = prompt_manager.get_prompt(
        "recommend",
        "assistant_message",
        section_type=section_type.value.lower(),
        recommendations=recommendations_str,
    )
    return AIMessage(content=content)
