import React, { useState } from 'react';
import { GlassPanel } from '../../../../components/ui/GlassPanel';
import { NumberFlow } from '../../../../components/ui/NumberFlow';
import { useFormat } from '../../../../core/hooks/useFormat';
import { useI18n } from '../../../../i18n/index';
import { getMonthName } from '../../../../core/utils';
import { touch } from '../../../../core/haptics';
import type { PredictionInfo } from '../../hooks/useHomeData';

/**
 * Directive 19 — Batch 1: the Hero Glass Balance Card.
 *
 * The dashboard's centerpiece, rebuilt on the Batch 0 primitives:
 * - GlassPanel (strong) — the one sanctioned hero glass treatment
 * - AmbientGlow — semantic halo: emerald behind positive net worth,
 *   coral behind negative (the approved financial color pair)
 * - NumberFlow — the adaptive tabular-nums counter
 *
 * Behavioral contract inherited from the classic BalanceCard (kept green by
 * characterization): aria-live="polite" announcements, the incognito toggle
 * (blur + aria-pressed + stopPropagation, digits removed from the a11y tree
 * while hidden), the month pill, the prediction countdown pill, and
 * font-size adaptation to the formatted figure's length.
 */
interface HeroBalanceCardProps {
  balance: number;
  prediction?: PredictionInfo | null;
}

export function HeroBalanceCard({ balance, prediction }: HeroBalanceCardProps) {
  const { fmt, getCurrencySymbol } = useFormat();
  const { t } = useI18n();
  const currency = getCurrencySymbol();
  const [isSecret, setIsSecret] = useState(false);

  const formattedBalance = fmt(balance);
  const len = formattedBalance.length;
  let baseSize = 'clamp(2.4rem, 9.5vw, 3.4rem)';
  if (len > 16) baseSize = 'clamp(1.1rem, 4.5vw, 1.7rem)';
  else if (len > 13) baseSize = 'clamp(1.5rem, 6.5vw, 2.2rem)';
  else if (len > 10) baseSize = 'clamp(1.9rem, 8.5vw, 2.7rem)';

  // The semantic glow: the approved emerald/coral pair, by net worth sign.
  const glowColor = balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)';

  return (
    <GlassPanel
      strong
      data-testid="hero-balance-card"
      className="ambient-glow p-7 text-white !bg-none"
      style={
        {
          '--glow-color': glowColor,
          background:
            balance >= 0
              ? 'linear-gradient(135deg, #0B0F17 0%, #0d2b22 55%, #103a2c 100%)'
              : 'linear-gradient(135deg, #0B0F17 0%, #2b1118 55%, #3a1520 100%)',
        } as React.CSSProperties
      }
    >
      <div className="relative z-10 w-full flex flex-col justify-between h-full min-h-[170px]">
        {/* Top row: labels */}
        <div className="space-y-1">
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/75 block">
            {t('home.balance')}
          </span>
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: glowColor, boxShadow: `0 0 8px ${glowColor}` }}
            />
            <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">
              {t('currencies.base') || 'العملة الأساسية'}: {t('currency.sar') || 'ر.س'}
            </span>
          </div>
        </div>

        {/* Middle row: the flowing balance + incognito toggle */}
        <div className="my-6">
          <div className="flex items-center gap-3 max-w-full">
            <h1
              className={`num-fin text-premium-header tracking-tighter flex items-baseline gap-2 whitespace-nowrap leading-none transition-all duration-700 ${
                isSecret ? 'filter blur-[12px] opacity-15 select-none pointer-events-none' : ''
              }`}
              style={{ fontSize: baseSize }}
              aria-live="polite"
              aria-atomic="true"
              aria-label={
                isSecret
                  ? t('home.balanceHidden') || 'الرصيد مخفي'
                  : `${t('home.balance')}: ${formattedBalance} ${currency}`
              }
            >
              <NumberFlow
                value={balance}
                format={fmt}
                aria-hidden="true"
                className="drop-shadow-[0_8px_16px_rgba(0,0,0,0.3)]"
              />
              <span
                aria-hidden="true"
                className="text-[0.4em] font-black opacity-45 shrink-0 tracking-normal leading-none"
              >
                {currency}
              </span>
            </h1>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsSecret(!isSecret);
                touch.light();
              }}
              className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-white/60 hover:text-white flex items-center justify-center backdrop-blur-xl transition-all shadow-inner shrink-0"
              title={isSecret ? t('home.showBalance') : t('home.hideBalance')}
              aria-label={isSecret ? t('home.showBalance') : t('home.hideBalance')}
              aria-pressed={isSecret}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                {isSecret ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {/* Bottom row: pills */}
        <div className="flex gap-2.5 items-center overflow-x-auto scrollbar-none pb-1 relative z-10">
          <div className="bg-white/[0.03] hover:bg-white/[0.07] backdrop-blur-xl px-4 py-2.5 rounded-[1.2rem] flex items-center gap-2 shrink-0 border border-white/10 shadow-sm transition-all">
            <span className="material-symbols-outlined text-[13px] text-blue-300">calendar_month</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-white/90">
              {getMonthName(new Date().getMonth())}
            </span>
          </div>

          {prediction && (
            <div className="bg-white/[0.03] hover:bg-white/[0.07] backdrop-blur-xl px-4 py-2.5 rounded-[1.2rem] flex items-center gap-2 shrink-0 border border-white/10 shadow-sm transition-all">
              <span className="material-symbols-outlined text-[13px] text-amber-300">timer</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-white/90">
                {prediction.daysLeft} {t('home.days')}
              </span>
            </div>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}

export default HeroBalanceCard;
