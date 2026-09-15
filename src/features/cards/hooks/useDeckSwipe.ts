import { useCallback, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../../core/a11y';
import { springCss } from '../../../components/motion/tokens';

/**
 * Directive 19 — Batch 3: the deck's swipe chain (سلسلة السحب).
 *
 * Drag the active card sideways to walk the deck. Direction is RTL-aware:
 * in LTR "next" is a leftward drag, in RTL the gesture mirrors (rightward).
 * A direction with no card left (deck edge) resists — the finger travels,
 * the card stays.
 *
 * Physics, in the family established by useSheetDrag (Batch 2):
 * - live tracking follows the finger exactly up to ±96px, rubber-bands at
 *   half rate beyond (the pull never feels rigid);
 * - release commits past 48px of travel OR on a flick above 0.5 px/ms;
 * - anything else springs back on the smooth spring, 320ms;
 * - prefers-reduced-motion skips the live tracking, never the command —
 *   the swipe still walks the deck, without the shadow-chasing.
 */
const RUBBER_BAND_FROM = 96; // px — half-rate resistance beyond this
const COMMIT_DISTANCE = 48; // px — release past this commits the switch
const FLICK_VELOCITY = 0.5; // px/ms — a fast flick commits from any distance

export interface UseDeckSwipeOptions {
  isRTL: boolean;
  /** A previous card exists (deck edge guard). */
  canPrev: boolean;
  /** A next card exists (deck edge guard). */
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function useDeckSwipe({ isRTL, canPrev, canNext, onPrev, onNext }: UseDeckSwipeOptions) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const startXRef = useRef<number | null>(null);
  const lastXRef = useRef(0);
  const lastTRef = useRef(0);
  const velocityRef = useRef(0);
  // Latest callbacks behind a ref: the handlers stay stable across renders
  // (no listener churn on the active card) while always calling fresh logic.
  const cbRef = useRef({ isRTL, canPrev, canNext, onPrev, onNext });
  cbRef.current = { isRTL, canPrev, canNext, onPrev, onNext };

  /** Raw finger delta → allowed travel, in "forward is positive" space. */
  const allowedForward = useCallback((rawDx: number): number => {
    const { isRTL: rtl, canPrev: cp, canNext: cn } = cbRef.current;
    // Forward (next card): leftward in LTR, rightward in RTL.
    let fwd = rtl ? rawDx : -rawDx;
    if (fwd > 0 && !cn) fwd = 0; // deck edge: the card refuses the direction
    if (fwd < 0 && !cp) fwd = 0;
    const mag = Math.abs(fwd);
    const eased = mag > RUBBER_BAND_FROM
      ? RUBBER_BAND_FROM + (mag - RUBBER_BAND_FROM) * 0.5
      : mag;
    const signed = Math.sign(fwd) * eased;
    return rtl ? signed : -signed; // back to screen space
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startXRef.current = e.clientX;
    lastXRef.current = e.clientX;
    lastTRef.current = performance.now();
    velocityRef.current = 0;
    if (!prefersReducedMotion()) setDragging(true);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (startXRef.current === null) return;
      const now = performance.now();
      // Velocity updates even under reduced motion — the flick command stays.
      velocityRef.current = (e.clientX - lastXRef.current) / Math.max(now - lastTRef.current, 1);
      lastXRef.current = e.clientX;
      lastTRef.current = now;
      if (!prefersReducedMotion()) {
        setDragX(allowedForward(e.clientX - startXRef.current));
      }
    },
    [allowedForward]
  );

  const endDrag = useCallback(() => {
    if (startXRef.current === null) return;
    const total = lastXRef.current - startXRef.current;
    const { isRTL: rtl, canPrev: cp, canNext: cn, onPrev: prev, onNext: next } = cbRef.current;
    // Forward space: positive = toward the next card (leftward in LTR,
    // rightward in RTL). An edge-refused direction clamps to zero BEFORE any
    // commit check — a fast flick toward a wall is still a flick at a wall.
    const fwdRaw = rtl ? total : -total;
    const allowed =
      (fwdRaw > 0 && !cn) || (fwdRaw < 0 && !cp) ? 0 : fwdRaw;
    const vFwd = rtl ? velocityRef.current : -velocityRef.current;
    const commitByDistance = Math.abs(allowed) > COMMIT_DISTANCE;
    const commitByFlick =
      Math.abs(vFwd) > FLICK_VELOCITY && ((vFwd > 0 && cn) || (vFwd < 0 && cp));
    startXRef.current = null;
    setDragging(false);
    setDragX(0); // spring back; the deck switch (if any) plays the entrance
    if (commitByDistance) {
      if (allowed > 0) next();
      else prev();
    } else if (commitByFlick) {
      if (vFwd > 0) next();
      else prev();
    }
  }, []);

  return {
    dragX,
    dragging,
    transition: dragging ? 'none' : `transform 320ms ${springCss('smooth')}`,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
