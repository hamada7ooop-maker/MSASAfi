/**
 * Request throttling, cancellation and input sanitisation for the AI advisor.
 *
 * Extracted from core/gemini.ts as part of L-1. These three concerns travel
 * together because they are all *pre-flight* guards: everything here runs
 * before a single byte reaches a provider.
 *
 * The module keeps its own state deliberately. A limiter whose clock lives in
 * the caller is not a limiter -- every caller would get a fresh allowance.
 */

/** Minimum gap between requests. Protects a paid quota from a stuck UI. */
export const AI_RATE_LIMIT_MS = 2000;

let _lastAiCallTime = 0;
let _currentAiController: AbortController | null = null;

/** True when the caller is inside the cool-down window. */
export function isRateLimited(now: number = Date.now()): boolean {
  return now - _lastAiCallTime < AI_RATE_LIMIT_MS;
}

/** Opens the cool-down window. Call only once a request is actually going out. */
export function markRequestStart(now: number = Date.now()): void {
  _lastAiCallTime = now;
}

/**
 * Aborts any in-flight request and issues a signal for the new one.
 *
 * A second question must cancel the first: without this the two responses race
 * and the user can be shown the answer to a question they already replaced.
 */
export function beginRequest(): AbortSignal {
  if (_currentAiController) {
    _currentAiController.abort();
    _currentAiController = null;
  }
  _currentAiController = new AbortController();
  return _currentAiController.signal;
}

/** Clears the stored controller once a request settles. */
export function endRequest(): void {
  _currentAiController = null;
}

/** Test seam: forget the cool-down and any in-flight controller. */
export function resetRateLimiter(): void {
  _lastAiCallTime = 0;
  _currentAiController = null;
}

/**
 * ── PROMPT-INJECTION DEFENCE — read before editing ────────────────────────
 *
 * Text reaching this function is not only what the user typed: transaction
 * descriptions and category names are interpolated into the same prompt, and
 * those can be attacker-influenced (an SMS-imported merchant name, a shared
 * budget label). A successful injection could make the model disregard its
 * instructions while still appearing to answer normally.
 *
 * Each pattern below is covered by its own test, so a regex dropped in a
 * refactor fails individually rather than hiding behind the others.
 * ──────────────────────────────────────────────────────────────────────────
 */
export function sanitizeUserMessage(message: unknown): string {
  if (!message || typeof message !== 'string') return '';
  
  let clean = message.trim().slice(0, 1000);
  clean = clean.replace(/<\/?[^>]+(>|$)/g, "");
  
  const injectionPatterns = [
    /ignore\s+(?:all\s+|previous\s+|the\s+|system\s+|above\s+)*(?:instructions|rules|directives|prompts)/gi,
    /system\s+override/gi,
    /you\s+are\s+now\s+a/gi,
    /new\s+instructions/gi,
    /translate\s+the\s+above/gi,
    /تجاهل\s+(?:التعليمات|السابقة|كل)/gi,
    /تغيير\s+الدور/gi
  ];
  
  for (const pattern of injectionPatterns) {
    if (pattern.test(clean)) {
      clean = clean.replace(pattern, "[Neutralized Override Pattern]");
    }
  }
  
  return clean;
}
