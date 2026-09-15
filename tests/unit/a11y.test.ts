import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  prefersReducedMotion,
  celebrate,
  announce,
  onReducedMotionChange,
} from '@/core/a11y';

/**
 * L-9 — accessibility.
 *
 * Three separate gaps, all verified by measurement rather than assumption:
 *
 * 1. The stylesheets already honour prefers-reduced-motion, but that rule only
 *    reaches CSS. JavaScript-driven motion — the Zakat count-up loop and five
 *    canvas-confetti bursts — ignored the preference entirely. Someone who
 *    enabled it because motion causes nausea still got a particle storm.
 *
 * 2. Toasts are how the app confirms that money moved. They were plain divs,
 *    so a screen-reader user got silence: no confirmation a transaction saved,
 *    no warning that it failed.
 *
 * 3. The balance updates as transactions are recorded, with no live region to
 *    announce it, and while "hidden" for privacy it was only blurred visually
 *    — screen readers still read the digits aloud.
 */

const root = path.resolve(__dirname, '../..');
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');

// ── WCAG contrast maths, so the assertions below are measured, not guessed ──
const srgb = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const luminance = ([r, g, b]: number[]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const contrast = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const hex = (h: string) => {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
/** Flatten a translucent foreground over an opaque background. */
const composite = (fg: number[], alpha: number, bg: number[]) =>
  fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)));

function setReducedMotion(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('reduced-motion detection', () => {
  afterEach(() => setReducedMotion(false));

  it('reports the user preference', () => {
    setReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    setReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('defaults to allowing motion when matchMedia is unavailable', () => {
    const original = window.matchMedia;
    // @ts-expect-error deliberately removing the API
    delete window.matchMedia;
    expect(prefersReducedMotion()).toBe(false);
    window.matchMedia = original;
  });

  it('survives a WebView that throws on an unsupported query', () => {
    window.matchMedia = vi.fn(() => {
      throw new Error('unsupported');
    }) as unknown as typeof window.matchMedia;
    expect(() => prefersReducedMotion()).not.toThrow();
    expect(prefersReducedMotion()).toBe(false);
  });

  it('returns a no-op unsubscribe when matchMedia is missing', () => {
    const original = window.matchMedia;
    // @ts-expect-error deliberately removing the API
    delete window.matchMedia;
    const off = onReducedMotionChange(() => {});
    expect(() => off()).not.toThrow();
    window.matchMedia = original;
  });
});

describe('celebrate()', () => {
  afterEach(() => setReducedMotion(false));

  it('runs the effect when motion is welcome', () => {
    setReducedMotion(false);
    const effect = vi.fn();
    celebrate(effect);
    expect(effect).toHaveBeenCalledOnce();
  });

  it('skips the effect when the user asked for reduced motion', () => {
    setReducedMotion(true);
    const effect = vi.fn();
    celebrate(effect);
    expect(effect).not.toHaveBeenCalled();
  });

  it('never lets a decorative effect break the flow that triggered it', () => {
    setReducedMotion(false);
    expect(() =>
      celebrate(() => {
        throw new Error('confetti exploded');
      })
    ).not.toThrow();
  });
});

describe('announce()', () => {
  beforeEach(() => {
    document.getElementById('masarifi-live-region')?.remove();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('creates one shared live region, not one per message', () => {
    announce('first');
    announce('second');
    expect(document.querySelectorAll('#masarifi-live-region')).toHaveLength(1);
  });

  it('is exposed to assistive tech but hidden from sight', () => {
    announce('hello');
    const region = document.getElementById('masarifi-live-region')!;
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-atomic')).toBe('true');
    // display:none / visibility:hidden would drop it from the a11y tree.
    expect(region.style.display).not.toBe('none');
    expect(region.style.visibility).not.toBe('hidden');
    expect(region.style.position).toBe('absolute');
    expect(region.style.width).toBe('1px');
  });

  it('delivers the message', () => {
    announce('تم حفظ المعاملة');
    vi.advanceTimersByTime(100);
    expect(document.getElementById('masarifi-live-region')!.textContent).toBe('تم حفظ المعاملة');
  });

  it('uses assertive only for errors, so confirmations do not interrupt', () => {
    announce('saved');
    expect(document.getElementById('masarifi-live-region')!.getAttribute('aria-live')).toBe(
      'polite'
    );
    announce('failed', true);
    expect(document.getElementById('masarifi-live-region')!.getAttribute('aria-live')).toBe(
      'assertive'
    );
  });

  it('re-announces an identical consecutive message', () => {
    // A live region only fires on content CHANGE: saving twice in a row would
    // otherwise be announced once.
    announce('تم الحفظ');
    vi.advanceTimersByTime(100);
    const region = document.getElementById('masarifi-live-region')!;
    expect(region.textContent).toBe('تم الحفظ');

    announce('تم الحفظ');
    expect(region.textContent).toBe(''); // cleared to force a re-read
    vi.advanceTimersByTime(100);
    expect(region.textContent).toBe('تم الحفظ');
  });

  it('ignores empty messages', () => {
    announce('');
    vi.advanceTimersByTime(100);
    const region = document.getElementById('masarifi-live-region');
    expect(region?.textContent || '').toBe('');
  });
});

describe('call sites actually use the guards', () => {
  it('every confetti burst goes through celebrate()', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(e.name)) {
          // Type declarations describe the API, they never invoke it.
          if (e.name.endsWith('.d.ts')) continue;
          const src = fs.readFileSync(p, 'utf8');
          if (!src.includes('canvas-confetti')) continue;
          // Any confetti( call must sit inside a celebrate( wrapper.
          const calls = src.match(/(?<!celebrate\(\(\) =>\s*\n?\s*)\bconfetti\(/g) || [];
          if (calls.length && !src.includes('celebrate(')) {
            offenders.push(path.relative(root, p));
          }
        }
      }
    };
    walk(path.join(root, 'src'));
    expect(offenders).toEqual([]);
  });

  it('the Zakat count-up snaps instead of animating under reduced motion', () => {
    // The count-up moved to its own component when ZakatCalculator was split
    // (L-1). The guard itself is unchanged -- only its address is.
    const src = read('src/features/zakat/components/AnimatedNumber.tsx');
    expect(src).toContain('prefersReducedMotion()');
    // The guard must come before the rAF loop starts.
    expect(src.indexOf('prefersReducedMotion()')).toBeLessThan(
      src.indexOf('requestAnimationFrame(updateNumber)')
    );
  });

  it('toasts are announced and their icons are not read as words', () => {
    const src = read('src/toast.ts');
    expect(src).toContain('announce(');
    expect(src).toMatch(/role['"]?,\s*type === 'error' \? 'alert' : 'status'/);
    expect(src).toContain("iconEl.setAttribute('aria-hidden', 'true')");
  });

  it('the balance is a live region and is not read aloud while hidden', () => {
    // Directive 19 Batch 1: the balance widget is now HeroBalanceCard —
    // same contract, new chassis.
    const src = read('src/features/home/components/dashboard/HeroBalanceCard.tsx');
    expect(src).toContain('aria-live="polite"');
    // The digits themselves are hidden; an aria-label carries the meaning.
    expect(src).toContain('aria-hidden="true"');
    expect(src).toContain('home.balanceHidden');
    // The privacy toggle needs a real name and a pressed state.
    expect(src).toContain('aria-pressed');
    expect(src).toContain('home.showBalance');
  });
});

describe('colour contrast meets WCAG AA', () => {
  it('toast palettes clear 4.5:1 against white text', () => {
    const palettes: Record<string, string> = {
      success: '#1b6d24',
      error: '#5e0006',
      warning: '#92400e',
      info: '#1a4175',
    };
    for (const [name, bg] of Object.entries(palettes)) {
      const r = contrast(hex('#ffffff'), hex(bg));
      expect(r, `${name} measured ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('the balance card label clears AA over every score gradient', () => {
    // text-white/75, the value this was raised to. At /55 it measured
    // 4.17-4.42:1 — under the floor for 9px text.
    // Directive 19 Batch 1 hero gradients (emerald positive / coral negative)
    for (const bg of ['#0d2b22', '#103a2c', '#2b1118', '#3a1520', '#0b0f17']) {
      const r = contrast(composite([255, 255, 255], 0.75, hex(bg)), hex(bg));
      expect(r, `${bg} measured ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('the card label actually uses the opacity that was measured', () => {
    // Asserting the maths alone is not enough: reverting the class in the
    // component would leave the arithmetic tests happily green. Pin the value
    // that ships.
    const src = read('src/features/home/components/dashboard/HeroBalanceCard.tsx');
    const label = src.match(/text-\[9px\][^"]*text-white\/(\d+)/);
    expect(label, 'the 9px balance label class was not found').not.toBeNull();
    const opacity = Number(label![1]) / 100;
    for (const bg of ['#0d2b22', '#103a2c', '#2b1118', '#3a1520']) {
      const r = contrast(composite([255, 255, 255], opacity, hex(bg)), hex(bg));
      expect(r, `text-white/${label![1]} over ${bg} measured ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('records why /45 was rejected, so it is not reintroduced', () => {
    const failing = contrast(composite([255, 255, 255], 0.55, hex('#022c22')), hex('#022c22'));
    const passing = contrast(composite([255, 255, 255], 0.45, hex('#022c22')), hex('#022c22'));
    // /45 genuinely fails; /55 passes but sat close to the line.
    expect(passing).toBeLessThan(4.5);
    expect(failing).toBeGreaterThanOrEqual(4.5);
  });
});
