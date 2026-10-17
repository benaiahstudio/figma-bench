# Round 1 results (early, 3 frames)

**This is an early look, not a verdict.** Round 1 was an *improvement round*: we used it to find and fix
problems in our own tool (`figma-to-code`), not to rank it against other tools. Only 3 of the 10 frames
were used, only our own tool was scored, and the full 10-frame round is still in progress. Please do not
read this as a claim of being the best.

## What was run

- **Frames (3 of the 10):** picked from the benchmark list.
  - `mobile` - Ecommerce App UI Kit (Freebie) by Hamza Naeem (@hamzauix), 390 x 844.
    <https://www.figma.com/community/file/1362309395455453748>
  - `ecommerce` - E-Commerce Website Interface Kit + Design System by Just UX (@justux), 1440 x 2970.
    <https://www.figma.com/community/file/1113372221049615805>
  - `data-table` - Dashboard UI Kit + Design System by Just UX (@justux), 1563 x 920.
    <https://www.figma.com/community/file/1095758785395822390>
  - All three are CC BY 4.0. Full credits are in `NOTICE.md` at the top of this repo.
- **Builds:** 3 builds per frame, made by Claude Sonnet as the builder, following the shared `BRIEF.md`.
  Run numbers are 1-3 for `mobile` and `data-table`, and 2-4 for `ecommerce` (run 1 failed and was left out).
- **Tool version:** the toolkit as it was *before* the round-1 fixes (a pre-release build). The
  v0.1.0 beta release includes the fixes that came out of this round, so a fresh run would not score exactly the same.

## Headline numbers

Mean over 3 builds per frame. Higher is better, except where marked.

| Frame | SSIM | Text match | Block match | Text colour error (lower is better) | Overflow (px, lower is better) |
| --- | --- | --- | --- | --- | --- |
| mobile | 0.975 | 1.000 | 0.962 | 0.00 | 0 |
| ecommerce | 0.960 | 0.999 | 0.992 | 0.00 | 0 |
| data-table | 0.961 | 1.000 | 1.000 | 0.00 | 0 |
| **Overall** | **0.965** | **1.000** | **0.985** | **0.00** | **0** |

The full tables (with spread, position, responsiveness and code measurements) are in [`RESULTS.md`](RESULTS.md).
The per-build score files are in `mobile/`, `ecommerce/` and `data-table/`.

## Caveats

- Frames were **picked from the 10**, not drawn at random. Another set of frames could score worse.
- A fourth frame (`settings`, from Untitled UI) was **dropped** because its Figma file was so heavy that the
  export timed out. It is not counted either way.
- The builds used a **pre-release toolkit**, from before the round-1 fixes.
- Only one tool (ours) was scored, so there is nothing here to compare against.
- Not everything is perfect: clipped text at the narrow and wide widths averaged 6 blocks on `mobile` and 22 on
  `data-table` (see `RESULTS.md`), and overlapping text averaged 1 pair on `data-table`. Those are among the things we are working on.
- SSIM is a measure of picture similarity. A high score does not mean the page behaves well in a browser.
- Text and colour scores are measured against Figma's own design data, so they can be near-perfect when the words and colours are copied faithfully. They say nothing about layout quality; read them together with SSIM and block match.
