import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  sanitizeMessage,
  sanitizeStack,
  sanitizeCrashPayload,
  MAX_MESSAGE_LENGTH,
  MAX_STACK_FRAMES,
} from '@/core/crashSanitizer';

/**
 * Tests for crash-report redaction.
 *
 * Crash reporting sends strings to a third party. In a finance app those
 * strings routinely contain the user's financial life: 171 silentFail sites
 * and 34 recordException calls forward error context, several interpolate live
 * values, and `window.onerror` will carry whatever text was in scope. Error
 * messages from the DB layer quote record contents, and stack frames carry
 * URLs — which this app builds with API keys in the query string.
 *
 * Turning on reporting without redaction would swap a diagnostics gap for a
 * privacy breach. These tests pin the redaction contract.
 *
 * Stance: when in doubt, redact. Losing a number from a report costs an
 * engineer context; leaking one costs the user their privacy.
 */

const R = '[redacted]';

describe('credentials are redacted', () => {
  it('strips API keys from query strings', () => {
    const out = sanitizeText(
      'Failed: https://api.currentsapi.services/v1/latest-news?apiKey=abc123secretvalue&x=1'
    );
    expect(out).not.toContain('abc123secretvalue');
    expect(out).toContain(R);
  });

  it('strips access and refresh tokens from query strings', () => {
    expect(sanitizeText('?access_token=ya29.A0ARrdaM9xyz')).not.toContain('ya29');
    expect(sanitizeText('&refresh_token=1//04abcdEFGH')).not.toContain('04abcdEFGH');
  });

  it('strips bearer authorization headers', () => {
    const out = sanitizeText('401 with header Bearer sbp_0123456789abcdefghij');
    expect(out).not.toContain('sbp_0123456789abcdefghij');
  });

  it('strips JWTs', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NSJ9.dBjftJeZ4CVPmB92K27uhbUJU1p1r';
    expect(sanitizeText(`session ${jwt} expired`)).not.toContain(jwt);
  });

  it('strips vendor key shapes', () => {
    expect(sanitizeText('key AIzaSyD1234567890abcdefg')).not.toContain('AIzaSyD');
    expect(sanitizeText('groq sk-abcdef1234567890')).not.toContain('sk-abcdef1234567890');
  });

  it('strips assigned secrets in JSON or code form', () => {
    expect(sanitizeText('{"apiKey": "supersecret123"}')).not.toContain('supersecret123');
    expect(sanitizeText("pinHash = 'a1b2c3d4'")).not.toContain('a1b2c3d4');
  });

  it('strips the wrapped master data key if it ever appears', () => {
    expect(sanitizeText('wrappedMDK: "AAAAbbbbCCCCdddd"')).not.toContain('AAAAbbbbCCCCdddd');
  });

  it('strips long hex strings (hashes, salts, raw keys)', () => {
    const hex = 'a'.repeat(64);
    expect(sanitizeText(`digest ${hex}`)).not.toContain(hex);
  });
});

describe('personal identifiers are redacted', () => {
  it('strips email addresses', () => {
    const out = sanitizeText('Sync failed for user ahmed.ali@example.com');
    expect(out).not.toContain('ahmed.ali@example.com');
    expect(out).toContain(R);
  });

  it('strips IBANs', () => {
    expect(sanitizeText('IBAN SA0380000000608010167519')).not.toContain('SA0380000000608010167519');
  });

  it('strips card numbers with and without separators', () => {
    expect(sanitizeText('card 4111111111111111 declined')).not.toContain('4111111111111111');
    expect(sanitizeText('card 4111-1111-1111-1111')).not.toContain('4111-1111-1111-1111');
  });

  it('strips phone numbers', () => {
    expect(sanitizeText('sms to +966501234567 failed')).not.toContain('+966501234567');
  });

  it('strips filesystem paths that embed a user or app identity', () => {
    const out = sanitizeText('ENOENT /data/user/0/com.masarifi.app/files/backup.json');
    expect(out).not.toContain('com.masarifi.app/files');
  });
});

describe('monetary values are redacted', () => {
  it('strips decimal amounts', () => {
    const out = sanitizeText('Refusing to write amount 1500.75 to transactions');
    expect(out).not.toContain('1500.75');
    expect(out).toContain(R);
  });

  it('strips large integers that could be amounts', () => {
    expect(sanitizeText('balance 25000 exceeded')).not.toContain('25000');
  });

  it('strips formatted amounts with thousands separators', () => {
    expect(sanitizeText('total 1,250.00 SAR')).not.toContain('1,250.00');
  });

  it('redacts a realistic audit-log style message end to end', () => {
    const out = sanitizeText('add_transaction Added: Salary 25000.50 for ahmed@example.com');
    expect(out).not.toContain('25000.50');
    expect(out).not.toContain('ahmed@example.com');
    // The diagnostic part survives.
    expect(out).toContain('add_transaction');
  });
});

describe('diagnostic value is preserved', () => {
  it('keeps the tag/context prefix', () => {
    expect(sanitizeText('[DB] Refusing to write plaintext')).toContain('[DB]');
    expect(sanitizeText('[Cloud] Network request failed')).toContain('[Cloud]');
  });

  it('keeps small numbers such as line numbers and retry counts', () => {
    // A 1-3 digit integer with no decimal part is not plausibly an amount, and
    // discarding it would gut stack traces.
    const out = sanitizeText('Attempt 2 of 3 failed at line 42');
    expect(out).toContain('2');
    expect(out).toContain('3');
    expect(out).toContain('42');
  });

  it('keeps the error type name in the payload', () => {
    const payload = sanitizeCrashPayload('boom', new TypeError('bad thing'));
    expect(payload.name).toBe('TypeError');
  });

  it('keeps file names in stack frames', () => {
    const stack = 'Error: x\n    at encryptRecord (encryption.ts:54:11)';
    const out = sanitizeStack(stack)!;
    expect(out).toContain('encryption.ts');
    expect(out).toContain('encryptRecord');
  });
});

describe('bounds', () => {
  it('truncates over-long messages', () => {
    const out = sanitizeMessage('x'.repeat(MAX_MESSAGE_LENGTH + 500));
    expect(out.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH + 20);
    expect(out).toContain('[truncated]');
  });

  it('caps the number of stack frames', () => {
    const stack = Array.from({ length: 60 }, (_, i) => `    at fn${i} (f.ts:1:1)`).join('\n');
    expect(sanitizeStack(stack)!.split('\n').length).toBeLessThanOrEqual(MAX_STACK_FRAMES);
  });

  it('collapses whitespace', () => {
    expect(sanitizeMessage('a\n\n   b')).toBe('a b');
  });
});

describe('robustness — the sanitizer must never throw', () => {
  it('handles empty, null and undefined input', () => {
    expect(sanitizeText('')).toBe('');
    expect(sanitizeText(undefined as unknown as string)).toBe('');
    expect(sanitizeText(null as unknown as string)).toBe('');
    expect(sanitizeStack(undefined)).toBeUndefined();
    expect(sanitizeMessage(undefined as unknown as string)).toBe('');
  });

  it('handles non-Error rejection values', () => {
    expect(() => sanitizeCrashPayload('m', { weird: true })).not.toThrow();
    expect(sanitizeCrashPayload('m', 'string reason').message).toBe('m');
  });

  it('produces a payload with no stacktrace when there is no error', () => {
    const payload = sanitizeCrashPayload('plain message');
    expect(payload.message).toBe('plain message');
    expect(payload.stacktrace).toBeUndefined();
  });

  it('sanitizes the message inside the payload, not just the stack', () => {
    const payload = sanitizeCrashPayload('leak 9999.99 and a@b.com', new Error('inner 1234.56'));
    expect(payload.message).not.toContain('9999.99');
    expect(payload.message).not.toContain('a@b.com');
    expect(payload.stacktrace ?? '').not.toContain('1234.56');
  });
});
