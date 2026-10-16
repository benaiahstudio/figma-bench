import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { MANIFEST_PATH } from "../src/config.mjs";
import { validateManifest } from "../src/manifest.mjs";

const valid = () => ({
  frames: [{ id: "a", category: "x", title: "T", creator: "C", creatorHandle: null, communityUrl: "https://www.figma.com/community/file/123", licence: "CC BY 4.0", fileName: null, nodeId: null, width: null, height: null }],
});

test("the shipped manifest is valid and lists ten frames", () => {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

  assert.deepEqual(validateManifest(manifest), []);
  assert.equal(manifest.frames.length, 10);
});

test("a recorded selection is accepted", () => {
  const manifest = valid();

  Object.assign(manifest.frames[0], { nodeId: "12:34", width: 1440, height: 900, fileName: "Kit" });
  assert.deepEqual(validateManifest(manifest), []);
});

test("bad entries are reported", () => {
  const manifest = valid();

  manifest.frames.push({ ...manifest.frames[0], communityUrl: "https://example.com", licence: "MIT", nodeId: "abc", width: 100, height: null });

  const problems = validateManifest(manifest).join("\n");

  assert.match(problems, /duplicate id/);
  assert.match(problems, /communityUrl/);
  assert.match(problems, /licence/);
  assert.match(problems, /nodeId/);
  assert.match(problems, /width and height/);
});
