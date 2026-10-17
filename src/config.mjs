import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// The bridge server only accepts output folders inside <repo>/.scratch, so every run lives there.
export const RUNS_DIR = join(ROOT, ".scratch", "runs");
export const RESULTS_DIR = join(ROOT, "results");
export const MANIFEST_PATH = join(ROOT, "data", "benchmark.json");
// Kept free for a dev server you may already run; previews must never use it.
// By default the tool under test is expected to sit next to this repo: ../figma-to-code.
const SIBLING_TOOL = resolve(ROOT, "..", "figma-to-code");
export const RESERVED_PORT = 5199;

export function loadConfig(env = process.env) {
  return {
    bridgeServer: env.FIGMA_BRIDGE_SERVER || join(SIBLING_TOOL, "bridge", "dist", "server", "index.js"),
    toolkitDir: env.FIGMA_TOOLKIT_DIR || join(SIBLING_TOOL, "toolkit"),
    python: env.BENCH_PYTHON || (process.platform === "win32" ? "python" : "python3"),
    expectedRuns: Number(env.BENCH_EXPECTED_RUNS || 3),
  };
}
