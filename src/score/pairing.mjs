import { area, dice, positionDistance } from "./text-metrics.mjs";
import { rgbDelta } from "./colour.mjs";

const FORBIDDEN = 1e9;
const MIN_TEXT_SIMILARITY = 0.5;
const POSITION_WEIGHT = 0.5;

// Minimum-cost one-to-one assignment (shortest augmenting paths). Rows must not outnumber columns.
function hungarianRows(cost, rows, cols) {
  const u = new Array(rows + 1).fill(0);
  const v = new Array(cols + 1).fill(0);
  const owner = new Array(cols + 1).fill(0);
  const way = new Array(cols + 1).fill(0);

  for (let row = 1; row <= rows; row++) {
    owner[0] = row;

    let col0 = 0;
    const minv = new Array(cols + 1).fill(Infinity);
    const used = new Array(cols + 1).fill(false);

    do {
      used[col0] = true;

      const row0 = owner[col0];
      let delta = Infinity;
      let col1 = 0;

      for (let col = 1; col <= cols; col++) {
        if (used[col]) continue;

        const reduced = cost[row0 - 1][col - 1] - u[row0] - v[col];

        if (reduced < minv[col]) {
          minv[col] = reduced;
          way[col] = col0;
        }
        if (minv[col] < delta) {
          delta = minv[col];
          col1 = col;
        }
      }
      for (let col = 0; col <= cols; col++) {
        if (used[col]) {
          u[owner[col]] += delta;
          v[col] -= delta;
        } else {
          minv[col] -= delta;
        }
      }
      col0 = col1;
    } while (owner[col0] !== 0);

    do {
      const previous = way[col0];

      owner[col0] = owner[previous];
      col0 = previous;
    } while (col0 !== 0);
  }

  return owner.slice(1).flatMap((row, col) => (row === 0 ? [] : [[row - 1, col]]));
}

// Returns [leftIndex, rightIndex] pairs with the lowest total cost.
export function assignMinCost(cost) {
  const rows = cost.length;
  const cols = rows === 0 ? 0 : cost[0].length;

  if (rows === 0 || cols === 0) return [];
  if (rows <= cols) return hungarianRows(cost, rows, cols);

  const flipped = Array.from({ length: cols }, (_, c) => cost.map((line) => line[c]));

  return hungarianRows(flipped, cols, rows).map(([c, r]) => [r, c]);
}

// Blocks are { text, box: {x,y,w,h} }. A pair needs text similarity of at least MIN_TEXT_SIMILARITY;
// among those, text counts most and position settles ties between repeated labels.
export function pairBlocks(designBlocks, renderBlocks, frame) {
  const cost = designBlocks.map((d) =>
    renderBlocks.map((r) => {
      const similarity = dice(d.text, r.text);

      return similarity < MIN_TEXT_SIMILARITY ? FORBIDDEN : 1 - similarity + POSITION_WEIGHT * positionDistance(d.box, r.box, frame);
    }),
  );
  const pairs = assignMinCost(cost).filter(([d, r]) => cost[d][r] < FORBIDDEN);

  return pairs.map(([d, r]) => ({ design: d, render: r }));
}

const mean = (values) => (values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length);

// Design2Code-style scores. Text, position and colour are averaged over matched pairs only;
// blockMatch is the matched area (both sides) over all block area (both sides).
export function design2code(designBlocks, renderBlocks, frame) {
  const pairs = pairBlocks(designBlocks, renderBlocks, frame);
  const matchedArea = pairs.reduce((sum, { design, render }) => sum + area(designBlocks[design].box) + area(renderBlocks[render].box), 0);
  const totalArea = [...designBlocks, ...renderBlocks].reduce((sum, block) => sum + area(block.box), 0);
  const colourPairs = pairs.filter(({ design, render }) => designBlocks[design].rgb && renderBlocks[render].rgb);

  return {
    designBlocks: designBlocks.length,
    renderBlocks: renderBlocks.length,
    matched: pairs.length,
    textDice: mean(pairs.map(({ design, render }) => dice(designBlocks[design].text, renderBlocks[render].text))),
    blockMatch: totalArea === 0 ? null : matchedArea / totalArea,
    positionDistance: mean(pairs.map(({ design, render }) => positionDistance(designBlocks[design].box, renderBlocks[render].box, frame))),
    colourDeltaE: mean(colourPairs.map(({ design, render }) => rgbDelta(designBlocks[design].rgb, renderBlocks[render].rgb))),
  };
}
