import React, { useState, useEffect, useRef } from 'react';
import { onActivate } from '@/core/a11yKeyboard';
import { useI18n } from '../../../i18n/index';
import { CardRepository } from '../../../core/db/repositories/cards';
import { OpenBankingService } from '../../../services/openBanking';
import { toast } from '../../../toast';
import type { BankCard } from '../../../types';
import { checkMilestone } from '../../../core/loyalty';
import { silentFail } from '../../../core/utils';
import { CARD_STYLES, BLANK_FORM } from '../data/cardConstants';
import { makeCardText } from '../cardText';
import { formatCardNumber, formatExpiry, formatCvv } from '../cardInputFormat';
import { CardVisualPreview } from './CardVisualPreview';
import { CardStylePicker } from './CardStylePicker';
import { CardFormFields } from './CardFormFields';
import { useBinDetection } from './useBinDetection';

export interface AddCardModalProps {
  /** Closed when null-ish; the parent controls visibility. */
  open: boolean;
  /** The card being edited, or null for a new card. Drives both the prefill
   *  and the add-vs-update branch on save. */
  editingCard: BankCard | null;
  onClose: () => void;
  /** Fired after a successful write so the parent can reload the deck. */
  onSaved: (savedCardId: string, wasNew: boolean) => void;
}

/**
 * Add / edit card sheet, including BIN auto-detection.
 *
 * Extracted from BankCardsManager.tsx (1,085 lines) as part of L-1. The entire
 * form lives here -- field state, the 3D preview flip, the BIN lookup and its
 * status, the validation and the write -- because none of it is read anywhere
 * else. Hoisting it into the parent was what gave that component eight pieces
 * of state and three hundred lines of markup it never needed.
 *
 * The parent keeps only what it genuinely owns: whether the sheet is open, and
 * which card (if any) is being edited.
 */
export function AddCardModal({ open, editingCard, onClose, onSaved }: AddCardModalProps) {
  const { language } = useI18n();

  const [formState, setFormState] = useState(BLANK_FORM);
  const { cardNumber, cardHolder, expiry, cvv, countryId, bankId, styleName } = formState;

  const [isFlipped, setIsFlipped] = useState(false);

  const obService = useRef(new OpenBankingService());

  const { detectionStatus, setDetectionStatus, detectCardDetails, lastQueriedBin } =
    useBinDetection({
      obService,
      applyDetected: (patch) => setFormState(prev => ({ ...prev, ...patch })),
    });
  const countriesList = obService.current.countries;

  const { getTxt, getCountryName } = makeCardText(language);

  const currentProviders = obService.current.getProvidersByCountry(countryId);
  const activeStyle = CARD_STYLES.find(s => s.id === styleName) || CARD_STYLES[0];

  /**
   * Prefill whenever the sheet opens.
   *
   * Keyed on `open` as well as the card, so reopening for a NEW card after an
   * edit resets the fields instead of inheriting the previous card's details --
   * which would silently save someone else's number.
   */
  useEffect(() => {
    if (!open) return;
    if (editingCard) {
      setFormState({
        cardNumber: editingCard.number.replace(/(\d{4})(?=\d)/g, '$1 '),
        cardHolder: editingCard.holder,
        expiry: editingCard.expiry,
        cvv: '',          // CVV not stored in plain form for security
        countryId: editingCard.countryId,
        bankId: editingCard.bankId,
        styleName: editingCard.style.gradientName || 'slate',
      });
      lastQueriedBin.current = editingCard.number.substring(0, 6);
    } else {
      setFormState(BLANK_FORM);
      lastQueriedBin.current = '';
    }
    setIsFlipped(false);
    setDetectionStatus('idle');
  }, [open, editingCard, setDetectionStatus, lastQueriedBin]);

  useEffect(() => {
    if (!open) return;
    const providers = obService.current.getProvidersByCountry(countryId);
    setFormState(prev => ({ ...prev, bankId: providers.length > 0 ? providers[0].id : '' }));
  }, [countryId, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);


  // ── Helpers ─────────────────────────────────────────────────────────────

  const handleCardNumberChange = (val: string) => {
    const { formatted, cleaned } = formatCardNumber(val);
    setFormState(prev => ({ ...prev, cardNumber: formatted }));
    detectCardDetails(cleaned);
  };

  const handleExpiryChange = (val: string) =>
    setFormState(prev => ({ ...prev, expiry: formatExpiry(val) }));

  const handleCvvChange = (val: string) =>
    setFormState(prev => ({ ...prev, cvv: formatCvv(val) }));

  // ── Open Add Modal ────────────────────────────────────────────────────────

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
        onSaved(editingCard.id, false);
      } else {
        const added = await CardRepository.add(cardData as Omit<BankCard, 'id'>);
        await checkMilestone('first_card');
        toast(getTxt('successAdd'), 'success');
        onSaved(added.id, true);
      }
      onClose();
    } catch (e) {
      // Directive 15 (silentFail audit): this catch used to show the
      // "please fill in all required fields" message for EVERY failure —
      // including a DB write error on a fully valid form. A validation
      // message on a non-validation error sends the user hunting for a
      // missing field that does not exist. Keep silentFail for telemetry,
      // but say what actually happened.
      silentFail('[BankCardsManager] handleSave error')(e);
      toast(getTxt('saveFailed'), 'error');
    }
  };


  if (!open) return null;

  return (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'flex', alignItems: 'flex-end',
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(8px)',
          }}
          className="animate-in fade-in duration-300"
          onClick={() => onClose()}
  role="button" tabIndex={0} onKeyDown={onActivate(() => onClose())}>
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
              <CardVisualPreview
                cardNumber={cardNumber}
                cardHolder={cardHolder}
                expiry={expiry}
                cvv={cvv}
                bankName={currentProviders.find(p => p.id === bankId)?.name || getTxt('bankDefault')}
                bankLogo={currentProviders.find(p => p.id === bankId)?.logo || 'B'}
                countryName={getCountryName(countryId)}
                countryFlag={countriesList.find(c => c.id === countryId)?.flag || '🌐'}
                activeStyle={activeStyle}
                isFlipped={isFlipped}
                onToggleFlip={() => setIsFlipped(f => !f)}
                getTxt={getTxt}
              />
              {/* Form fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <CardFormFields
                cardNumber={cardNumber}
                cardHolder={cardHolder}
                expiry={expiry}
                cvv={cvv}
                countryId={countryId}
                bankId={bankId}
                onCardNumberChange={handleCardNumberChange}
                onExpiryChange={handleExpiryChange}
                onCvvChange={handleCvvChange}
                onHolderChange={(v) => setFormState(prev => ({ ...prev, cardHolder: v }))}
                onCountryChange={(v) => setFormState(prev => ({ ...prev, countryId: v }))}
                onBankChange={(v) => setFormState(prev => ({ ...prev, bankId: v }))}
                onFocusCvv={setIsFlipped}
                detectionStatus={detectionStatus}
                isEditing={!!editingCard}
                countriesList={countriesList}
                currentProviders={currentProviders}
                getCountryName={getCountryName}
                getTxt={getTxt}
                language={language}
              />
                <CardStylePicker
                  styleName={styleName}
                  onSelect={(id) => setFormState(prev => ({ ...prev, styleName: id }))}
                  getTxt={getTxt}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button
                  onClick={() => onClose()}
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
  );
}
