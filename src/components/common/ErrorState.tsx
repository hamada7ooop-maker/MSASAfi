import React from 'react';
import { useI18n } from '../../i18n/index';

interface ErrorStateProps {
  /** Retry handler — omit when a retry is not possible. */
  onRetry?: () => void;
  /** Override message; defaults to the localized `common.loadFailed`. */
  message?: string;
  /** Compact variant for embedding inside a widget rather than a full page. */
  compact?: boolean;
}

/**
 * Directive 16: shared "failed to load" state.
 *
 * Every list screen already had two visual states — skeleton (loading) and
 * an illustrated empty state — but a failed query rendered the empty one,
 * telling a user with 400 transactions "no transactions yet". This component
 * is the third state: what the user sees when the data is neither loading
 * nor empty, but *broken*, with a way to try again.
 */
export function ErrorState({ onRetry, message, compact = false }: ErrorStateProps) {
  const { t } = useI18n();

  return (
    <div
      role="alert"
      data-testid="error-state"
      className={`flex flex-col items-center justify-center gap-3 text-center px-6 ${
        compact ? 'py-8' : 'py-16'
      }`}
    >
      <span
        className="material-symbols-outlined text-5xl text-rose-500"
        aria-hidden="true"
      >
        cloud_off
      </span>
      <p className={`font-bold text-slate-600 dark:text-slate-300 ${compact ? 'text-xs' : 'text-sm'}`}>
        {message || t('common.loadFailed') || 'فشل تحميل البيانات'}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            refresh
          </span>
          {t('common.retry') || 'إعادة المحاولة'}
        </button>
      )}
    </div>
  );
}
