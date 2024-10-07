import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  SettingsSectionType,
  IntegrationInfo,
  IntegrationType,
} from "@/components/types/settings";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormLabel,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import useSettingsStore from "@/store/settings";

const PythonSchema = z.object({
  dataFormat: z.string().min(1, "Data format is required"),
});

export type PythonInfo = z.infer<typeof PythonSchema>;

const integrationType = IntegrationType.Python;

export const PythonForm = () => {
  const [items, addItem, removeItem] = useSettingsStore((state) => [
    state.items,
    state.addItem,
    state.removeItem,
  ]);
  const emptyValues = { dataFormat: "" };
  const info =
    (items.find((item) => item.key === integrationType)
      ?.value as IntegrationInfo) ?? emptyValues;
  const { toast } = useToast();
  const form = useForm<IntegrationInfo>({
    resolver: zodResolver(PythonSchema),
    defaultValues: info,
  });

  const onSubmit = async (data: IntegrationInfo) => {
    await addItem(SettingsSectionType.Integration, integrationType, data);
    toast({
      title: `Added ${integrationType} integration successfully.`,
    });
  };

  const handleReset = async () => {
    await removeItem(SettingsSectionType.Integration, integrationType);
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
            name="dataFormat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data format</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a data format" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pandas">pandas</SelectItem>
                  </SelectContent>
                </Select>
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
