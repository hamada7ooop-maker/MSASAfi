import React, { useState } from 'react';
import { useFormat } from '@core/hooks/useFormat';
import { useI18n } from '@/i18n/index';
import { useCountUp } from '../../hooks/useCountUp';

interface CalmHeroProps {
  balance: number;
  /** Discretionary amount the user can still spend today. */
  safeToday: number;
  daysLeft: number;
  /** 0–100 financial health score. */
  score: number;
}

/**
 * The single "hero" surface of the calm dashboard.
 *
 * The design rule: exactly one element on screen is allowed to be dramatic.
 * Everything else stays quiet, which is what makes this one read as premium.
 *
 * It leads with "safe to spend today" rather than the raw balance, because
 * that is the number that actually drives a daily decision.
 */
export const CalmHero = React.memo(function CalmHero({
  balance,
  safeToday,
  daysLeft,
  score,
}: CalmHeroProps) {
  const { fmt, getCurrencySymbol } = useFormat();
  const { t } = useI18n();
  const [hidden, setHidden] = useState(false);

  const animatedSafe = useCountUp(safeToday);
  const animatedBalance = useCountUp(balance);
  const currency = getCurrencySymbol();

  const tone =
    score >= 70 ? 'var(--calm-positive)'
    : score >= 40 ? '#d9a406'
    : 'var(--calm-negative)';

  const toneLabel =
    score >= 70 ? t('home.healthGood') || 'وضع مريح'
    : score >= 40 ? t('home.healthFair') || 'وضع متوازن'
    : t('home.healthPoor') || 'انتبه لصرفك';

  const mask = '•••••';

  return (
    <section
      className="calm-hero calm-rise"
      style={{ padding: 'var(--calm-s5) var(--calm-s4)' }}
      aria-label={t('home.balance') || 'الرصيد'}
    >
      {/* Header row: status + privacy toggle */}
      <div className="flex items-center justify-between mb-7">
        <span
          className="inline-flex items-center gap-2 text-[0.7rem] font-semibold tracking-wide px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.92)' }}
        >
          <i style={{
            width: 6, height: 6, borderRadius: 999,
            background: tone, display: 'inline-block',
          }} />
          {toneLabel}
        </span>

        <button
          type="button"
          onClick={() => setHidden((v) => !v)}
          aria-pressed={hidden}
          aria-label={hidden ? (t('common.show') || 'إظهار') : (t('common.hide') || 'إخفاء')}
          className="w-9 h-9 rounded-full grid place-items-center transition-colors"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">
            {hidden ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>

      {/* The number that matters today */}
      <p
        className="text-[0.78rem] font-medium mb-2"
        style={{ color: 'rgba(255,255,255,0.62)' }}
      >
        {t('home.safeToSpend') || 'متاح للصرف اليوم'}
      </p>

      <div className="flex items-baseline gap-2 flex-wrap" aria-live="polite">
        <span
          className="tnum font-black leading-none"
          style={{
            fontSize: 'clamp(2.6rem, 11vw, 3.9rem)',
            letterSpacing: '-0.035em',
            color: '#fff',
          }}
        >
          {hidden ? mask : fmt(Math.max(0, Math.round(animatedSafe)))}
        </span>
        <span
          className="font-bold"
          style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.55)' }}
        >
          {currency}
        </span>
      </div>

      {daysLeft > 0 && (
        <p className="text-[0.76rem] mt-2.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {(t('home.forNextDays') || 'لبقية الشهر — {d} يوم').replace('{d}', String(daysLeft))}
        </p>
      )}

      {/* Secondary: the actual balance, deliberately understated */}
      <div
        className="mt-7 pt-5 flex items-center justify-between"
        style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
      >
        <span className="text-[0.76rem]" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {t('home.totalBalance') || 'إجمالي الرصيد'}
        </span>
        <span
          className="tnum font-bold text-[1.05rem]"
          style={{ color: 'rgba(255,255,255,0.95)' }}
        >
          {hidden ? mask : `${fmt(Math.round(animatedBalance))} ${currency}`}
        </span>
      </div>
    </section>
  );
});
