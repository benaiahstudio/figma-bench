import assert from "node:assert/strict";
import test from "node:test";
import { countOverlaps, findOverlaps, detectOverflow, responsiveMetrics } from "../src/score/responsive.mjs";

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

  assert.deepEqual(responsiveMetrics(snapshot), {
    viewportWidth: 320,
    scrollWidth: 400,
    overflows: true,
    overflowPx: 80,
    textBlocks: 2,
    clippedText: 1,
    clippedOffenders: [{ text: "", box: { x: 0, y: 0, w: 50, h: 10 } }],
    clippedInScroller: 0,
    overlappingText: 1,
    overlapOffenders: [[{ text: "", box: { x: 0, y: 0, w: 50, h: 10 } }, { text: "", box: { x: 0, y: 0, w: 50, h: 10 } }]],
    overlappingInScroller: 0,
  });
});

test("offenders are listed with text and box, and scroller blocks are kept apart", () => {
  const long = "x".repeat(80);
  const snapshot = {
    viewportWidth: 320,
    scrollWidth: 320,
    blocks: [
      { text: long, box: box(0.4, 10, 300, 20), clipped: true, scroller: false },
      { text: "Chip", box: box(400, 10, 60, 20), clipped: true, scroller: true },
      { text: "Chip 2", box: box(420, 10, 60, 20), clipped: false, scroller: true },
    ],
  };
  const metrics = responsiveMetrics(snapshot);

  assert.equal(metrics.clippedText, 1);
  assert.equal(metrics.clippedInScroller, 1);
  assert.equal(metrics.clippedOffenders[0].text, `${"x".repeat(60)}...`);
  assert.deepEqual(metrics.clippedOffenders[0].box, { x: 0, y: 10, w: 300, h: 20 });
  assert.equal(metrics.overlappingText, 0);
  assert.equal(metrics.overlappingInScroller, 1);
  assert.equal(findOverlaps(snapshot.blocks).length, 1);
});
