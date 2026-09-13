import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/index';
import { CardRepository } from '../../../core/db/repositories/cards';
import { toast, confirmSheet } from '../../../toast';
import type { BankCard } from '../../../types';
import { silentFail } from '../../../core/utils';

import {
  LOCAL_TEXTS,
  COUNTRY_NAMES,
  CARD_STYLES,
} from '../data/cardConstants';
import { VirtualCard, NetworkBadge, getCardNetwork, CARD_CSS } from './VirtualCard';
import { AddCardModal } from './AddCardModal';

// ════════════════════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════════════════════
export function BankCardsManager() {
  const { language, isRTL } = useI18n();
  const navigate = useNavigate();

  const [cards, setCards] = useState<BankCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [revealedCards, setRevealedCards] = useState<Record<string, boolean>>({});
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState<BankCard | null>(null);


  // ── Auto-Detect Helpers ──────────────────────────────────────────────────




  // ── Helpers ─────────────────────────────────────────────────────────────
  const getTxt = (key: string): string => {
    const dict = LOCAL_TEXTS[language] || LOCAL_TEXTS['en'];
    return dict[key] || LOCAL_TEXTS['en'][key] || key;
  };

  const getCountryName = (cId: string): string =>
    COUNTRY_NAMES[cId]?.[language] || COUNTRY_NAMES[cId]?.['en'] || cId;


  // ── Data loading ─────────────────────────────────────────────────────────
  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const data = await CardRepository.getAll();
      setCards(data);
      if (data.length > 0 && !activeCardId) setActiveCardId(data[0].id);
    } catch (e) {
      silentFail('[BankCardsManager] loadCards error')(e);
      toast('Failed to load cards', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeCardId]);

  useEffect(() => { loadCards(); }, [loadCards]);

  // ── Open the add/edit sheet ───────────────────────────────────────────────
  // These now only express intent. Prefilling and resetting the form belongs
  // to AddCardModal, which keys off `editingCard` when it opens -- so the two
  // cannot drift out of step the way two copies of the same prefill would.
  const openAddModal = () => {
    setEditingCard(null);
    setShowModal(true);
  };

  const openEditModal = (card: BankCard) => {
    setEditingCard(card);
    setShowModal(true);
  };

  // ── Save / Update Card ───────────────────────────────────────────────────

  // ── Delete Card ──────────────────────────────────────────────────────────
  const handleDelete = (card: BankCard) => {
    confirmSheet(
      getTxt('deleteConfirm'),
      async () => {
        try {
          await CardRepository.delete(card.id);
          toast(getTxt('successDelete'), 'success');
          if (activeCardId === card.id) setActiveCardId(null);
          loadCards();
        } catch (e) {
          silentFail('[BankCardsManager] handleDelete error')(e);
        }
      },
      getTxt('deleteBtn'),
      getTxt('cancel')
    );
  };

  const toggleReveal = (id: string) => {
    setRevealedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ── Stacked Deck Layout math ─────────────────────────────────────────────
  const activeIdx = cards.findIndex(c => c.id === activeCardId);

  // ════════════════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-full pb-32" dir={isRTL ? 'rtl' : 'ltr'}>
      <style>{CARD_CSS}</style>

      {/* ─── Header ──────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(0,43,89,0.08) 0%, transparent 100%)',
        padding: '24px 20px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
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
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
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
            onClick={openAddModal}
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
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>add</span>
          </button>
        </div>

        {/* Cards count badge */}
        {cards.length > 0 && (
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
                {cards.length} {getTxt('myCards')}
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

      {/* ─── Content ─────────────────────────────────────────────── */}
      <div style={{ padding: '0 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
            <div style={{
              width: 40, height: 40,
              border: '4px solid rgba(29,78,216,0.15)',
              borderTopColor: '#1d4ed8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
          </div>
        ) : cards.length === 0 ? (
          /* ── Empty state ── */
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
              onClick={openAddModal}
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
        ) : (
          /* ── Stacked Deck Layout ── */
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', letterSpacing: '0.08em', marginBottom: 16, opacity: 0.5 }}
              className="text-slate-500 dark:text-slate-400">
              {getTxt('swipeHint')} ({activeIdx + 1} {getTxt('cardOf')} {cards.length})
            </p>

            {/* Deck wrapper: active card + all other cards as peeks below */}
            <div style={{ marginBottom: 16 }}>

              {/* Active card: always at top, full size */}
              {(() => {
                const active = cards.find(c => c.id === activeCardId) || cards[0];
                const styleForCard = CARD_STYLES.find(s => s.id === active.style.gradientName) || CARD_STYLES[0];
                return (
                  <div style={{ marginBottom: cards.length > 1 ? 8 : 0 }}>
                    <VirtualCard
                      cardNumber={active.number}
                      cardHolder={active.holder}
                      expiry={active.expiry}
                      cvv="•••"
                      bankName={active.bankName}
                      bankLogo={active.bankLogo}
                      countryName={getCountryName(active.countryId)}
                      countryFlag={active.countryFlag}
                      style={styleForCard}
                      isFlipped={false}
                      isRevealed={!!revealedCards[active.id]}
                      expiryLabel={getTxt('expiryShort')}
                      holderLabel={getTxt('cardHolder')}
                    />
                  </div>
                );
              })()}

              {/* ALL other cards: always shown as peek strips below, in a clean vertical stack */}
              {cards
                .filter(c => c.id !== activeCardId)
                .map((card, peekIdx) => {
                  const styleForCard = CARD_STYLES.find(s => s.id === card.style.gradientName) || CARD_STYLES[0];
                  return (
                    <div
                      key={card.id}
                      onClick={() => setActiveCardId(card.id)}
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
                        transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                        transform: `scale(${1 - peekIdx * 0.01})`,
                        transformOrigin: 'top center',
                        opacity: 1 - peekIdx * 0.08,
                      }}
                    >
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
                })
              }
            </div>

            {/* ── Active card detail panel ── */}
            {activeCardId && (() => {
              const card = cards.find(c => c.id === activeCardId);
              if (!card) return null;
              const isRevealed = !!revealedCards[card.id];
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
                      onClick={() => toggleReveal(card.id)}
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
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                        {isRevealed ? 'visibility_off' : 'visibility'}
                      </span>
                      {isRevealed ? getTxt('hideDetails') : getTxt('revealDetails')}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEditModal(card)}
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
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                      {getTxt('editCard')}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(card)}
                      style={{
                        width: 44, height: 44, borderRadius: 14, border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(244,63,94,0.08)',
                        color: '#e11d48', transition: 'all 0.2s',
                      }}
                      className="dark:bg-rose-900/20 dark:text-rose-400"
                      title={getTxt('deleteTitle')}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ── Card navigation dots ── */}
            {cards.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
                {cards.map((card) => {
                  const s = CARD_STYLES.find(cs => cs.id === card.style.gradientName) || CARD_STYLES[0];
                  const isActive = card.id === activeCardId;
                  return (
                    <button
                      key={card.id}
                      onClick={() => setActiveCardId(card.id)}
                      style={{
                        width: isActive ? 24 : 8,
                        height: 8, borderRadius: 4,
                        border: 'none', cursor: 'pointer',
                        background: isActive ? s.glowColor.replace('0.5', '1') : 'rgba(0,0,0,0.15)',
                        transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                        boxShadow: isActive ? `0 2px 8px ${s.glowColor}` : 'none',
                      }}
                      className={!isActive ? 'dark:bg-white/20' : ''}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Security Footer ─────────────────────────────────────── */}
      <div style={{ padding: '24px 20px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px', borderRadius: 18,
          background: 'linear-gradient(135deg, rgba(0,43,89,0.06) 0%, rgba(29,78,216,0.04) 100%)',
          border: '1px solid rgba(29,78,216,0.1)',
        }} className="dark:bg-[#0f1b30]/60 dark:border-blue-900/30">
          <div style={{
            width: 36, height: 36, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #002b59, #1d4ed8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(29,78,216,0.3)',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'white' }}>lock</span>
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.6 }} className="text-blue-700 dark:text-blue-400">
            {getTxt('protectedNotice')}
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
           ADD / EDIT CARD MODAL
      ════════════════════════════════════════════════════════════ */}
      <AddCardModal
        open={showModal}
        editingCard={editingCard}
        onClose={() => setShowModal(false)}
        onSaved={(savedCardId, wasNew) => {
          // A newly added card becomes the active one; an edit leaves the
          // selection where the user had it.
          //
          // The `wasNew` guard is intent, not logic: on an edit the modal
          // reports `editingCard.id`, which is already the active card, so
          // dropping the guard is an EQUIVALENT mutation (verified -- no test
          // can distinguish it). It stays because it states the rule, and
          // because it keeps holding if the edit path ever gains the ability
          // to change a card's id.
          if (wasNew) setActiveCardId(savedCardId);
          loadCards();
        }}
      />
    </div>
  );
}
