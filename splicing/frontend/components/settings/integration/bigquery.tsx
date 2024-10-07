import { zodResolver } from "@hookform/resolvers/zod";
import { FileUp } from "lucide-react";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  IntegrationInfo,
  IntegrationType,
  SettingsSectionType,
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import useSettingsStore from "@/store/settings";

const BigQuerySchema = z
  .object({
    serviceAccountKeyFileName: z.string().default(""),
    serviceAccountKey: z.string().optional(),
    projectId: z.string().min(1, "Project ID is required."),
    datasetId: z.string().min(1, "Dataset ID is required."),
  })
  .refine(
    (data) => {
      if (!data.serviceAccountKeyFileName && !data.serviceAccountKey) {
        return false;
      }
      return true;
    },
    {
      message: "GCP Service Account Key is required.",
      path: ["serviceAccountKey"],
    },
  );

export type BigQueryInfo = z.infer<typeof BigQuerySchema>;

const integrationType = IntegrationType.BigQuery;

export const BigQueryForm = () => {
  const [items, addItem, removeItem] = useSettingsStore((state) => [
    state.items,
    state.addItem,
    state.removeItem,
  ]);
  const emptyValues = {
    serviceAccountKeyFileName: "",
    serviceAccountKey: "",
    projectId: "",
    datasetId: "",
  };
  const info =
    (items.find((item) => item.key === integrationType)
      ?.value as IntegrationInfo) ?? emptyValues;
  const { toast } = useToast();
  const form = useForm<IntegrationInfo>({
    resolver: zodResolver(BigQuerySchema),
    defaultValues: info,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Set the filename directly in the form
      form.setValue("serviceAccountKeyFileName", file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        form.setValue("serviceAccountKey", content);
      };
      reader.readAsText(file);
    }
  };

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
            name="serviceAccountKey"
            render={({ field }) => (
              <FormItem>
                <div>
                  <FormLabel>GCP Service Account Key</FormLabel>
                  <FormControl>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {form.watch("serviceAccountKeyFileName")
                          ? `Uploaded: ${form.watch("serviceAccountKeyFileName")}`
                          : "No file uploaded"}
                      </div>
                      <div>
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleFileUpload}
                          ref={fileInputRef}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-6 h-6"
                          size="icon"
                          variant="ghost"
                        >
                          <FileUp className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <div>
                  <FormLabel>Project ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Project ID" {...field} />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="datasetId"
            render={({ field }) => (
              <FormItem>
                <div>
                  <FormLabel>Dataset ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Dataset ID" {...field} />
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
