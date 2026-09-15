/**
 * Directive 19 — Batch 2: drag-to-dismiss, the thumb-first contract.
 *
 * Pins the dismissal physics: past 96px you are gone, a flick (0.6 px/ms)
 * dismisses from any distance, anything else springs back to the seat.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

const onDismiss = vi.fn();
const { useSheetDrag } = await import('../../src/core/hooks/useSheetDrag');

vi.mock('../../src/core/a11y', () => ({
  prefersReducedMotion: vi.fn(() => false),
}));

function Harness() {
  const { dragY, dragging, transition, handlers } = useSheetDrag({ onDismiss });
  return (
    <div data-testid="sheet" style={{ transform: dragY > 0 ? `translateY(${dragY}px)` : undefined, transition }}>
      <div data-testid="handle" data-dragging={String(dragging)} {...handlers} />
    </div>
  );
}

describe('useSheetDrag — the dismissal physics', () => {
  beforeEach(() => onDismiss.mockClear());

  it('a pull past 96px dismisses', () => {
    vi.useFakeTimers({ toFake: ['performance'] });
    try {
      const { getByTestId } = render(<Harness />);
      fireEvent.pointerDown(getByTestId('handle'), { pointerId: 1, clientY: 100 });
      vi.advanceTimersByTime(400); // slow pull → velocity irrelevant
      fireEvent.pointerMove(getByTestId('handle'), { pointerId: 1, clientY: 260 }); // 160px
      fireEvent.pointerUp(getByTestId('handle'), { pointerId: 1, clientY: 260 });
      expect(onDismiss).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a slow short pull springs back: dragY returns to 0, no dismissal', () => {
    vi.useFakeTimers({ toFake: ['performance'] });
    try {
      const { getByTestId } = render(<Harness />);
      const handle = getByTestId('handle');
      fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100 });
      vi.advanceTimersByTime(100); // 40px over 100ms = 0.4 px/ms — no flick
      fireEvent.pointerMove(handle, { pointerId: 1, clientY: 140 });
      expect(getByTestId('sheet').style.transform).toBe('translateY(40px)');
      expect(handle.dataset.dragging).toBe('true');
      fireEvent.pointerUp(handle, { pointerId: 1, clientY: 140 });
      expect(onDismiss).not.toHaveBeenCalled();
      // spring released the transform and handed it back to CSS transition
      expect(getByTestId('sheet').style.transform).toBe('');
      expect(getByTestId('sheet').style.transition).not.toBe('none');
    } finally {
      vi.useRealTimers();
    }
  });

  it('rubber-bands past 120px: the sheet yields at half rate', () => {
    vi.useFakeTimers({ toFake: ['performance'] });
    try {
      const { getByTestId } = render(<Harness />);
      fireEvent.pointerDown(getByTestId('handle'), { pointerId: 1, clientY: 100 });
      vi.advanceTimersByTime(1000); // slow
      fireEvent.pointerMove(getByTestId('handle'), { pointerId: 1, clientY: 300 }); // 200px raw
      // 120px at full rate + 80px at half rate = 160px rendered
      expect(getByTestId('sheet').style.transform).toBe('translateY(160px)');
    } finally {
      vi.useRealTimers();
    }
  });

  it('a flick (above 0.6 px/ms) dismisses even from a short distance', () => {
    vi.useFakeTimers({ toFake: ['performance'] });
    try {
      const { getByTestId } = render(<Harness />);
      fireEvent.pointerDown(getByTestId('handle'), { pointerId: 1, clientY: 100 });
      vi.advanceTimersByTime(10); // 32px over 10ms = 3.2 px/ms
      fireEvent.pointerMove(getByTestId('handle'), { pointerId: 1, clientY: 132 });
      fireEvent.pointerUp(getByTestId('handle'), { pointerId: 1, clientY: 132 });
      expect(onDismiss).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('upward drags clamp at 0 — the sheet never stretches up', () => {
    const { getByTestId } = render(<Harness />);
    fireEvent.pointerDown(getByTestId('handle'), { pointerId: 1, clientY: 200 });
    fireEvent.pointerMove(getByTestId('handle'), { pointerId: 1, clientY: 100 }); // -100px
    expect(getByTestId('sheet').style.transform).toBe('');
    fireEvent.pointerUp(getByTestId('handle'), { pointerId: 1, clientY: 100 });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('prefers-reduced-motion keeps dismissal but skips live tracking', async () => {
    const { prefersReducedMotion } = await import('../../src/core/a11y');
    vi.mocked(prefersReducedMotion).mockReturnValue(true);
    const { getByTestId } = render(<Harness />);
    const handle = getByTestId('handle');
    fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100 });
    vi.useFakeTimers({ toFake: ['performance'] });
    vi.advanceTimersByTime(1000);
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 300 }); // 200px pull
    // no live transform while reduced motion is on
    expect(getByTestId('sheet').style.transform).toBe('');
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 300 });
    expect(onDismiss).toHaveBeenCalledTimes(1); // dismissal itself preserved
    vi.useRealTimers();
  });
});
