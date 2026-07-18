import { motion } from "framer-motion";
import { Activity, ArrowUpRight, Sparkles, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type LabAccent = "cyan" | "violet" | "emerald" | "amber" | "rose";

export function LabPageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  accent = "cyan",
  status = "System ready",
  actions,
  aside,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: LabAccent;
  status?: string;
  actions?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      className={cn("lab-page-header", className)}
      data-accent={accent}
      initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="lab-page-header-grid" aria-hidden="true" />
      <div className="lab-page-header-glow" aria-hidden="true" />
      <div className="relative z-10 grid min-h-[240px] gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:p-10">
        <div className="flex min-w-0 flex-col justify-between">
          <div>
            <div className="lab-kicker">
              <span className="lab-kicker-pulse" />
              {eyebrow}
              <span className="lab-kicker-rule" />
              <span className="text-foreground/55">{status}</span>
            </div>
            <h1 className="mt-6 max-w-4xl text-balance text-[clamp(2.35rem,5vw,5.2rem)] font-semibold leading-[0.92] tracking-[-0.065em]">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              {description}
            </p>
          </div>
          {actions && <div className="mt-7 flex flex-wrap items-center gap-3">{actions}</div>}
        </div>

        <div className="relative hidden items-center justify-center lg:flex">
          {aside ?? (
            <div className="lab-orbit" aria-hidden="true">
              <span className="lab-orbit-ring lab-orbit-ring-one" />
              <span className="lab-orbit-ring lab-orbit-ring-two" />
              <span className="lab-orbit-node lab-orbit-node-one" />
              <span className="lab-orbit-node lab-orbit-node-two" />
              <span className="lab-orbit-node lab-orbit-node-three" />
              <motion.span
                className="lab-orbit-core"
                animate={{ scale: [1, 1.06, 1], rotate: [0, 3, 0] }}
                transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <Icon className="h-9 w-9" />
              </motion.span>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

export function LabConversation({
  children,
  label = "Bioalyzer",
  accent = "cyan",
  action,
  className,
}: {
  children: ReactNode;
  label?: string;
  accent?: LabAccent;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={cn("lab-conversation", className)}
      data-accent={accent}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className="lab-conversation-icon"><Sparkles className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--lab-accent)]">{label}</p>
        <div className="mt-1 text-sm leading-6 text-foreground/78">{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
      <span className="lab-conversation-wave" aria-hidden="true"><i /><i /><i /><i /></span>
    </motion.div>
  );
}

export function LabMetric({
  label,
  value,
  detail,
  icon: Icon = Activity,
  accent = "cyan",
  index = 0,
  children,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: LucideIcon;
  accent?: LabAccent;
  index?: number;
  children?: ReactNode;
}) {
  return (
    <motion.div
      className="lab-metric"
      data-accent={accent}
      initial={{ opacity: 0, y: 16, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.08 + index * 0.055, duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">{value}</div>
          {detail && <p className="mt-2 text-xs text-muted-foreground">{detail}</p>}
        </div>
        <span className="lab-metric-icon"><Icon className="h-4 w-4" /></span>
      </div>
      {children}
      <span className="lab-metric-index">0{index + 1}</span>
    </motion.div>
  );
}

export function LabSectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="lab-kicker"><span className="lab-kicker-pulse" />{eyebrow}</div>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function LabPanel({
  children,
  className,
  accent = "cyan",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  accent?: LabAccent;
  interactive?: boolean;
}) {
  return (
    <div className={cn("lab-panel", interactive && "lab-panel-interactive", className)} data-accent={accent}>
      {children}
    </div>
  );
}

export function LabTextLink({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
      {children}<ArrowUpRight className="h-3.5 w-3.5" />
    </span>
  );
}
