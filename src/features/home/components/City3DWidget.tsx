import React, { useMemo, useState } from 'react';
import { onActivate } from '@/core/a11yKeyboard';
import { useHomeData } from '../hooks/useHomeData';
import { InfoModal } from '../../../components/ui/InfoModal';

// Helper to draw an isometric building using SVG polygons
function IsoBuilding({ x, y, width, height, colors }: { x: number, y: number, width: number, height: number, colors: { top: string, left: string, right: string } }) {
  const tilt = width * 0.5; // Controls the isometric angle
  
  // Base point (top center of the building)
  const tx = x;
  const ty = y - height;

  const pointsTop = `
    ${tx},${ty} 
    ${tx - width},${ty + tilt} 
    ${tx},${ty + tilt * 2} 
    ${tx + width},${ty + tilt}
  `;

  const pointsLeft = `
    ${tx - width},${ty + tilt} 
    ${tx},${ty + tilt * 2} 
    ${tx},${ty + tilt * 2 + height} 
    ${tx - width},${ty + tilt + height}
  `;

  const pointsRight = `
    ${tx},${ty + tilt * 2} 
    ${tx + width},${ty + tilt} 
    ${tx + width},${ty + tilt + height} 
    ${tx},${ty + tilt * 2 + height}
  `;

  return (
    <g className="transition-all duration-1000 ease-out">
      <polygon points={pointsLeft} fill={colors.left} />
      <polygon points={pointsRight} fill={colors.right} />
      <polygon points={pointsTop} fill={colors.top} />
    </g>
  );
}

export function City3DWidget() {
  const { financialScore } = useHomeData();
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const cityData = useMemo(() => {
    const score = Number(financialScore) || 0;
    
    // Colors based on score
    let sky = 'from-slate-500 to-slate-400';
    let textStatus = 'تحتاج للاستثمار';
    
    // Default building colors (low score)
    let c1 = { top: '#e2e8f0', left: '#94a3b8', right: '#cbd5e1' }; // Slate
    let c2 = { top: '#f87171', left: '#dc2626', right: '#ef4444' }; // Red/Rose
    let c3 = { top: '#e2e8f0', left: '#94a3b8', right: '#cbd5e1' }; 
    
    if (score >= 70) {
      sky = 'from-emerald-400 to-teal-400';
      textStatus = 'اقتصاد قوي ومزدهر';
      c1 = { top: '#6ee7b7', left: '#059669', right: '#10b981' };
      c2 = { top: '#a7f3d0', left: '#10b981', right: '#34d399' };
      c3 = { top: '#6ee7b7', left: '#059669', right: '#10b981' };
    } else if (score >= 40) {
      sky = 'from-indigo-400 to-blue-400';
      textStatus = 'تنمو بثبات';
      c1 = { top: '#93c5fd', left: '#2563eb', right: '#3b82f6' };
      c2 = { top: '#bfdbfe', left: '#3b82f6', right: '#60a5fa' };
      c3 = { top: '#93c5fd', left: '#2563eb', right: '#3b82f6' };
    }

    // Heights scaled by score (score ranges 0-100)
    // We add some baseline height so it's never completely flat
    const h1 = 20 + (score * 0.5);
    const h2 = 40 + (score * 0.8);
    const h3 = 10 + (score * 0.4);

    return { sky, textStatus, buildings: [
      { x: 60, y: 150, w: 25, h: h3, colors: c3 },
      { x: 100, y: 120, w: 30, h: h2, colors: c2 },
      { x: 140, y: 160, w: 20, h: h1, colors: c1 },
    ]};
  }, [financialScore]);

  return (
    <>
      <div 
        className={`rounded-[32px] p-6 bg-gradient-to-br ${cityData.sky} shadow-inner flex flex-col justify-between h-full relative overflow-hidden group cursor-pointer`}
        onClick={() => setIsInfoOpen(true)}
  role="button" tabIndex={0} onKeyDown={onActivate(() => setIsInfoOpen(true))}>
        
        {/* Sun/Moon */}
        <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/40 blur-sm mix-blend-overlay pointer-events-none"></div>
        <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/80 shadow-[0_0_20px_rgba(255,255,255,0.8)] pointer-events-none"></div>
        
        {/* Clouds (simple CSS animation) */}
        <div className="absolute top-10 left-4 w-16 h-4 bg-white/30 rounded-full blur-[2px] opacity-70 animate-[pulse_4s_infinite] pointer-events-none"></div>
        <div className="absolute top-16 left-20 w-10 h-3 bg-white/20 rounded-full blur-[1px] opacity-50 animate-[pulse_5s_infinite_1s] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col h-full justify-between pointer-events-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md shadow-sm flex items-center justify-center text-white border-2 border-white/30">
                <span className="material-symbols-outlined text-[24px]">domain</span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-white leading-tight mb-0.5">المدينة المالية</h4>
                <p className="text-xs text-white/90 font-medium">{cityData.textStatus}</p>
              </div>
            </div>
            <button aria-label="More information" 
              className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center text-white/70 group-hover:text-white transition-colors pointer-events-auto"
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">info</span>
            </button>
          </div>

          {/* 3D City Visual */}
          <div className="flex-1 min-h-[120px] flex items-end justify-center relative mt-4">
            <svg viewBox="0 0 200 180" className="w-full h-full drop-shadow-2xl">
              {/* Draw from back to front to respect z-index in SVG */}
              {cityData.buildings.sort((a, b) => a.y - b.y).map((b, i) => (
                <IsoBuilding 
                  key={i} 
                  x={b.x} 
                  y={b.y} 
                  width={b.w} 
                  height={b.h} 
                  colors={b.colors} 
                />
              ))}
            </svg>
          </div>
        </div>
      </div>

      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title="مجسم المدينة المالية 3D"
        description="هذه المدينة تتغير وتتطور بناءً على وضعك المالي؛ إنها انعكاس بصري وفني لصحتك المالية وليست مجرد شكل جمالي."
        headerIcon="domain"
        headerIconColorClass="text-teal-500"
        headerIconBgClass="bg-teal-500/10 border-teal-500/20 shadow-teal-500/10"
        points={[
          {
            icon: 'architecture',
            iconColorClass: 'text-indigo-400',
            iconBgClass: 'bg-indigo-500/10 border-indigo-500/20',
            title: 'بناء الأبراج',
            titleColorClass: 'text-indigo-300',
            body: 'يرتفع طول المباني في مدينتك كلما زادت درجة وعيك المالي ونقاط خبرتك؛ استمر في التوفير لتناطح السحاب.'
          },
          {
            icon: 'wb_sunny',
            iconColorClass: 'text-amber-400',
            iconBgClass: 'bg-amber-500/10 border-amber-500/20',
            title: 'ألوان السماء والمناخ',
            titleColorClass: 'text-amber-300',
            body: 'يتغير الجو العام للمدينة من أجواء ملبدة وكئيبة (في حال الإسراف) إلى أجواء مشمسة ومزدهرة كلما تحسنت ميزانيتك.'
          }
        ]}
      />
    </>
  );
}
