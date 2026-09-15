import React from 'react';
import { useFormat } from '../../../core/hooks/useFormat';
import type { AssetPortfolioSummary } from '../utils/assetPortfolio';

/**
 * Directive 19 — deferred decomposition: the glass summary panel.
 *
 * Lifted verbatim from Assets.tsx — the Obsidian dashboard card that
 * carries the portfolio's purchase total, accumulated depreciation, net
 * book value and the active-warranty chip. The glow decoration extends
 * beyond the card bounds by design, so this card deliberately stays OUT
 * of the contain-card program.
 */

interface AssetSummaryPanelProps {
  summary: AssetPortfolioSummary;
}

export function AssetSummaryPanel({ summary }: AssetSummaryPanelProps) {
  const { fmt, getCurrencySymbol } = useFormat();

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#002b59] to-[#014282] dark:from-[#111827] dark:to-[#1f2937] text-white p-7 rounded-[2.5rem] shadow-xl space-y-6 border border-white/10">
      {/* تأثير التوهج */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="grid grid-cols-3 gap-6 relative z-10">
        <div>
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">إجمالي القيمة الشرائية</span>
          <h3 className="text-lg font-black text-slate-100">{fmt(summary.totalPurchasePrice)} {getCurrencySymbol()}</h3>
        </div>
        <div>
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">الاستهلاك المتراكم</span>
          <h3 className="text-lg font-black text-rose-300">-{fmt(summary.totalAccumulatedDepreciation)} {getCurrencySymbol()}</h3>
        </div>
        <div>
          <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest block mb-1">صافي القيمة الحالية</span>
          <h3 className="text-2xl font-black text-emerald-400">{fmt(summary.totalBookValue)} {getCurrencySymbol()}</h3>
        </div>
      </div>

      <div className="h-px bg-white/10 relative z-10" />

      <div className="flex items-center justify-between text-xs font-bold text-slate-300 relative z-10">
        <span>الاستهلاك الحالي يتم تحديثه تلقائياً بناءً على تقادم الأصول</span>
        <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
          {summary.activeWarrantiesCount} ضمانات نشطة
          <span className="material-symbols-outlined text-sm text-emerald-400">gpp_good</span>
        </span>
      </div>
    </div>
  );
}
