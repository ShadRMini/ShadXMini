import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "../artifacts/api-server/node_modules/esbuild/lib/main.js";
import { spawn } from "node:child_process";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  console.log("Bundling test runner...");
  const outPath = path.resolve(rootDir, ".tmp/test-runner.mjs");

  await esbuild({
    entryPoints: [path.resolve(rootDir, "scripts/test-task4-background-sync.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: outPath,
    logLevel: "error",
    nodePaths: [
      path.resolve(rootDir, "artifacts/api-server/node_modules"),
      path.resolve(rootDir, "lib/db/node_modules"),
      path.resolve(rootDir, "node_modules"),
    ],
    alias: {
      "@workspace/db": path.resolve(rootDir, "lib/db/src/index.ts"),
      "@workspace/api-zod": path.resolve(rootDir, "lib/api-zod/src/index.ts"),
    },
    banner: {
      js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
    },
    external: ["pg-native"],
  });

  console.log("Executing test bundle with Node.js...\n");
  const child = spawn("node", [outPath], {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => {
    process.exit(code || 0);
  });
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
