import importlib.metadata
import json
import os
import shutil
import subprocess
import sys
from typing import Any

import yaml
from dbt.cli.main import dbtRunner, dbtRunnerResult

from app.utils.helper import get_app_dir, standardize_name
from app.utils.types import IntegrationType


def get_dbt_packages(integration_type: IntegrationType) -> set[str]:
    packages = {"dbt-core"}
    if integration_type == IntegrationType.DUCKDB:
        packages.add("dbt-duckdb")
    elif integration_type == IntegrationType.BIGQUERY:
        packages.add("dbt-bigquery")
    return packages


def install_packages(packages: list[str]) -> None:
    # We need to install packages separately otherwise if one failed,
    # all packages are not installed.
    for package in packages:
        try:
            _ = importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError:
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", package])
            except subprocess.CalledProcessError:
                # TODO: add log
                pass


def execute_python(
    *,
    code: str,
    function_name: str,
    function_args: dict[str, Any],
    working_dir: str,
    files_to_copy: list[str],
) -> tuple[Any, Exception | None]:
    local_dict = {}
    original_cwd = os.getcwd()
    for file in files_to_copy:
        src_path = os.path.join(get_app_dir(), file)
        if os.path.exists(src_path):
            shutil.copy(
                src_path,
                os.path.join(working_dir, file),
            )
    try:
        # TODO: execute python code using subprocess
        exec(code, globals(), local_dict)
        func = local_dict[function_name]
        os.chdir(working_dir)
        result = func(**function_args)
        exception = None
    except Exception as ex:
        exception = ex
        result = None
    finally:
        os.chdir(original_cwd)
    return result, exception


def execute_dbt(
    *,
    model_name: str,
    model: str,
    properties: str,
    project_name: str,
    integration_type: IntegrationType,
    working_dir: str,
) -> tuple[str | None, Exception | None]:
    profiles_dir = os.path.join(working_dir, "dbt_profiles")
    target = standardize_name(integration_type.name)
    profile_cli_args = [
        "--profiles-dir",
        profiles_dir,
        "--profile",
        project_name,
        "--target",
        target,
    ]
    project_dir = os.path.join(working_dir, project_name)
    model_sql_path = os.path.join(project_dir, "models", f"{model_name}.sql")
    model_yml_path = os.path.join(project_dir, "models", f"{model_name}.yml")

    try:
        # write model
        with open(model_sql_path, "w") as sql_file:
            sql_file.write(model)
        with open(model_yml_path, "w") as yml_file:
            yml_file.write(properties)

        # run model
        run_cli_args = [
            "run",
            "--project-dir",
            project_dir,
            "--select",
            model_name,
        ]
        run_result = dbtRunner().invoke(run_cli_args + profile_cli_args)
        if run_result.success:
            # return "success" as a placeholder that the execution succeeds
            result, exception = "success", None
        else:
            result, exception = None, extract_dbt_error_messages(run_result)
        return result, exception
    finally:
        # remove created files because model name is likely to be changed
        if os.path.exists(model_sql_path):
            os.remove(model_sql_path)
        if os.path.exists(model_yml_path):
            os.remove(model_yml_path)


def create_dbt_profile(
    profile_name: str,
    profiles_dir: str,
    integration_type: IntegrationType,
    settings: dict,
) -> None:
    type_name = standardize_name(integration_type.name)
    if integration_type == IntegrationType.DUCKDB:
        profile = {
            "path": settings["databaseFilePath"],
            "schema": settings.get("schema", "main"),
        }
    elif integration_type == IntegrationType.BIGQUERY:
        service_account_key_file_path = os.path.join(
            get_app_dir(), settings["serviceAccountKeyFileName"]
        )
        with open(service_account_key_file_path) as file:
            service_account_key_json = json.load(file)
        profile = {
            "method": "service-account-json",
            "project": settings["projectId"],
            "dataset": settings["datasetId"],
            "keyfile_json": service_account_key_json,
        }
    else:
        return
    profile["type"] = type_name

    # write profile file
    os.makedirs(profiles_dir, exist_ok=True)
    profiles_path = os.path.join(profiles_dir, "profiles.yml")
    if os.path.exists(profiles_path):
        with open(profiles_path) as file:
            profiles = yaml.safe_load(file) or {}
    else:
        profiles = {}
    if profile_name not in profiles:
        profiles[profile_name] = {}
    if "outputs" not in profiles[profile_name]:
        profiles[profile_name]["outputs"] = {}
    profiles[profile_name]["outputs"][type_name] = profile
    with open(profiles_path, "w") as file:
        yaml.dump(profiles, file, default_flow_style=False)


def rename_dbt_profile(
    profile_name: str, profiles_dir: str, new_profile_name: str
) -> None:
    profiles_path = os.path.join(profiles_dir, "profiles.yml")
    if os.path.exists(profiles_path):
        with open(profiles_path) as file:
            profiles = yaml.safe_load(file) or {}
        if profile_name in profiles:
            profiles[new_profile_name] = profiles[profile_name]
            profiles.pop(profile_name)
            with open(profiles_path, "w") as file:
                yaml.dump(profiles, file, default_flow_style=False)


def init_dbt_project(
    project_name: str,
    working_dir: str,
) -> None:
    # initialize project if it's not initialized before
    project_dir = os.path.join(working_dir, project_name)
    if not os.path.exists(project_dir):
        profiles_dir = os.path.join(working_dir, "dbt_profiles")
        profile_cli_args = [
            "--profiles-dir",
            profiles_dir,
            "--profile",
            project_name,
        ]

        original_cwd = os.getcwd()
        try:
            os.chdir(working_dir)
            init_cli_args = ["init", project_name] + profile_cli_args
            init_result = dbtRunner().invoke(init_cli_args)
        finally:
            os.chdir(original_cwd)
        if not init_result.success:
            raise ValueError(
                f"Initialize dbt project failed: {extract_dbt_error_messages(init_result)}"
            )


def extract_dbt_error_messages(run_result: dbtRunnerResult) -> str:
    error_messages = []
    if hasattr(run_result, "result") and hasattr(run_result.result, "results"):
        for result in run_result.result.results:
            if hasattr(result, "message") and result.message:
                error_messages.append(result.message)
    if hasattr(run_result, "exception") and run_result.exception:
        error_messages.append(str(run_result.exception))
    return "\n\n".join(error_messages) if error_messages else str(run_result)
