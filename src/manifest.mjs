import { readFileSync, writeFileSync } from "node:fs";
import { MANIFEST_PATH } from "./config.mjs";

const REQUIRED_TEXT = ["id", "category", "title", "creator", "communityUrl", "licence"];
const COMMUNITY_URL = /^https:\/\/www\.figma\.com\/community\/file\/\d+$/;
const NODE_ID = /^\d+:\d+$/;
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

const isPositive = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;

function checkEntry(entry, index) {
  const label = `frames[${index}] (${entry?.id ?? "no id"})`;
  const problems = [];

  for (const key of REQUIRED_TEXT) {
    if (typeof entry[key] !== "string" || entry[key] === "") problems.push(`${label}: "${key}" must be a non-empty string`);
  }
  if (entry.id && !ID_PATTERN.test(entry.id)) problems.push(`${label}: id must be lowercase letters, digits and dashes`);
  if (entry.communityUrl && !COMMUNITY_URL.test(entry.communityUrl)) problems.push(`${label}: communityUrl must be a Figma Community file link`);
  if (entry.licence && entry.licence !== "CC BY 4.0") problems.push(`${label}: licence must be "CC BY 4.0"`);
  if (entry.creatorHandle !== null && !/^@\S+$/.test(entry.creatorHandle ?? "")) problems.push(`${label}: creatorHandle must be null or start with @`);
  if (entry.fileName !== null && typeof entry.fileName !== "string") problems.push(`${label}: fileName must be null or a string`);
  if (entry.nodeId !== null && !NODE_ID.test(entry.nodeId ?? "")) problems.push(`${label}: nodeId must be null or look like 12:34`);

  const sizes = [entry.width, entry.height];

  if (!sizes.every((size) => size === null) && !sizes.every(isPositive)) problems.push(`${label}: width and height must both be null or both positive numbers`);

  return problems;
}

export function validateManifest(manifest) {
  if (!Array.isArray(manifest?.frames)) return ["manifest.frames must be an array"];

  const problems = manifest.frames.flatMap(checkEntry);
  const seen = new Set();

  for (const { id } of manifest.frames) {
    if (seen.has(id)) problems.push(`duplicate id "${id}"`);
    seen.add(id);
  }

  return problems;
}

export function loadManifest(path = MANIFEST_PATH) {
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  const problems = validateManifest(manifest);

  if (problems.length > 0) throw new Error(`Invalid manifest:\n${problems.join("\n")}`);

  return manifest;
}

export function saveManifest(manifest, path = MANIFEST_PATH) {
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
}

export function findFrame(manifest, id) {
  const frame = manifest.frames.find((entry) => entry.id === id);

  if (!frame) throw new Error(`Unknown frame "${id}". Known: ${manifest.frames.map((entry) => entry.id).join(", ")}.`);

  return frame;
}

export function pickFrames(manifest, idOrAll) {
  return idOrAll === "all" ? manifest.frames : [findFrame(manifest, idOrAll)];
}
