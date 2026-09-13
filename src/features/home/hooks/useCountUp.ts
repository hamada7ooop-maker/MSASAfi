import { useEffect, useRef, useState } from 'react';

/**
 * Eases a number towards its target so balances visibly "settle" instead of
 * snapping. Pair with `font-variant-numeric: tabular-nums` (the `.tnum` class)
 * so the digits do not reflow while counting.
 *
 * Honours prefers-reduced-motion by jumping straight to the value.
 */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const from = fromRef.current;
    const delta = target - from;

    if (prefersReduced || delta === 0 || !Number.isFinite(target)) {
      fromRef.current = target;
      setValue(target);
      return;
    }

    const start = performance.now();
    // easeOutExpo — fast commit, gentle settle.
    const ease = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setValue(from + delta * ease(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, duration]);

  return value;
}
