import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../../../i18n/index';
import { CardRepository } from '../../../core/db/repositories/cards';
import { toast, confirmSheet } from '../../../toast';
import { touch } from '../../../core/haptics';
import { useCardText } from '../hooks/useCardText';
import type { BankCard } from '../../../types';
import { silentFail } from '../../../core/utils';

import { CARD_CSS } from './VirtualCard';
import { AddCardModal } from './AddCardModal';
import { CardsHeader } from './deck/CardsHeader';
import { EmptyCardsState } from './deck/EmptyCardsState';
import { CardDeck } from './deck/CardDeck';
import { CardDetailPanel } from './deck/CardDetailPanel';
import { SecurityFooter } from './deck/SecurityFooter';

/**
 * Directive 19 — Batch 3: the bank cards screen as a thin composition root.
 *
 * Was 553 lines of header + empty state + deck + detail panel + footer +
 * modal in one body. Now each piece lives in `components/deck/` at ≤120
 * lines with its own responsibility; the root owns only the state and the
 * data lifecycle (load / add / edit / delete) — the four things that must
 * NOT be split across pieces.
 *
 * The characterization suite (20 tests) pinned the contract before the
 * extraction; it stays green through it.
 */
export function BankCardsManager() {
  const { isRTL } = useI18n();
  const { getTxt } = useCardText();

  const [cards, setCards] = useState<BankCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [revealedCards, setRevealedCards] = useState<Record<string, boolean>>({});
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState<BankCard | null>(null);

  // ── Data loading ─────────────────────────────────────────────────────────
  // The auto-select reads the LATEST selection through the setter's
  // functional form, not a closure dependency. The old `[activeCardId]` dep
  // re-ran this loader on EVERY selection change — every peek click, dot
  // click or swipe re-queried IndexedDB and flashed the loading spinner over
  // the deck (and the mount-time auto-select caused a double load that could
  // remount the deck mid-gesture, detaching the swipe handlers). Found by
  // the Batch 3 swipe suite; selection changes are pure state now.
  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const data = await CardRepository.getAll();
      setCards(data);
      setActiveCardId(prev =>
        prev && data.some(c => c.id === prev) ? prev : data[0]?.id ?? null
      );
    } catch (e) {
      silentFail('[BankCardsManager] loadCards error')(e);
      toast('Failed to load cards', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCards(); }, [loadCards]);

  // ── Open the add/edit sheet ───────────────────────────────────────────────
  // These only express intent. Prefilling and resetting the form belongs
  // to AddCardModal, which keys off `editingCard` when it opens — so the two
  // cannot drift out of step the way two copies of the same prefill would.
  const openAddModal = () => {
    setEditingCard(null);
    setShowModal(true);
  };

  const openEditModal = (card: BankCard) => {
    setEditingCard(card);
    setShowModal(true);
  };

  // ── Delete Card ──────────────────────────────────────────────────────────
  const handleDelete = (card: BankCard) => {
    confirmSheet(
      getTxt('deleteConfirm'),
      async () => {
        try {
          touch.destruct(); // confirmed deletion of a financial instrument
          await CardRepository.delete(card.id);
          toast(getTxt('successDelete'), 'success');
          if (activeCardId === card.id) setActiveCardId(null);
          loadCards();
        } catch (e) {
          // Directive 15 (silentFail audit): surfaced — the delete failed with
          // no toast, so the card stayed in the deck looking undeleted while
          // the user believed the opposite.
          silentFail('[BankCardsManager] handleDelete error')(e);
          toast(getTxt('deleteFailed'), 'error');
        }
      },
      getTxt('deleteBtn'),
      getTxt('cancel')
    );
  };

  const toggleReveal = (id: string) => {
    setRevealedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const activeCard = cards.find(c => c.id === activeCardId) || null;

  // ════════════════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-full pb-32" dir={isRTL ? 'rtl' : 'ltr'}>
      <style>{CARD_CSS}</style>

      <CardsHeader cardCount={cards.length} onAdd={openAddModal} />

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
          <EmptyCardsState onAdd={openAddModal} />
        ) : (
          <>
            <CardDeck
              cards={cards}
              activeCardId={activeCardId}
              revealedCards={revealedCards}
              onSelect={setActiveCardId}
            />

            {activeCard && (
              <CardDetailPanel
                card={activeCard}
                isRevealed={!!revealedCards[activeCard.id]}
                onToggleReveal={toggleReveal}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            )}
          </>
        )}
      </div>

      <SecurityFooter />

      {/* ════════════════════════════════════════════════════════════
           ADD / EDIT CARD MODAL
      ════════════════════════════════════════════════════════════ */}
      <AddCardModal
        open={showModal}
        editingCard={editingCard}
        onClose={() => setShowModal(false)}
        onSaved={(savedCardId, wasNew) => {
          // A newly added card becomes the active one; an edit leaves the
          // selection where the user had it. A save is a financial
          // confirmation — it answers with the confirm pulse.
          touch.confirm();
          if (wasNew) setActiveCardId(savedCardId);
          loadCards();
        }}
      />
    </div>
  );
}
