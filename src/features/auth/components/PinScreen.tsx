import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../../i18n/index';
import { useAppStore } from '../../../store/appStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { hashPin, generateSalt } from '../../../core/security';
import { timingSafeEqual } from '../../../core/security/crypto';
import { db as DB } from '@/core/db/core';
import { BiometricService } from '../../../core/services/BiometricService';
import { toast } from '../../../toast';
import { logger } from '../../../core/logger';
import { silentFail } from '../../../core/utils';

/**
 * Re-derives the AES-GCM master key after a successful unlock.
 *
 * Auto-lock and app-backgrounding wipe the key from memory via
 * clearEncryptionKey(). Without this step the DB middleware cannot decrypt
 * existing records, and — worse — _encryptRecord would write new records in
 * plaintext because it bails out when no key is loaded.
 */
async function restoreEncryptionKey(pin: string, salt: string): Promise<void> {
  try {
    const { deriveMasterKey, setEncryptionKey } = await import('@core/security/crypto');
    setEncryptionKey(await deriveMasterKey(pin, salt));
  } catch (e) {
    logger.error('PinScreen', 'Failed to restore encryption key after unlock', e);
    throw e;
  }
}

export function PinScreen() {
  const { t } = useI18n();
  const setLocked = useAppStore((s) => s.setLocked);
  const useBiometric = useSettingsStore((s) => s.useBiometric);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [cooldownText, setCooldownText] = useState('');
  // Holds the in-flight read of the persisted lockout. Key presses await it
  // rather than being dropped, so a tap made during startup still counts but
  // can never slip in ahead of a cooldown that is still being loaded.
  const lockoutReadyRef = useRef<Promise<{ attempts: number; lockedUntil: number }> | null>(null);

  const MAX_ATTEMPTS = 5;

  // ── Persisted brute-force cooldown ──────────────────────────────────────
  // These used to live in useState alone, so force-quitting the app reset the
  // counter and the cooldown — an attacker could retry 5 guesses indefinitely
  // just by relaunching. Persisting them makes the lockout survive restarts.
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;

    const read = (async () => {
      try {
        const [savedAttempts, savedUntil] = await Promise.all([
          DB.getSetting('pinAttempts'),
          DB.getSetting('pinLockedUntil'),
        ]);
        const restored = {
          attempts: Number(savedAttempts) || 0,
          lockedUntil: Number(savedUntil) || 0,
        };
        if (alive) {
          setAttempts(restored.attempts);
          setLockedUntil(restored.lockedUntil);
        }
        return restored;
      } catch (e) {
        // A read failure must not hand out a free unlock, but it also must not
        // brick the keypad. Fall back to "no recorded lockout".
        silentFail('[PinScreen] Failed to read lockout state')(e);
        return { attempts: 0, lockedUntil: 0 };
      }
    })();

    lockoutReadyRef.current = read;

    return () => {
      alive = false;
    };
  }, []);

  const persistLockout = async (nextAttempts: number, nextLockedUntil: number) => {
    try {
      await Promise.all([
        DB.setSetting('pinAttempts', nextAttempts),
        DB.setSetting('pinLockedUntil', nextLockedUntil),
      ]);
    } catch (e) {
      silentFail('[PinScreen] Failed to persist lockout state')(e);
    }
  };

  // Countdown timer for lockout
  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const timer = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setCooldownText('');
        clearInterval(timer);
      } else {
        setCooldownText(`${remaining}s`);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  useEffect(() => {
    let isMounted = true;
    async function checkAndTriggerBio() {
      let isBio = useBiometric;
      if (!isBio) {
        const dbBio = await DB.getSetting('useBiometric');
        if (dbBio === true || dbBio === 'true') {
          isBio = true;
          useSettingsStore.getState().setUseBiometric(true);
        }
      }
      if (isBio && isMounted) {
        handleBiometric();
      }
    }
    checkAndTriggerBio();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useBiometric]);

  const handleBiometric = async () => {
    try {
      const available = await BiometricService.isAvailable();
      if (available) {
        const success = await BiometricService.authenticate();
        if (success) {
          setAttempts(0);
          setLocked(false);
        }
      }
    } catch {
      // Biometric cancelled or failed
    }
  };

  const handleNumber = async (num: string) => {
    // Wait for the persisted cooldown before honouring any key press, so a
    // restart cannot buy a guess in the gap before the read resolves.
    const persisted = await (lockoutReadyRef.current ?? Promise.resolve(null));
    const effectiveLockedUntil = Math.max(lockedUntil, persisted?.lockedUntil ?? 0);
    if (effectiveLockedUntil > Date.now()) {
      return;
    }
    if (pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      const pinHash = (await DB.getSetting('pinHash')) as string | undefined;
      const pinSalt = (await DB.getSetting('pinSalt')) as string | undefined;
      const legacyPin = (await DB.getSetting('pin')) as string | undefined;
      
      if (!pinSalt || !pinHash) {
        if (legacyPin && timingSafeEqual(newPin, legacyPin)) {
          // Migrate the legacy plaintext PIN to a salted PBKDF2 hash on the
          // fly, then derive the encryption key from the new salt.
          const salt = generateSalt();
          const migrated = await hashPin(newPin, salt);
          await DB.setSetting('pinSalt', salt);
          await DB.setSetting('pinHash', migrated);
          await DB.setSetting('pin', null);
          await restoreEncryptionKey(newPin, salt);
          setAttempts(0);
          setLockedUntil(0);
          await persistLockout(0, 0);
          setLocked(false);
          return;
        }
        // ── FAIL CLOSED ───────────────────────────────────────────────────
        // Previously this called setLocked(false), meaning ANY 4 digits
        // unlocked the app whenever pinHash/pinSalt were missing or had been
        // tampered with (e.g. cleared directly from IndexedDB).
        // ──────────────────────────────────────────────────────────────────
        setError(true);
        setPin('');
        toast(t('settings.pinError') || 'Wrong PIN', 'error');
        return;
      }

      const hashed = await hashPin(newPin, pinSalt);
      if (timingSafeEqual(hashed, pinHash)) {
        // ── CRITICAL ──────────────────────────────────────────────────────
        // Auto-lock / backgrounding calls clearEncryptionKey(), wiping the
        // AES-GCM key from memory. Unlocking MUST re-derive it, otherwise
        // every encrypted record silently fails to decrypt and any
        // subsequent write is persisted in PLAINTEXT.
        // ──────────────────────────────────────────────────────────────────
        await restoreEncryptionKey(newPin, pinSalt);
        setAttempts(0);
        setLockedUntil(0);
        await persistLockout(0, 0);
        setLocked(false);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setError(true);
        setPin('');

        if (newAttempts >= MAX_ATTEMPTS) {
          // Progressive cooldown: 30s, 60s, 120s...
          const cooldownMs = 30000 * Math.pow(2, Math.floor((newAttempts - MAX_ATTEMPTS) / MAX_ATTEMPTS));
          const lockTime = Date.now() + cooldownMs;
          setLockedUntil(lockTime);
          await persistLockout(newAttempts, lockTime);
          toast(t('settings.pinLocked') || `Too many attempts. Wait ${cooldownMs / 1000}s`, 'error');
        } else {
          await persistLockout(newAttempts, lockedUntil);
          toast(t('settings.pinError') || 'Wrong PIN', 'error');
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  return (
    <div 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="pinscreen-title"
      className="fixed inset-0 z-[100000] bg-white dark:bg-[#121214] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500"
    >
      <div className="mb-12 text-center">
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/10">
          <span className="material-symbols-outlined text-4xl text-blue-600 dark:text-blue-400" aria-hidden="true">lock</span>
        </div>
        <h2 id="pinscreen-title" className="text-2xl font-black text-[#002b59] dark:text-blue-100">{t('settings.appLock')}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
          {cooldownText
            ? <span className="text-red-500 font-bold">🔒 {cooldownText}</span>
            : (t('settings.pinHintEnter') || 'Enter your 4-digit PIN')}
        </p>
      </div>

      {/* Dots */}
      <div className="flex gap-6 mb-12" role="status" aria-label={t('auth.pin.progress', { entered: pin.length, total: 4 }) || `أدخلت ${pin.length} من 4 أرقام`}>
        {[1, 2, 3, 4].map(i => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-full transition-all duration-300 ${
              pin.length >= i 
                ? 'bg-blue-600 scale-125' 
                : error ? 'bg-red-500 animate-shake' : 'bg-slate-200 dark:bg-slate-800'
            }`}
          ></div>
        ))}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]" role="group" aria-label={t('settings.pinPad') || 'PIN Keypad'}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
          <button 
            key={n}
            onClick={() => handleNumber(n)}
            aria-label={n}
            className="w-20 h-20 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-2xl font-black text-[#002b59] dark:text-blue-100 active:scale-90 active:bg-blue-600 active:text-white transition-all flex items-center justify-center"
          >
            {n}
          </button>
        ))}
        <button 
          onClick={handleBiometric}
          aria-label={t('auth.biometric') || 'Biometric Authentication'}
          disabled={!useBiometric}
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 active:scale-90 transition-all disabled:opacity-0"
        >
          {useBiometric && <span className="material-symbols-outlined text-3xl" aria-hidden="true">fingerprint</span>}
        </button>
        <button 
          onClick={() => handleNumber('0')}
          aria-label="0"
          className="w-20 h-20 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-2xl font-black text-[#002b59] dark:text-blue-100 active:scale-90 active:bg-blue-600 active:text-white transition-all flex items-center justify-center"
        >
          0
        </button>
        <button 
          onClick={handleDelete}
          aria-label={t('action.delete') || 'Delete digit'}
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-slate-400 active:scale-90 transition-all"
        >
          <span className="material-symbols-outlined text-3xl" aria-hidden="true">backspace</span>
        </button>
      </div>
    </div>
  );
}
