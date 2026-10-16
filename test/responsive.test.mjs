import assert from "node:assert/strict";
import test from "node:test";
import { countOverlaps, detectOverflow, responsiveMetrics } from "../src/score/responsive.mjs";

const box = (x, y, w, h) => ({ x, y, w, h });

test("overflow is flagged only past the 1px tolerance", () => {
  assert.deepEqual(detectOverflow({ scrollWidth: 360, viewportWidth: 360 }), { overflows: false, overflowPx: 0 });
  assert.equal(detectOverflow({ scrollWidth: 361, viewportWidth: 360 }).overflows, false);
  assert.deepEqual(detectOverflow({ scrollWidth: 480, viewportWidth: 360 }), { overflows: true, overflowPx: 120 });
  assert.equal(detectOverflow({ scrollWidth: 300, viewportWidth: 360 }).overflowPx, 0);
});

test("overlap counts pairs that share a large part of the smaller block", () => {
  const blocks = [{ box: box(0, 0, 100, 20) }, { box: box(50, 0, 100, 20) }, { box: box(0, 100, 100, 20) }, { box: box(99, 0, 100, 20) }];

  assert.equal(countOverlaps(blocks), 2);
  assert.equal(countOverlaps([{ box: box(0, 0, 10, 10) }, { box: box(10, 0, 10, 10) }]), 0);
});

test("responsive metrics combine overflow, clipping and overlap", () => {
  const snapshot = { viewportWidth: 320, scrollWidth: 400, blocks: [{ box: box(0, 0, 50, 10), clipped: true }, { box: box(0, 0, 50, 10), clipped: false }] };

  assert.deepEqual(responsiveMetrics(snapshot), { viewportWidth: 320, scrollWidth: 400, overflows: true, overflowPx: 80, textBlocks: 2, clippedText: 1, overlappingText: 1 });
});
