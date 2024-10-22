import os.path

import pandas as pd
from fastapi import APIRouter, Depends, Response, status
from langchain_core.messages import ToolMessage

from app.api.dependencies import RedisClient, get_redis_client
from app.api.endpoints.section import set_current_block
from app.generated.schema import (
    BlockMetadata,
    ExecuteResult,
    ExecuteReturn,
    IntegrationType,
    SectionType,
    SettingsSectionType,
    TransformationTool,
    UpdateCodePayload,
)
from app.utils.execute import (
    create_dbt_profile,
    execute_dbt,
    execute_python,
    init_dbt_project,
    install_packages,
)
from app.utils.generate import (
    generate_with_llm,
    get_generate_result_type,
    update_generate_result,
)
from app.utils.helper import (
    convert_message_to_dict,
    format_exception_message,
    generate_id,
)
from app.utils.project_helper import (
    add_chat_messages,
    build_dag,
    context_update,
    get_chat_history,
    get_data_dict_in_block,
    get_dbt_project_name,
    get_llm_for_project,
    get_project_dir,
    set_data_dict_in_block,
)
from app.utils.read_data import read_df_from_integration
from app.utils.recommend import get_recommend_assistant_message, recommend
from app.utils.types import BlockSetup, GenerateResult

router = APIRouter()


@router.post("/add/{project_id}/{section_id}")
async def add(
    project_id: str,
    section_id: str,
    payload: BlockMetadata,
    redis_client: RedisClient = Depends(get_redis_client),
) -> str:
    block_id = generate_id()
    await redis_client.set_block_data(
        project_id, section_id, block_id, "metadata", {"id": block_id, **payload.dict()}
    )
    await redis_client.add_block_id(project_id, section_id, block_id)
    # set this block as current block if it's the first one
    all_block_ids = await redis_client.get_all_block_ids(project_id, section_id)
    if len(all_block_ids) == 1:
        await set_current_block(project_id, section_id, block_id, redis_client)
    return block_id


@router.delete("/delete/{project_id}/{section_id}/{block_id}")
async def delete(
    project_id: str,
    section_id: str,
    block_id: str,
    redis_client: RedisClient = Depends(get_redis_client),
) -> Response:
    await redis_client.delete_all_block_data(project_id, section_id, block_id)
    await redis_client.delete_block_id(project_id, section_id, block_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/reset/{project_id}/{section_id}/{block_id}")
async def reset(
    project_id: str,
    section_id: str,
    block_id: str,
    redis_client: RedisClient = Depends(get_redis_client),
) -> Response:
    block_metadata = await redis_client.get_block_data(
        project_id, section_id, block_id, "metadata"
    )
    await redis_client.delete_all_block_data(project_id, section_id, block_id)
    await redis_client.set_block_data(
        project_id, section_id, block_id, "metadata", block_metadata
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/setup/{project_id}/{section_id}/{block_id}")
async def setup(
    project_id: str,
    section_id: str,
    block_id: str,
    payload: BlockSetup,
    redis_client: RedisClient = Depends(get_redis_client),
) -> dict[str, str] | None:
    await redis_client.set_block_data(
        project_id, section_id, block_id, "setup", payload.dict()
    )
    section_metadata = await redis_client.get_section_data(
        project_id, section_id, "metadata"
    )
    section_type = SectionType(section_metadata["sectionType"])
    if (
        section_type == SectionType.TRANSFORMATION
        and TransformationTool(payload.tool) == TransformationTool.DBT
    ):
        integration_type = IntegrationType(payload.source)
        settings = await redis_client.get_settings_data(
            SettingsSectionType.INTEGRATION.value, payload.source
        )
        working_dir = await get_project_dir(redis_client, project_id)
        profiles_dir = os.path.join(working_dir, "dbt_profiles")
        project_name = get_dbt_project_name(section_type, section_metadata["title"])
        create_dbt_profile(project_name, profiles_dir, integration_type, settings)
    message = await recommend_techniques(
        project_id, section_id, block_id, payload, redis_client
    )
    await context_update(
        redis_client, project_id, section_id, block_id, is_block_setup_updated=True
    )
    await redis_client.set_section_data(
        project_id, section_id, "current_block_id", block_id
    )
    return message


@router.delete("/reset_setup/{project_id}/{section_id}/{block_id}")
async def reset_setup(
    project_id: str,
    section_id: str,
    block_id: str,
    redis_client: RedisClient = Depends(get_redis_client),
) -> Response:
    await redis_client.delete_block_data(project_id, section_id, block_id, "setup")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/generate/{project_id}/{section_id}/{block_id}")
async def generate_code(
    project_id: str,
    section_id: str,
    block_id: str,
    redis_client: RedisClient = Depends(get_redis_client),
) -> GenerateResult:
    integration_settings = await redis_client.get_settings_data(
        SettingsSectionType.INTEGRATION.value
    )
    llm = await get_llm_for_project(redis_client, project_id)
    section_metadata = await redis_client.get_section_data(
        project_id, section_id, "metadata"
    )
    section_type = SectionType(section_metadata["sectionType"])
    block_setup = await redis_client.get_block_data(
        project_id, section_id, block_id, "setup"
    )
    if section_type == SectionType.ORCHESTRATION:
        dag = await build_dag(redis_client, project_id)
        kwargs = {**block_setup, **dag}
    else:
        source_section_id = block_setup["sourceSectionId"]
        source_block_id = block_setup["sourceBlockId"]
        if source_section_id and source_block_id:
            if section_type in [SectionType.CLEANING, SectionType.TRANSFORMATION]:
                data_dict = await get_data_dict_in_block(
                    redis_client,
                    project_id,
                    source_section_id,
                    source_block_id,
                )
            else:
                data_dict = {}
        else:
            source = block_setup["source"]
            source_details = block_setup["sourceDetails"]
            data_dict = read_df_from_integration(
                llm=llm,
                source=source,
                source_details=source_details,
                generate_result=None,
                integration_settings=integration_settings,
            )
        kwargs = {
            **block_setup,
            "data_dict": data_dict,
        }
    await set_current_block(project_id, section_id, block_id, redis_client)

    integration_settings = await redis_client.get_settings_data(
        SettingsSectionType.INTEGRATION.value
    )
    messages = [
        convert_message_to_dict(message)
        for message in await get_chat_history(redis_client, project_id)
        if not isinstance(message, ToolMessage)
    ]
    context = "\n".join(
        f"{message['role']}: {message['content']}" for message in messages
    )
    result = generate_with_llm(
        llm=llm,
        section_type=section_type,
        integration_settings=integration_settings,
        context=context,
        **kwargs,
    )

    if (
        section_type == SectionType.TRANSFORMATION
        and TransformationTool(block_setup["tool"]) == TransformationTool.DBT
    ):
        working_dir = await get_project_dir(redis_client, project_id)
        dbt_project_name = get_dbt_project_name(section_type, section_metadata["title"])
        # we need to initialize a dbt project first because after generation, code can be downloaded
        init_dbt_project(
            dbt_project_name,
            working_dir,
        )
    await redis_client.set_block_data(
        project_id, section_id, block_id, "generate_result", result.dict()
    )
    await redis_client.set_block_data(
        project_id,
        section_id,
        block_id,
        "is_generate_result_added_to_conversation",
        False,
    )
    return result


@router.post("/execute/{project_id}/{section_id}/{block_id}")
async def execute_code(
    project_id: str,
    section_id: str,
    block_id: str,
    payload: UpdateCodePayload | None = None,
    redis_client: RedisClient = Depends(get_redis_client),
) -> ExecuteReturn:
    section_metadata = await redis_client.get_section_data(
        project_id, section_id, "metadata"
    )
    section_type = SectionType(section_metadata["sectionType"])
    block_setup = await redis_client.get_block_data(
        project_id, section_id, block_id, "setup"
    )
    block_metadata = await redis_client.get_block_data(
        project_id, section_id, block_id, "metadata"
    )
    await set_current_block(project_id, section_id, block_id, redis_client)
    if payload:
        generate_result = await save_code(
            project_id, section_id, block_id, payload, redis_client
        )
        generate_result_updated = True
    else:
        generate_result = await redis_client.get_block_data(
            project_id, section_id, block_id, "generate_result"
        )
        generate_result = get_generate_result_type(section_type, block_setup["tool"])(
            **generate_result
        )
        generate_result_updated = False

    # execute
    working_dir = await get_project_dir(redis_client, project_id)
    if (
        section_type == SectionType.TRANSFORMATION
        and TransformationTool(block_setup["tool"]) == TransformationTool.DBT
    ):
        result, exception = execute_dbt(
            model_name=generate_result.modelName,
            model=generate_result.model,
            properties=generate_result.properties,
            project_name=get_dbt_project_name(section_type, section_metadata["title"]),
            integration_type=IntegrationType(block_setup["source"]),
            working_dir=working_dir,
        )
    else:
        source_section_id = block_setup["sourceSectionId"]
        source_block_id = block_setup["sourceBlockId"]
        function_args = generate_result.functionArgs
        files_to_copy = ["credentials.yml"]
        if (
            IntegrationType(block_setup["source"]) == IntegrationType.PYTHON
            and source_section_id
            and source_block_id
        ):
            data_dict = await get_data_dict_in_block(
                redis_client,
                project_id,
                source_section_id,
                source_block_id,
            )
            # assume Python environment only supports one dataset
            function_args = {**function_args, "df": list(data_dict.values())[0]}
        if section_type != SectionType.ORCHESTRATION and (
            IntegrationType(block_setup["source"]) == IntegrationType.BIGQUERY
            or (
                section_type == SectionType.MOVEMENT
                and IntegrationType(block_setup["destination"])
                == IntegrationType.BIGQUERY
            )
        ):
            bq_settings = await redis_client.get_settings_data(
                SettingsSectionType.INTEGRATION.value, IntegrationType.BIGQUERY.value
            )
            files_to_copy.append(bq_settings["serviceAccountKeyFileName"])

        if generate_result.packages:
            install_packages(generate_result.packages)

        result, exception = execute_python(
            code=generate_result.code,
            function_name=generate_result.functionName,
            function_args=function_args,
            working_dir=working_dir,
            files_to_copy=files_to_copy,
        )

    # parse result and read data
    data_dict, error_message = {}, None
    if exception is None:
        if (
            section_type == SectionType.MOVEMENT
            and IntegrationType(block_setup["destination"]) == IntegrationType.PYTHON
        ) or (
            section_type in [SectionType.CLEANING, SectionType.TRANSFORMATION]
            and IntegrationType(block_setup["source"]) == IntegrationType.PYTHON
        ):
            if isinstance(result, pd.DataFrame):
                data_dict["result"] = result
            elif isinstance(result, pd.Series):
                data_dict["result"] = result.to_frame()
            else:
                exception = TypeError(
                    f"Return value must be a pandas DataFrame or Series, but got {type(result)}"
                )
        else:
            if section_type == SectionType.MOVEMENT:
                source = block_setup["destination"]
                source_details = block_setup["destinationDetails"]
            else:
                source = block_setup["source"]
                source_details = block_setup["sourceDetails"]
            try:
                llm = await get_llm_for_project(redis_client, project_id)
                integration_settings = await redis_client.get_settings_data(
                    SettingsSectionType.INTEGRATION.value
                )
                data_dict = read_df_from_integration(
                    llm=llm,
                    source=source,
                    source_details=source_details,
                    generate_result=generate_result.dict(),
                    integration_settings=integration_settings,
                )
            except Exception as ex:
                exception = ex
    # some exceptions can be added by us
    if exception is not None:
        error_message = (
            format_exception_message(exception)
            if isinstance(exception, Exception)
            else exception
        )
    if not data_dict:
        await redis_client.delete_block_data(project_id, section_id, block_id, "data")
        return_value = str(result)
    else:
        await set_data_dict_in_block(
            redis_client, project_id, section_id, block_id, data_dict
        )
        # if data is available, we don't need return value
        return_value = None

    execute_result = ExecuteResult(returnValue=return_value, error=error_message)
    await redis_client.set_block_data(
        project_id, section_id, block_id, "execute_result", execute_result.dict()
    )
    if error_message:
        await redis_client.set_block_data(
            project_id,
            section_id,
            block_id,
            "is_execution_error_added_to_conversation",
            False,
        )
    return ExecuteReturn(
        data={
            k: v.head(block_metadata["numRows"]).to_json(
                orient="records", date_format="iso"
            )
            for k, v in data_dict.items()
        },
        executeResult=execute_result,
        generateResult=generate_result if generate_result_updated else None,
    )


@router.patch("/save/{project_id}/{section_id}/{block_id}")
async def save_code(
    project_id: str,
    section_id: str,
    block_id: str,
    payload: UpdateCodePayload,
    redis_client: RedisClient = Depends(get_redis_client),
) -> GenerateResult:
    generate_result = await redis_client.get_block_data(
        project_id, section_id, block_id, "generate_result"
    )
    section_metadata = await redis_client.get_section_data(
        project_id, section_id, "metadata"
    )
    block_setup = await redis_client.get_block_data(
        project_id, section_id, block_id, "setup"
    )
    await set_current_block(project_id, section_id, block_id, redis_client)

    llm = await get_llm_for_project(redis_client, project_id)
    new_generate_result = update_generate_result(
        llm=llm,
        section_type=SectionType(section_metadata["sectionType"]),
        generate_result=generate_result,
        tool=block_setup["tool"],
        modified_code=payload.code,
    )
    await redis_client.set_block_data(
        project_id,
        section_id,
        block_id,
        "generate_result",
        new_generate_result.dict(),
    )
    return new_generate_result


@router.post("/recommend/{project_id}/{section_id}/{block_id}")
async def recommend_techniques(
    project_id: str,
    section_id: str,
    block_id: str,
    payload: BlockSetup,
    redis_client: RedisClient = Depends(get_redis_client),
) -> dict[str, str] | None:
    section_metadata = await redis_client.get_section_data(
        project_id, section_id, "metadata"
    )
    section_type = SectionType(section_metadata["sectionType"])
    data_dict = {}
    if (
        section_type in [SectionType.CLEANING, SectionType.TRANSFORMATION]
        and payload.provideRecommendation
    ):
        source_section_id = payload.sourceSectionId
        source_block_id = payload.sourceBlockId
        if source_section_id and source_block_id:
            data_dict = await get_data_dict_in_block(
                redis_client,
                project_id,
                source_section_id,
                source_block_id,
            )
        else:
            source = payload.source
            source_details = payload.sourceDetails
            llm = await get_llm_for_project(redis_client, project_id)
            integration_settings = await redis_client.get_settings_data(
                SettingsSectionType.INTEGRATION.value
            )
            data_dict = read_df_from_integration(
                llm=llm,
                source=source,
                source_details=source_details,
                generate_result=None,
                integration_settings=integration_settings,
            )
    if data_dict:
        llm = await get_llm_for_project(redis_client, project_id)
        recommendations = recommend(
            llm=llm, section_type=section_type, data_dict=data_dict
        )
        if recommendations:
            await redis_client.set_block_data(
                project_id,
                section_id,
                block_id,
                "recommendations",
                recommendations,
            )
            message = get_recommend_assistant_message(section_type, recommendations)
            await add_chat_messages(redis_client, project_id, message)
            return convert_message_to_dict(message)
