import React from 'react';
import { touch } from '@/core/haptics';
import type { BankCard } from '../../../../types';
import { useCardText } from '../../hooks/useCardText';

/**
 * Directive 19 — Batch 3: the active card's detail panel — the four detail
 * rows and the three actions (reveal / edit / delete). Extracted from the
 * manager with the DOM contract intact.
 *
 * New since the extraction (the batch's mandate, not drift):
 * - the reveal toggle answers with touch.light — a secondary read action;
 * - the reveal button's aria-label was the generic "back" label (a
 *   copy-paste fossil the characterization suite surfaced); it now names
 *   the action it performs.
 */
export function CardDetailPanel({
  card,
  isRevealed,
  onToggleReveal,
  onEdit,
  onDelete,
}: {
  card: BankCard;
  isRevealed: boolean;
  onToggleReveal: (id: string) => void;
  onEdit: (card: BankCard) => void;
  onDelete: (card: BankCard) => void;
}) {
  const { getTxt } = useCardText();

  return (
    <div style={{
      borderRadius: 24,
      padding: '18px 20px',
      marginTop: 12,
      border: '1px solid rgba(0,0,0,0.05)',
    }} className="bg-surface-container-lowest dark:bg-[#1a1d21] dark:border-white/[0.05] animate-in fade-in slide-in-from-bottom-3 duration-300">

      {/* Card details rows */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }} className="text-slate-400">
            {getTxt('cardHolder')}
          </p>
          <p style={{ fontSize: 15, fontWeight: 900, letterSpacing: '0.02em' }} className="text-on-surface dark:text-white">
            {card.holder}
          </p>
        </div>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }} className="text-slate-400">
            {getTxt('expiryShort')}
          </p>
          <p style={{ fontSize: 15, fontWeight: 900, fontFamily: 'monospace' }} className="text-on-surface dark:text-white">
            {card.expiry}
          </p>
        </div>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }} className="text-slate-400">
            {getTxt('cardNumber')}
          </p>
          <p style={{ fontSize: 14, fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.1em' }} className="text-on-surface dark:text-white">
            {isRevealed ? card.number.replace(/(\d{4})(?=\d)/g, '$1 ') : card.numberMasked}
          </p>
        </div>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }} className="text-slate-400">
            {getTxt('selectBank')}
          </p>
          <p style={{ fontSize: 14, fontWeight: 900 }} className="text-on-surface dark:text-white">
            {card.bankName} {card.countryFlag}
          </p>
        </div>
      </div>

      {/* Actions row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {/* Reveal toggle */}
        <button
          aria-label={isRevealed ? getTxt('hideDetails') : getTxt('revealDetails')}
          onClick={() => {
            touch.light();
            onToggleReveal(card.id);
          }}
          style={{
            flex: 1, minWidth: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '11px 14px', borderRadius: 14, border: 'none', cursor: 'pointer',
            fontWeight: 800, fontSize: 12, transition: 'all 0.2s',
            background: isRevealed ? 'rgba(245,158,11,0.1)' : 'rgba(29,78,216,0.08)',
            color: isRevealed ? '#d97706' : '#2563eb',
          }}
          className={isRevealed ? 'dark:bg-amber-900/20 dark:text-amber-400' : 'dark:bg-blue-900/20 dark:text-blue-400'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">
            {isRevealed ? 'visibility_off' : 'visibility'}
          </span>
          {isRevealed ? getTxt('hideDetails') : getTxt('revealDetails')}
        </button>

        {/* Edit */}
        <button aria-label="Edit"
          onClick={() => onEdit(card)}
          style={{
            flex: 1, minWidth: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '11px 14px', borderRadius: 14, border: 'none', cursor: 'pointer',
            fontWeight: 800, fontSize: 12, transition: 'all 0.2s',
            background: 'rgba(16,185,129,0.08)',
            color: '#059669',
          }}
          className="dark:bg-emerald-900/20 dark:text-emerald-400"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">edit</span>
          {getTxt('editCard')}
        </button>

        {/* Delete */}
        <button
          onClick={() => onDelete(card)}
          style={{
            width: 44, height: 44, borderRadius: 14, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(244,63,94,0.08)',
            color: '#e11d48', transition: 'all 0.2s',
          }}
          className="dark:bg-rose-900/20 dark:text-rose-400"
          title={getTxt('deleteTitle')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">delete</span>
        </button>
      </div>
    </div>
  );
}
