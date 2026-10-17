import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import test from "node:test";

import { loadConfig, ROOT } from "../src/config.mjs";

const sibling = resolve(ROOT, "..", "figma-to-code");

test("defaults point at the sibling figma-to-code folder", () => {
  const config = loadConfig({});

  assert.equal(config.bridgeServer, join(sibling, "bridge", "dist", "server", "index.js"));
  assert.equal(config.toolkitDir, join(sibling, "toolkit"));
  assert.equal(config.expectedRuns, 3);
});

test("environment variables override the defaults", () => {
  const config = loadConfig({ FIGMA_BRIDGE_SERVER: "/x/server.js", FIGMA_TOOLKIT_DIR: "/x/kit", BENCH_EXPECTED_RUNS: "5" });

  assert.equal(config.bridgeServer, "/x/server.js");
  assert.equal(config.toolkitDir, "/x/kit");
  assert.equal(config.expectedRuns, 5);
});
