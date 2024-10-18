import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  SettingsSectionType,
  IntegrationType,
} from "@/components/types/schema-types";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormLabel,
  FormItem,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import useSettingsStore from "@/store/settings";

const DuckDBSchema = z.object({
  databaseFilePath: z.string().min(1, "Database file path is required"),
  schema: z.string().optional().default("main"),
});

export type DuckDBInfo = z.infer<typeof DuckDBSchema>;

const integrationType = IntegrationType.DUCKDB;

export const DuckDBForm = () => {
  const [items, addItem, removeItem] = useSettingsStore((state) => [
    state.items,
    state.addItem,
    state.removeItem,
  ]);
  const emptyValues = { databaseFilePath: "", schema: "main" };
  const info =
    (items.find((item) => item.key === integrationType)?.value as DuckDBInfo) ??
    emptyValues;
  const { toast } = useToast();
  const form = useForm<DuckDBInfo>({
    resolver: zodResolver(DuckDBSchema),
    defaultValues: info,
  });

  const onSubmit = async (data: DuckDBInfo) => {
    await addItem(SettingsSectionType.INTEGRATION, integrationType, data);
    toast({
      title: `Added ${integrationType} integration successfully.`,
    });
  };

  const handleReset = async () => {
    await removeItem(SettingsSectionType.INTEGRATION, integrationType);
    form.reset(emptyValues);
    toast({
      title: `Reset ${integrationType} integration successfully.`,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-3">
        <div className="grid gap-4 py-4">
          <FormField
            control={form.control}
            name="databaseFilePath"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Database file path</FormLabel>
                <Input placeholder="" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="schema"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Schema</FormLabel>
                <FormDescription>Optional</FormDescription>
                <Input placeholder="" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
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
