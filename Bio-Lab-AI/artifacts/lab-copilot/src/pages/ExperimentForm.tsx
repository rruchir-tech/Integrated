import { useForm } from "react-hook-form";
import { apiFetch } from "@/lib/apiFetch";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useCreateExperiment } from "@workspace/api-client-react";
import { format } from "date-fns";
import { UploadCloud, Loader2, FlaskConical, X, AlertTriangle, CheckCircle2, BookTemplate, Sparkles } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { getListExperimentsQueryKey } from "@workspace/api-client-react";
import { PlateHeatmap } from "@/components/PlateHeatmap";
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

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  date: z.string(),
  assay_type: z.string().min(2, "Assay type is required"),
  instrument: z.string().default("Generic"),
  notes: z.string().optional(),
  status: z.enum(["success", "failed", "unknown", "in_progress"]).default("in_progress"),
});

interface WellData {
  well: string;
  row: string;
  col: number;
  value: number | null;
  status: "ok" | "blank" | "high" | "low";
  cv_pct: number | null;
}

interface PlateStats {
  mean: number | null;
  sd: number | null;
  cv_pct: number | null;
  min: number | null;
  max: number | null;
  blank_count: number;
  well_count: number;
}

interface SynergyParseResult {
  metadata: {
    plate_name: string | null;
    date: string | null;
    protocol: string | null;
    wavelength: string | null;
    instrument: string | null;
    read_type: string | null;
  };
  wells: WellData[];
  stats: PlateStats;
  read_matrix: (number | null)[][];
}

export function ExperimentForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const [synergyFile, setSynergyFile] = useState<File | null>(null);
  const [synergyLoading, setSynergyLoading] = useState(false);
  const [synergyResult, setSynergyResult] = useState<SynergyParseResult | null>(null);
  const [synergyFileB64, setSynergyFileB64] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
      status: "in_progress",
    },
  });

  const createMutation = useCreateExperiment({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Experiment created", description: "Successfully saved to database." });
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

  const handleSynergyFile = async (selectedFile: File) => {
    setSynergyFile(selectedFile);
    setSynergyLoading(true);
    setSynergyResult(null);

    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      setSynergyFileB64(b64);

      const resp = await apiFetch("/api/experiments/parse-synergy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_content_b64: b64, file_name: selectedFile.name }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Parse failed");
      }

      const result: SynergyParseResult = await resp.json();
      setSynergyResult(result);

      form.setValue("instrument", result.metadata.instrument || "Synergy H1");

      if (result.metadata.read_type) {
        form.setValue("assay_type", result.metadata.read_type);
      } else if (result.metadata.wavelength) {
        form.setValue("assay_type", `Plate Reader (${result.metadata.wavelength} nm)`);
      } else {
        if (!form.getValues("assay_type")) {
          form.setValue("assay_type", "Plate Reader");
        }
      }

      if (result.metadata.date && !form.getValues("date")) {
        const d = new Date(result.metadata.date);
        if (!isNaN(d.getTime())) form.setValue("date", format(d, "yyyy-MM-dd"));
      }

      if (result.metadata.plate_name && !form.getValues("name")) {
        form.setValue("name", result.metadata.plate_name);
      }

      const noteLines = [
        result.metadata.protocol ? `Protocol: ${result.metadata.protocol}` : null,
        result.metadata.wavelength ? `Wavelength: ${result.metadata.wavelength} nm` : null,
        result.stats.mean !== null ? `Plate mean: ${result.stats.mean}` : null,
        result.stats.sd !== null ? `Plate SD: ${result.stats.sd}` : null,
        result.stats.cv_pct !== null ? `Plate CV%: ${result.stats.cv_pct.toFixed(1)}%` : null,
        result.stats.blank_count > 0 ? `Blank/empty wells: ${result.stats.blank_count}` : null,
      ].filter(Boolean).join("\n");

      if (noteLines) {
        const existing = form.getValues("notes") || "";
        form.setValue("notes", existing ? `${existing}\n\n${noteLines}` : noteLines);
      }

      toast({ title: "Synergy H1 file parsed", description: `${result.stats.well_count} wells detected` });
    } catch (err) {
      toast({ title: "Parse error", description: String(err), variant: "destructive" });
      setSynergyFile(null);
      setSynergyFileB64(null);
    } finally {
      setSynergyLoading(false);
    }
  };

  const clearSynergy = () => {
    setSynergyFile(null);
    setSynergyResult(null);
    setSynergyFileB64(null);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    let fileContentB64 = synergyFileB64 ?? undefined;
    let fileName = synergyFile?.name ?? undefined;

    if (!fileContentB64 && file) {
      fileName = file.name;
      try {
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const b64 = result.split(",")[1];
            resolve(b64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        fileContentB64 = base64String;
      } catch (err) {
        toast({ title: "File read error", description: "Failed to process the uploaded file.", variant: "destructive" });
        return;
      }
    }

    createMutation.mutate({
      data: {
        ...values,
        file_name: fileName,
        file_content_b64: fileContentB64,
      }
    });
  };

  function applyTemplate(id: string) {
    const t = templates?.find((t) => String(t.id) === id);
    if (!t) return;
    setSelectedTemplateId(id);
    form.setValue("assay_type", t.assay_type);
    form.setValue("instrument", t.instrument);
    if (t.default_notes) form.setValue("notes", t.default_notes);
    const statusVal = t.expected_status_default as "in_progress" | "success" | "failed" | "unknown";
    form.setValue("status", statusVal || "in_progress");
    toast({ title: `Template applied: ${t.name}`, description: "Fields have been pre-filled. Adjust as needed." });
  }

  const STEPS = ["Import Data", "Experiment Details", "Review & Save"];
  const [step, setStep] = useState(0);

  const [aiGoal, setAiGoal] = useState("");
  const [generatingProtocol, setGeneratingProtocol] = useState(false);

  async function generateProtocol() {
    const goal = aiGoal.trim();
    if (!goal) return;
    setGeneratingProtocol(true);
    try {
      const resp = await apiFetch("/api/gemini/generate-protocol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, assay_type: form.getValues("assay_type") || undefined }),
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || "Generation failed");
      }
      const p = await resp.json();
      if (p.title) form.setValue("name", p.title);
      if (p.assay_type) form.setValue("assay_type", p.assay_type);
      if (p.instrument) form.setValue("instrument", p.instrument);
      const notes = [
        p.objective ? `Objective: ${p.objective}` : null,
        Array.isArray(p.materials) && p.materials.length ? `Materials:\n- ${p.materials.join("\n- ")}` : null,
        Array.isArray(p.controls) && p.controls.length ? `Controls:\n- ${p.controls.join("\n- ")}` : null,
        p.plate_layout ? `Plate layout: ${p.plate_layout}` : null,
        Array.isArray(p.steps) && p.steps.length ? `Protocol:\n${p.steps.join("\n")}` : null,
        p.expected_readout ? `Expected readout: ${p.expected_readout}` : null,
        p.suggested_analysis ? `Suggested analysis: ${p.suggested_analysis}` : null,
      ].filter(Boolean).join("\n\n");
      if (notes) form.setValue("notes", notes);
      toast({ title: "Protocol generated", description: "Review and adjust the pre-filled fields below." });
    } catch (err) {
      toast({
        title: "Couldn't generate protocol",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setGeneratingProtocol(false);
    }
  }

  const canProceedToStep1 = true;
  const canProceedToStep2 = form.watch("name")?.length >= 2 && form.watch("assay_type")?.length >= 2;

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">New Experiment</h1>
        <p className="text-muted-foreground mt-2">Log a new experiment run and upload results for AI analysis.</p>
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

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-4 rounded-xl border border-violet-400/20 bg-violet-400/5 space-y-3"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-violet-300">
          <Sparkles className="h-4 w-4" />
          Design with AI
        </div>
        <p className="text-xs text-muted-foreground">
          Describe your goal — AI drafts a bench-ready protocol and pre-fills the fields below.
        </p>
        <Textarea
          value={aiGoal}
          onChange={(e) => setAiGoal(e.target.value)}
          placeholder="e.g. Test Compound-X cytotoxicity on HeLa cells across an 8-point dose response and estimate IC50"
          rows={2}
          className="text-sm"
        />
        <Button
          type="button"
          size="sm"
          onClick={generateProtocol}
          disabled={generatingProtocol || !aiGoal.trim()}
          className="gap-2"
        >
          {generatingProtocol ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generatingProtocol ? "Designing…" : "Generate protocol"}
        </Button>
      </motion.div>

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
                    ? "border-primary bg-primary text-primary-foreground dark:shadow-[0_0_8px_rgba(0,245,255,0.6)]"
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
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Import from Synergy H1</CardTitle>
                      <Badge variant="outline" className="text-[10px] ml-auto">Optional</Badge>
                    </div>
                    <CardDescription>
                      Upload a BioTek Gen5 Excel export to auto-populate fields and visualize the 96-well plate.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!synergyFile ? (
                      <label
                        className={`block border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                          isDragging
                            ? "border-primary bg-primary/10 scale-[1.01]"
                            : "border-primary/30 hover:border-primary/60 hover:bg-primary/5"
                        }`}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDragging(false);
                          const f = e.dataTransfer.files[0];
                          if (f) handleSynergyFile(f);
                        }}
                      >
                        <UploadCloud className={`h-10 w-10 text-primary mb-3 transition-transform ${isDragging ? "scale-125" : ""}`} />
                        <div className="text-sm font-medium text-foreground mb-1">
                          {isDragging ? "Release to upload" : "Drop Synergy H1 Excel file here"}
                        </div>
                        <div className="text-xs text-muted-foreground mb-4">.xlsx or .xls — Gen5 plate reader export</div>
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleSynergyFile(f);
                          }}
                        />
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>Browse file</span>
                        </Button>
                      </label>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            {synergyLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : synergyResult ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            )}
                            <span className="font-mono text-xs truncate max-w-[280px]">{synergyFile.name}</span>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={clearSynergy}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {synergyLoading && (
                          <div className="text-xs text-muted-foreground text-center py-4">Parsing plate data…</div>
                        )}
                        {synergyResult && (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              {synergyResult.metadata.wavelength && (
                                <Badge variant="secondary" className="font-mono text-xs">λ {synergyResult.metadata.wavelength} nm</Badge>
                              )}
                              {synergyResult.metadata.protocol && (
                                <Badge variant="outline" className="text-xs">{synergyResult.metadata.protocol}</Badge>
                              )}
                              <Badge variant="outline" className={`text-xs font-mono ${
                                synergyResult.stats.cv_pct !== null && synergyResult.stats.cv_pct > 20
                                  ? "border-destructive text-destructive"
                                  : synergyResult.stats.cv_pct !== null && synergyResult.stats.cv_pct > 10
                                  ? "border-yellow-500 text-yellow-600"
                                  : "border-emerald-500 text-emerald-600"
                              }`}>
                                CV: {synergyResult.stats.cv_pct?.toFixed(1) ?? "–"}%
                              </Badge>
                              <Badge variant="outline" className="text-xs font-mono">{synergyResult.stats.well_count} wells</Badge>
                            </div>
                            <PlateHeatmap wells={synergyResult.wells} stats={synergyResult.stats} wavelength={synergyResult.metadata.wavelength} compact />
                            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 font-mono">
                              Fields auto-populated → review and adjust in the next step.
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border bg-muted/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <UploadCloud className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-base text-muted-foreground">Or upload a CSV/TSV file</CardTitle>
                      <Badge variant="outline" className="text-[10px] ml-auto">Optional</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <Input
                        type="file"
                        accept=".csv,.tsv,.txt"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="max-w-xs bg-background"
                      />
                      {file && <span className="text-sm text-primary font-medium truncate">{file.name}</span>}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between pt-2">
                  <Button type="button" variant="outline" onClick={() => setLocation("/experiments")}>Cancel</Button>
                  <Button type="button" onClick={() => setStep(1)} disabled={synergyLoading}>
                    Continue →
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
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
                                <Input placeholder="e.g., qPCR Cell Line A Optimization" {...field} autoFocus />
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
                            <FormItem>
                              <FormLabel>Assay Type <span className="text-destructive">*</span></FormLabel>
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
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
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
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(0)}>← Back</Button>
                  <Button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!canProceedToStep2}
                  >
                    Review →
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
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
                        { label: "Assay Type", value: form.watch("assay_type") },
                        { label: "Instrument", value: form.watch("instrument") },
                        { label: "Status", value: form.watch("status") },
                      ].map(({ label, value }) => (
                        <div key={label} className="space-y-0.5">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{label}</div>
                          <div className="font-medium font-mono text-primary">{value || "—"}</div>
                        </div>
                      ))}
                    </div>
                    {form.watch("notes") && (
                      <div className="mt-4 space-y-0.5">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Notes</div>
                        <p className="text-sm text-muted-foreground font-mono whitespace-pre-wrap line-clamp-4">{form.watch("notes")}</p>
                      </div>
                    )}
                    {synergyResult && (
                      <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs">Plate data attached</Badge>
                        <Badge variant="outline" className="text-xs font-mono">{synergyResult.stats.well_count} wells</Badge>
                      </div>
                    )}
                    {file && !synergyFile && (
                      <div className="mt-4 pt-4 border-t">
                        <Badge variant="secondary" className="text-xs">{file.name}</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-between pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>← Edit Details</Button>
                  <Button type="submit" disabled={createMutation.isPending || synergyLoading} className="dark:shadow-[0_0_12px_rgba(0,245,255,0.3)]">
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
