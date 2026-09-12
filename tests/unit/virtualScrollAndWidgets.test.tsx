import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { WidgetErrorBoundary } from '../../src/components/common/WidgetErrorBoundary';
import { useVirtualScroll } from '../../src/core/hooks/useVirtualScroll';

function FaultyWidget({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Widget Render Failure');
  }
  return <div data-testid="widget-content">Widget Running Normally</div>;
}

describe('VirtualScroll & WidgetErrorBoundary Unit Tests', () => {
  describe('WidgetErrorBoundary', () => {
    let originalConsoleError: typeof console.error;

    beforeEach(() => {
      originalConsoleError = console.error;
      console.error = vi.fn();
    });

    afterEach(() => {
      console.error = originalConsoleError;
      vi.restoreAllMocks();
    });

    it('renders widget content normally when no error occurs', () => {
      render(
        <WidgetErrorBoundary widgetName="بطاقة الرصيد">
          <FaultyWidget shouldThrow={false} />
        </WidgetErrorBoundary>
      );

      expect(screen.getByTestId('widget-content')).toBeInTheDocument();
      expect(screen.getByText('Widget Running Normally')).toBeInTheDocument();
    });

    it('catches widget crash and renders graceful error card with widget name', () => {
      render(
        <WidgetErrorBoundary widgetName="الرسوم البيانية">
          <FaultyWidget shouldThrow={true} />
        </WidgetErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/تعذر تحميل الرسوم البيانية/i)).toBeInTheDocument();
      expect(screen.getByText(/إعادة المحاولة/i)).toBeInTheDocument();
      expect(screen.queryByTestId('widget-content')).not.toBeInTheDocument();
    });

    it('renders custom fallback if provided on error', () => {
      render(
        <WidgetErrorBoundary fallback={<div data-testid="custom-fallback">Fallback Active</div>}>
          <FaultyWidget shouldThrow={true} />
        </WidgetErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    });
  });

  describe('useVirtualScroll Hook', () => {
    it('operates in non-virtual mode when items are below threshold', () => {
      const items = Array.from({ length: 15 }, (_, i) => ({ id: i, label: `Item ${i}` }));

      const { result } = renderHook(() =>
        useVirtualScroll({
          items,
          itemHeight: 50,
          threshold: 30,
        })
      );

      expect(result.current.isVirtual).toBe(false);
      expect(result.current.virtualItems.length).toBe(15);
      expect(result.current.startIndex).toBe(0);
      expect(result.current.endIndex).toBe(15);
      expect(result.current.totalHeight).toBe(15 * 50);
    });

    it('activates virtualization and slices items when items count >= threshold', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i, label: `Item ${i}` }));

      const { result } = renderHook(() =>
        useVirtualScroll({
          items,
          itemHeight: 60,
          threshold: 30,
          overscan: 4,
        })
      );

      expect(result.current.isVirtual).toBe(true);
      expect(result.current.totalHeight).toBe(100 * 60);
      expect(result.current.virtualItems.length).toBeLessThanOrEqual(100);
      expect(result.current.virtualItems[0].offsetTop).toBe(0);
    });

    it('performance benchmark: handles extreme scale of 10,000 items while maintaining O(1) DOM slice footprint', () => {
      const largeItems = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        label: `Transaction #${i}`,
        amount: 100 + (i % 500),
      }));

      const t0 = performance.now();
      const { result } = renderHook(() =>
        useVirtualScroll({
          items: largeItems,
          itemHeight: 76,
          threshold: 30,
          overscan: 6,
        })
      );
      const elapsed = performance.now() - t0;

      expect(result.current.isVirtual).toBe(true);
      expect(result.current.totalHeight).toBe(10000 * 76); // 760,000 px height container
      // Critical Invariant: Bounded O(1) DOM slice — must not mount 10,000 nodes
      expect(result.current.virtualItems.length).toBeLessThanOrEqual(50);
      // Benchmarking calculation latency (sub-50ms)
      expect(elapsed).toBeLessThan(50);
    });

    it('handles edge case of empty list without error or NaN height', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({
          items: [],
          itemHeight: 76,
          threshold: 30,
        })
      );

      expect(result.current.isVirtual).toBe(false);
      expect(result.current.virtualItems.length).toBe(0);
      expect(result.current.totalHeight).toBe(0);
    });
  });
});

