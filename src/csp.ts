/**
 * csp.ts — the single source of truth for the Content Security Policy.
 *
 * The policy used to be written out twice: once as a <meta http-equiv> tag in
 * index.html and once as a dev-server header in vite.config.ts. Two hand-kept
 * copies of a security control drift apart, and the drift is silent: the dev
 * server would happily allow something the shipped app blocks (or worse, the
 * reverse), and nobody finds out until a feature breaks in production.
 *
 * Both consumers now build their policy from this file, so there is exactly
 * one list to review and one place to change.
 *
 * NOTE: this module is imported by vite.config.ts, which runs in Node before
 * any bundling. Keep it dependency-free and side-effect-free.
 */

/** Hosts the app fetches data from at runtime. */
const CONNECT_SRC = [
  "'self'",
  // Dev server websockets / HMR.
  'ws:',
  'wss:',
  'http://localhost:*',
  'http://127.0.0.1:*',
  'ws://localhost:*',
  'ws://127.0.0.1:*',
  // AI providers.
  'https://*.googleapis.com',
  'https://generativelanguage.googleapis.com',
  'https://text.pollinations.ai',
  'https://gen.pollinations.ai',
  'https://api.groq.com',
  'https://*.puter.com',
  'wss://*.puter.com',
  // FX rates.
  'https://api.exchangerate-api.com',
  'https://v6.exchangerate-api.com',
  'https://open.er-api.com',
  'https://api.frankfurter.app',
  // Cloud sync (Supabase).
  'https://*.supabase.co',
  'wss://*.supabase.co',
  // Market data.
  'https://api.stlouisfed.org',
  'https://api.coingecko.com',
  'https://api.currentsapi.services',
  // Geo / misc reference data.
  'https://ipapi.co',
  'https://freeipapi.com',
  'http://ip-api.com',
  'https://restcountries.com',
  'https://*.open-meteo.com',
];

/** Remote image origins. */
const IMG_SRC = [
  "'self'",
  'data:',
  'blob:',
  'https://cdn.jsdelivr.net',
  'https://cdnjs.cloudflare.com',
  'https://unpkg.com',
  'https://*.githubusercontent.com',
  'https://*.stlouisfed.org',
  'https://api.coingecko.com',
  'https://flagcdn.com',
];

/**
 * Build the policy.
 *
 * `'unsafe-eval'` is required by tesseract.js, which compiles its OCR core as
 * WebAssembly at runtime; removing it breaks receipt scanning. `'unsafe-inline'`
 * is still needed for the bootstrap error handler in index.html and for
 * Tailwind's injected styles. Both are tracked as L-5 follow-ups — eliminating
 * them needs nonces plus an out-of-line OCR worker, which is a separate change.
 *
 * The Google OAuth origins (`apis.google.com`, `accounts.google.com`,
 * `*.googleusercontent.com`) were dropped when the dead OAuth flow was deleted
 * in f1199f7. Nothing in the source references them any more, so granting them
 * script and frame privileges was pure standing attack surface.
 */
export function buildCsp(): string {
  return [
    "default-src 'self' data: blob: gap:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    `img-src ${IMG_SRC.join(' ')}`,
    `connect-src ${CONNECT_SRC.join(' ')}`,
    "frame-src 'self'",
    // Hardening directives: these have no legitimate use in this app.
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export const CSP = buildCsp();
