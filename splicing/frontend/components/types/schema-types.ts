import { components as schemaComponents } from "@/generated/schema";
import { components as typeComponents } from "@/generated/type";

// schemas
export type Message = schemaComponents["schemas"]["Message"];
export type PythonGenerateResult =
  schemaComponents["schemas"]["PythonGenerateResult"];
export type MovementGenerateResult =
  schemaComponents["schemas"]["MovementGenerateResult"];
export type CleaningGenerateResult =
  schemaComponents["schemas"]["CleaningGenerateResult"];
export type TransformationPythonGenerateResult =
  schemaComponents["schemas"]["TransformationPythonGenerateResult"];
export type TransformationDbtGenerateResult =
  schemaComponents["schemas"]["TransformationDbtGenerateResult"];
export type OrchestrationGenerateResult =
  schemaComponents["schemas"]["OrchestrationGenerateResult"];
export type TransformationGenerateResult =
  schemaComponents["schemas"]["TransformationGenerateResult"];
export type GenerateResult = schemaComponents["schemas"]["GenerateResult"];
export type ExecuteResult = schemaComponents["schemas"]["ExecuteResult"];
export type BlockMetadata = schemaComponents["schemas"]["BlockMetadata"];
export type BlockData = schemaComponents["schemas"]["BlockData"];
export type SectionMetadata = schemaComponents["schemas"]["SectionMetadata"];
export type SectionData = schemaComponents["schemas"]["SectionData"];
export type ConversationPayload =
  schemaComponents["schemas"]["ConversationPayload"];
export type ProjectMetadata = schemaComponents["schemas"]["ProjectMetadata"];
export type ProjectSetupPayload =
  schemaComponents["schemas"]["ProjectSetupPayload"];
export type ProjectData = schemaComponents["schemas"]["ProjectData"];
export type UpdateCodePayload =
  schemaComponents["schemas"]["UpdateCodePayload"];
export type ExecuteReturn = schemaComponents["schemas"]["ExecuteReturn"];
export type TransformationSetup =
  schemaComponents["schemas"]["TransformationSetup"];
export type OrchestrationSetup =
  schemaComponents["schemas"]["OrchestrationSetup"];
export type CleaningSetup = schemaComponents["schemas"]["CleaningSetup"];
export type MovementSetup = schemaComponents["schemas"]["MovementSetup"];
export type BlockSetup = schemaComponents["schemas"]["BlockSetup"];

// types
export {
  LLMType,
  IntegrationType,
  SettingsSectionType,
  SectionType,
  MovementTool,
  CleaningTool,
  TransformationTool,
  OrchestrationTool,
} from "@/generated/type";
export type SettingsKey = typeComponents["schemas"]["SettingsKey"];
