import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../../i18n/index';
import { useCardText } from '../../hooks/useCardText';

/**
 * Directive 19 — Batch 3: the card screen's header (back, title, add, badges),
 * extracted verbatim from the manager. Owns nothing but the back navigation.
 */
export function CardsHeader({ cardCount, onAdd }: { cardCount: number; onAdd: () => void }) {
  const { isRTL } = useI18n();
  const { getTxt } = useCardText();
  const navigate = useNavigate();

  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(0,43,89,0.08) 0%, transparent 100%)',
      padding: '24px 20px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            aria-label={getTxt('back') || 'Back'}
            onClick={() => navigate('/settings')}
            style={{
              width: 40, height: 40, borderRadius: 14,
              background: 'rgba(0,0,0,0.05)',
              border: '1px solid rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            className="dark:bg-white/5 dark:border-white/8 text-slate-700 dark:text-slate-300"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }} aria-hidden="true">
              {isRTL ? 'arrow_forward' : 'arrow_back'}
            </span>
          </button>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}
              className="text-on-surface dark:text-white">
              {getTxt('title')}
            </h1>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 3 }}
              className="text-slate-400">
              {getTxt('subtitle')}
            </p>
          </div>
        </div>

        <button
          onClick={onAdd}
          style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, #002b59 0%, #1d4ed8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px -4px rgba(29,78,216,0.45)',
            cursor: 'pointer', transition: 'all 0.2s', color: 'white',
            border: 'none',
          }}
          title={getTxt('addCard')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }} aria-hidden="true">add</span>
        </button>
      </div>

      {/* Cards count badge */}
      {cardCount > 0 && (
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px',
            borderRadius: 20,
            background: 'rgba(0,43,89,0.08)',
            border: '1px solid rgba(0,43,89,0.1)',
          }} className="dark:bg-white/5 dark:border-white/8">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400" style={{ fontSize: 14 }}>credit_card</span>
            <span style={{ fontSize: 11, fontWeight: 800 }} className="text-blue-700 dark:text-blue-400">
              {cardCount} {getTxt('myCards')}
            </span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 12px',
            borderRadius: 20,
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.12)',
          }}>
            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400" style={{ fontSize: 13 }}>shield</span>
            <span style={{ fontSize: 11, fontWeight: 800 }} className="text-emerald-700 dark:text-emerald-400">
              AES-GCM {getTxt('encrypted')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
