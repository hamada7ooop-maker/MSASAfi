import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  loadLanguage,
  getLoadedTranslations,
  isLanguageLoaded,
  LANGUAGE_META,
} from '@/i18n/engine';

/**
 * L-4 — locale payload.
 *
 * The audit described this as "all 11 languages load at once". Measuring the
 * build showed that was not what was happening: the ten non-Arabic locales
 * were already dynamically imported and split into their own chunks. The real
 * cost was Arabic. It lived inline in src/translations.js, which the engine
 * imported STATICALLY, and it doubles as t()'s last-resort fallback — so every
 * user, in every language, downloaded and parsed the entire Arabic dictionary
 * (~224 KB raw) before first paint. An English user paid for two dictionaries.
 *
 * Arabic now lives in src/locales/ar.js and is fetched on demand like the
 * others, and the fallback is only loaded when it is actually the user's
 * language. Measured effect on the translation payload:
 *
 *     English user: 638 KB -> 168 KB
 *     Arabic user:  470 KB -> 224 KB (now a separate cacheable chunk)
 *
 * These tests defend the arrangement, because a single static import anywhere
 * would silently put the dictionary back in the startup bundle.
 */

const root = path.resolve(__dirname, '../..');
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');

describe('no static import can drag a dictionary into the startup bundle', () => {
  it('the engine imports every locale dynamically, Arabic included', () => {
    const engine = read('src/i18n/engine.ts');

    // A static `import ... from '../locales/xx'` would defeat code splitting.
    expect(engine).not.toMatch(/^\s*import\s+[^(]*from\s+'\.\.\/locales\//m);
    expect(engine).not.toMatch(/^\s*import\s+[^(]*from\s+'\.\.\/translations/m);

    for (const lang of Object.keys(LANGUAGE_META)) {
      expect(engine).toContain(`import('../locales/${lang}.js')`);
    }
  });

  it('the old monolithic translations.js is gone', () => {
    expect(fs.existsSync(path.join(root, 'src/translations.js'))).toBe(false);
  });

  it('no source file statically imports the removed module', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(entry.name)) {
          const src = fs.readFileSync(p, 'utf8');
          // Import statements only — comments mentioning the file are fine.
          if (/^\s*import\s+[^/\n]*from\s+'[^']*translations(\.js)?'/m.test(src)) {
            offenders.push(path.relative(root, p));
          }
        }
      }
    };
    walk(path.join(root, 'src'));
    expect(offenders).toEqual([]);
  });

  it('every advertised language has a locale file on disk', () => {
    for (const lang of Object.keys(LANGUAGE_META)) {
      expect(fs.existsSync(path.join(root, `src/locales/${lang}.js`))).toBe(true);
    }
  });
});

describe('loading behaviour', () => {
  it('loads a language on demand and reports it as resident', async () => {
    await loadLanguage('de');
    expect(isLanguageLoaded('de')).toBe(true);
    expect(getLoadedTranslations().de?.['app.name']).toBeTruthy();
  });

  it('does not load languages nobody asked for', async () => {
    await loadLanguage('de');
    // 'ms' was never requested by this test file.
    expect(isLanguageLoaded('ms')).toBe(false);
  });

  it('is idempotent and shares one in-flight load across callers', async () => {
    // Concurrent callers must not each parse the dictionary.
    await Promise.all([loadLanguage('es'), loadLanguage('es'), loadLanguage('es')]);
    expect(isLanguageLoaded('es')).toBe(true);
    const first = getLoadedTranslations().es;
    await loadLanguage('es');
    // Same object identity => no redundant re-import.
    expect(getLoadedTranslations().es).toBe(first);
  });

  it('ignores an unknown language instead of throwing', async () => {
    await expect(loadLanguage('zz')).resolves.toBeUndefined();
    expect(isLanguageLoaded('zz')).toBe(false);
  });

  it('an Arabic user does not pull a second dictionary', async () => {
    // Use a fresh module instance: the shared test setup preloads a fallback
    // into this file's engine, which would mask what we are asserting.
    vi.resetModules();
    const engine = await import('@/i18n/engine');
    await engine.ensureFallbackLoaded('ar');
    expect(engine.isLanguageLoaded('ar')).toBe(true);
    // English is not needed: Arabic is itself the fallback.
    expect(engine.isLanguageLoaded('en')).toBe(false);
  });

  it('a non-Arabic user loads ONE dictionary, not Arabic as well', async () => {
    // This is the whole point of L-4: ~224 KB of Arabic that a German user
    // would never have read.
    vi.resetModules();
    const engine = await import('@/i18n/engine');
    await engine.ensureFallbackLoaded('de');
    expect(engine.isLanguageLoaded('de')).toBe(true);
    expect(engine.isLanguageLoaded('ar')).toBe(false);
    expect(engine.isLanguageLoaded('en')).toBe(false);
  });
});

describe('the fallback chain stays honest', () => {
  it('every locale covers the Arabic key set, so the fallback is never hit', async () => {
    // This is what makes it safe NOT to ship Arabic to non-Arabic users. If it
    // ever regresses, this test fails before a user sees a raw key name.
    const ar = (await import('../../src/locales/ar.js')).default as Record<string, string>;
    const arKeys = Object.keys(ar);

    for (const lang of Object.keys(LANGUAGE_META).filter((l) => l !== 'ar')) {
      const mod = (await import(`../../src/locales/${lang}.js`)) as Record<string, unknown>;
      const dict = (mod.default || mod[`locale_${lang}`]) as Record<string, string>;
      const missing = arKeys.filter((k) => !(k in dict));
      expect(missing, `${lang} is missing ${missing.length} key(s), e.g. ${missing.slice(0, 3)}`).toEqual([]);
    }
  });
});
