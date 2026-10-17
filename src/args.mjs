const RUN_TOKEN = /^(?:--)?run=(.+)$/;

// npm can swallow "--run 3", so the run number may also come as run=3, --run=3 or a third positional.
// Returns { rest, run } where run is the raw string (or undefined) and rest has the run tokens removed.
export function extractRun(args, flagValue) {
  let run = flagValue;
  const rest = [];

  for (const arg of args) {
    const match = RUN_TOKEN.exec(arg);

    if (match) run = match[1];
    else rest.push(arg);
  }

  return { rest, run };
}

// score <benchId|all> [tool] [run]
export function parseScoreArgs(args, flagValue) {
  const { rest, run } = extractRun(args, flagValue);
  const [target, tool, positionalRun] = rest;

  return { target, tool, run: run ?? positionalRun };
}
