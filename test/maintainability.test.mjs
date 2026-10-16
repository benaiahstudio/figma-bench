import assert from "node:assert/strict";
import test from "node:test";
import { analyseSource } from "../src/score/maintainability.mjs";

test("hard-coded colours and arbitrary values are counted, CSS variable definitions are not", () => {
  const tsx = [
    "export default function Page() {",
    '  return <div className="bg-[#fff] w-[342px] text-(--brand) p-4" style={{ color: "rgb(1,2,3)" }} />;',
    "}",
    "const Card = () => null;",
  ].join("\n");
  const stats = analyseSource(tsx, ".tsx");

  assert.equal(stats.hardCodedColours, 2);
  assert.equal(stats.arbitraryValues, 2);
  assert.equal(stats.arbitraryColours, 1);
  assert.equal(stats.variableUses, 1);
  assert.equal(stats.components, 2);

  const css = ":root {\n  --brand: #ff0000;\n}\n.a { color: #00ff00; background: var(--brand); }\n";
  const cssStats = analyseSource(css, ".css");

  assert.equal(cssStats.tokenDefinitions, 1);
  assert.equal(cssStats.hardCodedColours, 1);
  assert.equal(cssStats.variableUses, 1);
});
