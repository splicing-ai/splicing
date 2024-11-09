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

const AnthropicSchema = z.object({
  model: z.string().min(1, "Please select a model"),
  apiKey: z.string().startsWith("sk-", "A valid Anthropic API key is required"),
  sensitiveFields: z.array(z.string()).default(["apiKey"]),
});

export type AnthropicInfo = z.infer<typeof AnthropicSchema>;

const llmType = LLMType.ANTHROPIC;

export const AnthropicForm = () => {
  const [items, addItem, removeItem] = useSettingsStore((state) => [
    state.items,
    state.addItem,
    state.removeItem,
  ]);
  const emptyValues = { model: "", apiKey: "" };
  const info =
    (items.find((item) => item.key === llmType)?.value as AnthropicInfo) ??
    emptyValues;
  const { toast } = useToast();
  const form = useForm<AnthropicInfo>({
    resolver: zodResolver(AnthropicSchema),
    defaultValues: info,
  });

  const onSubmit = async (data: AnthropicInfo) => {
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
            name="apiKey"
            render={({ field }) => (
              <FormItem>
                <div>
                  <FormLabel>Anthropic API Key</FormLabel>
                  <FormControl>
                    <Input placeholder="sk-" {...field} />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
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
                    <SelectItem value="claude-3-5-sonnet-latest">
                      Claude 3.5 Sonnet
                    </SelectItem>
                    <SelectItem value="claude-3-5-haiku-latest">
                      Claude 3.5 Haiku
                    </SelectItem>
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
