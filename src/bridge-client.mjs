import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const NOT_CONNECTED = "No Figma plugin is connected";
const SELECTION_LINE = /^- (\S+) "(.*)" (\S+) (\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/;
const STATUS_LINE = /^- "(.*?)" page "(.*?)" fileKey (.+)$/;

export function parseSelection(text) {
  return text.split("\n").flatMap((line) => {
    const match = SELECTION_LINE.exec(line.trim());

    return match ? [{ id: match[1], name: match[2], type: match[3], width: Number(match[4]), height: Number(match[5]) }] : [];
  });
}

export function parseStatus(text) {
  return text.split("\n").flatMap((line) => {
    const match = STATUS_LINE.exec(line.trim());

    return match ? [{ fileName: match[1], page: match[2], fileKey: match[3] }] : [];
  });
}

function startRpc(child) {
  const pending = new Map();
  let nextId = 1;
  let buffer = "";

  const settle = (message) => {
    const waiter = pending.get(message.id);

    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message ?? JSON.stringify(message.error)));
    else waiter.resolve(message.result);
  };

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buffer += chunk;

    for (let end = buffer.indexOf("\n"); end >= 0; end = buffer.indexOf("\n")) {
      const line = buffer.slice(0, end).trim();

      buffer = buffer.slice(end + 1);
      if (!line.startsWith("{")) continue;
      settle(JSON.parse(line));
    }
  });
  child.on("exit", (code) => {
    for (const waiter of pending.values()) waiter.reject(new Error(`Bridge server exited early (code ${code}).`));
    pending.clear();
  });

  return {
    notify: (method) => child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method })}\n`),
    request(method, params, timeoutMs) {
      const id = nextId++;
      const timer = new Promise((_, reject) => setTimeout(() => reject(new Error(`${method} timed out after ${timeoutMs} ms.`)), timeoutMs).unref());
      const reply = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));

      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);

      return Promise.race([reply, timer]);
    },
  };
}

function textOf(result) {
  return (result.content ?? []).map((part) => part.text ?? "").join("\n");
}

async function waitForPlugin(call, { connectTimeoutMs, pollMs }) {
  const deadline = Date.now() + connectTimeoutMs;

  for (;;) {
    const status = await call("figma_status", {});

    if (!status.text.includes(NOT_CONNECTED)) return status.text;
    if (Date.now() >= deadline) throw new Error(`${status.text}\nWaited ${connectTimeoutMs} ms for the plugin to connect.`);
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

// Starts the bridge server with cwd = cwd, waits for the Figma plugin, runs fn(client), then stops the server.
export async function withBridge({ serverPath, cwd, connectTimeoutMs = 30000, pollMs = 1000, callTimeoutMs = 180000 }, fn) {
  if (!existsSync(serverPath)) throw new Error(`Bridge server not found at ${serverPath}. Set FIGMA_BRIDGE_SERVER to its compiled index.js.`);

  const child = spawn(process.execPath, [serverPath], { cwd, stdio: ["pipe", "pipe", "inherit"] });
  const rpc = startRpc(child);

  const call = async (name, args) => {
    const result = await rpc.request("tools/call", { name, arguments: args }, callTimeoutMs);
    const text = textOf(result);

    if (result.isError) throw new Error(`${name} failed: ${text}`);

    return { text };
  };

  try {
    await rpc.request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "figma-bench", version: "0.1.0" } }, 30000);
    rpc.notify("notifications/initialized");

    const statusText = await waitForPlugin(call, { connectTimeoutMs, pollMs });

    return await fn({ call, statusText, files: parseStatus(statusText) });
  } finally {
    child.kill();
  }
}
