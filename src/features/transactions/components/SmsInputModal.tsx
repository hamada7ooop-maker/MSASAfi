import React, { useEffect } from 'react';
import { useI18n } from '../../../i18n';
import { useFocusTrap } from '../../../core/hooks/useFocusTrap';

interface SmsInputModalProps {
  isOpen: boolean;
  smsText: string;
  onSmsTextChange: (val: string) => void;
  onClose: () => void;
  onProcess: () => void;
}

export function SmsInputModal({
  isOpen,
  smsText,
  onSmsTextChange,
  onClose,
  onProcess,
}: SmsInputModalProps) {
  const { t } = useI18n();
  const containerRef = useFocusTrap<HTMLDivElement>(isOpen);

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
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sms-modal-title"
    >
      <div 
        ref={containerRef}
        className="bg-white dark:bg-[#1c1f23] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300"
      >
        <h3 id="sms-modal-title" className="text-xl font-black text-[#002b59] dark:text-blue-100 mb-2 text-right rtl:text-right">
          {t('txn.pasteSmsTitle') || 'Paste Bank SMS'}
        </h3>
        <p className="text-xs text-slate-500 mb-6 font-bold text-right rtl:text-right">
          {t('txn.pasteSmsDesc') || 'Copy your bank message and paste it here to auto-fill amount and details.'}
        </p>
        
        <textarea 
          autoFocus
          value={smsText}
          onChange={(e) => onSmsTextChange(e.target.value)}
          placeholder="..."
          aria-label={t('txn.pasteSmsTitle') || 'Bank SMS text'}
          className="w-full h-32 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-sm font-bold border-none outline-none focus:ring-2 ring-blue-500/30 mb-6 text-right rtl:text-right"
        />

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
            onClick={onProcess}
            className="flex-2 py-4 rounded-2xl bg-blue-600 text-white font-black text-xs shadow-lg shadow-blue-600/20 active:scale-95 transition-all px-8 cursor-pointer"
          >
            {t('common.process') || 'Process'}
          </button>
        </div>
      </div>
    </div>
  );
}
