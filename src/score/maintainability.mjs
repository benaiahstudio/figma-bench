import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".html"]);
const SKIPPED_DIRS = new Set(["node_modules", "dist", "public", "reference"]);
// Template boilerplate that every attempt shares.
const SKIPPED_FILES = new Set(["src/main.tsx", "src/vite-env.d.ts", "vite.config.ts", "index.html"]);

const HEX_COLOUR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
const FUNCTION_COLOUR = /\b(?:rgba?|hsla?|oklch|oklab)\(/g;
const ARBITRARY_VALUE = /(?<![\w-])!?-?[a-z][a-z0-9:-]*-\[[^\]\s]+\]/g;
const TOKEN_DEFINITION = /^\s*--[\w-]+\s*:/;
const VARIABLE_USE = /var\(\s*--|\(--[\w-]+\)/g;
const COMPONENT_PATTERNS = [/^(?:export\s+)?(?:default\s+)?function\s+[A-Z]\w*/gm, /^(?:export\s+)?const\s+[A-Z]\w*\s*(?::[^=]+)?=\s*(?:\(|memo\(|forwardRef\(|React\.)/gm];

const countMatches = (text, pattern) => (text.match(pattern) ?? []).length;

function listSourceFiles(dir, root, found = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) {
      if (!SKIPPED_DIRS.has(name)) listSourceFiles(path, root, found);
    } else if (SOURCE_EXTENSIONS.has(extname(name)) && !SKIPPED_FILES.has(relative(root, path).replaceAll("\\", "/"))) {
      found.push(path);
    }
  }

  return found;
}

// Lines that define a CSS variable are the tokens themselves, so their colours are not "hard-coded".
export function analyseSource(text, extension) {
  const lines = text.split("\n");
  const isCss = extension === ".css";
  const tokenLines = isCss ? lines.filter((line) => TOKEN_DEFINITION.test(line)) : [];
  const codeText = isCss ? lines.filter((line) => !TOKEN_DEFINITION.test(line)).join("\n") : text;
  const arbitrary = codeText.match(ARBITRARY_VALUE) ?? [];

  return {
    loc: lines.filter((line) => line.trim() !== "").length,
    hardCodedColours: countMatches(codeText, HEX_COLOUR) + countMatches(codeText, FUNCTION_COLOUR),
    arbitraryValues: arbitrary.length,
    arbitraryColours: arbitrary.filter((value) => /\[(?:#|rgb|hsl|oklch)/.test(value)).length,
    variableUses: countMatches(codeText, VARIABLE_USE),
    tokenDefinitions: tokenLines.length,
    components: COMPONENT_PATTERNS.reduce((sum, pattern) => sum + countMatches(text, pattern), 0),
  };
}

export function maintainability(appPath) {
  const files = listSourceFiles(appPath, appPath);
  const totals = { files: files.length, loc: 0, components: 0, hardCodedColours: 0, arbitraryValues: 0, arbitraryColours: 0, variableUses: 0, tokenDefinitions: 0 };

  for (const file of files) {
    const stats = analyseSource(readFileSync(file, "utf8"), extname(file));

    for (const key of Object.keys(stats)) totals[key] += stats[key];
  }

  return totals;
}
