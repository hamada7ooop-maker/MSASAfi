import React, { useState, useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/core/a11y';

export interface AnimatedNumberProps {
  value: number;
  formatter: (val: number) => string;
  baseCurrency: string;
}

export function AnimatedNumber({ value, formatter, baseCurrency }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(0);

  useEffect(() => {
    const start = prevValueRef.current;
    const end = value;
    prevValueRef.current = value;
    if (start === end) return;

    // The stylesheet's prefers-reduced-motion rule collapses CSS animation,
    // but it cannot touch a requestAnimationFrame loop. Snap straight to the
    // final figure instead of counting up to it — the number is the
    // information; the count-up is decoration.
    if (prefersReducedMotion()) {
      setDisplayValue(end);
      setIsAnimating(false);
      return;
    }

    setIsAnimating(true);
    const duration = 1000; // ms
    const startTime = performance.now();

    let animationFrameId: number;

    const updateNumber = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function: easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const current = start + (end - start) * easeProgress;
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateNumber);
      } else {
        setDisplayValue(end);
        setIsAnimating(false);
      }
    };

    animationFrameId = requestAnimationFrame(updateNumber);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value]);

  const formatted = formatter(displayValue).replace(/[^\d.,]/g, '').trim();

  return (
    <div className={`relative flex items-baseline justify-center gap-2 transition-all duration-500 ${isAnimating ? 'scale-105 filter drop-shadow-[0_0_20px_rgba(253,224,71,0.8)]' : ''}`}>
      <span className="font-black text-5xl md:text-7xl tabular-nums tracking-tighter text-white">
        {formatted}
      </span>
      <span className="font-bold text-lg opacity-90 text-blue-200 shrink-0">{baseCurrency}</span>
      
      {/* 🪙 Floating coins reward sparkles when animating */}
      {isAnimating && (
        <span className="absolute -top-3 -right-6 animate-bounce text-amber-300 text-lg select-none pointer-events-none">
          🪙
        </span>
      )}
    </div>
  );
}
