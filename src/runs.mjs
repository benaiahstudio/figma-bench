import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { RUNS_DIR } from "./config.mjs";

const RUN_DIR = /^run(\d+)$/;

// Rendered attempts for one frame: [{ tool, run }], optionally limited to one tool and/or run number.
export function listRenderedRuns(benchId, tool, run) {
  const frameDir = join(RUNS_DIR, benchId);

  if (!existsSync(frameDir)) return [];

  const tools = readdirSync(frameDir, { withFileTypes: true }).filter((entry) => entry.isDirectory() && entry.name !== "figma" && (!tool || entry.name === tool));

  return tools.flatMap((toolEntry) =>
    readdirSync(join(frameDir, toolEntry.name)).flatMap((name) => {
      const match = RUN_DIR.exec(name);
      const number = match ? Number(match[1]) : null;
      const rendered = number !== null && existsSync(join(frameDir, toolEntry.name, name, "render", "meta.json"));

      return rendered && (!run || number === run) ? [{ tool: toolEntry.name, run: number }] : [];
    }),
  );
}
