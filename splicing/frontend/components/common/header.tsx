import { Download, Sun, Moon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Fragment } from "react";
import {
  ProjectSetupDialog,
  NewProjectDialog,
} from "@/components/setup/project-setup-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { backendClient } from "@/lib/backend";
import useProjectStore from "@/store/project";
import useSettingsStore from "@/store/settings";

const Header = () => {
  const currentSettingsSection = useSettingsStore(
    (state) => state.currentSection,
  );
  const [projectId, projectTitle, getCurrentSection] = useProjectStore(
    (state) => [
      state.projectId,
      state.metadata?.title,
      state.getCurrentSection,
    ],
  );

  let breadcrumbItems;
  let currentPage;
  switch (usePathname()) {
    case "/":
      currentPage = "Home";
      breadcrumbItems = ["Projects"];
      break;
    case "/settings":
      currentPage = "Settings";
      breadcrumbItems = ["Settings", currentSettingsSection];
      break;
    default:
      currentPage = "Project";
      breadcrumbItems = ["Projects"];
      if (projectTitle) {
        breadcrumbItems.push(projectTitle);
      }
      const currentSection = getCurrentSection();
      if (currentSection) {
        breadcrumbItems.push(currentSection.title);
      }
      break;
  }

  const handleDownloadCode = async () => {
    const response = await backendClient.downloadCode(projectId);
    const url = window.URL.createObjectURL(response);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectTitle || "project"}.zip`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const { theme, setTheme } = useTheme();

  return (
    <header className="fixed inset-x-0 top-0 z-20 flex pl-44 pr-4 py-2 items-center gap-4 border-b bg-transparent">
      <Breadcrumb className="flex">
        <BreadcrumbList>
          {breadcrumbItems.map((item, index) => (
            <Fragment key={index}>
              <BreadcrumbItem>{item}</BreadcrumbItem>
              {index < breadcrumbItems.length - 1 && <BreadcrumbSeparator />}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-row gap-2 relative ml-auto flex-1 grow-0">
        {currentPage === "Home" && <NewProjectDialog />}
        {currentPage === "Project" && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleDownloadCode}
                  className="rounded-full w-6 h-6"
                  size="icon"
                  variant="ghost"
                >
                  <Download className="h-4 w-4" />
                  <span className="sr-only">Download Code</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Download Code</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="rounded-full w-6 h-6"
                  size="icon"
                  variant="ghost"
                >
                  {theme === "dark" ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </TooltipContent>
            </Tooltip>
            <ProjectSetupDialog />
          </TooltipProvider>
        )}
      </div>
    </header>
  );
};

export default Header;
