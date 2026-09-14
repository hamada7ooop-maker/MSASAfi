import React from 'react';
import { onActivate } from '@/core/a11yKeyboard';
import type { CardStyleType } from '../data/cardConstants';

// ─── Inline Card CSS ─────────────────────────────────────────────────────────
export const CARD_CSS = `
  .card-3d-wrap { perspective: 1200px; }
  .card-3d-inner {
    position: relative; width: 100%; height: 100%;
    transition: transform 0.65s cubic-bezier(0.4,0,0.2,1);
    transform-style: preserve-3d;
  }
  .card-3d-inner.flipped { transform: rotateY(180deg); }
  .card-face {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    border-radius: 1.25rem;
    overflow: hidden;
  }
  .card-face-back { transform: rotateY(180deg); }

  /* Stacked Deck */
  .deck-container { position: relative; }
  .deck-card-wrap {
    position: absolute; left: 0; right: 0;
    transition: all 0.45s cubic-bezier(0.34,1.56,0.64,1);
    cursor: pointer;
  }
  .deck-card-wrap.active {
    position: relative;
    z-index: 50;
  }
  .shimmer-bar {
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%);
    background-size: 200% 100%;
    animation: shimmer 3s infinite;
  }
  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  .chip-lines {
    background: repeating-linear-gradient(
      0deg, transparent, transparent 3px,
      rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 4px
    ), repeating-linear-gradient(
      90deg, transparent, transparent 5px,
      rgba(0,0,0,0.1) 5px, rgba(0,0,0,0.1) 6px
    );
  }
`;

// ─── Helper: card network ────────────────────────────────────────────────────
export function getCardNetwork(num: string): 'visa' | 'mastercard' | 'mada' | 'generic' {
  const n = num.replace(/\s/g, '');
  if (n.startsWith('4')) return 'visa';
  if (n.startsWith('5')) return 'mastercard';
  if (n.startsWith('6')) return 'mada';
  return 'generic';
}

export function NetworkBadge({ network }: { network: string }) {
  if (network === 'visa') return (
    <span style={{
      fontFamily: 'serif',
      fontStyle: 'italic',
      fontSize: '1.1rem',
      fontWeight: 900,
      letterSpacing: '-0.03em',
      color: 'white',
      textShadow: '0 1px 4px rgba(0,0,0,0.6)',
      filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.3))'
    }}>VISA</span>
  );
  if (network === 'mastercard') return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
      <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#eb001b', display: 'inline-block', boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }} />
      <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#f79e1b', display: 'inline-block', marginLeft: -10, boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }} />
    </span>
  );
  if (network === 'mada') return (
    <span style={{
      fontSize: '0.85rem',
      fontWeight: 900,
      background: 'linear-gradient(90deg,#00a651,#00529b)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      textShadow: 'none',
      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))'
    }}>mada</span>
  );
  return <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'rgba(255,255,255,0.8)' }}>credit_card</span>;
}

// ─── Virtual Card Component ──────────────────────────────────────────────────
export interface VirtualCardProps {
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv: string;
  bankName: string;
  bankLogo?: string;
  countryName: string;
  countryFlag: string;
  style: CardStyleType;
  isFlipped: boolean;
  isRevealed?: boolean;
  compact?: boolean;
  expiryLabel: string;
  holderLabel: string;
  onClick?: () => void;
}

export function VirtualCard({
  cardNumber, cardHolder, expiry, cvv, bankName, bankLogo,
  countryName, countryFlag, style, isFlipped, isRevealed, compact,
  expiryLabel, holderLabel, onClick
}: VirtualCardProps) {
  const height = compact ? '160px' : '200px';
  const network = getCardNetwork(cardNumber);
  const displayNumber = isRevealed
    ? cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ')
    : cardNumber.replace(/\d{4} ?\d{4} ?\d{4}/, '•••• •••• ••••');

  return (
    <div className="card-3d-wrap" style={{ width: '100%', height }} onClick={onClick}
  role="button" tabIndex={0} onKeyDown={onActivate(() => onClick?.())}>
      <div className={`card-3d-inner w-full h-full ${isFlipped ? 'flipped' : ''}`}>

        {/* ── FRONT ── */}
        <div className="card-face" style={{
          background: style.bg,
          boxShadow: `0 20px 60px -10px ${style.glowColor}, 0 8px 24px -4px rgba(0,0,0,0.3)`,
          border: style.isGlass ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.08)',
        }}>
          {/* Glass shimmer overlay */}
          {style.isGlass && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 60%)',
              pointerEvents: 'none'
            }} />
          )}
          {/* Decorative circles */}
          <div style={{
            position: 'absolute', top: -40, right: -40,
            width: 160, height: 160, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute', bottom: -30, left: -30,
            width: 100, height: 100, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            pointerEvents: 'none'
          }} />

          <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: compact ? '14px 16px' : '18px 20px' }}>

            {/* Row 1: Bank + Chip */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: compact ? 28 : 36, height: compact ? 28 : 36,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: compact ? 11 : 13, color: 'white',
                  textShadow: style.textShadow,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
                }}>
                  {bankLogo || 'B'}
                </div>
                <div>
                  <div style={{
                    fontSize: compact ? 11 : 13, fontWeight: 900, color: 'white',
                    textShadow: style.textShadow, lineHeight: 1.2,
                    textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 130, whiteSpace: 'nowrap'
                  }}>{bankName}</div>
                  <div style={{
                    fontSize: compact ? 8 : 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.75)',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    textShadow: style.textShadow
                  }}>{countryName} {countryFlag}</div>
                </div>
              </div>

              {/* Chip */}
              <div style={{
                width: compact ? 28 : 36, height: compact ? 20 : 26,
                borderRadius: 5,
                background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 40%, #d97706 70%, #92400e 100%)',
                border: '1px solid rgba(120,53,15,0.4)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
              }} className="chip-lines" />
            </div>

            {/* Row 2: Card Number */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'monospace',
                fontSize: compact ? 15 : 20,
                fontWeight: 900,
                color: 'white',
                letterSpacing: '0.18em',
                textShadow: style.textShadow,
                lineHeight: 1,
              }}>
                {displayNumber}
              </div>
              {/* Shimmer bar under number */}
              <div className="shimmer-bar" style={{ height: 1, marginTop: 6, opacity: 0.4 }} />
            </div>

            {/* Row 3: Holder / Expiry / Network */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: compact ? 7 : 8, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{holderLabel}</div>
                <div style={{
                  fontSize: compact ? 11 : 14, fontWeight: 900, color: 'white',
                  textShadow: style.textShadow,
                  textTransform: 'uppercase',
                  maxWidth: compact ? 100 : 150,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>{cardHolder || 'HOLDER NAME'}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: compact ? 7 : 8, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{expiryLabel}</div>
                <div style={{
                  fontSize: compact ? 12 : 15, fontWeight: 900, color: 'white',
                  textShadow: style.textShadow, fontFamily: 'monospace',
                  letterSpacing: '0.05em'
                }}>{expiry || 'MM/YY'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <NetworkBadge network={network} />
              </div>
            </div>
          </div>
        </div>

        {/* ── BACK ── */}
        <div className="card-face card-face-back" style={{
          background: style.bg,
          boxShadow: `0 20px 60px -10px ${style.glowColor}`,
          border: style.isGlass ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.08)',
        }}>
          {/* Magnetic strip */}
          <div style={{ width: '100%', height: compact ? 28 : 40, background: 'rgba(0,0,0,0.85)', marginTop: compact ? 18 : 24 }} />
          {/* CVV strip */}
          <div style={{ padding: '12px 16px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.9)',
              borderRadius: 6, padding: '6px 10px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: 8, color: '#64748b', fontStyle: 'italic' }}>authorized signature</span>
              <span style={{
                fontFamily: 'monospace',
                fontSize: compact ? 13 : 16,
                fontWeight: 900,
                color: '#0f172a',
                background: 'white',
                padding: '2px 8px',
                borderRadius: 4,
                border: '1px solid #e2e8f0',
                letterSpacing: '0.15em'
              }}>{cvv || '•••'}</span>
            </div>
          </div>
          <div style={{ padding: '0 16px', fontSize: 7, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.5 }}>
            This card is encrypted in Masarifi Wallet. Never share your real CVV or PIN.
          </div>
        </div>
      </div>
    </div>
  );
}
