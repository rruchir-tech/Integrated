import type { Request, Response, NextFunction } from "express";

const adminEmailsRaw = process.env.ADMIN_EMAILS ?? "";
const APPROVED_ADMIN_EMAILS = new Set(
  adminEmailsRaw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const email = normalizeEmail(req.header("x-user-email") || "");
  if (!APPROVED_ADMIN_EMAILS.has(email)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  (req as Request & { adminEmail: string }).adminEmail = email;
  next();
}
