import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation, useParams } from "wouter";
import {
  useGetExperiment,
  useUpdateExperiment,
  getGetExperimentQueryKey,
  getListExperimentsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  date: z.string(),
  assay_type: z.string().min(1, "Assay type is required"),
  instrument: z.string().min(1, "Instrument is required"),
  notes: z.string().optional(),
  status: z.enum(["designing", "ready", "running", "success", "failed", "unknown", "in_progress"]),
});

type FormValues = z.infer<typeof formSchema>;

export function ExperimentEdit() {
  const { id } = useParams<{ id: string }>();
  const expId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: experiment, isLoading } = useGetExperiment(expId, {
    query: { enabled: !!expId, queryKey: getGetExperimentQueryKey(expId) },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      date: "",
      assay_type: "",
      instrument: "",
      notes: "",
      status: "unknown",
    },
  });

  useEffect(() => {
    if (experiment) {
      form.reset({
        name: experiment.name,
        date: experiment.date,
        assay_type: experiment.assay_type,
        instrument: experiment.instrument ?? "",
        notes: experiment.notes ?? "",
        status: (experiment.status as FormValues["status"]) ?? "unknown",
      });
    }
  }, [experiment, form]);

  const updateMutation = useUpdateExperiment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Experiment updated", description: "Changes saved successfully." });
        queryClient.invalidateQueries({ queryKey: getGetExperimentQueryKey(expId) });
        queryClient.invalidateQueries({ queryKey: getListExperimentsQueryKey() });
        setLocation(`/experiments/${expId}`);
      },
      onError: (err: any) => {
        toast({
          title: "Update failed",
          description: err?.error?.error || "Unknown error occurred",
          variant: "destructive",
        });
      },
    },
  });

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate({ id: expId, data: values });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!experiment) {
    return <div className="text-center py-12 text-muted-foreground">Experiment not found.</div>;
  }

  // Only render the form once the form values have been reset from the loaded experiment
  if (!form.formState.isDirty && form.getValues("name") === "") {
    return (
      <div className="max-w-2xl mx-auto py-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="mb-6">
        <button
          onClick={() => setLocation(`/experiments/${expId}`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to experiment
        </button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Experiment</h1>
        <p className="text-muted-foreground mt-1">Update metadata and status for this experiment run.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experiment Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assay_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assay Type</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Flow Cytometry, ELISA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instrument"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instrument</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., BD LSRFortessa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="designing">Designing</SelectItem>
                          <SelectItem value="ready">Ready to run</SelectItem>
                          <SelectItem value="running">Running</SelectItem>
                          <SelectItem value="in_progress">In Progress (legacy)</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                          <SelectItem value="unknown">Unknown</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes / Protocol Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the objective, protocol deviations, or notable observations..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {experiment.file_name && (
                <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                  <span className="font-medium">Uploaded file:</span>{" "}
                  <span className="font-mono text-muted-foreground">{experiment.file_name}</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    File data cannot be replaced on edit. Create a new experiment to upload a different file.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation(`/experiments/${expId}`)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
