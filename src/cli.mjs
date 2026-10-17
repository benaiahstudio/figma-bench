#!/usr/bin/env node
import { parseArgs } from "node:util";
import { parseScoreArgs } from "./args.mjs";
import { exportFrames, listFrames, outline, prepareApp, renderApp, scoreFrames, selectFrame, writeReport } from "./commands.mjs";

const USAGE = `Usage: npm run bench -- <command>

  list-frames                       Show the nodes currently selected in Figma (select all frames first)
  select <benchId> [--file <n>]     Record the selected frame in data/benchmark.json
  outline [--file <n>]              List pages and top-level frames of the connected Figma file(s)
  export <benchId|all> [--force]    Export the frozen reference into .scratch/runs/<benchId>/figma/
  export --node <id> --file <n> [--out <dir>]
                                    Export any node (no manifest change) into .scratch/exports/<id>/
  prepare <benchId> <tool> <run#>   Create the empty app, BRIEF.md and work/ folder for one attempt
  render <benchId> <tool> <run#>    Build, serve (own server, stopped after) and render at frame, narrow and wide widths
  score <benchId|all> [tool] [run#] [--clip]
                                    Score rendered attempts into results/<benchId>/
                                    npm eats "--run", so write: npm run bench -- score ecommerce ours 3
                                    (run=3 and --run=3 also work; with no run, every rendered run is scored)
  report                            Write results/RESULTS.md`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { file: { type: "string" }, node: { type: "string" }, out: { type: "string" }, force: { type: "boolean" }, clip: { type: "boolean" }, run: { type: "string" }, help: { type: "boolean" } },
});
const [command, ...args] = positionals;

const COMMANDS = {
  "list-frames": () => listFrames(),
  select: () => selectFrame(need(args[0], "benchId"), values),
  outline: () => outline(values),
  export: () => exportFrames(values.node ? undefined : need(args[0], "benchId or all"), values),
  prepare: () => prepareApp(need(args[0], "benchId"), need(args[1], "tool"), need(args[2], "run#")),
  render: () => renderApp(need(args[0], "benchId"), need(args[1], "tool"), need(args[2], "run#")),
  score: () => {
    const { target, tool, run } = parseScoreArgs(args, values.run);

    return scoreFrames(need(target, "benchId or all"), tool, { ...values, run });
  },
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
