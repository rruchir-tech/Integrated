import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

type StatusBadgeProps = {
  status: "success" | "failed" | "unknown" | "in_progress" | string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  let variant: "default" | "destructive" | "secondary" | "outline" = "default";
  let label = status;
  let className = "";
  let isPulse = false;

  switch (status) {
    case "success":
      variant = "outline";
      className = "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20";
      label = "Success";
      break;
    case "failed":
      variant = "outline";
      className = "text-red-400 bg-red-400/10 border border-red-400/20";
      label = "Failed";
      break;
    case "in_progress":
      variant = "outline";
      className = "text-cyan-400 bg-cyan-400/10 border border-cyan-400/20";
      label = "In Progress";
      isPulse = true;
      break;
    case "unknown":
    default:
      variant = "outline";
      className = "text-slate-400 bg-slate-400/10 border border-slate-400/20";
      label = "Unknown";
      break;
  }

  const badge = (
    <Badge variant={variant} className={`font-mono text-xs ${className}`}>
      {label}
    </Badge>
  );

  if (isPulse) {
    return (
      <motion.div
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        {badge}
      </motion.div>
    );
  }

  return badge;
}
