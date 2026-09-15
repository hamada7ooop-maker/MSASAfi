/**
 * Directive 19 — UI/UX Renaissance: Motion Tokens (Batch 0: Enablement).
 *
 * Four standard springs are the entire motion vocabulary. Consistency is what
 * reads as "premium" — every animated surface uses one of these, nothing else.
 *
 * Engineering rule (the 60 FPS contract): animations ride transform/opacity
 * only. These tokens exist so that rule has one canonical source.
 */
import { prefersReducedMotion } from '../../core/a11y';

export interface SpringSpec {
  /** Spring stiffness (N/m). Higher = faster snap. */
  stiffness: number;
  /** Damping coefficient. Higher = fewer oscillations. */
  damping: number;
  /** Moving mass. Higher = heavier feel. */
  mass: number;
}

/**
 * The four sanctioned springs:
 * - snappy:  buttons, toggles, chips — the "instant" feel
 * - smooth:  bottom sheets, screen transitions — the "premium glide"
 * - gentle:  card entrances, content reveals — the "calm" feel
 * - playful: small success reactions — the "delight" feel
 */
export const SPRINGS = {
  snappy: { stiffness: 500, damping: 30, mass: 0.9 },
  smooth: { stiffness: 260, damping: 28, mass: 1.0 },
  gentle: { stiffness: 170, damping: 24, mass: 1.1 },
  playful: { stiffness: 700, damping: 22, mass: 0.6 },
} as const satisfies Record<string, SpringSpec>;

export type SpringName = keyof typeof SPRINGS;

/** Durations for non-spring (fade/skeleton) work, in ms. */
export const DURATIONS = {
  instant: 100,
  quick: 200,
  standard: 320,
  slow: 480,
} as const;

/**
 * A deterministic CSS approximation of a spring as a cubic-bezier curve,
 * for `transition-timing-function` use.
 *
 * Derivation: the damping ratio ζ = c / (2·√(k·m)) decides the shape.
 * ζ ≥ 1 (overdamped) → no overshoot, a pure ease-out curve.
 * ζ < 1 (underdamped) → overshoot amplitude b = e^(−ζπ/√(1−ζ²)),
 * mapped onto y₂ = 1 + b (clamped for WebKit sanity at 1.6).
 */
export function springCss(name: SpringName): string {
  const { stiffness, damping, mass } = SPRINGS[name];
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta >= 1) {
    return 'cubic-bezier(0.2, 0, 0.2, 1)';
  }
  const overshoot = Math.exp((-zeta * Math.PI) / Math.sqrt(1 - zeta * zeta));
  const y2 = Math.min(1 + overshoot, 1.6);
  return `cubic-bezier(0.22, 1, 0.36, ${y2.toFixed(3)})`;
}

/**
 * Whether motion is currently allowed. Every animation entry point must
 * consult this (or `prefersReducedMotion` directly) — reduced-motion users
 * get instant state, not choreography.
 */
export function motionEnabled(): boolean {
  return !prefersReducedMotion();
}
