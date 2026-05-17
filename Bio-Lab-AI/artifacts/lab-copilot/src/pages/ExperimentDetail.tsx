import { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetExperiment, 
  getGetExperimentQueryKey,
  useAnalyzeExperiment,
  useUpdateExperiment,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import {
  BrainCircuit, Calendar, FlaskConical, Microscope, FileText,
  CheckCircle2, AlertTriangle, Pencil, MessageSquare, CheckSquare,
} from "lucide-react";
import { CopilotChat } from "@/components/chat/CopilotChat";
import { PlateHeatmap } from "@/components/PlateHeatmap";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CommentsPanel } from "@/components/experiment/CommentsPanel";
import { ExperimentTasksPanel } from "@/components/experiment/ExperimentTasksPanel";
import { RecommendationActions } from "@/components/experiment/RecommendationActions";

const MotionButton = motion.create(Button);

type TabKey = "suggestions" | "tasks" | "comments";

export function ExperimentDetail() {
  const { id } = useParams<{ id: string }>();
  const expId = parseInt(id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("suggestions");

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
    { key: "comments", label: "Comments", icon: MessageSquare },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-primary">{experiment.name}</h1>
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
        <div className="flex items-center gap-3">
          <StatusBadge status={experiment.status} />
          <Link href={`/experiments/${expId}/edit`}>
            <MotionButton variant="outline" className="gap-2" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Pencil className="h-4 w-4" />
              Edit
            </MotionButton>
          </Link>
          <MotionButton
            onClick={() => analyzeMutation.mutate({ id: expId, data: {} })}
            disabled={analyzeMutation.isPending}
            className="gap-2 dark:shadow-[0_0_12px_rgba(0,245,255,0.3)] relative overflow-hidden"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            {analyzeMutation.isPending && (
              <motion.div
                className="absolute inset-0 bg-primary/20"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              />
            )}
            <BrainCircuit className={`h-4 w-4 ${analyzeMutation.isPending ? "animate-pulse" : ""}`} />
            {analyzeMutation.isPending ? "Analyzing…" : "Analyze with AI"}
          </MotionButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="md:col-span-2 space-y-6">
          <AnimatePresence>
            {experiment.notes && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                <Card className="hover:border-l-2 hover:border-l-primary transition-all dark:hover:shadow-[0_0_20px_rgba(0,245,255,0.08)]">
                  <CardHeader className="py-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm font-mono text-muted-foreground">{experiment.notes}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {rawData && isPlate96 && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                <Card className="hover:border-l-2 hover:border-l-primary transition-all dark:hover:shadow-[0_0_20px_rgba(0,245,255,0.08)]">
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
                      <div className="flex flex-wrap gap-2 justify-end">
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
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <PlateHeatmap
                      wells={rawData.wells}
                      stats={rawData.stats}
                      wavelength={rawData.metadata?.wavelength}
                    />
                    {rawData.stats && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                        {[
                          { label: "Mean", value: rawData.stats.mean },
                          { label: "Std Dev", value: rawData.stats.sd },
                          { label: "Min", value: rawData.stats.min },
                          { label: "Max", value: rawData.stats.max },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-muted rounded-lg p-3 border border-transparent hover:border-primary/50 transition-colors">
                            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-widest font-bold">{label}</div>
                            <div className="text-base font-mono font-medium text-primary">{value ?? "–"}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {rawData && !isPlate96 && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                <Card className="hover:border-l-2 hover:border-l-primary transition-all dark:hover:shadow-[0_0_20px_rgba(0,245,255,0.08)]">
                  <CardHeader className="py-4 border-b">
                    <CardTitle className="text-lg">Uploaded Data Summary</CardTitle>
                    {experiment.file_name && (
                      <CardDescription className="font-mono">{experiment.file_name}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-muted rounded-lg p-3 border border-transparent hover:border-primary/50 transition-colors">
                        <div className="text-xs text-muted-foreground mb-1 uppercase tracking-widest font-bold">Rows</div>
                        <div className="text-lg font-mono font-medium text-primary">{rawData.rows || rawData.total_rows || "N/A"}</div>
                      </div>
                      <div className="bg-muted rounded-lg p-3 border border-transparent hover:border-primary/50 transition-colors">
                        <div className="text-xs text-muted-foreground mb-1 uppercase tracking-widest font-bold">Columns</div>
                        <div className="text-lg font-mono font-medium text-primary">{rawData.columns?.length || "N/A"}</div>
                      </div>
                    </div>
                    {rawData.columns && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 uppercase tracking-widest">Detected Columns</h4>
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

            {experiment.ai_summary && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                <Card className="border-primary/30 bg-primary/5 dark:shadow-[0_0_15px_rgba(0,245,255,0.05)]">
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
                  <p className="text-sm text-muted-foreground mt-1">Click "Analyze with AI" to start the copilot chat.</p>
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
                <Card className="hover:border-l-2 hover:border-l-primary transition-all dark:hover:shadow-[0_0_20px_rgba(0,245,255,0.08)]">
                  <CardHeader className="py-4 border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-primary" />
                      Next Step Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {suggestions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm font-mono">
                        Click "Analyze with AI" to get AI-driven suggestions for your next experiment.
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
