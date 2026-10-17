import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { withBridge, parseSelection } from "./bridge-client.mjs";
import { renderBrief, viewportWidths } from "./brief.mjs";
import { chromeSnapshot } from "./snapshot.mjs";
import { loadConfig, MANIFEST_PATH, RESULTS_DIR, ROOT } from "./config.mjs";
import { findFrame, loadManifest, pickFrames, saveManifest } from "./manifest.mjs";
import { appDir, briefPath, checkTool, figmaDir, parseRun, renderDir, workDir } from "./paths.mjs";
import { withPreview } from "./preview.mjs";
import { loadResults, renderReport } from "./report.mjs";
import { capturedWidths, listRenderedRuns, newestMtime } from "./runs.mjs";
import { scoreRun } from "./score/index.mjs";

const config = loadConfig();
const bridgeOptions = () => ({ serverPath: config.bridgeServer, cwd: ROOT });
const SELECTABLE = new Set(["FRAME", "COMPONENT", "COMPONENT_SET", "SECTION", "INSTANCE"]);

function pickFile(files, wanted) {
  if (files.length === 0) throw new Error("The plugin reports no open file.");

  const match = wanted ? files.find((file) => file.fileKey === wanted || file.fileName === wanted) : files.length === 1 ? files[0] : undefined;

  if (!match) throw new Error(`Several files are connected (${files.map((file) => file.fileName).join(", ")}). Pass --file <name or key>.`);

  return match;
}

export async function listFrames() {
  await withBridge(bridgeOptions(), async ({ call, statusText }) => {
    console.log(statusText);

    const { text } = await call("figma_selection", {});

    console.log("Selected top-level nodes (select all frames on the page first, Ctrl+A):");
    console.log(parseSelection(text).map((item) => `${item.id}\t${item.width}x${item.height}\t${item.type}\t${item.name}`).join("\n") || text);
  });
}

export async function selectFrame(benchId, { file }) {
  const manifest = loadManifest();
  const frame = findFrame(manifest, benchId);

  await withBridge(bridgeOptions(), async ({ call, files }) => {
    const target = pickFile(files, file);
    const items = parseSelection((await call("figma_selection", { fileKey: target.fileKey })).text);

    if (items.length !== 1) throw new Error(`Select exactly one frame in Figma (found ${items.length}).`);

    const [item] = items;

    if (!SELECTABLE.has(item.type)) console.warn(`Warning: selected node is a ${item.type}, not a frame.`);
    Object.assign(frame, { fileName: target.fileName, nodeId: item.id, width: item.width, height: item.height });
    saveManifest(manifest);
    console.log(`${benchId}: recorded ${item.id} "${item.name}" ${item.width}x${item.height} from "${target.fileName}" in ${MANIFEST_PATH}`);
  });
}

export async function exportFrames(idOrAll, { file, force, node, out }) {
  if (node) return exportNode(node, { file, out });

  const frames = pickFrames(loadManifest(), idOrAll);
  const missing = frames.filter((frame) => frame.nodeId === null);

  if (missing.length > 0) throw new Error(`No nodeId yet for: ${missing.map((frame) => frame.id).join(", ")}. Run "select" for each first.`);

  await withBridge(bridgeOptions(), async ({ call, files }) => {
    for (const frame of frames) {
      const outDir = figmaDir(frame.id);

      if (existsSync(join(outDir, "design.json")) && !force) {
        console.log(`${frame.id}: already exported (the reference is frozen). Use --force to redo it.`);
        continue;
      }

      const named = frame.fileName ? files.find((entry) => entry.fileName === frame.fileName) : undefined;

      if (frame.fileName && !named) throw new Error(`${frame.id}: "${frame.fileName}" is not connected. Open it in Figma Desktop and run the plugin.`);

      const target = named ?? pickFile(files, file);
      const { text } = await call("figma_export", { nodeId: frame.nodeId, outDir, fileKey: target.fileKey });

      console.log(`${frame.id}:\n${text}`);
    }
  });
}

// Exports any node by id without touching the manifest. Output goes to .scratch/exports/<id> unless --out is given.
async function exportNode(nodeId, { file, out }) {
  const outDir = out ? resolve(out) : join(ROOT, ".scratch", "exports", nodeId.replace(/[^\w-]+/g, "_"));

  await withBridge(bridgeOptions(), async ({ call, files }) => {
    const target = pickFile(files, file);
    const { text } = await call("figma_export", { nodeId, outDir, fileKey: target.fileKey });

    console.log(`${nodeId} from "${target.fileName}" -> ${outDir}\n${text}`);
  });
}

export async function outline({ file }) {
  await withBridge(bridgeOptions(), async ({ call, files }) => {
    if (files.length === 0) throw new Error("The plugin reports no open file.");

    const targets = file || files.length === 1 ? [pickFile(files, file)] : files;

    for (const target of targets) {
      const { text } = await call("figma_outline", { fileKey: target.fileKey });

      console.log(`File "${target.fileName}"\n${text}\n`);
    }
  });
}

export function prepareApp(benchId, tool, runValue) {
  const frame = findFrame(loadManifest(), benchId);
  const run = parseRun(runValue);
  const figma = figmaDir(benchId);

  checkTool(tool);
  if (frame.width === null) throw new Error(`${benchId} has no size yet. Run "select" first.`);
  if (!existsSync(join(figma, "screenshot@2x.png"))) throw new Error(`No export for ${benchId}. Run "export ${benchId}" first.`);

  const app = appDir(benchId, tool, run);
  const work = workDir(benchId, tool, run);

  if (existsSync(join(app, "src"))) throw new Error(`${app} already exists. Delete it first to start the run again.`);
  cpSync(join(ROOT, "template", "app"), app, { recursive: true });
  mkdirSync(join(app, "reference"), { recursive: true });
  mkdirSync(work, { recursive: true });
  cpSync(join(figma, "screenshot@2x.png"), join(app, "reference", "screenshot@2x.png"));
  if (existsSync(join(figma, "assets"))) cpSync(join(figma, "assets"), join(app, "public", "assets"), { recursive: true });

  const template = readFileSync(join(ROOT, "template", "BRIEF.md"), "utf8");
  const brief = briefPath(benchId, tool, run);

  writeFileSync(brief, renderBrief(template, { frame, tool, figmaPath: figma, workPath: work }));
  console.log(`Prepared ${app}\nBrief: ${brief}\nWork folder: ${work}`);
}

// Runs fn, retrying on failure (the render helper fails now and then).
function withRetries(label, fn, tries = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      return fn();
    } catch (error) {
      if (attempt >= tries) throw error;
      console.error(`${label} failed (try ${attempt}/${tries}): ${error.message.split("\n")[0]}`);
    }
  }
}

function writeAtomic(path, text) {
  writeFileSync(`${path}.tmp`, text);
  renameSync(`${path}.tmp`, path);
}

export async function renderApp(benchId, tool, runValue) {
  const frame = findFrame(loadManifest(), benchId);
  const run = parseRun(runValue);
  const app = appDir(benchId, tool, run);
  const out = renderDir(benchId, tool, run);
  const script = join(config.toolkitDir, "figma-render.mjs");

  if (!existsSync(join(app, "src"))) throw new Error(`No app at ${app}. Run "prepare" first.`);
  if (!existsSync(script)) throw new Error(`figma-render.mjs not found in ${config.toolkitDir}. Set FIGMA_TOOLKIT_DIR.`);
  mkdirSync(out, { recursive: true });

  const widths = viewportWidths(frame.width);
  const finished = existsSync(join(out, "meta.json"));
  // A finished render is redone from scratch; an unfinished one resumes with the widths it already captured.
  const skip = finished ? [] : capturedWidths(out, Object.keys(widths), newestMtime(join(app, "src")));

  if (finished) rmSync(join(out, "meta.json"));
  if (skip.length > 0) console.log(`Resuming: already captured ${skip.join(", ")}.`);

  await withPreview(app, async (url) => {
    for (const [name, width] of Object.entries(widths)) {
      if (skip.includes(name)) continue;

      const png = join(out, `${name}.png`);
      const partial = join(out, `${name}.part.png`);
      // The snapshot goes first so a Chrome error page aborts before any screenshot is kept.
      const snapshot = chromeSnapshot(url, width, frame.height);

      withRetries(`render ${name}`, () => execFileSync(process.execPath, [script, url, "--width", String(width), "--height", String(frame.height), "--dpr", "2", "--out", partial], { stdio: "inherit" }));
      renameSync(partial, png);
      writeAtomic(join(out, `dom-${name}.json`), JSON.stringify(snapshot));
    }
  });
  writeAtomic(join(out, "meta.json"), `${JSON.stringify({ widths, height: frame.height, dpr: 2 }, null, 2)}\n`);
  console.log(`Rendered ${benchId}/${tool}/run${run} at ${JSON.stringify(widths)} into ${out}`);
}

export function scoreFrames(idOrAll, tool, { clip, run }) {
  const manifest = loadManifest();
  const jobs = [];

  for (const frame of pickFrames(manifest, idOrAll)) {
    for (const found of listRenderedRuns(frame.id, tool, run ? parseRun(run) : undefined)) jobs.push({ benchId: frame.id, ...found });
  }
  if (jobs.length === 0) throw new Error("Nothing to score: no rendered runs found.");

  for (const job of jobs) {
    try {
      const { out } = scoreRun({ ...job, python: config.python, clip });

      console.log(`scored ${job.benchId}/${job.tool}/run${job.run} -> ${out}`);
    } catch (error) {
      console.error(`skipped ${job.benchId}/${job.tool}/run${job.run}: ${error.message}`);
    }
  }
}

export function writeReport() {
  const manifest = loadManifest();
  const results = loadResults(RESULTS_DIR);
  const target = join(RESULTS_DIR, "RESULTS.md");

  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(target, renderReport({ frameIds: manifest.frames.map((frame) => frame.id), results, expectedRuns: config.expectedRuns }));
  console.log(`Wrote ${target} from ${results.length} score file(s).`);
}
