import os
import shutil

from fastapi import APIRouter, Depends, Response, status

from app.api.dependencies import RedisClient, get_redis_client
from app.generated.schema import SectionMetadata
from app.utils.execute import init_dbt_project, rename_dbt_profile
from app.utils.helper import generate_id, standardize_name
from app.utils.project_helper import context_update, get_project_dir

router = APIRouter()


@router.post("/add/{project_id}")
async def add(
    project_id: str,
    payload: SectionMetadata,
    redis_client: RedisClient = Depends(get_redis_client),
) -> str:
    section_id = generate_id()
    await redis_client.set_section_data(
        project_id, section_id, "metadata", {"id": section_id, **payload.dict()}
    )
    await redis_client.add_section_id(project_id, section_id)
    return section_id


@router.delete("/delete/{project_id}/{section_id}")
async def delete(
    project_id: str,
    section_id: str,
    redis_client: RedisClient = Depends(get_redis_client),
) -> Response:
    # delete dbt project dir
    metadata = await redis_client.get_section_data(project_id, section_id, "metadata")
    project_dir = await get_project_dir(redis_client, project_id)
    dbt_project_dir = os.path.join(
        project_dir,
        f"{metadata['sectionType'].lower()}_{standardize_name(metadata['title'])}",
    )
    if os.path.exists(dbt_project_dir):
        shutil.rmtree(dbt_project_dir)

    await redis_client.delete_all_section_data(project_id, section_id)
    await redis_client.delete_section_id(project_id, section_id)
    last_worked_section_id = await redis_client.get_project_data(
        project_id, "last_worked_section_id"
    )
    if last_worked_section_id == section_id:
        await redis_client.delete_project_data(project_id, "last_worked_section_id")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/rename/{project_id}/{section_id}/{new_title}")
async def rename(
    project_id: str,
    section_id: str,
    new_title: str,
    redis_client: RedisClient = Depends(get_redis_client),
) -> Response:
    # delete and re-init dbt project dir
    metadata = await redis_client.get_section_data(project_id, section_id, "metadata")
    project_dir = await get_project_dir(redis_client, project_id)
    curr_dbt_project_name = (
        f"{metadata['sectionType'].lower()}_{standardize_name(metadata['title'])}"
    )
    dbt_project_dir = os.path.join(project_dir, curr_dbt_project_name)
    if os.path.exists(dbt_project_dir):
        shutil.rmtree(dbt_project_dir)
        profiles_dir = os.path.join(project_dir, "dbt_profiles")
        new_dbt_project_name = (
            f"{metadata['sectionType'].lower()}_{standardize_name(new_title)}"
        )
        rename_dbt_profile(curr_dbt_project_name, profiles_dir, new_dbt_project_name)
        init_dbt_project(new_dbt_project_name, project_dir)

    metadata["title"] = new_title
    await redis_client.set_section_data(project_id, section_id, "metadata", metadata)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/move/{project_id}/{section_id}/{direction}")
async def move(
    project_id: str,
    section_id: str,
    direction: str,
    redis_client: RedisClient = Depends(get_redis_client),
) -> Response:
    await redis_client.move_section(project_id, section_id, direction.lower())
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/set_current_block/{project_id}/{section_id}")
async def set_current_block(
    project_id: str,
    section_id: str,
    block_id: str | None = None,
    redis_client: RedisClient = Depends(get_redis_client),
) -> Response:
    if block_id is None:
        await redis_client.delete_section_data(
            project_id, section_id, "current_block_id"
        )
    else:
        await context_update(redis_client, project_id, section_id, block_id)
        await redis_client.set_section_data(
            project_id, section_id, "current_block_id", block_id
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
