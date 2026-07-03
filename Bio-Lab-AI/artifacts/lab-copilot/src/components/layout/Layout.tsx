import { Link, useLocation } from "wouter";
import { LayoutDashboard, Beaker, Plus, Atom, Sun, Moon, GitCompare, LogOut, User, BarChart3, BookTemplate, ClipboardList, FolderKanban } from "lucide-react";
import { useListExperiments, getListExperimentsQueryKey } from "@workspace/api-client-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CommandPaletteTrigger } from "@/components/CommandPalette";
import { useAppUser } from "@/contexts/UserContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: experiments } = useListExperiments(undefined, {
    query: { queryKey: getListExperimentsQueryKey() },
  });
  const { theme, setTheme } = useTheme();
  const resolvedTheme = theme ?? "dark";
  const [scrollProgress, setScrollProgress] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const { displayName, initials, email, isAdmin, isLoaded, signOut } = useAppUser();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const value = max > 0 ? (window.scrollY / max) * 100 : 0;
      setScrollProgress(Math.max(0, Math.min(100, value)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const playClick = () => {
    if (!soundEnabled) return;
    const audio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=");
    audio.volume = 0.05;
    audio.play().catch(() => undefined);
  };

  return (
    <PanelGroup direction="horizontal" className="h-screen w-full overflow-hidden bg-background app-noise">
      <Panel defaultSize={20} minSize={18} maxSize={30} className="relative flex min-w-[220px] max-w-[320px] flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.04),transparent_28%,rgba(0,0,0,.18))]" />
        <div className="h-14 flex items-center px-4 font-semibold text-lg border-b border-sidebar-border gap-2 relative z-10">
          <motion.div
            className="relative"
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          >
            <Atom className="h-5 w-5 text-sidebar-primary" />
          </motion.div>
          <span className="tracking-wide">Bioalyzer</span>
        </div>

        <div className="px-4 pt-4 pb-2 relative z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3 space-y-2 hover:bg-sidebar-accent/50 transition-colors text-left">
                <div className="flex items-center gap-2.5">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-sidebar-primary/20 border border-sidebar-primary/30 flex items-center justify-center text-[11px] font-bold text-sidebar-primary">
                    {isLoaded ? initials : "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{isLoaded ? displayName : greeting}</div>
                    <div className="text-xs text-sidebar-foreground/60 truncate">
                      {email}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-sidebar-foreground/60">
                  {Array.isArray(experiments) && experiments.length ? `${experiments.length} experiments tracked` : "No experiments yet"}
                </div>
                <Progress value={Math.min(100, (Array.isArray(experiments) ? experiments.length : 0) * 10)} className="h-1.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 cursor-pointer" disabled>
                <User className="h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="flex-1 overflow-hidden py-4 flex flex-col gap-6 relative z-10">
          <div className="px-3 flex flex-col gap-1">
            {[
              { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, shortcut: "G D", active: location === "/dashboard" || location === "/", count: null },
              { href: "/experiments", label: "Experiments", icon: <Beaker className="h-4 w-4" />, shortcut: "G E", active: location.startsWith("/experiments") && location !== "/experiments/new" && location !== "/experiments/compare", count: Array.isArray(experiments) ? experiments.length : null },
              { href: "/projects", label: "Projects", icon: <FolderKanban className="h-4 w-4" />, shortcut: "G P", active: location.startsWith("/projects"), count: null },
              { href: "/experiments/compare", label: "Compare", icon: <GitCompare className="h-4 w-4" />, shortcut: "G C", active: location === "/experiments/compare", count: null },
              { href: "/data-analysis", label: "Data Analysis", icon: <BarChart3 className="h-4 w-4" />, shortcut: "G A", active: location === "/data-analysis", count: null },
              { href: "/templates", label: "Templates", icon: <BookTemplate className="h-4 w-4" />, shortcut: "G T", active: location === "/templates", count: null },
              { href: "/tasks", label: "Tasks", icon: <ClipboardList className="h-4 w-4" />, shortcut: "G K", active: location === "/tasks", count: null },
            ].map(({ href, label, icon, shortcut, active, count }) => (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary"
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground border-l-2 border-transparent hover:border-sidebar-primary/50"
                }`}
                onClick={playClick}
              >
                {icon}
                <span className="flex-1">{label}</span>
                {count !== null && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-sidebar-accent text-sidebar-foreground/60 group-hover:hidden">
                    {count}
                  </span>
                )}
                <kbd className="hidden group-hover:flex items-center text-[9px] font-mono text-sidebar-foreground/40 border border-sidebar-border rounded px-1 py-0.5 gap-0.5">
                  {shortcut}
                </kbd>
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  location === "/admin"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary"
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground border-l-2 border-transparent hover:border-sidebar-primary/50"
                }`}
                onClick={playClick}
              >
                <User className="h-4 w-4" />
                <span className="flex-1">Admin</span>
              </Link>
            )}
          </div>

          <div className="px-3 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                Recent
              </span>
              <Link
                href="/experiments/new"
                className="text-sidebar-foreground/50 hover:text-sidebar-primary transition-colors"
                title="New Experiment"
              >
                <Plus className="h-4 w-4" />
              </Link>
            </div>
            <ScrollArea className="flex-1 -mx-3">
              <div className="px-3 flex flex-col gap-1">
                {Array.isArray(experiments) && experiments.slice(0, 10).map((exp, index) => (
                  <motion.div
                    key={exp.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={`/experiments/${exp.id}`}
                      className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                        location === `/experiments/${exp.id}`
                          ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary"
                          : "hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground border-l-2 border-transparent"
                      }`}
                      onClick={playClick}
                    >
                      <span className="truncate mr-2">{exp.name}</span>
                      <div className="flex-shrink-0 transform scale-75 origin-right">
                        <StatusBadge status={exp.status} />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </nav>
        
        <div className="p-4 border-t border-sidebar-border mt-auto relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-sidebar-foreground/45">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.9)]" />
            Workspace online
          </div>
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="p-2 rounded-full hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
            aria-label="Toggle theme"
          >
            <motion.div
              initial={false}
              animate={{ rotate: resolvedTheme === "dark" ? 0 : 180 }}
              transition={{ duration: 0.3 }}
            >
              {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </motion.div>
          </button>
        </div>
      </Panel>
      <PanelResizeHandle className="w-1 bg-sidebar-border hover:bg-primary/60 transition-colors cursor-col-resize relative group">
        <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-primary/20 dark:group- transition-all" />
      </PanelResizeHandle>
      <Panel className="flex flex-col min-w-0 overflow-hidden bg-background/95">
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between px-6 md:px-8 py-2 max-w-7xl mx-auto w-full gap-4">
              <div className="text-xs font-mono text-muted-foreground">
                {location.replace("/", "") || "dashboard"}
              </div>
              <div className="flex items-center gap-3">
                <CommandPaletteTrigger />
                <Progress value={scrollProgress} className="w-28 h-1.5" aria-label="Scroll progress" />
              </div>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-6 md:p-8 max-w-7xl mx-auto w-full min-h-full">
              {children}
            </div>
          </ScrollArea>
        </main>
      </Panel>
    </PanelGroup>
  );
}
