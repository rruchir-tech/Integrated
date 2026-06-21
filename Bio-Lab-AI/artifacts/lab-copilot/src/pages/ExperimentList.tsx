import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListExperiments, getListExperimentsQueryKey } from "@workspace/api-client-react";
import { Plus, Search, Filter, Pencil, Eye, CheckCircle2, AlertTriangle, Loader2, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const MotionButton = motion.create(Button);

const STATUS_FILTERS = [
  { value: "all", label: "All", icon: null, color: "" },
  { value: "success", label: "Success", icon: CheckCircle2, color: "text-emerald-400" },
  { value: "in_progress", label: "In Progress", icon: Loader2, color: "text-cyan-400" },
  { value: "failed", label: "Failed", icon: AlertTriangle, color: "text-red-400" },
  { value: "unknown", label: "Unknown", icon: HelpCircle, color: "text-muted-foreground" },
];

export function ExperimentList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assayFilter, setAssayFilter] = useState<string>("all");
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const listParams = {
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    assay_type: assayFilter !== "all" ? assayFilter : undefined,
  };

  const { data: experiments, isLoading } = useListExperiments(
    listParams,
    { query: { queryKey: getListExperimentsQueryKey(listParams) } }
  );

  // Unfiltered fetch (react-query cached) used only to populate the assay-type
  // dropdown with every assay the scientist has, regardless of active filter.
  const { data: allExperiments } = useListExperiments(
    {},
    { query: { queryKey: getListExperimentsQueryKey({}) } }
  );
  const assayTypes = Array.from(
    new Set((allExperiments ?? []).map((e) => e.assay_type).filter(Boolean))
  ).sort();

  const hasActiveFilter = Boolean(search) || statusFilter !== "all" || assayFilter !== "all";

  return (
    <div className="space-y-5 flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Experiments</h1>
          <p className="text-sm text-muted-foreground mt-1">Search, filter, and jump back into your active runs.</p>
        </div>
        <Link href="/experiments/new">
          <MotionButton 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="dark:shadow-[0_0_12px_rgba(0,245,255,0.3)]"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Experiment
          </MotionButton>
        </Link>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search experiments..."
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="text-xs text-muted-foreground font-mono hidden sm:block">
            {experiments ? `${experiments.length} result${experiments.length !== 1 ? "s" : ""}` : ""}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map(({ value, label, icon: Icon, color }) => (
            <motion.button
              key={value}
              onClick={() => setStatusFilter(value)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                statusFilter === value
                  ? "bg-primary text-primary-foreground border-primary dark:shadow-[0_0_10px_rgba(0,245,255,0.3)]"
                  : "bg-muted/50 border-border hover:border-primary/50 hover:bg-muted"
              }`}
            >
              {Icon && <Icon className={`h-3 w-3 ${statusFilter === value ? "" : color}`} />}
              {label}
            </motion.button>
          ))}

          {assayTypes.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={assayFilter} onValueChange={setAssayFilter}>
                <SelectTrigger className="h-8 w-[190px] text-xs bg-background">
                  <SelectValue placeholder="All assay types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assay types</SelectItem>
                  {assayTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto border rounded-lg bg-card">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : !experiments ? (
          <motion.div
            className="flex flex-col items-center justify-center h-full p-8 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="h-16 w-16 rounded-full bg-muted/50 border border-border flex items-center justify-center mb-4">
              <AlertTriangle className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Couldn’t load experiments</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">
              Something went wrong fetching your runs. This is usually temporary.
            </p>
          </motion.div>
        ) : experiments.length === 0 ? (
          hasActiveFilter ? (
            <motion.div
              className="flex flex-col items-center justify-center h-full p-8 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="h-16 w-16 rounded-full bg-muted/50 border border-border flex items-center justify-center mb-4">
                <Search className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No matching experiments</h3>
              <p className="text-muted-foreground text-sm max-w-sm mt-1">
                {search ? `No results for "${search}".` : "No experiments match the current filter."}
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSearch(""); setStatusFilter("all"); setAssayFilter("all"); }}>
                <X className="h-3.5 w-3.5 mr-1.5" />
                Clear filters
              </Button>
            </motion.div>
          ) : (
            <motion.div
              className="flex flex-col items-center justify-center h-full p-8 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <Plus className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">No experiments yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm mt-1">
                Upload a plate reader export or instrument file — Bioalyzer parses, analyzes, and tracks it for you.
              </p>
              <Link href="/experiments/new">
                <Button size="sm" className="mt-4">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Create your first experiment
                </Button>
              </Link>
            </motion.div>
          )
        ) : (
          <div className="divide-y divide-border/50">
            <AnimatePresence initial={false}>
              {experiments?.map((exp, index) => (
                <motion.div
                  key={exp.id}
                  layout
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ delay: index * 0.03 }}
                  className="relative group"
                  onMouseEnter={() => setHoveredId(exp.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <Link 
                    href={`/experiments/${exp.id}`}
                    className="flex items-center justify-between p-4 hover:bg-muted/40 border-l-2 border-l-transparent hover:border-l-primary transition-all"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-primary">{exp.name}</div>
                      <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs">{format(parseISO(exp.date), "MMM d, yyyy")}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{exp.assay_type}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="font-mono text-xs">{exp.instrument}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      <AnimatePresence>
                        {hoveredId === exp.id && (
                          <motion.div
                            className="flex items-center gap-1"
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 8 }}
                            transition={{ duration: 0.15 }}
                          >
                            <Link
                              href={`/experiments/${exp.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                              title="View"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                            <Link
                              href={`/experiments/${exp.id}/edit`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <StatusBadge status={exp.status} />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
