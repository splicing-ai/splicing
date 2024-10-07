"use client";

import { useEffect } from "react";
import Chat from "@/components/chat/chat";
import Header from "@/components/common/header";
import Siderbar from "@/components/common/sidebar";
import Notebook from "@/components/project/notebook";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import useHomeStore from "@/store/home";
import useProjectStore from "@/store/project";
import useSettingsStore from "@/store/settings";

export default function ProjectPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const fetchAllSettingItems = useSettingsStore((state) => state.fetchAllItems);
  const [projectId, setProjectId, fetchProject] = useProjectStore((state) => [
    state.projectId,
    state.setProjectId,
    state.fetchProject,
  ]);
  const setCurrentProjectId = useHomeStore(
    (state) => state.setCurrentProjectId,
  );

  useEffect(() => {
    if (id && typeof id === "string") {
      setProjectId(id);
    }
  }, [id, setProjectId]);

  useEffect(() => {
    const initializeProject = async () => {
      if (projectId === id) {
        await fetchAllSettingItems();
        await fetchProject(projectId);
      }
    };
    initializeProject();
    setCurrentProjectId(id);
  }, [fetchAllSettingItems, fetchProject, projectId]);

  return (
    <div className="flex h-screen w-full flex-col">
      <Siderbar />
      <Header />
      <div className="flex flex-col pl-40 pt-14 fixed inset-0">
        <main className="flex items-start gap-4 p-4 h-[calc(100vh-56px)] max-h-[calc(100vh-56px)]">
          <div className="w-full h-full">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              <ResizablePanel className="h-full mr-2">
                <Notebook />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel className="h-full ml-2">
                <Chat />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </main>
      </div>
    </div>
  );
}
