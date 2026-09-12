import React, { useState } from 'react';
import { useFormat } from '@core/hooks/useFormat';
import { useI18n } from '@/i18n/index';
import { getMonthName } from '@core/utils';

import type { PredictionInfo } from '../hooks/useHomeData';

interface BalanceCardProps {
  balance: number;
  financialScore: number;
  prediction?: PredictionInfo | null;
}

export const BalanceCard = React.memo(function BalanceCard({ balance, financialScore, prediction }: BalanceCardProps) {
  const { fmt, getCurrencySymbol } = useFormat();
  const { t } = useI18n();
  const currency = getCurrencySymbol();
  const [isSecret, setIsSecret] = useState(false);

  // 3D Parallax Tilt State
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({
    transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg)',
    transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)'
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Normalize coordinates from -0.5 to 0.5
    const xc = (x / rect.width) - 0.5;
    const yc = (y / rect.height) - 0.5;
    
    // Max tilt angles (degrees)
    const maxTilt = 7; 
    const rotateY = xc * maxTilt;
    const rotateX = -yc * maxTilt;
    
    setTiltStyle({
      transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
      transition: 'transform 0.1s ease-out'
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg)',
      transition: 'transform 0.7s cubic-bezier(0.25, 1, 0.5, 1)'
    });
  };

  const formattedBalance = fmt(balance);
  const len = formattedBalance.length;

  let baseSize = 'clamp(2.4rem, 9.5vw, 3.4rem)';
  if (len > 16) baseSize = 'clamp(1.1rem, 4.5vw, 1.7rem)';
  else if (len > 13) baseSize = 'clamp(1.5rem, 6.5vw, 2.2rem)';
  else if (len > 10) baseSize = 'clamp(1.9rem, 8.5vw, 2.7rem)';

  // Determine dynamic Aurora Glow palette according to financial health score
  const isExcellent = financialScore >= 70;
  const isWarning = financialScore >= 40 && financialScore < 70;

  const glowTheme = isExcellent
    ? 'from-[#0b0f19] via-[#022c22] to-[#0d5245] border-[#10b981]/20 shadow-[#10b981]/10'
    : isWarning
      ? 'from-[#0b0f19] via-[#2d1202] to-[#6a2508] border-[#fbbf24]/20 shadow-[#fbbf24]/10'
      : 'from-[#0b0f19] via-[#3b0712] to-[#7f0c27] border-[#f43f5e]/20 shadow-[#f43f5e]/10';

  return (
    <>
      <div 
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={tiltStyle}
        className={`relative overflow-hidden rounded-[2.5rem] p-7 text-white bg-gradient-to-br ${glowTheme} border shadow-[0_32px_80px_-16px_rgba(0,0,0,0.45)] group cursor-pointer transition-all`}
      >
        {/* Animated fluid blur spots */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/5 rounded-full blur-[80px] group-hover:scale-125 transition-transform duration-1000 animate-pulse"></div>
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-blue-400/5 rounded-full blur-[60px] group-hover:scale-125 transition-transform duration-1000 animate-pulse [animation-delay:1.5s]"></div>
        
        {/* Iridescent shimmer sweep */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1500 ease-out pointer-events-none"></div>

        <div className="relative z-10 w-full flex flex-col justify-between h-full min-h-[170px]">
          {/* Top Row: Info */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/55 block">
                {t('home.balance')}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_#60a5fa]"></div>
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">
                  {t('currencies.base') || 'العملة الأساسية'}: {t('currency.sar') || 'ر.س'}
                </span>
              </div>
            </div>
          </div>

          {/* Middle Row: Massive Balance + Incognito Toggle */}
          <div className="my-6">
            <div className="flex items-center gap-3 group/balance relative max-w-full">
              <h1 
                className={`text-premium-header tracking-tighter flex items-baseline gap-2 whitespace-nowrap leading-none transition-all duration-700 ${
                  isSecret ? 'filter blur-[12px] opacity-15 select-none pointer-events-none' : 'hover:scale-[1.01]'
                }`}
                style={{ fontSize: baseSize }}
              >
                <span className="tabular-nums drop-shadow-[0_8px_16px_rgba(0,0,0,0.3)]">{formattedBalance}</span> 
                <span className="text-[0.4em] font-black opacity-45 shrink-0 tracking-normal leading-none">{currency}</span>
              </h1>

              {/* Incognito Frosted Button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSecret(!isSecret);
                }}
                className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-white/60 hover:text-white flex items-center justify-center backdrop-blur-xl transition-all shadow-inner shrink-0"
                title={isSecret ? 'إظهار الرصيد' : 'إخفاء الرصيد (حماية الخصوصية)'}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isSecret ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Bottom Row: Premium Floating Pills */}
          <div className="flex gap-2.5 items-center overflow-x-auto scrollbar-none pb-1 relative z-10">
             {/* Month Pill */}
             <div className="bg-white/[0.03] hover:bg-white/[0.07] backdrop-blur-xl px-4 py-2.5 rounded-[1.2rem] flex items-center gap-2 shrink-0 border border-white/10 shadow-sm transition-all">
                <span className="material-symbols-outlined text-[13px] text-blue-300">calendar_month</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-white/90">
                  {getMonthName(new Date().getMonth())}
                </span>
             </div>
             
             {/* Target prediction countdown Pill */}
             {prediction && (
               <div className="bg-white/[0.03] hover:bg-white/[0.07] backdrop-blur-xl px-4 py-2.5 rounded-[1.2rem] flex items-center gap-2 shrink-0 border border-white/10 shadow-sm transition-all">
                  <span className="material-symbols-outlined text-[13px] text-amber-300">timer</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/90">
                    {prediction.daysLeft} {t('home.days')}
                  </span>
               </div>
             )}
          </div>
        </div>
      </div>
    </>
  );
});
