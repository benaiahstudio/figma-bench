const OVERFLOW_TOLERANCE_PX = 1;
const OVERLAP_SHARE = 0.2;

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

// Pairs of text blocks whose overlap covers more than OVERLAP_SHARE of the smaller one.
export function countOverlaps(blocks) {
  let count = 0;

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const smaller = Math.min(blocks[i].box.w * blocks[i].box.h, blocks[j].box.w * blocks[j].box.h);

      if (smaller > 0 && intersectionArea(blocks[i].box, blocks[j].box) / smaller > OVERLAP_SHARE) count++;
    }
  }

  return count;
}

// snapshot comes from the in-page script: { scrollWidth, viewportWidth, blocks: [{ box, clipped }] }.
export function responsiveMetrics(snapshot) {
  const { overflows, overflowPx } = detectOverflow(snapshot);

  return {
    viewportWidth: snapshot.viewportWidth,
    scrollWidth: snapshot.scrollWidth,
    overflows,
    overflowPx,
    textBlocks: snapshot.blocks.length,
    clippedText: snapshot.blocks.filter((block) => block.clipped).length,
    overlappingText: countOverlaps(snapshot.blocks),
  };
}
