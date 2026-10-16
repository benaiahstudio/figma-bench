import assert from "node:assert/strict";
import test from "node:test";
import { ciede2000 } from "../src/score/colour.mjs";
import { dice, positionDistance } from "../src/score/text-metrics.mjs";

// Reference pairs from Sharma, Wu and Dalal (2005), "The CIEDE2000 colour-difference formula".
const SHARMA = [
  [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
  [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
  [[50, 2.8361, -74.02], [50, 0, -82.7485], 3.4412],
  [[50, -1.3802, -84.2814], [50, 0, -82.7485], 1.0],
  [[50, -1.1848, -84.8006], [50, 0, -82.7485], 1.0],
  [[50, -0.9009, -85.5211], [50, 0, -82.7485], 1.0],
  [[50, 0, 0], [50, -1, 2], 2.3669],
  [[50, -1, 2], [50, 0, 0], 2.3669],
  [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
  [[63.0109, -31.0961, -5.8663], [62.8187, -29.7946, -4.0864], 1.263],
  [[61.2901, 3.7196, -5.3901], [61.4292, 2.248, -4.962], 1.8731],
  [[35.0831, -44.1164, 3.7933], [35.0232, -40.0716, 1.5901], 1.8645],
  [[22.7233, 20.0904, -46.694], [23.0331, 14.973, -42.5619], 2.0373],
  [[36.4612, 47.858, 18.3852], [36.2715, 50.5065, 21.2231], 1.4146],
  [[90.8027, -2.0831, 1.441], [91.1528, -1.6435, 0.0447], 1.4441],
  [[90.9257, -0.5406, -0.9208], [88.6381, -0.8985, -0.7239], 1.5381],
  [[6.7747, -0.2908, -2.4247], [5.8714, -0.0985, -2.2286], 0.6377],
  [[2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514], 0.9082],
];

test("CIEDE2000 matches the Sharma 2005 reference pairs", () => {
  for (const [lab1, lab2, expected] of SHARMA) {
    assert.ok(Math.abs(ciede2000(lab1, lab2) - expected) < 1e-4, `${lab1} vs ${lab2}: expected ${expected}, got ${ciede2000(lab1, lab2)}`);
  }
});

test("dice scores identical, similar and unrelated text", () => {
  assert.equal(dice("Hello  World", "hello world"), 1);
  assert.equal(dice("night", "nacht"), 0.25);
  assert.equal(dice("abc", "xyz"), 0);
  assert.equal(dice("a", "b"), 0);
});

test("position distance is normalised by the frame size", () => {
  const frame = { w: 100, h: 200 };

  assert.equal(positionDistance({ x: 0, y: 0, w: 10, h: 10 }, { x: 0, y: 0, w: 10, h: 10 }, frame), 0);
  assert.equal(positionDistance({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 }, frame), 0.1);
  assert.ok(Math.abs(positionDistance({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 20, w: 10, h: 10 }, frame) - Math.hypot(0.1, 0.1)) < 1e-12);
});
