import { LucideIcon, Bot, Blend } from "lucide-react";
import {
  SettingsSectionType,
  IntegrationType,
  LLMType,
} from "@/components/types/schema-types";
import { S3Form } from "@/components/settings/integration/s3";
import { BigQueryForm } from "@/components/settings/integration/bigquery";
import { DuckDBForm } from "@/components/settings/integration/duckdb";
import { OpenAIForm } from "@/components/settings/llm/openai";
import { AnthropicForm } from "@/components/settings/llm/anthropic";
import { PythonForm } from "@/components/settings/integration/python";


export const settingsSectionIconMap: { [key in SettingsSectionType]: LucideIcon } = {
  [SettingsSectionType.INTEGRATION]: Blend,
  [SettingsSectionType.LLM]: Bot,
};

export const supportedIntegrations: { [key in IntegrationType]: React.FC | null } = {
  [IntegrationType.S3]: S3Form,
  [IntegrationType.BIGQUERY]: BigQueryForm,
  [IntegrationType.DUCKDB]: DuckDBForm,
  [IntegrationType.PYTHON]: PythonForm,
  [IntegrationType.OTHER]: null,
};

export const supportedLLMs: { [key in LLMType]: React.FC } = {
  [LLMType.OPENAI]: OpenAIForm,
  [LLMType.ANTHROPIC]: AnthropicForm,
};
