/**
 * Masarifi — redaction layer for crash-report payloads.
 *
 * ## Why a finance app cannot just switch Crashlytics on
 *
 * Crash reporting ships strings to a third party (Google). In most apps that
 * is a minor concern. Here, the strings routinely contain the user's financial
 * life: 171 `silentFail` sites and 34 direct `recordException` calls forward
 * error context, and several interpolate live values into the message —
 * `[Global] ${msg}` from `window.onerror` will happily carry whatever text was
 * in scope when something threw. Error messages from the DB layer quote record
 * contents. Stack frames carry URLs, and this app builds URLs with API keys in
 * the query string.
 *
 * Sending that raw would replace a diagnostics gap with a privacy breach —
 * and for a Saudi user base, potentially a regulatory one. So nothing reaches
 * the transport without passing through here first.
 *
 * ## Design stance: redact aggressively, and prefer losing detail
 *
 * A crash report is for locating a fault, not for reconstructing state. Where
 * there is doubt about whether a token is a transaction amount or a harmless
 * line number, this module redacts. Losing a number from a report costs an
 * engineer a little context; leaking one costs the user their privacy. The
 * asymmetry is not close, so the tie always breaks toward redaction.
 *
 * What is deliberately preserved: the error class, the tag/context prefix
 * (`[DB]`, `[Cloud]`, …), the code path, file names and line numbers. That is
 * what actually makes a report actionable.
 */

/** Replacement token, kept short and greppable. */
const R = '[redacted]';

/**
 * Ordered redaction rules. Order matters: the more specific patterns run
 * first, so a credential inside a URL is not first mangled by the generic
 * number rule.
 */
const RULES: Array<{ name: string; re: RegExp; to: string }> = [
  // ── Credentials ─────────────────────────────────────────────────────────
  // Query-string secrets: ?apiKey=..., &access_token=..., &token=...
  {
    name: 'url-credential',
    re: /([?&](?:api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|token|key|secret|password|auth|signature|sig)=)[^&\s"'`]+/gi,
    to: `$1${R}`,
  },
  // Bearer / Basic authorization headers echoed into messages.
  {
    name: 'auth-header',
    re: /\b(bearer|basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi,
    to: `$1 ${R}`,
  },
  // JWTs anywhere (three base64url segments).
  {
    name: 'jwt',
    re: /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g,
    to: R,
  },
  // Vendor key shapes: Google AIza..., OpenAI/Groq sk-..., generic long hex.
  { name: 'google-key', re: /\bAIza[0-9A-Za-z_-]{10,}\b/g, to: R },
  { name: 'sk-key', re: /\b(?:sk|pk|rk)[_-][A-Za-z0-9]{10,}\b/g, to: R },
  { name: 'long-hex', re: /\b[0-9a-f]{32,}\b/gi, to: R },
  // JSON/assignment form: "apiKey": "...", pinHash = '...'
  {
    name: 'assigned-secret',
    re: /(["']?\b(?:api[_-]?key|apikey|token|secret|password|passcode|pin|pin_?hash|pin_?salt|wrappedmdk|credential)\b["']?\s*[:=]\s*)["']?[^\s,;"'}\])]+["']?/gi,
    to: `$1${R}`,
  },

  // ── Personal identifiers ────────────────────────────────────────────────
  { name: 'email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, to: R },
  // IBAN (Saudi and general form).
  { name: 'iban', re: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g, to: R },
  // Card-like digit runs, with or without separators.
  { name: 'card', re: /\b(?:\d[ -]?){13,19}\b/g, to: R },
  // Phone numbers, including +966 forms.
  { name: 'phone', re: /\+\d[\d\s()-]{7,}\d/g, to: R },

  // ── Filesystem / device paths that embed a user or app identity ─────────
  {
    name: 'path',
    re: /(?:\/(?:data|storage|Users|home)\/|file:\/\/)[^\s"'`)]+/g,
    to: R,
  },

  // ── Money ───────────────────────────────────────────────────────────────
  // Any number carrying a decimal part, or any integer of 4+ digits. This is
  // intentionally broad: it catches 1500.75, 25000 and 1,250.00. Line numbers
  // and small counts (1-3 digits, no decimal) survive, which keeps stack
  // frames useful.
  { name: 'decimal-amount', re: /\b\d{1,3}(?:,\d{3})*\.\d+\b|\b\d+\.\d+\b/g, to: R },
  { name: 'large-integer', re: /\b\d{4,}\b/g, to: R },
];

/**
 * Redact secrets, identifiers and monetary values from a single string.
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string' || !input) return '';
  let out = input;
  for (const rule of RULES) {
    out = out.replace(rule.re, rule.to);
  }
  return out;
}

/** Longest message we forward; keeps a runaway string from becoming the report. */
export const MAX_MESSAGE_LENGTH = 500;
/** Stack frames retained — enough to locate a fault, not a full memory dump. */
export const MAX_STACK_FRAMES = 20;

/**
 * Sanitize an error message: redact, collapse whitespace, and truncate.
 */
export function sanitizeMessage(message: string): string {
  const clean = sanitizeText(String(message ?? '')).replace(/\s+/g, ' ').trim();
  return clean.length > MAX_MESSAGE_LENGTH
    ? `${clean.slice(0, MAX_MESSAGE_LENGTH)}…[truncated]`
    : clean;
}

/**
 * Sanitize a stack trace.
 *
 * Frames are redacted line by line and capped. The first line of a stack is
 * the error message itself, so it receives the same treatment as any message.
 */
export function sanitizeStack(stack: string | undefined): string | undefined {
  if (!stack || typeof stack !== 'string') return undefined;
  const lines = stack.split('\n').slice(0, MAX_STACK_FRAMES).map((l) => sanitizeText(l).trimEnd());
  const out = lines.join('\n').trim();
  return out || undefined;
}

/**
 * Build the full sanitized payload for a crash report.
 *
 * Returns only primitives that are safe to transmit: a redacted message, a
 * redacted stack, and the error's constructor name (which is pure type
 * information and often the single most useful field).
 */
export function sanitizeCrashPayload(
  message: string,
  error?: unknown
): { message: string; stacktrace?: string; name?: string } {
  const payload: { message: string; stacktrace?: string; name?: string } = {
    message: sanitizeMessage(message),
  };

  if (error instanceof Error) {
    const stack = sanitizeStack(error.stack);
    if (stack) payload.stacktrace = stack;
    if (error.name) payload.name = String(error.name).slice(0, 100);
  } else if (typeof error === 'string') {
    const stack = sanitizeStack(error);
    if (stack) payload.stacktrace = stack;
  }

  return payload;
}
