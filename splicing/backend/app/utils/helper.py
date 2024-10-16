import base64
import io
import os.path
import random
import string
import traceback

import pandas as pd
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.core.config import settings
from app.generated.schema import LLMType


def serialize_df(df: pd.DataFrame) -> str:
    buffer = io.BytesIO()
    df.to_parquet(buffer)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def deserialize_df(value: str) -> pd.DataFrame:
    bytes_value = base64.b64decode(value.encode("utf-8"))
    return pd.read_parquet(io.BytesIO(bytes_value))


def get_schema(df: pd.DataFrame) -> list[tuple[str, str, str]]:
    dtypes = df.dtypes.astype(str)
    nullabilities = df.isna().any().astype(str)
    return list(zip(df.columns, dtypes, nullabilities))


def get_llm(llm_type: LLMType, llm_settings: dict) -> BaseChatModel:
    if llm_type == LLMType.OPENAI:
        openai_key = llm_settings.get("apiKey")
        model = llm_settings.get("model")

        if not openai_key or not model:
            raise ValueError(f"{llm_type} missing configuration: {llm_settings}")

        return ChatOpenAI(openai_api_key=openai_key, model_name=model, temperature=0)
    else:
        raise ValueError(f"{llm_type} is not supported")


def convert_message_to_dict(message: BaseMessage) -> dict[str, str]:
    if isinstance(message, HumanMessage):
        return {"role": "user", "content": message.content}
    elif isinstance(message, AIMessage):
        return {"role": "assistant", "content": message.content}
    elif isinstance(message, SystemMessage):
        return {"role": "system", "content": message.content}
    else:
        raise ValueError(f"Unsupported message type: {type(message)}")


def generate_id(length: int = 10) -> str:
    return "".join(
        random.choice(string.digits + string.ascii_lowercase) for _ in range(length)
    )


def get_app_dir() -> str:
    return os.path.join(settings.SOURCE_DIR, f".{settings.APP_NAME.lower()}")


def standardize_name(s: str) -> str:
    return s.strip().lower().replace(" ", "_")


def format_exception_message(exception: Exception) -> str:
    tb = exception.__traceback__
    exception_details = traceback.format_exception(type(exception), exception, tb)
    return "".join(exception_details)
