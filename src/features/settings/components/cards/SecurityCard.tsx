import React, { useState, useEffect } from 'react';
import { useI18n } from '../../../../i18n/index';
import { hashPin, generateSalt } from '../../../../core/security';
import { useNavigate } from 'react-router-dom';
import { db as DB } from '@/core/db/core';
import { BiometricService } from '../../../../core/services/BiometricService';
import { toast } from '../../../../toast';
import { bridge } from '../../../../core/AppBridge';
import { useAppStore } from '../../../../store/appStore';
import { useSettingsStore } from '../../../../store/settingsStore';
import { logger } from '../../../../core/logger';
import { silentFail } from '../../../../core/utils';

interface SecurityCardProps {
  settings: Record<string, unknown>;
  updateSetting: (key: string, value: unknown) => void;
  refreshSettings: () => void;
}

// ─── Toggle ────────────────────────────────────────────────────────────────
function Toggle({
  value,
  onChange,
  trackOn = 'bg-blue-600',
  disabled = false,
  isLTR,
}: {
  value: boolean;
  onChange: () => void;
  trackOn?: string;
  disabled?: boolean;
  isLTR?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={value}
      className={`w-11 h-6 rounded-full flex items-center p-1 transition-all duration-300 active:scale-95
        ${value ? trackOn : 'bg-slate-200 dark:bg-slate-700'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <div
        className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300
          ${value ? (isLTR ? 'translate-x-5' : '-translate-x-5') : 'translate-x-0'}`}
      />
    </button>
  );
}

// ─── Row ───────────────────────────────────────────────────────────────────
function Row({
  icon,
  iconColor,
  label,
  sublabel,
  children,
}: {
  icon: string;
  iconColor: string;
  label: string;
  sublabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 gap-3 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-all duration-150 active:scale-[0.99]">
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${iconColor}`}>
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {icon}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-on-surface dark:text-white leading-tight truncate">{label}</p>
          {sublabel && <p className="text-[10px] text-slate-400 font-medium mt-0.5">{sublabel}</p>}
        </div>
      </div>
      {children && <div className="shrink-0 ms-2">{children}</div>}
    </div>
  );
}

export function SecurityCard({ settings, updateSetting, refreshSettings }: SecurityCardProps) {
  const { t, isLTR } = useI18n();
  const navigate = useNavigate();
  const [newPin, setNewPin] = useState('');

  /**
   * True when a restore has landed on a device with no vault of its own.
   *
   * Until a PIN is set, the restored records sit in plaintext: the encryption
   * middleware is a no-op with no key loaded. The user has no way to know that
   * from the UI, so the banner below says it plainly rather than leaving them
   * to assume the lock carried over from their old device.
   */
  const [pendingRestorePin, setPendingRestorePin] = useState(false);

  const hasPinSet = !!(settings.pinHash || settings.pin);
  const autoLockEnabled = Boolean(settings.autoLock ?? true);
  const dbEncryption = Boolean(settings.dbEncryption ?? true);
  const incognito = Boolean(settings.incognito || false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { isPinSetupPending } = await import('@core/security/vaultRecovery');
      const pending = await isPinSetupPending();
      if (!cancelled) setPendingRestorePin(pending);
    })().catch(silentFail('[SecurityCard] pending PIN check failed'));
    return () => {
      cancelled = true;
    };
  }, [hasPinSet]);

  const handleSavePin = async () => {
    if (newPin && newPin.length === 4) {
      // ── DATA-LOSS FIX ─────────────────────────────────────────────────────
      // This function used to mint a fresh salt, store the new hash, and stop.
      // Because the data key was PBKDF2(pin, pinSalt), a new salt produced a
      // different key and nothing re-encrypted the existing rows: every
      // encrypted record across twelve tables became permanently unreadable
      // the moment the user changed their PIN.
      //
      // With envelope encryption the records are encrypted under a persistent
      // Master Data Key that the PIN only wraps. A PIN change re-wraps that
      // key and touches no records at all. The re-wrap is attempted BEFORE the
      // new hash is written, so a failure leaves the old PIN — and therefore
      // access to the data — fully intact.
      // ──────────────────────────────────────────────────────────────────────
      const salt = generateSalt();
      const hashed = await hashPin(newPin, salt);

      const oldSalt = (await DB.getSetting<string>('pinSalt')) ?? null;
      const hadPin = Boolean((await DB.getSetting<string>('pinHash')) || (await DB.getSetting<string>('pin')));

      try {
        const { initializeVaultKey, rewrapVaultKey } = await import('@core/security/vaultKey');
        const { isPinSetupPending, completePostRestorePinSetup } = await import(
          '@core/security/vaultRecovery'
        );

        if (await isPinSetupPending()) {
          // A backup was restored onto a device with no vault of its own, so
          // the restored records are still in plaintext — the backup's key
          // envelope is deliberately never imported. Create this device's own
          // envelope from the PIN just chosen and encrypt everything under it.
          const n = await completePostRestorePinSetup(newPin, salt);
          logger.info('SecurityCard', `Post-restore setup encrypted ${n} record(s)`);
        } else if (hadPin && oldSalt) {
          // Changing an existing PIN. The session is already unlocked, so the
          // master data key is in memory: re-wrap that exact key under the new
          // PIN. Nothing is re-encrypted and the old PIN is never needed.
          await rewrapVaultKey(newPin, salt);
        } else {
          // First time a PIN is set. There is no prior ciphertext, so a fresh
          // random master data key is correct.
          await initializeVaultKey(newPin, salt, /* adoptExistingKey */ false);
        }
      } catch (e) {
        logger.error('SecurityCard', 'Failed to re-wrap the vault key; PIN change aborted', e);
        toast(t('settings.pinChangeFailed') || 'تعذّر تغيير الرمز. لم يتم تغيير أي شيء وبياناتك سليمة.', 'error');
        return;
      }

      await DB.setSetting('pinHash', hashed);
      await DB.setSetting('pinSalt', salt);
      await DB.setSetting('pin', null);
      useAppStore.getState().setHasPin(true);
      setNewPin('');
      const isBioAvailable = await BiometricService.isAvailable();
      if (isBioAvailable) {
        bridge.confirmSheet(
          t('settings.bioSuggest') || 'هل ترغب في تفعيل المصادقة الحيوية (البصمة/الوجه) لحماية أفضل ودخول أسرع؟',
          async () => {
            await DB.setSetting('useBiometric', true);
            await updateSetting('useBiometric', true);
            useSettingsStore.getState().setUseBiometric(true);
            refreshSettings();
          },
          t('action.apply') || 'تطبيق',
          t('action.cancel') || 'إلغاء'
        );
      } else {
        refreshSettings();
      }
    }
  };

  const handleRemovePin = async () => {
    // Removing the PIN turns off encryption: clear the "vault is encrypted"
    // flag so subsequent plaintext writes are allowed again.
    const { setEncryptionRequired, clearEncryptionKey } = await import('@core/security/crypto');
    const { clearVaultKey } = await import('@core/security/vaultKey');
    setEncryptionRequired(false);
    clearEncryptionKey();
    // Drop the wrapped master data key too. Leaving it behind would strand a
    // wrapper keyed to a PIN that no longer exists, and a later PIN would
    // create a second, conflicting envelope.
    await clearVaultKey();
    await DB.setSetting('pinHash', null);
    await DB.setSetting('pinSalt', null);
    await DB.setSetting('pin', null);
    await DB.setSetting('useBiometric', false);
    await updateSetting('useBiometric', false);
    useSettingsStore.getState().setUseBiometric(false);
    useAppStore.getState().setHasPin(false);
    if (dbEncryption) updateSetting('dbEncryption', false);
    refreshSettings();
  };

  return (
    <div className="space-y-1 animate-in slide-in-from-bottom-4 duration-500">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 px-1 mb-2">
        {t('settings.sectionAccount') || 'الأمان والخصوصية'}
      </p>

      <div className="bg-white/40 dark:bg-white/[0.02] backdrop-blur-md rounded-[1.75rem] overflow-hidden border border-white/20 dark:border-white/[0.05] shadow-[0_8px_32px_0_rgba(31,38,135,0.03)] divide-y divide-slate-100/70 dark:divide-white/[0.04]">

        {/* Post-restore warning. Shown only while data is genuinely exposed. */}
        {pendingRestorePin && !hasPinSet && (
          <div className="px-4 py-3.5 bg-amber-50 dark:bg-amber-500/10">
            <div className="flex items-start gap-3">
              <span
                className="material-symbols-outlined text-[20px] text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                warning
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-amber-900 dark:text-amber-200 leading-tight">
                  {t('security.postRestorePinTitle') || 'Set a new PIN for this device'}
                </p>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-200/70 font-medium mt-1 leading-relaxed">
                  {t('security.postRestorePinBody') ||
                    'Your data was restored but is not yet encrypted on this device.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* App Lock */}
        <div className="flex items-center justify-between px-4 py-3.5 gap-3 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-all duration-150 active:scale-[0.99]">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-sm ${hasPinSet ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25' : 'bg-gradient-to-br from-slate-500/10 to-zinc-500/10 text-slate-400'}`}>
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-on-surface dark:text-white leading-tight truncate">{t('settings.appLock')}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-none truncate">{t('settings.appLockPin')}</p>
            </div>
          </div>
          <div className="shrink-0 ms-2">
            {hasPinSet ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => useAppStore.getState().setLocked(true)}
                  className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1.5 rounded-xl active:scale-95 transition-all"
                  title={t('settings.lockNow') || 'قفل الآن'}
                >
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  {t('settings.lockNow') || 'قفل الآن'}
                </button>
                <button aria-label={t('action.unlock') || 'Unlock'}
                  type="button"
                  onClick={handleRemovePin}
                  className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1.5 rounded-xl active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">lock_open</span>
                  {t('settings.disableLock')}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-[4.5rem] h-9 bg-slate-100 dark:bg-black/20 px-2 rounded-xl border border-slate-200/50 dark:border-white/[0.05] text-center text-base tracking-[0.2em] font-black outline-none focus:ring-2 focus:ring-blue-500/30 dark:text-white transition-all"
                  placeholder="••••"
                />
                <button
                  onClick={handleSavePin}
                  disabled={newPin.length !== 4}
                  className="w-9 h-9 shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title={t('settings.savePin') || 'حفظ'}
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">save</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Biometric */}
        <Row
          icon="fingerprint"
          iconColor={hasPinSet && settings.useBiometric ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/25' : 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-indigo-500'}
          label={t('settings.biometric') || 'البصمة والوجه'}
          sublabel={t('settings.biometricSub') || 'الدخول السريع بالبصمة'}
        >
          <Toggle
            value={hasPinSet && Boolean(settings.useBiometric)}
            onChange={() => {
              if (!hasPinSet) {
                toast(t('settings.pinRequiredForBio') || 'يرجى تعيين PIN أولاً', 'error');
                return;
              }
              const nextVal = !settings.useBiometric;
              updateSetting('useBiometric', nextVal);
            }}
            trackOn="bg-indigo-600"
            disabled={!hasPinSet}
            isLTR={isLTR}
          />
        </Row>

        {/* Auto Lock */}
        <Row
          icon="timer"
          iconColor="bg-gradient-to-br from-slate-500/10 to-zinc-500/10 text-slate-500"
          label={t('settings.autoLock')}
        >
          <Toggle
            value={autoLockEnabled}
            onChange={() => {
              const nextVal = !autoLockEnabled;
              useAppStore.getState().setAutoLock(nextVal);
              updateSetting('autoLock', nextVal);
            }}
            isLTR={isLTR}
          />
        </Row>

        {/* DB Encryption */}
        {hasPinSet && (
          <div className="px-4 py-3.5 space-y-2.5 hover:bg-black/[0.005] dark:hover:bg-white/[0.005] transition-all">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${dbEncryption ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25' : 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>encrypted</span>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-on-surface dark:text-white leading-tight">{t('settings.dbEncryption')}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{t('settings.dbEncryptionSub')}</p>
                </div>
              </div>
              <Toggle
                value={dbEncryption}
                onChange={() => updateSetting('dbEncryption', !dbEncryption)}
                trackOn="bg-emerald-500"
                isLTR={isLTR}
              />
            </div>
            <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/20 rounded-2xl px-3.5 py-3 flex gap-2.5 items-start">
              <span className="material-symbols-outlined text-amber-500 text-[18px] mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed font-medium">{t('settings.dbEncryptionWarning')}</p>
            </div>
          </div>
        )}

        {/* Incognito */}
        <Row
          icon="visibility_off"
          iconColor={incognito ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/25' : 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400'}
          label={t('settings.incognito')}
          sublabel={t('settings.incognitoSub') || 'إخفاء الأرصدة والبيانات الحساسة'}
        >
          <Toggle
            value={incognito}
            onChange={() => updateSetting('incognito', !incognito)}
            trackOn="bg-purple-600"
            isLTR={isLTR}
          />
        </Row>

        {/* Audit Log */}
        <button
          onClick={() => navigate('/audit')}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] active:scale-[0.99] transition-all group text-start"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-500/10 to-zinc-500/10 text-slate-500 flex items-center justify-center shrink-0 group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white transition-all shadow-sm">
              <span className="material-symbols-outlined text-[20px]">history</span>
            </div>
            <div>
              <p className="text-[13px] font-bold text-on-surface dark:text-white leading-tight truncate">{t('settings.auditLog') || 'سجل المراقبة'}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{t('audit.last50') || 'عرض آخر 50 عملية نظام'}</p>
            </div>
          </div>
          <span className={`material-symbols-outlined text-slate-300 dark:text-slate-600 text-[18px] transition-transform ${isLTR ? 'group-hover:translate-x-0.5' : 'group-hover:-translate-x-0.5'}`}>
            {isLTR ? 'chevron_right' : 'chevron_left'}
          </span>
        </button>
      </div>
    </div>
  );
}
