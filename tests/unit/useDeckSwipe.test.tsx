/**
 * Directive 19 — Batch 3: the deck's swipe chain physics.
 *
 * Pins the RTL-aware walk contract: forward (next) is leftward in LTR and
 * rightward in RTL, deck edges resist, a flick commits from any distance,
 * anything else springs back. Same physics family as useSheetDrag (Batch 2).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

const onPrev = vi.fn();
const onNext = vi.fn();
const { useDeckSwipe } = await import('../../src/features/cards/hooks/useDeckSwipe');

vi.mock('../../src/core/a11y', () => ({
  prefersReducedMotion: vi.fn(() => false),
}));

interface HarnessProps {
  isRTL?: boolean;
  canPrev?: boolean;
  canNext?: boolean;
}

function Harness({ isRTL = false, canPrev = true, canNext = true }: HarnessProps = {}) {
  const { dragX, dragging, transition, handlers } = useDeckSwipe({
    isRTL,
    canPrev,
    canNext,
    onPrev,
    onNext,
  });
  return (
    <div
      data-testid="card"
      style={{ transform: dragX !== 0 ? `translateX(${dragX}px)` : undefined, transition }}
    >
      <div data-testid="handle" data-dragging={String(dragging)} {...handlers} />
    </div>
  );
}

describe('useDeckSwipe — the walk contract', () => {
  beforeEach(() => {
    onPrev.mockClear();
    onNext.mockClear();
  });

  it('LTR: a leftward drag past 48px commits to the next card', () => {
    vi.useFakeTimers({ toFake: ['performance'] });
    try {
      const { getByTestId } = render(<Harness isRTL={false} />);
      fireEvent.pointerDown(getByTestId('handle'), { pointerId: 1, clientX: 200 });
      vi.advanceTimersByTime(500); // slow drag — velocity irrelevant
      fireEvent.pointerMove(getByTestId('handle'), { pointerId: 1, clientX: 130 }); // -70px
      expect(getByTestId('card').style.transform).toBe('translateX(-70px)');
      fireEvent.pointerUp(getByTestId('handle'), { pointerId: 1, clientX: 130 });
      expect(onNext).toHaveBeenCalledTimes(1);
      expect(onPrev).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('RTL: forward mirrors — a rightward drag commits to the next card', () => {
    vi.useFakeTimers({ toFake: ['performance'] });
    try {
      const { getByTestId } = render(<Harness isRTL />);
      fireEvent.pointerDown(getByTestId('handle'), { pointerId: 1, clientX: 200 });
      vi.advanceTimersByTime(500);
      fireEvent.pointerMove(getByTestId('handle'), { pointerId: 1, clientX: 270 }); // +70px
      expect(getByTestId('card').style.transform).toBe('translateX(70px)');
      fireEvent.pointerUp(getByTestId('handle'), { pointerId: 1, clientX: 270 });
      expect(onNext).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a backward drag (LTR: rightward) hands back to the previous card', () => {
    vi.useFakeTimers({ toFake: ['performance'] });
    try {
      const { getByTestId } = render(<Harness isRTL={false} />);
      fireEvent.pointerDown(getByTestId('handle'), { pointerId: 1, clientX: 200 });
      vi.advanceTimersByTime(500);
      fireEvent.pointerMove(getByTestId('handle'), { pointerId: 1, clientX: 280 }); // +80px
      fireEvent.pointerUp(getByTestId('handle'), { pointerId: 1, clientX: 280 });
      expect(onPrev).toHaveBeenCalledTimes(1);
      expect(onNext).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('a short drag springs back without committing', () => {
    vi.useFakeTimers({ toFake: ['performance'] });
    try {
      const { getByTestId } = render(<Harness />);
      const handle = getByTestId('handle');
      fireEvent.pointerDown(handle, { pointerId: 1, clientX: 200 });
      vi.advanceTimersByTime(200); // 30px over 200ms = 0.15 px/ms — no flick
      fireEvent.pointerMove(handle, { pointerId: 1, clientX: 230 });
      expect(getByTestId('card').style.transform).toBe('translateX(30px)');
      fireEvent.pointerUp(handle, { pointerId: 1, clientX: 230 });
      expect(onNext).not.toHaveBeenCalled();
      expect(onPrev).not.toHaveBeenCalled();
      // released back to the seat, handed to the CSS spring
      expect(getByTestId('card').style.transform).toBe('');
      expect(getByTestId('card').style.transition).not.toBe('none');
    } finally {
      vi.useRealTimers();
    }
  });

  it('a flick commits from any distance', () => {
    vi.useFakeTimers({ toFake: ['performance'] });
    try {
      const { getByTestId } = render(<Harness isRTL={false} />);
      fireEvent.pointerDown(getByTestId('handle'), { pointerId: 1, clientX: 200 });
      vi.advanceTimersByTime(10); // 20px over 10ms = 2 px/ms — well above 0.5
      fireEvent.pointerMove(getByTestId('handle'), { pointerId: 1, clientX: 180 });
      fireEvent.pointerUp(getByTestId('handle'), { pointerId: 1, clientX: 180 });
      expect(onNext).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rubber-bands past 96px: the card yields at half rate', () => {
    vi.useFakeTimers({ toFake: ['performance'] });
    try {
      const { getByTestId } = render(<Harness isRTL={false} />);
      fireEvent.pointerDown(getByTestId('handle'), { pointerId: 1, clientX: 200 });
      vi.advanceTimersByTime(1000); // slow
      fireEvent.pointerMove(getByTestId('handle'), { pointerId: 1, clientX: 80 }); // -120px raw
      // 96px at full rate + 24px at half rate = -108px rendered
      expect(getByTestId('card').style.transform).toBe('translateX(-108px)');
    } finally {
      vi.useRealTimers();
    }
  });

  it('a deck edge resists: the refused direction neither tracks nor commits', () => {
    vi.useFakeTimers({ toFake: ['performance'] });
    try {
      const { getByTestId } = render(<Harness isRTL={false} canNext={false} />);
      const handle = getByTestId('handle');
      fireEvent.pointerDown(handle, { pointerId: 1, clientX: 200 });
      vi.advanceTimersByTime(1000);
      fireEvent.pointerMove(handle, { pointerId: 1, clientX: 50 }); // -150px forward, refused
      expect(getByTestId('card').style.transform).toBe(''); // never left its seat
      fireEvent.pointerUp(handle, { pointerId: 1, clientX: 50 });
      expect(onNext).not.toHaveBeenCalled();
      // the allowed direction still works: +60px backward commits
      fireEvent.pointerDown(handle, { pointerId: 1, clientX: 200 });
      vi.advanceTimersByTime(1000);
      fireEvent.pointerMove(handle, { pointerId: 1, clientX: 260 });
      fireEvent.pointerUp(handle, { pointerId: 1, clientX: 260 });
      expect(onPrev).toHaveBeenCalledTimes(1);

      // ...and a FAST flick toward the wall still commits nothing: the edge
      // clamp must gate the velocity rule too, not only the distance rule.
      onPrev.mockClear();
      fireEvent.pointerDown(handle, { pointerId: 1, clientX: 200 });
      vi.advanceTimersByTime(5); // 100px over 5ms = 20 px/ms — a hard flick
      fireEvent.pointerMove(handle, { pointerId: 1, clientX: 100 });
      fireEvent.pointerUp(handle, { pointerId: 1, clientX: 100 });
      expect(onNext).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('prefers-reduced-motion keeps the command but skips live tracking', async () => {
    const { prefersReducedMotion } = await import('../../src/core/a11y');
    vi.mocked(prefersReducedMotion).mockReturnValue(true);
    vi.useFakeTimers({ toFake: ['performance'] });
    try {
      const { getByTestId } = render(<Harness isRTL={false} />);
      const handle = getByTestId('handle');
      fireEvent.pointerDown(handle, { pointerId: 1, clientX: 200 });
      vi.advanceTimersByTime(1000);
      fireEvent.pointerMove(handle, { pointerId: 1, clientX: 100 }); // -100px
      expect(getByTestId('card').style.transform).toBe(''); // no shadow-chasing
      fireEvent.pointerUp(handle, { pointerId: 1, clientX: 100 });
      expect(onNext).toHaveBeenCalledTimes(1); // the walk itself still happens
    } finally {
      vi.useRealTimers();
      vi.mocked(prefersReducedMotion).mockReturnValue(false);
    }
  });
});
