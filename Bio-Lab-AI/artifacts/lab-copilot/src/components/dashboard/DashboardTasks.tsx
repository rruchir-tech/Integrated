import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiFetch } from "@/lib/apiFetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface Task {
  id: number;
  experiment_id: number;
  title: string;
  status: string;
  priority: string;
  owner_name: string | null;
  due_date: string | null;
}

const PRIORITY_TONE: Record<string, string> = {
  high: "border-red-500/40 text-red-500",
  medium: "border-yellow-500/40 text-yellow-600",
  low: "border-muted-foreground/30 text-muted-foreground",
};

// Tasks used to be a standalone nav page; they now live on the dashboard so open
// work is visible at a glance. Fetches all tasks and shows the open ones. Fails
// quietly (no error card) so a tasks hiccup never blocks the dashboard.
export function DashboardTasks() {
  const { data, isLoading, isError } = useQuery<Task[]>({
    queryKey: ["tasks", "dashboard"],
    queryFn: () => apiFetch("/api/tasks").then((r) => {
      if (!r.ok) throw new Error("Failed to load tasks");
      return r.json();
    }),
  });

  const openTasks = Array.isArray(data)
    ? data.filter((t) => t.status !== "done" && t.status !== "completed")
    : [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
      <Card className="hover:border-l-2 hover:border-l-primary transition-all h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Open Tasks
          </CardTitle>
          {openTasks.length > 0 && (
            <Badge variant="outline" className="font-mono text-xs">{openTasks.length}</Badge>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : isError || openTasks.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No open tasks. Tasks you create on an experiment show up here.
            </div>
          ) : (
            <div className="space-y-2">
              {openTasks.slice(0, 6).map((task) => (
                <Link
                  key={task.id}
                  href={`/experiments/${task.experiment_id}`}
                  className="group flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{task.title}</div>
                    {task.due_date && (
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">due {task.due_date}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className={`text-[10px] ${PRIORITY_TONE[task.priority] ?? PRIORITY_TONE.low}`}>
                      {task.priority}
                    </Badge>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
