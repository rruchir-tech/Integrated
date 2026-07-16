import { useForm } from "react-hook-form";
import { apiFetch } from "@/lib/apiFetch";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useCreateExperiment } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Loader2, BookTemplate, CheckCircle2 } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { getListExperimentsQueryKey } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";

interface Template {
  id: number;
  name: string;
  assay_type: string;
  instrument: string;
  default_notes: string | null;
  expected_status_default: string;
  description: string | null;
}

// Create-time status is a short, fixed set of PROCESS stages (where is this
// experiment in its lifecycle), not an outcome — outcome (success/failed) gets
// set later once the plate data is quantified in the Data Analysis tab.
const CREATE_STATUSES = ["designing", "ready", "running"] as const;
type CreateStatus = (typeof CREATE_STATUSES)[number];

function normalizeTemplateStatus(value: string | null | undefined): CreateStatus {
  return (CREATE_STATUSES as readonly string[]).includes(value ?? "") ? (value as CreateStatus) : "designing";
}

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  date: z.string(),
  assay_type: z.string().min(2, "Describe the goal / assay type"),
  instrument: z.string().default("Generic"),
  notes: z.string().optional(),
  status: z.enum(CREATE_STATUSES).default("designing"),
});

export function ExperimentForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const { data: templates } = useQuery<Template[]>({
    queryKey: ["templates"],
    queryFn: () => apiFetch("/api/templates").then((r) => r.json()),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      date: format(new Date(), "yyyy-MM-dd"),
      assay_type: "",
      instrument: "Generic",
      notes: "",
      status: "designing",
    },
  });

  const createMutation = useCreateExperiment({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Experiment created", description: "Now design the protocol — upload an existing SOP or ask the AI." });
        queryClient.invalidateQueries({ queryKey: getListExperimentsQueryKey() });
        setLocation(`/experiments/${data.id}`);
      },
      onError: (err) => {
        const message = "error" in err && err.error ? String((err as { error?: { error?: string } }).error?.error ?? "Unknown error occurred") : "Unknown error occurred";
        toast({
          title: "Error creating experiment",
          description: message,
          variant: "destructive"
        });
      }
    }
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createMutation.mutate({ data: values });
  };

  function applyTemplate(id: string) {
    const t = templates?.find((t) => String(t.id) === id);
    if (!t) return;
    setSelectedTemplateId(id);
    form.setValue("assay_type", t.assay_type);
    form.setValue("instrument", t.instrument);
    if (t.default_notes) form.setValue("notes", t.default_notes);
    form.setValue("status", normalizeTemplateStatus(t.expected_status_default));
    toast({ title: `Template applied: ${t.name}`, description: "Fields have been pre-filled. Adjust as needed." });
  }

  const STEPS = ["Experiment Details", "Review & Save"];
  const [step, setStep] = useState(0);

  const canProceedToStep2 = form.watch("name")?.length >= 2 && form.watch("assay_type")?.length >= 2;

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">New Experiment</h1>
        <p className="text-muted-foreground mt-2">Design the experiment now — the protocol (upload an SOP or ask the AI) and plate data come next, from the experiment page.</p>
      </div>

      {templates && templates.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <BookTemplate className="h-4 w-4" />
            Start from a template
          </div>
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(String(t.id))}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  selectedTemplateId === String(t.id)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-primary/30 text-muted-foreground hover:border-primary hover:text-foreground"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
          {selectedTemplateId && (
            <p className="text-xs text-muted-foreground">
              Template applied — fields pre-filled. Adjust below as needed.
            </p>
          )}
        </motion.div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-0">
          {STEPS.map((label, idx) => (
            <div key={idx} className="flex items-center flex-1 last:flex-none">
              <motion.button
                type="button"
                onClick={() => idx <= step && setStep(idx)}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  idx === step ? "text-primary" : idx < step ? "text-primary/60 cursor-pointer hover:text-primary" : "text-muted-foreground cursor-not-allowed"
                }`}
                whileHover={idx <= step ? { scale: 1.02 } : {}}
                whileTap={idx <= step ? { scale: 0.98 } : {}}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  idx === step
                    ? "border-primary bg-primary text-primary-foreground"
                    : idx < step
                    ? "border-primary/60 bg-primary/20 text-primary"
                    : "border-border bg-background text-muted-foreground"
                }`}>
                  {idx < step ? "✓" : idx + 1}
                </div>
                <span className="hidden sm:block">{label}</span>
              </motion.button>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-3 transition-colors ${idx < step ? "bg-primary/60" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Experiment Name <span className="text-destructive">*</span></FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Compound-X Dose Response" {...field} autoFocus />
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
                              <FormControl><Input type="date" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="assay_type"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Goal <span className="text-destructive">*</span></FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., MTT viability dose-response to estimate IC50 (plate-reader assays for now)" {...field} />
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
                                <Input placeholder="e.g., BioTek Synergy H1" {...field} />
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
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="designing">Designing</SelectItem>
                                  <SelectItem value="ready">Ready to run</SelectItem>
                                  <SelectItem value="running">Running</SelectItem>
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
                            <FormLabel>Context for the AI</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Anything the AI should know: cell line, compound, constraints, what you already know or have on hand..."
                                className="min-h-[120px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setLocation("/experiments")}>Cancel</Button>
                  <Button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={!canProceedToStep2}
                  >
                    Review →
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      Review before saving
                    </CardTitle>
                    <CardDescription>Double-check all details before submitting to the database.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        { label: "Name", value: form.watch("name") },
                        { label: "Date", value: form.watch("date") },
                        { label: "Goal", value: form.watch("assay_type") },
                        { label: "Instrument", value: form.watch("instrument") },
                        { label: "Status", value: form.watch("status") },
                      ].map(({ label, value }) => (
                        <div key={label} className="space-y-0.5">
                          <div className="text-xs font-semibold text-muted-foreground">{label}</div>
                          <div className="font-medium font-mono text-primary">{value || "—"}</div>
                        </div>
                      ))}
                    </div>
                    {form.watch("notes") && (
                      <div className="mt-4 space-y-0.5">
                        <div className="text-xs font-semibold text-muted-foreground">Context for the AI</div>
                        <p className="text-sm text-muted-foreground font-mono whitespace-pre-wrap line-clamp-4">{form.watch("notes")}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-between pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep(0)}>← Edit Details</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Experiment
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </Form>
    </div>
  );
}
