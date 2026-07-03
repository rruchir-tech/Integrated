import { ai } from "@workspace/integrations-gemini-ai";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Resilient Gemini calls
//
// gemini-2.5-flash intermittently returns 503 ("model is currently experiencing
// high demand") and 429 (RESOURCE_EXHAUSTED). The routes call the model with no
// retry, so every transient overload surfaced as a user-facing 500 (the
// "Analyze with AI" button silently failing). These wrappers add exponential
// backoff on transient errors and, after a couple of failures, fall back to a
// second model that is usually less saturated. Non-transient errors are
// re-thrown immediately, so behavior is unchanged on real failures.
// ---------------------------------------------------------------------------

const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL ?? "gemini-2.5-flash-lite";
const DEFAULT_ATTEMPTS = 4;

function isTransient(err: unknown): boolean {
  const s = String((err as { message?: string })?.message ?? err);
  return (
    s.includes("503") ||
    s.includes("UNAVAILABLE") ||
    s.includes("overloaded") ||
    s.includes("high demand") ||
    s.includes("429") ||
    s.includes("RESOURCE_EXHAUSTED")
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// After this many failed attempts on the requested model, swap to the fallback.
const FALLBACK_AFTER = 2;

function withModel<T extends { model?: string }>(args: T, attempt: number): T {
  if (attempt >= FALLBACK_AFTER && args.model && args.model !== FALLBACK_MODEL) {
    return { ...args, model: FALLBACK_MODEL };
  }
  return args;
}

type GenArgs = Parameters<typeof ai.models.generateContent>[0];
type StreamArgs = Parameters<typeof ai.models.generateContentStream>[0];

export async function generateContentWithRetry(
  args: GenArgs,
  attempts = DEFAULT_ATTEMPTS,
): ReturnType<typeof ai.models.generateContent> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await ai.models.generateContent(withModel(args, i));
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || i === attempts - 1) throw err;
      const delay = 500 * 2 ** i + Math.floor(Math.random() * 300);
      logger.warn({ attempt: i + 1, delay }, "Gemini transient error — retrying");
      await sleep(delay);
    }
  }
  throw lastErr;
}

export async function generateContentStreamWithRetry(
  args: StreamArgs,
  attempts = DEFAULT_ATTEMPTS,
): ReturnType<typeof ai.models.generateContentStream> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await ai.models.generateContentStream(withModel(args, i));
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || i === attempts - 1) throw err;
      const delay = 500 * 2 ** i + Math.floor(Math.random() * 300);
      logger.warn({ attempt: i + 1, delay }, "Gemini transient error (stream) — retrying");
      await sleep(delay);
    }
  }
  throw lastErr;
}
