import assert from "node:assert/strict";
import test from "node:test";
import { parseScoreArgs } from "../src/args.mjs";

test("the run number is found as a flag value, run=3, --run=3 or a third positional", () => {
  assert.deepEqual(parseScoreArgs(["ecommerce", "ours"], "3"), { target: "ecommerce", tool: "ours", run: "3" });
  assert.deepEqual(parseScoreArgs(["ecommerce", "ours", "run=3"]), { target: "ecommerce", tool: "ours", run: "3" });
  assert.deepEqual(parseScoreArgs(["ecommerce", "ours", "--run=4"]), { target: "ecommerce", tool: "ours", run: "4" });
  assert.deepEqual(parseScoreArgs(["ecommerce", "ours", "3"]), { target: "ecommerce", tool: "ours", run: "3" });
  assert.deepEqual(parseScoreArgs(["all"]), { target: "all", tool: undefined, run: undefined });
});
