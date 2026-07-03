import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
const isProduction = process.env.NODE_ENV === "production";
const configuredCorsOrigins = (process.env.CORS_ORIGINS ?? process.env.FRONTEND_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedDevOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
}

function resolveCorsOrigin(origin: string | undefined, callback: (err: Error | null, origin?: boolean | string) => void) {
  if (!origin) {
    callback(null, true);
    return;
  }
  if (configuredCorsOrigins.includes(origin) || (!isProduction && isAllowedDevOrigin(origin))) {
    callback(null, origin);
    return;
  }
  callback(null, false);
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ credentials: true, origin: resolveCorsOrigin }));
app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT ?? "5mb" }));
app.use(express.urlencoded({ extended: true, limit: process.env.REQUEST_BODY_LIMIT ?? "5mb" }));

// Only mount Clerk middleware when auth is configured.
// Without CLERK_SECRET_KEY the app runs in demo mode (see requireAuth.ts).
if (process.env.CLERK_SECRET_KEY) {
  app.use(clerkMiddleware());
} else {
  if (isProduction) {
    throw new Error("CLERK_SECRET_KEY is required when NODE_ENV=production");
  }
  logger.warn("CLERK_SECRET_KEY not set — running in demo mode (no auth)");
}

app.use("/api", router);

export default app;
