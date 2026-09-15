import React from 'react';
import { onActivate } from '@/core/a11yKeyboard';
import { touch } from '@/core/haptics';
import { springCss } from '@/components/motion/tokens';
import type { BankCard } from '../../../../types';
import { CARD_STYLES } from '../../data/cardConstants';
import { NetworkBadge, getCardNetwork } from '../VirtualCard';
import { useCardText } from '../../hooks/useCardText';

/**
 * Directive 19 — Batch 3: one peek strip — a card waiting in the stack below
 * the active one. Extracted verbatim from the manager's deck map.
 *
 * New since the extraction (the batch's mandate, not drift):
 * - the transition now rides the snappy spring token instead of a
 *   hand-rolled cubic-bezier;
 * - choosing a card answers with touch.select — picking from a stack is a
 *   segmented selection, the same vocabulary the QuickAdd sheet uses.
 */
export function PeekStrip({
  card,
  peekIdx,
  onSelect,
}: {
  card: BankCard;
  peekIdx: number;
  onSelect: (id: string) => void;
}) {
  const { getCountryName } = useCardText();
  const styleForCard = CARD_STYLES.find(s => s.id === card.style.gradientName) || CARD_STYLES[0];

  const select = () => {
    touch.select();
    onSelect(card.id);
  };

  return (
    <div
      onClick={select}
      style={{
        width: '100%',
        height: 56,
        borderRadius: 18,
        background: styleForCard.bg,
        border: styleForCard.isGlass
          ? '1px solid rgba(255,255,255,0.25)'
          : '1px solid rgba(255,255,255,0.1)',
        boxShadow: `0 6px 20px -4px ${styleForCard.glowColor}, 0 2px 8px rgba(0,0,0,0.15)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        cursor: 'pointer',
        marginTop: 6,
        overflow: 'hidden',
        position: 'relative',
        transition: `all 0.35s ${springCss('snappy')}`,
        transform: `scale(${1 - peekIdx * 0.01})`,
        transformOrigin: 'top center',
        opacity: 1 - peekIdx * 0.08,
      }}
      role="button" tabIndex={0} onKeyDown={onActivate(select)}>
      {/* Subtle shimmer overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Left: bank logo + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'rgba(255,255,255,0.18)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 900, color: 'white',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          flexShrink: 0,
        }}>
          {card.bankLogo}
        </div>
        <div>
          <div style={{
            fontSize: 14, fontWeight: 900, color: 'white',
            textShadow: styleForCard.textShadow,
            letterSpacing: '-0.01em',
          }}>
            {card.bankName}
          </div>
          <div style={{
            fontSize: 10, color: 'rgba(255,255,255,0.72)',
            fontWeight: 700, letterSpacing: '0.04em',
          }}>
            {getCountryName(card.countryId)} {card.countryFlag}
          </div>
        </div>
      </div>

      {/* Right: masked number + network */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
        <span style={{
          fontSize: 13, fontFamily: 'monospace',
          color: 'rgba(255,255,255,0.9)', fontWeight: 800,
          letterSpacing: '0.08em',
          textShadow: styleForCard.textShadow,
        }}>
          ••••{card.number.slice(-4)}
        </span>
        <NetworkBadge network={getCardNetwork(card.number)} />
      </div>
    </div>
  );
}
