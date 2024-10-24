import base64
import io
import logging
import random
import string
import sys
import traceback

import pandas as pd
from langchain_anthropic import ChatAnthropic
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.generated.schema import LLMType

CHUNK_DELIMITER = "\n---\n"


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
    if llm_type in [LLMType.OPENAI, LLMType.ANTHROPIC]:
        api_key = llm_settings.get("apiKey")
        model = llm_settings.get("model")

        if not api_key or not model:
            raise ValueError(f"{llm_type} missing configuration: {llm_settings}")

        if llm_type == LLMType.OPENAI:
            return ChatOpenAI(openai_api_key=api_key, model_name=model, temperature=0)
        elif llm_type == LLMType.ANTHROPIC:
            return ChatAnthropic(
                anthropic_api_key=api_key, model_name=model, temperature=0
            )

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


def standardize_name(s: str) -> str:
    return s.strip().lower().replace(" ", "_")


def format_exception_message(exception: Exception) -> str:
    tb = exception.__traceback__
    exception_details = traceback.format_exception(type(exception), exception, tb)
    return "".join(exception_details)


def setup_logging(level: int = logging.WARNING):
    logger = logging.getLogger("app")
    logger.setLevel(level)
    stream_handler = logging.StreamHandler(sys.stdout)
    log_formatter = logging.Formatter(
        "%(asctime)s - %(filename)s:%(lineno)d - %(funcName)s() - %(levelname)s - %(message)s"
    )
    stream_handler.setFormatter(log_formatter)
    logger.addHandler(stream_handler)
