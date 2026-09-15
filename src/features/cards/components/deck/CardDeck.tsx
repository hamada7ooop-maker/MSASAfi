import React from 'react';
import { touch } from '@/core/haptics';
import { springCss } from '@/components/motion/tokens';
import { useI18n } from '../../../../i18n/index';
import type { BankCard } from '../../../../types';
import { CARD_STYLES } from '../../data/cardConstants';
import { VirtualCard } from '../VirtualCard';
import { useCardText } from '../../hooks/useCardText';
import { useDeckSwipe } from '../../hooks/useDeckSwipe';
import { PeekStrip } from './PeekStrip';

/**
 * Directive 19 — Batch 3: the stacked deck — the active card on top, the
 * rest peeking below, dots underneath. Extracted from the manager with the
 * DOM contract intact (position counter text, dot sizing, VirtualCard props).
 *
 * New since the extraction (the batch's mandate, not drift):
 * - the swipe chain: drag the active card sideways to walk the deck,
 *   RTL-aware, resisting at the deck's edges (useDeckSwipe);
 * - a committed walk — swipe, peek click or dot — answers with touch.select;
 * - the newly active card enters on the gentle spring (keyed remount), and
 *   the dots ride the snappy spring instead of a hand-rolled bezier.
 */
export function CardDeck({
  cards,
  activeCardId,
  revealedCards,
  onSelect,
}: {
  cards: BankCard[];
  activeCardId: string | null;
  revealedCards: Record<string, boolean>;
  onSelect: (id: string) => void;
}) {
  const { getTxt, getCountryName } = useCardText();
  const { isRTL } = useI18n();
  const activeIdx = cards.findIndex(c => c.id === activeCardId);

  // Dots live here, peeks in their own piece — each fires its own select
  // pulse, so no path double-taps.
  const selectFromDot = (id: string) => {
    touch.select();
    onSelect(id);
  };
  const step = (dir: 1 | -1) => {
    const next = cards[activeIdx + dir];
    if (!next) return; // deck edge: nothing to hand over to
    touch.select();
    onSelect(next.id);
  };

  const { dragX, transition, handlers } = useDeckSwipe({
    isRTL,
    canPrev: activeIdx > 0,
    canNext: activeIdx >= 0 && activeIdx < cards.length - 1,
    onPrev: () => step(-1),
    onNext: () => step(1),
  });

  const active = cards.find(c => c.id === activeCardId) || cards[0];
  const styleForActive = CARD_STYLES.find(s => s.id === active.style.gradientName) || CARD_STYLES[0];

  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', letterSpacing: '0.08em', marginBottom: 16, opacity: 0.5 }}
        className="text-slate-500 dark:text-slate-400">
        {getTxt('swipeHint')} ({activeIdx + 1} {getTxt('cardOf')} {cards.length})
      </p>

      {/* Deck wrapper: active card + all other cards as peeks below */}
      <div style={{ marginBottom: 16 }}>

        {/* Active card: draggable, enters on the gentle spring */}
        <div
          data-testid="deck-active"
          style={{
            marginBottom: cards.length > 1 ? 8 : 0,
            transform: dragX !== 0 ? `translateX(${dragX}px)` : undefined,
            transition,
            touchAction: 'pan-y', // horizontal drags are ours, vertical scrolls pass through
          }}
          {...handlers}
        >
          {/* key: each card switch remounts the card so the entrance spring replays */}
          <div key={active.id} className="deck-active-enter">
            <VirtualCard
              cardNumber={active.number}
              cardHolder={active.holder}
              expiry={active.expiry}
              cvv="•••"
              bankName={active.bankName}
              bankLogo={active.bankLogo}
              countryName={getCountryName(active.countryId)}
              countryFlag={active.countryFlag}
              style={styleForActive}
              isFlipped={false}
              isRevealed={!!revealedCards[active.id]}
              expiryLabel={getTxt('expiryShort')}
              holderLabel={getTxt('cardHolder')}
            />
          </div>
        </div>

        {/* ALL other cards: always shown as peek strips below, in a clean vertical stack */}
        {cards
          .filter(c => c.id !== activeCardId)
          .map((card, peekIdx) => (
            <PeekStrip key={card.id} card={card} peekIdx={peekIdx} onSelect={onSelect} />
          ))}
      </div>

      {/* ── Card navigation dots ── */}
      {cards.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
          {cards.map((card) => {
            const s = CARD_STYLES.find(cs => cs.id === card.style.gradientName) || CARD_STYLES[0];
            const isActive = card.id === activeCardId;
            return (
              <button
                key={card.id}
                aria-label={`${getTxt('title')} ${cards.indexOf(card) + 1}`}
                onClick={() => selectFromDot(card.id)}
                style={{
                  width: isActive ? 24 : 8,
                  height: 8, borderRadius: 4,
                  border: 'none', cursor: 'pointer',
                  background: isActive ? s.glowColor.replace('0.5', '1') : 'rgba(0,0,0,0.15)',
                  transition: `all 0.3s ${springCss('snappy')}`,
                  boxShadow: isActive ? `0 2px 8px ${s.glowColor}` : 'none',
                }}
                className={!isActive ? 'dark:bg-white/20' : ''}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
