import { describe, it, expect, vi, afterEach } from 'vitest';
import { SPRINGS, DURATIONS, springCss, motionEnabled } from '../../src/components/motion/tokens';

/**
 * Directive 19 — Batch 0: the motion vocabulary.
 * Four springs, their CSS approximations, and the reduced-motion gate.
 * These tests pin the physics so a "quick tweak" can never silently
 * redistribute the app's entire feel.
 */
const overshootOf = (curve: string): number => {
  const y2 = Number.parseFloat(curve.split(',')[3].replace(')', ''));
  return y2 - 1;
};

describe('motion tokens — the four sanctioned springs', () => {
  it('defines exactly the four approved springs with valid physics', () => {
    expect(Object.keys(SPRINGS).sort()).toEqual(['gentle', 'playful', 'smooth', 'snappy']);
    for (const spec of Object.values(SPRINGS)) {
      expect(spec.stiffness).toBeGreaterThan(0);
      expect(spec.damping).toBeGreaterThan(0);
      expect(spec.mass).toBeGreaterThan(0);
    }
  });

  it('keeps the approved presets stable (the feel IS the spec)', () => {
    expect(SPRINGS.snappy).toEqual({ stiffness: 500, damping: 30, mass: 0.9 });
    expect(SPRINGS.smooth).toEqual({ stiffness: 260, damping: 28, mass: 1.0 });
    expect(SPRINGS.gentle).toEqual({ stiffness: 170, damping: 24, mass: 1.1 });
    expect(SPRINGS.playful).toEqual({ stiffness: 700, damping: 22, mass: 0.6 });
  });

  it('approximates every spring as a valid cubic-bezier with bounded overshoot', () => {
    for (const name of Object.keys(SPRINGS) as (keyof typeof SPRINGS)[]) {
      const curve = springCss(name);
      expect(curve).toMatch(/^cubic-bezier\(-?\d+(\.\d+)?, -?\d+(\.\d+)?, -?\d+(\.\d+)?, \d+(\.\d+)?\)$/);
      expect(overshootOf(curve)).toBeGreaterThanOrEqual(0);
      expect(overshootOf(curve)).toBeLessThanOrEqual(0.6);
    }
  });

  it('gives the least-damped spring (playful) the most overshoot', () => {
    expect(overshootOf(springCss('playful'))).toBeGreaterThan(overshootOf(springCss('smooth')));
    expect(overshootOf(springCss('smooth'))).toBeGreaterThan(0);
  });

  it('ships the non-spring duration ladder', () => {
    expect(DURATIONS).toEqual({ instant: 100, quick: 200, standard: 320, slow: 480 });
  });
});

describe('motionEnabled — the reduced-motion gate', () => {
  afterEach(() => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('allows motion when the platform has no reduced-motion preference', () => {
    expect(motionEnabled()).toBe(true);
  });

  it('falls silent when the user asks for reduced motion', () => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    expect(motionEnabled()).toBe(false);
  });
});
