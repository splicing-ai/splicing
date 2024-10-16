import { create } from 'zustand';
import { ProjectMetadata } from '@/components/types/schema-types';
import { backendClient } from '@/lib/backend';
import { LLMType } from '@/components/types/schema-types';

interface HomeState {
  currentProjectId: string | undefined;
  setCurrentProjectId: (id: string | undefined) => void;
  projects: ProjectMetadata[];
  addProject: (title: string, llm: LLMType) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  fetchAllProjects: () => Promise<void>;
  setupProject: (id: string, title: string, llm: LLMType, projectDir: string) => Promise<void | string>;
}

const useHomeStore = create<HomeState>((set) => ({
  currentProjectId: undefined,
  setCurrentProjectId: (id: string | undefined) => {
    set({ currentProjectId: id })
  },
  projects: [],
  addProject: async (title: string, llm: LLMType) => {
    const metadata = await backendClient.startProject(title, llm);
    set((state) => ({
      projects: [...state.projects, metadata]
    }));
  },
  removeProject: async (id: string) => {
    await backendClient.closeProject(id);
    set((state) => ({
      projects: state.projects.filter(project => project.id !== id)
    }));
  },
  fetchAllProjects: async () => {
    const projects = await backendClient.fetchProjectsMetadata();
    set({ projects: projects });
  },
  setupProject: async (id: string, title: string, llm: LLMType, projectDir: string) => {
    const error = await backendClient.setupProejct(id, title, llm, projectDir);
    if (error) {
      return error;
    }
    set((state) => ({
      projects: state.projects.map(project =>
        project.id === id ? { ...project, title: title, llm: llm, projectDir: projectDir } : project
      )
    }));
  }
}));

export default useHomeStore;
