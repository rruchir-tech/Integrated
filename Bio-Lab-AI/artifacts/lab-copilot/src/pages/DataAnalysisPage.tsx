import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { apiFetch } from "@/lib/apiFetch";
import { useQueryClient } from "@tanstack/react-query";
import { useListExperiments, useGetExperiment, getListExperimentsQueryKey, getGetExperimentQueryKey } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
  GitCompare,
  Sparkles,
  FileDown,
  MessageSquare,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { PlateHeatmap } from "@/components/PlateHeatmap";
import { DoseResponseCard } from "@/components/DoseResponseCard";
import { CopilotChat } from "@/components/chat/CopilotChat";
import { AttachDataCard } from "@/components/experiment/AttachDataCard";
import { computeControlMetrics, type WellRole } from "@/lib/plateMetrics";
import { printExperimentReport } from "@/lib/printExperimentReport";

// The parser emits one of two shapes into experiments.raw_data_json:
//  1. A 96-well plate ("_type":"plate96") with { stats, wells, metadata }
//  2. A generic CSV/TSV summary with { total_rows, columns, signal_stats, condition_groups }
// This page understands both and degrades to a clear message when neither is present.

interface PlateWell {
  well: string;
  row: string;
  col: number;
  value: number | null;
  status: "ok" | "blank" | "high" | "low";
  cv_pct: number | null;
}

interface Plate96Summary {
  _type: "plate96";
  metadata?: { wavelength?: string | null; protocol?: string | null };
  stats?: {
    mean: number | null;
    sd: number | null;
    cv_pct: number | null;
    min: number | null;
    max: number | null;
    blank_count: number;
    well_count: number;
  };
  wells?: PlateWell[];
  // Present in the backend's plate96 payload — declared here so it survives
  // through to printExperimentReport's PDF heatmap render.
  read_matrix?: (number | null)[][];
}

interface CsvSummary {
  filename?: string;
  total_rows?: number;
  columns?: string[];
  signal_stats?: { mean?: string; sd?: string; n?: number };
  condition_groups?: Array<{ condition: string; n: number; mean: string | null }>;
}

type ParsedSummary =
  | ({ kind: "plate96" } & Plate96Summary)
  | ({ kind: "csv" } & CsvSummary)
  | null;

function parseSummary(raw: string | null | undefined): ParsedSummary {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    if (parsed._type === "plate96") return { kind: "plate96", ...parsed };
    if (Array.isArray(parsed.columns) || parsed.signal_stats || parsed.condition_groups) {
      return { kind: "csv", ...parsed };
    }
    return null;
  } catch {
    return null;
  }
}

function hasGraphableData(summary: ParsedSummary): boolean {
  if (!summary) return false;
  if (summary.kind === "plate96") {
    return Array.isArray(summary.wells) && summary.wells.some((w) => w.value !== null);
  }
  return !!summary.signal_stats || (Array.isArray(summary.condition_groups) && summary.condition_groups.length > 0);
}

// Mean signal per plate column (1–12) — a quick way to spot dose gradients or
// edge effects (columns 1/12 drifting from the interior).
function columnMeans(wells: PlateWell[]): { col: string; mean: number }[] {
  const sums = new Map<number, { total: number; n: number }>();
  for (const w of wells) {
    if (w.value === null || w.status === "blank") continue;
    const acc = sums.get(w.col) ?? { total: 0, n: 0 };
    acc.total += w.value;
    acc.n += 1;
    sums.set(w.col, acc);
  }
  const out: { col: string; mean: number }[] = [];
  for (let c = 1; c <= 12; c++) {
    const acc = sums.get(c);
    if (acc && acc.n > 0) out.push({ col: String(c), mean: acc.total / acc.n });
  }
  return out;
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

function StatGrid({ items }: { items: { label: string; value: string; highlight?: "warn" | "ok" }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
          <div className={`text-lg font-bold font-mono ${item.highlight === "warn" ? "text-yellow-500" : item.highlight === "ok" ? "text-emerald-500" : "text-foreground"}`}>
            {item.value}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

function Plate96Panel({ summary }: { summary: { kind: "plate96" } & Plate96Summary }) {
  const stats = summary.stats;
  const wells = summary.wells ?? [];
  const outliers = wells.filter((w) => w.status === "high" || w.status === "low");
  const colMeans = columnMeans(wells);
  const cv = stats?.cv_pct ?? null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="space-y-4">
      {stats && (
        <Card className="border-primary/20 dark:bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Plate Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatGrid
              items={[
                { label: "Mean", value: stats.mean != null ? stats.mean.toFixed(3) : "—" },
                { label: "SD", value: stats.sd != null ? stats.sd.toFixed(3) : "—" },
                { label: "CV%", value: cv != null ? `${cv.toFixed(1)}%` : "—", highlight: cv != null ? (cv > 20 ? "warn" : "ok") : undefined },
                { label: "Wells (n)", value: String(stats.well_count ?? "—") },
                { label: "Min", value: stats.min != null ? stats.min.toFixed(3) : "—" },
                { label: "Max", value: stats.max != null ? stats.max.toFixed(3) : "—" },
                { label: "Blanks", value: String(stats.blank_count ?? 0) },
                { label: "Outliers", value: String(outliers.length) },
              ]}
            />
          </CardContent>
        </Card>
      )}

      {colMeans.length > 1 && (
        <Card className="border-primary/20 dark:bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Mean Signal by Column
            </CardTitle>
            <CardDescription>Flat bars = uniform plate. A gradient across columns can signal a dose series or an edge/evaporation effect.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={colMeans} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                  <XAxis dataKey="col" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" width={48} domain={["auto", "auto"]} />
                  <Tooltip
                    formatter={(v: number) => [v.toFixed(3), "mean"]}
                    labelFormatter={(l) => `Column ${l}`}
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  {stats?.mean != null && <ReferenceLine y={stats.mean} stroke="hsl(var(--primary))" strokeDasharray="3 3" />}
                  <Bar dataKey="mean" radius={[3, 3, 0, 0]}>
                    {colMeans.map((entry) => (
                      <Cell key={entry.col} fill="hsl(var(--primary))" fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {outliers.length > 0 && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              Outlier Wells ({outliers.length})
            </CardTitle>
            <CardDescription>Wells &gt; 2 SD from the plate mean — candidates for pipetting errors, bubbles, or edge effects.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {outliers.map((w) => (
                <Badge key={w.well} variant="outline" className="font-mono text-yellow-600 border-yellow-500/40">
                  {w.well} ({w.status}{w.value != null ? ` · ${w.value.toFixed(2)}` : ""})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

function CsvPanel({ summary }: { summary: { kind: "csv" } & CsvSummary }) {
  const sig = summary.signal_stats;
  const groups = summary.condition_groups ?? [];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="space-y-4">
      <Card className="border-primary/20 dark:bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Tabular Data Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StatGrid
            items={[
              { label: "Rows", value: String(summary.total_rows ?? "—") },
              { label: "Columns", value: String(summary.columns?.length ?? "—") },
              { label: "Signal Mean", value: sig?.mean ?? "—" },
              { label: "Signal SD", value: sig?.sd ?? "—" },
            ]}
          />
        </CardContent>
      </Card>

      {groups.length > 0 && (
        <Card className="border-primary/20 dark:bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Condition Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left pb-2 font-medium">Condition</th>
                    <th className="text-right pb-2 font-medium">n</th>
                    <th className="text-right pb-2 font-medium">Mean</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {groups.map((g, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-2 text-left text-primary">{g.condition}</td>
                      <td className="py-2 text-right text-muted-foreground">{g.n}</td>
                      <td className="py-2 text-right">{g.mean ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

function QuantitativeSummaryPanel({ id }: { id: number }) {
  const { data, isLoading } = useGetExperiment(id, {
    query: { enabled: !!id, queryKey: getGetExperimentQueryKey(id) },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  const summary = parseSummary(data.raw_data_json);

  if (!summary || !hasGraphableData(summary)) {
    return (
      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">No quantitative summary available</p>
              <p className="text-sm text-muted-foreground mt-1">
                This experiment has no parsed plate or tabular data. Create a new experiment and upload a Synergy H1 / Gen5 Excel export (or a CSV/TSV) to see numeric metrics here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return summary.kind === "plate96"
    ? <Plate96Panel summary={summary} />
    : <CsvPanel summary={summary} />;
}

export function DataAnalysisPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [report, setReport] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasReport, setHasReport] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // What the AI should focus on / be aware of — steers the report instead of a
  // fixed prompt guessing. Collected via a pop-up the moment an experiment with
  // data (and no report yet) is selected, so it can't be missed/skipped by
  // accident like an easy-to-ignore inline field. refineNote is a smaller
  // follow-up note once a report already exists (mirrors the Protocol refine pattern).
  const [focusNote, setFocusNote] = useState("");
  const [refineNote, setRefineNote] = useState("");
  const [showFocusModal, setShowFocusModal] = useState(false);
  // Tracks which experiment id we've already prompted for (submitted OR skipped),
  // so re-renders don't keep re-popping the modal for the same selection.
  const promptedForId = useRef<number | null>(null);

  // Compare mode — lives here instead of a separate nav page. Pick a second
  // experiment and stream an AI comparison against the selected one.
  const [compareId, setCompareId] = useState<number | null>(null);
  const [compareReport, setCompareReport] = useState("");
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const compareAbortRef = useRef<AbortController | null>(null);

  const { data: allExperiments, isLoading: listLoading } = useListExperiments(undefined, {
    query: { queryKey: getListExperimentsQueryKey() },
  });

  const { data: selectedExp } = useGetExperiment(selectedId ?? 0, {
    query: { enabled: !!selectedId, queryKey: getGetExperimentQueryKey(selectedId ?? 0) },
  });

  const parsedSelectedSummary = parseSummary(selectedExp?.raw_data_json);
  const hasPlateSummary = hasGraphableData(parsedSelectedSummary);
  const isPlate96 = parsedSelectedSummary?.kind === "plate96";

  // Read-only: the same control-well markings the scientist made on the
  // experiment page (localStorage key `layout:${id}`), so the heatmap/dose-
  // response here stay visually consistent without a second editor to maintain.
  const [wellRoles, setWellRoles] = useState<Record<string, WellRole>>({});
  useEffect(() => {
    if (!selectedId) { setWellRoles({}); return; }
    try {
      const raw = localStorage.getItem(`layout:${selectedId}`);
      setWellRoles(raw ? JSON.parse(raw) || {} : {});
    } catch {
      setWellRoles({});
    }
  }, [selectedId]);
  const controlMetrics = isPlate96 && parsedSelectedSummary && "wells" in parsedSelectedSummary && Array.isArray(parsedSelectedSummary.wells)
    ? computeControlMetrics(parsedSelectedSummary.wells, wellRoles)
    : null;

  // A previously-generated report is persisted server-side — show it immediately
  // on selecting an experiment rather than requiring the user to regenerate.
  // Guarded by ID so it seeds once per experiment and never clobbers an
  // in-progress stream for the SAME experiment.
  const seededForId = useRef<number | null>(null);
  useEffect(() => {
    if (!selectedId || !selectedExp) return;
    if (seededForId.current === selectedId) return;
    seededForId.current = selectedId;
    if (selectedExp.data_analysis_report) {
      setReport(selectedExp.data_analysis_report);
      setHasReport(true);
    }
  }, [selectedId, selectedExp]);

  // Pop up the "what should the AI focus on" prompt automatically the moment an
  // experiment with data but no report yet is selected — asking up front, not
  // guessing, was the whole point; an easy-to-miss inline field defeated that.
  useEffect(() => {
    if (!selectedId || !selectedExp) return;
    if (promptedForId.current === selectedId) return;
    if (selectedExp.raw_data_json && !selectedExp.data_analysis_report) {
      promptedForId.current = selectedId;
      setShowFocusModal(true);
    }
  }, [selectedId, selectedExp]);

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
        body: JSON.stringify({
          ...(focusNote.trim() ? { focus_note: focusNote.trim() } : {}),
          ...(hasReport && refineNote.trim() ? { refine_note: refineNote.trim() } : {}),
        }),
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
      // The report is persisted server-side on success — refetch so the
      // experiment record (and anything else reading it, e.g. chat grounding)
      // reflects the new report immediately.
      queryClient.invalidateQueries({ queryKey: getGetExperimentQueryKey(selectedId) });
      setRefineNote("");
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
    setFocusNote("");
    setRefineNote("");
    if (compareAbortRef.current) compareAbortRef.current.abort();
    setCompareId(null);
    setCompareReport("");
    setComparing(false);
    setCompareError(null);
  };

  const runCompare = async () => {
    if (!selectedId || !compareId) return;
    if (compareAbortRef.current) compareAbortRef.current.abort();
    const controller = new AbortController();
    compareAbortRef.current = controller;

    setComparing(true);
    setCompareReport("");
    setCompareError(null);

    try {
      const response = await apiFetch(`/api/experiments/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experiment_a_id: selectedId, experiment_b_id: compareId }),
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
              if (data.content) setCompareReport((prev) => prev + data.content);
              if (data.error) setCompareError("The comparison could not be generated. Please try again.");
            } catch {}
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setCompareError("The comparison could not be generated. Please try again.");
      }
    } finally {
      setComparing(false);
    }
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

            {selectedExp && !selectedExp.raw_data_json ? (
              <AttachDataCard
                experimentId={selectedId}
                onAttached={() => queryClient.invalidateQueries({ queryKey: getGetExperimentQueryKey(selectedId) })}
              />
            ) : (
              <>
                <QuantitativeSummaryPanel id={selectedId} />

                {isPlate96 && parsedSelectedSummary && "wells" in parsedSelectedSummary && Array.isArray(parsedSelectedSummary.wells) && (
                  <Card className="border-primary/20 dark:bg-card/80">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FlaskConical className="h-4 w-4 text-primary" />
                        96-Well Plate Heatmap
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PlateHeatmap
                        wells={parsedSelectedSummary.wells}
                        stats={parsedSelectedSummary.stats ?? { mean: null, sd: null, cv_pct: null, min: null, max: null, blank_count: 0, well_count: 0 }}
                        wavelength={parsedSelectedSummary.metadata?.wavelength}
                        roles={wellRoles}
                      />
                    </CardContent>
                  </Card>
                )}

                {isPlate96 && parsedSelectedSummary && "wells" in parsedSelectedSummary && Array.isArray(parsedSelectedSummary.wells) && (
                  controlMetrics?.meanPos != null && controlMetrics?.meanNeg != null ? (
                    <DoseResponseCard
                      expId={selectedId}
                      wells={parsedSelectedSummary.wells}
                      meanPos={controlMetrics.meanPos}
                      meanNeg={controlMetrics.meanNeg}
                    />
                  ) : (
                    <Card className="border-dashed border-primary/30 bg-primary/5">
                      <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-5 w-5 text-primary flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium">Dose-response curve needs control wells marked</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Mark positive/negative controls on the experiment page to unlock the IC50/EC50 fit here.
                            </p>
                          </div>
                        </div>
                        <Link href={`/experiments/${selectedId}`}>
                          <Button size="sm" variant="outline" className="gap-1.5 whitespace-nowrap">
                            Mark controls
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )
                )}
              </>
            )}

            {selectedExp?.raw_data_json && (
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
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => selectedExp && printExperimentReport({
                              experiment: selectedExp,
                              rawData: parsedSelectedSummary?.kind === "plate96" ? parsedSelectedSummary : null,
                              suggestions: [],
                              detailedReport: report,
                            })}
                            data-feedback="export"
                            data-feedback-message="Preparing the AI analysis report"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            Export PDF
                          </Button>
                          <Button variant="outline" size="sm" onClick={reset} className="gap-1.5" data-feedback="filter" data-feedback-message="Clearing the current analysis">
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reset
                          </Button>
                        </>
                      )}
                      {!isStreaming && (
                        <Button variant="outline" size="sm" onClick={() => setShowFocusModal(true)} className="gap-1.5" data-feedback="analyze" data-feedback-message="Listening for what matters most in this analysis">
                          <Sparkles className="h-3.5 w-3.5" />
                          {focusNote.trim() ? "Change focus" : "Set focus"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={generateReport}
                        disabled={isStreaming || !selectedId}
                        className="gap-1.5"
                        data-feedback="analyze"
                        data-feedback-message="Reading this plate and its experimental context"
                      >
                        {isStreaming ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Bioalyzing…
                          </>
                        ) : hasReport ? (
                          <>
                            <RotateCcw className="h-3.5 w-3.5" />
                            Re-Bioalyze
                          </>
                        ) : (
                          <>
                            <BrainCircuit className="h-3.5 w-3.5" />
                            Bioalyze this plate
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {!isStreaming && focusNote.trim() && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                      <span className="font-medium text-primary">Focus: </span>{focusNote}
                    </div>
                  )}
                  {!isStreaming && hasReport && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <RotateCcw className="h-3.5 w-3.5 text-primary" />
                        Anything specific to change in this refinement? (optional)
                      </label>
                      <Textarea
                        value={refineNote}
                        onChange={(e) => setRefineNote(e.target.value)}
                        placeholder="e.g. 'go deeper on why the Z-factor dropped' or 're-check for pseudoreplication'"
                        rows={2}
                        className="text-sm bg-background"
                      />
                    </div>
                  )}

                  {streamError && (
                    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-destructive">{streamError}</p>
                    </div>
                  )}

                  {!report && !isStreaming && !streamError && (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                      <BrainCircuit className="h-10 w-10 mb-3 opacity-30" />
                      <p className="text-sm">
                      {!hasPlateSummary
                          ? "No graphable experiment data is available yet. Upload a Synergy H1 / Gen5 export above so the AI can make graphs and analyze the experiment."
                          : "Click \"Bioalyze this plate\" to produce graphs and a structured report from your plate data."}
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
            )}

            {/* Chat — same per-experiment conversation as the experiment page, so
                design/run discussion and follow-up questions about this report
                live in one continuous thread. */}
            {selectedExp?.conversation_id && (
              <div className="pt-2">
                <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Ask about this data
                </h3>
                <CopilotChat conversationId={selectedExp.conversation_id} />
              </div>
            )}

            {/* Compare — pick a second experiment and stream an AI comparison. */}
            <div className="pt-2">
              <Card className="border-primary/20 dark:bg-card/80">
                <CardHeader className="pb-3 border-b border-border">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GitCompare className="h-5 w-5 text-primary" />
                    Compare with another experiment
                  </CardTitle>
                  <CardDescription className="mt-1">
                    See what changed between two runs and why one worked and the other didn’t.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <Select
                      value={compareId?.toString() ?? ""}
                      onValueChange={(v) => { setCompareId(parseInt(v)); setCompareReport(""); setCompareError(null); }}
                    >
                      <SelectTrigger className="w-full sm:max-w-xs">
                        <SelectValue placeholder="Choose an experiment to compare…" />
                      </SelectTrigger>
                      <SelectContent>
                        {(allExperiments ?? []).filter((e) => e.id !== selectedId).map((exp) => (
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
                    <Button
                      size="sm"
                      onClick={runCompare}
                      disabled={!compareId || comparing}
                      className="gap-1.5"
                      data-feedback="analyze"
                      data-feedback-message="Lining up both experiments and their evidence"
                    >
                      {comparing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitCompare className="h-3.5 w-3.5" />}
                      {comparing ? "Comparing…" : "Compare"}
                    </Button>
                  </div>

                  {compareError && (
                    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-destructive">{compareError}</p>
                    </div>
                  )}

                  {(compareReport || comparing) && (
                    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{compareReport}</ReactMarkdown>
                      {comparing && <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1 rounded-sm" />}
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

      <Dialog open={showFocusModal} onOpenChange={setShowFocusModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              What should the AI focus on?
            </DialogTitle>
            <DialogDescription>
              Tell it what you want checked or be aware of — a specific well, a concern, or just what you need to know. Leave it blank for a general analysis.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            autoFocus
            value={focusNote}
            onChange={(e) => setFocusNote(e.target.value)}
            placeholder="e.g. 'I'm worried column 12 looks off' or 'just tell me the IC50, skip the full report'"
            rows={3}
            className="text-sm"
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => { setShowFocusModal(false); generateReport(); }}
            >
              Skip, just analyze
            </Button>
            <Button onClick={() => { setShowFocusModal(false); generateReport(); }} className="gap-1.5">
              <BrainCircuit className="h-3.5 w-3.5" />
              Bioalyze this plate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
