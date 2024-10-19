import os

import yaml
from fastapi import APIRouter, Depends, Response, status

from app.api.dependencies import RedisClient, get_redis_client
from app.generated.schema import (
    IntegrationType,
    LLMType,
    SettingsData,
    SettingsSectionType,
)
from app.utils.helper import standardize_name
from app.utils.project_helper import get_app_dir

router = APIRouter()


@router.post("/add")
async def add(
    payload: SettingsData, redis_client: RedisClient = Depends(get_redis_client)
) -> Response:
    integration_name = str(payload.key.value)
    settings = payload.value
    working_dir = get_app_dir()
    os.makedirs(working_dir, exist_ok=True)
    if payload.sectionType == SettingsSectionType.INTEGRATION:
        standardized_integration = standardize_name(integration_name)
        sensitive_fields = settings.get("sensitiveFields", [])
        if any(settings[k] for k in sensitive_fields):
            credentials_path = os.path.join(working_dir, "credentials.yml")
            if os.path.exists(credentials_path):
                with open(credentials_path) as file:
                    credentials = yaml.safe_load(file) or {}
            else:
                credentials = {}
            if standardized_integration not in credentials:
                credentials[standardized_integration] = {}
            for key in sensitive_fields:
                credentials[standardized_integration][key] = settings[key]
            with open(
                credentials_path,
                "w",
            ) as file:
                yaml.dump(credentials, file, default_flow_style=False)

        integration_type = IntegrationType(integration_name)
        if integration_type == IntegrationType.BIGQUERY:
            if settings["serviceAccountKey"]:
                service_account_key_file_path = os.path.join(
                    working_dir, settings["serviceAccountKeyFileName"]
                )
                with open(service_account_key_file_path, "w") as file:
                    file.write(settings["serviceAccountKey"])
                settings["serviceAccountKey"] = ""

    await redis_client.set_settings_data(
        payload.sectionType.value, integration_name, settings
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/delete/{section_type}/{key}")
async def delete(
    section_type: str, key: str, redis_client: RedisClient = Depends(get_redis_client)
) -> Response:
    section_type = SettingsSectionType(section_type)
    if section_type == SettingsSectionType.INTEGRATION:
        working_dir = get_app_dir()
        credentials_path = os.path.join(working_dir, "credentials.yml")
        if os.path.exists(credentials_path):
            with open(credentials_path) as file:
                credentials = yaml.safe_load(file) or {}

            standardized_integration = standardize_name(key)
            if standardized_integration in credentials:
                credentials.pop(standardized_integration, None)

            if credentials:
                with open(credentials_path, "w") as file:
                    yaml.dump(credentials, file, default_flow_style=False)
            else:
                if os.path.exists(credentials_path):
                    os.remove(credentials_path)

    await redis_client.delete_settings_data(section_type.value, key)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("")
async def fetch(
    redis_client: RedisClient = Depends(get_redis_client),
) -> list[SettingsData]:
    result = await redis_client.get_all_settings_data()
    for e in result:
        e["sectionType"] = SettingsSectionType(e["sectionType"])
        if e["sectionType"] == SettingsSectionType.INTEGRATION:
            e["key"] = IntegrationType(e["key"])
        elif e["sectionType"] == SettingsSectionType.LLM:
            e["key"] = LLMType(e["key"])
    return [SettingsData(**e) for e in result]
