import { LLMType } from "@/components/types/settings";

export interface ProjectMetadata {
  id: string;
  title: string;
  createdOn: string;
  modifiedOn: string;
  llm: LLMType;
  projectDir: string;
}
