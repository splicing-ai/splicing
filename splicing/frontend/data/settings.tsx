import { LucideIcon, Bot, Blend } from "lucide-react";
import {
  SettingsSectionType,
  IntegrationType,
  LLMType,
} from "@/components/types/settings";
import { S3Form } from "@/components/settings/integration/s3";
import { BigQueryForm } from "@/components/settings/integration/bigquery";
import { DuckDBForm } from "@/components/settings/integration/duckdb";
import { OpenAIForm } from "@/components/settings/llm/openai";
import { PythonForm } from "@/components/settings/integration/python";


export const settingsSectionIconMap: { [key in SettingsSectionType]: LucideIcon } = {
  [SettingsSectionType.Integration]: Blend,
  [SettingsSectionType.LLM]: Bot,
};

export const supportedIntegrations: { [key in IntegrationType]: React.FC } = {
  [IntegrationType.S3]: S3Form,
  [IntegrationType.BigQuery]: BigQueryForm,
  [IntegrationType.DuckDB]: DuckDBForm,
  [IntegrationType.Python]: PythonForm,
};

export const supportedLLMs: { [key in LLMType]: React.FC } = {
  [LLMType.OpenAI]: OpenAIForm,
};
