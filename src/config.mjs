import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// The bridge server only accepts output folders inside <repo>/.scratch, so every run lives there.
export const RUNS_DIR = join(ROOT, ".scratch", "runs");
export const RESULTS_DIR = join(ROOT, "results");
export const MANIFEST_PATH = join(ROOT, "data", "benchmark.json");
// Reserved for the developer's own dev server; previews must never use it.
export const RESERVED_PORT = 5199;

export function loadConfig(env = process.env) {
  return {
    bridgeServer: env.FIGMA_BRIDGE_SERVER || join(homedir(), "cc-figma-bridge", "dist", "server", "index.js"),
    toolkitDir: env.FIGMA_TOOLKIT_DIR || join(homedir(), ".claude", "scripts", "figma"),
    python: env.BENCH_PYTHON || (process.platform === "win32" ? "python" : "python3"),
    expectedRuns: Number(env.BENCH_EXPECTED_RUNS || 3),
  };
}
