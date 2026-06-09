import { useState, useRef } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { useListExperiments, useGetExperiment, getListExperimentsQueryKey, getGetExperimentQueryKey } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  BrainCircuit,
  Calendar,
  FlaskConical,
  Microscope,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  RotateCcw,
  Loader2,
  FileBarChart,
} from "lucide-react";
import { format, parseISO } from "date-fns";


interface PlateSummary {
  instrument?: string;
  assay_type?: string;
  control_stats?: {
    mean_signal?: number;
    sd_signal?: number;
    cv_percent?: number;
    n_wells?: number;
  };
  dose_groups?: Array<{
    dose_uM?: number;
    mean_signal?: number;
    sd_signal?: number;
    n_wells?: number;
    percent_change_vs_control?: number;
  }>;
  outlier_wells?: string[];
  [key: string]: unknown;
}

function parsePlateSummary(raw: string | null | undefined): PlateSummary | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) return parsed as PlateSummary;
    return null;
  } catch {
    return null;
  }
}

function hasGraphableData(summary: PlateSummary | null) {
  return !!summary && (
    !!summary.control_stats ||
    Array.isArray(summary.dose_groups) && summary.dose_groups.length > 0 ||
    Array.isArray(summary.outlier_wells) && summary.outlier_wells.length > 0
  );
}

function ExperimentMetaCard({ id }: { id: number }) {
  const { data, isLoading } = useGetExperiment(id, {
    query: { enabled: !!id, queryKey: getGetExperimentQueryKey(id) },
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card className="border-primary/20 dark:bg-card/80">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base text-primary leading-tight">{data.name}</CardTitle>
            <StatusBadge status={data.status} />
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(parseISO(data.date), "MMM d, yyyy")}
            </span>
            <span className="flex items-center gap-1">
              <FlaskConical className="h-3 w-3" />
              {data.assay_type}
            </span>
            <span className="flex items-center gap-1">
              <Microscope className="h-3 w-3" />
              {data.instrument}
            </span>
          </div>
        </CardHeader>
        {data.notes && (
          <CardContent className="pt-3">
            <p className="text-sm text-muted-foreground font-mono leading-relaxed">{data.notes}</p>
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
}

function QuantitativeSummaryPanel({ id }: { id: number }) {
  const { data, isLoading } = useGetExperiment(id, {
    query: { enabled: !!id, queryKey: getGetExperimentQueryKey(id) },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  const summary = parsePlateSummary(data.raw_data_json);

  if (!summary || (!summary.control_stats && !summary.dose_groups)) {
    return (
      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">No quantitative summary available</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please upload a valid Synergy H1 / Gen5 CSV to see numeric metrics here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ctrl = summary.control_stats;
  const doses = summary.dose_groups ?? [];
  const outliers = summary.outlier_wells ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="space-y-4">
      {ctrl && (
        <Card className="border-primary/20 dark:bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Control Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Mean Signal", value: ctrl.mean_signal?.toFixed(3) ?? "—" },
                { label: "SD", value: ctrl.sd_signal?.toFixed(3) ?? "—" },
                { label: "CV%", value: ctrl.cv_percent != null ? `${ctrl.cv_percent.toFixed(2)}%` : "—", highlight: (ctrl.cv_percent ?? 0) > 20 ? "warn" : "ok" },
                { label: "Wells (n)", value: ctrl.n_wells?.toString() ?? "—" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                  <div className={`text-lg font-bold font-mono ${item.highlight === "warn" ? "text-yellow-500" : item.highlight === "ok" ? "text-emerald-500" : "text-foreground"}`}>
                    {item.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {doses.length > 0 && (
        <Card className="border-primary/20 dark:bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Dose-Response Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left pb-2 font-medium">Dose (µM)</th>
                    <th className="text-right pb-2 font-medium">Mean Signal</th>
                    <th className="text-right pb-2 font-medium">SD</th>
                    <th className="text-right pb-2 font-medium">n</th>
                    <th className="text-right pb-2 font-medium">% vs Control</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {doses.map((dose, i) => {
                    const pct = dose.percent_change_vs_control ?? 0;
                    const pctColor = pct < -50 ? "text-red-500" : pct < -20 ? "text-yellow-500" : "text-emerald-500";
                    return (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="py-2 text-left text-primary">{dose.dose_uM ?? "—"}</td>
                        <td className="py-2 text-right">{dose.mean_signal?.toFixed(3) ?? "—"}</td>
                        <td className="py-2 text-right text-muted-foreground">{dose.sd_signal?.toFixed(3) ?? "—"}</td>
                        <td className="py-2 text-right text-muted-foreground">{dose.n_wells ?? "—"}</td>
                        <td className={`py-2 text-right font-semibold ${pctColor}`}>
                          {dose.percent_change_vs_control != null ? `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {outliers.length > 0 && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              Outlier Wells
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {outliers.map((well) => (
                <Badge key={well} variant="outline" className="font-mono text-yellow-600 border-yellow-500/40">
                  {well}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

export function DataAnalysisPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [report, setReport] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasReport, setHasReport] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { data: allExperiments, isLoading: listLoading } = useListExperiments(undefined, {
    query: { queryKey: getListExperimentsQueryKey() },
  });

  const { data: selectedExp } = useGetExperiment(selectedId ?? 0, {
    query: { enabled: !!selectedId, queryKey: getGetExperimentQueryKey(selectedId ?? 0) },
  });

  const parsedSelectedSummary = parsePlateSummary(selectedExp?.raw_data_json);
  const hasPlateSummary = hasGraphableData(parsedSelectedSummary);

  const generateReport = async () => {
    if (!selectedId) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsStreaming(true);
    setReport("");
    setHasReport(false);
    setStreamError(null);

    try {
      const response = await apiFetch(`/api/experiments/${selectedId}/data-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error ?? "Request failed");
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) setReport((prev) => prev + data.content);
              if (data.error) setStreamError("The AI analysis could not be generated. Please check your API configuration or try again.");
              if (data.done) setHasReport(true);
            } catch {}
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setStreamError("The AI analysis could not be generated. Please check your API configuration or try again.");
      }
    } finally {
      setIsStreaming(false);
      setHasReport(true);
    }
  };

  const reset = () => {
    if (abortRef.current) abortRef.current.abort();
    setReport("");
    setHasReport(false);
    setStreamError(null);
    setIsStreaming(false);
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 border-b pb-5">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <BarChart3 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Analysis</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Select a Synergy H1 / Gen5 experiment to see quantified metrics and generate an AI-written analysis report.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">Select Experiment</label>
          {listLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select
              value={selectedId?.toString() ?? ""}
              onValueChange={(v) => {
                setSelectedId(parseInt(v));
                reset();
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose an experiment…" />
              </SelectTrigger>
              <SelectContent>
                {(allExperiments ?? []).map((exp) => (
                  <SelectItem key={exp.id} value={exp.id.toString()}>
                    <span className="flex items-center gap-2">
                      <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
                      {exp.name}
                      <span className="text-xs text-muted-foreground ml-1">({exp.assay_type})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <ExperimentMetaCard id={selectedId} />
          </motion.div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {selectedId && (
          <motion.div
            key={selectedId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileBarChart className="h-5 w-5 text-primary" />
                Quantitative Summary
              </h2>
            </div>

            <QuantitativeSummaryPanel id={selectedId} />

            <div className="pt-2">
              <Card className="border-primary/20 dark:bg-card/80">
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <BrainCircuit className="h-5 w-5 text-primary" />
                        AI Analysis Report
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Gemini can generate graphs, summaries, and a structured report from uploaded experiment data.
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {hasReport && !isStreaming && (
                        <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reset
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={generateReport}
                        disabled={isStreaming || !selectedId}
                        className="gap-1.5"
                      >
                        {isStreaming ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Generating…
                          </>
                        ) : hasReport ? (
                          <>
                            <RotateCcw className="h-3.5 w-3.5" />
                            Regenerate Analysis
                          </>
                        ) : (
                          <>
                            <BrainCircuit className="h-3.5 w-3.5" />
                            Generate AI Analysis
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {streamError && (
                    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 mb-4">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-destructive">{streamError}</p>
                    </div>
                  )}

                  {!report && !isStreaming && !streamError && (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                      <BrainCircuit className="h-10 w-10 mb-3 opacity-30" />
                      <p className="text-sm">
                      {!hasPlateSummary
                          ? "No graphable experiment data is available yet. Please upload a Synergy H1 / Gen5 CSV so the AI can make graphs and analyze the experiment."
                          : "Click \"Generate AI Analysis\" to produce graphs and a structured report from your plate data."}
                      </p>
                    </div>
                  )}

                  {(report || isStreaming) && (
                    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
                      {isStreaming && (
                        <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1 rounded-sm" />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {!selectedId && !listLoading && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground"
          >
            <BarChart3 className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-base font-medium">Select an experiment to begin</p>
            <p className="text-sm mt-1 max-w-sm">
              Choose a Synergy H1 experiment from the dropdown above to view its quantitative metrics and generate an AI report.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
