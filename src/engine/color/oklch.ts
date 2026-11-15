/**
 * OKLCH Color Mathematics and Uniform Perceptual Color Space
 * Per ADR-004: Closed-form conversion between sRGB hex strings and OKLCH coordinates.
 */

export interface OKLCH {
  l: number; // Lightness [0.0, 1.0]
  c: number; // Chroma / Saturation [0.0, ~0.4]
  h: number; // Hue in degrees [0, 360)
}

export interface OKLAB {
  l: number;
  a: number;
  b: number;
}

export interface RGB {
  r: number; // [0, 255]
  g: number;
  b: number;
}

/**
 * Parses a standard 3 or 6-digit hex string into RGB [0, 255].
 */
export function hexToRgb(hex: string): RGB {
  const sanitized = hex.trim().replace(/^#/, '');
  let fullHex = sanitized;

  if (sanitized.length === 3) {
    fullHex = sanitized
      .split('')
      .map((char) => char + char)
      .join('');
  }

  if (fullHex.length !== 6) {
    // Default fallback to neutral charcoal if hex is invalid
    return { r: 35, g: 35, b: 35 };
  }

  const num = parseInt(fullHex, 16);
  if (isNaN(num)) {
    return { r: 35, g: 35, b: 35 };
  }

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Linearizes sRGB component [0, 255] -> [0.0, 1.0] for optical operations.
 */
function sRgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Converts sRGB [0, 255] to OKLAB color space.
 */
export function rgbToOklab(rgb: RGB): OKLAB {
  const lr = sRgbToLinear(rgb.r);
  const lg = sRgbToLinear(rgb.g);
  const lb = sRgbToLinear(rgb.b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/**
 * Converts OKLAB to OKLCH (Lightness, Chroma, Hue in degrees).
 */
export function oklabToOklch(lab: OKLAB): OKLCH {
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let h = Math.atan2(lab.b, lab.a) * (180 / Math.PI);
  if (h < 0) {
    h += 360;
  }
  return {
    l: Math.max(0, Math.min(1, lab.l)),
    c: Math.max(0, c),
    h: c < 0.0001 ? 0 : h,
  };
}

const oklchCache = new Map<string, OKLCH>();

/**
 * Converts hex color string directly to OKLCH coordinates (memoized).
 */
export function hexToOklch(hex: string): OKLCH {
  const cached = oklchCache.get(hex);
  if (cached) return cached;
  const rgb = hexToRgb(hex);
  const lab = rgbToOklab(rgb);
  const result = oklabToOklch(lab);
  oklchCache.set(hex, result);
  return result;
}

/**
 * Calculates Euclidean perceptual color difference Delta-E in OKLAB space.
 */
export function deltaEOklab(color1: OKLAB, color2: OKLAB): number {
  const dl = color1.l - color2.l;
  const da = color1.a - color2.a;
  const db = color1.b - color2.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

/**
 * Converts linear sRGB [0.0, 1.0] -> standard sRGB [0, 255].
 */
function linearToSRgb(c: number): number {
  const clamped = Math.max(0, Math.min(1, c));
  const v = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(255, v * 255)));
}

/**
 * Converts OKLAB back to standard sRGB [0, 255].
 */
export function oklabToRgb(lab: OKLAB): RGB {
  const l_ = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m_ = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s_ = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin = 4.0767434753 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return {
    r: linearToSRgb(rLin),
    g: linearToSRgb(gLin),
    b: linearToSRgb(bLin),
  };
}

/**
 * Converts RGB [0, 255] to uppercase 6-character hex string #RRGGBB.
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, '0').toUpperCase();
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Converts OKLAB directly to hex string #RRGGBB.
 */
export function oklabToHex(lab: OKLAB): string {
  return rgbToHex(oklabToRgb(lab));
}

