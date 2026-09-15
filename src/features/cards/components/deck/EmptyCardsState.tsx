import React from 'react';
import { useCardText } from '../../hooks/useCardText';

/**
 * Directive 19 — Batch 3: the no-cards state, extracted verbatim from the
 * manager. A dead end that is also the only door in: the add-first button.
 */
export function EmptyCardsState({ onAdd }: { onAdd: () => void }) {
  const { getTxt } = useCardText();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 24px', textAlign: 'center',
      borderRadius: 32,
      marginTop: 16,
    }} className="bg-surface-container-lowest dark:bg-[#1a1d21] border border-black/[0.04] dark:border-white/[0.05]">
      <div style={{
        width: 72, height: 72, borderRadius: 24,
        background: 'linear-gradient(135deg, rgba(29,78,216,0.1) 0%, rgba(139,92,246,0.1) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20, border: '1px solid rgba(29,78,216,0.1)',
        boxShadow: '0 8px 24px rgba(29,78,216,0.08)'
      }}>
        <span className="material-symbols-outlined text-blue-500 dark:text-blue-400" style={{ fontSize: 36 }}>credit_card</span>
      </div>
      <p style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }} className="text-on-surface dark:text-white">
        {getTxt('noCards')}
      </p>
      <p style={{ fontSize: 12, lineHeight: 1.7, maxWidth: 280, fontWeight: 600 }} className="text-slate-400">
        {getTxt('noCardsDesc')}
      </p>
      <button
        onClick={onAdd}
        style={{
          marginTop: 24, padding: '14px 32px',
          borderRadius: 18,
          background: 'linear-gradient(135deg, #002b59 0%, #1d4ed8 100%)',
          color: 'white', fontWeight: 900, fontSize: 13,
          boxShadow: '0 12px 32px -6px rgba(29,78,216,0.4)',
          border: 'none', cursor: 'pointer', transition: 'all 0.2s'
        }}
      >
        {getTxt('addFirst')}
      </button>
    </div>
  );
}
