import type { NextFunction, Request, Response } from "express";
import { getRequestUserId } from "../lib/requestUser";
import { readPositiveIntEnv } from "../lib/requestLimits";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message: string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function clientKey(req: Request, prefix: string): string {
  try {
    return `${prefix}:user:${getRequestUserId(req)}`;
  } catch {
    return `${prefix}:ip:${req.ip ?? req.socket.remoteAddress ?? "unknown"}`;
  }
}

function createRateLimiter(options: RateLimitOptions) {
  return function rateLimiter(req: Request, res: Response, next: NextFunction) {
    const now = Date.now();
    const key = clientKey(req, options.keyPrefix);
    const current = buckets.get(key);
    const bucket = current && current.resetAt > now
      ? current
      : { count: 0, resetAt: now + options.windowMs };

    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(0, options.max - bucket.count);
    const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);
    res.setHeader("RateLimit-Limit", String(options.max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(resetSeconds));

    if (bucket.count > options.max) {
      res.setHeader("Retry-After", String(resetSeconds));
      res.status(429).json({
        error: options.message,
        retry_after_seconds: resetSeconds,
      });
      return;
    }

    if (buckets.size > 10_000) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(bucketKey);
      }
    }

    next();
  };
}

export const aiRateLimiter = createRateLimiter({
  keyPrefix: "ai",
  windowMs: readPositiveIntEnv("AI_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
  max: readPositiveIntEnv("AI_RATE_LIMIT_MAX", 20),
  message: "Too many AI requests. Please wait a bit before asking the copilot again.",
});
