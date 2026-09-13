import app from "./app";
import { logger } from "./lib/logger";

// Uncaught exception & rejection handlers to prevent sudden silent exits
process.on("uncaughtException", (err) => {
  console.error("💥 [Process] Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 [Process] Unhandled Rejection at:", promise, "reason:", reason);
});

// Port 3000 is hardcoded as the only port forwarded by the proxy
const port = 3000;

app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, `Server listening on http://0.0.0.0:${port}`);
});

