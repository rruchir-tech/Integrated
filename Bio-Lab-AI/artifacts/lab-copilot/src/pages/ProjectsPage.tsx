import { useState } from "react";
import { Link } from "wouter";
import { apiFetch } from "@/lib/apiFetch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FolderKanban, FlaskConical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export interface Project {
  id: number;
  name: string;
  goal: string | null;
  status: string;
  experiment_count: number;
  created_at: string;
  updated_at: string;
}

function fetchProjects(): Promise<Project[]> {
  return apiFetch("/api/projects").then((r) => r.json());
}

export function ProjectsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; goal: string }) =>
      apiFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Project created", description: "Start adding experiments to it." });
      closeModal();
    },
    onError: () => toast({ title: "Error", description: "Failed to create project.", variant: "destructive" }),
  });

  function closeModal() {
    setOpen(false);
    setName("");
    setGoal("");
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast({ title: "Name required", description: "Give the project a name.", variant: "destructive" });
      return;
    }
    createMutation.mutate({ name: name.trim(), goal: goal.trim() });
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FolderKanban className="h-8 w-8 text-primary" />
            Projects
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Group related experiments so the AI can reason across your whole line of research.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : !projects || projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <FolderKanban className="h-16 w-16 text-primary/30 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm">
            Create a project, describe its goal, and group your experiments under it — the copilot will use the
            whole project as context.
          </p>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create your first project
          </Button>
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {projects.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link href={`/projects/${p.id}`}>
                  <Card className="h-full cursor-pointer hover:border-l-2 hover:border-l-primary transition-all flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-tight">{p.name}</CardTitle>
                        <Badge variant="secondary" className="font-mono text-xs flex items-center gap-1 flex-shrink-0">
                          <FlaskConical className="h-3 w-3" />
                          {p.experiment_count}
                        </Badge>
                      </div>
                      {p.goal && (
                        <CardDescription className="mt-1 text-xs line-clamp-3">{p.goal}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="flex-1 flex items-end">
                      <span className="text-xs text-muted-foreground font-mono">
                        {p.experiment_count} experiment{p.experiment_count === 1 ? "" : "s"}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => !v && closeModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g., Compound-X cytotoxicity program"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Goal / brief</Label>
              <Textarea
                placeholder="What are you trying to find out? Background, hypotheses, what you've tried so far. The AI uses this as context for the whole project."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
