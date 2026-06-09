import { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { CheckSquare, Plus, Circle, CheckCircle2, Clock, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface Task {
  id: number;
  experiment_id: number;
  source_recommendation_index: number | null;
  title: string;
  description: string | null;
  owner_name: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface ExperimentTasksPanelProps {
  experimentId: number;
  prefillTitle?: string;
  prefillRecIdx?: number;
}

const STATUS_ICON: Record<string, React.ElementType> = {
  todo: Circle,
  in_progress: Clock,
  done: CheckCircle2,
};

const STATUS_COLOR: Record<string, string> = {
  todo: "text-muted-foreground",
  in_progress: "text-cyan-400",
  done: "text-emerald-500",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "border-red-500 text-red-500",
  medium: "border-yellow-500 text-yellow-600",
  low: "border-emerald-500 text-emerald-600",
};

const nextStatus: Record<string, string> = { todo: "in_progress", in_progress: "done", done: "todo" };

function fetchTasks(expId: number): Promise<Task[]> {
  return apiFetch(`/api/experiments/${expId}/tasks`).then((r) => r.json());
}

export function ExperimentTasksPanel({ experimentId, prefillTitle, prefillRecIdx }: ExperimentTasksPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: prefillTitle ?? "",
    description: "",
    owner_name: "",
    due_date: "",
    status: "todo",
    priority: "medium",
  });

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["tasks", experimentId],
    queryFn: () => fetchTasks(experimentId),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiFetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          experiment_id: experimentId,
          source_recommendation_index: prefillRecIdx ?? null,
        }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", experimentId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task added" });
      setOpen(false);
      setForm({ title: "", description: "", owner_name: "", due_date: "", status: "todo", priority: "medium" });
    },
    onError: () => toast({ title: "Error", description: "Failed to add task.", variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiFetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", experimentId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", experimentId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task deleted" });
    },
  });

  const todo = (tasks ?? []).filter((t) => t.status === "todo");
  const inProgress = (tasks ?? []).filter((t) => t.status === "in_progress");
  const done = (tasks ?? []).filter((t) => t.status === "done");

  return (
    <Card className="hover:border-l-2 hover:border-l-primary transition-all dark:hover:shadow-[0_0_20px_rgba(0,245,255,0.08)]">
      <CardHeader className="py-4 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            Tasks
            {tasks && tasks.length > 0 && (
              <Badge variant="secondary" className="font-mono text-xs">{tasks.length}</Badge>
            )}
            {done.length > 0 && tasks && (
              <Badge variant="outline" className="font-mono text-xs text-emerald-500 border-emerald-500/50">
                {done.length}/{tasks.length} done
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-7 text-xs"
            onClick={() => {
              setForm({ title: prefillTitle ?? "", description: "", owner_name: "", due_date: "", status: "todo", priority: "medium" });
              setOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
          </div>
        ) : !tasks || tasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm font-mono">
            No tasks yet. Add one to track follow-up actions.
          </div>
        ) : (
          <div className="space-y-1.5">
            <AnimatePresence>
              {[...todo, ...inProgress, ...done].map((task) => {
                const Icon = STATUS_ICON[task.status] ?? Circle;
                const color = STATUS_COLOR[task.status] ?? "text-muted-foreground";
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2.5 group py-1.5 px-2 rounded-lg hover:bg-muted/40 transition-colors"
                  >
                    <button
                      className="flex-shrink-0 mt-0.5"
                      onClick={() => updateStatus.mutate({ id: task.id, status: nextStatus[task.status] })}
                      title="Advance status"
                    >
                      <Icon className={`h-4 w-4 ${color} hover:scale-110 transition-transform`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium leading-tight ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-mono ${PRIORITY_COLORS[task.priority] ?? ""}`}>
                          {task.priority}
                        </Badge>
                      </div>
                      {(task.owner_name || task.due_date) && (
                        <div className="flex gap-2 mt-0.5">
                          {task.owner_name && (
                            <span className="text-xs text-muted-foreground">→ {task.owner_name}</span>
                          )}
                          {task.due_date && (
                            <span className="text-xs text-muted-foreground font-mono">Due {task.due_date}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive flex-shrink-0"
                      onClick={() => deleteMutation.mutate(task.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g., Repeat with 2× concentration"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Additional details…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Input placeholder="e.g., Alice" value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.title.trim()}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
