import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import {
  useGetExperiment,
  getGetExperimentQueryKey,
  useAnalyzeExperiment,
  useUpdateExperiment,
  type UpdateExperimentMutationBody,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import {
  BrainCircuit, Calendar, FlaskConical, Microscope, FileText,
  CheckCircle2, AlertTriangle, Pencil, MessageSquare, CheckSquare, FileDown,
  Download, Image, Loader2,
} from "lucide-react";
import { toPng } from "html-to-image";
import { CopilotChat } from "@/components/chat/CopilotChat";
import { PlateHeatmap } from "@/components/PlateHeatmap";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AttachDataCard } from "@/components/experiment/AttachDataCard";
import { ProtocolCard } from "@/components/experiment/ProtocolCard";
import { CommentsPanel } from "@/components/experiment/CommentsPanel";
import { ExperimentTasksPanel } from "@/components/experiment/ExperimentTasksPanel";
import { RecommendationActions } from "@/components/experiment/RecommendationActions";
import { printExperimentReport } from "@/lib/printExperimentReport";
import { computeControlMetrics, ROLE_COLOR, ROLE_LABEL, ROLE_SHORT, type WellRole } from "@/lib/plateMetrics";
import { DoseResponseCard } from "@/components/DoseResponseCard";
import { isEnabled } from "@/lib/features";
import { apiFetch } from "@/lib/apiFetch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROW_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

const MotionButton = motion.create(Button);

type TabKey = "suggestions" | "tasks" | "comments";

export function ExperimentDetail() {
  const { id } = useParams<{ id: string }>();
  const expId = parseInt(id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("suggestions");
  // Pass/fail threshold — user-defined cutoff that flags wells in the heatmap.
  // Persisted per-experiment in localStorage (client-side; no schema change).
  const [passThreshold, setPassThreshold] = useState<number | null>(null);
  const [passDirection, setPassDirection] = useState<"above" | "below">("above");
  const skipPersistRef = useRef(true);
  // Plate layout — per-well control/sample/blank roles for deterministic Z'-factor.
  const [wellRoles, setWellRoles] = useState<Record<string, WellRole>>({});
  const [activeRole, setActiveRole] = useState<WellRole>("pos");
  const [layoutEdit, setLayoutEdit] = useState(false);
  const [normalizeView, setNormalizeView] = useState(false);
  const skipLayoutPersistRef = useRef(true);

  const { data: experiment, isLoading } = useGetExperiment(expId, {
    query: { enabled: !!expId, queryKey: getGetExperimentQueryKey(expId) }
  });

  const analyzeMutation = useAnalyzeExperiment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Analysis complete", description: "AI suggestions have been generated." });
        queryClient.invalidateQueries({ queryKey: getGetExperimentQueryKey(expId) });
      },
      onError: () => {
        toast({ title: "Analysis failed", description: "Unknown error", variant: "destructive" });
      }
    }
  });

  const updateMutation = useUpdateExperiment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetExperimentQueryKey(expId) });
      }
    }
  });

  // Analysis only runs when the scientist explicitly clicks "Bioalyze" below —
  // it used to auto-fire the moment data was uploaded, with zero input, which
  // is exactly the "guessing without asking" behavior this app now avoids
  // everywhere else (see the Data Analysis page's focus pop-up).
  const heatmapRef = useRef<HTMLDivElement>(null);

  // Load this experiment's saved pass/fail threshold.
  useEffect(() => {
    skipPersistRef.current = true;
    let t: number | null = null;
    let d: "above" | "below" = "above";
    try {
      const raw = expId ? localStorage.getItem(`passfail:${expId}`) : null;
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.threshold === "number") t = s.threshold;
        if (s.direction === "below") d = "below";
      }
    } catch { /* ignore */ }
    setPassThreshold(t);
    setPassDirection(d);
  }, [expId]);

  // Persist on user change (skip the write caused by the load above).
  useEffect(() => {
    if (skipPersistRef.current) { skipPersistRef.current = false; return; }
    if (!expId) return;
    try {
      if (passThreshold === null) localStorage.removeItem(`passfail:${expId}`);
      else localStorage.setItem(`passfail:${expId}`, JSON.stringify({ threshold: passThreshold, direction: passDirection }));
    } catch { /* ignore */ }
  }, [expId, passThreshold, passDirection]);

  // Load saved plate layout for this experiment.
  useEffect(() => {
    skipLayoutPersistRef.current = true;
    let r: Record<string, WellRole> = {};
    try {
      const raw = expId ? localStorage.getItem(`layout:${expId}`) : null;
      if (raw) r = JSON.parse(raw) || {};
    } catch { /* ignore */ }
    setWellRoles(r);
  }, [expId]);

  // Persist layout on change (skip the write caused by the load above).
  useEffect(() => {
    if (skipLayoutPersistRef.current) { skipLayoutPersistRef.current = false; return; }
    if (!expId) return;
    try {
      if (Object.keys(wellRoles).length === 0) localStorage.removeItem(`layout:${expId}`);
      else localStorage.setItem(`layout:${expId}`, JSON.stringify(wellRoles));
    } catch { /* ignore */ }
  }, [expId, wellRoles]);

  const assignWell = (well: string) =>
    setWellRoles((prev) => {
      const next = { ...prev };
      if (next[well] === activeRole) delete next[well]; // click again to clear
      else next[well] = activeRole;
      return next;
    });
  const assignCol = (col: number) =>
    setWellRoles((prev) => {
      const next = { ...prev };
      for (const row of ROW_LETTERS) next[`${row}${col}`] = activeRole;
      return next;
    });
  const assignRow = (row: string) =>
    setWellRoles((prev) => {
      const next = { ...prev };
      for (let c = 1; c <= 12; c++) next[`${row}${c}`] = activeRole;
      return next;
    });

  const downloadCsv = () => {
    if (!experiment || !rawData?.wells) return;
    const t = passThreshold;
    const active = t !== null && !Number.isNaN(t);
    const meta = [
      `# Experiment: ${experiment.name}`,
      `# Date: ${experiment.date}`,
      `# Assay: ${experiment.assay_type}`,
      `# Instrument: ${experiment.instrument}`,
      `# Wavelength: ${rawData.metadata?.wavelength ?? "–"} nm`,
      `# Protocol: ${rawData.metadata?.protocol ?? "–"}`,
      ...(active ? [`# Pass/fail cutoff: value ${passDirection === "below" ? "≤" : "≥"} ${t}`] : []),
      "#",
      active ? "Well,Row,Col,Value,Status,CV_pct,PassFail" : "Well,Row,Col,Value,Status,CV_pct",
    ].join("\n");
    const rows = [...rawData.wells]
      .sort((a: { well: string }, b: { well: string }) => a.well.localeCompare(b.well))
      .map((w: { well: string; row: string; col: number; value: number | null; status: string; cv_pct: number | null }) => {
        const base = `${w.well},${w.row},${w.col},${w.value ?? ""},${w.status},${w.cv_pct ?? ""}`;
        if (!active) return base;
        let pf = "";
        if (w.value !== null && w.status !== "blank") {
          const pass = passDirection === "below" ? w.value <= (t as number) : w.value >= (t as number);
          pf = pass ? "PASS" : "FAIL";
        }
        return `${base},${pf}`;
      })
      .join("\n");
    const blob = new Blob([`${meta}\n${rows}`], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${experiment.name.replace(/\s+/g, "_")}_${experiment.date}_plate.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadPng = async () => {
    if (!heatmapRef.current || !experiment) return;
    try {
      // Match the current theme so the well labels stay readable in the export
      // (dark labels on a dark bg, or vice-versa, would be invisible on slides).
      const isDark = document.documentElement.classList.contains("dark");
      const dataUrl = await toPng(heatmapRef.current, {
        backgroundColor: isDark ? "#0c1520" : "#ffffff",
        pixelRatio: 2,
      });
      const a = document.createElement("a");
      a.download = `${experiment.name.replace(/\s+/g, "_")}_heatmap.png`;
      a.href = dataUrl;
      a.click();
    } catch {
      // silently ignore if the element isn't rendered
    }
  };

  // Experiments created before chat-on-create shipped have no conversation yet —
  // let the user start one on demand instead of forcing them through /analyze.
  const [startingChat, setStartingChat] = useState(false);
  const startChat = async () => {
    if (!experiment) return;
    setStartingChat(true);
    try {
      const resp = await apiFetch("/api/gemini/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Copilot: ${experiment.name}`, experimentId: expId }),
      });
      if (!resp.ok) throw new Error("Failed to start chat");
      queryClient.invalidateQueries({ queryKey: getGetExperimentQueryKey(expId) });
    } catch {
      toast({ title: "Couldn't start chat", description: "Please try again.", variant: "destructive" });
    } finally {
      setStartingChat(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-[300px]" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-[200px] md:col-span-2" />
          <Skeleton className="h-[200px]" />
        </div>
      </div>
    );
  }

  if (!experiment) {
    return <div className="text-center py-12 font-mono">Experiment not found</div>;
  }

  const rawData = experiment.raw_data_json
    ? (() => { try { return JSON.parse(experiment.raw_data_json!); } catch { return null; } })()
    : null;
  const isPlate96 = rawData?._type === "plate96";

  const zPrime = (() => {
    if (!experiment.ai_summary) return null;
    const m = experiment.ai_summary.match(/Z['′']?[-\s]*(?:factor|prime)?[:\s=]+([0-9]*\.?[0-9]+)/i);
    return m ? parseFloat(m[1]) : null;
  })();

  // Wells that carry a real reading (exclude blanks/empties) — the pass/fail denominator.
  const scorableWells: { value: number | null; status: string }[] =
    isPlate96 && Array.isArray(rawData?.wells)
      ? rawData.wells.filter((w: { value: number | null; status: string }) => w.value !== null && w.status !== "blank")
      : [];
  const thresholdActive = passThreshold !== null && !Number.isNaN(passThreshold);
  const passCount = thresholdActive
    ? scorableWells.filter((w) =>
        passDirection === "below" ? (w.value as number) <= passThreshold! : (w.value as number) >= passThreshold!,
      ).length
    : 0;
  // Standard error of the mean across scorable wells (SD / √n) — precision of the plate mean.
  const sem: number | null =
    rawData?.stats?.sd != null && scorableWells.length > 0
      ? rawData.stats.sd / Math.sqrt(scorableWells.length)
      : null;

  // Deterministic plate-quality metrics from user-designated control wells.
  const controlMetrics = isPlate96 && Array.isArray(rawData?.wells)
    ? computeControlMetrics(rawData.wells, wellRoles)
    : null;
  // Prefer the computed Z' (from real controls); fall back to the AI-parsed value.
  const zPrimeComputed = controlMetrics?.zPrime ?? null;
  const zPrimeDisplay = zPrimeComputed ?? zPrime;
  const zPrimeIsComputed = zPrimeComputed !== null;

  // When the user has marked control wells, send them to the analyzer as ground
  // truth so the AI quantifies off the real plate map instead of guessing.
  const controlSummary = (() => {
    if (!isPlate96 || Object.keys(wellRoles).length === 0) return undefined;
    const byRole = (role: WellRole) =>
      Object.entries(wellRoles).filter(([, r]) => r === role).map(([w]) => w).sort();
    const pos = byRole("pos");
    const neg = byRole("neg");
    const blank = byRole("blank");
    if (pos.length === 0 && neg.length === 0 && blank.length === 0) return undefined;
    const round = (n: number | null) => (n == null ? null : Number(n.toFixed(3)));
    return {
      positive_control_wells: pos,
      negative_control_wells: neg,
      blank_wells: blank,
      mean_positive: round(controlMetrics?.meanPos ?? null),
      mean_negative: round(controlMetrics?.meanNeg ?? null),
      zprime: round(controlMetrics?.zPrime ?? null),
      signal_to_background: round(controlMetrics?.signalToBackground ?? null),
    };
  })();
  const analyzeData = (controlSummary ? { control_summary: controlSummary } : {}) as Record<string, unknown>;
  const suggestions: {
    title: string;
    variable_to_change: string;
    rationale: string;
    expected_outcome: string;
    confidence: string;
  }[] = experiment.ai_next_experiments_json
    ? (() => { try { return JSON.parse(experiment.ai_next_experiments_json!) ?? []; } catch { return []; } })()
    : [];

  const SIDE_TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "suggestions", label: "Next Steps", icon: AlertTriangle },
    { key: "tasks", label: "Tasks", icon: CheckSquare },
    ...(isEnabled("comments") ? [{ key: "comments" as TabKey, label: "Comments", icon: MessageSquare }] : []),
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b pb-6">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-primary break-words">{experiment.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-mono">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {format(parseISO(experiment.date), "MMMM d, yyyy")}
            </div>
            <div className="flex items-center gap-1.5">
              <FlaskConical className="h-4 w-4" />
              {experiment.assay_type}
            </div>
            <div className="flex items-center gap-1.5">
              <Microscope className="h-4 w-4" />
              {experiment.instrument}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:flex-shrink-0">
          <StatusBadge status={experiment.status} />
          <Select
            value={experiment.status}
            onValueChange={(v) =>
              updateMutation.mutate({ id: expId, data: { status: v as UpdateExperimentMutationBody["status"] } })
            }
          >
            <SelectTrigger
              className="h-9 w-[130px] text-xs"
              title="Experiment stage"
              data-feedback="save"
              data-feedback-message="Updating the experiment stage"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="designing">Designing</SelectItem>
              <SelectItem value="ready">Ready to run</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              {!["designing", "ready", "running"].includes(experiment.status) && (
                <SelectItem value={experiment.status}>{experiment.status}</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Link href={`/experiments/${expId}/edit`} data-feedback="navigate" data-feedback-message="Opening this experiment for editing">
            <MotionButton variant="outline" className="gap-2" whileTap={{ scale: 0.97 }}>
              <Pencil className="h-4 w-4" />
              Edit
            </MotionButton>
          </Link>
          <MotionButton
            variant="outline"
            className="gap-2"
            onClick={() => printExperimentReport({ experiment, rawData, suggestions })}
            whileTap={{ scale: 0.97 }}
            data-feedback="export"
            data-feedback-message="Preparing a traceable experiment report"
          >
            <FileDown className="h-4 w-4" />
            Export PDF
          </MotionButton>
          <MotionButton
            onClick={() => analyzeMutation.mutate({ id: expId, data: analyzeData as never })}
            disabled={analyzeMutation.isPending}
            className="gap-2 relative overflow-hidden"
            whileTap={{ scale: 0.97 }}
            data-feedback="analyze"
            data-feedback-message="Bioalyzing this experiment in context"
          >
            {analyzeMutation.isPending && (
              <motion.div
                className="absolute inset-0 bg-primary/20"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              />
            )}
            <BrainCircuit className={`h-4 w-4 ${analyzeMutation.isPending ? "animate-pulse" : ""}`} />
            {analyzeMutation.isPending ? "Bioalyzing…" : "Bioalyze"}
          </MotionButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence>
            {experiment.notes && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                <Card className="hover:border-l-2 hover:border-l-primary transition-all">
                  <CardHeader className="py-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Context for the AI
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm font-mono text-muted-foreground">{experiment.notes}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {isEnabled("protocolDesigner") && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12 }}>
                <ProtocolCard
                  experimentId={expId}
                  protocolJson={experiment.protocol_json ?? null}
                  onUpdated={() => queryClient.invalidateQueries({ queryKey: getGetExperimentQueryKey(expId) })}
                />
              </motion.div>
            )}

            {/* Data upload is de-emphasized during design — it only appears once the
                experiment has moved past the "designing" stage. */}
            {!experiment.raw_data_json && experiment.status !== "designing" && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}>
                <AttachDataCard
                  experimentId={expId}
                  onAttached={() => queryClient.invalidateQueries({ queryKey: getGetExperimentQueryKey(expId) })}
                />
              </motion.div>
            )}

            {rawData && isPlate96 && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                <Card className="hover:border-l-2 hover:border-l-primary transition-all">
                  <CardHeader className="py-4 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FlaskConical className="h-5 w-5 text-primary" />
                          96-Well Plate Heatmap
                        </CardTitle>
                        {experiment.file_name && (
                          <CardDescription className="font-mono mt-1">{experiment.file_name}</CardDescription>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 justify-end items-center">
                        {rawData.metadata?.wavelength && (
                          <Badge variant="secondary" className="font-mono text-xs">λ {rawData.metadata.wavelength} nm</Badge>
                        )}
                        {rawData.metadata?.protocol && (
                          <Badge variant="outline" className="text-xs">{rawData.metadata.protocol}</Badge>
                        )}
                        {rawData.stats?.cv_pct != null && (
                          <Badge
                            variant="outline"
                            className={`text-xs font-mono ${
                              rawData.stats.cv_pct > 20
                                ? "border-destructive text-destructive"
                                : rawData.stats.cv_pct > 10
                                ? "border-yellow-500 text-yellow-600"
                                : "border-emerald-500 text-emerald-600"
                            }`}
                          >
                            CV: {rawData.stats.cv_pct.toFixed(1)}%
                          </Badge>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Export CSV" onClick={downloadCsv}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Export PNG" onClick={downloadPng}>
                          <Image className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {/* Pass/fail threshold control */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className="text-xs font-bold text-muted-foreground">Pass / fail</span>
                      <div className="inline-flex rounded-md border border-border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setPassDirection("above")}
                          className={`px-2 py-1 text-xs font-mono transition-colors ${passDirection === "above" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                        >
                          ≥ pass
                        </button>
                        <button
                          type="button"
                          onClick={() => setPassDirection("below")}
                          className={`px-2 py-1 text-xs font-mono transition-colors ${passDirection === "below" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                        >
                          ≤ pass
                        </button>
                      </div>
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="cutoff value"
                        value={passThreshold ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setPassThreshold(v === "" ? null : Number(v));
                        }}
                        className="h-8 w-32 font-mono text-sm"
                      />
                      {rawData.stats?.mean != null && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs font-mono"
                          title="Set the cutoff to the plate mean"
                          onClick={() => {
                            const m = rawData.stats?.mean;
                            if (m != null) setPassThreshold(Number(m.toFixed(3)));
                          }}
                        >
                          use mean
                        </Button>
                      )}
                      {thresholdActive && (
                        <>
                          <span className="text-xs font-mono px-2 py-1 rounded-md bg-muted">
                            <span className="text-emerald-500 font-semibold">{passCount}</span>
                            <span className="text-muted-foreground"> / {scorableWells.length} pass</span>
                          </span>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setPassThreshold(null)}>
                            Clear
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Plate layout — mark control wells for deterministic Z'-factor */}
                    <div className="mb-4 rounded-lg border border-border/60 bg-muted/30 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">Plate layout</span>
                        <Button
                          variant={layoutEdit ? "default" : "outline"}
                          size="sm"
                          className="h-8 px-3 text-xs"
                          onClick={() => setLayoutEdit((v) => !v)}
                        >
                          {layoutEdit ? "Done" : "Define controls"}
                        </Button>
                        {Object.keys(wellRoles).length > 0 && (
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setWellRoles({})}>
                            Clear
                          </Button>
                        )}
                      </div>

                      {layoutEdit && (
                        <div className="mt-3 space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {(["pos", "neg", "sample", "blank"] as WellRole[]).map((role) => (
                              <button
                                key={role}
                                type="button"
                                onClick={() => setActiveRole(role)}
                                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-colors"
                                style={
                                  activeRole === role
                                    ? { backgroundColor: ROLE_COLOR[role], borderColor: ROLE_COLOR[role], color: "#fff" }
                                    : { borderColor: ROLE_COLOR[role] }
                                }
                              >
                                <span className="font-bold">{ROLE_SHORT[role]}</span>
                                {ROLE_LABEL[role]}
                              </button>
                            ))}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Click wells, a row letter, or a column number to mark them as{" "}
                            <strong>{ROLE_LABEL[activeRole]}</strong>. Click a marked well again to clear it.
                          </p>
                        </div>
                      )}

                      {controlMetrics && (controlMetrics.nPos > 0 || controlMetrics.nNeg > 0) && (
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono">
                          <span className="text-muted-foreground">+ ctrl: <span className="text-foreground">{controlMetrics.nPos}</span></span>
                          <span className="text-muted-foreground">− ctrl: <span className="text-foreground">{controlMetrics.nNeg}</span></span>
                          {controlMetrics.signalToBackground != null && (
                            <span className="text-muted-foreground">S/B: <span className="text-foreground">{controlMetrics.signalToBackground.toFixed(1)}×</span></span>
                          )}
                          {controlMetrics.zPrime == null && (controlMetrics.nPos < 2 || controlMetrics.nNeg < 2) && (
                            <span className="text-yellow-600">Mark ≥2 of each control to compute Z′</span>
                          )}
                        </div>
                      )}

                      {controlMetrics?.meanPos != null && controlMetrics?.meanNeg != null && (
                        <div className="mt-2">
                          <Button
                            variant={normalizeView ? "default" : "outline"}
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setNormalizeView((v) => !v)}
                          >
                            {normalizeView ? "Showing % of control" : "Show % of control"}
                          </Button>
                        </div>
                      )}
                    </div>

                    <PlateHeatmap
                      ref={heatmapRef}
                      wells={rawData.wells}
                      stats={rawData.stats}
                      wavelength={rawData.metadata?.wavelength}
                      passThreshold={passThreshold}
                      passDirection={passDirection}
                      roles={wellRoles}
                      editMode={layoutEdit}
                      onAssignWell={assignWell}
                      onAssignRow={assignRow}
                      onAssignCol={assignCol}
                      normalizeToControl={normalizeView}
                      meanPos={controlMetrics?.meanPos ?? null}
                      meanNeg={controlMetrics?.meanNeg ?? null}
                    />
                    {rawData.stats && (
                      <div className={`grid grid-cols-2 gap-3 mt-5 ${zPrimeDisplay !== null ? "md:grid-cols-3 lg:grid-cols-6" : "md:grid-cols-3 lg:grid-cols-5"}`}>
                        {[
                          { label: "Mean", value: rawData.stats.mean },
                          { label: "Std Dev", value: rawData.stats.sd },
                          { label: "SEM", value: sem != null ? Number(sem.toFixed(3)) : null },
                          { label: "Min", value: rawData.stats.min },
                          { label: "Max", value: rawData.stats.max },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-muted rounded-lg p-3 border border-transparent hover:border-primary/50 transition-colors">
                            <div className="text-xs text-muted-foreground mb-1 font-bold">{label}</div>
                            <div className="text-base font-mono font-medium text-primary">{value ?? "–"}</div>
                          </div>
                        ))}
                        {zPrimeDisplay !== null && (
                          <div className="bg-muted rounded-lg p-3 border border-transparent hover:border-primary/50 transition-colors">
                            <div className="text-xs text-muted-foreground mb-1 font-bold">Z′-Factor</div>
                            <div className={`text-base font-mono font-medium ${
                              zPrimeDisplay >= 0.5 ? "text-emerald-500" : zPrimeDisplay >= 0 ? "text-yellow-500" : "text-destructive"
                            }`}>
                              {zPrimeDisplay.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {zPrimeIsComputed ? "computed from controls" : "from AI · define controls"}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {rawData && isPlate96 && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}>
                <DoseResponseCard
                  expId={expId}
                  wells={rawData.wells}
                  meanPos={controlMetrics?.meanPos ?? null}
                  meanNeg={controlMetrics?.meanNeg ?? null}
                />
              </motion.div>
            )}

            {rawData && !isPlate96 && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                <Card className="hover:border-l-2 hover:border-l-primary transition-all">
                  <CardHeader className="py-4 border-b">
                    <CardTitle className="text-lg">Uploaded Data Summary</CardTitle>
                    {experiment.file_name && (
                      <CardDescription className="font-mono">{experiment.file_name}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-muted rounded-lg p-3 border border-transparent hover:border-primary/50 transition-colors">
                        <div className="text-xs text-muted-foreground mb-1 font-bold">Rows</div>
                        <div className="text-lg font-mono font-medium text-primary">{rawData.rows || rawData.total_rows || "N/A"}</div>
                      </div>
                      <div className="bg-muted rounded-lg p-3 border border-transparent hover:border-primary/50 transition-colors">
                        <div className="text-xs text-muted-foreground mb-1 font-bold">Columns</div>
                        <div className="text-lg font-mono font-medium text-primary">{rawData.columns?.length || "N/A"}</div>
                      </div>
                    </div>
                    {rawData.columns && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Detected Columns</h4>
                        <div className="flex flex-wrap gap-2">
                          {rawData.columns.map((col: string) => (
                            <Badge key={col} variant="secondary" className="font-mono text-xs hover:bg-primary/20 transition-colors">{col}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {experiment.raw_data_json && !rawData && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="border-yellow-500/30 bg-yellow-500/5">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Uploaded data couldn't be displayed</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          The stored results for this experiment are unreadable. Re-upload the plate file by editing this experiment, or create a new one from a fresh Gen5 export.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {experiment.ai_summary && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="py-4 border-b border-primary/20">
                    <CardTitle className="text-lg flex items-center gap-2 text-primary">
                      <BrainCircuit className="h-5 w-5" />
                      AI Analysis Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {experiment.ai_summary}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div className="space-y-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h3 className="text-xl font-bold tracking-tight border-b pb-2 flex items-center gap-2">
              <BrainCircuit className="h-6 w-6 text-primary" />
              AI Copilot
            </h3>
            {experiment.conversation_id ? (
              <CopilotChat conversationId={experiment.conversation_id} />
            ) : (
              <Card className="border-dashed bg-muted/10 hover:bg-muted/20 transition-colors">
                <CardContent className="flex flex-col items-center justify-center p-8 text-center h-48">
                  <BrainCircuit className="h-12 w-12 text-primary/50 mb-4" />
                  <p className="text-muted-foreground font-medium font-mono">No active conversation</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    This experiment predates chat-on-create — start one to design the protocol or ask anything.
                  </p>
                  <Button size="sm" disabled={startingChat} onClick={startChat} className="gap-2">
                    {startingChat && <Loader2 className="h-4 w-4 animate-spin" />}
                    Start chat
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline" className="text-xs">Screen reader ready</Badge>
            <Badge variant="outline" className="text-xs">High contrast</Badge>
            <Badge variant="outline" className="text-xs">Reduced motion friendly</Badge>
          </div>
        </div>

        {/* Side panel with tabs */}
        <motion.div className="space-y-4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          {/* Tab bar */}
          <div className="flex border rounded-lg overflow-hidden">
            {SIDE_TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium transition-colors ${
                  activeTab === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "suggestions" && (
              <motion.div
                key="suggestions"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <Card className="hover:border-l-2 hover:border-l-primary transition-all">
                  <CardHeader className="py-4 border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-primary" />
                      Next Step Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {suggestions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm font-mono">
                        Click "Bioalyze" to get AI-driven suggestions for your next experiment.
                      </div>
                    ) : (
                      <RecommendationActions experimentId={expId} suggestions={suggestions} />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === "tasks" && (
              <motion.div
                key="tasks"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <ExperimentTasksPanel experimentId={expId} />
              </motion.div>
            )}

            {activeTab === "comments" && (
              <motion.div
                key="comments"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <CommentsPanel experimentId={expId} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
