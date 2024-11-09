import datetime
import io
import os
import shutil
import zipfile

from fastapi import APIRouter, Depends, Response, status
from fastapi.responses import StreamingResponse
from langchain_core.messages import ToolMessage

from app.api.dependencies import RedisClient, get_redis_client
from app.api.endpoints import block, converse, section, settings
from app.generated.schema import (
    BlockData,
    IntegrationType,
    ProjectData,
    ProjectMetadata,
    ProjectSetupPayload,
    SectionData,
    SectionType,
    SettingsSectionType,
    TransformationTool,
)
from app.utils.agent.checkpointer import AsyncRedisSaver
from app.utils.agent.graph import create_graph
from app.utils.converse import get_initial_messages
from app.utils.execute import get_dbt_packages
from app.utils.helper import convert_message_to_dict, generate_id, standardize_name
from app.utils.project_helper import (
    get_app_dir,
    get_chat_history,
    get_data_dict_in_block,
    get_dbt_project_name,
    get_llm_for_project,
    get_project_dir,
)

router = APIRouter()
router.include_router(block.router, prefix="/block", tags=["block"])
router.include_router(converse.router, prefix="/conversation", tags=["conversation"])
router.include_router(section.router, prefix="/section", tags=["section"])
router.include_router(settings.router, prefix="/settings", tags=["settings"])


@router.post("/start")
async def add(
    payload: ProjectSetupPayload, redis_client: RedisClient = Depends(get_redis_client)
) -> ProjectMetadata:
    project_id = generate_id()
    project_dir = os.path.join(get_app_dir(), payload.title)
    if not os.path.exists(project_dir):
        os.makedirs(project_dir)
    curr_time = datetime.datetime.utcnow().isoformat()
    metadata = {
        "id": project_id,
        **payload.dict(),
        "createdOn": curr_time,
        "modifiedOn": curr_time,
        "projectDir": project_dir,
    }
    await redis_client.set_project_data(project_id, "metadata", metadata)
    await redis_client.add_project_id(project_id)
    llm = await get_llm_for_project(redis_client, project_id)
    graph = create_graph(redis_client, llm)
    config = {"configurable": {"thread_id": project_id}}
    await graph.aupdate_state(
        config, {"messages": get_initial_messages()}, as_node="chatbot"
    )
    return ProjectMetadata(**metadata)


@router.delete("/close/{project_id}")
async def delete(
    project_id: str, redis_client: RedisClient = Depends(get_redis_client)
) -> Response:
    project_dir = await get_project_dir(redis_client, project_id)
    if os.path.exists(project_dir):
        shutil.rmtree(project_dir)
    await redis_client.delete_all_project_data(project_id)
    await redis_client.delete_project_id(project_id)
    checkpointer = AsyncRedisSaver(redis_client.redis)
    await checkpointer.adelete_checkpoint(project_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/project_setup/{project_id}")
async def setup(
    project_id: str,
    payload: ProjectSetupPayload,
    redis_client: RedisClient = Depends(get_redis_client),
) -> Response:
    metadata = await redis_client.get_project_data(project_id, "metadata")
    existing_project_dir = metadata.get("projectDir")
    project_dir = payload.projectDir
    if project_dir and project_dir != existing_project_dir:
        if os.path.exists(project_dir):
            return Response(content="{project_dir} already exists")
        # move the existing directory
        shutil.move(existing_project_dir, project_dir)

    await redis_client.set_project_data(
        project_id, "metadata", metadata | payload.dict()
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/projects")
async def fetch_projects_metadata(
    redis_client: RedisClient = Depends(get_redis_client),
) -> list[ProjectMetadata]:
    all_project_ids = await redis_client.get_all_project_ids()
    return [
        await redis_client.get_project_data(pid, "metadata") for pid in all_project_ids
    ]


@router.get("/project/{project_id}")
async def fetch_project(
    project_id: str, redis_client: RedisClient = Depends(get_redis_client)
) -> ProjectData:
    project_metadata = await redis_client.get_project_data(project_id, "metadata")
    section_ids = await redis_client.get_all_section_ids(project_id)
    sections = []
    for section_id in section_ids:
        section_metadata = await redis_client.get_section_data(
            project_id, section_id, "metadata"
        )
        section_type = SectionType(section_metadata["sectionType"])
        current_block_id = await redis_client.get_section_data(
            project_id, section_id, "current_block_id"
        )
        block_ids = await redis_client.get_all_block_ids(project_id, section_id)
        blocks = []
        for block_id in block_ids:
            block_metadata = await redis_client.get_block_data(
                project_id, section_id, block_id, "metadata"
            )
            block_setup = await redis_client.get_block_data(
                project_id, section_id, block_id, "setup"
            )
            generate_result = await redis_client.get_block_data(
                project_id, section_id, block_id, "generate_result"
            )
            data_dict = await get_data_dict_in_block(
                redis_client, project_id, section_id, block_id
            )
            data = {
                k: v.head(block_metadata["numRows"]).to_json(
                    orient="records", date_format="iso"
                )
                for k, v in data_dict.items()
            }
            execute_result = await redis_client.get_block_data(
                project_id, section_id, block_id, "execute_result"
            )
            blocks.append(
                BlockData(
                    id=block_id,
                    numRows=block_metadata["numRows"],
                    generateResult=generate_result,
                    data=data,
                    executeResult=execute_result,
                    setup=block_setup,
                )
            )
        sections.append(
            SectionData(
                id=section_id,
                title=section_metadata["title"],
                sectionType=section_type,
                blocks=blocks,
                currentBlockId=current_block_id,
            )
        )

    messages = [
        convert_message_to_dict(message)
        for message in await get_chat_history(redis_client, project_id)
        if not isinstance(message, ToolMessage) and message.name != "hidden"
    ]
    last_worked_section_id = await redis_client.get_project_data(
        project_id, "last_worked_section_id"
    )
    return ProjectData(
        metadata=ProjectMetadata(**project_metadata),
        sections=sections,
        messages=messages,
        lastWorkedSectionId=last_worked_section_id,
    )


@router.post("/download_code/{project_id}")
async def download_code(
    project_id: str, redis_client: RedisClient = Depends(get_redis_client)
) -> StreamingResponse:
    project_metadata = await redis_client.get_project_data(project_id, "metadata")
    project_name = standardize_name(project_metadata["title"])
    section_ids = await redis_client.get_all_section_ids(project_id)

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        project_dir = await get_project_dir(redis_client, project_id)
        all_packages = set()
        files_to_copy = ["credentials.yml"]
        for section_id in section_ids:
            section_metadata = await redis_client.get_section_data(
                project_id, section_id, "metadata"
            )
            section_type = SectionType(section_metadata["sectionType"])
            section_file_name = get_dbt_project_name(
                section_type, section_metadata["title"]
            )
            is_dbt_project_dir_added = False
            block_ids = await redis_client.get_all_block_ids(project_id, section_id)
            for block_id in block_ids:
                block_setup = await redis_client.get_block_data(
                    project_id, section_id, block_id, "setup"
                )
                generate_result = await redis_client.get_block_data(
                    project_id, section_id, block_id, "generate_result"
                )
                # add code
                if block_setup is not None and generate_result is not None:
                    if (
                        section_type == SectionType.TRANSFORMATION
                        and TransformationTool(block_setup["tool"])
                        == TransformationTool.DBT
                    ):
                        dbt_project_dir = os.path.join(project_dir, section_file_name)
                        if os.path.exists(dbt_project_dir):
                            if not is_dbt_project_dir_added:
                                is_dbt_project_dir_added = True
                                for root, _, files in os.walk(dbt_project_dir):
                                    # exclude logs and target directory
                                    if not (
                                        root.startswith(
                                            os.path.join(dbt_project_dir, "target")
                                        )
                                        or root.startswith(
                                            os.path.join(dbt_project_dir, "logs")
                                        )
                                    ):
                                        for file in files:
                                            file_path = os.path.join(root, file)
                                            arcname = os.path.join(
                                                project_name,
                                                section_file_name,
                                                os.path.relpath(
                                                    file_path, dbt_project_dir
                                                ),
                                            )
                                            zip_file.write(file_path, arcname)
                            model_name = generate_result["modelName"]
                            zip_file.writestr(
                                os.path.join(
                                    project_name,
                                    section_file_name,
                                    "models",
                                    f"{model_name}.sql",
                                ),
                                generate_result["model"],
                            )
                            zip_file.writestr(
                                os.path.join(
                                    project_name,
                                    section_file_name,
                                    "models",
                                    f"{model_name}.yml",
                                ),
                                generate_result["properties"],
                            )
                            all_packages |= get_dbt_packages(
                                IntegrationType(block_setup["source"])
                            )
                    else:
                        zip_file.writestr(
                            os.path.join(project_name, f"{section_file_name}.py"),
                            generate_result["code"],
                        )
                        if packages := generate_result.get("packages"):
                            all_packages |= set(packages)
                    if section_type != SectionType.ORCHESTRATION and (
                        IntegrationType(block_setup["source"])
                        == IntegrationType.BIGQUERY
                        or (
                            section_type == SectionType.MOVEMENT
                            and IntegrationType(block_setup["destination"])
                            == IntegrationType.BIGQUERY
                        )
                    ):
                        bq_settings = await redis_client.get_settings_data(
                            SettingsSectionType.INTEGRATION.value,
                            IntegrationType.BIGQUERY.value,
                        )
                        files_to_copy.append(bq_settings["serviceAccountKeyFileName"])

        # Add requirements.txt
        if all_packages:
            zip_file.writestr(
                os.path.join(project_name, "requirements.txt"),
                "\n".join(all_packages),
            )

        # Add credentials.yml and other credential files
        for file in files_to_copy:
            credentials_path = os.path.join(get_app_dir(), file)
            if os.path.exists(credentials_path):
                zip_file.write(credentials_path, os.path.join(project_name, file))

        # Add dbt profile
        dbt_profile_path = os.path.join(project_dir, "dbt_profiles", "profiles.yml")
        if os.path.exists(dbt_profile_path):
            zip_file.write(
                dbt_profile_path,
                os.path.join(project_name, "dbt_profiles", "profiles.yml"),
            )

    zip_buffer.seek(0)
    return StreamingResponse(
        iter([zip_buffer.getvalue()]),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={project_name}.zip"},
    )
