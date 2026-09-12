import React, { useEffect } from 'react';
import { useI18n } from '../../../i18n';

interface VoiceTransactionDrawerProps {
  isOpen: boolean;
  isListening: boolean;
  transcript: string;
  onClose: () => void;
  onConfirmAndProcess: () => void;
}

export function VoiceTransactionDrawer({
  isOpen,
  isListening,
  transcript,
  onClose,
  onConfirmAndProcess,
}: VoiceTransactionDrawerProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-drawer-title"
    >
      <div className="bg-white dark:bg-[#1c1f23] w-full rounded-t-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[80vh] overflow-y-auto">
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
        
        <div className="text-center space-y-6 pb-6">
          <h3 id="voice-drawer-title" className="text-xl font-black text-[#002b59] dark:text-blue-100">
            {t('voice.inputTitle')}
          </h3>
          
          <p className="text-xs text-slate-500 font-bold max-w-xs mx-auto leading-relaxed">
            {t('voice.inputDesc')}
          </p>

          {/* Animated Sound Wave / Mic Sphere */}
          <div className="flex items-center justify-center gap-2 py-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-indigo-500 text-white animate-pulse scale-110 shadow-lg shadow-indigo-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
              <span className="material-symbols-outlined text-3xl">{isListening ? 'mic' : 'mic_off'}</span>
            </div>
          </div>
          
          {/* Real-time Transcript Bubble */}
          <div className="min-h-16 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 flex items-center justify-center">
            <p className="text-sm font-black text-[#002b59] dark:text-blue-100 italic leading-relaxed">
              {transcript || t('voice.listening')}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              aria-label={t('common.cancel')}
              className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-xs active:scale-95 transition-all cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button 
              type="button"
              onClick={onConfirmAndProcess}
              className="flex-2 py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs shadow-lg shadow-indigo-600/20 active:scale-95 transition-all px-8 cursor-pointer"
            >
              {t('voice.confirmAndProcess')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
