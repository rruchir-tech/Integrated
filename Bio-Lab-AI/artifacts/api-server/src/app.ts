import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Only mount Clerk middleware when auth is configured.
// Without CLERK_SECRET_KEY the app runs in demo mode (see requireAuth.ts).
if (process.env.CLERK_SECRET_KEY) {
  app.use(clerkMiddleware());
} else {
  logger.warn("CLERK_SECRET_KEY not set — running in demo mode (no auth)");
}

app.use("/api", router);

export default app;
