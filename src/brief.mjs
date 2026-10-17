const MIN_NARROW = 320;

// Frame width, a narrower width (x0.75, never below 320) and a wider one (x1.5).
export function viewportWidths(width) {
  return { frame: width, narrow: Math.max(MIN_NARROW, Math.round(width * 0.75)), wide: Math.round(width * 1.5) };
}

function toolSection(tool, figmaPath) {
  if (tool === "ours") {
    return [
      "## Tool: ours",
      "",
      "Use the `figma-to-code` skill. The Figma export is already done (frozen, read-only); read it from:",
      "",
      `    ${figmaPath}`,
      "",
      "It holds design.json, variables.json, styles.json, figma-css.json, screenshot@2x.png and assets/.",
      "Write the spec, tokens and any renders to `work/` (never into the export folder).",
    ].join("\n");
  }

  return [
    `## Tool: ${tool}`,
    "",
    "Generate the code with this tool from the same Figma frame, then paste its exported code into this app:",
    "the page goes in `app/src/Page.tsx`, any other files under `app/src/`. Edit by hand only what is needed to make it build,",
    "and write each manual edit in `work/NOTES.md`.",
  ].join("\n");
}

export function renderBrief(template, { frame, tool, figmaPath, workPath }) {
  const widths = viewportWidths(frame.width);
  const values = {
    TITLE: frame.title,
    WIDTH: frame.width,
    HEIGHT: frame.height,
    NARROW: widths.narrow,
    WIDE: widths.wide,
    FIGMA: figmaPath,
    WORK: workPath,
    TOOL_SECTION: toolSection(tool, figmaPath),
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(values[key]));
}
