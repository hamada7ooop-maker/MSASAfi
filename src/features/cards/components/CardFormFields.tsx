import React from 'react';
import { getCardNetwork } from './VirtualCard';
import { sanitizeNameInput } from '../../../core/utils';
import type { BankCountry, BankProvider } from '../../../services/openBanking';

export interface CardFormFieldsProps {
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv: string;
  countryId: string;
  bankId: string;

  onCardNumberChange: (v: string) => void;
  onExpiryChange: (v: string) => void;
  onCvvChange: (v: string) => void;
  onHolderChange: (v: string) => void;
  onCountryChange: (v: string) => void;
  onBankChange: (v: string) => void;

  /** Flips the preview so the user sees the side they are typing into. */
  onFocusCvv: (focused: boolean) => void;

  /** BIN auto-detection state, driven by the parent's lookup. */
  detectionStatus: 'idle' | 'detecting' | 'success' | 'failed';
  /** True when editing, which relaxes the CVV requirement. */
  isEditing: boolean;

  // The real domain types, not a structural approximation: a hand-written
  // shape with an index signature does not accept an interface, and loosening
  // it further would silently allow the wrong list to be passed.
  countriesList: BankCountry[];
  currentProviders: BankProvider[];
  getCountryName: (id: string) => string;
  getTxt: (key: string) => string;
  /** Active UI language; bank names carry an Arabic variant. */
  language: string;
}

/**
 * The card entry fields: country, bank, number, holder, expiry and CVV.
 *
 * Extracted from AddCardModal.tsx (632 lines) as part of L-1. Presentation and
 * input formatting only -- every validation rule stays in the parent's
 * `handleSave`, so there is exactly one place that decides whether a card is
 * acceptable. Splitting that decision across two files is how a UI starts
 * accepting data the persistence layer rejects.
 */
export function CardFormFields({
  cardNumber, cardHolder, expiry, cvv, countryId, bankId,
  onCardNumberChange, onExpiryChange, onCvvChange, onHolderChange,
  onCountryChange, onBankChange, onFocusCvv,
  detectionStatus, isEditing,
  countriesList, currentProviders, getCountryName, getTxt, language,
}: CardFormFieldsProps) {
  return (
    <>
  {/* Country */}
  <div>
    <label style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 6 }} className="text-slate-400">
      {getTxt('selectCountry')}
    </label>
    <select
      value={countryId}
      onChange={e => onCountryChange(e.target.value)}
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
      onChange={e => onBankChange(e.target.value)}
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
      onChange={e => onCardNumberChange(e.target.value)}
      onCompositionEnd={e => onCardNumberChange(e.currentTarget.value)}
      onFocus={() => onFocusCvv(false)}
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
      onChange={e => onHolderChange(sanitizeNameInput(e.target.value).toUpperCase())}
      onCompositionEnd={e => onHolderChange(sanitizeNameInput(e.currentTarget.value).toUpperCase())}
      onBlur={e => onHolderChange(sanitizeNameInput(e.target.value).toUpperCase())}
      onFocus={() => onFocusCvv(false)}
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
        onChange={e => onExpiryChange(e.target.value)}
        onCompositionEnd={e => onExpiryChange(e.currentTarget.value)}
        onFocus={() => onFocusCvv(false)}
        placeholder="MM/YY"
        style={{ width: '100%', padding: '13px 16px', borderRadius: 16, fontSize: 15, fontWeight: 800, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
        className="bg-slate-50 dark:bg-[#25282c] border border-black/[0.04] dark:border-white/[0.06] dark:text-white focus:ring-2 focus:ring-blue-500/20"
      />
    </div>
    <div>
      <label style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 6 }} className="text-slate-400">
        {getTxt('cvv')} {isEditing && <span style={{ fontWeight: 600, opacity: 0.6 }}>(اختياري)</span>}
      </label>
      <input
        type="password" inputMode="numeric"
        dir="ltr"
        value={cvv}
        onChange={e => onCvvChange(e.target.value)}
        onCompositionEnd={e => onCvvChange(e.currentTarget.value)}
        onFocus={() => onFocusCvv(true)}
        onBlur={() => onFocusCvv(false)}
        placeholder="•••"
        style={{ width: '100%', padding: '13px 16px', borderRadius: 16, fontSize: 18, fontWeight: 900, letterSpacing: '0.2em', outline: 'none', boxSizing: 'border-box' }}
        className="bg-slate-50 dark:bg-[#25282c] border border-black/[0.04] dark:border-white/[0.06] dark:text-white focus:ring-2 focus:ring-blue-500/20"
      />
    </div>
  </div>

  {/* Style Picker */}
    </>
  );
}
