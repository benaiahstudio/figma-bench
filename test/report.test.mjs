import assert from "node:assert/strict";
import test from "node:test";
import { aggregate, mean, renderReport, spread } from "../src/report.mjs";

const result = (benchId, tool, run, ssim) => ({
  benchId,
  tool,
  run,
  visual: { ssim, lumaCorrelation64: 0.9 },
  design2code: { textDice: 1, blockMatch: 1, positionDistance: 0, colourDeltaE: 0 },
  responsive: { narrow: { overflowPx: 0, clippedText: 0, overlappingText: 0 }, wide: { overflowPx: 0, clippedText: 0, overlappingText: 0 } },
  maintainability: { hardCodedColours: 2, arbitraryValues: 4, components: 3, loc: 100 },
});

test("mean and spread", () => {
  assert.equal(mean([1, 2, 3]), 2);
  assert.equal(spread([1, 2, 3]), 1);
  assert.equal(spread([5]), null);
  assert.equal(mean([]), null);
});

test("aggregate groups runs by frame and tool", () => {
  const cells = aggregate([result("a", "ours", 1, 0.8), result("a", "ours", 2, 0.9), result("a", "rival", 1, 0.5)]);

  assert.equal(cells.get("a|ours").runs, 2);
  assert.ok(Math.abs(cells.get("a|ours").metrics.ssim.mean - 0.85) < 1e-12);
  assert.equal(cells.get("a|rival").metrics.ssim.spread, null);
});

test("the report marks missing runs and frames as partial", () => {
  const results = [result("a", "ours", 1, 0.8), result("a", "ours", 2, 0.9), result("a", "ours", 3, 1), result("a", "rival", 1, 0.5)];
  const md = renderReport({ frameIds: ["a", "b"], results, expectedRuns: 3 });
  const ssimTable = md.split("## ")[1];

  assert.match(ssimTable, /\| a \| 0\.900 ± 0\.100 \| 0\.500 \(partial 1\/3\) \|/);
  assert.match(ssimTable, /\| b \| partial \(0\/3\) \| partial \(0\/3\) \|/);
  assert.match(ssimTable, /\*\*Overall\*\* \| 0\.900 \(partial 1\/2 frames\) \| 0\.500 \(partial 1\/2 frames\) \|/);
  assert.ok(md.includes("| Frame | ours | rival |"));
});
