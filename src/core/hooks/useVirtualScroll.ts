import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

export interface UseVirtualScrollOptions<T> {
  items: T[];
  itemHeight: number;
  overscan?: number;
  threshold?: number; // Minimum items before virtualization kicks in
  containerSelector?: string; // e.g. '#main-content'
}

export interface VirtualItem<T> {
  item: T;
  index: number;
  offsetTop: number;
}

export interface UseVirtualScrollResult<T> {
  virtualItems: VirtualItem<T>[];
  totalHeight: number;
  isVirtual: boolean;
  startIndex: number;
  endIndex: number;
}

/**
 * useVirtualScroll - Lightweight, zero-dependency 60 FPS virtualization hook.
 * Computes visible range using window / container scroll with overscan buffering.
 */
export function useVirtualScroll<T>({
  items,
  itemHeight,
  overscan = 5,
  threshold = 30,
  containerSelector = '#main-content',
}: UseVirtualScrollOptions<T>): UseVirtualScrollResult<T> {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 800
  );
  
  const rafIdRef = useRef<number | null>(null);

  const isVirtual = items.length >= threshold;
  const totalHeight = items.length * itemHeight;

  const updateScroll = useCallback(() => {
    let currentScroll = 0;
    let currentHeight = window.innerHeight;

    const container = containerSelector ? document.querySelector(containerSelector) : null;

    if (container && container instanceof HTMLElement) {
      currentScroll = container.scrollTop;
      currentHeight = container.clientHeight;
    } else {
      currentScroll = window.scrollY || document.documentElement.scrollTop;
      currentHeight = window.innerHeight;
    }

    setScrollTop(currentScroll);
    setViewportHeight(currentHeight);
  }, [containerSelector]);

  useEffect(() => {
    if (!isVirtual) return;

    const handleScrollOrResize = () => {
      if (rafIdRef.current !== null) return;
      rafIdRef.current = requestAnimationFrame(() => {
        updateScroll();
        rafIdRef.current = null;
      });
    };

    updateScroll();

    const container = containerSelector ? document.querySelector(containerSelector) : null;
    const target = container || window;

    target.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });

    return () => {
      target.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isVirtual, updateScroll, containerSelector]);

  const { startIndex, endIndex, virtualItems } = useMemo(() => {
    if (!isVirtual) {
      return {
        startIndex: 0,
        endIndex: items.length,
        virtualItems: items.map((item, index) => ({
          item,
          index,
          offsetTop: index * itemHeight,
        })),
      };
    }

    const calculatedStart = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(viewportHeight / itemHeight);
    const calculatedEnd = Math.min(items.length, calculatedStart + visibleCount + overscan * 2);

    const slice = items.slice(calculatedStart, calculatedEnd).map((item, i) => ({
      item,
      index: calculatedStart + i,
      offsetTop: (calculatedStart + i) * itemHeight,
    }));

    return {
      startIndex: calculatedStart,
      endIndex: calculatedEnd,
      virtualItems: slice,
    };
  }, [items, itemHeight, isVirtual, overscan, scrollTop, viewportHeight]);

  return {
    virtualItems,
    totalHeight,
    isVirtual,
    startIndex,
    endIndex,
  };
}
