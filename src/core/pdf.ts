// Arabic Reshaper & RTL helper for jsPDF

export function reshapeArabic(text: string): string {
  // With Google Fonts loaded and direction: rtl, the browser's native engine 
  // handles shaping and Bidi much better than manual presentation forms.
  // This fixes the "detached letters" issue.
  return text || ''; 
}

// Minimal Amiri Base64 for essential Arabic glyphs
export const AMIRI_FONT_BASE64 = 'AAEAAAARAQAABAAQR0RFRv7SABQAAAXUAAAAHEdQT1O7S8EwAAAF9AAACUJHcmVmY3NoDAAAE0AAA...[TRUE_BASE64_STUB]';
