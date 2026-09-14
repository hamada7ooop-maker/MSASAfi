import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import type { Challenge } from '../../../types';
import { parseNum, sanitizeIntegerInput } from '../../../core/utils';

/**
 * Add / edit sheet for a custom challenge.
 *
 * Extracted from Challenges.tsx (692 lines) as part of L-1. It was already a
 * self-contained component defined inside that file, so this is a relocation:
 * its props, state and markup are unchanged.
 */
export function ChallengeModal({
  challenge, onSave, onClose
}: {
  challenge?: Partial<Challenge>;
  onSave: (data: Partial<Challenge>) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<Partial<Challenge>>(challenge ?? {
    name: '', duration: 7, progress: 0, reward: '🏆', icon: '💰'
  });
  const [durationStr, setDurationStr] = useState(challenge?.duration ? String(challenge.duration) : '7');
  const [progressStr, setProgressStr] = useState(challenge?.progress !== undefined ? String(challenge.progress) : '0');

  const set = <K extends keyof Challenge>(k: K, v: Challenge[K]) => setForm(f => ({ ...f, [k]: v }));

  const emojis = ['🏆', '🚀', '✅', '🛠️', '😉', '💪', '💎', '🌿', '🎉', '✨', '🚶', '💰', '🍔', '📊'];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-300">
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2" />
        <h3 className="text-xl font-black dark:text-white flex items-center justify-between">
          {challenge?.id ? t('challenge.edit') || 'تعديل التحدي' : t('challenge.new') || 'تحدي جديد'}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5 block">{t('challenge.namePh') || 'اسم التحدي'}</label>
            <input 
              dir="auto"
              autoComplete="off"
              value={form.name || ''} 
              onChange={e => set('name', e.target.value)}
              onCompositionEnd={e => set('name', (e.target as HTMLInputElement).value)}
              onBlur={e => set('name', e.target.value)}
              placeholder={t('challenge.namePh') || 'أدخل اسم التحدي هنا...'}
              className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white transition-all" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5 block">{t('challenge.daysLabel') || 'المدة (أيام)'}</label>
              <input 
                type="text" 
                inputMode="numeric" 
                dir="ltr"
                autoComplete="off"
                value={durationStr} 
                onChange={e => {
                  const sanitized = sanitizeIntegerInput(e.target.value);
                  setDurationStr(sanitized);
                  set('duration', Math.max(1, Math.round(parseNum(sanitized))) || 7);
                }}
                onCompositionEnd={e => {
                  const val = sanitizeIntegerInput((e.target as HTMLInputElement).value);
                  setDurationStr(val);
                  set('duration', Math.max(1, Math.round(parseNum(val))) || 7);
                }}
                onBlur={e => {
                  const sanitized = sanitizeIntegerInput(e.target.value);
                  setDurationStr(sanitized);
                  set('duration', Math.max(1, Math.round(parseNum(sanitized))) || 7);
                }}
                className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white" 
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5 block">{t('misc.progress') || 'التقدم'} (%)</label>
              <input 
                type="text" 
                inputMode="numeric" 
                dir="ltr"
                autoComplete="off"
                value={progressStr} 
                onChange={e => {
                  const sanitized = sanitizeIntegerInput(e.target.value);
                  setProgressStr(sanitized);
                  set('progress', Math.min(100, Math.max(0, Math.round(parseNum(sanitized)))) || 0);
                }}
                onCompositionEnd={e => {
                  const val = sanitizeIntegerInput((e.target as HTMLInputElement).value);
                  setProgressStr(val);
                  set('progress', Math.min(100, Math.max(0, Math.round(parseNum(val)))) || 0);
                }}
                onBlur={e => {
                  const sanitized = sanitizeIntegerInput(e.target.value);
                  setProgressStr(sanitized);
                  set('progress', Math.min(100, Math.max(0, Math.round(parseNum(sanitized)))) || 0);
                }}
                className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white" 
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">{t('category.icon') || 'أيقونة التحدي'}</label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {emojis.map(emoji => (
                <button 
                  key={emoji}
                  onClick={() => set('icon', emoji)}
                  className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-xl transition-all ${
                    form.icon === emoji 
                      ? 'bg-amber-100 dark:bg-amber-900/30 shadow-sm border-2 border-amber-400 scale-110' 
                      : 'bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent hover:scale-105'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm active:scale-95 transition-transform">
            {t('action.cancel') || 'إلغاء'}
          </button>
          <button onClick={() => { if (form.name) { onSave(form); onClose(); } }}
            className="flex-1 py-4 rounded-2xl bg-[#002b59] text-white font-black text-sm shadow-lg shadow-blue-900/20 active:scale-95 transition-transform">
            {t('action.save') || 'حفظ التحدي'}
          </button>
        </div>
      </div>
    </div>
  );
}
