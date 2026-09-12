import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n';
import { evaluateExpression } from '../../core/utils/mathParser';
import { toast } from '../../toast';


interface ProfessionalCalculatorProps {
  onClose: () => void;
  initialValue?: string;
}

export function ProfessionalCalculator({ onClose, initialValue = '0' }: ProfessionalCalculatorProps) {
  const { t } = useI18n();
  const [display, setDisplay] = useState(initialValue === '0' ? '' : initialValue);
  const [history, setHistory] = useState<string[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [display]);

  const handleInput = (val: string) => {
    if (val === 'C') {
      setDisplay('');
      setHistory([]);
      return;
    }
    // ... rest of handleInput
    if (val === 'backspace') {
      setDisplay(display.slice(0, -1));
      return;
    }
    if (val === '()') {
      const openCount = (display.match(/\(/g) || []).length;
      const closeCount = (display.match(/\)/g) || []).length;
      if (openCount > closeCount && !'(/+-×÷'.includes(display.slice(-1))) {
        setDisplay(display + ')');
      } else {
        setDisplay(display + '(');
      }
      return;
    }
    if (val === '=') {
      try {
        const result = evaluateExpression(display);
        const formattedResult = Number.isInteger(result) ? result : result.toFixed(4).replace(/\.?0+$/, '');
        
        setHistory([`${display} = ${formattedResult}`, ...history].slice(0, 5));
        setDisplay(String(formattedResult));
      } catch (e) {
        setDisplay('Error');
        setTimeout(() => setDisplay(''), 1000);
      }
      return;
    }

    if (val === '±') {
      if (display.startsWith('-')) setDisplay(display.substring(1));
      else setDisplay('-' + display);
      return;
    }
    if (val === '%') {
      try {
        const currentNum = display.match(/(\d+\.?\d*)$/);
        if (currentNum) {
          const num = currentNum[0];
          const percent = parseFloat(num) / 100;
          setDisplay(display.slice(0, -num.length) + percent);
        }
      } catch { setDisplay('Error'); }
      return;
    }
    
    setDisplay(display + val);
  };

  const handleCopy = () => {
    if (!display) return;
    navigator.clipboard.writeText(display);
    toast(t('common.saved') || 'Copied!', 'success');
  };

  const buttons = [
    { label: 'C', type: 'action' },
    { label: 'backspace', icon: 'backspace', type: 'action' },
    { label: '()', type: 'action' },
    { label: '÷', type: 'operator' },
    { label: '7', type: 'number' },
    { label: '8', type: 'number' },
    { label: '9', type: 'number' },
    { label: '×', type: 'operator' },
    { label: '4', type: 'number' },
    { label: '5', type: 'number' },
    { label: '6', type: 'number' },
    { label: '-', type: 'operator' },
    { label: '1', type: 'number' },
    { label: '2', type: 'number' },
    { label: '3', type: 'number' },
    { label: '+', type: 'operator' },
    { label: '±', type: 'number' },
    { label: '0', type: 'number' },
    { label: '.', type: 'number' },
    { label: '=', type: 'operator' },
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="bg-[#1c1c1e] w-full max-w-[360px] rounded-[3rem] p-6 shadow-2xl border border-white/10 flex flex-col h-fit max-h-[90vh] transition-all duration-300 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-2 mb-4 shrink-0">
          <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">{t('misc.calculator')}</span>
          <div className="flex gap-2">
            <button onClick={handleCopy} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-90 transition-transform">
              <span className="material-symbols-outlined text-lg">content_copy</span>
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-90 transition-transform">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Display Container - Auto Expanding with Fixed Max Height for Scroll */}
        <div 
          ref={scrollRef}
          className="overflow-y-auto px-2 mb-8 scrollbar-hide transition-all duration-300 max-h-[40vh]"
        >
          <div className="space-y-3 text-right">
            <div className="text-white/30 text-sm font-bold break-all min-h-[1.5rem]">
              {history[0] || ''}
            </div>
            <div className="text-6xl font-black tracking-tighter break-all bg-clip-text text-transparent bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.3)] leading-tight">
              {display || '0'}
            </div>
          </div>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-4 gap-3 shrink-0">
          {buttons.map((btn, i) => (
            <button
              key={i}
              onClick={() => handleInput(btn.label)}
              className={`
                h-16 rounded-full text-2xl font-bold transition-all active:scale-95 flex items-center justify-center
                ${btn.type === 'action' ? 'bg-[#a5a5a5] text-black hover:bg-[#d4d4d2]' : ''}
                ${btn.type === 'operator' ? 'bg-[#ff9f0a] text-white hover:bg-[#ffb347] shadow-lg shadow-orange-500/20' : ''}
                ${btn.type === 'number' ? 'bg-[#333333] text-white hover:bg-[#4d4d4d]' : ''}
              `}
            >
              {btn.icon ? (
                <span className="material-symbols-outlined text-2xl">{btn.icon}</span>
              ) : btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
