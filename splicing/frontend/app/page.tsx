"use client";

import { FileCode2, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import Header from "@/components/common/header";
import Siderbar from "@/components/common/sidebar";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { timeAgo } from "@/lib/utils";
import useHomeStore from "@/store/home";
import useSettingsStore from "@/store/settings";

export default function Home() {
  const [projects, setCurrentProjectId, removeProject, fetchAllProjects] =
    useHomeStore((state) => [
      state.projects,
      state.setCurrentProjectId,
      state.removeProject,
      state.fetchAllProjects,
    ]);
  const fetchAllSettingItems = useSettingsStore((state) => state.fetchAllItems);
  useEffect(() => {
    const initializeProjects = async () => {
      await fetchAllProjects();
      await fetchAllSettingItems();
      setCurrentProjectId(undefined);
    };
    initializeProjects();
  }, [fetchAllProjects, fetchAllSettingItems]);

  return (
    <div className="flex h-screen w-full flex-col">
      <Siderbar />
      <Header />
      <div className="flex flex-col pl-40 pt-14 fixed inset-0">
        <main className="flex items-start gap-4 p-4 h-full overflow-y-auto">
          <div className="flex flex-col w-full">
            <div className="flex h-5 w-full items-between space-x-4 font-semibold text-sm">
              <div className="w-5/12">Title</div>
              <div className="w-1/6">Updated on</div>
              <div className="w-1/6">Created on</div>
              <div className="w-1/6">LLM Provider</div>
              <div className="w-1/12"></div>
            </div>
            <Separator className="w-full my-4" />
            {projects
              .sort((a, b) => {
                const dateA = new Date(a.modifiedOn).getTime();
                const dateB = new Date(b.modifiedOn).getTime();
                return dateB - dateA;
              })
              .map((project) => (
                <div key={project.id} className="w-full">
                  <div className="flex h-4 w-full items-center space-x-4 text-sm">
                    <Link
                      href={`/project/${project.id}`}
                      className="flex w-5/12"
                    >
                      <FileCode2 className="w-5 h-5 pr-1" />
                      <div className="font-semibold">{project.title}</div>
                    </Link>
                    <div className="w-1/6">{timeAgo(project.modifiedOn)}</div>
                    <div className="w-1/6">{timeAgo(project.createdOn)}</div>
                    <div className="w-1/6">{project.llm}</div>
                    <div className="w-1/12">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/project/${project.id}`}>Edit</Link>
                          </DropdownMenuItem>
                          <AlertDialog>
                            {/* https://github.com/shadcn-ui/ui/issues/2497 */}
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                              >
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{`Confirm deleting ${project.title}`}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will
                                  permanently delete your project and remove
                                  your data from servers.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={async () =>
                                    await removeProject(project.id)
                                  }
                                >
                                  Confirm
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <Separator className="w-full my-4" />
                </div>
              ))}
          </div>
        </main>
      </div>
    </div>
  );
}
