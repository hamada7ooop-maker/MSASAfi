import React, { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../core/a11y';

/**
 * Directive 19 — UI/UX Renaissance: NumberFlow (Batch 1).
 *
 * The adaptive counter behind every live balance. Builds on the NumberText
 * contract (tabular-nums via .num-fin — digits keep their width while
 * counting, so the figure never dances horizontally).
 *
 * Behavior:
 * - Mounts counting up from 0 (the hero "ticker" moment).
 * - Value changes flow adaptively: small deltas resolve in ~200ms, large
 *   jumps take up to 800ms — the eye follows money, not a stopwatch.
 * - prefers-reduced-motion: snaps to the final figure. The number is the
 *   information; the count is decoration (same ruling as AnimatedNumber).
 * - Animation rides requestAnimationFrame with the frame's own timestamp,
 *   never performance.now(), so it stays honest under devtools throttling
 *   and fake timers alike.
 *
 * 60 FPS contract: only text content mutates per frame (no layout-affecting
 * style changes) — .num-fin's fixed figures guarantee reflow-free counting.
 */
export interface NumberFlowProps {
  value: number;
  /** Formatter (currency/decimal-settings aware at the call site). */
  format: (value: number) => string;
  className?: string;
  'aria-label'?: string;
  /** Forwarded to the DOM — React types allow aria-* on any component, but
   *  this component destructures its props, so anything not declared here
   *  would be silently dropped. */
  'aria-hidden'?: boolean | 'true' | 'false';
  'data-testid'?: string;
}

/** Ease-out-expo: fast start, silky landing. */
function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Adaptive duration in ms: proportional to the relative size of the change.
 * Tiny rebalances (0-10% of the figure) stay quick; big jumps get up to
 * 800ms of glide. Pure and exported for testing.
 */
export function flowDuration(from: number, to: number): number {
  const scale = Math.max(Math.abs(from), Math.abs(to), 1);
  const ratio = Math.min(Math.abs(to - from) / scale, 1);
  return Math.round(200 + ratio * 600);
}

export function NumberFlow({
  value,
  format,
  className = '',
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
  'data-testid': dataTestId,
}: NumberFlowProps): React.ReactElement {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    fromRef.current = to;
    if (from === to) return;

    // Reduced motion: the figure is the information — land on it instantly.
    if (prefersReducedMotion()) {
      setDisplay(to);
      return;
    }

    const duration = flowDuration(from, to);
    let firstTimestamp: number | null = null;

    const step = (now: number) => {
      if (firstTimestamp === null) firstTimestamp = now;
      const progress = Math.min((now - firstTimestamp) / duration, 1);
      setDisplay(from + (to - from) * easeOutExpo(progress));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };
    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [value]);

  const text = Number.isFinite(display) ? format(display) : '—';
  return (
    <span
      className={`num-fin ${className}`.trim()}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      data-testid={dataTestId}
    >
      {text}
    </span>
  );
}

export default NumberFlow;
