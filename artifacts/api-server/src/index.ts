import app from "./app";
import { logger } from "./lib/logger";

// Port 3000 is hardcoded as the only port forwarded by the proxy
const port = 3000;

app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, `Server listening on http://0.0.0.0:${port}`);
});

