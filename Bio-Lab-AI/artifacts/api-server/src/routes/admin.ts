import { Router, type IRouter } from "express";
import { desc, sql } from "drizzle-orm";
import { db, experiments } from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAdmin";

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const APPROVED_ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

const router: IRouter = Router();

router.use(requireAdmin);

router.get("/admin/me", async (req, res) => {
  const email = normalizeEmail(req.header("x-user-email") || "");
  const approved = APPROVED_ADMIN_EMAILS.has(email);
  res.json({ email, approved });
});

router.get("/admin/stats", async (_req, res) => {
  const totalExperiments = await db.select({ count: sql<number>`count(*)` }).from(experiments);
  const recentExperiments = await db
    .select({
      id: experiments.id,
      name: experiments.name,
      date: experiments.date,
      assay_type: experiments.assay_type,
      instrument: experiments.instrument,
      status: experiments.status,
      created_at: experiments.created_at,
    })
    .from(experiments)
    .orderBy(desc(experiments.created_at))
    .limit(10);
  res.json({
    total_experiments: Number(totalExperiments[0]?.count ?? 0),
    approved_admins: Array.from(APPROVED_ADMIN_EMAILS).map((email) => ({ email, created_at: new Date().toISOString() })),
    moderation_summary: {
      flagged_accounts: 0,
      pending_reviews: 0,
      high_priority_alerts: 0,
    },
    recent_experiments: recentExperiments,
  });
});

router.post("/admin/approved-admins", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }
  const normalized = email.trim().toLowerCase();
  if (APPROVED_ADMIN_EMAILS.has(normalized)) {
    res.json({ email: normalized, created_at: new Date().toISOString() });
    return;
  }
  APPROVED_ADMIN_EMAILS.add(normalized);
  res.status(201).json({ email: normalized, created_at: new Date().toISOString() });
});

router.delete("/admin/approved-admins/:email", async (req, res) => {
  const email = req.params.email.trim().toLowerCase();
  if (!APPROVED_ADMIN_EMAILS.has(email)) {
    res.status(404).json({ error: "Admin not found" });
    return;
  }
  APPROVED_ADMIN_EMAILS.delete(email);
  res.status(204).send();
});

router.post("/admin/suspend", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }
  res.json({ ok: true, email: email.toLowerCase(), suspended: true });
});

export default router;
