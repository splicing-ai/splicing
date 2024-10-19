import pandas as pd
import pytest
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI

from app.generated.schema import LLMType
from app.utils.helper import (
    convert_message_to_dict,
    deserialize_df,
    format_exception_message,
    generate_id,
    get_llm,
    get_schema,
    serialize_df,
    standardize_name,
)


def test_serialize_deserialize_df():
    # Create a sample DataFrame
    df = pd.DataFrame({"A": [1, 2, 3], "B": ["a", "b", "c"]})

    # Serialize and then deserialize the DataFrame
    serialized = serialize_df(df)
    deserialized = deserialize_df(serialized)

    # Check if the deserialized DataFrame is equal to the original
    pd.testing.assert_frame_equal(df, deserialized)


def test_get_schema():
    df = pd.DataFrame({"A": [1, 2, None], "B": ["a", "b", "c"]})
    schema = get_schema(df)

    expected_schema = [("A", "float64", "True"), ("B", "object", "False")]

    assert schema == expected_schema


@pytest.mark.parametrize(
    "llm_type, expected_class",
    [
        (LLMType.OPENAI, ChatOpenAI),
        (LLMType.ANTHROPIC, ChatAnthropic),
    ],
)
def test_get_llm(llm_type, expected_class):
    llm_settings = {"apiKey": "test_api_key", "model": "test_model"}

    llm = get_llm(llm_type, llm_settings)
    assert isinstance(llm, expected_class)

    with pytest.raises(ValueError):
        get_llm("INVALID_TYPE", {})


def test_convert_message_to_dict():
    human_msg = HumanMessage(content="Hello")
    ai_msg = AIMessage(content="Hi there")
    system_msg = SystemMessage(content="You are an AI assistant")

    assert convert_message_to_dict(human_msg) == {"role": "user", "content": "Hello"}
    assert convert_message_to_dict(ai_msg) == {
        "role": "assistant",
        "content": "Hi there",
    }
    assert convert_message_to_dict(system_msg) == {
        "role": "system",
        "content": "You are an AI assistant",
    }

    with pytest.raises(ValueError):
        convert_message_to_dict(ToolMessage(content="Hiya", tool_call_id="id"))


def test_generate_id():
    id1 = generate_id()
    id2 = generate_id()

    assert len(id1) == 10
    assert len(id2) == 10
    assert id1 != id2  # Ensure uniqueness


def test_standardize_name():
    assert standardize_name("Hello World") == "hello_world"
    assert standardize_name(" Test Case ") == "test_case"
    assert standardize_name("NoSpaces") == "nospaces"


def test_format_exception_message():
    try:
        raise ValueError("Test exception")
    except ValueError as e:
        formatted = format_exception_message(e)
        assert "ValueError: Test exception" in formatted
        assert "test_helper.py" in formatted  # Should include the file name
