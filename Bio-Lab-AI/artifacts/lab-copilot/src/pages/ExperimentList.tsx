import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Beaker,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Dna,
  Filter,
  FlaskConical,
  HelpCircle,
  LayoutGrid,
  List,
  Loader2,
  Microscope,
  Pencil,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useListExperiments, getListExperimentsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LabConversation,
  LabPageHeader,
  LabPanel,
  LabSectionHeader,
  LabTextLink,
  type LabAccent,
} from "@/components/lab/LivingLab";

type ViewMode = "grid" | "list";

const STATUS_FILTERS = [
  { value: "all", label: "All signals", icon: Dna, accent: "cyan" as LabAccent },
  { value: "designing", label: "Designing", icon: Sparkles, accent: "violet" as LabAccent },
  { value: "ready", label: "Ready", icon: Clock3, accent: "amber" as LabAccent },
  { value: "running", label: "Running", icon: Activity, accent: "cyan" as LabAccent },
  { value: "success", label: "Success", icon: CheckCircle2, accent: "emerald" as LabAccent },
  { value: "in_progress", label: "In progress", icon: Loader2, accent: "cyan" as LabAccent },
  { value: "failed", label: "Failed", icon: AlertTriangle, accent: "rose" as LabAccent },
  { value: "unknown", label: "Unknown", icon: HelpCircle, accent: "amber" as LabAccent },
];

function statusAccent(status: string): LabAccent {
  if (status === "success") return "emerald";
  if (status === "failed") return "rose";
  if (status === "designing") return "violet";
  if (status === "ready") return "amber";
  return "cyan";
}

export function ExperimentList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assayFilter, setAssayFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const listParams = {
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    assay_type: assayFilter !== "all" ? assayFilter : undefined,
  };

  const { data: experiments, isLoading } = useListExperiments(listParams, {
    query: { queryKey: getListExperimentsQueryKey(listParams) },
  });
  const { data: allExperiments } = useListExperiments({}, {
    query: { queryKey: getListExperimentsQueryKey({}) },
  });

  const assayTypes = useMemo(() => Array.from(
    new Set((allExperiments ?? []).map((experiment) => experiment.assay_type).filter(Boolean)),
  ).sort(), [allExperiments]);
  const hasActiveFilter = Boolean(search) || statusFilter !== "all" || assayFilter !== "all";
  const runningCount = (allExperiments ?? []).filter((experiment) => ["running", "in_progress"].includes(experiment.status)).length;
  const successCount = (allExperiments ?? []).filter((experiment) => experiment.status === "success").length;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setAssayFilter("all");
  };

  return (
    <div className="lab-page">
      <LabPageHeader
        eyebrow="Experiment signal archive"
        title="Every run has a story. Keep the whole trail alive."
        description="Search the evidence, reopen the context, and move from one experimental decision to the next without reconstructing what happened."
        icon={Beaker}
        accent="violet"
        status={`${allExperiments?.length ?? 0} records indexed`}
        actions={
          <Link href="/experiments/new" data-feedback="create" data-feedback-message="Opening a fresh experiment record">
            <Button size="lg" className="h-11 gap-2 rounded-xl px-5">
              <Plus className="h-4 w-4" /> Start a new signal <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        }
        aside={
          <div className="grid w-full grid-cols-2 gap-3">
            {[
              ["All records", allExperiments?.length ?? 0, "text-violet-300"],
              ["In motion", runningCount, "text-cyan-300"],
              ["Successful", successCount, "text-emerald-300"],
              ["Assay types", assayTypes.length, "text-amber-300"],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="lab-panel p-3 text-center" data-accent="violet">
                <p className={`text-2xl font-semibold tracking-[-0.05em] ${color}`}>{value}</p>
                <p className="mt-1 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        }
      />

      <LabConversation accent={hasActiveFilter ? "amber" : "violet"}>
        {hasActiveFilter
          ? `${experiments?.length ?? 0} ${experiments?.length === 1 ? "record matches" : "records match"} the signal you described. I’ll keep the filters visible so you know exactly why.`
          : runningCount
            ? `${runningCount} active ${runningCount === 1 ? "run is" : "runs are"} still in motion. Open one to keep notes, data, and decisions attached.`
            : "The archive is listening. Search by question, instrument, assay, or stage and I’ll narrow the trail without losing context."}
      </LabConversation>

      <LabPanel className="p-4 sm:p-5" accent="violet">
        <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_auto_auto] xl:items-center">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-300" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by experiment, instrument, or scientific question…"
              className="h-12 rounded-xl border-border/75 bg-background/45 pl-11 pr-10 text-sm"
              data-feedback="filter"
              data-feedback-message="Listening for an experiment"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Clear search"
                data-feedback="filter"
                data-feedback-message="Clearing the experiment search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {assayTypes.length > 0 && (
              <Select value={assayFilter} onValueChange={setAssayFilter}>
                <SelectTrigger className="h-11 w-full rounded-xl bg-background/45 sm:w-[210px]" data-feedback="filter" data-feedback-message="Choosing an assay family">
                  <Filter className="mr-2 h-3.5 w-3.5 text-violet-300" />
                  <SelectValue placeholder="All assay types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assay families</SelectItem>
                  {assayTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {hasActiveFilter && (
              <Button variant="ghost" size="sm" className="h-10 gap-1.5 text-xs" onClick={clearFilters} data-feedback="filter" data-feedback-message="Returning to the complete experiment archive">
                <X className="h-3.5 w-3.5" /> Reset
              </Button>
            )}
          </div>

          <div className="inline-flex w-fit rounded-xl border border-border/75 bg-background/45 p-1">
            {([
              ["grid", LayoutGrid, "Grid"],
              ["list", List, "List"],
            ] as const).map(([mode, Icon, label]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-medium transition ${viewMode === mode ? "bg-violet-300/12 text-violet-200" : "text-muted-foreground hover:text-foreground"}`}
                aria-label={`${label} view`}
                data-feedback="filter"
                data-feedback-message={`Switching to ${label.toLowerCase()} view`}
              >
                <Icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </LabPanel>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map(({ value, label, icon: Icon, accent }) => {
          const count = value === "all"
            ? allExperiments?.length ?? 0
            : (allExperiments ?? []).filter((experiment) => experiment.status === value).length;
          const active = statusFilter === value;
          return (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              data-feedback="filter"
              data-feedback-message={`Showing ${label.toLowerCase()} experiments`}
              className={`group flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${active ? "border-[var(--lab-accent)] bg-[var(--lab-accent-soft)] text-foreground" : "border-border/70 bg-card/40 text-muted-foreground hover:border-border hover:bg-card/70 hover:text-foreground"}`}
              data-accent={accent}
            >
              <Icon className={`h-3.5 w-3.5 ${active ? "text-[var(--lab-accent)]" : ""}`} />
              <span>{label}</span>
              <span className="rounded-full border border-border/60 bg-background/35 px-1.5 py-0.5 font-mono text-[8px]">{count}</span>
            </button>
          );
        })}
      </div>

      <LabSectionHeader
        eyebrow="Indexed evidence"
        title={hasActiveFilter ? "The matching trail" : "Your experimental memory"}
        description={`${experiments?.length ?? 0} ${experiments?.length === 1 ? "record" : "records"} in this view`}
      />

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-52 rounded-2xl" />)}
        </div>
      ) : !experiments ? (
        <LabPanel className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center" accent="rose">
          <AlertTriangle className="h-8 w-8 text-rose-300" />
          <h3 className="mt-5 text-xl font-semibold">The archive signal dropped.</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Your experiments are still safe. Reconnect the API and this index will repopulate automatically.</p>
        </LabPanel>
      ) : experiments.length === 0 ? (
        <LabPanel className="grid min-h-[390px] gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_340px] lg:items-center" accent={hasActiveFilter ? "amber" : "violet"}>
          <div>
            <p className="lab-kicker"><span className="lab-kicker-pulse" />{hasActiveFilter ? "No matching signal" : "Archive ready"}</p>
            <h3 className="mt-5 max-w-xl text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              {hasActiveFilter ? "Nothing in the archive speaks that exact language yet." : "Your first experiment will become the beginning of a connected trail."}
            </h3>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              {hasActiveFilter ? "Broaden the filters or clear the search to return to your complete history." : "Create a record for the question, attach the raw signal, and let every next decision inherit the context."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {hasActiveFilter ? (
                <Button variant="outline" onClick={clearFilters}><X className="h-4 w-4" /> Clear the filters</Button>
              ) : (
                <Link href="/experiments/new"><Button><Plus className="h-4 w-4" /> Create the first record</Button></Link>
              )}
            </div>
          </div>
          <div className="relative hidden aspect-square lg:block" aria-hidden="true">
            {[0, 1, 2].map((ring) => (
              <motion.span
                key={ring}
                className="absolute rounded-full border border-[var(--lab-accent)]/20"
                style={{ inset: `${ring * 15}%` }}
                animate={{ rotate: ring % 2 ? -360 : 360 }}
                transition={{ duration: 18 + ring * 4, repeat: Infinity, ease: "linear" }}
              />
            ))}
            <span className="absolute inset-[36%] flex items-center justify-center rounded-3xl border border-[var(--lab-accent)]/30 bg-[var(--lab-accent-soft)] text-[var(--lab-accent)]"><FlaskConical className="h-9 w-9" /></span>
          </div>
        </LabPanel>
      ) : viewMode === "grid" ? (
        <motion.div layout className="grid gap-4 lg:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {experiments.map((experiment, index) => {
              const accent = statusAccent(experiment.status);
              return (
                <motion.article
                  layout
                  key={experiment.id}
                  initial={{ opacity: 0, y: 18, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                >
                  <LabPanel className="group h-full p-5 sm:p-6" accent={accent} interactive>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="lab-index-number">{String(index + 1).padStart(2, "0")}</span>
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--lab-accent)_24%,transparent)] bg-[var(--lab-accent-soft)] text-[var(--lab-accent)]"><FlaskConical className="h-4.5 w-4.5" /></span>
                      </div>
                      <StatusBadge status={experiment.status} />
                    </div>
                    <Link href={`/experiments/${experiment.id}`} data-feedback="navigate" data-feedback-message={`Opening ${experiment.name}`}>
                      <h3 className="mt-6 text-xl font-semibold tracking-[-0.035em] transition-colors group-hover:text-[var(--lab-accent)]">{experiment.name}</h3>
                    </Link>
                    <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">
                      {experiment.assay_type} evidence captured on {experiment.instrument}, with its analysis and decision trail kept in one living record.
                    </p>
                    <div className="mt-5 grid grid-cols-3 gap-2">
                      {[
                        [CalendarDays, format(parseISO(experiment.date), "MMM d, yyyy")],
                        [Dna, experiment.assay_type],
                        [Microscope, experiment.instrument],
                      ].map(([MetaIcon, value], metaIndex) => {
                        const Icon = MetaIcon as typeof CalendarDays;
                        return (
                          <div key={metaIndex} className="min-w-0 rounded-xl border border-border/60 bg-background/35 p-2.5">
                            <Icon className="h-3.5 w-3.5 text-[var(--lab-accent)]" />
                            <p className="mt-2 truncate text-[10px] text-muted-foreground">{String(value)}</p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
                      <Link href={`/experiments/${experiment.id}`} data-feedback="navigate" data-feedback-message={`Opening ${experiment.name}`}><LabTextLink>Open living record</LabTextLink></Link>
                      <Link href={`/experiments/${experiment.id}/edit`} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Edit ${experiment.name}`} data-feedback="navigate" data-feedback-message={`Opening ${experiment.name} for editing`}><Pencil className="h-3.5 w-3.5" /></Link>
                    </div>
                  </LabPanel>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </motion.div>
      ) : (
        <LabPanel className="divide-y divide-border/60" accent="violet">
          <AnimatePresence mode="popLayout">
            {experiments.map((experiment, index) => (
              <motion.div key={experiment.id} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ delay: Math.min(index * 0.035, 0.25) }} className="group grid items-center gap-4 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:px-5">
                <span className="lab-index-number">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <Link href={`/experiments/${experiment.id}`} className="block truncate text-sm font-semibold hover:text-primary" data-feedback="navigate" data-feedback-message={`Opening ${experiment.name}`}>{experiment.name}</Link>
                  <p className="mt-1 truncate text-[10px] text-muted-foreground">{experiment.assay_type} · {experiment.instrument} · {format(parseISO(experiment.date), "MMM d, yyyy")}</p>
                </div>
                <StatusBadge status={experiment.status} />
                <Link href={`/experiments/${experiment.id}`}><ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" /></Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </LabPanel>
      )}
    </div>
  );
}
