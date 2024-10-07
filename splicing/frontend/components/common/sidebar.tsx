import { Home, NotebookPen, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ProjectSections from "@/components/project/project-sections";
import SettingsSections from "@/components/settings/settings-sections";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import packageInfo from "@/package.json";
import useHomeStore from "@/store/home";

const Sidebar = () => {
  const pathname = usePathname();
  const isSettingsPage = pathname.startsWith("/settings");
  const currentProjectId = useHomeStore((state) => state.currentProjectId);

  const getSettingsToggleHref = () => {
    if (isSettingsPage) {
      return currentProjectId ? `/project/${currentProjectId}` : "/";
    }
    return "/settings";
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-40 flex-col border-r bg-background sm:flex">
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/"
                className="group flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
              >
                <Home className="h-4 w-4" />
                <span className="sr-only">Home</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom">Home</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {isSettingsPage ? (
          <SettingsSections />
        ) : (
          pathname !== "/" && <ProjectSections />
        )}
      </nav>
      <nav className="mt-auto flex flex-col items-center gap-2 px-2 sm:py-5">
        <Button variant="ghost" asChild>
          <Link href={getSettingsToggleHref()}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8">
              {isSettingsPage ? (
                <NotebookPen className="w-6 h-6" />
              ) : (
                <Settings className="w-6 h-6" />
              )}
            </div>
            {isSettingsPage ? "Project" : "Settings"}
          </Link>
        </Button>
        <span className="text-xs text-gray-400">
          version: {packageInfo.version}
        </span>
      </nav>
    </aside>
  );
};

export default Sidebar;
