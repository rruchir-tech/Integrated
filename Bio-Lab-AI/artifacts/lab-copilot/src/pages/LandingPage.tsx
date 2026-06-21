import { Link } from "wouter";
import { motion } from "framer-motion";
import { Atom, Beaker, Brain, BarChart3, ArrowRight, Shield, Sparkles, CheckCircle2 } from "lucide-react";

const features = [
  {
    icon: <Beaker className="h-5 w-5" />,
    title: "Experiment Tracking",
    description: "Log, organize, and manage all your lab experiments in one place with rich metadata.",
  },
  {
    icon: <Brain className="h-5 w-5" />,
    title: "AI Analysis",
    description: "Get instant AI-powered insights and summaries for each experiment using Gemini.",
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Compare & Contrast",
    description: "Side-by-side experiment comparison with AI-driven synthesis of findings.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Secure & Private",
    description: "Your research stays yours — secured per account with enterprise-grade auth.",
  },
];

const stats = [
  "Built for bench scientists",
  "Designed for fast onboarding",
  "Ready for teams and labs",
];

const socialProof = [
  "Track every run",
  "Summarize results faster",
  "Share insights instantly",
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Atom className="h-5 w-5 text-primary" />
              <motion.div
                className="absolute w-1.5 h-1.5 bg-primary rounded-full"
                style={{ bottom: -2, right: -2 }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            </div>
            <span className="font-semibold text-base tracking-wide">Bioalyzer</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-sm bg-primary text-primary-foreground font-medium px-4 py-1.5 rounded-md hover:opacity-90 transition-opacity"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative py-24 px-6 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
          </div>
          <div className="relative max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary mb-8">
                <Sparkles className="h-3.5 w-3.5" />
                AI-powered lab assistant
              </div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight max-w-4xl mx-auto">
                Turn raw lab data into <span className="text-primary">publishable insight</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
                Track experiments, analyze results, and collaborate with AI in one workspace built for modern biotech teams.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                >
                  Start for free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-2 border border-border text-foreground font-medium px-6 py-3 rounded-lg hover:bg-muted transition-colors"
                >
                  Sign in
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
                {stats.map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-12 px-6 border-y border-border/60 bg-muted/20">
          <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            {socialProof.map((item) => (
              <span key={item} className="rounded-full border border-border bg-background px-4 py-2">
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Everything you need for modern research
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                  className="rounded-xl border border-border bg-card p-6 space-y-3"
                >
                  <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-2 items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Atom className="h-3.5 w-3.5 text-primary" />
            <span>Bioalyzer</span>
          </div>
          <span>Built for scientists, powered by AI</span>
        </div>
      </footer>
    </div>
  );
}
