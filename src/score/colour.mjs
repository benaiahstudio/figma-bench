// sRGB (0-255) to CIE Lab (D65) and the CIEDE2000 colour difference, after Sharma, Wu and Dalal (2005).
const WHITE = { x: 0.95047, y: 1, z: 1.08883 };

const toLinear = (byte) => {
  const value = byte / 255;

  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const labCurve = (t) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);

export function rgbToLab([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map(toLinear);
  const fx = labCurve((0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb) / WHITE.x);
  const fy = labCurve((0.2126729 * lr + 0.7151522 * lg + 0.072175 * lb) / WHITE.y);
  const fz = labCurve((0.0193339 * lr + 0.119192 * lg + 0.9503041 * lb) / WHITE.z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function hexToRgb(hex) {
  const digits = hex.replace("#", "");
  const value = Number.parseInt(digits.slice(0, 6), 16);

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const rad = (deg) => (deg * Math.PI) / 180;
const deg = (radians) => (radians * 180) / Math.PI;
const hueOf = (b, a) => (b === 0 && a === 0 ? 0 : (deg(Math.atan2(b, a)) + 360) % 360);

function hueDifference(h1, h2, chromaProduct) {
  if (chromaProduct === 0) return 0;

  const diff = h2 - h1;

  if (Math.abs(diff) <= 180) return diff;

  return diff > 180 ? diff - 360 : diff + 360;
}

function hueMean(h1, h2, chromaProduct) {
  if (chromaProduct === 0) return h1 + h2;
  if (Math.abs(h1 - h2) <= 180) return (h1 + h2) / 2;

  return h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2;
}

export function ciede2000([l1, a1, b1], [l2, a2, b2]) {
  const meanC = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const g = 0.5 * (1 - Math.sqrt(meanC ** 7 / (meanC ** 7 + 25 ** 7)));
  const a1p = (1 + g) * a1;
  const a2p = (1 + g) * a2;
  const c1 = Math.hypot(a1p, b1);
  const c2 = Math.hypot(a2p, b2);
  const h1 = hueOf(b1, a1p);
  const h2 = hueOf(b2, a2p);
  const product = c1 * c2;
  const dL = l2 - l1;
  const dC = c2 - c1;
  const dH = 2 * Math.sqrt(product) * Math.sin(rad(hueDifference(h1, h2, product)) / 2);
  const meanL = (l1 + l2) / 2;
  const meanCp = (c1 + c2) / 2;
  const meanH = hueMean(h1, h2, product);
  const t = 1 - 0.17 * Math.cos(rad(meanH - 30)) + 0.24 * Math.cos(rad(2 * meanH)) + 0.32 * Math.cos(rad(3 * meanH + 6)) - 0.2 * Math.cos(rad(4 * meanH - 63));
  const sL = 1 + (0.015 * (meanL - 50) ** 2) / Math.sqrt(20 + (meanL - 50) ** 2);
  const sC = 1 + 0.045 * meanCp;
  const sH = 1 + 0.015 * meanCp * t;
  const rotation = -2 * Math.sqrt(meanCp ** 7 / (meanCp ** 7 + 25 ** 7)) * Math.sin(rad(60 * Math.exp(-(((meanH - 275) / 25) ** 2))));

  return Math.sqrt((dL / sL) ** 2 + (dC / sC) ** 2 + (dH / sH) ** 2 + rotation * (dC / sC) * (dH / sH));
}

export const rgbDelta = (rgbA, rgbB) => ciede2000(rgbToLab(rgbA), rgbToLab(rgbB));
