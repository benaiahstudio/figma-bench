const OVERFLOW_TOLERANCE_PX = 1;
const OVERLAP_SHARE = 0.2;
const SNIPPET_CHARS = 60;

// Horizontal overflow: the page is wider than the viewport it was rendered in.
export function detectOverflow({ scrollWidth, viewportWidth }, tolerance = OVERFLOW_TOLERANCE_PX) {
  const overflowPx = Math.max(0, scrollWidth - viewportWidth);

  return { overflows: overflowPx > tolerance, overflowPx };
}

function intersectionArea(a, b) {
  const width = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);

  return width > 0 && height > 0 ? width * height : 0;
}

const round = (value) => Math.round(value);

function describe(block) {
  const { x, y, w, h } = block.box;
  const text = block.text ?? "";

  return { text: text.length > SNIPPET_CHARS ? `${text.slice(0, SNIPPET_CHARS)}...` : text, box: { x: round(x), y: round(y), w: round(w), h: round(h) } };
}

// Pairs of text blocks whose overlap covers more than OVERLAP_SHARE of the smaller one.
export function findOverlaps(blocks) {
  const pairs = [];

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const smaller = Math.min(blocks[i].box.w * blocks[i].box.h, blocks[j].box.w * blocks[j].box.h);

      if (smaller > 0 && intersectionArea(blocks[i].box, blocks[j].box) / smaller > OVERLAP_SHARE) pairs.push([blocks[i], blocks[j]]);
    }
  }

  return pairs;
}

export const countOverlaps = (blocks) => findOverlaps(blocks).length;

// snapshot comes from the in-page script: { scrollWidth, viewportWidth, blocks: [{ box, text, clipped, scroller }] }.
// Blocks inside a horizontal scroller are reported apart and do not count as defects.
export function responsiveMetrics(snapshot) {
  const { overflows, overflowPx } = detectOverflow(snapshot);
  const clipped = snapshot.blocks.filter((block) => block.clipped);
  const overlaps = findOverlaps(snapshot.blocks);
  const defectOverlaps = overlaps.filter(([a, b]) => !a.scroller && !b.scroller);

  return {
    viewportWidth: snapshot.viewportWidth,
    scrollWidth: snapshot.scrollWidth,
    overflows,
    overflowPx,
    textBlocks: snapshot.blocks.length,
    clippedText: clipped.filter((block) => !block.scroller).length,
    clippedOffenders: clipped.filter((block) => !block.scroller).map(describe),
    clippedInScroller: clipped.filter((block) => block.scroller).length,
    overlappingText: defectOverlaps.length,
    overlapOffenders: defectOverlaps.map(([a, b]) => [describe(a), describe(b)]),
    overlappingInScroller: overlaps.length - defectOverlaps.length,
  };
}
