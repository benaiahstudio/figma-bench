import assert from "node:assert/strict";
import test from "node:test";
import { parseSelection, parseStatus } from "../src/bridge-client.mjs";
import { viewportWidths } from "../src/brief.mjs";

test("selection lines are parsed, including names with quotes", () => {
  const text = '- 12:34 "Home "v2"" FRAME 1440x900\n- 1:2 "Card" COMPONENT 320.5x200';

  assert.deepEqual(parseSelection(text), [
    { id: "12:34", name: 'Home "v2"', type: "FRAME", width: 1440, height: 900 },
    { id: "1:2", name: "Card", type: "COMPONENT", width: 320.5, height: 200 },
  ]);
  assert.deepEqual(parseSelection("Nothing is selected in Figma."), []);
});

test("status lines are parsed", () => {
  assert.deepEqual(parseStatus('Connected files:\n- "Kit" page "Page 1" fileKey abc123'), [{ fileName: "Kit", page: "Page 1", fileKey: "abc123" }]);
});

test("status fileKeys run to end of line, with spaces, brackets, emoji and dashes", () => {
  const text = [
    'Connected files:',
    '- "E-Commerce Website Interface Kit + Design System [Completely Free] (Community)" page "📕 Cover" fileKey local-E-Commerce Website Interface Kit + Design System [Completely Free] (Community)',
    '- "❖ Untitled UI – FREE Figma UI kit and design system v2.0 (Community)" page "❖ Getting started" fileKey local-❖ Untitled UI – FREE Figma UI kit and design system v2.0 (Community)',
    '- "Ecommerce App UI Kit (Freebie) (Community)" page "🖼️ Cover" fileKey local-Ecommerce App UI Kit (Freebie) (Community)',
  ].join("\n");

  assert.deepEqual(parseStatus(text), [
    {
      fileName: "E-Commerce Website Interface Kit + Design System [Completely Free] (Community)",
      page: "📕 Cover",
      fileKey: "local-E-Commerce Website Interface Kit + Design System [Completely Free] (Community)",
    },
    {
      fileName: "❖ Untitled UI – FREE Figma UI kit and design system v2.0 (Community)",
      page: "❖ Getting started",
      fileKey: "local-❖ Untitled UI – FREE Figma UI kit and design system v2.0 (Community)",
    },
    {
      fileName: "Ecommerce App UI Kit (Freebie) (Community)",
      page: "🖼️ Cover",
      fileKey: "local-Ecommerce App UI Kit (Freebie) (Community)",
    },
  ]);
});

test("viewport widths follow x0.75 (min 320) and x1.5", () => {
  assert.deepEqual(viewportWidths(1440), { frame: 1440, narrow: 1080, wide: 2160 });
  assert.deepEqual(viewportWidths(375), { frame: 375, narrow: 320, wide: 563 });
});
