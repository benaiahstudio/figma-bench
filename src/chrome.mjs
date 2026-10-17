import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

// Returns the first complete top-level JSON object in the text. The CLI can print notices before or after it.
export function parseCliJson(text) {
  const start = text.indexOf("{");

  if (start < 0) throw new Error(`No JSON in chrome-devtools output: ${text.slice(0, 200)}`);

  let depth = 0;
  let inString = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (char === "\\") i++;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth++;
    } else if (char === "}" && --depth === 0) {
      return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error(`Incomplete JSON in chrome-devtools output: ${text.slice(0, 200)}`);
}

const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// new_page sometimes answers with no page list (or fails outright); retry with a growing pause.
export function openPageId(cli, { tries = 8, sleep = sleepSync, baseDelayMs = 500 } = {}) {
  let lastProblem = "";

  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const pages = parseCliJson(cli(["new_page", "about:blank"])).pages ?? [];
      const page = pages.find((entry) => entry.selected) ?? pages[0];

      if (page) return String(page.id);
      lastProblem = "new_page returned no pages";
    } catch (error) {
      lastProblem = error.message;
    }
    if (attempt < tries) sleep(Math.min(baseDelayMs * attempt, 4000));
  }
  throw new Error(`Could not open a browser page after ${tries} tries: ${lastProblem}`);
}

// Chrome shows its own page when the server is unreachable; scoring that page would give a meaningless number.
export function detectErrorPage({ href = "", title = "", text = "" }) {
  const head = `${title}\n${text.slice(0, 600)}`;

  if (href.startsWith("chrome-error://")) return `Chrome error page (${href})`;

  const known = head.match(/refused to connect|This site can.t be reached|\bERR_[A-Z_]+/i);

  return known ? `Chrome error page ("${known[0]}")` : null;
}

// Headless Chrome through the chrome-devtools-mcp command line (same approach as the render helper).
export function openChrome({ width, height, dpr = 1, cli: injected, sleep }) {
  let cliPath;
  let sessionId;

  if (!injected) {
    const npmRoot = execFileSync("npm", ["root", "-g"], { shell: process.platform === "win32", encoding: "utf8" }).trim();

    cliPath = join(npmRoot, "chrome-devtools-mcp", "build", "src", "bin", "chrome-devtools.js");
    if (!existsSync(cliPath)) throw new Error("chrome-devtools-mcp not found. Run: npm i -g chrome-devtools-mcp@1.10.1");
    sessionId = `fb-${process.pid}-${Date.now()}`;
  }

  const cli =
    injected ??
    ((args) =>
      execFileSync(process.execPath, [cliPath, "--sessionId", sessionId, ...args, "--output-format", "json"], {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      }));
  const pageId = openPageId(cli, { sleep });

  cli(["emulate", pageId, "--viewport", `${width}x${height}x${dpr}`]);

  return {
    open: (url) => cli(["navigate_page", pageId, "--type", "url", "--url", url]),
    // The CLI returns the script result as JSON inside a markdown code fence in a "message" field.
    evaluate(fn) {
      const reply = cli(["evaluate_script", fn, "--pageId", pageId]);
      const message = parseCliJson(reply).message;
      const body = message.match(/```json\n([\s\S]*?)\n```/);

      return JSON.parse(body ? body[1] : "null");
    },
    close() {
      if (injected) return;
      try {
        execFileSync(process.execPath, [cliPath, "--sessionId", sessionId, "stop"], { stdio: "ignore" });
      } catch {
        // Nothing to stop if the browser never started.
      }
    },
  };
}
