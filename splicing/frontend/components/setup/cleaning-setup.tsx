import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  CleaningTool,
  SectionType,
  BlockData,
  IntegrationType,
  SettingsSectionType,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { schemas } from "@/generated/setup";
import { getGenerateResultName } from "@/lib/utils";
import useProjectStore from "@/store/project";
import useSettingsStore from "@/store/settings";

const FormSchema = schemas.CleaningSetup;

export type CleaningSetup = z.infer<typeof FormSchema>;

interface CleaningSetupFormProps {
  blockData: BlockData;
}

const CleaningSetupForm: React.FC<CleaningSetupFormProps> = ({ blockData }) => {
  const [sections, currentSectionId, getCurrentSection, addSetup, resetSetup] =
    useProjectStore((state) => [
      state.sections,
      state.currentSectionId,
      state.getCurrentSection,
      state.addSetup,
      state.resetSetup,
    ]);
  const integrationItems = useSettingsStore((state) =>
    state.items.filter(
      (item) => item.sectionType == SettingsSectionType.INTEGRATION,
    ),
  );
  const currentSection = getCurrentSection();
  const { toast } = useToast();
  const defaulValues = (blockData.setup ?? {
    source: "",
    tool: "",
    sourceDetails: "",
    provideRecommendation: true,
  }) as CleaningSetup;

  const form = useForm<CleaningSetup>({
    resolver: zodResolver(FormSchema),
    defaultValues: defaulValues,
  });

  useEffect(() => {
    if (currentSection?.sectionType === SectionType.CLEANING) {
      form.reset(defaulValues);
    }
  }, [currentSectionId]);

  const onSubmit = async (data: CleaningSetup) => {
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
          name="source"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data source</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a data source" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {integrationItems.map((item) => (
                    <SelectItem key={item.key} value={item.key}>
                      {item.key}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other">
                    Other (Specify details below)
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
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
                  {Object.keys(CleaningTool).map((key) => (
                    <SelectItem
                      key={key}
                      value={CleaningTool[key as keyof typeof CleaningTool]}
                    >
                      {CleaningTool[key as keyof typeof CleaningTool]}
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
          name="sourceSectionId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source Section</FormLabel>
              <FormDescription>Optional</FormDescription>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? undefined}
              >
                <FormControl>
                  <SelectTrigger className="text-left">
                    <SelectValue placeholder="Select a source section" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.title}
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
          name="sourceBlockId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source Block</FormLabel>
              <FormDescription>Optional</FormDescription>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? undefined}
              >
                <FormControl>
                  <SelectTrigger className="text-left">
                    <SelectValue placeholder="Select a source block" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {sections
                    .find(
                      (section) => section.id === form.watch("sourceSectionId"),
                    )
                    ?.blocks.map(
                      (block) =>
                        block.setup &&
                        form.watch("source") ===
                          ("destination" in block.setup
                            ? block.setup.destination
                            : (block.setup as CleaningSetup).source) &&
                        block.generateResult && (
                          <SelectItem key={block.id} value={block.id}>
                            {getGenerateResultName(block.generateResult)}
                          </SelectItem>
                        ),
                    )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.watch("source") !== IntegrationType.PYTHON && (
          <FormField
            control={form.control}
            name="sourceDetails"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data source details</FormLabel>
                <FormDescription>Optional</FormDescription>
                <Textarea
                  placeholder="Specify your data source details."
                  {...field}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="provideRecommendation"
          render={({ field }) => (
            <FormItem>
              <div>
                <FormLabel>AI Recommendation</FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
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

export default CleaningSetupForm;
