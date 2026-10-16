import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const SSIM_WINDOW = 8;
const SSIM_STEP = 4;
const SSIM_C1 = (0.01 * 255) ** 2;
const SSIM_C2 = (0.03 * 255) ** 2;

// Greyscale (Rec. 709 luma) with transparency flattened onto white.
export function readLuma(path) {
  const png = PNG.sync.read(readFileSync(path));
  const luma = new Float64Array(png.width * png.height);

  for (let i = 0; i < luma.length; i++) {
    const alpha = png.data[i * 4 + 3] / 255;
    const [r, g, b] = [0, 1, 2].map((c) => png.data[i * 4 + c] * alpha + 255 * (1 - alpha));

    luma[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  return { width: png.width, height: png.height, data: luma };
}

// Bilinear resize, used only to put two images on the same grid.
export function resizeLuma(image, width, height) {
  if (image.width === width && image.height === height) return image;

  const out = new Float64Array(width * height);
  const sx = image.width / width;
  const sy = image.height / height;

  for (let y = 0; y < height; y++) {
    const fy = Math.min(image.height - 1, Math.max(0, (y + 0.5) * sy - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(image.height - 1, y0 + 1);

    for (let x = 0; x < width; x++) {
      const fx = Math.min(image.width - 1, Math.max(0, (x + 0.5) * sx - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(image.width - 1, x0 + 1);
      const top = image.data[y0 * image.width + x0] * (1 - (fx - x0)) + image.data[y0 * image.width + x1] * (fx - x0);
      const bottom = image.data[y1 * image.width + x0] * (1 - (fx - x0)) + image.data[y1 * image.width + x1] * (fx - x0);

      out[y * width + x] = top * (1 - (fy - y0)) + bottom * (fy - y0);
    }
  }

  return { width, height, data: out };
}

function windowStats(a, b, width, x0, y0) {
  let sumA = 0;
  let sumB = 0;
  let sumAA = 0;
  let sumBB = 0;
  let sumAB = 0;

  for (let y = y0; y < y0 + SSIM_WINDOW; y++) {
    for (let x = x0; x < x0 + SSIM_WINDOW; x++) {
      const va = a[y * width + x];
      const vb = b[y * width + x];

      sumA += va;
      sumB += vb;
      sumAA += va * va;
      sumBB += vb * vb;
      sumAB += va * vb;
    }
  }

  return { sumA, sumB, sumAA, sumBB, sumAB };
}

// Mean structural similarity over 8x8 windows (step 4) of two same-size luma images.
export function ssim(a, b) {
  if (a.width !== b.width || a.height !== b.height) throw new Error("ssim needs two images of the same size.");

  const n = SSIM_WINDOW * SSIM_WINDOW;
  let total = 0;
  let windows = 0;

  for (let y = 0; y + SSIM_WINDOW <= a.height; y += SSIM_STEP) {
    for (let x = 0; x + SSIM_WINDOW <= a.width; x += SSIM_STEP) {
      const s = windowStats(a.data, b.data, a.width, x, y);
      const meanA = s.sumA / n;
      const meanB = s.sumB / n;
      const varA = s.sumAA / n - meanA ** 2;
      const varB = s.sumBB / n - meanB ** 2;
      const cov = s.sumAB / n - meanA * meanB;

      total += ((2 * meanA * meanB + SSIM_C1) * (2 * cov + SSIM_C2)) / ((meanA ** 2 + meanB ** 2 + SSIM_C1) * (varA + varB + SSIM_C2));
      windows++;
    }
  }

  return windows === 0 ? null : total / windows;
}

// Average-pools to a size x size grid.
export function downsample(image, size) {
  const out = new Float64Array(size * size);
  const counts = new Float64Array(size * size);

  for (let y = 0; y < image.height; y++) {
    const row = Math.min(size - 1, Math.floor((y * size) / image.height));

    for (let x = 0; x < image.width; x++) {
      const cell = row * size + Math.min(size - 1, Math.floor((x * size) / image.width));

      out[cell] += image.data[y * image.width + x];
      counts[cell]++;
    }
  }

  return out.map((sum, i) => (counts[i] === 0 ? 0 : sum / counts[i]));
}

// Pearson correlation of two equal-length arrays. Two flat images that match count as 1, otherwise 0.
export function pearson(a, b) {
  const n = a.length;
  const meanA = a.reduce((sum, v) => sum + v, 0) / n;
  const meanB = b.reduce((sum, v) => sum + v, 0) / n;
  let cov = 0;
  let varA = 0;
  let varB = 0;

  for (let i = 0; i < n; i++) {
    cov += (a[i] - meanA) * (b[i] - meanB);
    varA += (a[i] - meanA) ** 2;
    varB += (b[i] - meanB) ** 2;
  }
  if (varA === 0 || varB === 0) return varA === varB && Math.abs(meanA - meanB) < 1 ? 1 : 0;

  return cov / Math.sqrt(varA * varB);
}

export function visualMetrics(referencePath, renderPath) {
  const reference = readLuma(referencePath);
  const rendered = readLuma(renderPath);
  const sizeMismatch = reference.width !== rendered.width || reference.height !== rendered.height;
  const aligned = resizeLuma(rendered, reference.width, reference.height);

  return {
    referenceSize: [reference.width, reference.height],
    renderSize: [rendered.width, rendered.height],
    sizeMismatch,
    ssim: ssim(reference, aligned),
    lumaCorrelation16: pearson(downsample(reference, 16), downsample(aligned, 16)),
    lumaCorrelation64: pearson(downsample(reference, 64), downsample(aligned, 64)),
  };
}
