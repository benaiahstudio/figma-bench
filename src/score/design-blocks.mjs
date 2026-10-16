import { hexToRgb } from "./colour.mjs";

const FLAT_PARENTS = new Set(["GROUP", "BOOLEAN_OPERATION"]);

function solidColour(node) {
  const fills = node.styles?.fills ?? node.runs?.[0]?.fills ?? [];
  const solid = fills.find((fill) => fill.type === "SOLID" && fill.color);

  return solid ? hexToRgb(solid.color) : null;
}

// Ground truth text blocks from design.json, in frame pixels. Child boxes are relative to the parent,
// except children of groups, which sit in the group's parent space.
export function designTextBlocks(design) {
  const blocks = [];

  const visit = (node, base) => {
    if (node.styles?.visible === false || node.styles?.opacity === 0) return;

    const box = { x: base.x + node.bounds.x, y: base.y + node.bounds.y, w: node.bounds.width, h: node.bounds.height };
    const text = typeof node.characters === "string" ? node.characters.trim() : "";

    if (node.type === "TEXT" && text !== "") blocks.push({ id: node.id, text, box, rgb: solidColour(node) });

    const childBase = FLAT_PARENTS.has(node.type) ? base : box;

    for (const child of node.children ?? []) visit(child, childBase);
  };

  visit({ ...design.root, bounds: { ...design.root.bounds, x: 0, y: 0 } }, { x: 0, y: 0 });

  return blocks;
}

export const frameSize = (design) => ({ w: design.root.bounds.width, h: design.root.bounds.height });
