import assert from "node:assert/strict";
import test from "node:test";
import { assignMinCost, design2code, pairBlocks } from "../src/score/pairing.mjs";

const block = (text, x, y, rgb = [0, 0, 0]) => ({ text, box: { x, y, w: 100, h: 20 }, rgb });
const frame = { w: 400, h: 400 };

test("the assignment picks the cheapest total, not the greedy choice", () => {
  const cost = [
    [1, 2],
    [1, 100],
  ];

  assert.deepEqual(assignMinCost(cost).sort(), [[0, 1], [1, 0]]);
});

test("the assignment handles more rows than columns", () => {
  assert.deepEqual(assignMinCost([[5], [1], [9]]), [[1, 0]]);
});

test("repeated labels are paired by position", () => {
  const design = [block("Buy now", 0, 0), block("Buy now", 0, 300)];
  const render = [block("Buy now", 0, 310), block("Buy now", 0, 10)];

  assert.deepEqual(pairBlocks(design, render, frame).sort((a, b) => a.design - b.design), [{ design: 0, render: 1 }, { design: 1, render: 0 }]);
});

test("unrelated text is never paired", () => {
  assert.deepEqual(pairBlocks([block("Pricing", 0, 0)], [block("Contact us", 0, 0)], frame), []);
});

test("design2code reports matches, areas and colour on matched pairs only", () => {
  const design = [block("Hello world", 0, 0, [255, 0, 0]), block("Only in design", 0, 100)];
  const render = [block("Hello world", 0, 10, [255, 0, 0]), block("Extra", 0, 200)];
  const scores = design2code(design, render, frame);

  assert.equal(scores.matched, 1);
  assert.equal(scores.textDice, 1);
  assert.equal(scores.colourDeltaE, 0);
  assert.equal(scores.blockMatch, 0.5);
  assert.ok(Math.abs(scores.positionDistance - 10 / 400) < 1e-12);
});

test("design2code on empty input gives nulls, not NaN", () => {
  const scores = design2code([], [], frame);

  assert.equal(scores.textDice, null);
  assert.equal(scores.blockMatch, null);
});
