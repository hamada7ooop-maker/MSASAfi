import React, { Component, ErrorInfo, ReactNode } from 'react';
import { recordException } from '../../core/crashlytics';

export interface WidgetErrorBoundaryProps {
  children: ReactNode;
  widgetName?: string;
  fallback?: ReactNode;
}

export interface WidgetErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * WidgetErrorBoundary - Catches runtime exceptions in isolated dashboard widgets
 * preventing full-page crashes and preserving app stability.
 */
export class WidgetErrorBoundary extends Component<WidgetErrorBoundaryProps, WidgetErrorBoundaryState> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    recordException(`[WidgetErrorBoundary] ${this.props.widgetName || 'Widget'}: ${error.message}`, error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div 
          className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-black/5 dark:border-white/5 text-center space-y-2.5 animate-in fade-in duration-300"
          role="alert"
          aria-live="polite"
        >
          <div className="w-9 h-9 mx-auto rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">warning</span>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {this.props.widgetName ? `تعذر تحميل ${this.props.widgetName}` : 'تعذر تحميل هذا العنصر'}
            </p>
            <p className="text-[10px] text-slate-400">
              يمكنك محاولة إعادة التحميل دون التأثير على باقي التطبيق
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] active:scale-95 transition-all"
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
