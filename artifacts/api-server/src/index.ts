import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"] || 3000;
const port = Number(rawPort) || 3000;

app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, `Server listening on http://0.0.0.0:${port}`);
});

