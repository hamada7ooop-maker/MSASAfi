import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

/**
 * Premium Skeleton Component for loading states.
 */
export function Skeleton({ className = '', variant = 'rect' }: SkeletonProps) {
  const baseClasses = "animate-pulse bg-slate-200 dark:bg-slate-800";
  const variantClasses = {
    text: "h-3 w-3/4 rounded",
    rect: "rounded-2xl",
    circle: "rounded-full"
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />
  );
}

/**
 * Pre-built skeleton for a standard list item
 */
export function ListItemSkeleton() {
  return (
    <div className="bg-white dark:bg-[#1e2124] rounded-2xl p-4 flex items-center gap-4 border border-slate-100 dark:border-slate-800 shadow-sm mb-3">
      <Skeleton variant="circle" className="w-12 h-12 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-1/2" />
        <Skeleton variant="text" className="w-1/4 h-2" />
      </div>
      <Skeleton variant="rect" className="w-16 h-8 rounded-xl" />
    </div>
  );
}

/**
 * Pre-built skeleton for a card
 */
export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#1e2124] rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" className="w-8 h-8" />
        <Skeleton variant="text" className="w-1/3" />
      </div>
      <Skeleton variant="rect" className="w-full h-12" />
      <div className="flex justify-between">
        <Skeleton variant="text" className="w-1/4" />
        <Skeleton variant="text" className="w-1/4" />
      </div>
    </div>
  );
}
