import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadResults, renderReport, runsFound } from "../src/report.mjs";
import { capturedWidths, listRenderedRuns } from "../src/runs.mjs";

function fakeRuns() {
  const root = mkdtempSync(join(tmpdir(), "fb-runs-"));
  const render = (run, files) => {
    mkdirSync(join(root, "shop", "ours", `run${run}`, "render"), { recursive: true });
    for (const file of files) writeFileSync(join(root, "shop", "ours", `run${run}`, "render", file), "{}");
  };

  mkdirSync(join(root, "shop", "figma"), { recursive: true });
  render(1, ["frame.png"]);
  render(2, ["meta.json"]);
  render(4, ["meta.json"]);
  mkdirSync(join(root, "shop", "ours", "run5", "app"), { recursive: true });

  return { root, render };
}

test("any run numbers are found; folders without a finished render are ignored", () => {
  const { root } = fakeRuns();

  assert.deepEqual(listRenderedRuns("shop", undefined, undefined, root).map((entry) => entry.run).sort(), [2, 4]);
  assert.deepEqual(listRenderedRuns("shop", "ours", 4, root), [{ tool: "ours", run: 4 }]);
  assert.deepEqual(listRenderedRuns("nothing", undefined, undefined, root), []);
});

test("a resumed render skips widths that already have both files", () => {
  const { root, render } = fakeRuns();
  const dir = join(root, "shop", "ours", "run1", "render");

  render(1, ["frame.png", "dom-frame.json", "narrow.png"]);
  assert.deepEqual(capturedWidths(dir, ["frame", "narrow", "wide"], 0), ["frame"]);
  assert.deepEqual(capturedWidths(dir, ["frame"], Date.now() + 60000), []);
});

test("score loading skips broken files and the report lists the run numbers it found", () => {
  const root = mkdtempSync(join(tmpdir(), "fb-results-"));
  const full = (run) => ({
    benchId: "shop",
    tool: "ours",
    run,
    visual: { ssim: 0.9, lumaCorrelation64: 0.9 },
    design2code: { textDice: 1, blockMatch: 1, positionDistance: 0, colourDeltaE: 0 },
    responsive: { narrow: { overflowPx: 0, clippedText: 0, overlappingText: 0 }, wide: { overflowPx: 0, clippedText: 0, overlappingText: 0 } },
    maintainability: { hardCodedColours: 0, arbitraryValues: 3, tokenDefinitions: 5, variableUses: 9, components: 1, loc: 10 },
  });

  mkdirSync(join(root, "shop"));
  for (const run of [2, 3, 4]) writeFileSync(join(root, "shop", `ours-run${run}.json`), JSON.stringify(full(run)));
  writeFileSync(join(root, "shop", "ours-run5.json"), "{ not json");
  writeFileSync(join(root, "shop", "ours-run6.json"), JSON.stringify({ benchId: "shop", tool: "ours", run: 6 }));

  const results = loadResults(root);

  assert.equal(results.length, 3);
  assert.deepEqual(runsFound(results), ["- shop / ours: run 2, 3, 4"]);

  const md = renderReport({ frameIds: ["shop"], results, expectedRuns: 3 });

  assert.match(md, /\| shop \| 0\.900 ± 0\.000 \|/);
  assert.match(md, /## CSS variables defined/);
  assert.match(md, /## CSS variable uses/);
});
