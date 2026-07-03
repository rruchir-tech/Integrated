const DEFAULT_AI_INPUT_MAX_CHARS = 8_000;

export function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const MAX_AI_INPUT_CHARS = readPositiveIntEnv(
  "AI_INPUT_MAX_CHARS",
  DEFAULT_AI_INPUT_MAX_CHARS,
);

export function assertMaxChars(value: string, label: string, max = MAX_AI_INPUT_CHARS): string {
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new Error(`${label} is too long. Maximum length is ${max} characters.`);
  }
  return trimmed;
}
