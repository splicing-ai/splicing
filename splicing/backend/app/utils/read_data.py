import logging
import os

import pandas as pd
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_core.tools import InjectedToolArg, StructuredTool
from typing_extensions import Annotated

from app.generated.schema import IntegrationType
from app.utils.project_helper import get_app_dir
from app.utils.prompt_manager import PromptManager

dir_path = os.path.dirname(os.path.realpath(__file__))
prompt_manager = PromptManager(os.path.join(dir_path, "prompts.yaml"))

logger = logging.getLogger(__name__)


def get_read_data_tool(integration_type: IntegrationType) -> StructuredTool | None:
    func = None
    if integration_type == IntegrationType.DUCKDB:
        func = read_df_from_duckdb
    elif integration_type == IntegrationType.BIGQUERY:
        func = read_df_from_bigquery
    if func is not None:
        return StructuredTool.from_function(
            func,
            parse_docstring=True,
        )


def get_read_data_messages(
    source: str,
    source_details: str,
    settings: dict[str, str],
    generate_result: dict | None = None,
) -> list[BaseMessage]:
    system_message = prompt_manager.get_prompt(
        "read_data",
        "system_message",
    )
    if generate_result is not None:
        details = prompt_manager.get_prompt(
            "read_data",
            "python_code_instruction",
            code=generate_result["code"],
            functionArgs=generate_result["functionArgs"],
        )
    else:
        sensitive_fields = settings.get("sensitiveFields", [])
        integration_details_from_settings = "\n".join(
            f"{k}: {v}"
            for k, v in settings.items()
            if k != "sensitiveFields" and k not in sensitive_fields
        )

        source_details_str = (
            f"details:\n{integration_details_from_settings}\n{source_details}"
            if source_details
            else ""
        )
        details = f"source:\n{source}\n{source_details_str}"
    user_message = prompt_manager.get_prompt(
        "read_data",
        "user_message",
        details=details,
    )
    return [
        SystemMessage(content=system_message),
        HumanMessage(content=user_message),
    ]


def read_df_from_integration(
    *,
    llm: BaseChatModel,
    source: str,
    source_details: str,
    generate_result: dict | None,
    integration_settings: dict,
) -> dict[str, pd.DataFrame]:
    """
    Reads data from an integration to a pandas DataFrame.
    LLM can be used to get the arguments of a tool and read data.
    There might be multiple datasets, so we return a dict,
    where the key is "table_name" and the value is data.
    """
    result = {}
    integration_type = IntegrationType(source)
    # we cannot read anything if source is Python without source block
    if integration_type != IntegrationType.PYTHON:
        if read_data_tool := get_read_data_tool(integration_type):
            settings = integration_settings.get(source)
            # if the source block is using dbt, we can read data directly
            if generate_result is not None and "modelName" in generate_result:
                if integration_type == IntegrationType.DUCKDB:
                    table_name = f'{settings.get("schema", "main")}.{generate_result["modelName"]}'
                    result[table_name] = read_df_from_duckdb(
                        database_path=settings["databaseFilePath"],
                        table_name=table_name,
                    )
                elif integration_type == IntegrationType.BIGQUERY:
                    table_id = f'{settings["projectId"]}.{settings["datasetId"]}.{generate_result["modelName"]}'
                    service_account_key_file_path = os.path.join(
                        get_app_dir(), settings["serviceAccountKeyFileName"]
                    )
                    result[table_id] = read_df_from_bigquery(
                        service_account_key_file_path=service_account_key_file_path,
                        table_id=table_id,
                    )
            else:
                # get messages and invoke llm with tool
                messages = get_read_data_messages(
                    source, source_details, settings, generate_result
                )
                llm_with_tools = llm.bind_tools([read_data_tool])
                response = llm_with_tools.invoke(messages)
                logger.debug(
                    "READ DATA - messages: %s, response: %s", messages, response
                )
                if tool_calls := response.tool_calls:
                    for tool_call in tool_calls:
                        tool_call_args = tool_call.get("args", {})
                        # we shouldn't raise any exception here because of LLM's incapability
                        # i.e., use tool incorrectly
                        try:
                            df, key = None, None
                            if integration_type == IntegrationType.DUCKDB:
                                key = tool_call_args["table_name"].split(".")[-1]
                                df = read_df_from_duckdb(
                                    database_path=settings["databaseFilePath"],
                                    **tool_call_args,
                                )
                            elif integration_type == IntegrationType.BIGQUERY:
                                service_account_key_file_path = os.path.join(
                                    get_app_dir(), settings["serviceAccountKeyFileName"]
                                )
                                key = tool_call_args["table_id"].split(".")[-1]
                                df = read_df_from_bigquery(
                                    service_account_key_file_path=service_account_key_file_path,
                                    **tool_call_args,
                                )
                            if key is not None and df is not None:
                                result[key] = df
                        except Exception as ex:
                            logger.error("READ DATA - exception: %s", ex)
    return result


def read_df_from_duckdb(
    database_path: Annotated[str, InjectedToolArg],
    table_name: str,
    num_rows: Annotated[int, InjectedToolArg] = 10,
) -> pd.DataFrame:
    """
    Reads data from a duckdb table into a pandas DataFrame.

    Args:
        table_name: The fully-qualified table name. If schema is specified,
            use `<schema_name>.<table_name>`; else just use `<table_name>`.
    """
    import duckdb

    conn = duckdb.connect(database=database_path, read_only=True)
    df = conn.execute(f"SELECT * FROM {table_name} LIMIT {num_rows}").fetchdf()
    return df


def read_df_from_bigquery(
    service_account_key_file_path: Annotated[str, InjectedToolArg],
    table_id: str,
    num_rows: Annotated[int, InjectedToolArg] = 10,
) -> pd.DataFrame:
    """
    Reads data from a BigQuery table into a pandas DataFrame.

    Args:
        table_id: The fully-qualified table name (`<project_id>.<dataset_id>.<table_id>`).
    """
    from google.cloud.bigquery import Client

    client = Client.from_service_account_json(service_account_key_file_path)
    df = client.query(f"SELECT * FROM {table_id} LIMIT {num_rows}").to_dataframe()

    # Convert 'dbdate' columns to 'datetime64' and 'dbtime' columns to 'timedelta64'
    # 'dbdate' and 'dbtime' are not compatible with pyarrow when serializing and deserializing data
    for column in df.columns:
        if df[column].dtype == "dbdate":
            df[column] = df[column].astype("datetime64")
        elif df[column].dtype == "dbtime":
            df[column] = df[column].astype("timedelta64")

    return df
