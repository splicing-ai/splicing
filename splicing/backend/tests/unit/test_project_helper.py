from unittest.mock import AsyncMock, MagicMock, patch

import pandas as pd
import pytest
import pytest_asyncio
from fakeredis import aioredis
from langchain_core.messages import AIMessage, HumanMessage

from app.generated.schema import LLMType, SectionType, TransformationTool
from app.utils.helper import standardize_name
from app.utils.redis_client import RedisClient

# Mock the settings before importing project_helper
mock_settings = MagicMock()
mock_settings.SOURCE_DIR = "/source"
mock_settings.APP_NAME = "TestApp"
mock_settings.REDIS_URL = "redis://fake"

with patch("app.core.config.settings", mock_settings):
    from app.utils.project_helper import (
        add_chat_messages,
        build_dag,
        context_update,
        get_app_dir,
        get_chat_history,
        get_data_dict_in_block,
        get_llm_for_project,
        get_project_dir,
        set_data_dict_in_block,
    )


@pytest_asyncio.fixture(scope="function")
async def redis_client():
    fake_redis = aioredis.FakeRedis()
    client = RedisClient(fake_redis)
    yield client
    await fake_redis.flushall()


@pytest_asyncio.fixture(scope="function")
async def setup_project_data(redis_client):
    project_id = "test_project"
    await redis_client.set_project_data(
        project_id,
        "metadata",
        {"projectDir": "/test/project/dir", "llm": LLMType.OPENAI.value},
    )
    await redis_client.set_settings_data(
        "LLM", LLMType.OPENAI.value, {"model": "gpt-4o", "apiKey": "sk-123"}
    )
    return project_id


@pytest.mark.asyncio
async def test_get_app_dir():
    assert get_app_dir() == "/source/.testapp"


@pytest.mark.asyncio
async def test_get_project_dir(redis_client, setup_project_data):
    project_id = setup_project_data
    project_dir = await get_project_dir(redis_client, project_id)
    assert project_dir == "/test/project/dir"


@pytest.mark.asyncio
async def test_get_llm_for_project(redis_client, setup_project_data):
    project_id = setup_project_data
    with patch("app.utils.project_helper.get_llm") as mock_get_llm:
        await get_llm_for_project(redis_client, project_id)
        mock_get_llm.assert_called_once_with(
            LLMType.OPENAI, {"model": "gpt-4o", "apiKey": "sk-123"}
        )


@pytest.mark.asyncio
async def test_add_chat_messages(redis_client, setup_project_data):
    project_id = setup_project_data
    with patch("app.utils.project_helper.create_graph") as mock_create_graph:
        mock_graph = AsyncMock()
        mock_create_graph.return_value = mock_graph

        messages = [AIMessage(content="Hello"), HumanMessage(content="World")]
        await add_chat_messages(redis_client, project_id, *messages)

        mock_graph.aupdate_state.assert_called_once_with(
            {"configurable": {"thread_id": project_id}},
            {"messages": messages},
            as_node="chatbot",
        )


@pytest.mark.asyncio
async def test_get_chat_history(redis_client, setup_project_data):
    project_id = setup_project_data
    with patch("app.utils.project_helper.create_graph") as mock_create_graph:
        mock_graph = AsyncMock()
        messages = [AIMessage(content="Hello"), HumanMessage(content="World")]
        mock_graph.aget_state.return_value.values = {"messages": messages}
        mock_create_graph.return_value = mock_graph

        history = await get_chat_history(redis_client, project_id)

        assert history == messages


@pytest.mark.asyncio
async def test_set_and_get_data_dict_in_block(redis_client, setup_project_data):
    project_id = setup_project_data
    section_id = "test_section"
    block_id = "test_block"

    data_dict = {
        "df1": pd.DataFrame({"A": [1, 2, 3]}),
        "df2": pd.DataFrame({"B": [4, 5, 6]}),
    }

    await set_data_dict_in_block(
        redis_client, project_id, section_id, block_id, data_dict
    )
    result = await get_data_dict_in_block(
        redis_client, project_id, section_id, block_id
    )

    assert len(result) == 2
    assert all(result[k].equals(v) for k, v in data_dict.items())


@pytest.mark.asyncio
async def test_context_update():
    redis_client = AsyncMock()
    project_id = "test_project"
    section_id = "test_section"
    block_id = "test_block"

    # Mock section metadata and block setup
    mock_section_metadata = {"sectionType": SectionType.TRANSFORMATION.value}
    mock_block_setup = {"tool": TransformationTool.PANDAS.value}

    # Mock get_project_data
    async def mock_get_project_data(project_id, key):
        if key == "last_worked_section_id":
            return "old_section"
        raise ValueError(f"Unexpected key in get_project_data: {key}")

    # Mock get_section_data
    async def mock_get_section_data(project_id, section_id, key):
        if key == "current_block_id":
            return "old_block"
        elif key == "metadata":
            return mock_section_metadata
        raise ValueError(f"Unexpected key in get_section_data: {key}")

    redis_client.get_project_data.side_effect = mock_get_project_data
    redis_client.get_section_data.side_effect = mock_get_section_data
    redis_client.get_block_data.return_value = mock_block_setup

    # Test case 1: Different section
    with patch(
        "app.utils.project_helper.get_context_update_user_message"
    ) as mock_get_message:
        with patch("app.utils.project_helper.add_chat_messages") as mock_add_messages:
            await context_update(redis_client, project_id, "new_section", block_id)
            redis_client.set_project_data.assert_called_once_with(
                project_id, "last_worked_section_id", "new_section"
            )
            mock_get_message.assert_called_once_with(
                SectionType(mock_section_metadata["sectionType"]), mock_block_setup
            )
            mock_add_messages.assert_called_once()

    # Reset mocks
    redis_client.reset_mock()

    # Test case 2: Same section, different block
    async def mock_get_project_data_2(proj_id, key):
        if key == "last_worked_section_id":
            return section_id
        raise ValueError(f"Unexpected key in get_project_data: {key}")

    redis_client.get_project_data.side_effect = mock_get_project_data_2
    redis_client.get_section_data.side_effect = mock_get_section_data

    with patch(
        "app.utils.project_helper.get_context_update_user_message"
    ) as mock_get_message:
        with patch("app.utils.project_helper.add_chat_messages") as mock_add_messages:
            await context_update(redis_client, project_id, section_id, "new_block")
            redis_client.get_section_data.assert_any_call(
                project_id, section_id, "current_block_id"
            )
            mock_get_message.assert_called_once_with(
                SectionType(mock_section_metadata["sectionType"]), mock_block_setup
            )
            mock_add_messages.assert_called_once()

    # Reset mocks
    redis_client.reset_mock()

    # Test case 3: Same section, same block, is_block_setup_updated=True
    async def mock_get_section_data_3(proj_id, sect_id, key):
        if key == "current_block_id":
            return block_id
        elif key == "metadata":
            return mock_section_metadata
        raise ValueError(f"Unexpected key in get_section_data: {key}")

    redis_client.get_project_data.side_effect = mock_get_project_data_2
    redis_client.get_section_data.side_effect = mock_get_section_data_3

    with patch(
        "app.utils.project_helper.get_context_update_user_message"
    ) as mock_get_message:
        with patch("app.utils.project_helper.add_chat_messages") as mock_add_messages:
            await context_update(
                redis_client,
                project_id,
                section_id,
                block_id,
                is_block_setup_updated=True,
            )
            mock_get_message.assert_called_once_with(
                SectionType(mock_section_metadata["sectionType"]), mock_block_setup
            )
            mock_add_messages.assert_called_once()

    # Reset mocks
    redis_client.reset_mock()

    # Test case 4: Same section, same block, is_block_setup_updated=False
    redis_client.get_project_data.side_effect = mock_get_project_data_2
    redis_client.get_section_data.side_effect = mock_get_section_data_3

    with patch(
        "app.utils.project_helper.get_context_update_user_message"
    ) as mock_get_message:
        with patch("app.utils.project_helper.add_chat_messages") as mock_add_messages:
            await context_update(
                redis_client,
                project_id,
                section_id,
                block_id,
                is_block_setup_updated=False,
            )
            mock_get_message.assert_not_called()
            mock_add_messages.assert_not_called()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "dag_structure",
    [
        {
            "name": "Linear DAG",
            "sections": [
                {
                    "id": "s1",
                    "type": SectionType.TRANSFORMATION,
                    "title": "Transform 1",
                },
                {
                    "id": "s2",
                    "type": SectionType.TRANSFORMATION,
                    "title": "Transform 2",
                },
            ],
            "blocks": [
                {
                    "id": "b1",
                    "section": "s1",
                    "tool": TransformationTool.PANDAS,
                    "sourceSectionId": None,
                    "sourceBlockId": None,
                    "source": "source1",
                },
                {
                    "id": "b2",
                    "section": "s1",
                    "tool": TransformationTool.PANDAS,
                    "sourceSectionId": "s1",
                    "sourceBlockId": "b1",
                    "source": "b1",
                },
                {
                    "id": "b3",
                    "section": "s2",
                    "tool": TransformationTool.PANDAS,
                    "sourceSectionId": "s1",
                    "sourceBlockId": "b2",
                    "source": "b2",
                },
            ],
            "expected_adj_list": {"b1": ["b2"], "b2": ["b3"], "b3": []},
        },
        {
            "name": "Diamond DAG",
            "sections": [
                {
                    "id": "s1",
                    "type": SectionType.TRANSFORMATION,
                    "title": "Transform 1",
                },
            ],
            "blocks": [
                {
                    "id": "b1",
                    "section": "s1",
                    "tool": TransformationTool.PANDAS,
                    "sourceSectionId": None,
                    "sourceBlockId": None,
                    "source": "source1",
                },
                {
                    "id": "b2",
                    "section": "s1",
                    "tool": TransformationTool.PANDAS,
                    "sourceSectionId": "s1",
                    "sourceBlockId": "b1",
                    "source": "b1",
                },
                {
                    "id": "b3",
                    "section": "s1",
                    "tool": TransformationTool.PANDAS,
                    "sourceSectionId": "s1",
                    "sourceBlockId": "b1",
                    "source": "b1",
                },
                {
                    "id": "b4",
                    "section": "s1",
                    "tool": TransformationTool.PANDAS,
                    "sourceSectionId": "s1",
                    "sourceBlockId": "b3",
                    "source": "b3",
                },
            ],
            "expected_adj_list": {"b1": ["b2", "b3"], "b2": [], "b3": ["b4"], "b4": []},
        },
        {
            "name": "Disconnected DAG",
            "sections": [
                {
                    "id": "s1",
                    "type": SectionType.TRANSFORMATION,
                    "title": "Transform 1",
                },
                {
                    "id": "s2",
                    "type": SectionType.TRANSFORMATION,
                    "title": "Transform 2",
                },
            ],
            "blocks": [
                {
                    "id": "b1",
                    "section": "s1",
                    "tool": TransformationTool.PANDAS,
                    "sourceSectionId": None,
                    "sourceBlockId": None,
                    "source": "source1",
                },
                {
                    "id": "b2",
                    "section": "s1",
                    "tool": TransformationTool.PANDAS,
                    "sourceSectionId": "s1",
                    "sourceBlockId": "b1",
                    "source": "b1",
                },
                {
                    "id": "b3",
                    "section": "s2",
                    "tool": TransformationTool.PANDAS,
                    "sourceSectionId": None,
                    "sourceBlockId": None,
                    "source": "source2",
                },
                {
                    "id": "b4",
                    "section": "s2",
                    "tool": TransformationTool.PANDAS,
                    "sourceSectionId": "s2",
                    "sourceBlockId": "b3",
                    "source": "b3",
                },
            ],
            "expected_adj_list": {"b1": ["b2"], "b2": [], "b3": ["b4"], "b4": []},
        },
        {
            "name": "Complex DAG",
            "sections": [
                {
                    "id": "s1",
                    "type": SectionType.TRANSFORMATION,
                    "title": "Transform 1",
                },
                {
                    "id": "s2",
                    "type": SectionType.TRANSFORMATION,
                    "title": "Transform 2",
                },
            ],
            "blocks": [
                {
                    "id": "b1",
                    "section": "s1",
                    "tool": TransformationTool.PANDAS,
                    "sourceSectionId": None,
                    "sourceBlockId": None,
                    "source": "source1",
                },
                {
                    "id": "b2",
                    "section": "s1",
                    "tool": TransformationTool.PANDAS,
                    "sourceSectionId": "s1",
                    "sourceBlockId": "b1",
                    "source": "b1",
                },
                {
                    "id": "b3",
                    "section": "s1",
                    "tool": TransformationTool.PANDAS,
                    "sourceSectionId": "s1",
                    "sourceBlockId": "b1",
                    "source": "b1",
                },
                {
                    "id": "b4",
                    "section": "s2",
                    "tool": TransformationTool.PANDAS,
                    "sourceSectionId": "s1",
                    "sourceBlockId": "b2",
                    "source": "b2",
                },
                {
                    "id": "b5",
                    "section": "s2",
                    "tool": TransformationTool.PANDAS,
                    "sourceSectionId": "s1",
                    "sourceBlockId": "b3",
                    "source": "b3",
                },
                {
                    "id": "b6",
                    "section": "s2",
                    "tool": TransformationTool.PANDAS,
                    "sourceSectionId": "s2",
                    "sourceBlockId": "b5",
                    "source": "b5",
                },
            ],
            "expected_adj_list": {
                "b1": ["b2", "b3"],
                "b2": ["b4"],
                "b3": ["b5"],
                "b4": [],
                "b5": ["b6"],
                "b6": [],
            },
        },
    ],
)
async def test_build_dag_adjacency_list(
    redis_client, setup_project_data, dag_structure
):
    project_id = setup_project_data

    # Set up the DAG structure in Redis
    for section in dag_structure["sections"]:
        await redis_client.add_section_id(project_id, section["id"])
        await redis_client.set_section_data(
            project_id,
            section["id"],
            "metadata",
            {"sectionType": section["type"].value, "title": section["title"]},
        )

    for block in dag_structure["blocks"]:
        await redis_client.add_block_id(project_id, block["section"], block["id"])
        await redis_client.set_block_data(
            project_id,
            block["section"],
            block["id"],
            "setup",
            {
                "tool": block["tool"].value,
                "source": block["source"],
                "sourceSectionId": block.get("sourceSectionId"),
                "sourceBlockId": block.get("sourceBlockId"),
            },
        )
        generate_result = {
            "functionName": f"func_{block['id']}",
            "functionArgs": {"arg1": "value1"},
            "returnValue": "return",
            "code": "print('Hello World')",
            "packages": ["pandas"],
        }
        await redis_client.set_block_data(
            project_id,
            block["section"],
            block["id"],
            "generate_result",
            generate_result,
        )

    # Build the DAG
    dag = await build_dag(redis_client, project_id)

    # Check the adjacency list
    assert (
        dag["adj_list"] == dag_structure["expected_adj_list"]
    ), f"Failed for {dag_structure['name']}"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "block_setup",
    [
        {
            "section_type": SectionType.TRANSFORMATION,
            "section_title": "Pandas Transform",
            "tool": TransformationTool.PANDAS,
            "source": "my_source",
        },
        {
            "section_type": SectionType.TRANSFORMATION,
            "section_title": "DBT Transform",
            "tool": TransformationTool.DBT,
            "source": "my_dbt_source",
        },
    ],
)
async def test_build_dag_node_definition(redis_client, setup_project_data, block_setup):
    project_id = setup_project_data
    section_id = "test_section"
    block_id = "test_block"

    # Add section
    await redis_client.add_section_id(project_id, section_id)
    await redis_client.set_section_data(
        project_id,
        section_id,
        "metadata",
        {
            "sectionType": block_setup["section_type"].value,
            "title": block_setup["section_title"],
        },
    )

    # Add block
    await redis_client.add_block_id(project_id, section_id, block_id)
    await redis_client.set_block_data(
        project_id,
        section_id,
        block_id,
        "setup",
        {"tool": block_setup["tool"].value, "source": block_setup["source"]},
    )

    # Set generate_result based on tool
    if block_setup["tool"] == TransformationTool.DBT:
        generate_result = {
            "modelName": "test_model",
            "model": "SELECT * FROM test",
            "properties": "test_properties",
        }
    else:
        generate_result = {
            "functionName": "test_function",
            "functionArgs": {"param": "value"},
            "returnValue": "result",
            "code": "print('Hello World')",
            "packages": ["pandas"],
        }

    await redis_client.set_block_data(
        project_id, section_id, block_id, "generate_result", generate_result
    )

    # Build the DAG
    dag = await build_dag(redis_client, project_id)

    # Assertions
    assert block_id in dag["node_definitions"]
    node_def = dag["node_definitions"][block_id]
    assert node_def["tool"] == block_setup["tool"].value

    if block_setup["tool"] == TransformationTool.DBT:
        expected_prefix = (
            f"transformation_{standardize_name(block_setup['section_title'])}"
        )
        assert node_def["project_name"] == expected_prefix
        assert node_def["project_dir"] == expected_prefix
        assert node_def["profile_name"] == expected_prefix
        assert node_def["profile_dir"] == "dbt_profiles"
        assert node_def["target"] == block_setup["source"]
        assert "functionName" not in node_def
        assert "functionArgs" not in node_def
        assert "returnValue" not in node_def
        assert "code" not in node_def
        assert "packages" not in node_def
    else:
        expected_file = (
            f"transformation_{standardize_name(block_setup['section_title'])}.py"
        )
        assert node_def["file"] == expected_file
        assert "modelName" not in node_def
        assert "model" not in node_def
        assert "properties" not in node_def
        assert "project_name" not in node_def
        assert "project_dir" not in node_def
        assert "profile_name" not in node_def
        assert "profile_dir" not in node_def
        assert "target" not in node_def
