import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { ExperimentList } from "@/pages/ExperimentList";
import { ExperimentDetail } from "@/pages/ExperimentDetail";
import { ExperimentForm } from "@/pages/ExperimentForm";
import { ExperimentEdit } from "@/pages/ExperimentEdit";
import { ExperimentCompare } from "@/pages/ExperimentCompare";
import { DataAnalysisPage } from "@/pages/DataAnalysisPage";
import { AdminPage } from "@/pages/AdminPage";
import { LandingPage } from "@/pages/LandingPage";
import { TemplatesPage } from "@/pages/TemplatesPage";
import { TasksPage } from "@/pages/TasksPage";
import { motion, AnimatePresence } from "framer-motion";
import { CommandPalette } from "@/components/CommandPalette";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DemoUserProvider, ClerkUserProvider } from "@/contexts/UserContext";
import { setBaseUrl } from "@workspace/api-client-react";

// ── API base URL ─────────────────────────────────────────────────────────────
// When frontend and API are on different origins (Vercel + Render),
// set VITE_API_URL to the Render service URL, e.g. https://lab-copilot-api.onrender.com
const apiUrl = import.meta.env.VITE_API_URL;
if (apiUrl) setBaseUrl(apiUrl);

// ── Auth mode ─────────────────────────────────────────────────────────────────
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const DEMO_MODE = !clerkPubKey;

const basePath = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function AnimatedRoute({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
    >
      {children}
    </motion.div>
  );
}

function ShortcutHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Press ⌘K / Ctrl+K to open search.</p>
      </DialogContent>
    </Dialog>
  );
}

function useGlobalKeyboardShortcuts(setHelpOpen: (open: boolean) => void) {
  const toastRef = useRef<HTMLDivElement | null>(null);
  const gPendingRef = useRef(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setHelpOpen]);
  return { toastRef, gPendingRef };
}

// ── Shared route tree (used by both demo and Clerk mode) ─────────────────────
function AppRoutes({ isAdmin }: { isAdmin: boolean }) {
  const [helpOpen, setHelpOpen] = useState(false);
  useGlobalKeyboardShortcuts(setHelpOpen);

  return (
    <>
      <ShortcutHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <Switch>
        <Route path="/" component={() => <Redirect to="/dashboard" />} />
        <Route path="/dashboard">
          <Layout><AnimatedRoute><Dashboard /></AnimatedRoute></Layout>
        </Route>
        <Route path="/experiments/compare">
          <Layout><AnimatedRoute><ExperimentCompare /></AnimatedRoute></Layout>
        </Route>
        <Route path="/experiments/new">
          <Layout><AnimatedRoute><ExperimentForm /></AnimatedRoute></Layout>
        </Route>
        <Route path="/experiments/:id/edit">
          <Layout><AnimatedRoute><ExperimentEdit /></AnimatedRoute></Layout>
        </Route>
        <Route path="/experiments/:id">
          <Layout><AnimatedRoute><ExperimentDetail /></AnimatedRoute></Layout>
        </Route>
        <Route path="/experiments">
          <Layout><AnimatedRoute><ExperimentList /></AnimatedRoute></Layout>
        </Route>
        <Route path="/data-analysis">
          <Layout><AnimatedRoute><DataAnalysisPage /></AnimatedRoute></Layout>
        </Route>
        <Route path="/templates">
          <Layout><AnimatedRoute><TemplatesPage /></AnimatedRoute></Layout>
        </Route>
        <Route path="/tasks">
          <Layout><AnimatedRoute><TasksPage /></AnimatedRoute></Layout>
        </Route>
        <Route path="/admin">
          {isAdmin
            ? <Layout><AnimatedRoute><AdminPage /></AnimatedRoute></Layout>
            : <Redirect to="/dashboard" />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

// ── Demo mode (no Clerk) ──────────────────────────────────────────────────────
function DemoApp() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <QueryClientProvider client={queryClient}>
            <DemoUserProvider>
              <CommandPalette />
              <AppRoutes isAdmin={true} />
            </DemoUserProvider>
          </QueryClientProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}

// ── Clerk mode ────────────────────────────────────────────────────────────────
// All Clerk imports are isolated here — never imported when DEMO_MODE is true.
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { useAppUser } from "@/contexts/UserContext";

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#00f5ff",
    colorForeground: "#d5e8f7",
    colorMutedForeground: "#658fb0",
    colorDanger: "#ef4444",
    colorBackground: "#0c1520",
    colorInput: "#111e2e",
    colorInputForeground: "#d5e8f7",
    colorNeutral: "#182233",
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#182233] bg-[#0c1520] shadow-2xl shadow-black/50",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#d5e8f7] font-semibold",
    headerSubtitle: "text-[#658fb0]",
    socialButtonsBlockButtonText: "text-[#d5e8f7] font-medium",
    formFieldLabel: "text-[#658fb0] text-sm",
    footerActionLink: "text-[#00f5ff] hover:text-[#00f5ff]/80 font-medium",
  },
};

function ClerkQueryCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);
  return null;
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={`${basePath}/dashboard`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} fallbackRedirectUrl={`${basePath}/dashboard`} />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/dashboard" /></Show>
      <Show when="signed-out"><LandingPage /></Show>
    </>
  );
}

function ClerkAppRoutes() {
  const [helpOpen, setHelpOpen] = useState(false);
  useGlobalKeyboardShortcuts(setHelpOpen);
  const { isAdmin } = useAppUser();

  return (
    <>
      <ShortcutHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/dashboard">
          <Show when="signed-in"><Layout><AnimatedRoute><Dashboard /></AnimatedRoute></Layout></Show>
          <Show when="signed-out"><Redirect to="/" /></Show>
        </Route>
        <Route path="/experiments/compare">
          <Show when="signed-in"><Layout><AnimatedRoute><ExperimentCompare /></AnimatedRoute></Layout></Show>
          <Show when="signed-out"><Redirect to="/" /></Show>
        </Route>
        <Route path="/experiments/new">
          <Show when="signed-in"><Layout><AnimatedRoute><ExperimentForm /></AnimatedRoute></Layout></Show>
          <Show when="signed-out"><Redirect to="/" /></Show>
        </Route>
        <Route path="/experiments/:id/edit">
          <Show when="signed-in"><Layout><AnimatedRoute><ExperimentEdit /></AnimatedRoute></Layout></Show>
          <Show when="signed-out"><Redirect to="/" /></Show>
        </Route>
        <Route path="/experiments/:id">
          <Show when="signed-in"><Layout><AnimatedRoute><ExperimentDetail /></AnimatedRoute></Layout></Show>
          <Show when="signed-out"><Redirect to="/" /></Show>
        </Route>
        <Route path="/experiments">
          <Show when="signed-in"><Layout><AnimatedRoute><ExperimentList /></AnimatedRoute></Layout></Show>
          <Show when="signed-out"><Redirect to="/" /></Show>
        </Route>
        <Route path="/data-analysis">
          <Show when="signed-in"><Layout><AnimatedRoute><DataAnalysisPage /></AnimatedRoute></Layout></Show>
          <Show when="signed-out"><Redirect to="/" /></Show>
        </Route>
        <Route path="/templates">
          <Show when="signed-in"><Layout><AnimatedRoute><TemplatesPage /></AnimatedRoute></Layout></Show>
          <Show when="signed-out"><Redirect to="/" /></Show>
        </Route>
        <Route path="/tasks">
          <Show when="signed-in"><Layout><AnimatedRoute><TasksPage /></AnimatedRoute></Layout></Show>
          <Show when="signed-out"><Redirect to="/" /></Show>
        </Route>
        <Route path="/admin">
          {isAdmin
            ? <Layout><AnimatedRoute><AdminPage /></AnimatedRoute></Layout>
            : <Redirect to="/dashboard" />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function ClerkApp() {
  const [, setLocation] = useLocation();
  function stripBase(path: string): string {
    return basePath && path.startsWith(basePath)
      ? path.slice(basePath.length) || "/"
      : path;
  }
  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      signInFallbackRedirectUrl={`${basePath}/dashboard`}
      signUpFallbackRedirectUrl={`${basePath}/dashboard`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryCacheInvalidator />
        <ClerkUserProvider>
          <CommandPalette />
          <ClerkAppRoutes />
        </ClerkUserProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
function App() {
  if (DEMO_MODE) return <DemoApp />;

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ClerkApp />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
