import json
import logging
import os
from typing import Type

import yaml
from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage

from app.generated.schema import (
    CleaningGenerateResult,
    IntegrationType,
    MovementGenerateResult,
    OrchestrationGenerateResult,
    OrchestrationTool,
    SectionType,
    TransformationDbtGenerateResult,
    TransformationPythonGenerateResult,
    TransformationTool,
)
from app.utils.helper import get_schema, standardize_name
from app.utils.prompt_manager import PromptManager
from app.utils.types import GenerateResult

dir_path = os.path.dirname(os.path.realpath(__file__))
prompt_manager = PromptManager(os.path.join(dir_path, "prompts.yaml"))

logger = logging.getLogger(__name__)


def get_generate_result_type(
    section_type: SectionType, tool: str
) -> Type[GenerateResult]:
    if section_type == SectionType.MOVEMENT:
        return MovementGenerateResult
    elif section_type == SectionType.CLEANING:
        return CleaningGenerateResult
    elif section_type == SectionType.TRANSFORMATION:
        return (
            TransformationDbtGenerateResult
            if TransformationTool(tool) == TransformationTool.DBT
            else TransformationPythonGenerateResult
        )
    elif section_type == SectionType.ORCHESTRATION:
        return OrchestrationGenerateResult


async def generate_with_llm(
    *,
    llm: BaseChatModel,
    section_type: SectionType,
    integration_settings: dict,
    **kwargs,
) -> GenerateResult:
    system_message = prompt_manager.get_prompt(
        "generate", "system_message", section_type=section_type.value.lower()
    )
    user_message = build_user_message(section_type, integration_settings, **kwargs)
    messages = [
        SystemMessage(content=system_message),
        HumanMessage(content=user_message),
    ]
    generate_result_type = get_generate_result_type(section_type, kwargs["tool"])
    structured_llm = llm.with_structured_output(generate_result_type)

    # stream the response
    response = None
    async for chunk in structured_llm.astream(messages):
        await adispatch_custom_event("generate-result", chunk)
        response = chunk

    logger.debug("GENERATE CODE - messages: %s, response: %s", messages, response)
    return response


def build_user_message(
    section_type: SectionType, integration_settings: dict, **kwargs
) -> str:
    def parse_integration_settings(
        integration: str,
        integration_details: str,
        settings: dict | None,
        use_details_from_last_block: bool = False,
    ) -> tuple[str, str]:
        details_str = integration_details
        settings_instruction = ""
        if settings:
            sensitive_fields = settings.get("sensitiveFields", [])
            integration_details_from_settings = "\n".join(
                f"{k}: {v}"
                for k, v in settings.items()
                if k != "sensitiveFields" and k not in sensitive_fields
            )
            if use_details_from_last_block and (data_dict := kwargs.get("data_dict")):
                details_from_last_block = "\n".join(f"name: {k}" for k in data_dict)
            else:
                details_from_last_block = ""
            details_str = f"{integration_details_from_settings}\n{details_from_last_block}\n{integration_details}"
            if any(settings[k] for k in sensitive_fields):
                sensitive_settings_yaml = yaml.dump(
                    {
                        standardize_name(integration): {
                            key: "..." for key in sensitive_fields
                        }
                    },
                    default_flow_style=False,
                )
                settings_instruction = prompt_manager.get_prompt(
                    "generate",
                    "sensitive_settings_instruction",
                    info=sensitive_settings_yaml,
                )
        return details_str, settings_instruction

    context_instruction = prompt_manager.get_prompt(
        "generate",
        "context_instruction",
        section_type=section_type.value.lower(),
        context=kwargs["context"],
    )
    if section_type == SectionType.MOVEMENT:
        source, source_details = kwargs["source"], kwargs["sourceDetails"]
        source_details_str, source_settings_instruction = parse_integration_settings(
            source,
            source_details,
            integration_settings.get(source),
            use_details_from_last_block=True,
        )
        destination, destination_details = (
            kwargs["destination"],
            kwargs["destinationDetails"],
        )
        (
            destination_details_str,
            destination_settings_instruction,
        ) = parse_integration_settings(
            destination, destination_details, integration_settings.get(destination)
        )
        sensitive_settings_instruction = (
            f"{source_settings_instruction}\n{destination_settings_instruction}"
        )
        source_python_environment_instruction = prompt_manager.get_prompt(
            "generate",
            "source_python_environment_instruction"
            if IntegrationType(source) == IntegrationType.PYTHON
            else "not_source_python_environment_instruction",
        )
        function_instruction = prompt_manager.get_prompt(
            "generate",
            "python_function_instruction",
            sensitive_settings_instruction=sensitive_settings_instruction,
            source_python_environment_instruction=source_python_environment_instruction,
        )
        example = prompt_manager.get_prompt(
            "generate",
            "python_function_movement_example",
        )
        return prompt_manager.get_prompt(
            "generate",
            "user_message",
            section_type.value.lower(),
            context_instruction=context_instruction,
            source=source,
            sourceDetails=source_details_str,
            destination=destination,
            destinationDetails=destination_details_str,
            function_instruction=function_instruction,
            example=example,
        )
    elif section_type in [SectionType.CLEANING, SectionType.TRANSFORMATION]:
        source, source_details = kwargs["source"], kwargs["sourceDetails"]
        source_details_str, source_settings_instruction = parse_integration_settings(
            source,
            source_details,
            integration_settings.get(source),
            use_details_from_last_block=True,
        )
        data_dict, tool = kwargs["data_dict"], kwargs["tool"]
        if data_dict:
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
            data_instruction = prompt_manager.get_prompt(
                "data_instruction",
                "with_data",
                dataset_summary="\n".join(dataset_summary),
                context=source_details_str,
            )
        elif source_details_str:
            data_instruction = prompt_manager.get_prompt(
                "data_instruction",
                "without_data",
                details=source_details_str,
            )
        else:
            data_instruction = ""
        if (
            section_type == SectionType.TRANSFORMATION
            and TransformationTool(tool) == TransformationTool.DBT
        ):
            function_instruction = prompt_manager.get_prompt(
                "generate",
                "dbt_model_instruction",
                source=source,
            )
            example = ""
        else:
            source_python_environment_instruction = prompt_manager.get_prompt(
                "generate",
                "source_python_environment_instruction"
                if IntegrationType(source) == IntegrationType.PYTHON
                else "not_source_python_environment_instruction",
            )
            function_instruction = prompt_manager.get_prompt(
                "generate",
                "python_function_instruction",
                sensitive_settings_instruction=source_settings_instruction,
                source_python_environment_instruction=source_python_environment_instruction,
            )
            example = prompt_manager.get_prompt(
                "generate",
                f"python_function_{section_type.value.lower()}_example",
            )

        return prompt_manager.get_prompt(
            "generate",
            "user_message",
            section_type.value.lower(),
            context_instruction=context_instruction,
            source=source,
            tool=tool,
            data_instruction=data_instruction,
            function_instruction=function_instruction,
            example=example,
        )
    elif section_type == SectionType.ORCHESTRATION:
        return prompt_manager.get_prompt(
            "generate",
            "user_message",
            section_type.value.lower(),
            description=kwargs["description"] or "",
            context_instruction=context_instruction,
            adj_list=json.dumps(kwargs["adj_list"], indent=4, separators=(",", ": ")),
            node_definitions=json.dumps(
                kwargs["node_definitions"], indent=4, separators=(",", ": ")
            ),
        )


def update_generate_result(
    *,
    llm: BaseChatModel,
    section_type: SectionType,
    generate_result: dict,
    tool: str,
    modified_code: list[str],
) -> GenerateResult:
    system_message = prompt_manager.get_prompt(
        "generate", "system_message", section_type=section_type.value.lower()
    )
    if (
        section_type == SectionType.TRANSFORMATION
        and TransformationTool(tool) == TransformationTool.DBT
    ):
        change = {"model": modified_code[0], "properties": modified_code[1]}
        example = prompt_manager.get_prompt(
            "generate",
            "dbt_update_generate_result_example",
        )
    else:
        change = {"code": modified_code[0]}
        if (
            section_type == SectionType.ORCHESTRATION
            and OrchestrationTool(section_type) == OrchestrationTool.AIRFLOW
        ):
            example = prompt_manager.get_prompt(
                "generate",
                "airflow_update_generate_result_example",
            )
        else:
            example = prompt_manager.get_prompt(
                "generate",
                "python_update_generate_result_example",
            )

    user_message = prompt_manager.get_prompt(
        "generate",
        "update_generate_result_user_message",
        previous_result=generate_result,
        change=json.dumps(change, indent=4, separators=(",", ": ")),
        example=example,
    )
    messages = [
        SystemMessage(content=system_message),
        HumanMessage(content=user_message),
    ]
    generate_result_type = get_generate_result_type(section_type, tool)
    structured_llm = llm.with_structured_output(
        generate_result_type, method="json_mode"
    )
    response = structured_llm.invoke(messages)
    logger.debug(
        "UPDATE GENERATE RESULT - messages: %s, response: %s", messages, response
    )
    # we need to include `change` again because code part is set to null
    return generate_result_type(**{**response.dict(), **change})
