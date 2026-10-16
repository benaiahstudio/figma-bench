import { join } from "node:path";
import { RESULTS_DIR, RUNS_DIR } from "./config.mjs";

const TOOL_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export function parseRun(value) {
  const run = Number(value);

  if (!Number.isInteger(run) || run < 1) throw new Error(`Run number must be a whole number from 1, got "${value}".`);

  return run;
}

export function checkTool(tool) {
  if (!TOOL_PATTERN.test(tool ?? "")) throw new Error(`Tool name must be lowercase letters, digits and dashes, got "${tool}".`);

  return tool;
}

export const figmaDir = (benchId) => join(RUNS_DIR, benchId, "figma");
export const runDir = (benchId, tool, run) => join(RUNS_DIR, benchId, tool, `run${run}`);
export const appDir = (benchId, tool, run) => join(runDir(benchId, tool, run), "app");
export const renderDir = (benchId, tool, run) => join(runDir(benchId, tool, run), "render");
export const resultPath = (benchId, tool, run) => join(RESULTS_DIR, benchId, `${tool}-run${run}.json`);
