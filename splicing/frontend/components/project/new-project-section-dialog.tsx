import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { SectionType } from "@/components/types/schema-types";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useProjectStore from "@/store/project";

const SectionTypeSchema = z.nativeEnum(SectionType);

interface NewSectionFormProps {
  setDialogOpen: (open: boolean) => void;
}

const NewSectionForm: React.FC<NewSectionFormProps> = ({ setDialogOpen }) => {
  const addSection = useProjectStore((state) => state.addSection);

  const NewSectionSchema = z.object({
    title: z.string().min(1, "A title is required"),
    type: SectionTypeSchema.optional().refine((value) => value !== undefined, {
      message: "Section type is required",
    }),
  });

  type NewSectionInfo = z.infer<typeof NewSectionSchema>;

  const form = useForm<NewSectionInfo>({
    resolver: zodResolver(NewSectionSchema),
    defaultValues: { title: "", type: undefined },
  });

  const onSubmit = async (data: NewSectionInfo) => {
    await addSection(data.title, data.type as SectionType);
    setDialogOpen(false);
  };

  const onError = () => {
    setDialogOpen(true);
  };

  const [placeholderTitle, setPlaceholderTitle] = useState<string>("");

  const handleSectionTypeSelection = (value: string) => {
    setPlaceholderTitle(value);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onError)}
        className="w-full space-y-3"
      >
        <div className="grid gap-4 py-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <div>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder={placeholderTitle} {...field} />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleSectionTypeSelection(value);
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a section type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(SectionType).map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="submit">Confirm</Button>
          </DialogClose>
        </DialogFooter>
      </form>
    </Form>
  );
};

const NewProjectSectionDialog = () => {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                size="icon"
                variant="secondary"
                className="rounded-full h-9 w-9 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Plus className="w-5 h-5" />
                <span className="sr-only">New Section</span>
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Add a new section</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add a new section</DialogTitle>
        </DialogHeader>
        <NewSectionForm setDialogOpen={setOpen} />
      </DialogContent>
    </Dialog>
  );
};

export default NewProjectSectionDialog;
