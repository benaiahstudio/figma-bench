import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

// The CLI can print notices around its JSON, so take the longest valid JSON object that starts at the first brace.
export function parseCliJson(text) {
  const start = text.indexOf("{");

  for (let end = text.lastIndexOf("}"); end > start; end = text.lastIndexOf("}", end - 1)) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      // Try a shorter slice.
    }
  }
  throw new Error(`No JSON in chrome-devtools output: ${text.slice(0, 200)}`);
}

// Headless Chrome through the chrome-devtools-mcp command line (same approach as the render helper).
export function openChrome({ width, height, dpr = 1 }) {
  const npmRoot = execFileSync("npm", ["root", "-g"], { shell: process.platform === "win32", encoding: "utf8" }).trim();
  const cliPath = join(npmRoot, "chrome-devtools-mcp", "build", "src", "bin", "chrome-devtools.js");

  if (!existsSync(cliPath)) throw new Error("chrome-devtools-mcp not found. Run: npm i -g chrome-devtools-mcp@1.10.1");

  const sessionId = `fb-${process.pid}-${Date.now()}`;
  const cli = (args) =>
    execFileSync(process.execPath, [cliPath, "--sessionId", sessionId, ...args, "--output-format", "json"], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  const opened = cli(["new_page", "about:blank"]);
  const pageId = String(parseCliJson(opened).pages.find((page) => page.selected).id);

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
      try {
        execFileSync(process.execPath, [cliPath, "--sessionId", sessionId, "stop"], { stdio: "ignore" });
      } catch {
        // Nothing to stop if the browser never started.
      }
    },
  };
}
