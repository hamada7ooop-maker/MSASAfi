import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { toast } from '../../../toast';
import { db as DB } from '@/core/db/core';
import { timingSafeEqual } from '@/core/security/crypto';
import { useSettingsStore } from '../../../store/settingsStore';
import { useAppStore } from '../../../store/appStore';

export interface DevUnlockModalProps {
  /** The parent decides when to show this; it counts the version taps. */
  open: boolean;
  onClose: () => void;
  /** Reloads the parent's settings after everything is unlocked, so the cards
   *  re-render against the new store state. */
  onUnlocked: () => void;
}

/**
 * Developer master-unlock sheet.
 *
 * ── SECURITY: read before changing anything here ──────────────────────────
 * Every branch is guarded by `import.meta.env.DEV`, which Vite statically
 * replaces with `false` in a production build. The dead code — and, critically,
 * the VITE_MASTER_HASH / VITE_MASTER_SALT literals that would otherwise be
 * inlined into the client bundle — is then removed by tree-shaking. The
 * backdoor is therefore ABSENT from shipped APKs rather than merely disabled
 * in them.
 *
 * Extracting this into its own module does not weaken that: the component
 * returns null unless `import.meta.env.DEV` is true, the handler returns early
 * on the same condition, and the call site in Settings.tsx keeps its own guard.
 * All three must stay.
 *
 * Never relax this. If support staff ever need this capability in production,
 * it must be a server-issued, time-limited, single-use token — not a secret
 * compiled into the client.
 * ──────────────────────────────────────────────────────────────────────────
 */
export function DevUnlockModal({ open, onClose, onUnlocked }: DevUnlockModalProps) {
  const { t } = useI18n();
  const [masterPass, setMasterPass] = useState('');

  const unlockEverything = async () => {
    const ALL_PERKS = ['perk:ai-pro', 'perk:icon-pack', 'perk:widget-unlock'];
    const ALL_THEMES = [
      'palette:soft', 'palette:cool', 'palette:sepia', 'palette:rose', 'palette:lavender', 'palette:sage',
      'palette:black', 'palette:midnight', 'palette:oled', 'palette:royal-gold', 'palette:aurora', 'palette:crimson', 'palette:forest', 'palette:vantablack'
    ];
    const ALL_MILESTONES = [
      'first_txn', 'first_acc', 'first_goal', 'first_debt', 'first_bill',
      'first_budget', 'first_chall', 'first_inv', 'first_recur', 'first_rep',
      'first_ai', 'first_theme', 'first_cat', 'first_backup', 'first_sync', 'first_mem'
    ];

    const store = useSettingsStore.getState();
    const appStore = useAppStore.getState();

    const points = 99999;
    await DB.setSetting('userPoints', points);
    appStore.setUserPoints(points);

    const allUnlocked = [...ALL_PERKS, ...ALL_THEMES];
    await DB.setSetting('unlockedRewards', allUnlocked);
    store.setUnlockedItems(allUnlocked);

    await DB.setSetting('completedMilestones', ALL_MILESTONES);
    store.setCompletedMilestones(ALL_MILESTONES);

    const tenYears = 10 * 365 * 24 * 60 * 60 * 1000;
    const expiry = Date.now() + tenYears;
    await DB.setSetting('aiPremiumUntil', expiry);
    store.setAiPremiumUntil(expiry);

    onUnlocked();
  };

  const handleMasterPass = async () => {
    if (!import.meta.env.DEV) return;

    const targetHash = import.meta.env.VITE_MASTER_HASH as string | undefined;
    const salt = import.meta.env.VITE_MASTER_SALT as string | undefined;

    if (!targetHash || !salt || !masterPass.trim()) {
      toast(t('common.error'), 'error');
      onClose();
      setMasterPass('');
      return;
    }

    try {
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(masterPass),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: enc.encode(salt), iterations: 600000, hash: 'SHA-256' },
        keyMaterial,
        256
      );
      const inputHash = Array.from(new Uint8Array(bits))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Constant-time: `===` on strings short-circuits at the first differing
      // byte, which leaks how much of the secret was guessed correctly.
      if (timingSafeEqual(inputHash, targetHash)) {
        await DB.recordAction('DEV_UNLOCK', 'Developer master unlock used');
        await unlockEverything();
        onClose();
        setMasterPass('');
        toast('Master mode activated — all development features are now active', 'success');
      } else {
        await DB.recordAction('DEV_UNLOCK_FAILED', 'Developer master unlock attempt failed');
        toast(t('common.error'), 'error');
        setMasterPass('');
      }
    } catch {
      toast(t('common.error'), 'error');
      setMasterPass('');
    }
  };

  // Belt-and-braces: the caller already guards, but a component that can never
  // mount in production is one fewer way for this to leak.
  if (!import.meta.env.DEV || !open) return null;

  return (
      <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-white dark:bg-[#1c1f23] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-3xl">terminal</span>
          </div>
          <h3 className="text-xl font-black text-center text-on-surface dark:text-white mb-1.5">
            Developer Mode
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center font-bold mb-5 leading-relaxed">
            Dev builds only. Enter the master passcode to unlock developer and test tools.
          </p>
          <input
            autoFocus
            type="password"
            value={masterPass}
            onChange={(e) => setMasterPass(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleMasterPass()}
            placeholder="Master passcode..."
            className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl px-5 py-4 text-center text-sm font-bold border-none outline-none focus:ring-2 ring-blue-500/30 mb-5 dark:text-white"
          />
          <div className="flex gap-3">
            <button
              onClick={() => onClose()}
              className="flex-1 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-xs active:scale-95 transition-all"
            >
              {t('action.cancel')}
            </button>
            <button
              onClick={handleMasterPass}
              className="flex-[2] py-3.5 rounded-2xl bg-blue-600 text-white font-black text-xs shadow-lg shadow-blue-600/25 active:scale-95 transition-all"
            >
              {t('action.confirm')}
            </button>
          </div>
        </div>
      </div>
  );
}
