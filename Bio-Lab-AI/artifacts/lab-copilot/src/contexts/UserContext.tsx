/**
 * UserContext — provides current user data to the entire app.
 *
 * Two providers:
 *   - <DemoUserProvider>   when VITE_CLERK_PUBLISHABLE_KEY is not set
 *   - <ClerkUserProvider>  wraps Clerk hooks; must live inside <ClerkProvider>
 *
 * Consume with: const user = useAppUser()
 */
import { createContext, useContext } from "react";

const APPROVED_ADMIN_EMAILS = new Set(
  (import.meta.env.VITE_ADMIN_EMAIL ?? "")
    .split(",")
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean),
);

export interface AppUser {
  displayName: string;
  initials: string;
  email: string;
  isAdmin: boolean;
  isLoaded: boolean;
  signOut: () => void;
}

const DEMO_USER: AppUser = {
  displayName: "Demo User",
  initials: "DU",
  email: "demo@labcopilot.app",
  isAdmin: import.meta.env.VITE_ENABLE_DEMO_ADMIN === "true",
  isLoaded: true,
  signOut: () => {},
};

const UserContext = createContext<AppUser>(DEMO_USER);

export function useAppUser(): AppUser {
  return useContext(UserContext);
}

export function DemoUserProvider({ children }: { children: React.ReactNode }) {
  return <UserContext.Provider value={DEMO_USER}>{children}</UserContext.Provider>;
}

// ── Clerk variant — only render this inside <ClerkProvider> ──────────────────
// We import Clerk hooks lazily here so the file is safe to import anywhere.
// The hooks themselves are only called at runtime when this component mounts,
// which only happens when ClerkProvider is in the tree.
import { useUser, useClerk } from "@clerk/react";

export function ClerkUserProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    "";
  const firstName = user?.firstName ?? "";
  const lastName = user?.lastName ?? "";
  const displayName =
    firstName || email.split("@")[0] || "Researcher";
  const initials =
    ((firstName[0] ?? "") + (lastName[0] ?? "")).toUpperCase() ||
    displayName[0]?.toUpperCase() ||
    "R";
  const isAdmin = APPROVED_ADMIN_EMAILS.has(email.trim().toLowerCase());

  const value: AppUser = {
    displayName,
    initials,
    email,
    isAdmin,
    isLoaded,
    signOut: () => signOut({ redirectUrl: "/" }),
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
