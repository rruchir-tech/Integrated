import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Command } from "cmdk";
import { useListExperiments, getListExperimentsQueryKey } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Beaker,
  Plus,
  GitCompare,
  Search,
  FlaskConical,
  ArrowRight,
  Keyboard,
} from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, navigate] = useLocation();

  const { data: experiments } = useListExperiments(undefined, {
    query: { queryKey: getListExperimentsQueryKey() },
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const go = useCallback(
    (path: string) => {
      navigate(path);
      setOpen(false);
      setQuery("");
    },
    [navigate]
  );

  const filteredExperiments = Array.isArray(experiments)
    ? experiments.filter((e) =>
        e.name.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="palette"
            className="fixed left-1/2 top-[20vh] z-50 w-full max-w-lg -translate-x-1/2"
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <Command
              className="rounded-xl border border-border bg-background shadow-2xl dark:shadow-[0_0_40px_rgba(0,245,255,0.15)] overflow-hidden"
              shouldFilter={false}
            >
              <div className="flex items-center border-b border-border px-4 py-3 gap-3">
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search experiments, navigate, or run actions..."
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                  autoFocus
                />
                <kbd className="pointer-events-none hidden sm:flex items-center gap-1 rounded border border-border px-1.5 text-[10px] font-mono text-muted-foreground">
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-[360px] overflow-y-auto py-2">
                <Command.Empty className="py-10 text-center text-sm text-muted-foreground">
                  No results for &ldquo;{query}&rdquo;
                </Command.Empty>

                <Command.Group heading="Navigation" className="px-2">
                  <PaletteItem
                    icon={<LayoutDashboard className="h-4 w-4" />}
                    label="Go to Dashboard"
                    shortcut="G D"
                    onSelect={() => go("/dashboard")}
                  />
                  <PaletteItem
                    icon={<Beaker className="h-4 w-4" />}
                    label="Go to Experiments"
                    shortcut="G E"
                    onSelect={() => go("/experiments")}
                  />
                  <PaletteItem
                    icon={<GitCompare className="h-4 w-4" />}
                    label="Compare Experiments"
                    shortcut="G C"
                    onSelect={() => go("/experiments/compare")}
                  />
                  <PaletteItem
                    icon={<Plus className="h-4 w-4 text-primary" />}
                    label="New Experiment"
                    shortcut="N"
                    onSelect={() => go("/experiments/new")}
                  />
                </Command.Group>

                {filteredExperiments && filteredExperiments.length > 0 && (
                  <Command.Group heading="Experiments" className="px-2 mt-1">
                    {filteredExperiments.slice(0, 6).map((exp) => (
                      <PaletteItem
                        key={exp.id}
                        icon={<FlaskConical className="h-4 w-4 text-cyan-400" />}
                        label={exp.name}
                        sub={`${exp.assay_type} · ${exp.status}`}
                        onSelect={() => go(`/experiments/${exp.id}`)}
                      />
                    ))}
                  </Command.Group>
                )}
              </Command.List>

              <div className="border-t border-border px-4 py-2 flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                <span className="flex items-center gap-1"><kbd className="border border-border rounded px-1">↑↓</kbd> navigate</span>
                <span className="flex items-center gap-1"><kbd className="border border-border rounded px-1">↵</kbd> select</span>
                <span className="flex items-center gap-1"><kbd className="border border-border rounded px-1">ESC</kbd> close</span>
              </div>
            </Command>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function PaletteItem({
  icon,
  label,
  sub,
  shortcut,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  shortcut?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer hover:bg-muted aria-selected:bg-muted transition-colors group"
    >
      <span className="text-muted-foreground group-aria-selected:text-primary transition-colors">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{label}</div>
        {sub && <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{sub}</div>}
      </div>
      {shortcut && (
        <kbd className="pointer-events-none hidden sm:flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground">
          {shortcut.split(" ").map((k, i) => (
            <span key={i} className="border border-border rounded px-1">{k}</span>
          ))}
        </kbd>
      )}
      <ArrowRight className="h-3 w-3 text-muted-foreground/50 group-aria-selected:text-primary transition-colors flex-shrink-0" />
    </Command.Item>
  );
}

export function CommandPaletteTrigger() {
  return (
    <button
      onClick={() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
        );
      }}
      className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-muted/50 hover:bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors"
      aria-label="Open command palette"
    >
      <Keyboard className="h-3.5 w-3.5" />
      <span>Search & Navigate</span>
      <kbd className="flex items-center gap-0.5 font-mono ml-1 opacity-60">
        <span className="text-[10px]">⌘K</span>
      </kbd>
    </button>
  );
}
