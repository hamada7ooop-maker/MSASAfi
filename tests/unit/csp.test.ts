import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildCsp, CSP } from '@/csp';

/**
 * The Content Security Policy used to be maintained as two independent copies
 * — a <meta> tag in index.html and a dev-server header in vite.config.ts.
 * Duplicated security controls drift silently, so both now derive from
 * src/csp.ts. These tests defend that arrangement.
 */

const root = path.resolve(__dirname, '../..');
const readRoot = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');

describe('the CSP has exactly one source of truth', () => {
  it('index.html carries the placeholder, not a hand-written policy', () => {
    const html = readRoot('index.html');
    expect(html).toContain('content="%CSP%"');
    // A second literal policy would reintroduce the drift.
    expect(html).not.toMatch(/content="default-src/);
  });

  it('vite.config.ts imports the policy instead of restating it', () => {
    const cfg = readRoot('vite.config.ts');
    expect(cfg).toMatch(/from '\.\/src\/csp'/);
    expect(cfg).not.toMatch(/"default-src 'self'/);
  });

  it('the build fails loudly if the placeholder is ever removed', () => {
    // The injector throws rather than shipping a page with no policy.
    const cfg = readRoot('vite.config.ts');
    expect(cfg).toMatch(/missing the %CSP% placeholder/);
  });
});

describe('policy content', () => {
  it('declares every directive the app depends on', () => {
    for (const d of [
      'default-src',
      'script-src',
      'worker-src',
      'style-src',
      'font-src',
      'img-src',
      'connect-src',
      'frame-src',
    ]) {
      expect(CSP).toContain(`${d} `);
    }
  });

  it('keeps the hardening directives that have no legitimate use here', () => {
    expect(CSP).toContain("object-src 'none'");
    expect(CSP).toContain("base-uri 'self'");
    expect(CSP).toContain("form-action 'self'");
    expect(CSP).toContain("frame-ancestors 'none'");
  });

  it('no longer grants the deleted OAuth flow script or frame privileges', () => {
    // The Google OAuth flow was removed in f1199f7; these origins were left
    // behind as standing attack surface.
    const scriptSrc = CSP.split('; ').find((d) => d.startsWith('script-src'))!;
    const frameSrc = CSP.split('; ').find((d) => d.startsWith('frame-src'))!;
    expect(scriptSrc).not.toContain('apis.google.com');
    expect(scriptSrc).not.toContain('accounts.google.com');
    expect(frameSrc).not.toContain('accounts.google.com');
  });

  it('does not grant the wildcard https://*.google.com in connect-src', () => {
    // Far too broad: it covers every Google property, not the AI endpoint.
    expect(CSP).not.toContain(' https://*.google.com');
  });

  it('still allows the endpoints the app genuinely calls', () => {
    for (const origin of [
      'https://generativelanguage.googleapis.com', // Gemini
      'https://*.supabase.co', // cloud sync
      'https://api.frankfurter.app', // FX
      'https://api.coingecko.com', // market data
    ]) {
      expect(CSP).toContain(origin);
    }
  });

  it('keeps unsafe-eval only for script-src, where tesseract.js needs it', () => {
    // Documented exception: the OCR core is compiled at runtime.
    const directives = CSP.split('; ').filter((d) => d.includes("'unsafe-eval'"));
    expect(directives).toHaveLength(1);
    expect(directives[0]).toMatch(/^script-src/);
  });

  it('is deterministic', () => {
    expect(buildCsp()).toBe(buildCsp());
    expect(buildCsp()).toBe(CSP);
  });
});
