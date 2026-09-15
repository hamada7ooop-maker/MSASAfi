// دالة مساعدة متطورة لتحويل ألوان oklch المترجمة من Tailwind CSS v4 إلى صيغة RGB مدعومة في html2canvas لتجنب خطأ التصدير.
export function oklchToRgb(oklchStr: string): string {
  const regex = /oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/g;
  
  return oklchStr.replace(regex, (match, p1, p2, p3, p4) => {
    const L = p1.endsWith('%') ? parseFloat(p1) / 100 : parseFloat(p1);
    const C = parseFloat(p2);
    const H = parseFloat(p3);
    const A = p4 ? (p4.endsWith('%') ? parseFloat(p4) / 100 : parseFloat(p4)) : 1;
    
    // تحويل OKLCH إلى OKLAB
    const a = C * Math.cos((H * Math.PI) / 180);
    const b = C * Math.sin((H * Math.PI) / 180);
    
    // تحويل OKLAB إلى LMS
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    
    const l = Math.max(0, Math.pow(l_, 3));
    const m = Math.max(0, Math.pow(m_, 3));
    const s = Math.max(0, Math.pow(s_, 3));
    
    // تحويل LMS إلى RGB خطي
    const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const b_rgb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
    
    // تصحيح Gamma للتحويل إلى sRGB
    const f = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
    const R = Math.max(0, Math.min(255, Math.round(f(r) * 255)));
    const G = Math.max(0, Math.min(255, Math.round(f(g) * 255)));
    const B = Math.max(0, Math.min(255, Math.round(f(b_rgb) * 255)));
    
    return A === 1 ? `rgb(${R}, ${G}, ${B})` : `rgba(${R}, ${G}, ${B}, ${A})`;
  });
}

// دالة مساعدة متطورة لتحويل ألوان oklab المترجمة من Tailwind CSS v4 إلى صيغة RGB مدعومة في html2canvas
export function oklabToRgb(oklabStr: string): string {
  const regex = /oklab\(\s*([\d.]+%?)\s+([-+]?[\d.]+)\s+([-+]?[\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/g;
  
  return oklabStr.replace(regex, (match, p1, p2, p3, p4) => {
    const L = p1.endsWith('%') ? parseFloat(p1) / 100 : parseFloat(p1);
    const a = parseFloat(p2);
    const b = parseFloat(p3);
    const A = p4 ? (p4.endsWith('%') ? parseFloat(p4) / 100 : parseFloat(p4)) : 1;
    
    // تحويل OKLAB إلى LMS
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    
    const l = Math.max(0, Math.pow(l_, 3));
    const m = Math.max(0, Math.pow(m_, 3));
    const s = Math.max(0, Math.pow(s_, 3));
    
    // تحويل LMS إلى RGB خطي
    const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const b_rgb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
    
    // تصحيح Gamma للتحويل إلى sRGB
    const f = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
    const R = Math.max(0, Math.min(255, Math.round(f(r) * 255)));
    const G = Math.max(0, Math.min(255, Math.round(f(g) * 255)));
    const B = Math.max(0, Math.min(255, Math.round(f(b_rgb) * 255)));
    
    return A === 1 ? `rgb(${R}, ${G}, ${B})` : `rgba(${R}, ${G}, ${B}, ${A})`;
  });
}

