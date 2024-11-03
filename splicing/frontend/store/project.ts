import { create } from 'zustand';
import { SectionData, SectionType, BlockSetup, ProjectMetadata, GenerateResult, Message } from '@/components/types/schema-types';
import { backendClient } from '@/lib/backend';

interface ProjectState {
  projectId: string,
  metadata: ProjectMetadata | undefined;
  setProjectId: (id: string) => void;
  currentSectionId: string;
  setCurrentSectionId: (id: string) => void;
  sections: SectionData[];
  getCurrentSection: () => SectionData | undefined;
  addSetup: (blockId: string, setup: BlockSetup) => Promise<void>;
  resetSetup: (blockId: string) => Promise<void>;
  addSection: (sectionId: string, sectionType: SectionType) => Promise<void>;
  removeSection: (sectionId: string) => Promise<void>;
  renameSection: (sectionId: string, newTitle: string) => Promise<void>;
  moveUpSection: (index: number, sectionId: string) => Promise<void>;
  moveDownSection: (index: number, sectionId: string) => Promise<void>;
  setCurrentBlock: (blockId?: string) => Promise<void>;
  addBlock: () => Promise<void>;
  removeBlock: (blockId: string) => Promise<void>;
  resetBlock: (blockId: string) => Promise<void>;
  addGenerateResult: (blockId: string) => Promise<void>;
  addExecuteResult: (blockId: string, code?: string[]) => Promise<boolean>;
  saveCode: (blockId: string, code: string[]) => Promise<void>;
  messages: Message[];
  addMessage: (message: Message) => Promise<void>;
  resetConversation: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  loadingMessage: string;
  setLoadingMessage: (message: string) => void;
  withLoadingMessage: (message: string, action: () => Promise<any>) => Promise<any>;
  handleStreamResponse: () => (chunk: any) => void;
}

const useProjectStore = create<ProjectState>((set, get) => ({
  projectId: "",
  metadata: undefined,
  setProjectId: (id: string) => {
    set({ projectId: id })
  },
  currentSectionId: "",
  setCurrentSectionId: (id: string) => {
    set({ currentSectionId: id })
  },
  sections: [],
  getCurrentSection: () => {
    const { sections, currentSectionId } = get();
    return sections.find(section => section.id === currentSectionId);
  },
  addSection: async (title: string, sectionType: SectionType) => {
    const { projectId } = get();
    const sectionId = await backendClient.addSection(projectId, title, sectionType);
    set((state) => ({
      sections: [...state.sections, { id: sectionId, title: title, sectionType: sectionType, blocks: [] }],
      currentSectionId: sectionId,
    }));
  },
  removeSection: async (sectionId: string) => {
    const { projectId } = get();
    await backendClient.deleteSection(projectId, sectionId);
    set((state) => ({
      sections: state.sections.filter(section => section.id !== sectionId)
    }));
  },
  renameSection: async (sectionId: string, newTitle: string) => {
    const { projectId } = get();
    await backendClient.renameSection(projectId, sectionId, newTitle);
    set((state) => ({
      sections: state.sections.map((section) =>
        section.id === sectionId ? { ...section, title: newTitle } : section
      )
    }));
  },
  moveUpSection: async (index: number, sectionId: string) => {
    if (index > 0) {
      const { projectId } = get();
      await backendClient.moveSection(projectId, sectionId, "up");
      set((state) => {
          const newSections = [...state.sections];
          const [section] = newSections.splice(index, 1);
          newSections.splice(index - 1, 0, section);
          return { sections: newSections };
      });
    }
  },
  moveDownSection: async (index: number, sectionId: string) => {
    const { projectId, sections } = get();
    if (index < sections.length - 1) {
      await backendClient.moveSection(projectId, sectionId, "down");
      set((state) => {
        const newSections = [...state.sections];
        const [section] = newSections.splice(index, 1);
        newSections.splice(index + 1, 0, section);
        return { sections: newSections };
      });
    }
  },
  setCurrentBlock: async (blockId?: string) => {
    const { projectId, currentSectionId, getCurrentSection } = get();
    const currentSection = getCurrentSection();
    if (currentSection && currentSection.currentBlockId !== blockId) {
      await backendClient.setCurrentBlock(projectId, currentSectionId, blockId ?? null);
      set((state) => ({
        sections: state.sections.map((section) =>
          section.id === currentSectionId ? { ...section, currentBlockId: blockId } : section
          )
        }));
    }
  },
  addBlock: async () => {
    const { projectId, currentSectionId, getCurrentSection } = get();
    const currentSection = getCurrentSection();
    if (currentSection) {
      const numRows = 10;
      const blockId = await backendClient.addBlock(projectId, currentSectionId, numRows);
      const updatedBlocks = [...currentSection.blocks, { id: blockId, numRows: numRows }];
      set((state) => ({
        sections: state.sections.map((section) =>
          section.id === currentSectionId
            ? { ...section, blocks: updatedBlocks, currentBlockId: currentSection.blocks.length === 0 ? blockId : section.currentBlockId }
            : section
        )
      }));
    }
  },
  removeBlock: async (blockId: string) => {
    const { projectId, currentSectionId, getCurrentSection } = get();
    const currentSection = getCurrentSection();
    if (currentSection) {
      await backendClient.deleteBlock(projectId, currentSectionId, blockId);
      const updatedBlocks = currentSection.blocks.filter(block => block.id !== blockId);
      set((state) => ({
        sections: state.sections.map((section) =>
          section.id === currentSectionId ? { ...section, blocks: updatedBlocks } : section
        )
      }));
    }
  },
  resetBlock: async (blockId: string) => {
    const { projectId, currentSectionId, getCurrentSection } = get();
    const currentSection = getCurrentSection();
    if (currentSection) {
      await backendClient.resetBlock(projectId, currentSectionId, blockId);
      const updatedBlocks = currentSection.blocks.map((block) =>
        block.id === blockId ? { id: blockId, numRows: block.numRows } : block
      );
      set((state) => ({
        sections: state.sections.map((section) =>
          section.id === currentSectionId ? { ...section, blocks: updatedBlocks } : section
        )
      }));
    }
  },
  addSetup: async (blockId: string, setup: BlockSetup) => {
    const { projectId, currentSectionId, getCurrentSection,  handleStreamResponse, withLoadingMessage } = get();
    const currentSection = getCurrentSection();
    if (currentSection) {
      await withLoadingMessage("I'm saving your setup...", async () => {
        await backendClient.setBlockSetup(projectId, currentSectionId, blockId, setup)
      });
      const updatedBlocks = currentSection.blocks.map((block) =>
        block.id === blockId ? { ...block, setup: setup } : block
      );
      set((state) => ({
        sections: state.sections.map((section) =>
          section.id === currentSectionId ? { ...section, blocks: updatedBlocks, currentBlockId: blockId } : section
        )
      }));

      await backendClient.recommendTechniquesStream(
        projectId,
        currentSectionId,
        blockId,
        handleStreamResponse(),
      );
    }
  },
  resetSetup: async (blockId: string) => {
    const { projectId, currentSectionId, getCurrentSection } = get();
    const currentSection = getCurrentSection();
    if (currentSection) {
      await backendClient.resetBlockSetup(projectId, currentSectionId, blockId);
      const updatedBlocks = currentSection.blocks.map((block) =>
        block.id === blockId ? { ...block, setup: undefined } : block
      );
      set((state) => ({
        sections: state.sections.map((section) =>
          section.id === currentSectionId ? { ...section, blocks: updatedBlocks } : section
        )
      }));
    }
  },
  addGenerateResult: async (blockId: string) => {
    const { projectId, currentSectionId, getCurrentSection, withLoadingMessage } = get();
    const currentSection = getCurrentSection();
    if (currentSection) {
      const result = await withLoadingMessage("Generating code...", () =>
        backendClient.generateCode(projectId, currentSectionId, blockId)
      );
      const updatedBlocks = currentSection.blocks.map((block) =>
        block.id === blockId ? { ...block, generateResult: result } : block
      );
      set((state) => ({
        sections: state.sections.map((section) =>
          section.id === currentSectionId ? { ...section, blocks: updatedBlocks, currentBlockId: blockId } : section
        )
      }));
    }
  },
  addExecuteResult: async (blockId: string, code?: string[]) => {
    const { projectId, currentSectionId, getCurrentSection, withLoadingMessage } = get();
    const currentSection = getCurrentSection();
    if (currentSection) {
      const { data, executeResult, generateResult } = await withLoadingMessage("Executing code...", () =>
        backendClient.executeCode(projectId, currentSectionId, blockId, code)
      );
      const updatedBlocks = currentSection.blocks.map((block) =>
        block.id === blockId ? { ...block, data: data || {}, executeResult: executeResult, generateResult: generateResult ?? block.generateResult } : block
      );
      set((state) => ({
        sections: state.sections.map((section) =>
          section.id === currentSectionId ? { ...section, blocks: updatedBlocks, currentBlockId: blockId } : section
        )
      }));
      if (executeResult.error) {
        return false;
      }
    }
    return true;
  },
  saveCode: async (blockId: string, code: string[]) => {
    const { projectId, currentSectionId, getCurrentSection, withLoadingMessage } = get();
    const currentSection = getCurrentSection();
    if (currentSection) {
      const generateResult = await withLoadingMessage("Saving code...", () =>
        backendClient.saveCode(projectId, currentSectionId, blockId, code)
      );
      const updatedBlocks = currentSection.blocks.map((block) =>
        block.id === blockId ? { ...block, generateResult: generateResult ?? block.generateResult } : block
      );
      set((state) => ({
        sections: state.sections.map((section) =>
          section.id === currentSectionId ? { ...section, blocks: updatedBlocks, currentBlockId: blockId } : section
        )
      }));
    }
  },
  messages: [],
  addMessage: async (message: Message) => {
    const { projectId, currentSectionId, handleStreamResponse } = get();
    set((state) => ({
      messages: [...state.messages, message]
    }));

    await backendClient.converseStream(
      projectId,
      message,
      currentSectionId,
      handleStreamResponse(),
    );
  },
  resetConversation: async () => {
    const { projectId } = get();
    const response = await backendClient.resetConverssation(projectId);
    set({ messages: response });
  },
  fetchProject: async (id: string) => {
    const { metadata, sections, messages, lastWorkedSectionId } = await backendClient.fetchProject(id);

    let currentSectionId;
    if (lastWorkedSectionId) {
      currentSectionId = lastWorkedSectionId;
    }
    else {
      currentSectionId = sections.length > 0 ? sections[0].id : "";
    }

    set({ currentSectionId: currentSectionId, metadata: metadata, sections: sections, messages: messages, projectId: id });
  },
  loadingMessage: "",
  setLoadingMessage: (message: string) => set({ loadingMessage: message }),
  withLoadingMessage: async (message: string, action: () => Promise<any>) => {
    const { setLoadingMessage } = get();
    setLoadingMessage(message);
    try {
      return await action();
    } finally {
      setLoadingMessage("");
    }
  },
  handleStreamResponse: () => {
    let responseMessage: Message | null = null;
    // use a buffer to store the chunks and flush them when the buffer is full
    // to ensure smooth streaming
    let bufferedChunks: any[] = [];
    const BATCH_SIZE = 10;

    const flushBuffer = () => {
      if (bufferedChunks.length === 0) return;

      let aggregatedMessageContent = '';
      let hasRecommend = false;
      let recommendContent = '';
      let generateResult: GenerateResult | undefined = undefined;

      bufferedChunks.forEach((chunk) => {
        if (chunk.type === 'message') {
          aggregatedMessageContent += chunk.data;
        } else if (chunk.type === 'recommend') {
          hasRecommend = true;
          recommendContent = chunk.data;
        } else if (chunk.type === 'generate-result') {
          generateResult = JSON.parse(chunk.data);
        }
      });

      if (aggregatedMessageContent || hasRecommend) {
        if (!responseMessage) {
          responseMessage = {
            role: 'assistant',
            content: hasRecommend ? recommendContent : aggregatedMessageContent,
          };
          set((state) => ({
            messages: [...state.messages, responseMessage!]
          }));
        } else {
          responseMessage.content = hasRecommend
            ? recommendContent
            : responseMessage.content + aggregatedMessageContent;
          set((state) => ({
            messages: [...state.messages.slice(0, -1), { ...responseMessage! }]
          }));
        }
      }

      if (generateResult) {
        const { currentSectionId, getCurrentSection } = get();
        const currentSection = getCurrentSection();
        if (currentSection?.currentBlockId) {
          const updatedBlocks = currentSection.blocks.map((block) =>
            block.id === currentSection.currentBlockId
              ? { ...block, generateResult: generateResult }
              : block
          );
          set((state) => ({
            sections: state.sections.map((section) =>
              section.id === currentSectionId ? { ...section, blocks: updatedBlocks } : section
            )
          }));
        }
      }

      bufferedChunks = [];
    };

    return (chunk: any) => {
      if (chunk !== null) {
        bufferedChunks.push(chunk);
      }

      if (bufferedChunks.length >= BATCH_SIZE || chunk === null) {
        flushBuffer();
      }
    };
  },
}));

export default useProjectStore;
