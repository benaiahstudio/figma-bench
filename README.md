# figma-bench

A benchmark harness for tools that turn Figma designs into code. It gives every tool the same ten frames, the
same written brief and the same starter project, then measures the result with a scorer that is separate from
any tool being tested.

## What it measures, and why

Looking at two screenshots and saying "close enough" is not a measurement. The scorer writes raw numbers for
each attempt and never decides pass or fail. You read the numbers and decide.

| Group | Numbers | What it tells you |
| --- | --- | --- |
| Visual | SSIM, 16x16 and 64x64 luma correlation, optional CLIP | How much the rendered page looks like the Figma screenshot. |
| Design2Code-style | text match, block match, position, colour | Whether the right words are on the page, in the right place, in the right colour. Uses Figma's own data (`design.json`) as the answer key. |
| Responsiveness | horizontal overflow, clipped text, overlapping text, at a narrower and a wider width | Whether the page holds together when the screen is not exactly the design size. |
| Maintainability | hard-coded colours, arbitrary Tailwind values, variable uses, components, files, lines of code | Whether the code reads like a human wrote it with design tokens, or is a pile of one-off values. |

The Design2Code-style metrics follow the definitions in *Design2Code: How Far Are We From Automating Front-End
Engineering?* (arXiv 2403.03163). This is our own implementation written from those definitions; none of their
code is used.

- **Text match**: Sørensen-Dice similarity of the text in each matched pair of blocks, averaged.
- **Block match**: the area of matched blocks (both sides) divided by the area of all blocks (both sides).
- **Position**: the distance between the centres of matched blocks, with x divided by the frame width and y by
  the frame height, averaged. Lower is closer.
- **Colour**: the CIEDE2000 colour difference between matched text colours, averaged. Lower is closer.

Blocks are paired by text similarity (at least 0.5) with position as a tie-breaker, using an optimal
(Hungarian) assignment so repeated labels like "Buy now" pair with the nearest copy.

The scorer deliberately does not reuse the thresholds or pass/fail logic of the tool's own diff helper.

## What you need

- Node 22 or newer and npm.
- Figma Desktop with the bridge plugin running (only for `list-frames`, `select` and `export`).
- The bridge server and the rendering helper from the Figma-to-code toolkit (see Configuration).
- `chrome-devtools-mcp` installed globally: `npm i -g chrome-devtools-mcp@1.10.1`.
- Python 3 only if you want the optional CLIP score.

```
npm install
npm test
```

## Configuration

Everything machine-specific comes from environment variables. Nothing is hard-coded.

| Variable | Meaning | Default |
| --- | --- | --- |
| `FIGMA_BRIDGE_SERVER` | Compiled bridge MCP server entry point (`index.js`) | `~/cc-figma-bridge/dist/server/index.js` |
| `FIGMA_TOOLKIT_DIR` | Folder containing `figma-render.mjs` | `~/.claude/scripts/figma` |
| `BENCH_PYTHON` | Python for the optional CLIP score | `python` on Windows, `python3` elsewhere |
| `BENCH_EXPECTED_RUNS` | Runs per frame and tool that count as complete | `3` |

See `.env.example`. Output goes in `.scratch/runs/` inside this folder. That location is required: the bridge
server only writes to the `.scratch/` folder of the git repository it is started in (or the system temp folder).

## Getting the design files

1. Open each link in `NOTICE.md` and press "Open in Figma" to copy the file into your own drafts.
2. Note each file's name as it appears in your drafts. `select` records it for you.
3. The `.fig` files are not part of this repository (see `NOTICE.md`).

## Commands

Run each as `npm run bench -- <command>`.

1. `list-frames`: prints what is selected in Figma right now (id, size, type, name). The bridge has no "list the
   frames on this page" call, so select the frames first (Ctrl+A on the page selects all top-level frames).
2. `select <benchId>`: select exactly one frame in Figma, then run this. It writes the node id, size and file
   name into `data/benchmark.json`. Do this once per frame.
   `outline [--file <name>]` lists every page and its top-level frames (id, name, size) through the bridge, so you
   can pick a node id without selecting anything in Figma.
3. `export <benchId|all>`: exports the frozen reference into `.scratch/runs/<benchId>/figma/` (screenshot,
   `design.json`, variables, styles, assets). It will not overwrite an existing export unless you pass `--force`.
   `export --node <id> --file <name> [--out <dir>]` exports any node without touching the manifest, into
   `.scratch/exports/<id>/` by default.
4. `prepare <benchId> <tool> <run#>`: creates `.scratch/runs/<benchId>/<tool>/run<N>/app`, a Vite + React +
   TypeScript + Tailwind v4 project with an empty `src/Page.tsx`, the reference screenshot and the assets. Next to
   `app/` it writes `run<N>/BRIEF.md` and an empty `run<N>/work/` folder for specs, tokens and renders. The frozen
   export stays read-only; code goes in `app/`, everything else in `work/`.
5. `render <benchId> <tool> <run#>`: installs dependencies if needed, builds, serves with `vite preview` on a
   free port (never 5199, bound to 127.0.0.1), and renders at the frame size (device pixel ratio 2), a narrow width (x0.75, at least
   320) and a wide width (x1.5). It also saves the page's text blocks and width figures as `dom-*.json`. The server is always stopped afterwards (the
   whole process tree), so nothing is left running. If Chrome shows its own error page (for example "refused to
   connect") the render stops with an error instead of producing a score. Chrome start-up is retried, and a render
   that stopped half way resumes with the widths it already captured; `meta.json` is written last, so only
   complete renders get scored. Re-running a finished render redoes all widths.
6. `score <benchId|all> [tool] [run#] [--clip]`: scores every rendered attempt and writes
   `results/<benchId>/<tool>-run<N>.json`. npm swallows `--run`, so pass the run number as a plain third argument:
   `npm run bench -- score ecommerce ours 3` (`run=3` and `--run=3` also work). Run numbers can be anything
   (2, 3, 4 after a failed run 1); folders without a finished render are ignored. The responsive section lists
   each clipped or overlapping text block (snippet and box). Text inside a horizontal scroller
   (`overflow-x: auto/scroll`) is counted apart as `clippedInScroller` and is not a defect.
7. `report`: writes `results/RESULTS.md`. One table per metric, rows are frames, columns are tools, cells are
   mean ± standard deviation over runs, plus an Overall row. Anything with fewer runs or frames than expected
   is marked "partial". It also lists the run numbers found. Arbitrary Tailwind values, CSS variables defined and
   CSS variable uses are shown as plain information, not as good or bad: pixel-exact Tailwind needs arbitrary values.

### Running frame 1 (landing)

```
npm run bench -- select landing
npm run bench -- export landing
npm run bench -- prepare landing ours 1
```

Let the tool build the page in the `app` folder (see BRIEF.md), then:

```
npm run bench -- render landing ours 1
npm run bench -- score landing ours
npm run bench -- report
```

### Optional CLIP score

`score --clip` also runs `scripts/clip_score.py`, which compares the two screenshots with a CLIP model
(ViT-B/32, on the CPU). It is optional because the first run downloads the model (about 350 MB). To use it:
`pip install -r scripts/requirements-clip.txt`, then add `--clip`.

## Fairness rules

- Every tool gets the same brief (`template/BRIEF.md`), the same frame and the same framework: Vite, React,
  TypeScript, Tailwind v4. Only the final tool-specific paragraph of the brief differs.
- Three runs per frame and tool. Report the spread, not just the best run.
- Free tiers only. If a tool hits its limit before a run finishes, leave that run out and let the report say
  "partial". Do not top up credits to finish.
- Where tools use an LLM through MCP, use the same model for all of them when possible and write the model name
  in your notes.
- Edit generated code by hand only to make it build. Write each manual edit in `NOTES.md` inside the app.
- The reference export is frozen. Do not re-export a frame in the middle of a comparison.
- Do not look at a tool's scores before all its runs for a frame are done.

## Adding a tool

There is no tool list to edit. A tool is just a name (lowercase letters, digits, dashes).

1. `npm run bench -- prepare <benchId> <tool> <run#>`.
2. Generate the code with the tool from the same Figma frame. Copy its exported code into the `app` folder: the
   page into `src/Page.tsx`, other files under `src/`. The brief says the same.
3. `render`, then `score`. The new tool appears as a new column in the report.

The tool named `ours` gets one extra paragraph in its brief pointing at the Figma export folder and the
`cc-figma-to-code` skill. Any other name gets the paste-your-code paragraph.

## What the scorer can and cannot see

- Text blocks are matched. Images, icons and shapes are only seen through the visual scores.
- A page taller than the frame is still compared against the frame-sized screenshot.
- Maintainability numbers come from simple pattern counting on the source. They are signals, not proof.
- The harness folder lives wherever you clone it. If that is inside a cloud-synced folder, exclude
  `node_modules` and `.scratch` from syncing; both are git-ignored.

## Layout

```
data/benchmark.json   the ten frames (ids, credits, recorded node ids and sizes)
src/                  CLI, bridge client, rendering and scoring code
src/score/            independent scorer
template/             starter app and the fixed brief
scripts/              optional CLIP scorer
test/                 node --test suite
results/              score files and RESULTS.md
.scratch/runs/        exports, apps and renders (git-ignored)
```

## Credits

The ten designs are CC BY 4.0, credited in `NOTICE.md`. This harness is MIT licensed (`LICENSE`).
