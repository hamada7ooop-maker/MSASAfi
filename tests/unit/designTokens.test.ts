import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Directive 19 — Batch 0: design token guards.
 *
 * These tests pin the approved token system to the CSS that actually ships:
 * the Deep Obsidian ladder, the colorblind-safe financial pair, the radii and
 * elevation scales, the re-based dark default, and the single-family font
 * consolidation. A refactor that silently drops or splinters any of them
 * fails here before it reaches a user's eyes.
 */
const read = (rel: string): string =>
  readFileSync(resolve(__dirname, '../../', rel), 'utf-8');

describe('Directive 19 — the approved token system ships intact', () => {
  it('exposes the Deep Obsidian ladder exactly as approved', () => {
    const css = read('src/index.css');
    const ladder: Record<string, string> = {
      950: '#070A10',
      900: '#0B0F17',
      800: '#111826',
      700: '#161F2E',
      600: '#1D2839',
      500: '#243146',
    };
    for (const [step, value] of Object.entries(ladder)) {
      expect(css).toContain(`--color-obsidian-${step}: ${value};`);
    }
  });

  it('exposes the colorblind-safe financial pair and the night brand color', () => {
    const css = read('src/index.css');
    expect(css).toContain('--color-income: #34D399;');
    expect(css).toContain('--color-expense: #FB7185;');
    expect(css).toContain('--color-primary-night: #7CB0FF;');
  });

  it('exposes the unified radii scale (5 semantic steps)', () => {
    const css = read('src/index.css');
    expect(css).toContain('--radius-chip: 12px;');
    expect(css).toContain('--radius-tile: 20px;');
    expect(css).toContain('--radius-card: 28px;');
    expect(css).toContain('--radius-sheet: 36px;');
  });

  it('exposes the 4-level light-mode elevation ladder', () => {
    const css = read('src/index.css');
    for (const level of ['e1', 'e2', 'e3', 'e4']) {
      expect(css).toMatch(new RegExp(`--shadow-${level}: 0 `));
    }
  });

  it('re-bases the default dark mode on Obsidian (background #0B0F17)', () => {
    const css = read('src/index.css');
    expect(css).toMatch(/\.dark\s*\{[^}]*--color-background:\s*var\(--color-obsidian-900\)/s);
    expect(css).toMatch(/\.dark\s*\{[^}]*--color-surface:\s*var\(--color-obsidian-800\)/s);
  });

  it("re-bases the user-selectable 'dim' palette on the same Obsidian ladder", () => {
    const css = read('src/index.css');
    expect(css).toMatch(
      /html\.dark\[data-palette="dim"\]\s*\{[^}]*--color-background:\s*var\(--color-obsidian-900\)/s
    );
  });

  it('ships the primitive classes (num-fin, glass-panel, ambient-glow)', () => {
    const css = read('src/index.css');
    expect(css).toMatch(/\.num-fin\s*\{[^}]*font-variant-numeric:\s*tabular-nums/s);
    expect(css).toMatch(/\.glass-panel\s*\{[^}]*backdrop-filter:\s*blur\(16px\)/s);
    expect(css).toMatch(/\.ambient-glow::before\s*\{/);
  });
});

describe('Directive 19 — the single-family font consolidation holds', () => {
  const FRAGMENTED = /Tajawal|Manrope/;

  it('keeps every font-family declaration on IBM Plex Sans Arabic', () => {
    for (const file of ['src/index.css', 'src/styles/globals.css', 'index.html']) {
      const text = read(file);
      const declarations = text.match(/font-family:[^;}]+/g) ?? [];
      expect(declarations.length, `${file} should still declare fonts`).toBeGreaterThan(0);
      for (const declaration of declarations) {
        expect(`${file}: ${declaration}`).not.toMatch(FRAGMENTED);
        expect(`${file}: ${declaration}`).not.toMatch(/'Inter'/);
      }
    }
  });

  it('keeps chart and PDF renderers on the approved family', () => {
    expect(read('src/features/home/components/NetWorthTrend.tsx')).not.toMatch(FRAGMENTED);
    expect(read('src/services/pdfExport.ts')).not.toMatch(FRAGMENTED);
  });

  it('keeps the language metadata fonts unified', () => {
    expect(read('src/i18n/engine.ts')).not.toMatch(FRAGMENTED);
  });

  it('bundles exactly one font family via fontsource (Directive 19 Batch 1)', () => {
    const main = read('src/main.tsx');
    const imports = main.match(/@fontsource\/[a-z0-9-]+/g) ?? [];
    // Five weights of the one approved family — nothing else ships.
    expect(imports.length).toBe(5);
    for (const imp of imports) {
      expect(imp).toBe('@fontsource/ibm-plex-sans-arabic');
    }
    expect(main).not.toMatch(/@fontsource\/(tajawal|manrope|inter)/);
  });
});
