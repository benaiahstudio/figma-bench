#!/usr/bin/env node
import { parseArgs } from "node:util";
import { exportFrames, listFrames, prepareApp, renderApp, scoreFrames, selectFrame, writeReport } from "./commands.mjs";

const USAGE = `Usage: npm run bench -- <command>

  list-frames                       Show the nodes currently selected in Figma (select all frames first)
  select <benchId> [--file <n>]     Record the selected frame in data/benchmark.json
  export <benchId|all> [--force]    Export the frozen reference into .scratch/runs/<benchId>/figma/
  prepare <benchId> <tool> <run#>   Create the empty app and BRIEF.md for one attempt
  render <benchId> <tool> <run#>    Build, serve and render at frame, narrow and wide widths
  score <benchId|all> [tool] [--run N] [--clip]
                                    Score rendered attempts into results/<benchId>/
  report                            Write results/RESULTS.md`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { file: { type: "string" }, force: { type: "boolean" }, clip: { type: "boolean" }, run: { type: "string" }, help: { type: "boolean" } },
});
const [command, ...args] = positionals;

const COMMANDS = {
  "list-frames": () => listFrames(),
  select: () => selectFrame(need(args[0], "benchId"), values),
  export: () => exportFrames(need(args[0], "benchId or all"), values),
  prepare: () => prepareApp(need(args[0], "benchId"), need(args[1], "tool"), need(args[2], "run#")),
  render: () => renderApp(need(args[0], "benchId"), need(args[1], "tool"), need(args[2], "run#")),
  score: () => scoreFrames(need(args[0], "benchId or all"), args[1], values),
  report: () => writeReport(),
};

function need(value, name) {
  if (!value) throw new Error(`Missing <${name}>.\n\n${USAGE}`);

  return value;
}

if (!command || values.help || !COMMANDS[command]) {
  console.log(USAGE);
  process.exit(command && !values.help ? 1 : 0);
}

try {
  await COMMANDS[command]();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
