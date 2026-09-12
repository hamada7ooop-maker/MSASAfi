/**
 * Utility functions to convert modern CSS color formats (OKLCH, OKLAB)
 * into standard sRGB/RGBA format supported by html2canvas and export engines.
 */

export function oklchToRgb(oklchStr: string): string {
  const regex = /oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/g;

  return oklchStr.replace(regex, (_match, p1, p2, p3, p4) => {
    const L = p1.endsWith('%') ? parseFloat(p1) / 100 : parseFloat(p1);
    const C = parseFloat(p2);
    const H = parseFloat(p3);
    const A = p4 ? (p4.endsWith('%') ? parseFloat(p4) / 100 : parseFloat(p4)) : 1;

    // Convert OKLCH to OKLAB
    const a = C * Math.cos((H * Math.PI) / 180);
    const b = C * Math.sin((H * Math.PI) / 180);

    // Convert OKLAB to LMS
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;

    const l = Math.max(0, Math.pow(l_, 3));
    const m = Math.max(0, Math.pow(m_, 3));
    const s = Math.max(0, Math.pow(s_, 3));

    // Convert LMS to linear RGB
    const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const b_rgb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

    // Gamma correction to sRGB
    const f = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
    const R = Math.max(0, Math.min(255, Math.round(f(r) * 255)));
    const G = Math.max(0, Math.min(255, Math.round(f(g) * 255)));
    const B = Math.max(0, Math.min(255, Math.round(f(b_rgb) * 255)));

    return A === 1 ? `rgb(${R}, ${G}, ${B})` : `rgba(${R}, ${G}, ${B}, ${A})`;
  });
}

export function oklabToRgb(oklabStr: string): string {
  const regex = /oklab\(\s*([\d.]+%?)\s+([-+]?[\d.]+)\s+([-+]?[\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/g;

  return oklabStr.replace(regex, (_match, p1, p2, p3, p4) => {
    const L = p1.endsWith('%') ? parseFloat(p1) / 100 : parseFloat(p1);
    const a = parseFloat(p2);
    const b = parseFloat(p3);
    const A = p4 ? (p4.endsWith('%') ? parseFloat(p4) / 100 : parseFloat(p4)) : 1;

    // Convert OKLAB to LMS
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;

    const l = Math.max(0, Math.pow(l_, 3));
    const m = Math.max(0, Math.pow(m_, 3));
    const s = Math.max(0, Math.pow(s_, 3));

    // Convert LMS to linear RGB
    const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const b_rgb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

    // Gamma correction to sRGB
    const f = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
    const R = Math.max(0, Math.min(255, Math.round(f(r) * 255)));
    const G = Math.max(0, Math.min(255, Math.round(f(g) * 255)));
    const B = Math.max(0, Math.min(255, Math.round(f(b_rgb) * 255)));

    return A === 1 ? `rgb(${R}, ${G}, ${B})` : `rgba(${R}, ${G}, ${B}, ${A})`;
  });
}
