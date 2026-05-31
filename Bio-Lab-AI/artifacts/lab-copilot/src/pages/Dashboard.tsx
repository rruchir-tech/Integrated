import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetDashboard, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Activity, Beaker, AlertTriangle, CheckCircle2, TrendingUp, Clock, FlaskConical, Microscope, Upload, BookOpen, BrainCircuit, ChevronRight, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Link, useLocation } from "wouter";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import { AskAnythingChat } from "@/components/dashboard/AskAnythingChat";
import { Badge } from "@/components/ui/badge";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

// ─────────────────────────────────────────────────────────────
//  Onboarding empty state — shown when user has 0 experiments
// ─────────────────────────────────────────────────────────────

const steps = [
  {
    icon: Upload,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    title: "Upload your first data file",
    body: "Drag in a plate reader export, qPCR file, NanoDrop CSV — any instrument output. Lab Copilot parses it automatically.",
  },
  {
    icon: BrainCircuit,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    title: "AI analyzes the results",
    body: "Gemini 2.5 reads your raw data, calculates statistics, flags anomalies, and writes a plain-language summary.",
  },
  {
    icon: Sparkles,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    title: "Get actionable next steps",
    body: "Your copilot remembers every experiment and learns your research direction — then tells you exactly what to run next.",
  },
];

function OnboardingEmptyState() {
  const [, navigate] = useLocation();

  return (
    <motion.div
      className="min-h-[70vh] flex flex-col items-center justify-center py-16 px-4"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Hero */}
      <div className="text-center max-w-xl mb-12">
        <motion.div
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
        >
          <FlaskConical className="h-10 w-10 text-primary" />
        </motion.div>

        <motion.h1
          className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          Your lab's second brain starts here
        </motion.h1>

        <motion.p
          className="text-muted-foreground text-base sm:text-lg leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Lab Copilot remembers every experiment, quantifies your data across instruments,
          and tells you what to run next — so you spend less time in spreadsheets and more time discovering.
        </motion.p>
      </div>

      {/* Steps */}
      <div className="grid gap-4 sm:grid-cols-3 w-full max-w-3xl mb-10">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.1, type: "spring", stiffness: 180, damping: 20 }}
          >
            <Card className="h-full border border-border/60 hover:border-primary/40 transition-all hover:shadow-sm">
              <CardContent className="pt-6 space-y-3">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${step.bg}`}>
                  <step.icon className={`h-5 w-5 ${step.color}`} />
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">
                    <span className="text-muted-foreground font-mono mr-1">{i + 1}.</span>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.body}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* CTAs */}
      <motion.div
        className="flex flex-col sm:flex-row gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <Button
          size="lg"
          className="gap-2 font-semibold px-6"
          onClick={() => navigate("/experiments/new")}
        >
          <Upload className="h-4 w-4" />
          Upload your first experiment
          <ChevronRight className="h-4 w-4 opacity-70" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="gap-2"
          onClick={() => navigate("/templates")}
        >
          <BookOpen className="h-4 w-4" />
          Browse templates
        </Button>
      </motion.div>

      {/* Supported instruments hint */}
      <motion.p
        className="mt-8 text-xs text-muted-foreground text-center max-w-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        Supports Synergy H1, SpectraMax, Bio-Rad CFX96, QuantStudio, NanoDrop, Countess, BD FACS, and more.
      </motion.p>
    </motion.div>
  );
}

function AnimatedCounter({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { stiffness: 100, damping: 30 });
  const displayValue = useTransform(springValue, (current) => Math.round(current));

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return <motion.span>{displayValue}</motion.span>;
}

export function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard({
    query: { queryKey: getGetDashboardQueryKey() }
  });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  // Show onboarding for brand-new users
  if (dashboard.total_experiments === 0) {
    return <OnboardingEmptyState />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Good {greeting} — here’s your lab snapshot.</p>
        </div>
        <Badge variant="outline" className="font-mono">Personalized</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Total Experiments",
            value: dashboard.total_experiments,
            icon: Activity,
            color: "text-muted-foreground",
            sub: null
          },
          {
            title: "Success Rate",
            value: dashboard.total_experiments > 0 ? Math.round(((dashboard.by_status['success'] || 0) / dashboard.total_experiments) * 100) : 0,
            icon: CheckCircle2,
            color: "text-emerald-400",
            sub: `${dashboard.by_status['success'] || 0} successful`,
            suffix: "%"
          },
          {
            title: "Failed",
            value: dashboard.by_status['failed'] || 0,
            icon: AlertTriangle,
            color: "text-red-400",
            sub: null
          },
          {
            title: "In Progress",
            value: dashboard.by_status['in_progress'] || 0,
            icon: Beaker,
            color: "text-cyan-400",
            sub: null
          }
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, type: "spring", stiffness: 200, damping: 20 }}
          >
            <Card className="hover:border-l-2 hover:border-l-primary dark:hover:shadow-[0_0_20px_rgba(0,245,255,0.08)] transition-all h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">
                  <AnimatedCounter value={stat.value} />
                  {stat.suffix}
                </div>
                {stat.sub && (
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {stat.sub}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <motion.div 
          className="col-span-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full hover:border-l-2 hover:border-l-primary dark:hover:shadow-[0_0_20px_rgba(0,245,255,0.08)] transition-all overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <CardHeader>
              <CardTitle>Experiments Over Time</CardTitle>
            </CardHeader>
            <CardContent className="pl-0">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboard.experiments_by_date} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => format(parseISO(val), 'MMM d')}
                      className="text-xs font-mono" 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis className="text-xs font-mono" tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
                      labelFormatter={(val) => format(parseISO(val as string), 'MMM d, yyyy')}
                    />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--background))" }} activeDot={{ r: 6, fill: "hsl(var(--primary))" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          className="col-span-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="h-full hover:border-l-2 hover:border-l-primary dark:hover:shadow-[0_0_20px_rgba(0,245,255,0.08)] transition-all overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
            <CardHeader>
              <CardTitle>Assay Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboard.assay_type_breakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="assay_type"
                      stroke="none"
                    >
                      {dashboard.assay_type_breakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-4 justify-center mt-4">
                {dashboard.assay_type_breakdown.map((item, i) => (
                  <div key={item.assay_type} className="flex items-center gap-2 text-sm font-mono">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="font-medium">{item.assay_type}</span>
                    <span className="text-muted-foreground">({item.count})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="hover:border-l-2 hover:border-l-primary dark:hover:shadow-[0_0_20px_rgba(0,245,255,0.08)] transition-all overflow-hidden">
          <CardHeader>
            <CardTitle>Recent Experiments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboard.recent_experiments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No experiments yet. <Link href="/experiments/new" className="text-primary hover:underline">Create one</Link>.
                </div>
              ) : (
                dashboard.recent_experiments.map((exp, idx) => (
                  <motion.div 
                    key={exp.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + idx * 0.05 }}
                  >
                    <div className="space-y-1">
                      <Link href={`/experiments/${exp.id}`} className="font-medium hover:underline text-primary text-lg">
                        {exp.name}
                      </Link>
                      <div className="flex items-center text-xs text-muted-foreground gap-3 font-mono">
                        <span>{format(parseISO(exp.date), 'MMM d, yyyy')}</span>
                        <span>•</span>
                        <span>{exp.assay_type}</span>
                        <span>•</span>
                        <span>{exp.instrument}</span>
                      </div>
                    </div>
                    <div>
                      <StatusBadge status={exp.status} />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="hover:border-l-2 hover:border-l-primary dark:hover:shadow-[0_0_20px_rgba(0,245,255,0.08)] transition-all h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Activity Timeline
              </CardTitle>
              <span className="text-xs text-muted-foreground font-mono">Last 5 runs</span>
            </CardHeader>
            <CardContent>
              {dashboard.recent_experiments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No activity yet.
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
                  <div className="space-y-4">
                    {dashboard.recent_experiments.slice(0, 5).map((exp, idx) => {
                      const statusColor =
                        exp.status === "success" ? "bg-emerald-500" :
                        exp.status === "failed" ? "bg-red-500" :
                        exp.status === "in_progress" ? "bg-cyan-400" :
                        "bg-muted-foreground";
                      const StatusIcon =
                        exp.status === "success" ? CheckCircle2 :
                        exp.status === "failed" ? AlertTriangle :
                        exp.status === "in_progress" ? TrendingUp :
                        Activity;
                      return (
                        <motion.div
                          key={exp.id}
                          className="flex items-start gap-4 pl-1"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.7 + idx * 0.07 }}
                        >
                          <div className={`relative z-10 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${statusColor} shadow-sm`}>
                            <StatusIcon className="h-3 w-3 text-white" />
                          </div>
                          <div className="flex-1 min-w-0 pb-2">
                            <Link href={`/experiments/${exp.id}`} className="text-sm font-medium hover:text-primary transition-colors truncate block">
                              {exp.name}
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground font-mono">{format(parseISO(exp.date), "MMM d")}</span>
                              <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{exp.assay_type}</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <Card className="hover:border-l-2 hover:border-l-primary dark:hover:shadow-[0_0_20px_rgba(0,245,255,0.08)] transition-all h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2">
                <Microscope className="h-4 w-4 text-primary" />
                Instrument Usage
              </CardTitle>
              <span className="text-xs text-muted-foreground font-mono">All time</span>
            </CardHeader>
            <CardContent>
              {dashboard.recent_experiments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No data yet.</div>
              ) : (() => {
                const counts: Record<string, number> = {};
                dashboard.recent_experiments.forEach(e => {
                  counts[e.instrument] = (counts[e.instrument] || 0) + 1;
                });
                const total = Object.values(counts).reduce((a, b) => a + b, 0);
                return (
                  <div className="space-y-3">
                    {Object.entries(counts)
                      .sort(([,a],[,b]) => b - a)
                      .map(([instrument, count], idx) => (
                      <motion.div key={instrument} className="space-y-1"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.75 + idx * 0.06 }}
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-mono text-xs truncate">{instrument}</span>
                          <span className="text-muted-foreground font-mono text-xs">{count}/{total}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className="h-full bg-primary rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(count / total) * 100}%` }}
                            transition={{ delay: 0.8 + idx * 0.06, duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="pt-2">
        <AskAnythingChat />
      </div>
    </div>
  );
}
