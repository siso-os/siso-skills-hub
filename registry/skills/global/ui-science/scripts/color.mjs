/**
 * color.mjs — perceptual color math for the ui-science checker.
 *
 * Two jobs:
 *   1. OKLab/OKLCH conversion + ramp-uniformity check. This is the load-bearing
 *      new math. RECEIPT: MacAdam 1942 (JOSA 32:247) measured that color space is
 *      perceptually NON-uniform, so equal HSL/RGB steps are NOT equal perceived
 *      steps. OKLab (Björn Ottosson, 2020) is engineered so equal numeric steps ≈
 *      equal perceived steps — so a palette ramp that is even in OKLab lightness is
 *      perceptually even, and one even in HSL lightness is not.
 *   2. WCAG 2.1 relative-luminance contrast. RECEIPT: W3C WCAG 2.1 SC 1.4.3.
 *      The luminance + contrast-ratio functions here are extracted verbatim (math
 *      unchanged, DOM bits dropped) from:
 *      SISO_Agent_Base/_legacy/paperclip/ui/src/lib/color-contrast.ts
 *
 * No dependencies. Pure functions. sRGB assumed (the web default).
 */

// ── sRGB → linear ───────────────────────────────────────────────────────────
function srgbToLinear(c) {
  const n = c / 255;
  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
}

// ── WCAG 2.1 relative luminance (extracted from paperclip color-contrast.ts) ──
export function relativeLuminance({ r, g, b }) {
  return (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
  );
}

// ── WCAG 2.1 contrast ratio (extracted from paperclip color-contrast.ts) ──────
export function contrastRatio(rgb1, rgb2) {
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ── sRGB → OKLab (Björn Ottosson 2020) ────────────────────────────────────────
// Ref: https://bottosson.github.io/posts/oklab/  — coefficients are the published
// linear-sRGB → LMS matrix, cube-root nonlinearity, then LMS' → OKLab matrix.
export function rgbToOklab({ r, g, b }) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

// OKLab L (0..1) is the perceptual lightness. This is the axis we check ramps on.
export function perceptualLightness(rgb) {
  return rgbToOklab(rgb).L;
}

// ── minimal CSS color-value parser ────────────────────────────────────────────
// Handles the forms that actually appear in token/ramp definitions:
//   #rgb, #rrggbb, rgb()/rgba(), hsl()/hsla(), oklch().
// Returns { r,g,b } in 0..255, or null if unparseable (vars, color-mix, etc.).
export function parseColor(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();

  // hex
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (hex) {
    let v = hex[1];
    if (v.length === 3) v = v.split("").map((c) => c + c).join("");
    return {
      r: parseInt(v.slice(0, 2), 16),
      g: parseInt(v.slice(2, 4), 16),
      b: parseInt(v.slice(4, 6), 16),
    };
  }

  // rgb() / rgba()
  const rgb = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i.exec(s);
  if (rgb) {
    return { r: +rgb[1], g: +rgb[2], b: +rgb[3] };
  }

  // hsl() / hsla()  → convert to rgb
  const hsl = /^hsla?\(\s*([\d.]+)(?:deg)?[ ,]+([\d.]+)%[ ,]+([\d.]+)%/i.exec(s);
  if (hsl) {
    return hslToRgb(+hsl[1], +hsl[2] / 100, +hsl[3] / 100);
  }

  // oklch(L C H)  → convert to rgb via oklab
  const oklch = /^oklch\(\s*([\d.]+%?)[ ,]+([\d.]+)[ ,]+([\d.]+)/i.exec(s);
  if (oklch) {
    let L = oklch[1];
    L = L.endsWith("%") ? parseFloat(L) / 100 : parseFloat(L);
    return oklchToRgb(L, +oklch[2], +oklch[3]);
  }

  return null; // var(), color-mix(), named colors, etc. — checker skips these
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

// OKLCH → linear sRGB → sRGB. Inverse of the rgbToOklab pipeline.
function oklchToRgb(L, C, Hdeg) {
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const toSrgb = (c) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(1, v)) * 255);
  };
  return { r: toSrgb(lr), g: toSrgb(lg), b: toSrgb(lb) };
}

/**
 * Ramp-uniformity check. Given an ordered list of colors (a palette ramp),
 * return the perceptual-lightness (OKLab L) of each step and a measure of how
 * UNEVEN the spacing is. A ramp built by evenly stepping HSL lightness will show
 * large variance in the OKLab-L deltas; a perceptually-even ramp will show near-
 * equal deltas.
 *
 * Returns { lightnesses, deltas, maxDelta, minDelta, unevenness }.
 *   unevenness = (maxDelta - minDelta) / meanDelta   (0 = perfectly even)
 * The checker flags unevenness above a threshold as an OKLCH-uniformity violation.
 */
export function rampUniformity(colors) {
  const rgbs = colors.map(parseColor).filter(Boolean);
  if (rgbs.length < 3) return null; // not a ramp
  const Ls = rgbs.map(perceptualLightness);
  const deltas = [];
  for (let i = 1; i < Ls.length; i++) deltas.push(Math.abs(Ls[i] - Ls[i - 1]));
  const maxDelta = Math.max(...deltas);
  const minDelta = Math.min(...deltas);
  const meanDelta = deltas.reduce((a, c) => a + c, 0) / deltas.length;
  const unevenness = meanDelta === 0 ? 0 : (maxDelta - minDelta) / meanDelta;
  return { lightnesses: Ls, deltas, maxDelta, minDelta, meanDelta, unevenness };
}
