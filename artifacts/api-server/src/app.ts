import express, { type Express } from "express";
import path from "node:path";
import fs from "node:fs";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import adminRouter from "./routes/admin";
import { logger } from "./lib/logger";
import { sessionMiddleware } from "./lib/adminAuth";
import { primeTelegramIntegrations } from "./lib/telegram";
import { seedSuperAdmin } from "./lib/seedAdmin";
import { ensureDatabaseSchema } from "./lib/ensureSchema";
import { syncAllPendingProviderOrders } from "./routes/orders";

let ordersSyncIntervalHandle: NodeJS.Timeout | null = null;
let isOrdersSyncRunning = false;

export function startOrdersSyncWorker() {
  const isEnabled = process.env.ORDERS_SYNC_ENABLED !== "false" && process.env.ORDER_SYNC_ENABLED !== "false";
  const intervalMinutes = parseInt(process.env.ORDERS_SYNC_INTERVAL_MINUTES || "5", 10);

  if (!isEnabled || isNaN(intervalMinutes) || intervalMinutes <= 0) {
    return;
  }

  if (ordersSyncIntervalHandle) {
    return;
  }

  console.log(`[Orders Sync] Background worker started (interval: ${intervalMinutes}m)`);

  const runSync = async () => {
    if (isOrdersSyncRunning) return;
    isOrdersSyncRunning = true;
    try {
      console.log(`[Orders Sync] 🔄 Background worker running scheduled cycle...`);
      const res = await syncAllPendingProviderOrders();
      if (res.synced > 0 || res.errors > 0) {
        console.log(`[Orders Sync] Run completed: ${res.synced} orders updated, ${res.errors} errors`);
      }
    } catch (err) {
      logger.error({ err }, "[Orders Sync] Background worker encountered an error");
    } finally {
      isOrdersSyncRunning = false;
    }
  };

  // Initial run after 30 seconds
  const initialTimeout = setTimeout(() => {
    runSync();
    ordersSyncIntervalHandle = setInterval(runSync, intervalMinutes * 60 * 1000);
  }, 30 * 1000);

  if (initialTimeout.unref) initialTimeout.unref();
}

const app: Express = express();
app.set("trust proxy", 1);
app.disable("etag");

const rawClientUrls = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean)
  : [];

const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
];

const configuredOrigins = new Set([...rawClientUrls, ...defaultOrigins]);

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

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like server-to-server, curl, Telegram webhooks)
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = origin.replace(/\/+$/, "");

      if (process.env.NODE_ENV === "production") {
        // P0-6: In production, allow ONLY configured CLIENT_URL domains
        const isAllowed =
          rawClientUrls.includes(normalizedOrigin) ||
          (rawClientUrls.length === 0 && configuredOrigins.has(normalizedOrigin));

        if (isAllowed) {
          callback(null, true);
        } else {
          callback(new Error(`CORS origin not allowed: ${origin}`));
        }
      } else {
        // In non-production: allow localhost, preview containers, and local ports
        const isDevAllowed =
          configuredOrigins.has(normalizedOrigin) ||
          normalizedOrigin.includes("localhost") ||
          normalizedOrigin.includes("127.0.0.1") ||
          normalizedOrigin.includes(".app") ||
          normalizedOrigin.includes("googleusercontent.com") ||
          normalizedOrigin.includes("webcontainer.io");

        if (isDevAllowed) {
          callback(null, true);
        } else {
          callback(new Error(`CORS origin not allowed in development: ${origin}`));
        }
      }
    },
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(sessionMiddleware);

app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

// P0-1 & P0-4: Enforce required secrets at startup in production
if (process.env.NODE_ENV === "production") {
  const missingSecrets: string[] = [];
  const INSECURE_SECRETS = new Set(["shadxmini-jwt-secret-key-2026", "xpay-dev-secret", "secret", "default-jwt-secret"]);

  const jwtSecret = (process.env.JWT_SECRET || process.env.SESSION_SECRET || "").trim();
  if (!jwtSecret || INSECURE_SECRETS.has(jwtSecret)) {
    missingSecrets.push("JWT_SECRET (must be configured with a strong non-default secret)");
  }

  const sessionSecret = (process.env.SESSION_SECRET || "").trim();
  if (!sessionSecret || INSECURE_SECRETS.has(sessionSecret)) {
    missingSecrets.push("SESSION_SECRET (must be configured with a strong non-default secret)");
  }

  const enableTelegramWebhooks = process.env.ENABLE_TELEGRAM_WEBHOOKS === "true";

  // Only require Telegram secrets if Telegram webhooks are explicitly enabled
  if (enableTelegramWebhooks) {
    if (!process.env.TELEGRAM_ADMIN_WEBHOOK_SECRET) missingSecrets.push("TELEGRAM_ADMIN_WEBHOOK_SECRET");
    if (!process.env.TELEGRAM_STORE_WEBHOOK_SECRET) missingSecrets.push("TELEGRAM_STORE_WEBHOOK_SECRET");
  }

  // SAM_WEBHOOK_SECRET remains strictly mandatory in production
  if (!process.env.SAM_WEBHOOK_SECRET) missingSecrets.push("SAM_WEBHOOK_SECRET");

  if (missingSecrets.length > 0) {
    const msg = `[Security Fatal] Missing or insecure required secrets in production: ${missingSecrets.join(", ")}`;
    logger.error(msg);
    throw new Error(msg);
  }
}

ensureDatabaseSchema();
startOrdersSyncWorker();
if (process.env.ENABLE_TELEGRAM_WEBHOOKS === "true") {
  primeTelegramIntegrations();
}
seedSuperAdmin();

// Return 503 Service Unavailable for Telegram webhooks if disabled
if (process.env.ENABLE_TELEGRAM_WEBHOOKS !== "true") {
  const handleDisabledTelegramWebhook = (_req: express.Request, res: express.Response) => {
    res.status(503).json({
      error: "Telegram webhooks are disabled on this instance (ENABLE_TELEGRAM_WEBHOOKS=false)",
    });
  };

  app.use("/api/webhooks/telegram", handleDisabledTelegramWebhook);
  app.use("/api/telegram/admin/webhook", handleDisabledTelegramWebhook);
  app.use("/api/telegram/admin/callback", handleDisabledTelegramWebhook);
  app.use("/api/telegram/store/webhook", handleDisabledTelegramWebhook);
}

app.use("/api", router);
app.use("/api", adminRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "ShadMini API is running" });
});

// Front-end static assets & SPA serving
const storeDist = path.resolve(import.meta.dirname, "../../xpay-store/dist");
const adminDist = path.resolve(import.meta.dirname, "../../xpay-admin/dist");

if (fs.existsSync(adminDist)) {
  app.use("/admin", express.static(adminDist));
  app.use("/admin", (_req, res) => {
    res.sendFile(path.join(adminDist, "index.html"));
  });
}

if (fs.existsSync(storeDist)) {
  app.use(express.static(storeDist));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(storeDist, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.json({ status: "ok", message: "ShadMini API is running" });
  });
}

app.use((err: any, _req: any, res: any, _next: any) => {
  const status = Number(err?.statusCode || 500);
  const message = err?.publicMessage || err?.message || "Internal Server Error";
  if (status >= 500) console.error("Unhandled API error:", err);
  res.status(status).json({ error: message });
});

export default app;
