import { LucideIcon } from "lucide-react"; // eslint-disable-line import/named
import { useState } from "react";
import NewProjectSectionDialog from "@/components/project/new-project-section-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { sectionIconMap } from "@/data/section";
import useProjectStore from "@/store/project";

const ProjectSections = () => {
  const [
    currentSectionId,
    setCurrentSectionId,
    sections,
    removeSection,
    renameSection,
    moveUpSection,
    moveDownSection,
  ] = useProjectStore((state) => [
    state.currentSectionId,
    state.setCurrentSectionId,
    state.sections,
    state.removeSection,
    state.renameSection,
    state.moveUpSection,
    state.moveDownSection,
  ]);

  const [sectionIdToBeRenamed, setSectionIdToBeRenamed] = useState<string>("");
  const [newTitle, setNewTitle] = useState<string>("");

  const handleRename = (sectionId: string, title: string) => {
    setSectionIdToBeRenamed(sectionId);
    setNewTitle(title);
  };

  const handleDelete = async (sectionId: string) => {
    await removeSection(sectionId);
    if (currentSectionId === sectionId) {
      setCurrentSectionId("");
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      await renameSection(sectionIdToBeRenamed, newTitle);
      setSectionIdToBeRenamed("");
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 px-2 w-full">
      <Separator className="mt-4 w-full" />
      {sections?.map((section, index) => {
        const Icon: LucideIcon = sectionIconMap[section.sectionType];
        return (
          <ContextMenu key={section.id}>
            <ContextMenuTrigger asChild>
              <div className="w-full">
                <Toggle
                  pressed={currentSectionId === section.id}
                  onPressedChange={(pressed) => {
                    if (pressed) {
                      setCurrentSectionId(section.id);
                    }
                  }}
                  className="w-full justify-start overflow-x-hidden"
                >
                  <div className="flex h-9 w-9 pr-2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground">
                    <Icon className="w-5 h-5" />
                  </div>
                  {sectionIdToBeRenamed === section.id ? (
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={() => setSectionIdToBeRenamed("")}
                      autoFocus
                    />
                  ) : (
                    section.title
                  )}
                </Toggle>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuLabel>Actions</ContextMenuLabel>
              <ContextMenuItem
                onSelect={() => handleRename(section.id, section.title)}
              >
                Rename
              </ContextMenuItem>
              <AlertDialog>
                {/* https://github.com/shadcn-ui/ui/issues/2497 */}
                <AlertDialogTrigger asChild>
                  <ContextMenuItem onSelect={(e) => e.preventDefault()}>
                    Delete
                  </ContextMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{`Confirm deleting ${section.title}`}</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      your section and remove your data from servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => await handleDelete(section.id)}
                    >
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <ContextMenuItem
                onClick={async () => await moveUpSection(index, section.id)}
              >
                Move up
              </ContextMenuItem>
              <ContextMenuItem
                onClick={async () => await moveDownSection(index, section.id)}
              >
                Move down
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
      <NewProjectSectionDialog />
    </div>
  );
};

export default ProjectSections;
