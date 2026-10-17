import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Each metric reads one number out of a score file. Direction is for the reader only; nothing is judged here.
export const METRICS = [
  { key: "ssim", label: "SSIM (higher is closer)", digits: 3, read: (r) => r.visual.ssim },
  { key: "lumaCorrelation64", label: "Luma correlation 64x64 (higher is closer)", digits: 3, read: (r) => r.visual.lumaCorrelation64 },
  { key: "textDice", label: "Text match, Dice (higher is closer)", digits: 3, read: (r) => r.design2code.textDice },
  { key: "blockMatch", label: "Block match (higher is closer)", digits: 3, read: (r) => r.design2code.blockMatch },
  { key: "positionDistance", label: "Position distance, normalised (lower is closer)", digits: 3, read: (r) => r.design2code.positionDistance },
  { key: "colourDeltaE", label: "Text colour CIEDE2000 (lower is closer)", digits: 2, read: (r) => r.design2code.colourDeltaE },
  { key: "narrowOverflowPx", label: "Narrow overflow, px (lower is better)", digits: 0, read: (r) => r.responsive.narrow.overflowPx },
  { key: "wideOverflowPx", label: "Wide overflow, px (lower is better)", digits: 0, read: (r) => r.responsive.wide.overflowPx },
  { key: "clippedText", label: "Clipped text blocks, narrow + wide (lower is better)", digits: 0, read: (r) => r.responsive.narrow.clippedText + r.responsive.wide.clippedText },
  { key: "overlappingText", label: "Overlapping text pairs, narrow + wide (lower is better)", digits: 0, read: (r) => r.responsive.narrow.overlappingText + r.responsive.wide.overlappingText },
  { key: "hardCodedColours", label: "Hard-coded colours in source (lower is better)", digits: 0, read: (r) => r.maintainability.hardCodedColours },
  { key: "arbitraryValues", label: "Arbitrary Tailwind values in source (informational)", digits: 0, read: (r) => r.maintainability.arbitraryValues },
  { key: "tokenDefinitions", label: "CSS variables defined (informational)", digits: 0, read: (r) => r.maintainability.tokenDefinitions },
  { key: "variableUses", label: "CSS variable uses in source (informational)", digits: 0, read: (r) => r.maintainability.variableUses },
  { key: "components", label: "Components", digits: 0, read: (r) => r.maintainability.components },
  { key: "loc", label: "Lines of code", digits: 0, read: (r) => r.maintainability.loc },
];

export const flattenMetrics = (result) => Object.fromEntries(METRICS.map((metric) => [metric.key, metric.read(result)]));

export function mean(values) {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Sample standard deviation; null when there is only one value.
export function spread(values) {
  if (values.length < 2) return null;

  const centre = mean(values);

  return Math.sqrt(values.reduce((sum, value) => sum + (value - centre) ** 2, 0) / (values.length - 1));
}

const finite = (values) => values.filter((value) => typeof value === "number" && Number.isFinite(value));

// Groups score files by frame and tool. Returns Map("frame|tool" -> { runs, metrics: { key: { mean, spread } } }).
export function aggregate(results) {
  const groups = new Map();

  for (const result of results) {
    const key = `${result.benchId}|${result.tool}`;

    groups.set(key, [...(groups.get(key) ?? []), flattenMetrics(result)]);
  }

  const cells = new Map();

  for (const [key, rows] of groups) {
    const metrics = Object.fromEntries(METRICS.map(({ key: name }) => {
      const values = finite(rows.map((row) => row[name]));

      return [name, { mean: mean(values), spread: spread(values) }];
    }));

    cells.set(key, { runs: rows.length, metrics });
  }

  return cells;
}

function formatValue(stat, digits) {
  if (stat.mean === null) return "n/a";

  const base = stat.mean.toFixed(digits);

  return stat.spread === null ? base : `${base} ± ${stat.spread.toFixed(digits)}`;
}

function formatCell(cell, name, digits, expectedRuns) {
  if (!cell) return `partial (0/${expectedRuns})`;

  const text = formatValue(cell.metrics[name], digits);

  return cell.runs < expectedRuns ? `${text} (partial ${cell.runs}/${expectedRuns})` : text;
}

function overallCell(cells, frameIds, tool, name, digits, expectedRuns) {
  const present = frameIds.flatMap((id) => cells.get(`${id}|${tool}`) ?? []);
  const means = finite(present.map((cell) => cell.metrics[name].mean));
  const isPartial = present.length < frameIds.length || present.some((cell) => cell.runs < expectedRuns);

  if (means.length === 0) return `partial (0/${frameIds.length} frames)`;

  const text = formatValue({ mean: mean(means), spread: spread(means) }, digits);

  return isPartial ? `${text} (partial ${present.length}/${frameIds.length} frames)` : text;
}

export function orderTools(results) {
  const tools = [...new Set(results.map((result) => result.tool))].sort();

  return tools.includes("ours") ? ["ours", ...tools.filter((tool) => tool !== "ours")] : tools;
}

// One line per frame and tool listing the run numbers that have a score (any numbers, not just 1..3).
export function runsFound(results) {
  const found = new Map();

  for (const result of results) {
    const key = `${result.benchId}|${result.tool}`;

    found.set(key, [...(found.get(key) ?? []), result.run]);
  }

  return [...found].sort(([a], [b]) => a.localeCompare(b)).map(([key, runs]) => `- ${key.replace("|", " / ")}: run ${runs.sort((a, b) => a - b).join(", ")}`);
}

// Cells are mean ± sample standard deviation over runs. The Overall row is mean ± spread over the frame means.
export function renderReport({ frameIds, results, expectedRuns }) {
  const cells = aggregate(results);
  const tools = orderTools(results);
  const lines = ["# Results", "", `Cells show mean ± standard deviation over runs (expected ${expectedRuns} per frame and tool). "partial" means fewer runs or frames than expected. These are raw measurements, not pass or fail. Arbitrary Tailwind values are reported without judgement: pixel-exact Tailwind needs them. Runs scored after the scroller fix leave out of clipped and overlapping text any blocks inside deliberate horizontal scrollers.`, ""];

  const runLines = runsFound(results);

  if (runLines.length > 0) lines.push("Runs found:", "", ...runLines, "");

  for (const { key: name, label, digits } of METRICS) {
    lines.push(`## ${label}`, "", `| Frame | ${tools.join(" | ")} |`, `| --- |${tools.map(() => " --- |").join("")}`);
    for (const id of frameIds) lines.push(`| ${id} | ${tools.map((tool) => formatCell(cells.get(`${id}|${tool}`), name, digits, expectedRuns)).join(" | ")} |`);
    lines.push(`| **Overall** | ${tools.map((tool) => overallCell(cells, frameIds, tool, name, digits, expectedRuns)).join(" | ")} |`, "");
  }

  return `${lines.join("\n")}\n`;
}

const COMPLETE_SECTIONS = ["visual", "design2code", "responsive", "maintainability"];

// Reads every score file. Files that are not valid JSON or lack a section are skipped, so half-finished runs never break the report.
export function loadResults(resultsDir) {
  if (!existsSync(resultsDir)) return [];

  return readdirSync(resultsDir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? readdirSync(join(resultsDir, entry.name)).filter((file) => file.endsWith(".json")).flatMap((file) => readScore(join(resultsDir, entry.name, file))) : [],
  );
}

function readScore(path) {
  try {
    const result = JSON.parse(readFileSync(path, "utf8"));

    return COMPLETE_SECTIONS.every((section) => result[section]) ? [result] : [];
  } catch {
    return [];
  }
}
