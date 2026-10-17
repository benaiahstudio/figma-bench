import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { RUNS_DIR } from "./config.mjs";

const RUN_DIR = /^run(\d+)$/;

// Rendered attempts for one frame: [{ tool, run }], optionally limited to one tool and/or run number.
// Any run numbers are fine (2, 3, 4 after a failed run 1); a run folder without a finished render is ignored.
export function listRenderedRuns(benchId, tool, run, runsDir = RUNS_DIR) {
  const frameDir = join(runsDir, benchId);

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

// Newest modification time of any file under dir (0 when there is none).
export function newestMtime(dir) {
  if (!existsSync(dir)) return 0;

  return readdirSync(dir, { withFileTypes: true }).reduce((newest, entry) => {
    const path = join(dir, entry.name);

    return Math.max(newest, entry.isDirectory() ? newestMtime(path) : statSync(path).mtimeMs);
  }, 0);
}

// Widths whose screenshot and dom file both exist and are newer than the app source, so a re-run can skip them.
export function capturedWidths(renderPath, names, sourceMtimeMs) {
  return names.filter((name) => {
    const files = [join(renderPath, `${name}.png`), join(renderPath, `dom-${name}.json`)];

    return files.every((file) => existsSync(file) && statSync(file).mtimeMs >= sourceMtimeMs);
  });
}
