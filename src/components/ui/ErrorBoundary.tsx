import { Component, ErrorInfo } from 'react';
import { recordException } from '../../core/crashlytics';

interface Props {
  children: React.ReactNode;
  variant?: 'full' | 'inline';
  featureName?: string;
}
interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    recordException(error.message, error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const isInline = this.props.variant === 'inline';

    if (isInline) {
      return (
        <div className="p-6 my-4 rounded-3xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 text-center space-y-4 animate-in fade-in duration-300">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl text-red-500">error</span>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white">
              {this.props.featureName ? `تعذر تحميل ${this.props.featureName}` : 'حدث خطأ في هذه الميزة'}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 font-medium">
              حدث خطأ غير متوقع، لكن باقي أجزاء التطبيق تعمل بشكل طبيعي.
            </p>
            {import.meta.env?.DEV && this.state.error?.message && (
              <p className="text-[10px] text-red-400 font-mono bg-red-100/50 dark:bg-red-900/30 px-3 py-1.5 rounded-lg mt-2 inline-block max-w-sm break-all">
                {this.state.error.message}
              </p>
            )}
          </div>
          <div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xs shadow-md shadow-red-500/20 active:scale-95 transition-all"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#f8f9fa] dark:bg-[#121214] text-center gap-6">
        <div className="w-24 h-24 rounded-[2rem] bg-red-50 dark:bg-red-900/20 flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined text-5xl text-red-500">error</span>
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">حدث خطأ غير متوقع</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Something went wrong. Please try again.</p>
          {import.meta.env?.DEV && this.state.error?.message && (
            <p className="text-xs text-red-400 font-mono bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl mt-3 max-w-xs mx-auto break-all">
              {this.state.error.message}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-3 rounded-2xl bg-[#002b59] text-white font-black text-sm shadow-lg shadow-blue-900/20 active:scale-95 transition-transform"
          >
            إعادة المحاولة / Retry
          </button>
          <button
            onClick={() => window.location.hash = '/home'}
            className="px-6 py-3 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white font-black text-sm active:scale-95 transition-transform"
          >
            الرئيسية / Home
          </button>
        </div>
      </div>
    );
  }
}
