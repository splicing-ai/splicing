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
  FormControl,
  FormField,
  FormLabel,
  FormItem,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import useSettingsStore from "@/store/settings";

const S3Schema = z.object({
  accessKey: z.string(),
  secretKey: z.string(),
  uri: z
    .string()
    .refine((val) => val === "" || val.toLowerCase().startsWith("s3://"), {
      message: "A valid S3 URI is required if provided",
    })
    .optional(),
  sensitiveFields: z.array(z.string()).default(["accessKey", "secretKey"]),
});

export type S3Info = z.infer<typeof S3Schema>;

const integrationType = IntegrationType.S3;

export const S3Form = () => {
  const [items, addItem, removeItem] = useSettingsStore((state) => [
    state.items,
    state.addItem,
    state.removeItem,
  ]);
  const emptyValues = { uri: "", accessKey: "", secretKey: "" };
  const info =
    (items.find((item) => item.key === integrationType)?.value as S3Info) ??
    emptyValues;
  const { toast } = useToast();
  const form = useForm<S3Info>({
    resolver: zodResolver(S3Schema),
    defaultValues: info,
  });

  const onSubmit = async (data: S3Info) => {
    await addItem(SettingsSectionType.INTEGRATION, integrationType, data);
    toast({
      title: `Added ${integrationType} data integration successfully.`,
    });
  };

  const handleReset = async () => {
    await removeItem(SettingsSectionType.INTEGRATION, integrationType);
    form.reset(emptyValues);
    toast({
      title: `Reset ${integrationType} data integration successfully.`,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-3">
        <div className="grid gap-4 py-4">
          <FormField
            control={form.control}
            name="accessKey"
            render={({ field }) => (
              <FormItem>
                <div>
                  <FormLabel>AWS Access Key</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Optional if the bucket is public"
                      {...field}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="secretKey"
            render={({ field }) => (
              <FormItem>
                <div>
                  <FormLabel>AWS Secret Key</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Optional if the bucket is public"
                      {...field}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="uri"
            render={({ field }) => (
              <FormItem>
                <div>
                  <FormLabel>S3 URI</FormLabel>
                  <FormDescription>Optional</FormDescription>
                  <FormControl>
                    <Input placeholder="s3://" {...field} />
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
