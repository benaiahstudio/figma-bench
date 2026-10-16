import { execFileSync, spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { withBridge, parseSelection } from "./bridge-client.mjs";
import { renderBrief, viewportWidths } from "./brief.mjs";
import { chromeSnapshot } from "./snapshot.mjs";
import { loadConfig, MANIFEST_PATH, RESERVED_PORT, RESULTS_DIR, ROOT } from "./config.mjs";
import { findFrame, loadManifest, pickFrames, saveManifest } from "./manifest.mjs";
import { appDir, checkTool, figmaDir, parseRun, renderDir } from "./paths.mjs";
import { loadResults, renderReport } from "./report.mjs";
import { listRenderedRuns } from "./runs.mjs";
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

export async function exportFrames(idOrAll, { file, force }) {
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

      const target = files.find((entry) => entry.fileName === frame.fileName) ?? pickFile(files, file);
      const { text } = await call("figma_export", { nodeId: frame.nodeId, outDir, fileKey: target.fileKey });

      console.log(`${frame.id}:\n${text}`);
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

  if (existsSync(join(app, "src"))) throw new Error(`${app} already exists. Delete it first to start the run again.`);
  cpSync(join(ROOT, "template", "app"), app, { recursive: true });
  mkdirSync(join(app, "reference"), { recursive: true });
  cpSync(join(figma, "screenshot@2x.png"), join(app, "reference", "screenshot@2x.png"));
  if (existsSync(join(figma, "assets"))) cpSync(join(figma, "assets"), join(app, "public", "assets"), { recursive: true });

  const template = readFileSync(join(ROOT, "template", "BRIEF.md"), "utf8");

  writeFileSync(join(app, "BRIEF.md"), renderBrief(template, { frame, tool, figmaPath: figma }));
  console.log(`Prepared ${app}\nBrief: ${join(app, "BRIEF.md")}`);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();

      server.close(() => (port === RESERVED_PORT ? resolve(freePort()) : resolve(port)));
    });
  });
}

async function waitForUrl(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error(`Preview server did not answer at ${url}.`);
}

const npm = (args, cwd) => execFileSync("npm", args, { cwd, stdio: "inherit", shell: process.platform === "win32" });

async function withPreview(app, fn) {
  const vite = join(app, "node_modules", "vite", "bin", "vite.js");

  if (!existsSync(vite)) npm(["install", "--no-audit", "--no-fund"], app);
  execFileSync(process.execPath, [vite, "build"], { cwd: app, stdio: "inherit" });

  const port = await freePort();
  const server = spawn(process.execPath, [vite, "preview", "--port", String(port), "--strictPort", "--host", "127.0.0.1"], { cwd: app, stdio: "ignore" });

  try {
    const url = `http://127.0.0.1:${port}/`;

    await waitForUrl(url);

    return await fn(url);
  } finally {
    server.kill();
  }
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

  await withPreview(app, async (url) => {
    for (const [name, width] of Object.entries(widths)) {
      const png = join(out, `${name}.png`);

      execFileSync(process.execPath, [script, url, "--width", String(width), "--height", String(frame.height), "--dpr", "2", "--out", png], { stdio: "inherit" });
      writeFileSync(join(out, `dom-${name}.json`), JSON.stringify(chromeSnapshot(url, width, frame.height)));
    }
  });
  writeFileSync(join(out, "meta.json"), `${JSON.stringify({ widths, height: frame.height, dpr: 2 }, null, 2)}\n`);
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
