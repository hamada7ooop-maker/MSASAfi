import React from 'react';
import { useI18n } from '@/i18n/index';

export interface InfoModalPoint {
  icon: string;
  iconColorClass: string;
  iconBgClass: string;
  title: string;
  titleColorClass: string;
  body: string;
}

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  headerIcon?: string;
  headerIconColorClass?: string;
  headerIconBgClass?: string;
  points?: InfoModalPoint[];
  confirmText?: string;
}

export function InfoModal({
  isOpen,
  onClose,
  title,
  description,
  headerIcon = 'info',
  headerIconColorClass = 'text-blue-400',
  headerIconBgClass = 'bg-blue-500/10 border-blue-500/20 shadow-blue-500/10',
  points = [],
  confirmText
}: InfoModalProps) {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" 
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
      <div 
        className="bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[32px] p-6 max-w-sm w-full shadow-2xl relative">
        <div className="absolute top-0 right-0 p-4">
          <button aria-label={t('action.close') || 'Close'} 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-sm text-slate-400" aria-hidden="true">close</span>
          </button>
        </div>
        
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-5 border shadow-inner ${headerIconBgClass}`}>
          <span className={`material-symbols-outlined text-2xl ${headerIconColorClass}`}>{headerIcon}</span>
        </div>
        
        <h3 className="text-xl font-black text-white mb-2">{title}</h3>
        <p className="text-[13px] text-slate-300 leading-relaxed mb-6 font-medium">
          {description}
        </p>
        
        {points && points.length > 0 && (
          <div className="space-y-4 mb-8">
            {points.map((point, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${point.iconBgClass}`}>
                  <span className={`material-symbols-outlined text-[14px] ${point.iconColorClass}`}>{point.icon}</span>
                </div>
                <p className="text-[12px] text-slate-400 leading-tight">
                  <strong className={`${point.titleColorClass || 'text-slate-200'} block mb-1`}>
                    {point.title}
                  </strong>
                  {point.body}
                </p>
              </div>
            ))}
          </div>
        )}

        <button 
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-[13px] transition-all active:scale-[0.98] shadow-[0_8px_16px_-6px_rgba(37,99,235,0.5)]"
        >
          {confirmText || t('action.confirm') || 'فهمت ذلك'}
        </button>
      </div>
    </div>
  );
}
