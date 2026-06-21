import { useState } from "react";
import { useParams, Link } from "wouter";
import { apiFetch } from "@/lib/apiFetch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FolderKanban, FlaskConical, Calendar, Microscope, Plus, Pencil, Trash2, Loader2, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ProjectChat } from "@/components/chat/ProjectChat";

interface ExperimentRef {
  id: number;
  name: string;
  date: string;
  assay_type: string;
  instrument: string;
  status: string;
}

interface ProjectDetailData {
  id: number;
  name: string;
  goal: string | null;
  status: string;
  experiments: ExperimentRef[];
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addExpId, setAddExpId] = useState("");

  const { data: project, isLoading } = useQuery<ProjectDetailData>({
    queryKey: ["project", projectId],
    queryFn: () => apiFetch(`/api/projects/${projectId}`).then((r) => r.json()),
    enabled: !!projectId,
  });

  // All of the user's experiments, to offer the ones not yet in this project.
  const { data: allExperiments } = useQuery<ExperimentRef[]>({
    queryKey: ["experiments-for-project"],
    queryFn: () => apiFetch("/api/experiments").then((r) => r.json()),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  const assignMutation = useMutation({
    mutationFn: ({ expId, project_id }: { expId: number; project_id: number | null }) =>
      apiFetch(`/api/experiments/${expId}/project`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id }),
      }).then((r) => r.json()),
    onSuccess: () => { invalidate(); setAddExpId(""); },
    onError: () => toast({ title: "Error", description: "Failed to update experiment.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; goal: string }) =>
      apiFetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => { invalidate(); setEditOpen(false); toast({ title: "Project updated" }); },
    onError: () => toast({ title: "Error", description: "Failed to update project.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/api/projects/${projectId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Project deleted", description: "Its experiments are now ungrouped." });
      window.history.length > 1 ? window.history.back() : (window.location.href = "/projects");
    },
    onError: () => toast({ title: "Error", description: "Failed to delete project.", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <div className="h-40 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!project) {
    return <div className="text-center py-12 font-mono">Project not found</div>;
  }

  const inProjectIds = new Set(project.experiments.map((e) => e.id));
  const assignable = (allExperiments ?? []).filter((e) => !inProjectIds.has(e.id));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Projects
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b pb-6">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3 text-primary">
            <FolderKanban className="h-7 w-7 flex-shrink-0" />
            <span className="break-words">{project.name}</span>
          </h1>
          {project.goal ? (
            <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap max-w-2xl">{project.goal}</p>
          ) : (
            <p className="text-sm text-muted-foreground/60 italic mt-3">No goal set yet — add one so the AI knows what this project is about.</p>
          )}
        </div>
        <div className="flex items-center gap-2 lg:flex-shrink-0">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => { setEditName(project.name); setEditGoal(project.goal ?? ""); setEditOpen(true); }}
          >
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Add experiment */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-muted-foreground">Add experiment:</span>
        <Select value={addExpId} onValueChange={setAddExpId}>
          <SelectTrigger className="w-72 h-9">
            <SelectValue placeholder={assignable.length ? "Choose an experiment…" : "No ungrouped experiments"} />
          </SelectTrigger>
          <SelectContent>
            {assignable.map((e) => (
              <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="gap-1.5"
          disabled={!addExpId || assignMutation.isPending}
          onClick={() => assignMutation.mutate({ expId: parseInt(addExpId, 10), project_id: projectId })}
        >
          {assignMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add
        </Button>
      </div>

      {/* Experiments in this project */}
      {project.experiments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border border-dashed rounded-xl">
          <FlaskConical className="h-10 w-10 opacity-30 mb-3" />
          <p className="text-sm">No experiments in this project yet. Add one above.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {project.experiments.map((e, idx) => (
            <motion.div key={e.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}>
              <Card className="hover:border-l-2 hover:border-l-primary transition-all">
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/experiments/${e.id}`}>
                        <CardTitle className="text-base leading-tight hover:text-primary transition-colors cursor-pointer truncate">{e.name}</CardTitle>
                      </Link>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono mt-1.5">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{(() => { try { return format(parseISO(e.date), "MMM d, yyyy"); } catch { return e.date; } })()}</span>
                        <span className="flex items-center gap-1"><FlaskConical className="h-3 w-3" />{e.assay_type}</span>
                        <span className="flex items-center gap-1"><Microscope className="h-3 w-3" />{e.instrument}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={e.status} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Remove from project"
                        onClick={() => assignMutation.mutate({ expId: e.id, project_id: null })}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Project copilot */}
      <div className="pt-2">
        <ProjectChat projectId={project.id} />
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Goal / brief</Label>
              <Textarea value={editGoal} onChange={(e) => setEditGoal(e.target.value)} rows={5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              disabled={!editName.trim() || updateMutation.isPending}
              onClick={() => updateMutation.mutate({ name: editName.trim(), goal: editGoal.trim() })}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              "{project.name}" will be removed. Its {project.experiments.length} experiment{project.experiments.length === 1 ? "" : "s"} will NOT be deleted — they just become ungrouped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
