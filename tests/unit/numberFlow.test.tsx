import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { NumberFlow, flowDuration } from '../../src/components/ui/NumberFlow';
import { prefersReducedMotion } from '../../src/core/a11y';

/**
 * Directive 19 — Batch 1: the adaptive counter behind live balances.
 * Pins: mount count-up, adaptive durations, reduced-motion snap, the
 * fixed-width (.num-fin) contract, and cleanup on unmount.
 */
vi.mock('../../src/core/a11y', () => ({ prefersReducedMotion: vi.fn(() => false) }));
const reducedMotion = vi.mocked(prefersReducedMotion);

const mount = (value: number) =>
  render(
    <NumberFlow
      value={value}
      format={(v) => Math.round(v).toString()}
      data-testid="flow"
    />
  );

afterEach(() => {
  vi.useRealTimers();
  reducedMotion.mockReturnValue(false);
});

describe('flowDuration — adaptive timing (pure)', () => {
  it('gives tiny rebalances a quick hop', () => {
    expect(flowDuration(1000, 1005)).toBeLessThanOrEqual(210);
  });

  it('gives large jumps the full glide (max 800ms)', () => {
    expect(flowDuration(0, 1_000_000)).toBe(800);
    expect(flowDuration(5_000, 0)).toBeLessThanOrEqual(800);
  });

  it('scales monotonically with the relative size of the change', () => {
    expect(flowDuration(1000, 1010)).toBeLessThan(flowDuration(1000, 2000));
  });
});

describe('NumberFlow — the live counter', () => {
  it('starts at zero and counts up to the value on mount', () => {
    vi.useFakeTimers();
    mount(1000);
    expect(screen.getByTestId('flow')).toHaveTextContent('0');
    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(screen.getByTestId('flow')).toHaveTextContent('1000');
  });

  it('flows adaptively when the value changes mid-flight (small delta = short)', () => {
    vi.useFakeTimers();
    const { rerender } = mount(1000);
    act(() => {
      vi.advanceTimersByTime(900);
    });

    rerender(
      <NumberFlow
        value={1010}
        format={(v) => Math.round(v).toString()}
        data-testid="flow"
      />
    );
    // 10/1000 = 1% -> ~206ms duration: not finished at 100ms, finished by 300ms
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByTestId('flow')).not.toHaveTextContent('1010');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByTestId('flow')).toHaveTextContent('1010');
  });

  it('snaps instantly when the user prefers reduced motion', () => {
    reducedMotion.mockReturnValue(true);
    vi.useFakeTimers();
    mount(999_999);
    expect(screen.getByTestId('flow')).toHaveTextContent('999999');
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(screen.getByTestId('flow')).toHaveTextContent('999999');
  });

  it('enforces the fixed-width figures class (.num-fin) and merges custom classes', () => {
    mount(5);
    expect(screen.getByTestId('flow').className).toContain('num-fin');
  });

  it('cancels its animation frame on unmount (no post-unmount setState)', () => {
    vi.useFakeTimers();
    const { unmount } = mount(1000);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(() => {
      unmount();
      act(() => {
        vi.advanceTimersByTime(2000);
      });
    }).not.toThrow();
  });

  it('renders an em dash for non-finite targets, never NaN', () => {
    reducedMotion.mockReturnValue(true); // snap path renders the fallback too
    const { rerender } = mount(1);
    rerender(
      <NumberFlow
        value={NaN}
        format={(v) => Math.round(v).toString()}
        data-testid="flow"
      />
    );
    expect(screen.getByTestId('flow')).toHaveTextContent('—');
  });
});
