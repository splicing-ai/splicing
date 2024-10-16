import { BigQueryInfo } from "@/components/settings/integration/bigquery";
import { DuckDBInfo } from "@/components/settings/integration/duckdb";
import { PythonInfo } from "@/components/settings/integration/python";
import { S3Info } from "@/components/settings/integration/s3";
import { OpenAIInfo } from "@/components/settings/llm/openai";
import {
  SettingsSectionType,
  SettingsKey,
} from "@/components/types/schema-types";

export type IntegrationInfo = S3Info | BigQueryInfo | DuckDBInfo | PythonInfo;

export type LLMInfo = OpenAIInfo;

export type SettingsValue = IntegrationInfo | LLMInfo;

export interface SettingsData {
  sectionType: SettingsSectionType;
  key: SettingsKey;
  value: SettingsValue;
}
