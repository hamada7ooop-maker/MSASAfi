import React from 'react';
import { onActivate } from '@/core/a11yKeyboard';
import { VirtualCard } from './VirtualCard';
import { CARD_STYLES } from '../data/cardConstants';

export interface CardVisualPreviewProps {
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv: string;
  bankName: string;
  bankLogo: string;
  countryName: string;
  countryFlag: string;
  /** Resolved style object from CARD_STYLES. Typed from the source array so
   *  the two cannot drift -- a hand-written shape here was already too loose
   *  for VirtualCard's prop and failed to compile. */
  activeStyle: (typeof CARD_STYLES)[number];
  isFlipped: boolean;
  onToggleFlip: () => void;
  getTxt: (key: string) => string;
}

/**
 * Live 3D preview of the card being entered, flipping to show the CVV side.
 *
 * Extracted from AddCardModal.tsx as part of L-1. Every value is a prop: the
 * preview must render exactly what will be saved, so deriving anything here
 * would create a second source of truth for the same card.
 *
 * The wrapper keeps its keyboard affordance from Directive 13 -- it is a
 * genuine control, not decoration, because flipping is the only way to see the
 * CVV side.
 */
export function CardVisualPreview({
  cardNumber, cardHolder, expiry, cvv,
  bankName, bankLogo, countryName, countryFlag,
  activeStyle, isFlipped, onToggleFlip, getTxt,
}: CardVisualPreviewProps) {
  return (
    <>
<div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
  <div style={{ width: '100%', maxWidth: 360, cursor: 'pointer' }}
    onClick={onToggleFlip}
  role="button" tabIndex={0} onKeyDown={onActivate(onToggleFlip)}>
    <VirtualCard
      cardNumber={cardNumber}
      cardHolder={cardHolder}
      expiry={expiry}
      cvv={cvv}
      bankName={bankName}
      bankLogo={bankLogo}
      countryName={countryName}
      countryFlag={countryFlag}
      style={activeStyle}
      isFlipped={isFlipped}
      isRevealed
      expiryLabel={getTxt('expiryShort')}
      holderLabel={getTxt('cardHolder')}
    />
  </div>
</div>
<p style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, marginBottom: 20, opacity: 0.45, textTransform: 'uppercase', letterSpacing: '0.08em' }} className="text-slate-500">
  {getTxt('tapToExpand')} · {getTxt('cvv')}
</p>
    </>
  );
}
