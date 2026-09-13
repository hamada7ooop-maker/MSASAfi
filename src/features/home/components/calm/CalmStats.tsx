import React from 'react';
import { useFormat } from '@core/hooks/useFormat';
import { useI18n } from '@/i18n/index';

interface CalmStatsProps {
  income: number;
  expense: number;
  budgetUsedPct: number | null;
}

/**
 * Tier 2 of the hierarchy: quiet, flat, information-dense.
 * No blur, no gradients, no glow — the contrast with the hero is the point.
 */
export const CalmStats = React.memo(function CalmStats({
  income,
  expense,
  budgetUsedPct,
}: CalmStatsProps) {
  const { fmt, getCurrencySymbol } = useFormat();
  const { t } = useI18n();
  const currency = getCurrencySymbol();

  const net = income - expense;
  const pct = budgetUsedPct === null ? null : Math.min(100, Math.max(0, budgetUsedPct));
  const over = pct !== null && pct >= 90;

  return (
    <div className="grid grid-cols-2 gap-3">
      <Cell
        label={t('home.income') || 'الدخل'}
        value={`${fmt(income)} ${currency}`}
        icon="arrow_downward"
        tone="var(--calm-positive)"
      />
      <Cell
        label={t('home.expenses') || 'المصروفات'}
        value={`${fmt(expense)} ${currency}`}
        icon="arrow_upward"
        tone="var(--calm-negative)"
      />

      <div className="calm-card col-span-2" style={{ padding: 'var(--calm-s3) var(--calm-s4)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[0.78rem] font-medium" style={{ color: 'var(--calm-ink-soft)' }}>
            {pct === null
              ? (t('home.netThisMonth') || 'صافي الشهر')
              : (t('home.budgetUsed') || 'استهلاك الميزانية')}
          </span>
          <span
            className="tnum text-[0.86rem] font-bold"
            style={{
              color: pct === null
                ? (net >= 0 ? 'var(--calm-positive)' : 'var(--calm-negative)')
                : (over ? 'var(--calm-negative)' : 'var(--calm-ink)'),
            }}
          >
            {pct === null ? `${fmt(net)} ${currency}` : `${Math.round(pct)}%`}
          </span>
        </div>

        {pct !== null && (
          <div
            className="calm-bar"
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <i style={{
              width: `${pct}%`,
              background: over ? 'var(--calm-negative)' : 'var(--calm-accent)',
            }} />
          </div>
        )}
      </div>
    </div>
  );
});

function Cell({
  label, value, icon, tone,
}: { label: string; value: string; icon: string; tone: string }) {
  return (
    <div className="calm-card" style={{ padding: 'var(--calm-s3) var(--calm-s4)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 15, color: tone }}
          aria-hidden="true"
        >
          {icon}
        </span>
        <span className="text-[0.72rem] font-medium" style={{ color: 'var(--calm-ink-soft)' }}>
          {label}
        </span>
      </div>
      <p className="tnum font-bold text-[1.02rem]" style={{ color: 'var(--calm-ink)' }}>
        {value}
      </p>
    </div>
  );
}
