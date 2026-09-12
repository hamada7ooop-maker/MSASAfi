import React, { useRef, useState, TouchEvent } from 'react';
import { useHaptic } from '../../core/hooks/useHaptic';

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  deleteThreshold?: number; // Distance in pixels to trigger delete
  className?: string;
  disabled?: boolean;
}

export function SwipeableRow({ children, onDelete, deleteThreshold = 60, className = '', disabled = false }: SwipeableRowProps) {
  const haptic = useHaptic();
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const hasVibrated = useRef(false);

  const isLTR = document.dir !== 'rtl';

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled) return;
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
    setIsSwiping(true);
    hasVibrated.current = false;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (disabled || !isSwiping) return;
    currentX.current = e.touches[0].clientX;
    
    let diff = currentX.current - startX.current;
    
    // Only allow swiping in the direction of the delete action (usually left in LTR, right in RTL)
    if (isLTR && diff > 0) diff = 0; // Prevent swipe right in LTR
    if (!isLTR && diff < 0) diff = 0; // Prevent swipe left in RTL

    // Limit maximum swipe distance
    const maxSwipe = 120;
    if (Math.abs(diff) > maxSwipe) {
      diff = Math.sign(diff) * maxSwipe;
    }

    setTranslateX(diff);

    // Vibrate when threshold is crossed
    if (Math.abs(diff) >= deleteThreshold && !hasVibrated.current) {
      haptic('medium');
      hasVibrated.current = true;
    } else if (Math.abs(diff) < deleteThreshold && hasVibrated.current) {
      hasVibrated.current = false;
    }
  };

  const handleTouchEnd = () => {
    if (disabled || !isSwiping) return;
    setIsSwiping(false);

    if (Math.abs(translateX) >= deleteThreshold) {
      // Trigger delete and slide off screen
      setTranslateX(Math.sign(translateX) * window.innerWidth);
      setTimeout(() => {
        onDelete();
        setTranslateX(0); // Reset for possible recycling
      }, 300);
    } else {
      // Snap back
      setTranslateX(0);
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Background delete action */}
      <div 
        className={`absolute inset-0 bg-red-500 flex items-center ${isLTR ? 'justify-end pr-6' : 'justify-start pl-6'} text-white transition-opacity ${Math.abs(translateX) > 20 ? 'opacity-100' : 'opacity-0'}`}
      >
        <span className="material-symbols-outlined font-bold">delete</span>
      </div>

      {/* Foreground content */}
      <div
        className="relative z-10 w-full"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
