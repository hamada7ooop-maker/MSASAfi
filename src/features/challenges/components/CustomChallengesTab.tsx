import React from 'react';
import { onActivate } from '@/core/a11yKeyboard';
import { useI18n } from '../../../i18n/index';
import type { Challenge } from '../../../types';

export interface CustomChallengesTabProps {
  /** Non-deleted challenges, already filtered by the parent. */
  activeChallenges: Challenge[];
  /** Bulk-selection state, which is shared with the page header. */
  selectedIds: Set<string>;
  isSelecting: boolean;
  onToggleSelection: (id: string) => void;
  /** Two-step delete: arm, then confirm. Null when nothing is armed. */
  confirmDeleteId: string | null;
  onRequestDelete: (id: string | null) => void;
  onDelete: (id: string) => void;
  /** Opens the parent-owned add/edit sheet for an existing challenge. */
  onEdit: (challenge: Challenge) => void;
}

/**
 * The custom-challenges list.
 *
 * Presentation only -- extracted from Challenges.tsx as part of L-1. Selection
 * state stays with the parent because the header's bulk-action bar reads it
 * too; passing it down keeps one source of truth rather than two lists that
 * can disagree about what is selected.
 */
export function CustomChallengesTab({
  activeChallenges,
  selectedIds,
  isSelecting,
  onToggleSelection,
  confirmDeleteId,
  onRequestDelete,
  onDelete,
  onEdit,
}: CustomChallengesTabProps) {
  const { t } = useI18n();

  return (
        <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
          {isSelecting && (
            <div className="mx-1 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
              <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                {t('challenge.bulkSelected', { n: String(selectedIds.size) })}
              </p>
            </div>
          )}

          {activeChallenges.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-300">
              <span className="material-symbols-outlined text-5xl">emoji_events</span>
              <p className="text-sm font-bold">{t('challenge.emptyTitle')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {activeChallenges.map(c => {
                const isSelected = selectedIds.has(c.id);
                const progressPct = Math.min(100, Math.max(0, c.progress || 0));
                const isCompleted = progressPct >= 100;

                return (
                  <div key={c.id} className="flex items-center mb-2">
                    <div onClick={() => onToggleSelection(c.id)} className={`overflow-hidden transition-all duration-300 flex items-center justify-center cursor-pointer shrink-0 ${isSelected || isSelecting ? 'w-10 opacity-100' : 'w-0 opacity-0'}`}
  role="button" tabIndex={0} onKeyDown={onActivate(() => onToggleSelection(c.id))}>
                      <span className={`material-symbols-outlined text-2xl ${isSelected ? 'text-[#002b59] dark:text-blue-400 font-bold' : 'text-slate-200 dark:text-slate-700'}`}>
                        {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                    </div>

                    <div className={`flex-1 fin-card p-5 group transition-all duration-500 overflow-hidden relative ${isSelected ? 'border-amber-500 ring-2 ring-amber-500/10' : 'hover:border-amber-500/20'} ${isCompleted ? 'bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-900/5 dark:to-slate-800' : ''}`}>
                      
                      {isCompleted && (
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-bl-full flex items-start justify-end p-4 pointer-events-none">
                          <span className="material-symbols-outlined text-amber-500 text-3xl animate-bounce">emoji_events</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          {/* Circular Progress */}
                          <div className="relative w-16 h-16 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-black/5 dark:border-white/5" style={{ background: `conic-gradient(#f59e0b ${progressPct * 3.6}deg, #f1f5f9 0deg)`}}>
                            <div className="absolute inset-1.5 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center font-black text-[10px] text-amber-600 dark:text-amber-400 tabular-nums">
                              {progressPct}%
                            </div>
                          </div>
                          <div>
                            <h3 className="font-black text-base text-slate-800 dark:text-slate-100 pr-8 group-hover:text-amber-600 transition-colors">{c.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="material-symbols-outlined text-[14px] text-slate-400">schedule</span>
                              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{c.duration} {t('challenge.daysUnit')}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 z-20">
                          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-xl mr-2 shadow-sm border border-black/5 dark:border-white/5">
                            {isCompleted ? '👑' : (c.icon || '⭐')}
                          </div>

                          <button aria-label={t('action.edit') || 'Edit'} onClick={() => onEdit(c)} className="w-9 h-9 rounded-full bg-surface-container-low dark:bg-slate-800 text-blue-500 flex items-center justify-center hover:bg-blue-500/10 transition-all active:scale-90">
                            <span className="material-symbols-outlined text-base" aria-hidden="true">edit</span>
                          </button>
                          
                          {confirmDeleteId === c.id ? (
                            <div className="flex gap-1 animate-in fade-in slide-in-from-right-2 duration-300">
                              <button aria-label={t('action.confirm') || 'Confirm'} onClick={async () => {
                                await onDelete(c.id);
                                onRequestDelete(null);
                              }} className="w-9 h-9 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all">
                                <span className="material-symbols-outlined text-base" aria-hidden="true">check</span>
                              </button>
                              <button aria-label={t('action.close') || 'Close'} onClick={() => onRequestDelete(null)} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center active:scale-90 transition-all">
                                <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
                              </button>
                            </div>
                          ) : (
                            <button aria-label={t('action.delete') || 'Delete'} onClick={() => onRequestDelete(c.id)} className="w-9 h-9 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500/20 transition-all active:scale-90">
                              <span className="material-symbols-outlined text-base" aria-hidden="true">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                      {isCompleted && (
                        <div className="mt-4 pt-4 border-t border-amber-500/10 flex items-center gap-2">
                           <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-[0.2em]">🎉 {t('challenge.completed')}</span>
                           <div className="h-1 flex-1 bg-amber-500/20 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
  );
}
