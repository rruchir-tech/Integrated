import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Atom,
  BarChart3,
  Beaker,
  Brain,
  CheckCircle2,
  FlaskConical,
  Shield,
  Sparkles,
} from "lucide-react";

const plateWells = Array.from({ length: 96 }, (_, index) => {
  const col = index % 12;
  const row = Math.floor(index / 12);
  const edge = row === 0 || row === 7 || col === 0 || col === 11;
  const active = [14, 15, 26, 27, 39, 51, 63, 74, 75, 86].includes(index);
  const warn = [21, 34, 58, 70].includes(index);
  return { index, edge, active, warn };
});

const features = [
  {
    icon: Beaker,
    label: "Run history",
    value: "Every protocol, plate, note, and status in one traceable record.",
  },
  {
    icon: BarChart3,
    label: "Assay analysis",
    value: "Control stats, dose response, QC flags, and readable summaries.",
  },
  {
    icon: Brain,
    label: "Grounded copilot",
    value: "Gemini-backed answers that cite your experiments instead of guessing.",
  },
  {
    icon: Shield,
    label: "Account isolation",
    value: "Per-user data boundaries when Clerk and the API are configured.",
  },
];

const signals = [42, 64, 38, 76, 51, 88, 57, 69, 45, 81, 62, 93];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/35 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 md:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-white">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-white/10">
              <Atom className="h-4 w-4 text-cyan-200" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(52,211,153,.9)]" />
            </span>
            <span className="font-semibold tracking-wide">Bioalyzer</span>
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="rounded-md px-3 py-2 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-cyan-50"
            >
              Start
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative min-h-[92svh] overflow-hidden">
          <img
            src="/lab-hero.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,.88)_0%,rgba(2,6,23,.68)_42%,rgba(2,6,23,.18)_100%)]" />
          <div className="absolute inset-0 app-noise opacity-20" />

          <div className="relative z-10 mx-auto grid min-h-[92svh] max-w-7xl content-center gap-10 px-5 pb-16 pt-28 md:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.62fr)] md:px-8">
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="max-w-3xl"
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-cyan-100 shadow-lg shadow-black/10 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
                Bench data, context, and AI review in one workspace
              </div>

              <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-normal text-white md:text-7xl">
                Bioalyzer for assay teams who need answers, not another spreadsheet.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 md:text-xl">
                Upload plate-reader or experiment data, keep the project trail intact,
                and ask a copilot that reads the runs already in your lab.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 rounded-md bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 shadow-xl shadow-cyan-950/25 transition hover:-translate-y-0.5 hover:bg-cyan-200"
                >
                  Open the lab workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-2 rounded-md border border-white/[0.18] bg-white/[0.08] px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/[0.14]"
                >
                  Continue work
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-200">
                {["Synergy H1 parsing", "Project-level synthesis", "Clerk-ready auth"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-md border border-white/[0.12] bg-black/20 px-3 py-2 backdrop-blur-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 22 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.18, duration: 0.55, ease: "easeOut" }}
              className="hidden md:block"
            >
              <div className="surface-panel lab-scan rounded-lg border-white/[0.12] bg-slate-950/[0.74] p-4 text-white shadow-2xl backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-white/[0.45]">Live assay review</p>
                    <p className="font-semibold">H1 viability plate</p>
                  </div>
                  <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-xs font-medium text-emerald-200">
                    Streaming
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-1.5">
                  {plateWells.map((well) => (
                    <motion.span
                      key={well.index}
                      className={`aspect-square rounded-[3px] ${
                        well.warn
                          ? "bg-amber-300"
                          : well.active
                            ? "bg-emerald-300"
                            : well.edge
                              ? "bg-cyan-300/[0.35]"
                              : "bg-cyan-300/60"
                      } ${well.active || well.warn ? "well-pulse" : ""}`}
                      animate={{ opacity: well.active || well.warn ? [0.72, 1, 0.72] : 0.62 }}
                      transition={{ delay: (well.index % 12) * 0.025, duration: 2.8, repeat: Infinity }}
                    />
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    ["Z prime", "0.61", "text-emerald-200"],
                    ["CV", "8.4%", "text-cyan-100"],
                    ["Flagged", "4 wells", "text-amber-200"],
                  ].map(([label, value, color]) => (
                    <div key={label} className="rounded-md border border-white/10 bg-white/[0.08] p-3">
                      <p className="text-[11px] uppercase text-white/[0.42]">{label}</p>
                      <p className={`mt-1 font-mono text-lg font-semibold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-md border border-white/10 bg-black/[0.24] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-white/50">Dose response signal</span>
                    <FlaskConical className="h-4 w-4 text-cyan-200" />
                  </div>
                  <div className="flex h-24 items-end gap-2">
                    {signals.map((height, index) => (
                      <span
                        key={index}
                        className="animated-bar flex-1 rounded-t-sm bg-cyan-300/80"
                        style={{ height: `${height}%`, animationDelay: `${index * 0.12}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="-mt-8 px-5 pb-20 md:px-8">
          <div className="relative z-20 mx-auto grid max-w-7xl gap-3 md:grid-cols-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ delay: index * 0.06, duration: 0.42 }}
                className="surface-panel rounded-lg p-5"
              >
                <feature.icon className="mb-4 h-5 w-5 text-primary" />
                <h2 className="text-sm font-semibold">{feature.label}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.value}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
