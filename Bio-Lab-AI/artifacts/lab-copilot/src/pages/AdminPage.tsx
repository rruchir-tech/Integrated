import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Shield, Users, Database, Ban, Flag, ClipboardList, Activity, Plus, Trash2 } from "lucide-react";
import { useUser } from "@clerk/react";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const normalizeEmail = (value: string) => value.trim().toLowerCase();

async function fetchJson(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function AdminPage() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const { user, isLoaded } = useUser();
  const currentEmail = useMemo(
    () =>
      normalizeEmail(user?.primaryEmailAddress?.emailAddress ?? "") ||
      normalizeEmail(user?.emailAddresses?.find((e) => e.verification?.status === "verified")?.emailAddress ?? "") ||
      normalizeEmail(user?.emailAddresses?.[0]?.emailAddress ?? "") ||
      "",
    [user],
  );

  const me = useQuery({
    queryKey: ["admin-me", currentEmail],
    enabled: isLoaded && !!currentEmail,
    queryFn: () => fetchJson("/api/admin/me", { headers: { "x-user-email": currentEmail } }),
  });
  const approvedEmail = me.data?.approved === true;
  const effectiveEmail = approvedEmail ? currentEmail : "";

  const stats = useQuery({
    queryKey: ["admin-stats", effectiveEmail],
    enabled: approvedEmail,
    queryFn: () => fetchJson("/api/admin/stats", { headers: { "x-user-email": effectiveEmail } }),
  });

  const suspend = useMutation({
    mutationFn: () => fetchJson("/api/admin/suspend", {
      method: "POST",
      headers: { "x-user-email": effectiveEmail },
      body: JSON.stringify({ email }),
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-stats"] }),
  });

  const addAdmin = useMutation({
    mutationFn: () => fetchJson("/api/admin/approved-admins", {
      method: "POST",
      headers: { "x-user-email": effectiveEmail },
      body: JSON.stringify({ email: adminEmail }),
    }),
    onSuccess: () => {
      setAdminEmail("");
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const removeAdmin = useMutation({
    mutationFn: (targetEmail: string) => fetchJson(`/api/admin/approved-admins/${encodeURIComponent(targetEmail)}`, {
      method: "DELETE",
      headers: { "x-user-email": effectiveEmail },
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-stats"] }),
  });

  if (!isLoaded) return <Skeleton className="h-96 w-full" />;
  if (me.isLoading) return <Skeleton className="h-96 w-full" />;
  if (!approvedEmail) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="pt-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Admin access required</p>
            <p className="text-sm text-muted-foreground">This panel is only available to approved admins.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stats.isLoading) return <Skeleton className="h-96 w-full" />;

  if (stats.isError) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="pt-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Admin access required</p>
            <p className="text-sm text-muted-foreground">This panel is only available to approved admins.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = stats.data as any;
  const moderation = data.moderation_summary ?? { flagged_accounts: 0, pending_reviews: 0, high_priority_alerts: 0 };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-3 border-b pb-5">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Site-wide stats, approved admins, and account controls.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><Users className="h-5 w-5 text-primary mb-2" /><div className="text-2xl font-bold">{data.total_experiments}</div><div className="text-sm text-muted-foreground">Total experiments</div></CardContent></Card>
        <Card><CardContent className="pt-6"><Database className="h-5 w-5 text-primary mb-2" /><div className="text-2xl font-bold">{data.approved_admins?.length ?? 0}</div><div className="text-sm text-muted-foreground">Approved admins</div></CardContent></Card>
        <Card><CardContent className="pt-6"><Ban className="h-5 w-5 text-primary mb-2" /><div className="text-2xl font-bold">{data.recent_experiments?.length ?? 0}</div><div className="text-sm text-muted-foreground">Recent experiments</div></CardContent></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><Flag className="h-5 w-5 text-primary mb-2" /><div className="text-2xl font-bold">{moderation.flagged_accounts}</div><div className="text-sm text-muted-foreground">Flagged accounts</div></CardContent></Card>
        <Card><CardContent className="pt-6"><ClipboardList className="h-5 w-5 text-primary mb-2" /><div className="text-2xl font-bold">{moderation.pending_reviews}</div><div className="text-sm text-muted-foreground">Pending reviews</div></CardContent></Card>
        <Card><CardContent className="pt-6"><Activity className="h-5 w-5 text-primary mb-2" /><div className="text-2xl font-bold">{moderation.high_priority_alerts}</div><div className="text-sm text-muted-foreground">High priority alerts</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approved Admins</CardTitle>
          <CardDescription>These email addresses are allowed into the admin panel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@example.com" />
            <Button onClick={() => addAdmin.mutate()} disabled={!adminEmail || addAdmin.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              Add admin
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.approved_admins?.map((admin: { email: string }) => (
              <Badge key={admin.email} variant="outline" className="gap-2">
                {admin.email}
                <button
                  type="button"
                  className="ml-1 inline-flex items-center"
                  onClick={() => removeAdmin.mutate(admin.email)}
                  aria-label={`Remove ${admin.email}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Moderation Summary</CardTitle>
          <CardDescription>Safe summary counts only; no sensitive accusations or unverified claims.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {moderation.flagged_accounts === 0 ? "No flagged accounts are currently recorded." : `${moderation.flagged_accounts} flagged accounts are recorded.`}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suspend Account</CardTitle>
          <CardDescription>Enter an email to flag an account for suspension.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          <Button onClick={() => suspend.mutate()} disabled={!email || suspend.isPending}>Suspend</Button>
        </CardContent>
      </Card>
    </div>
  );
}
