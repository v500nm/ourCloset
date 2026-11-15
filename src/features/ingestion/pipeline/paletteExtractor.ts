/**
 * Perceptual OKLCH Palette Extractor
 * Extracts dominant primary and secondary colors using k-means clustering in OKLAB space.
 * Only clusters foreground pixels (alpha > threshold).
 */

import {
  OKLAB,
  OKLCH,
  RGB,
  deltaEOklab,
  oklabToHex,
  oklabToOklch,
  oklabToRgb,
  rgbToOklab,
} from '@/engine/color/oklch';
import { HardwareMetalColor, LeatherTone } from '@/types/taxonomy.types';

export interface PaletteCluster {
  hex: string;
  oklch: OKLCH;
  oklab: OKLAB;
  rgb: RGB;
  weight: number; // Percentage of foreground [0.0, 1.0]
  pixelCount: number;
}

export interface PaletteExtractionResult {
  primaryColorHex: string;
  secondaryColorHex: string | null;
  clusters: PaletteCluster[];
  hardwareMetalColor: HardwareMetalColor | null;
  leatherTone: LeatherTone | null;
  isMonochrome: boolean;
}

export interface PaletteExtractorOptions {
  k?: number; // Number of clusters (default: 4)
  maxSamples?: number; // Max pixels to sample (default: 5000)
  minAlpha?: number; // Minimum alpha for foreground (default: 128)
  secondaryMinDeltaE?: number; // Min Delta-E in OKLAB for distinct secondary color (default: 0.08)
  maxIterations?: number; // (default: 10)
}

/**
 * Extracts perceptual palette from image data.
 */
export function extractOklchPalette(
  imageData: { data: Uint8ClampedArray | number[]; width: number; height: number },
  options: PaletteExtractorOptions = {}
): PaletteExtractionResult {
  const k = options.k ?? 4;
  const maxSamples = options.maxSamples ?? 5000;
  const minAlpha = options.minAlpha ?? 128;
  const minDeltaE = options.secondaryMinDeltaE ?? 0.08;
  const maxIterations = options.maxIterations ?? 10;

  const data = imageData.data;
  const totalPixels = imageData.width * imageData.height;

  // 1. Collect foreground pixels (alpha >= minAlpha)
  const foregroundOklab: OKLAB[] = [];
  const step = Math.max(1, Math.floor(totalPixels / (maxSamples * 2)));

  for (let i = 0; i < data.length; i += 4 * step) {
    const a = data[i + 3];
    if (a >= minAlpha) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      foregroundOklab.push(rgbToOklab({ r, g, b }));
      if (foregroundOklab.length >= maxSamples) break;
    }
  }

  // Fallback if no foreground pixels found (e.g. transparent image)
  if (foregroundOklab.length === 0) {
    const defaultLab = rgbToOklab({ r: 40, g: 40, b: 40 });
    return {
      primaryColorHex: '#282828',
      secondaryColorHex: null,
      clusters: [
        {
          hex: '#282828',
          oklab: defaultLab,
          oklch: oklabToOklch(defaultLab),
          rgb: { r: 40, g: 40, b: 40 },
          weight: 1.0,
          pixelCount: 1,
        },
      ],
      hardwareMetalColor: null,
      leatherTone: null,
      isMonochrome: true,
    };
  }

  // 2. Initialize k centroids using k-means++ style initialization
  const centroids: OKLAB[] = [];
  centroids.push({ ...foregroundOklab[0] });

  while (centroids.length < k && centroids.length < foregroundOklab.length) {
    let maxDist = -1;
    let bestCandidate = foregroundOklab[0];

    for (const point of foregroundOklab) {
      let minDistToCentroid = Infinity;
      for (const c of centroids) {
        const d = deltaEOklab(point, c);
        if (d < minDistToCentroid) minDistToCentroid = d;
      }
      if (minDistToCentroid > maxDist) {
        maxDist = minDistToCentroid;
        bestCandidate = point;
      }
    }
    centroids.push({ ...bestCandidate });
  }

  // 3. Iterative k-means clustering in OKLAB space
  const assignments = new Int32Array(foregroundOklab.length);

  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;

    // Expectation step: assign each point to nearest centroid
    for (let i = 0; i < foregroundOklab.length; i++) {
      const p = foregroundOklab[i];
      let bestCluster = 0;
      let bestDist = Infinity;

      for (let cIdx = 0; cIdx < centroids.length; cIdx++) {
        const d = deltaEOklab(p, centroids[cIdx]);
        if (d < bestDist) {
          bestDist = d;
          bestCluster = cIdx;
        }
      }

      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster;
        changed = true;
      }
    }

    if (!changed && iter > 0) break;

    // Maximization step: recompute centroids
    const sums = centroids.map(() => ({ l: 0, a: 0, b: 0, count: 0 }));
    for (let i = 0; i < foregroundOklab.length; i++) {
      const cIdx = assignments[i];
      const p = foregroundOklab[i];
      sums[cIdx].l += p.l;
      sums[cIdx].a += p.a;
      sums[cIdx].b += p.b;
      sums[cIdx].count++;
    }

    for (let cIdx = 0; cIdx < centroids.length; cIdx++) {
      if (sums[cIdx].count > 0) {
        centroids[cIdx] = {
          l: sums[cIdx].l / sums[cIdx].count,
          a: sums[cIdx].a / sums[cIdx].count,
          b: sums[cIdx].b / sums[cIdx].count,
        };
      }
    }
  }

  // 4. Formulate cluster results and sort by prevalence
  const counts = new Array(centroids.length).fill(0);
  for (let i = 0; i < foregroundOklab.length; i++) {
    counts[assignments[i]]++;
  }

  const clusters: PaletteCluster[] = centroids
    .map((c, idx) => {
      const rgb = oklabToRgb(c);
      const hex = oklabToHex(c);
      const oklch = oklabToOklch(c);
      const count = counts[idx];
      return {
        hex,
        oklch,
        oklab: c,
        rgb,
        weight: count / foregroundOklab.length,
        pixelCount: count,
      };
    })
    .filter((c) => c.pixelCount > 0)
    .sort((a, b) => b.weight - a.weight);

  const primaryCluster = clusters[0];
  const primaryColorHex = primaryCluster.hex;

  // Secondary color must have deltaEOklab >= minDeltaE to be distinct
  let secondaryColorHex: string | null = null;
  for (let i = 1; i < clusters.length; i++) {
    if (deltaEOklab(primaryCluster.oklab, clusters[i].oklab) >= minDeltaE && clusters[i].weight >= 0.12) {
      secondaryColorHex = clusters[i].hex;
      break;
    }
  }

  // Check hardware metal or leather tones
  const { hardwareMetalColor, leatherTone } = inferHardwareAndLeatherTones(clusters);

  return {
    primaryColorHex,
    secondaryColorHex,
    clusters,
    hardwareMetalColor,
    leatherTone,
    isMonochrome: secondaryColorHex === null,
  };
}

/**
 * Heuristic identification of hardware metal color (gold/silver/rose_gold/black)
 * or leather tones from the extracted clusters.
 */
function inferHardwareAndLeatherTones(clusters: PaletteCluster[]): {
  hardwareMetalColor: HardwareMetalColor | null;
  leatherTone: LeatherTone | null;
} {
  let hardware: HardwareMetalColor | null = null;
  let leather: LeatherTone | null = null;

  for (const cluster of clusters) {
    const { l, c, h } = cluster.oklch;

    // Gold: hue 70-105 deg, medium-high lightness, moderate chroma
    if (h >= 75 && h <= 105 && l >= 0.65 && l <= 0.88 && c >= 0.08 && c <= 0.22) {
      if (!hardware) hardware = 'gold';
    }
    // Silver: very low chroma, high lightness
    else if (c < 0.02 && l >= 0.72 && l <= 0.92) {
      if (!hardware) hardware = 'silver';
    }
    // Rose Gold: hue 20-55 deg, pinkish warm tone
    else if (h >= 20 && h <= 55 && l >= 0.65 && l <= 0.85 && c >= 0.06 && c <= 0.15) {
      if (!hardware) hardware = 'rose_gold';
    }

    // Leather tones
    // Tan: warm golden-brown (hue 45-75 deg, lightness 0.45-0.65)
    if (h >= 45 && h <= 75 && l >= 0.45 && l <= 0.65 && c >= 0.05 && c <= 0.15) {
      if (!leather) leather = 'tan';
    }
    // Dark brown: warm low lightness
    else if (h >= 30 && h <= 65 && l >= 0.22 && l <= 0.42 && c >= 0.03 && c <= 0.12) {
      if (!leather) leather = 'dark_brown';
    }
    // Black leather
    else if (l < 0.22 && c < 0.03) {
      if (!leather) leather = 'black';
    }
  }

  return { hardwareMetalColor: hardware, leatherTone: leather };
}

