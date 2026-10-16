import assert from "node:assert/strict";
import test from "node:test";
import { downsample, pearson, ssim } from "../src/score/image.mjs";

const gradient = (size, shift = 0) => ({ width: size, height: size, data: Float64Array.from({ length: size * size }, (_, i) => ((i % size) * 4 + shift) % 256) });

test("ssim is 1 for identical images and lower for different ones", () => {
  const a = gradient(32);

  assert.ok(Math.abs(ssim(a, a) - 1) < 1e-12);
  assert.ok(ssim(a, gradient(32, 97)) < 0.99);
});

test("pearson correlation and downsampling", () => {
  assert.ok(Math.abs(pearson([1, 2, 3, 4], [2, 4, 6, 8]) - 1) < 1e-12);
  assert.ok(Math.abs(pearson([1, 2, 3, 4], [4, 3, 2, 1]) + 1) < 1e-12);
  assert.equal(pearson([5, 5], [5, 5]), 1);
  assert.deepEqual([...downsample({ width: 2, height: 2, data: Float64Array.from([0, 10, 20, 30]) }, 1)], [15]);
});
