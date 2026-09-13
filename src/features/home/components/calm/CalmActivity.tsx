import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormat } from '@core/hooks/useFormat';
import { useI18n } from '@/i18n/index';
import type { Transaction } from '@/types';

interface CalmActivityProps {
  transactions: Transaction[];
}

/**
 * Recent activity, stripped to a scannable ledger.
 * Rows are separated by hairlines rather than nested cards, so the eye can
 * run down the amounts column without interruption.
 */
export const CalmActivity = React.memo(function CalmActivity({
  transactions,
}: CalmActivityProps) {
  const { fmt, getCurrencySymbol } = useFormat();
  const { t } = useI18n();
  const navigate = useNavigate();
  const currency = getCurrencySymbol();

  const rows = transactions.slice(0, 5);

  return (
    <section className="calm-card" style={{ padding: 'var(--calm-s4)' }}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[0.9rem] font-bold" style={{ color: 'var(--calm-ink)' }}>
          {t('home.recentActivity') || 'آخر الحركات'}
        </h2>
        <button
          type="button"
          onClick={() => navigate('/transactions')}
          className="text-[0.76rem] font-semibold"
          style={{ color: 'var(--calm-accent)' }}
        >
          {t('common.viewAll') || 'عرض الكل'}
        </button>
      </div>

      {rows.length === 0 ? (
        <p
          className="text-center text-[0.8rem] py-8"
          style={{ color: 'var(--calm-ink-faint)' }}
        >
          {t('home.noTransactions') || 'لا توجد حركات بعد'}
        </p>
      ) : (
        <ul className="mt-2">
          {rows.map((tx, i) => {
            const income = tx.type === 'income';
            return (
              <li
                key={tx.id}
                className="flex items-center gap-3 py-3"
                style={{
                  borderTop: i === 0 ? 'none' : '1px solid var(--calm-line)',
                }}
              >
                <span
                  className="w-9 h-9 rounded-full grid place-items-center shrink-0"
                  style={{
                    background: income
                      ? 'color-mix(in oklab, var(--calm-positive) 12%, transparent)'
                      : 'color-mix(in oklab, var(--calm-ink) 7%, transparent)',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 17,
                      color: income ? 'var(--calm-positive)' : 'var(--calm-ink-soft)',
                    }}
                    aria-hidden="true"
                  >
                    {income ? 'south_west' : 'north_east'}
                  </span>
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className="block text-[0.85rem] font-semibold truncate"
                    style={{ color: 'var(--calm-ink)' }}
                  >
                    {tx.description || tx.category || '—'}
                  </span>
                  <span
                    className="block text-[0.72rem] truncate"
                    style={{ color: 'var(--calm-ink-faint)' }}
                  >
                    {tx.category}
                  </span>
                </span>

                <span
                  className="tnum text-[0.88rem] font-bold shrink-0"
                  style={{ color: income ? 'var(--calm-positive)' : 'var(--calm-ink)' }}
                >
                  {income ? '+' : '−'}{fmt(Math.abs(Number(tx.amount) || 0))} {currency}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
});
