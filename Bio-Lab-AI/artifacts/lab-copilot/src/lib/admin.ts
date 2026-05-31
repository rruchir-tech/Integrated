export const APPROVED_ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL ?? "").trim().toLowerCase();
export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}