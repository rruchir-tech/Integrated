import { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, Pencil, BrainCircuit, Loader2, Plus,
  ChevronDown, ChevronUp, ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ExperimentTasksPanel } from "./ExperimentTasksPanel";

interface Suggestion {
  title: string;
  variable_to_change: string;
  rationale: string;
  expected_outcome: string;
  confidence: string;
}

interface RecommendationAction {
  id: number;
  experiment_id: number;
  recommendation_index: number;
  recommendation_title: string;
  action_status: string;
  reviewer_name: string | null;
  reviewer_note: string | null;
  edited_recommendation_json: string | null;
  created_at: string;
}

interface RecommendationActionsProps {
  experimentId: number;
  suggestions: Suggestion[];
}

function fetchActions(expId: number): Promise<RecommendationAction[]> {
  return apiFetch(`/api/experiments/${expId}/recommendations/actions`).then((r) => r.json());
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  approved: { label: "Approved", color: "text-emerald-600", bgColor: "bg-emerald-500/10 border-emerald-500/30" },
  rejected: { label: "Rejected", color: "text-red-500", bgColor: "bg-red-500/10 border-red-500/30" },
  edited: { label: "Edited", color: "text-yellow-600", bgColor: "bg-yellow-500/10 border-yellow-500/30" },
};

export function RecommendationActions({ experimentId, suggestions }: RecommendationActionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewerName, setReviewerName] = useState("");
  const [editOpen, setEditOpen] = useState<{ idx: number; sug: Suggestion } | null>(null);
  const [addTaskIdx, setAddTaskIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Suggestion & { reviewer_note: string }>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const { data: actions } = useQuery<RecommendationAction[]>({
    queryKey: ["rec-actions", experimentId],
    queryFn: () => fetchActions(experimentId),
    enabled: suggestions.length > 0,
  });

  const approveMutation = useMutation({
    mutationFn: ({ idx, note }: { idx: number; note?: string }) =>
      apiFetch(`/api/experiments/${experimentId}/recommendations/${idx}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer_name: reviewerName || undefined, reviewer_note: note }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rec-actions", experimentId] });
      toast({ title: "Recommendation approved" });
    },
    onError: () => toast({ title: "Error", description: "Failed to approve.", variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ idx, sug, note }: { idx: number; sug: Suggestion; note?: string }) =>
      apiFetch(`/api/experiments/${experimentId}/recommendations/${idx}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: sug.title, original: sug, reviewer_name: reviewerName || undefined, reviewer_note: note }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rec-actions", experimentId] });
      toast({ title: "Recommendation rejected" });
    },
    onError: () => toast({ title: "Error", description: "Failed to reject.", variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: (payload: Partial<Suggestion> & { idx: number; original: Suggestion; reviewer_note?: string }) =>
      apiFetch(`/api/experiments/${experimentId}/recommendations/${payload.idx}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          reviewer_name: reviewerName || undefined,
        }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rec-actions", experimentId] });
      toast({ title: "Recommendation saved with edits" });
      setEditOpen(null);
    },
    onError: () => toast({ title: "Error", description: "Failed to save edits.", variant: "destructive" }),
  });

  function getActionForIdx(idx: number): RecommendationAction | undefined {
    return actions?.find((a) => a.recommendation_index === idx);
  }

  return (
    <div className="space-y-4">
      {suggestions.length > 0 && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Your name (for reviews)</label>
          <Input
            placeholder="e.g., Dr. Smith"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      )}

      {suggestions.map((sug, idx) => {
        const action = getActionForIdx(idx);
        const cfg = action ? STATUS_CONFIG[action.action_status] : null;
        const isOpen = expanded[idx] ?? true;

        return (
          <motion.div
            key={idx}
            className="border rounded-lg bg-card shadow-sm relative overflow-hidden group"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.08 }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/50 group-hover:bg-primary transition-colors" />

            <div className="pl-4 pr-3 pt-3 pb-2">
              <div className="flex items-start justify-between gap-2">
                <button
                  className="flex items-start gap-2 flex-1 text-left"
                  onClick={() => setExpanded((prev) => ({ ...prev, [idx]: !isOpen }))}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm text-primary leading-tight">{sug.title}</h4>
                      <Badge
                        variant={sug.confidence === "high" ? "default" : sug.confidence === "medium" ? "secondary" : "outline"}
                        className="text-[10px] px-1.5 py-0 capitalize font-mono flex-shrink-0"
                      >
                        {sug.confidence}
                      </Badge>
                      {cfg && (
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      )}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
                </button>
              </div>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 mt-3"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Variable to change</span>
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs text-primary">{sug.variable_to_change}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Rationale</span>
                      <p className="text-muted-foreground leading-snug text-sm">{sug.rationale}</p>
                    </div>
                    <div className="bg-primary/5 p-2 rounded border border-primary/20">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1">Expected Outcome</span>
                      <p className="text-foreground leading-snug font-mono text-xs">{sug.expected_outcome}</p>
                    </div>

                    {action && (
                      <div className={`rounded-lg px-3 py-2 border text-xs ${cfg?.bgColor}`}>
                        <span className={`font-bold ${cfg?.color}`}>{cfg?.label}</span>
                        {action.reviewer_name && <span className="text-muted-foreground ml-2">by {action.reviewer_name}</span>}
                        {action.reviewer_note && <p className="mt-1 text-muted-foreground italic">{action.reviewer_note}</p>}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      {!action && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 text-xs text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10"
                            disabled={approveMutation.isPending}
                            onClick={() => approveMutation.mutate({ idx })}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 text-xs text-red-500 border-red-500/40 hover:bg-red-500/10"
                            disabled={rejectMutation.isPending}
                            onClick={() => rejectMutation.mutate({ idx, sug })}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 text-xs"
                            onClick={() => {
                              setEditForm({ ...sug, reviewer_note: "" });
                              setEditOpen({ idx, sug });
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit & Approve
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => setAddTaskIdx(idx)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Task
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}

      <Dialog open={!!editOpen} onOpenChange={(v) => !v && setEditOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Recommendation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={editForm.title ?? ""} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Variable to change</Label>
              <Input value={editForm.variable_to_change ?? ""} onChange={(e) => setEditForm({ ...editForm, variable_to_change: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Rationale</Label>
              <Textarea rows={2} value={editForm.rationale ?? ""} onChange={(e) => setEditForm({ ...editForm, rationale: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Expected Outcome</Label>
              <Textarea rows={2} value={editForm.expected_outcome ?? ""} onChange={(e) => setEditForm({ ...editForm, expected_outcome: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Confidence</Label>
                <Select value={editForm.confidence ?? "medium"} onValueChange={(v) => setEditForm({ ...editForm, confidence: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Reviewer note</Label>
                <Input placeholder="Optional note…" value={editForm.reviewer_note ?? ""} onChange={(e) => setEditForm({ ...editForm, reviewer_note: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!editOpen) return;
                editMutation.mutate({
                  idx: editOpen.idx,
                  original: editOpen.sug,
                  ...editForm,
                });
              }}
              disabled={editMutation.isPending}
            >
              {editMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save & Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {addTaskIdx !== null && (
        <Dialog open={true} onOpenChange={(v) => !v && setAddTaskIdx(null)}>
          <DialogContent className="max-w-lg p-0">
            <div className="p-6">
              <ExperimentTasksPanel
                experimentId={experimentId}
                prefillTitle={suggestions[addTaskIdx]?.title}
                prefillRecIdx={addTaskIdx}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
