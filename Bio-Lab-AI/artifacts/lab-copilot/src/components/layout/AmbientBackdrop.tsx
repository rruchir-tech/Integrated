import { motion } from "framer-motion";

export function AmbientBackdrop({ intensity = "subtle" }: { intensity?: "subtle" | "hero" }) {
  const hero = intensity === "hero";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className={`absolute inset-0 aurora-wash ${hero ? "opacity-90" : "opacity-55"}`} />
      <motion.div
        className={`ambient-orb -left-32 top-[8%] bg-cyan-400/20 blur-3xl ${hero ? "h-[30rem] w-[30rem]" : "h-80 w-80"}`}
        animate={{ x: [0, 38, -12, 0], y: [0, -22, 26, 0], scale: [1, 1.08, 0.98, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={`ambient-orb ambient-orb-secondary -right-28 top-[18%] bg-emerald-400/15 blur-3xl ${hero ? "h-[34rem] w-[34rem]" : "h-96 w-96"}`}
        animate={{ x: [0, -44, 18, 0], y: [0, 32, -18, 0], scale: [1, 0.95, 1.08, 1] }}
        transition={{ duration: 27, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="ambient-orb bottom-[-14rem] left-[35%] h-[28rem] w-[28rem] bg-violet-500/10 blur-3xl"
        animate={{ x: [0, 48, -28, 0], y: [0, -18, 8, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 app-noise-fine opacity-60" />
    </div>
  );
}
