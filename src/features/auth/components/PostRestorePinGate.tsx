import { useEffect, useState, useCallback } from 'react';
import { useI18n } from '../../../i18n/index';
import { hashPin, generateSalt } from '../../../core/security';
import { db as DB } from '@/core/db/core';
import { toast } from '../../../toast';
import { useAppStore } from '../../../store/appStore';
import { silentFail } from '../../../core/utils';
import { logger } from '../../../core/logger';

/**
 * Launch-time enforcement of the post-restore PIN.
 *
 * ## Why this exists on top of the Settings banner
 *
 * `performRestore` refuses to import the backup's vault secrets, which is
 * correct — an envelope from another device cannot be opened by this device's
 * PIN. The consequence is that a restore onto a fresh device produces a vault
 * with no key at all, and the Dexie encryption middleware is a no-op without
 * one:
 *
 *     if (!isEncryptionKeyReady()) return obj;   // core/db/encryption.ts
 *
 * So every restored financial record sits in IndexedDB as plaintext. The user
 * has no way to perceive this: their old device had a PIN, so they reasonably
 * assume the lock came across with the data.
 *
 * `SecurityCard` already shows a warning, but that only helps a user who
 * happens to open Settings. Someone who restores and goes straight to using
 * the app would never see it, and their data would stay exposed indefinitely.
 * This gate closes that window by asking at launch instead of waiting to be
 * visited.
 *
 * ## Why it is blocking, and why that is safe
 *
 * It is a modal the user cannot dismiss, because "remind me later" here means
 * "leave my financial history readable to anything that can open the
 * database". There is no honest deferral.
 *
 * The escape hatch is deliberate and destructive-free: `resetVault` is NOT
 * offered here. At this point the data is plaintext and perfectly readable —
 * the user is not locked out of anything, so there is nothing to escape. The
 * only action is to protect it.
 */
export function PostRestorePinGate() {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Checked once at mount. The flag lives in IndexedDB precisely because the
  // restore path reloads the page, so it is guaranteed to be readable here.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { isPinSetupPending } = await import('@core/security/vaultRecovery');
      const isPending = await isPinSetupPending();
      if (!cancelled) setPending(isPending);
    })().catch(silentFail('[PostRestorePinGate] pending check failed'));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = useCallback(async () => {
    if (pin.length !== 4 || busy) return;

    if (pin !== confirmPin) {
      // Confirmed twice on purpose: a typo here is unrecoverable. The PIN is
      // the only material that unwraps the key, so a mistyped PIN that the
      // user cannot reproduce means the data they just restored is gone.
      setError(t('security.pinMismatch') || 'The two PINs do not match');
      setConfirmPin('');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const { completePostRestorePinSetup } = await import('@core/security/vaultRecovery');
      const salt = generateSalt();
      const hashed = await hashPin(pin, salt);

      // Encrypt first, persist the PIN second. If encryption fails the user
      // keeps no PIN and is prompted again on next launch, rather than ending
      // up with a lock over data that was never encrypted.
      const count = await completePostRestorePinSetup(pin, salt);

      await DB.setSetting('pinSalt', salt);
      await DB.setSetting('pinHash', hashed);
      await DB.setSetting('pin', null); // never leave a legacy plaintext PIN

      useAppStore.getState().setHasPin(true);
      logger.info('PostRestorePinGate', `Protected ${count} restored record(s)`);
      toast(t('security.resetVaultDone') || 'Your data is now encrypted', 'success');
      setPending(false);
    } catch (e) {
      silentFail('[PostRestorePinGate] setup failed')(e);
      setError(t('security.resetVaultFailed') || 'Setup failed. Please try again.');
      setPin('');
      setConfirmPin('');
    } finally {
      setBusy(false);
    }
  }, [pin, confirmPin, busy, t]);

  if (!pending) return null;

  const stage = pin.length === 4 ? 'confirm' : 'enter';
  const value = stage === 'confirm' ? confirmPin : pin;
  const setValue = stage === 'confirm' ? setConfirmPin : setPin;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-restore-title"
      className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 flex flex-col items-center justify-center px-6"
    >
      <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center mb-6">
        <span
          className="material-symbols-outlined text-[32px] text-amber-600 dark:text-amber-400"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          encrypted
        </span>
      </div>

      <h1
        id="post-restore-title"
        className="text-xl font-black text-[#002b59] dark:text-blue-50 text-center"
      >
        {t('security.postRestorePinTitle') || 'Set a new PIN for this device'}
      </h1>

      <p className="mt-3 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400 text-center max-w-sm">
        {t('security.postRestorePinBody') ||
          'Your data was restored but is not yet encrypted on this device. Set a PIN now to encrypt it with a key that belongs to this device.'}
      </p>

      <p className="mt-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {stage === 'confirm'
          ? t('security.confirmPin') || 'Confirm your PIN'
          : t('security.enterNewPin') || 'Enter a new PIN'}
      </p>

      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        autoFocus
        disabled={busy}
        value={value}
        onChange={(e) => {
          setError(null);
          setValue(e.target.value.replace(/\D/g, ''));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleSubmit();
        }}
        aria-label={
          stage === 'confirm'
            ? t('security.confirmPin') || 'Confirm your PIN'
            : t('security.enterNewPin') || 'Enter a new PIN'
        }
        className="mt-3 w-44 h-14 text-center text-2xl tracking-[0.5em] font-black bg-slate-100 dark:bg-black/30 rounded-2xl border border-slate-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-blue-500/40 dark:text-white disabled:opacity-50"
        placeholder="••••"
      />

      {error && (
        <p role="alert" className="mt-3 text-[12px] font-bold text-rose-500">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={busy || pin.length !== 4 || confirmPin.length !== 4}
        className="mt-6 w-44 h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {busy
          ? t('common.loading') || '...'
          : t('security.encryptNow') || t('settings.savePin') || 'Encrypt my data'}
      </button>
    </div>
  );
}
