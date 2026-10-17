import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { RESERVED_PORT } from "./config.mjs";

const HOST = "127.0.0.1";

export function freePort(reserved = RESERVED_PORT) {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.once("error", reject);
    server.listen(0, HOST, () => {
      const { port } = server.address();

      server.close(() => (port === reserved ? resolve(freePort(reserved)) : resolve(port)));
    });
  });
}

async function waitForUrl(url, server, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Preview server stopped early (code ${server.exitCode}).`);
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Preview server did not answer at ${url}.`);
}

// child.kill() leaves vite's children alive on Windows, so kill the whole tree there.
export function stopProcessTree(child) {
  if (child.exitCode !== null || !child.pid) return;
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      // Already gone.
    }
  } else {
    child.kill("SIGKILL");
  }
}

const npm = (args, cwd) => execFileSync("npm", args, { cwd, stdio: "inherit", shell: process.platform === "win32" });

// Builds the app, serves it on a free port bound to 127.0.0.1, runs fn(url), and always stops the server.
export async function withPreview(app, fn) {
  const vite = join(app, "node_modules", "vite", "bin", "vite.js");

  if (!existsSync(vite)) npm(["install", "--no-audit", "--no-fund"], app);
  execFileSync(process.execPath, [vite, "build"], { cwd: app, stdio: "inherit" });

  const port = await freePort();
  const server = spawn(process.execPath, [vite, "preview", "--port", String(port), "--strictPort", "--host", HOST], { cwd: app, stdio: "ignore" });
  const stop = () => stopProcessTree(server);

  process.once("exit", stop);

  try {
    const url = `http://${HOST}:${port}/`;

    await waitForUrl(url, server);

    return await fn(url);
  } finally {
    stop();
    process.removeListener("exit", stop);
  }
}
