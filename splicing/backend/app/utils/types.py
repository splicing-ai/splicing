from enum import Enum


class SectionType(Enum):
    MOVEMENT = "Movement"
    CLEANING = "Cleaning"
    TRANSFORMATION = "Transformation"
    ORCHESTRATION = "Orchestration"


class SettingsSectionType(Enum):
    INTEGRATION = "Integration"
    LLM = "LLM"


class IntegrationType(Enum):
    S3 = "Amazon S3"
    BIGQUERY = "Google BigQuery"
    DUCKDB = "DuckDB"
    PYTHON = "Python Environment"
    OTHER = "Other"


class LLMType(Enum):
    OPENAI = "OpenAI"
    AZURE_OPENAI = "Azure OpenAI"


class MovementTool(Enum):
    PYTHON = "Python"


class CleaningTool(Enum):
    PANDAS = "pandas"


class TransformationTool(Enum):
    DBT = "dbt"
    PANDAS = "pandas"


class OrchestrationTool(Enum):
    AIRFLOW = "Airflow"


Message = dict[str, str]
