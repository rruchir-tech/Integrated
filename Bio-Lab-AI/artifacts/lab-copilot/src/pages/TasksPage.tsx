import { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, ClipboardList, CheckCircle2, Circle, Clock, AlertTriangle,
  Loader2, Trash2, ChevronDown, ChevronUp, FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
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
import { format, parseISO } from "date-fns";
import { useListExperiments, getListExperimentsQueryKey } from "@workspace/api-client-react";

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

const STATUS_COLUMNS = [
  { key: "todo", label: "To Do", icon: Circle, color: "text-muted-foreground" },
  { key: "in_progress", label: "In Progress", icon: Clock, color: "text-cyan-400" },
  { key: "done", label: "Done", icon: CheckCircle2, color: "text-emerald-500" },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: "border-red-500 text-red-500",
  medium: "border-yellow-500 text-yellow-600",
  low: "border-emerald-500 text-emerald-600",
};

function fetchTasks(): Promise<Task[]> {
  return apiFetch("/api/tasks").then((r) => r.json());
}

export function TasksPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filterExp, setFilterExp] = useState<string>("all");
  const [form, setForm] = useState({
    experiment_id: "",
    title: "",
    description: "",
    owner_name: "",
    due_date: "",
    status: "todo",
    priority: "medium",
  });

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
  });

  const { data: experiments } = useListExperiments(undefined, {
    query: { queryKey: getListExperimentsQueryKey() },
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiFetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, experiment_id: parseInt(data.experiment_id) }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task created" });
      setOpen(false);
      setForm({ experiment_id: "", title: "", description: "", owner_name: "", due_date: "", status: "todo", priority: "medium" });
    },
    onError: () => toast({ title: "Error", description: "Failed to create task.", variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiFetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task deleted" });
    },
  });

  const expMap: Record<number, string> = {};
  experiments?.forEach((e) => { expMap[e.id] = e.name; });

  const filteredTasks = (tasks ?? []).filter(
    (t) => filterExp === "all" || String(t.experiment_id) === filterExp,
  );

  const byStatus = (status: string) => filteredTasks.filter((t) => t.status === status);

  const nextStatus: Record<string, string> = { todo: "in_progress", in_progress: "done", done: "todo" };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-primary" />
            Tasks
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Action items and follow-up tasks across all experiments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterExp} onValueChange={setFilterExp}>
            <SelectTrigger className="w-48 h-9 text-sm">
              <SelectValue placeholder="All experiments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All experiments</SelectItem>
              {experiments?.map((e) => (
                <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATUS_COLUMNS.map(({ key, label, icon: Icon, color }) => {
            const col = byStatus(key);
            return (
              <div key={key} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 px-1">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{label}</span>
                  <Badge variant="outline" className="ml-auto text-xs font-mono">{col.length}</Badge>
                </div>
                <div className="flex flex-col gap-2 min-h-[8rem]">
                  <AnimatePresence>
                    {col.map((task, idx) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.04 }}
                      >
                        <Card className="hover:border-primary/40 transition-all group cursor-default">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start gap-2">
                              <button
                                className="mt-0.5 flex-shrink-0"
                                title="Advance status"
                                onClick={() => updateStatus.mutate({ id: task.id, status: nextStatus[task.status] })}
                              >
                                <Icon className={`h-4 w-4 ${color} hover:scale-110 transition-transform`} />
                              </button>
                              <p className={`text-sm font-medium leading-tight flex-1 ${key === "done" ? "line-through text-muted-foreground" : ""}`}>
                                {task.title}
                              </p>
                              <button
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                onClick={() => deleteMutation.mutate(task.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {task.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 ml-6">{task.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-1.5 ml-6">
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-mono ${PRIORITY_COLORS[task.priority] ?? ""}`}>
                                {task.priority}
                              </Badge>
                              {expMap[task.experiment_id] && (
                                <Link href={`/experiments/${task.experiment_id}`}>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex items-center gap-1 cursor-pointer hover:bg-primary/20">
                                    <FlaskConical className="h-2.5 w-2.5" />
                                    {expMap[task.experiment_id].slice(0, 20)}
                                    {expMap[task.experiment_id].length > 20 ? "…" : ""}
                                  </Badge>
                                </Link>
                              )}
                              {task.due_date && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  Due {task.due_date}
                                </span>
                              )}
                              {task.owner_name && (
                                <span className="text-[10px] text-muted-foreground">→ {task.owner_name}</span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {col.length === 0 && (
                    <div className="border-2 border-dashed border-border rounded-lg h-24 flex items-center justify-center text-xs text-muted-foreground">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Experiment <span className="text-destructive">*</span></Label>
              <Select value={form.experiment_id} onValueChange={(v) => setForm({ ...form, experiment_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Link to experiment…" />
                </SelectTrigger>
                <SelectContent>
                  {experiments?.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g., Repeat dose-response with 2× concentration"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
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
              disabled={createMutation.isPending || !form.title.trim() || !form.experiment_id}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
