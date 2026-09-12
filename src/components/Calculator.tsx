import React, { useState } from 'react';
import { useI18n } from '../i18n/index';
import { evaluateExpression } from '../core/utils/mathParser';

interface CalculatorProps {
  initialValue: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

export function Calculator({ initialValue, onConfirm, onClose }: CalculatorProps) {
  const { t } = useI18n();
  const [display, setDisplay] = useState(initialValue || '0');

  const append = (val: string) => {
    if (display === '0' && val !== '.') {
      setDisplay(val);
    } else {
      setDisplay(display + val);
    }
  };

  const clear = () => {
    setDisplay('0');
  };

  const calculate = () => {
    try {
      const result = evaluateExpression(display);
      // Format result to be user-friendly, remove trailing zeros if float
      const formattedResult = Number.isInteger(result) ? result : parseFloat(result.toFixed(4));
      setDisplay(formattedResult.toString());
    } catch (e) {
      setDisplay('Error');
    }
  };


  const buttons = [
    '7', '8', '9', '÷',
    '4', '5', '6', '×',
    '1', '2', '3', '-',
    '0', '.', '=', '+'
  ];

  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md flex items-end justify-center animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white dark:bg-[#1c1f23] w-full max-w-md rounded-t-[3rem] p-8 shadow-2xl space-y-6" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2" />
        
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('txn.amount')}</p>
          <p className="text-4xl font-black text-[#002b59] dark:text-blue-100 tabular-nums overflow-hidden">{display}</p>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <button onClick={clear} className="col-span-2 py-5 rounded-[1.5rem] bg-rose-50 dark:bg-rose-900/10 text-rose-500 font-black text-lg">C</button>
          <button onClick={() => setDisplay(display.slice(0, -1) || '0')} className="py-5 rounded-[1.5rem] bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-lg">⌫</button>
          <button onClick={() => append('÷')} className="py-5 rounded-[1.5rem] bg-blue-50 dark:bg-blue-900/10 text-blue-600 font-black text-xl">÷</button>
          
          {buttons.map(btn => (
            <button 
              key={btn}
              onClick={() => {
                if (btn === '=') calculate();
                else if (['+', '-', '×', '÷'].includes(btn)) append(btn);
                else append(btn);
              }}
              className={`py-5 rounded-[1.5rem] font-black text-xl transition-all active:scale-95 ${
                btn === '=' 
                ? 'bg-[#002b59] text-white shadow-lg shadow-blue-900/20' 
                : ['+', '-', '×', '÷'].includes(btn)
                ? 'bg-blue-50 dark:bg-blue-900/10 text-blue-600'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {btn}
            </button>
          ))}
        </div>

        <div className="flex gap-4 pt-2">
          <button onClick={onClose} className="flex-1 py-5 rounded-[1.5rem] bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">{t('common.cancel')}</button>
          <button onClick={() => onConfirm(display)} className="flex-1 py-5 rounded-[1.5rem] bg-emerald-500 text-white font-black shadow-lg shadow-emerald-500/20">
            {t('common.confirm') || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
