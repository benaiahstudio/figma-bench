export const normaliseText = (text) => String(text ?? "").replace(/\s+/g, " ").trim().toLowerCase();

function bigrams(text) {
  const counts = new Map();

  for (let i = 0; i < text.length - 1; i++) {
    const pair = text.slice(i, i + 2);

    counts.set(pair, (counts.get(pair) ?? 0) + 1);
  }

  return counts;
}

// Sorensen-Dice over character pairs, case and spacing ignored. Two empty strings count as equal.
export function dice(a, b) {
  const left = normaliseText(a);
  const right = normaliseText(b);

  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;

  const rightPairs = bigrams(right);
  let shared = 0;

  for (const [pair, count] of bigrams(left)) shared += Math.min(count, rightPairs.get(pair) ?? 0);

  return (2 * shared) / (left.length - 1 + right.length - 1);
}

export const area = (box) => Math.max(0, box.w) * Math.max(0, box.h);

export const centre = (box) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });

// Distance between box centres, with x divided by the frame width and y by the frame height.
export function positionDistance(boxA, boxB, frame) {
  const a = centre(boxA);
  const b = centre(boxB);

  return Math.hypot((a.x - b.x) / frame.w, (a.y - b.y) / frame.h);
}
