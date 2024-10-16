import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  OrchestrationTool,
  SectionType,
  BlockData,
} from "@/components/types/schema-types";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { schemas } from "@/generated/setup";
import useProjectStore from "@/store/project";

const FormSchema = schemas.OrchestrationSetup;

export type OrchestrationSetup = z.infer<typeof FormSchema>;

interface OrchestrationSetupFormProps {
  blockData: BlockData;
}

const OrchestrationSetupForm: React.FC<OrchestrationSetupFormProps> = ({
  blockData,
}) => {
  const [currentSectionId, getCurrentSection, addSetup, resetSetup] =
    useProjectStore((state) => [
      state.currentSectionId,
      state.getCurrentSection,
      state.addSetup,
      state.resetSetup,
    ]);
  const currentSection = getCurrentSection();
  const { toast } = useToast();
  const defaulValues = (blockData.setup ?? {
    tool: "",
  }) as OrchestrationSetup;

  const form = useForm<OrchestrationSetup>({
    resolver: zodResolver(FormSchema),
    defaultValues: defaulValues,
  });

  useEffect(() => {
    if (currentSection?.sectionType === SectionType.ORCHESTRATION) {
      form.reset(defaulValues);
    }
  }, [currentSectionId]);

  const onSubmit = async (data: OrchestrationSetup) => {
    await addSetup(blockData.id, data);
    toast({
      title: `Saved Setup for Section ${currentSection?.title} successfully.`,
    });
  };

  const handleReset = async () => {
    await resetSetup(blockData.id);
    form.reset();
    toast({
      title: `Reset Setup for Section ${currentSection?.title} successfully.`,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-3">
        <FormField
          control={form.control}
          name="tool"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tool</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tool" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.keys(OrchestrationTool).map((key) => (
                    <SelectItem
                      key={key}
                      value={
                        OrchestrationTool[key as keyof typeof OrchestrationTool]
                      }
                    >
                      {OrchestrationTool[key as keyof typeof OrchestrationTool]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pipeline description</FormLabel>
              <FormDescription>Optional</FormDescription>
              <Textarea placeholder="Describe your pipeline." {...field} />
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2 justify-between">
          <Button type="submit">Save</Button>
          <Button type="button" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default OrchestrationSetupForm;
