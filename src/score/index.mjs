import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ROOT } from "../config.mjs";
import { appDir, figmaDir, renderDir, resultPath } from "../paths.mjs";
import { designTextBlocks, frameSize } from "./design-blocks.mjs";
import { design2code } from "./pairing.mjs";
import { visualMetrics } from "./image.mjs";
import { maintainability } from "./maintainability.mjs";
import { responsiveMetrics } from "./responsive.mjs";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

function requireFiles(paths) {
  const missing = paths.filter((path) => !existsSync(path));

  if (missing.length > 0) throw new Error(`Missing input: ${missing.join(", ")}. Run the earlier steps (export, prepare, render) first.`);
}

function runClip(python, referencePath, renderPath) {
  const script = join(ROOT, "scripts", "clip_score.py");

  try {
    return JSON.parse(execFileSync(python, [script, referencePath, renderPath], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  } catch (error) {
    return { error: String(error.stderr || error.message).trim().split("\n").pop() };
  }
}

// Collects raw numbers only. There is no pass/fail anywhere in this file.
export function scoreRun({ benchId, tool, run, python, clip = false }) {
  const figma = figmaDir(benchId);
  const render = renderDir(benchId, tool, run);
  const files = {
    reference: join(figma, "screenshot@2x.png"),
    design: join(figma, "design.json"),
    frame: join(render, "frame.png"),
    domFrame: join(render, "dom-frame.json"),
    domNarrow: join(render, "dom-narrow.json"),
    domWide: join(render, "dom-wide.json"),
  };

  requireFiles(Object.values(files));

  const design = readJson(files.design);
  const frame = frameSize(design);
  const renderBlocks = readJson(files.domFrame).blocks.filter((block) => block.alpha > 0);
  const result = {
    benchId,
    tool,
    run,
    scoredAt: new Date().toISOString(),
    visual: visualMetrics(files.reference, files.frame),
    design2code: design2code(designTextBlocks(design), renderBlocks, frame),
    responsive: { narrow: responsiveMetrics(readJson(files.domNarrow)), wide: responsiveMetrics(readJson(files.domWide)) },
    maintainability: maintainability(appDir(benchId, tool, run)),
  };

  if (clip) result.visual.clip = runClip(python, files.reference, files.frame);

  const out = resultPath(benchId, tool, run);

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);

  return { result, out };
}
