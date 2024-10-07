import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  SectionType,
  Block as BlockData,
  MovementTool,
} from "@/components/types/section";
import {
  SettingsSectionType,
  IntegrationType,
} from "@/components/types/settings";
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
import { getGenerateResultName } from "@/lib/utils";
import useProjectStore from "@/store/project";
import useSettingsStore from "@/store/settings";

const FormSchema = z.object({
  tool: z.string().min(1, "Please sepcify a tool"),
  source: z.string().min(1, "Please select a data source"),
  sourceDetails: z.string().optional(),
  sourceSectionId: z.string().optional(),
  sourceBlockId: z.string().optional(),
  destination: z.string().min(1, "Please select a data destination"),
  destinationDetails: z.string().optional(),
});

export type MovementSetup = z.infer<typeof FormSchema>;

interface MovementSetupFormProps {
  blockData: BlockData;
}

const MovementSetupForm: React.FC<MovementSetupFormProps> = ({ blockData }) => {
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
      (item) => item.sectionType == SettingsSectionType.Integration,
    ),
  );
  const currentSection = getCurrentSection();
  const { toast } = useToast();
  const defaulValues = (blockData.setup ?? {
    tool: "",
    source: "",
    destination: "",
  }) as MovementSetup;

  const form = useForm<MovementSetup>({
    resolver: zodResolver(FormSchema),
    defaultValues: defaulValues,
  });

  useEffect(() => {
    if (currentSection?.sectionType === SectionType.Movement) {
      form.reset(defaulValues);
    }
  }, [currentSectionId]);

  const onSubmit = async (data: MovementSetup) => {
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
                  {Object.keys(MovementTool).map((key) => (
                    <SelectItem
                      key={key}
                      value={MovementTool[key as keyof typeof MovementTool]}
                    >
                      {MovementTool[key as keyof typeof MovementTool]}
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
          name="sourceSectionId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source Section</FormLabel>
              <FormDescription>Optional</FormDescription>
              <Select onValueChange={field.onChange} value={field.value}>
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
              <Select onValueChange={field.onChange} value={field.value}>
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
        {form.watch("source") !== IntegrationType.Python && (
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
          name="destination"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data destination</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a data destination" />
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
          name="destinationDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data destination details</FormLabel>
              <FormDescription>Optional</FormDescription>
              <Textarea
                placeholder="Specify your data destination details."
                {...field}
              />
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

export default MovementSetupForm;
