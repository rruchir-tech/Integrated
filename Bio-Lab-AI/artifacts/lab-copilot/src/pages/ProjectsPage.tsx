import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Atom,
  FlaskConical,
  FolderKanban,
  Lightbulb,
  Loader2,
  Network,
  Orbit,
  Plus,
  Sparkles,
  Target,
} from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  LabConversation,
  LabPageHeader,
  LabPanel,
  LabSectionHeader,
  LabTextLink,
  type LabAccent,
} from "@/components/lab/LivingLab";

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
  return apiFetch("/api/projects").then((response) => response.json());
}

const projectAccents: LabAccent[] = ["violet", "cyan", "emerald", "amber", "rose"];

function Constellation({ count = 5 }: { count?: number }) {
  const nodes = Math.max(4, Math.min(10, count + 3));
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[250px]" aria-hidden="true">
      <motion.span className="absolute inset-[7%] rounded-full border border-dashed border-violet-300/20" animate={{ rotate: 360 }} transition={{ duration: 28, repeat: Infinity, ease: "linear" }} />
      <motion.span className="absolute inset-[22%] rounded-full border border-cyan-300/15" animate={{ rotate: -360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} />
      {Array.from({ length: nodes }, (_, index) => {
        const angle = (index / nodes) * Math.PI * 2;
        const radius = index % 2 ? 39 : 45;
        const left = 50 + Math.cos(angle) * radius;
        const top = 50 + Math.sin(angle) * radius;
        return (
          <motion.span
            key={index}
            className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${index % 3 === 0 ? "bg-violet-300" : index % 3 === 1 ? "bg-cyan-300" : "bg-emerald-300"}`}
            style={{ left: `${left}%`, top: `${top}%` }}
            animate={{ scale: [0.7, 1.25, 0.7], opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 2.4 + index * 0.14, delay: index * 0.12, repeat: Infinity }}
          />
        );
      })}
      <span className="absolute inset-[34%] flex items-center justify-center rounded-[2rem] border border-violet-300/25 bg-violet-300/[0.08] text-violet-200 shadow-[0_0_55px_rgba(167,139,250,.12)]">
        <Network className="h-8 w-8" />
      </span>
    </div>
  );
}

export function ProjectsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");

  const { data: projects, isLoading } = useQuery<Project[]>({ queryKey: ["projects"], queryFn: fetchProjects });
  const totalExperiments = (projects ?? []).reduce((sum, project) => sum + project.experiment_count, 0);

  const createMutation = useMutation({
    mutationFn: (data: { name: string; goal: string }) => apiFetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((response) => response.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Project created", description: "Its research context is ready to grow." });
      closeModal();
    },
    onError: () => toast({ title: "Couldn’t create project", description: "The workspace did not save this project.", variant: "destructive" }),
  });

  function closeModal() {
    setOpen(false);
    setName("");
    setGoal("");
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast({ title: "Name required", description: "Give the research thread a name.", variant: "destructive" });
      return;
    }
    createMutation.mutate({ name: name.trim(), goal: goal.trim() });
  }

  return (
    <div className="lab-page">
      <LabPageHeader
        eyebrow="Research constellation"
        title="Stop filing experiments. Start connecting the science."
        description="Projects turn isolated runs into a line of reasoning. Group the evidence around a goal so Bioalyzer can remember what changed, what held, and what the team should try next."
        icon={FolderKanban}
        accent="emerald"
        status={`${projects?.length ?? 0} research threads`}
        actions={
          <Button size="lg" className="h-11 gap-2 rounded-xl px-5" onClick={() => setOpen(true)} data-feedback="create" data-feedback-message="Creating a new research constellation">
            <Plus className="h-4 w-4" /> Create a research thread <ArrowUpRight className="h-4 w-4" />
          </Button>
        }
        aside={<Constellation count={projects?.length ?? 0} />}
      />

      <LabConversation accent="emerald">
        {projects?.length
          ? `I can see ${projects.length} connected ${projects.length === 1 ? "research thread" : "research threads"} holding ${totalExperiments} ${totalExperiments === 1 ? "experiment" : "experiments"}. Open one and I’ll reason across the whole line of work.`
          : "Give me a goal—not just a folder name. I’ll use it to keep every attached experiment pointed at the question your team is actually trying to answer."}
      </LabConversation>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          [Target, "Research threads", projects?.length ?? 0, "emerald" as LabAccent],
          [FlaskConical, "Connected experiments", totalExperiments, "cyan" as LabAccent],
          [Sparkles, "Shared AI contexts", projects?.length ?? 0, "violet" as LabAccent],
        ].map(([IconValue, label, value, accent], index) => {
          const Icon = IconValue as typeof Target;
          return (
            <motion.div key={String(label)} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + index * 0.06 }}>
              <LabPanel className="flex items-center gap-4 p-4" accent={accent as LabAccent}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--lab-accent)_24%,transparent)] bg-[var(--lab-accent-soft)] text-[var(--lab-accent)]"><Icon className="h-5 w-5" /></span>
                <div><p className="text-2xl font-semibold tracking-[-0.05em]">{value as number}</p><p className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">{String(label)}</p></div>
              </LabPanel>
            </motion.div>
          );
        })}
      </div>

      <LabSectionHeader eyebrow="Connected programs" title="Your active research map" description="Each project carries a question, its linked evidence, and the context the copilot needs to be useful." />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-72 rounded-2xl" />)}
        </div>
      ) : !projects || projects.length === 0 ? (
        <LabPanel className="grid min-h-[440px] gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_380px] lg:items-center" accent="emerald">
          <div>
            <p className="lab-kicker"><span className="lab-kicker-pulse" />Blank research map</p>
            <h2 className="mt-5 max-w-2xl text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">Build a home for the question, not just the files.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">A strong project tells Bioalyzer why the experiments belong together. Name the program, describe the goal, then connect every run that moves the answer forward.</p>
            <Button className="mt-7 gap-2" size="lg" onClick={() => setOpen(true)} data-feedback="create" data-feedback-message="Building your first research constellation">
              <Plus className="h-4 w-4" /> Build the first constellation
            </Button>
          </div>
          <Constellation count={0} />
        </LabPanel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {projects.map((project, index) => {
              const accent = projectAccents[index % projectAccents.length];
              const density = Math.min(100, 18 + project.experiment_count * 13);
              return (
                <motion.article key={project.id} initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ delay: index * 0.055, duration: 0.48, ease: [0.16, 1, 0.3, 1] }}>
                  <LabPanel className="group flex min-h-[290px] flex-col p-5 sm:p-6" accent={accent} interactive>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="lab-index-number">PRJ · {String(project.id).padStart(3, "0")}</p>
                        <span className="mt-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--lab-accent)_25%,transparent)] bg-[var(--lab-accent-soft)] text-[var(--lab-accent)]"><Atom className="h-5 w-5" /></span>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-semibold tracking-[-0.06em]">{project.experiment_count}</p>
                        <p className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">experiments</p>
                      </div>
                    </div>
                    <Link href={`/projects/${project.id}`} className="mt-6 block" data-feedback="navigate" data-feedback-message={`Opening ${project.name}`}>
                      <h3 className="text-xl font-semibold tracking-[-0.035em] transition-colors group-hover:text-[var(--lab-accent)]">{project.name}</h3>
                    </Link>
                    <p className="mt-2 line-clamp-3 min-h-[3.75rem] text-xs leading-5 text-muted-foreground">{project.goal || "This research thread is ready for a goal that tells the copilot what success should mean."}</p>
                    <div className="mt-auto pt-6">
                      <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-wider text-muted-foreground"><span>Context density</span><span>{density}%</span></div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-background/55"><motion.div className="h-full rounded-full bg-[var(--lab-accent)]" initial={{ width: 0 }} animate={{ width: `${density}%` }} transition={{ delay: 0.25 + index * 0.05, duration: 0.7 }} /></div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground"><Lightbulb className="h-3.5 w-3.5 text-[var(--lab-accent)]" /> Context connected</span>
                        <Link href={`/projects/${project.id}`}><LabTextLink>Enter project</LabTextLink></Link>
                      </div>
                    </div>
                  </LabPanel>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={open} onOpenChange={(value) => !value && closeModal()}>
        <DialogContent className="overflow-hidden border-emerald-300/15 bg-card/95 p-0 sm:max-w-xl">
          <div className="relative border-b border-border/70 p-6 sm:p-7">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(52,211,153,.12),transparent_45%)]" />
            <DialogHeader className="relative">
              <p className="lab-kicker"><span className="lab-kicker-pulse" />New research constellation</p>
              <DialogTitle className="mt-3 text-2xl tracking-[-0.04em]">What question should this work orbit?</DialogTitle>
            </DialogHeader>
          </div>
          <div className="space-y-5 p-6 sm:p-7">
            <LabConversation accent="emerald" className="mb-1">A useful goal tells me what you are testing, what matters, and what would change the next decision.</LabConversation>
            <div className="space-y-2">
              <Label htmlFor="project-name">Project name <span className="text-destructive">*</span></Label>
              <Input id="project-name" className="h-11 rounded-xl" placeholder="e.g., Compound-X cytotoxicity program" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-goal">Scientific goal / brief</Label>
              <Textarea id="project-goal" className="min-h-36 rounded-xl" placeholder="What are you trying to learn? Include the hypothesis, constraints, and what success would change." value={goal} onChange={(event) => setGoal(event.target.value)} />
            </div>
          </div>
          <DialogFooter className="border-t border-border/70 bg-background/30 p-5 sm:px-7">
            <Button variant="ghost" onClick={closeModal} data-feedback="filter" data-feedback-message="Closing the project draft">Keep it blank</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} data-feedback="save" data-feedback-message="Creating your project and its shared context">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Orbit className="h-4 w-4" />} Create constellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
