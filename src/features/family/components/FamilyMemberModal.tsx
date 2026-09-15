import React from 'react';
import { useI18n } from '../../../i18n/index';

interface FamilyMemberModalProps {
  mode: 'add' | 'edit';
  name: string;
  relation: string;
  onNameChange: (value: string) => void;
  onRelationChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

const RELATIONS = ['wife', 'husband', 'son', 'daughter', 'father', 'mother', 'friend', 'other'] as const;

export function FamilyMemberModal({ mode, name, relation, onNameChange, onRelationChange, onSave, onClose }: FamilyMemberModalProps) {
  const { t } = useI18n();
  const title = mode === 'add' ? t('family.memberFormTitle') : t('family.editMember');

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-white dark:bg-[#1e2124] rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8">
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6 sm:hidden" />
        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 text-center">{title}</h3>
        <div className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            onCompositionEnd={e => onNameChange((e.target as HTMLInputElement).value)}
            onBlur={e => onNameChange(e.target.value)}
            dir="auto"
            autoComplete="off"
            placeholder={t('family.namePh')}
            className="w-full bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-sm font-bold dark:text-white transition-all"
          />
          <select
            value={relation}
            onChange={e => onRelationChange(e.target.value)}
            className="w-full bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-sm font-bold dark:text-white transition-all appearance-none"
          >
            <option value="">{t('family.relation')}</option>
            {RELATIONS.map(value => <option key={value} value={value}>{t(`family.rel.${value}`)}</option>)}
          </select>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-sm active:scale-95 transition-all">
              {t('action.cancel')}
            </button>
            <button type="button" onClick={onSave} className={`flex-1 py-3.5 rounded-2xl ${mode === 'add' ? 'bg-[#002b59] shadow-blue-900/20' : 'bg-amber-600 shadow-amber-600/30'} text-white font-black text-sm shadow-lg active:scale-95 transition-all`}>
              {t('action.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
