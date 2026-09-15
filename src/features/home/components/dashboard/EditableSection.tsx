import React from 'react';
import { useI18n } from '../../../../i18n/index';

/**
 * Directive 19 — Batch 1: the edit-mode section wrapper, extracted from
 * ClassicDashboard. Behavior is pinned by the dashboard characterization
 * suite: dashed cradle + label chip + move/visibility toolbar in edit mode,
 * dimmed (opacity-40 grayscale) rendering for hidden sections, plain
 * rendering otherwise.
 */
export interface EditableSectionProps {
  label: string;
  visible: boolean;
  isEditing: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisibility: () => void;
  children: React.ReactNode;
}

export function EditableSection({
  label,
  visible,
  isEditing,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  children,
}: EditableSectionProps) {
  // Hook order must be unconditional: called before any early return.
  const { t } = useI18n();

  if (!isEditing && visible) {
    return <>{children}</>;
  }
  if (!isEditing) {
    return null; // hidden sections render nothing outside edit mode
  }

  return (
    <div className="relative group transition-all p-4 border-2 border-dashed border-blue-500/30 rounded-[2.5rem] bg-blue-50/10">
      <div className="absolute -top-3 left-6 right-6 flex items-center justify-between z-20">
        <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg border border-white/20">
          {label}
        </span>
        <div className="flex gap-1.5 p-1 bg-white dark:bg-slate-700 rounded-full shadow-xl border border-black/5 dark:border-white/10">
          <button
            aria-label={t('action.moveUp') || 'Move up'}
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="w-9 h-9 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all active:scale-90"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">keyboard_arrow_up</span>
          </button>
          <button
            aria-label={t('action.moveDown') || 'Move down'}
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="w-9 h-9 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all active:scale-90"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">keyboard_arrow_down</span>
          </button>
          <div className="w-px h-6 bg-slate-100 dark:bg-slate-600 my-auto mx-0.5"></div>
          <button
            aria-label={t('action.show') || 'Show'}
            onClick={onToggleVisibility}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${visible ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">{visible ? 'visibility' : 'visibility_off'}</span>
          </button>
        </div>
      </div>
      <div className={visible ? '' : 'opacity-40 grayscale'}>{children}</div>
    </div>
  );
}

export default EditableSection;
