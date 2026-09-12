import React, { useState, useEffect } from 'react';
import { useI18n } from '../../../i18n/index';
import { useAppStore } from '../../../store/appStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { hashPin } from '../../../core/security';
import { db as DB } from '@/core/db/core';
import { BiometricService } from '../../../core/services/BiometricService';
import { toast } from '../../../toast';

export function PinScreen() {
  const { t } = useI18n();
  const setLocked = useAppStore((s) => s.setLocked);
  const useBiometric = useSettingsStore((s) => s.useBiometric);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [cooldownText, setCooldownText] = useState('');

  const MAX_ATTEMPTS = 5;

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
    // Check lockout
    if (lockedUntil > Date.now()) {
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
        if (legacyPin && newPin === legacyPin) {
          setAttempts(0);
          setLocked(false);
          return;
        }
        setLocked(false);
        return;
      }

      const hashed = await hashPin(newPin, pinSalt);
      if (hashed === pinHash) {
        setAttempts(0);
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
          toast(t('settings.pinLocked') || `Too many attempts. Wait ${cooldownMs / 1000}s`, 'error');
        } else {
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
