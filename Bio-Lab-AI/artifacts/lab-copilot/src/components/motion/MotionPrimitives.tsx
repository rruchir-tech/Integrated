import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

export const easeOutExpo = [0.16, 1, 0.3, 1] as const;

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.075, delayChildren: 0.06 },
  },
};

export const riseItem: Variants = {
  hidden: { opacity: 0, y: 22, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: easeOutExpo },
  },
};

export function Reveal({
  children,
  className,
  delay = 0,
  amount = 0.25,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  amount?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.72, delay, ease: easeOutExpo }}
    >
      {children}
    </motion.div>
  );
}
export function HoverLift({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -5, scale: 1.008 }}
      whileTap={{ scale: 0.992 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
    >
      {children}
    </motion.div>
  );
}
