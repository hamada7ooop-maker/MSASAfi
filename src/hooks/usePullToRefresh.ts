import { useState, useEffect, useCallback, useRef } from 'react';

export function usePullToRefresh(containerRef: React.RefObject<HTMLElement | null>, onRefresh: () => void) {
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isPulling = useRef(false);

  const threshold = 80;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only allow pull to refresh if the container is scrolled to the top
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      setStartY(e.touches[0].pageY);
      isPulling.current = true;
    } else {
      isPulling.current = false;
    }
  }, [containerRef]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current) return;

    const currentY = e.touches[0].pageY;
    const distance = currentY - startY;

    if (distance > 0) {
      // Apply resistance
      const dampenedDistance = Math.min(distance * 0.4, threshold + 20);
      setPullDistance(dampenedDistance);
      
      // If pulled down, prevent default scrolling to show our indicator
      if (distance > 10) {
        if (e.cancelable) e.preventDefault();
      }
    }
  }, [startY]);

  const handleTouchEnd = useCallback(() => {
    if (!isPulling.current) return;
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      onRefresh();
      // Reset after a delay if onRefresh doesn't trigger a reload
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 2000);
    } else {
      setPullDistance(0);
    }
    
    isPulling.current = false;
  }, [pullDistance, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [containerRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullDistance, isRefreshing, threshold };
}
