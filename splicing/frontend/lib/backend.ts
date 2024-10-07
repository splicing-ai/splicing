import { Message } from "@/components/types/message";
import { ProjectMetadata } from "@/components/types/project";
import {
  BlockSetup,
  ExecuteResult,
  GenerateResult,
  SectionType,
  Section,
} from "@/components/types/section";
import {
  SettingsSectionType,
  SettingsKey,
  SettingsItem,
  SettingsValue,
  LLMType,
} from "@/components/types/settings";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;

interface ProjectFetchReturn {
  metadata: ProjectMetadata;
  sections: Section[];
  messages: Message[];
  lastWorkedSectionId: string;
}

interface ExecuteReturn {
  data: { [key: string]: string };
  executeResult: ExecuteResult;
  generateResult?: GenerateResult;
}

class BackendClient {
  private async handleResponse(response: Response) {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    if (response.status === 204) {
      return;
    }
    const data = await response.json();
    return data;
  }

  private async get(endpoint: string) {
    const url = `${backendUrl}/${endpoint}`;
    const response = await fetch(url);
    return await this.handleResponse(response);
  }

  private async delete(endpoint: string) {
    const url = `${backendUrl}/${endpoint}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    return await this.handleResponse(response);
  }

  private async patch(endpoint: string, body?: any) {
    const url = `${backendUrl}/${endpoint}`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await this.handleResponse(response);
  }

  private async post(endpoint: string, body?: any) {
    const url = `${backendUrl}/${endpoint}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await this.handleResponse(response);
  }

  public async startProject(
    title: string,
    llm: LLMType,
  ): Promise<ProjectMetadata> {
    const payload = {
      title: title,
      llm: llm,
    };
    const result = await this.post("start", payload);
    return result;
  }

  public async closeProject(projectId: string): Promise<void> {
    await this.delete(`close/${projectId}`);
  }

  public async setupProejct(
    projectId: string,
    title: string,
    llm: LLMType,
    projectDir: string,
  ): Promise<void | string> {
    const payload = {
      title: title,
      llm: llm,
      projectDir: projectDir,
    };
    const response = await this.patch(`project_setup/${projectId}`, payload);
    if (response) {
      return response;
    }
  }

  public async fetchProjectsMetadata(): Promise<ProjectMetadata[]> {
    const result = (await this.get("projects")) as ProjectMetadata[];
    return result;
  }

  public async fetchProject(projectId: string): Promise<ProjectFetchReturn> {
    const result = (await this.get(
      `project/${projectId}`,
    )) as ProjectFetchReturn;
    return result;
  }

  public async addSettingsItem(
    sectionType: SettingsSectionType,
    key: SettingsKey,
    value: SettingsValue,
  ): Promise<void> {
    const payload = { sectionType: sectionType, key: key, value: value };
    await this.post("settings/add", payload);
  }

  public async deleteSettingsItem(
    sectionType: SettingsSectionType,
    key: SettingsKey,
  ): Promise<void> {
    await this.delete(`settings/delete/${sectionType}/${key}`);
  }

  public async fetchSettings(): Promise<SettingsItem[]> {
    const result = (await this.get("settings")) as SettingsItem[];
    return result;
  }

  public async addSection(
    projectId: string,
    title: string,
    sectionType: SectionType,
  ): Promise<string> {
    const payload = { title: title, sectionType: sectionType };
    const result = await this.post(`section/add/${projectId}`, payload);
    return result;
  }

  public async deleteSection(
    projectId: string,
    sectionId: string,
  ): Promise<void> {
    await this.delete(`section/delete/${projectId}/${sectionId}`);
  }

  public async renameSection(
    projectId: string,
    sectionId: string,
    newTitle: string,
  ): Promise<void> {
    await this.post(`section/rename/${projectId}/${sectionId}/${newTitle}`);
  }

  public async moveSection(
    projectId: string,
    sectionId: string,
    direction: string,
  ): Promise<void> {
    await this.post(`section/move/${projectId}/${sectionId}/${direction}`);
  }

  public async setCurrentBlock(
    projectId: string,
    sectionId: string,
    blockId: string | null,
  ): Promise<void> {
    const endpoint = `section/set_current_block/${projectId}/${sectionId}`;
    const queryParams = blockId ? `?block_id=${blockId}` : "";
    await this.post(`${endpoint}${queryParams}`);
  }

  public async setBlockSetup(
    projectId: string,
    sectionId: string,
    blockId: string,
    setup: BlockSetup,
  ): Promise<Message | void> {
    const result = await this.post(
      `block/setup/${projectId}/${sectionId}/${blockId}`,
      setup,
    );
    if (result) {
      return result as Message;
    }
  }

  public async resetBlockSetup(
    projectId: string,
    sectionId: string,
    blockId: string,
  ): Promise<void> {
    await this.delete(`block/reset_setup/${projectId}/${sectionId}/${blockId}`);
  }

  public async addBlock(
    projectId: string,
    sectionId: string,
    numRows: number,
  ): Promise<string> {
    const payload = { numRows: numRows };
    const result = await this.post(
      `block/add/${projectId}/${sectionId}`,
      payload,
    );
    return result;
  }

  public async deleteBlock(
    projectId: string,
    sectionId: string,
    blockId: string,
  ): Promise<void> {
    await this.delete(`block/delete/${projectId}/${sectionId}/${blockId}`);
  }

  public async resetBlock(
    projectId: string,
    sectionId: string,
    blockId: string,
  ): Promise<void> {
    await this.patch(`block/reset/${projectId}/${sectionId}/${blockId}`);
  }

  public async generateCode(
    projectId: string,
    sectionId: string,
    blockId: string,
  ): Promise<GenerateResult> {
    const result = (await this.post(
      `block/generate/${projectId}/${sectionId}/${blockId}`,
    )) as GenerateResult;
    return result;
  }

  public async executeCode(
    projectId: string,
    sectionId: string,
    blockId: string,
    code?: string[],
  ): Promise<ExecuteReturn> {
    const endpoint = `block/execute/${projectId}/${sectionId}/${blockId}`;
    const result = (await this.post(
      endpoint,
      code ? { code: code } : undefined,
    )) as ExecuteReturn;
    return result;
  }

  public async saveCode(
    projectId: string,
    sectionId: string,
    blockId: string,
    code: string[],
  ): Promise<GenerateResult | undefined> {
    const payload = { code: code };
    const result = await this.patch(
      `block/save/${projectId}/${sectionId}/${blockId}`,
      payload,
    );
    return result;
  }

  public async converse(
    projectId: string,
    message: Message,
    currentSectionId: string,
  ): Promise<Message> {
    const payload = {
      message: message,
      currentSectionId: currentSectionId,
    };
    const result = (await this.post(
      `conversation/converse/${projectId}`,
      payload,
    )) as Message;
    return result;
  }

  public async resetConverssation(projectId: string): Promise<Message[]> {
    const result = (await this.patch(
      `conversation/reset/${projectId}`,
    )) as Message[];
    return result;
  }

  public async fetchConversation(projectId: string): Promise<Message[] | null> {
    const result = (await this.get(`conversation/${projectId}`)) as Message[];
    return result;
  }

  public async downloadCode(projectId: string): Promise<Blob> {
    const url = `${backendUrl}/download_code/${projectId}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/zip" },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.blob();
  }
}

export const backendClient = new BackendClient();