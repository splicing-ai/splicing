import { CleaningSetup } from "@/components/setup/cleaning-setup";
import { MovementSetup } from "@/components/setup/movement-setup";
import { OrchestrationSetup } from "@/components/setup/orchestration-setup";
import { TransformationSetup } from "@/components/setup/transformation-setup";

export enum SectionType {
  Movement = "Movement",
  Cleaning = "Cleaning",
  Transformation = "Transformation",
  Orchestration = "Orchestration",
}

interface FunctionArgs {
  [key: string]: any;
}

export interface MovementGenerateResult {
  code: string;
  functionName: string;
  functionArgs: FunctionArgs;
  returnValue?: string;
  packages?: string[];
}

export interface CleaningGenerateResult {
  code: string;
  functionName: string;
  functionArgs: FunctionArgs;
  returnValue?: string;
  packages?: string[];
}

export interface TransformationPythonGenerateResult {
  code: string;
  functionName: string;
  functionArgs: FunctionArgs;
  returnValue?: string;
  packages?: string[];
}

export interface TransformationDbtGenerateResult {
  modelName: string;
  model: string;
  properties: string;
}

export type TransformationGenerateResult =
  | TransformationPythonGenerateResult
  | TransformationDbtGenerateResult;

export interface OrchestrationGenerateResult {
  dagName: string;
  code: string;
}

export type GenerateResult =
  | MovementGenerateResult
  | CleaningGenerateResult
  | TransformationGenerateResult
  | OrchestrationGenerateResult;

export interface ExecuteResult {
  returnValue?: string;
  error?: string;
}

export interface Block {
  id: string;
  numRows: number;
  generateResult?: GenerateResult;
  data?: { [key: string]: string };
  executeResult?: ExecuteResult;
  setup?: BlockSetup;
}

export interface Section {
  id: string;
  title: string;
  sectionType: SectionType;
  blocks: Block[];
  currentBlockId?: string;
}

export type BlockSetup =
  | MovementSetup
  | CleaningSetup
  | TransformationSetup
  | OrchestrationSetup;

export enum MovementTool {
  Python = "Python",
}

export enum CleaningTool {
  Pandas = "pandas",
}

export enum TransformationTool {
  DBT = "dbt",
  Pandas = "pandas",
}

export enum OrchestrationTool {
  Airflow = "Airflow",
}
