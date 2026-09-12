import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/index';
import { CardRepository } from '../../../core/db/repositories/cards';
import { OpenBankingService } from '../../../services/openBanking';
import { toast, confirmSheet } from '../../../toast';
import type { BankCard } from '../../../types';
import { checkMilestone } from '../../../core/loyalty';
import { silentFail, normalizeArabicDigits, sanitizeNameInput } from '../../../core/utils';

import {
  LOCAL_TEXTS,
  COUNTRY_NAMES,
  CARD_STYLES,
  LOCAL_BINS,
  BLANK_FORM,
} from '../data/cardConstants';
import { VirtualCard, NetworkBadge, getCardNetwork, CARD_CSS } from './VirtualCard';

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

  // Form state
  const [formState, setFormState] = useState(BLANK_FORM);
  const { cardNumber, cardHolder, expiry, cvv, countryId, bankId, styleName } = formState;

  // 3D flip for preview in modal
  const [isFlipped, setIsFlipped] = useState(false);

  // Auto-detect states
  const [, setDetecting] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<'idle' | 'detecting' | 'success' | 'failed'>('idle');
  const lastQueriedBin = useRef<string>('');

  const obService = useRef(new OpenBankingService());
  const countriesList = obService.current.countries;

  // ── Auto-Detect Helpers ──────────────────────────────────────────────────
  const mapCountryCode = (code: string): string => {
    const c = code?.toLowerCase();
    if (c === 'sa') return 'saudi';
    if (c === 'ae') return 'uae';
    if (c === 'kw') return 'kuwait';
    if (c === 'bh') return 'bahrain';
    if (c === 'qa') return 'qatar';
    if (c === 'om') return 'oman';
    if (c === 'eg') return 'egypt';
    if (c === 'jo') return 'jordan';
    if (c === 'ma') return 'morocco';
    if (c === 'tr') return 'turkey';
    if (c === 'gb') return 'uk';
    if (c === 'us') return 'usa';
    if (c === 'ca') return 'canada';
    if (c === 'de') return 'germany';
    if (c === 'fr') return 'france';
    if (c === 'in') return 'india';
    if (c === 'sg') return 'singapore';
    return 'saudi';
  };

  const mapBankName = (bankName: string, countryId: string): string => {
    const nameLower = bankName?.toLowerCase() || '';
    const providers = obService.current.getProvidersByCountry(countryId);
    const found = providers.find(p => 
      nameLower.includes(p.id.toLowerCase()) || 
      nameLower.includes(p.name.toLowerCase()) || 
      p.name.toLowerCase().includes(nameLower)
    );
    return found ? found.id : (providers.length > 0 ? providers[0].id : '');
  };

  const mapBankToStyle = (bankId: string): string => {
    if (['rajhi', 'anb', 'bsfr', 'enbd', 'fab', 'cib', 'chase', 'boa'].includes(bankId)) return 'sapphire';
    if (['snb', 'riyad', 'aljazira', 'bisb', 'housing_bank', 'nbe', 'bnp', 'lloyds'].includes(bankId)) return 'emerald';
    if (['alinma', 'dukhan'].includes(bankId)) return 'gold';
    if (['sab', 'adcb', 'rakbank', 'gulfbank', 'bbk', 'muscat', 'bm', 'hsbc_uk', 'akbank', 'santander'].includes(bankId)) return 'crimson';
    if (['monzo', 'itau', 'icici', 'ing'].includes(bankId)) return 'glass';
    return 'slate';
  };

  const detectCardDetails = async (rawNumber: string) => {
    const cleaned = rawNumber.replace(/\D/g, '');
    if (cleaned.length < 6) {
      setDetectionStatus('idle');
      return;
    }

    const bin = cleaned.substring(0, 6);
    if (bin === lastQueriedBin.current) return;
    lastQueriedBin.current = bin;

    // 1. Local BIN Match
    const localMatch = LOCAL_BINS[bin];
    if (localMatch) {
      setDetectionStatus('success');
      setFormState(prev => ({
        ...prev,
        countryId: localMatch.countryId,
        bankId: localMatch.bankId,
        styleName: localMatch.styleName
      }));
      return;
    }

    // 2. Fetch from Binlist API
    setDetecting(true);
    setDetectionStatus('detecting');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(`https://lookup.binlist.net/${bin}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('BIN lookup failed');
      }

      const data = await response.json();
      const apiCountryCode = data.country?.alpha2 || '';
      const apiBankName = data.bank?.name || '';

      const mappedCountry = mapCountryCode(apiCountryCode);
      const mappedBank = mapBankName(apiBankName, mappedCountry);
      const mappedStyle = mapBankToStyle(mappedBank);

      setDetectionStatus('success');
      setFormState(prev => ({
        ...prev,
        countryId: mappedCountry,
        bankId: mappedBank,
        styleName: mappedStyle
      }));
    } catch (err) {
      silentFail('Auto-detect card details failed')(err);
      setDetectionStatus('failed');
    } finally {
      setDetecting(false);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────
  const getTxt = (key: string): string => {
    const dict = LOCAL_TEXTS[language] || LOCAL_TEXTS['en'];
    return dict[key] || LOCAL_TEXTS['en'][key] || key;
  };

  const getCountryName = (cId: string): string =>
    COUNTRY_NAMES[cId]?.[language] || COUNTRY_NAMES[cId]?.['en'] || cId;

  const currentProviders = obService.current.getProvidersByCountry(countryId);
  const activeStyle = CARD_STYLES.find(s => s.id === styleName) || CARD_STYLES[0];

  // ── Data loading ─────────────────────────────────────────────────────────
  const loadCards = async () => {
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
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadCards(); }, []);

  useEffect(() => {
    const providers = obService.current.getProvidersByCountry(countryId);
    setFormState(prev => ({ ...prev, bankId: providers.length > 0 ? providers[0].id : '' }));
  }, [countryId]);

  useEffect(() => {
    if (!showModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showModal]);

  // ── Input formatters ─────────────────────────────────────────────────────
  const handleCardNumberChange = (val: string) => {
    const normalized = normalizeArabicDigits(val);
    const cleaned = normalized.replace(/\D/g, '').substring(0, 16);
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    setFormState(prev => ({ ...prev, cardNumber: formatted }));
    detectCardDetails(cleaned);
  };

  const handleExpiryChange = (val: string) => {
    const normalized = normalizeArabicDigits(val);
    const cleaned = normalized.replace(/\D/g, '').substring(0, 4);
    if (cleaned.length >= 2) {
      const month = cleaned.substring(0, 2);
      const year = cleaned.substring(2, 4);
      const mVal = parseInt(month, 10);
      const corrected = mVal > 12 ? '12' : mVal === 0 && month.length === 2 ? '01' : month;
      setFormState(prev => ({ ...prev, expiry: `${corrected}/${year}` }));
    } else {
      setFormState(prev => ({ ...prev, expiry: cleaned }));
    }
  };

  const handleCvvChange = (val: string) => {
    const normalized = normalizeArabicDigits(val);
    setFormState(prev => ({ ...prev, cvv: normalized.replace(/\D/g, '').substring(0, 3) }));
  };

  // ── Open Add Modal ────────────────────────────────────────────────────────
  const openAddModal = () => {
    setEditingCard(null);
    setFormState(BLANK_FORM);
    setIsFlipped(false);
    setDetectionStatus('idle');
    lastQueriedBin.current = '';
    setShowModal(true);
  };

  // ── Open Edit Modal ───────────────────────────────────────────────────────
  const openEditModal = (card: BankCard) => {
    setEditingCard(card);
    setFormState({
      cardNumber: card.number.replace(/(\d{4})(?=\d)/g, '$1 '),
      cardHolder: card.holder,
      expiry: card.expiry,
      cvv: '',          // CVV not stored in plain form for security
      countryId: card.countryId,
      bankId: card.bankId,
      styleName: card.style.gradientName || 'slate',
    });
    setIsFlipped(false);
    setDetectionStatus('idle');
    lastQueriedBin.current = card.number.substring(0, 6);
    setShowModal(true);
  };

  // ── Save / Update Card ───────────────────────────────────────────────────
  const handleSave = async () => {
    const cleanNumber = cardNumber.replace(/\s/g, '');

    if (cleanNumber.length !== 16) return toast(getTxt('invalidCardNumber'), 'error');
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return toast(getTxt('invalidExpiry'), 'error');

    // CVV required only for new cards
    if (!editingCard && cvv.length !== 3) return toast(getTxt('invalidCvv'), 'error');

    const country = countriesList.find(c => c.id === countryId);
    const providers = obService.current.providers;
    const provider = providers.find(p => p.id === bankId);

    const bankName = provider
      ? (language === 'ar' ? (provider.nameAr || provider.name) : provider.name)
      : getTxt('bankDefault');
    const bankColor = provider?.color || '#002b59';
    const bankLogo = provider?.logo || 'B';
    const styleObj = CARD_STYLES.find(s => s.id === styleName) || CARD_STYLES[0];

    const cardData = {
      number: cleanNumber,
      numberMasked: `•••• •••• •••• ${cleanNumber.substring(12)}`,
      holder: cardHolder.trim().toUpperCase() || 'HOLDER NAME',
      expiry,
      bankId,
      bankName,
      bankColor,
      bankLogo,
      countryId,
      countryName: country ? getCountryName(countryId) : countryId,
      countryFlag: country?.flag || '🌐',
      style: {
        bgType: styleName === 'glass' ? 'glass' : 'gradient',
        gradientName: styleName,
        glowColor: styleObj.glowColor,
        textColor: 'text-white',
      },
      ...(cvv.length === 3 ? { cvv } : {}),
    };

    try {
      if (editingCard) {
        await CardRepository.update(editingCard.id, cardData);
        toast(getTxt('successUpdate'), 'success');
      } else {
        const added = await CardRepository.add(cardData as Omit<BankCard, 'id'>);
        await checkMilestone('first_card');
        setActiveCardId(added.id);
        toast(getTxt('successAdd'), 'success');
      }
      setShowModal(false);
      loadCards();
    } catch (e) {
      silentFail('[BankCardsManager] handleSave error')(e);
      toast(getTxt('fillAll'), 'error');
    }
  };

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
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'flex', alignItems: 'flex-end',
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(8px)',
          }}
          className="animate-in fade-in duration-300"
          onClick={() => setShowModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bank-card-modal-title"
            style={{
              width: '100%', maxWidth: 640,
              margin: '0 auto',
              borderRadius: '28px 28px 0 0',
              maxHeight: '95vh', overflowY: 'auto',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none',
            }}
            className="bg-white dark:bg-[#1a1d21] animate-in slide-in-from-bottom-6 duration-400 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14 }}>
              <div style={{ width: 44, height: 5, borderRadius: 3 }} className="bg-slate-200 dark:bg-slate-700" />
            </div>

            <div style={{ padding: '16px 24px 32px' }}>
              {/* Modal title */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <h3 id="bank-card-modal-title" style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.01em' }} className="text-on-surface dark:text-white">
                  {editingCard ? getTxt('editCard') : getTxt('addCard')}
                </h3>
                {editingCard && (
                  <p style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }} className="text-slate-400">
                    {editingCard.bankName} ••••{editingCard.number.slice(-4)}
                  </p>
                )}
              </div>

              {/* 3D Card Preview */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <div style={{ width: '100%', maxWidth: 360, cursor: 'pointer' }}
                  onClick={() => setIsFlipped(f => !f)}>
                  <VirtualCard
                    cardNumber={cardNumber}
                    cardHolder={cardHolder}
                    expiry={expiry}
                    cvv={cvv}
                    bankName={currentProviders.find(p => p.id === bankId)
                      ? (language === 'ar' ? (currentProviders.find(p => p.id === bankId)?.nameAr || currentProviders.find(p => p.id === bankId)?.name || '') : (currentProviders.find(p => p.id === bankId)?.name || ''))
                      : getTxt('bankDefault')}
                    bankLogo={currentProviders.find(p => p.id === bankId)?.logo || 'B'}
                    countryName={getCountryName(countryId)}
                    countryFlag={countriesList.find(c => c.id === countryId)?.flag || '🌐'}
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

              {/* Form fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Country */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 6 }} className="text-slate-400">
                    {getTxt('selectCountry')}
                  </label>
                  <select
                    value={countryId}
                    onChange={e => setFormState(prev => ({ ...prev, countryId: e.target.value }))}
                    style={{ width: '100%', padding: '13px 16px', borderRadius: 16, fontSize: 13, fontWeight: 700, outline: 'none' }}
                    className="bg-slate-50 dark:bg-[#25282c] border border-black/[0.04] dark:border-white/[0.06] dark:text-white focus:ring-2 focus:ring-blue-500/20"
                  >
                    {countriesList.map(country => (
                      <option key={country.id} value={country.id}>
                        {country.flag} {getCountryName(country.id)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bank */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 6 }} className="text-slate-400">
                    {getTxt('selectBank')}
                  </label>
                  <select
                    value={bankId}
                    onChange={e => setFormState(prev => ({ ...prev, bankId: e.target.value }))}
                    disabled={currentProviders.length === 0}
                    style={{ width: '100%', padding: '13px 16px', borderRadius: 16, fontSize: 13, fontWeight: 700, outline: 'none' }}
                    className="bg-slate-50 dark:bg-[#25282c] border border-black/[0.04] dark:border-white/[0.06] dark:text-white focus:ring-2 focus:ring-blue-500/20"
                  >
                    {currentProviders.map(p => (
                      <option key={p.id} value={p.id}>
                        {language === 'ar' ? (p.nameAr || p.name) : p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Card Number */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 6 }} className="text-slate-400">
                    {getTxt('cardNumber')}
                  </label>
                  <input
                    type="text" inputMode="numeric"
                    dir="ltr"
                    value={cardNumber}
                    onChange={e => handleCardNumberChange(e.target.value)}
                    onCompositionEnd={e => handleCardNumberChange(e.currentTarget.value)}
                    onFocus={() => setIsFlipped(false)}
                    placeholder="0000 0000 0000 0000"
                    style={{ width: '100%', padding: '13px 16px', borderRadius: 16, fontSize: 15, fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.12em', outline: 'none', boxSizing: 'border-box' }}
                    className="bg-slate-50 dark:bg-[#25282c] border border-black/[0.04] dark:border-white/[0.06] dark:text-white focus:ring-2 focus:ring-blue-500/20"
                  />

                  {/* Auto-detect feedback */}
                  {detectionStatus === 'detecting' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 6,
                      padding: '8px 12px',
                      borderRadius: 12,
                      background: 'rgba(59,130,246,0.06)',
                      border: '1px solid rgba(59,130,246,0.1)',
                    }} className="animate-pulse">
                      <div style={{
                        width: 14, height: 14,
                        border: '2px solid rgba(59,130,246,0.2)',
                        borderTopColor: '#3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 0.6s linear infinite'
                      }} />
                      <span style={{ fontSize: 11, fontWeight: 700 }} className="text-blue-600 dark:text-blue-400">
                        {getTxt('autoDetecting')}
                      </span>
                    </div>
                  )}

                  {detectionStatus === 'success' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 6,
                      padding: '8px 14px',
                      borderRadius: 14,
                      background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(4,120,87,0.05) 100%)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(16,185,129,0.2)',
                      boxShadow: '0 4px 12px rgba(16,185,129,0.05)',
                    }} className="animate-in fade-in slide-in-from-top-1 duration-300">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400" style={{ fontSize: 16 }}>
                          verified_user
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 800 }} className="text-emerald-700 dark:text-emerald-400">
                          {getTxt('autoDetected')}
                        </span>
                      </div>
                      {cardNumber.replace(/\D/g, '').length >= 6 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 9, fontWeight: 800, opacity: 0.6 }} className="text-slate-500 dark:text-slate-400">
                            {getTxt('detectedBrand')}
                          </span>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 900,
                            padding: '2px 8px',
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.4)',
                            color: '#047857',
                          }} className="dark:bg-emerald-950/40 dark:text-emerald-400 shadow-sm border border-emerald-500/10">
                            {(() => {
                              const net = getCardNetwork(cardNumber);
                              return getTxt(net === 'visa' ? 'cardTypeVisa' : net === 'mastercard' ? 'cardTypeMastercard' : net === 'mada' ? 'cardTypeMada' : 'cardChip');
                            })()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Holder */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 6 }} className="text-slate-400">
                    {getTxt('cardHolder')}
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={cardHolder}
                    onChange={e => setFormState(prev => ({ ...prev, cardHolder: sanitizeNameInput(e.target.value).toUpperCase() }))}
                    onCompositionEnd={e => setFormState(prev => ({ ...prev, cardHolder: sanitizeNameInput(e.currentTarget.value).toUpperCase() }))}
                    onBlur={e => setFormState(prev => ({ ...prev, cardHolder: sanitizeNameInput(e.target.value).toUpperCase() }))}
                    onFocus={() => setIsFlipped(false)}
                    placeholder="EX. MOHAMMED AL-RASHID"
                    style={{ width: '100%', padding: '13px 16px', borderRadius: 16, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', outline: 'none', boxSizing: 'border-box' }}
                    className="bg-slate-50 dark:bg-[#25282c] border border-black/[0.04] dark:border-white/[0.06] dark:text-white focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Expiry + CVV */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 6 }} className="text-slate-400">
                      {getTxt('expiryDate')}
                    </label>
                    <input
                      type="text" inputMode="numeric"
                      dir="ltr"
                      value={expiry}
                      onChange={e => handleExpiryChange(e.target.value)}
                      onCompositionEnd={e => handleExpiryChange(e.currentTarget.value)}
                      onFocus={() => setIsFlipped(false)}
                      placeholder="MM/YY"
                      style={{ width: '100%', padding: '13px 16px', borderRadius: 16, fontSize: 15, fontWeight: 800, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
                      className="bg-slate-50 dark:bg-[#25282c] border border-black/[0.04] dark:border-white/[0.06] dark:text-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 6 }} className="text-slate-400">
                      {getTxt('cvv')} {editingCard && <span style={{ fontWeight: 600, opacity: 0.6 }}>(اختياري)</span>}
                    </label>
                    <input
                      type="password" inputMode="numeric"
                      dir="ltr"
                      value={cvv}
                      onChange={e => handleCvvChange(e.target.value)}
                      onCompositionEnd={e => handleCvvChange(e.currentTarget.value)}
                      onFocus={() => setIsFlipped(true)}
                      onBlur={() => setIsFlipped(false)}
                      placeholder="•••"
                      style={{ width: '100%', padding: '13px 16px', borderRadius: 16, fontSize: 18, fontWeight: 900, letterSpacing: '0.2em', outline: 'none', boxSizing: 'border-box' }}
                      className="bg-slate-50 dark:bg-[#25282c] border border-black/[0.04] dark:border-white/[0.06] dark:text-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {/* Style Picker */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 8 }} className="text-slate-400">
                    {getTxt('selectStyle')}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                    {CARD_STYLES.map(style => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setFormState(prev => ({ ...prev, styleName: style.id }))}
                        style={{
                          padding: '0 8px',
                          height: 44,
                          borderRadius: 14,
                          border: `2px solid ${styleName === style.id ? '#2563eb' : 'transparent'}`,
                          cursor: 'pointer', transition: 'all 0.2s',
                          position: 'relative', overflow: 'hidden',
                          background: style.bg,
                          boxShadow: styleName === style.id ? `0 4px 16px ${style.glowColor}` : 'none',
                        }}
                      >
                        <span style={{
                          fontSize: 10, fontWeight: 900, color: 'white',
                          textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                          letterSpacing: '0.02em',
                        }}>
                          {getTxt(style.nameKey)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1, padding: '15px 0',
                    borderRadius: 18, border: 'none', cursor: 'pointer',
                    fontSize: 14, fontWeight: 800, transition: 'all 0.2s',
                  }}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  {getTxt('cancel')}
                </button>
                <button
                  onClick={handleSave}
                  style={{
                    flex: 2, padding: '15px 0',
                    borderRadius: 18, border: 'none', cursor: 'pointer',
                    fontSize: 14, fontWeight: 900, color: 'white',
                    background: 'linear-gradient(135deg, #002b59 0%, #1d4ed8 100%)',
                    boxShadow: '0 8px 24px -4px rgba(29,78,216,0.45)',
                    transition: 'all 0.2s',
                  }}
                >
                  {editingCard ? getTxt('update') : getTxt('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
