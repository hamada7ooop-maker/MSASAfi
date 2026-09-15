import { useCallback, useRef, useState } from 'react';
import { prefersReducedMotion } from '../a11y';
import { springCss } from '../../components/motion/tokens';

/**
 * Directive 19 — Batch 2: drag-to-dismiss for bottom sheets.
 *
 * The thumb-first ergonomic: grab the sheet's handle/header and pull down.
 * Physics, not opinion:
 * - The sheet never rides UP past its seat (delta clamps at 0).
 * - Past 120px the drag meets rubber-band resistance (half rate) — the sheet
 *   pushes back instead of teleporting off-screen.
 * - Release: dismiss if pulled beyond 96px OR flicked (velocity > 0.6 px/ms);
 *   otherwise it springs back on the approved 'smooth' spring.
 * - prefers-reduced-motion: no live tracking, no spring — a tap-equivalent
 *   state (drag never engages visually; dismissal still works via buttons).
 *
 * 60 FPS contract: rides transform only, no layout properties touched.
 */
export interface SheetDragResult {
  /** Current downward offset in px (0 = seated). */
  dragY: number;
  /** True while a pointer is actively dragging (transition disabled). */
  dragging: boolean;
  /** Transition value for the sheet's transform ('none' while dragging). */
  transition: string;
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
  };
}

const DISMISS_DISTANCE = 96; // px of pull that means "close"
const RUBBER_BAND_FROM = 120; // px where resistance starts
const FLICK_VELOCITY = 0.6; // px/ms — a decisive flick dismisses too

export function useSheetDrag({ onDismiss }: { onDismiss: () => void }): SheetDragResult {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef<number | null>(null);
  const lastYRef = useRef(0);
  const lastTRef = useRef(0);
  const velocityRef = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startYRef.current = e.clientY;
    lastYRef.current = e.clientY;
    lastTRef.current = performance.now();
    velocityRef.current = 0;
    if (!prefersReducedMotion()) setDragging(true);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (startYRef.current === null) return;
    let delta = e.clientY - startYRef.current;
    if (delta < 0) delta = 0; // the sheet never rides up past its seat
    if (delta > RUBBER_BAND_FROM) {
      delta = RUBBER_BAND_FROM + (delta - RUBBER_BAND_FROM) * 0.5; // rubber band
    }
    const now = performance.now();
    // velocity keeps updating even under reduced motion — the flick still
    // dismisses — but the sheet itself must not shadow-track the finger.
    velocityRef.current = (e.clientY - lastYRef.current) / Math.max(now - lastTRef.current, 1);
    lastYRef.current = e.clientY;
    lastTRef.current = now;
    if (!prefersReducedMotion()) setDragY(delta);
  }, []);

  const endDrag = useCallback(() => {
    if (startYRef.current === null) return;
    const pulled = lastYRef.current - startYRef.current;
    const shouldDismiss =
      pulled > DISMISS_DISTANCE || velocityRef.current > FLICK_VELOCITY;
    startYRef.current = null;
    setDragging(false);
    if (shouldDismiss) {
      onDismiss();
      setDragY(0);
    } else {
      setDragY(0); // spring back
    }
  }, [onDismiss]);

  return {
    dragY,
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

export default useSheetDrag;
