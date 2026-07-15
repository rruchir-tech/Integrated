import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
const isProduction = process.env.NODE_ENV === "production";

const defaultCorsOrigins = ["https://biolab-copilot.vercel.app"];

function parseCorsOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const configuredCorsOrigins = new Set([
  ...defaultCorsOrigins,
  ...parseCorsOrigins(process.env.CORS_ORIGINS),
  ...parseCorsOrigins(process.env.FRONTEND_ORIGIN),
]);

function isAllowedDevOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
}

// Allow this project's Vercel deployments (production + preview URLs) without
// having to hardcode every generated subdomain. Data is still protected by the
// per-request auth token, which a third-party origin cannot obtain. To lock this
// down to a single origin, set CORS_ORIGINS and remove this helper.
function isAllowedVercelOrigin(origin: string): boolean {
  return /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
}

function resolveCorsOrigin(origin: string | undefined, callback: (err: Error | null, origin?: boolean | string) => void) {
  if (!origin) {
    callback(null, true);
    return;
  }
  if (
    configuredCorsOrigins.has(origin) ||
    isAllowedVercelOrigin(origin) ||
    (!isProduction && isAllowedDevOrigin(origin))
  ) {
    callback(null, origin);
    return;
  }
  callback(null, false);
}

const corsOptions = {
  credentials: true,
  origin: resolveCorsOrigin,
  optionsSuccessStatus: 204,
};

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

app.use(cors(corsOptions));
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
