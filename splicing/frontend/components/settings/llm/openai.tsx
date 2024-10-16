import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { LLMType, SettingsSectionType } from "@/components/types/schema-types";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/components/ui/use-toast";
import useSettingsStore from "@/store/settings";

const OpenAISchema = z.object({
  model: z.string().min(1, "Please select a model"),
  apiKey: z.string().startsWith("sk-", "A valid OpenAI API key is required"),
  sensitiveFields: z.array(z.string()).default(["apiKey"]),
});

export type OpenAIInfo = z.infer<typeof OpenAISchema>;

const llmType = LLMType.OPENAI;

export const OpenAIForm = () => {
  const [items, addItem, removeItem] = useSettingsStore((state) => [
    state.items,
    state.addItem,
    state.removeItem,
  ]);
  const emptyValues = { model: "", apiKey: "" };
  const info =
    (items.find((item) => item.key === llmType)?.value as OpenAIInfo) ??
    emptyValues;
  const { toast } = useToast();
  const form = useForm<OpenAIInfo>({
    resolver: zodResolver(OpenAISchema),
    defaultValues: info,
  });

  const onSubmit = async (data: OpenAIInfo) => {
    await addItem(SettingsSectionType.LLM, llmType, data);
    toast({
      title: `Added ${llmType} LLM successfully.`,
    });
  };

  const handleReset = async () => {
    await removeItem(SettingsSectionType.LLM, llmType);
    form.reset(emptyValues);
    toast({
      title: `Reset ${llmType} LLM successfully.`,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-3">
        <div className="grid gap-4 py-4">
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="gpt-4o-2024-08-06">
                      GPT-4o (latest)
                    </SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o mini</SelectItem>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="apiKey"
            render={({ field }) => (
              <FormItem>
                <div>
                  <FormLabel>OpenAI API Key</FormLabel>
                  <FormControl>
                    <Input placeholder="sk-" {...field} />
                  </FormControl>
                </div>
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
