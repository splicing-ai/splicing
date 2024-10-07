import { BigQueryInfo } from "@/components/settings/integration/bigquery";
import { DuckDBInfo } from "@/components/settings/integration/duckdb";
import { PythonInfo } from "@/components/settings/integration/python";
import { S3Info } from "@/components/settings/integration/s3";
import { OpenAIInfo } from "@/components/settings/llm/openai";

export enum SettingsSectionType {
  Integration = "Integration",
  LLM = "LLM",
}

export enum IntegrationType {
  S3 = "Amazon S3",
  DuckDB = "DuckDB",
  BigQuery = "Google BigQuery",
  Python = "Python Environment",
}

export type IntegrationInfo = S3Info | BigQueryInfo | DuckDBInfo | PythonInfo;

export enum LLMType {
  OpenAI = "OpenAI",
}

export type LLMInfo = OpenAIInfo;

export type SettingsKey = IntegrationType | LLMType;

export type SettingsValue = IntegrationInfo | LLMInfo;

export interface SettingsItem {
  sectionType: SettingsSectionType;
  key: SettingsKey;
  value: SettingsValue;
}
