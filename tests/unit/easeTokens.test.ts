/**
 * Directive 19 — Batch 5: the CSS easing variables are pinned to the motion
 * tokens' own math, so the stylesheet copy can never drift from
 * springCss() — the single source of the app's four sanctioned springs.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { springCss, SPRINGS } from '../../src/components/motion/tokens';

const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf-8');

const cssVar = (name: string): string => {
  const m = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`--${name} missing from index.css`);
  return m[1].trim();
};

describe('The CSS easing variables equal the spring tokens', () => {
  it('all four springs are exposed as variables', () => {
    for (const name of Object.keys(SPRINGS) as (keyof typeof SPRINGS)[]) {
      expect(cssVar(`ease-${name}`)).toBe(springCss(name));
    }
  });

  it('no hand-rolled cubic-bezier remains in the token block (all four derive from springCss)', () => {
    // The pin above IS the derivation check; this guard just makes the
    // intent explicit: four variables, nothing else in the family.
    const easeVars = css.match(/--ease-[a-z]+:/g) || [];
    expect(easeVars.length).toBe(4);
  });
});
