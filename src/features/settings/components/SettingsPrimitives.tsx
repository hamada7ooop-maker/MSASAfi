import React from 'react';

/**
 * Shared presentational primitives for the settings screen.
 *
 * Extracted from Settings.tsx (669 lines) as part of L-1. Both were already
 * self-contained components defined inside that file and are used by every
 * section descriptor in the search index, so this is a relocation: props and
 * markup are unchanged.
 */

export function SettingsCard({
  icon,
  iconColor,
  label,
  sublabel,
  badge,
  onClick,
  isLTR,
  children,
}: {
  icon: string;
  iconColor: string;
  label: string;
  sublabel?: string;
  badge?: string;
  onClick?: () => void;
  isLTR?: boolean;
  children?: React.ReactNode;
}) {
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] active:bg-slate-100 dark:active:bg-white/[0.05] transition-colors group text-start"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-on-surface dark:text-white leading-tight truncate">{label}</p>
            {sublabel && <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">{sublabel}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ms-3">
          {badge && <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">{badge}</span>}
          <span className={`material-symbols-outlined text-slate-300 dark:text-slate-600 text-[18px] transition-transform ${isLTR ? 'group-hover:translate-x-0.5' : 'group-hover:-translate-x-0.5'}`}>
            {isLTR ? 'chevron_right' : 'chevron_left'}
          </span>
        </div>
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-on-surface dark:text-white leading-tight">{label}</p>
          {sublabel && <p className="text-[10px] text-slate-400 font-medium mt-0.5">{sublabel}</p>}
        </div>
      </div>
      {children && <div className="shrink-0 ms-3">{children}</div>}
    </div>
  );
}

// ─── Section Group Container ───────────────────────────────────────────────────

export function SectionGroup({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`animate-in slide-in-from-bottom-4 duration-500 ${className}`}>
      {title && (
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 px-1 mb-2">
          {title}
        </p>
      )}
      <div className="bg-surface-container-lowest dark:bg-[#1a1d21] rounded-[1.75rem] overflow-hidden border border-black/[0.04] dark:border-white/[0.06] shadow-sm divide-y divide-slate-100/70 dark:divide-white/[0.04]">
        {children}
      </div>
    </div>
  );
}
