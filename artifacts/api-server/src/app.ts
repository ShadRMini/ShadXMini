import express, { type Express } from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import adminRouter from "./routes/admin";
import { logger } from "./lib/logger";
import { sessionMiddleware } from "./lib/adminAuth";
import { primeTelegramIntegrations } from "./lib/telegram";

const app: Express = express();
app.set("trust proxy", 1);
app.disable("etag");

const allowedOrigins = process.env.CLIENT_URL?.split(",").map(s => s.trim()) || [
  "http://localhost:5173",
  "http://localhost:3000",
];

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
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV !== "production" ||
        origin.includes("localhost") ||
        origin.includes(".app") ||
        origin.includes("googleusercontent.com")
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(sessionMiddleware);

app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

primeTelegramIntegrations();

app.use("/api", router);
app.use("/api", adminRouter);

// Serve static frontend builds
const publicStorePaths = [
  path.resolve(process.cwd(), "artifacts/xpay-store/dist/public"),
  path.resolve(process.cwd(), "artifacts/xpay-store/dist"),
  path.resolve(process.cwd(), "dist/public"),
  path.resolve(process.cwd(), "dist"),
];

const publicAdminPaths = [
  path.resolve(process.cwd(), "artifacts/xpay-admin/dist/public"),
  path.resolve(process.cwd(), "artifacts/xpay-admin/dist"),
];

const storeDist = publicStorePaths.find((p) => fs.existsSync(p));
const adminDist = publicAdminPaths.find((p) => fs.existsSync(p));

if (adminDist) {
  app.use("/admin", express.static(adminDist));
  app.use((req, res, next) => {
    if (req.method === "GET" && req.path.startsWith("/admin")) {
      return res.sendFile(path.join(adminDist, "index.html"));
    }
    next();
  });
}

if (storeDist) {
  app.use(express.static(storeDist));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      return res.sendFile(path.join(storeDist, "index.html"));
    }
    next();
  });
}

app.use((err: any, _req: any, res: any, _next: any) => {
  const status = Number(err?.statusCode || 500);
  const message = err?.publicMessage || err?.message || "Internal Server Error";
  if (status >= 500) console.error("Unhandled API error:", err);
  res.status(status).json({ error: message });
});

export default app;
