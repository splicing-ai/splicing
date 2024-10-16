import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, EllipsisVertical } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LLMType, SettingsSectionType } from "@/components/types/schema-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormLabel,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import useHomeStore from "@/store/home";
import useProjectsStore from "@/store/project";
import useSettingsStore from "@/store/settings";

const LLMTypeSchema = z.nativeEnum(LLMType);

const ProjectSetupSchema = z.object({
  title: z.string().min(1, "A title is required"),
  llm: LLMTypeSchema.optional().refine((value) => value !== undefined, {
    message: "LLM provider is required",
  }),
  projectDir: z.string().optional(),
});

type ProjectSetupInfo = z.infer<typeof ProjectSetupSchema>;

interface ProjectSetupFormProps {
  setDialogOpen?: (open: boolean) => void;
}

const ProjectSetupForm: React.FC<ProjectSetupFormProps> = ({
  setDialogOpen,
}) => {
  const [addProject, setupProject, currentProjectId] = useHomeStore((state) => [
    state.addProject,
    state.setupProject,
    state.currentProjectId,
  ]);
  const currentProjectMetadata = useProjectsStore((state) => state.metadata);
  const items = useSettingsStore((state) => state.items);
  const llms = items.filter(
    (item) => item.sectionType === SettingsSectionType.LLM,
  );
  const { toast } = useToast();

  const form = useForm<ProjectSetupInfo>({
    resolver: zodResolver(ProjectSetupSchema),
    defaultValues: {
      title: currentProjectId ? currentProjectMetadata?.title || "" : "",
      llm: currentProjectMetadata?.llm,
      projectDir: currentProjectMetadata?.projectDir || "",
    },
  });

  const onSubmit = async (data: ProjectSetupInfo) => {
    if (currentProjectId) {
      const response = await setupProject(
        currentProjectId,
        data.title,
        data.llm as LLMType,
        data.projectDir || "",
      );
      if (response) {
        form.setError("root", {
          type: "manual",
          message: response,
        });
        toast({
          variant: "destructive",
          title: `Failed to save Setup for Project ${data.title}: ${response}`,
        });
        return;
      }
      toast({
        title: `Saved Setup for Project ${data.title} successfully.`,
      });
    } else {
      await addProject(data.title, data.llm as LLMType);
    }
    setDialogOpen?.(false);
  };

  const onError = () => {
    setDialogOpen?.(true);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onError)}
        className="w-full space-y-3"
      >
        <div className="grid gap-4 py-4">
          {!currentProjectId && (
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <div>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="" {...field} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="llm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>LLM</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          llms.length === 0
                            ? "Please add an LLM in Settings first"
                            : "Select an LLM provider"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {llms.map((item) => (
                      <SelectItem key={item.key} value={item.key}>
                        {item.key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {currentProjectId && (
            <FormField
              control={form.control}
              name="projectDir"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Directory</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="resize-none overflow-y-auto"
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
        <FormMessage />
        {setDialogOpen ? (
          <DialogFooter>
            <DialogClose asChild>
              <Button type="submit" disabled={llms.length === 0}>
                Confirm
              </Button>
            </DialogClose>
          </DialogFooter>
        ) : (
          <Button type="submit" disabled={llms.length === 0}>
            Confirm
          </Button>
        )}
      </form>
    </Form>
  );
};

export const NewProjectDialog = () => {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="text-white w-5 h-5" />
          <span className="pl-1">New Project</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a new project</DialogTitle>
        </DialogHeader>
        <ProjectSetupForm setDialogOpen={setOpen} />
      </DialogContent>
    </Dialog>
  );
};

export const ProjectSetupDialog = () => {
  return (
    <Tooltip>
      <Popover>
        <PopoverTrigger asChild>
          <TooltipTrigger asChild>
            <Button
              className="rounded-full w-6 h-6"
              size="icon"
              variant="ghost"
            >
              <EllipsisVertical className="h-4 w-4" />
              <span className="sr-only">Project Setup</span>
            </Button>
          </TooltipTrigger>
        </PopoverTrigger>
        <PopoverContent
          side="left"
          align="start"
          className="max-h-96 overflow-y-auto flex flex-col"
        >
          <h4 className="font-medium">Project Setup</h4>
          <ProjectSetupForm />
        </PopoverContent>
      </Popover>
      <TooltipContent side="top">Project Setup</TooltipContent>
    </Tooltip>
  );
};
