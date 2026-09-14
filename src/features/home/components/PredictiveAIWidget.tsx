import React, { useMemo, useState } from 'react';
import { useHomeData } from '../hooks/useHomeData';
import { useFormat } from '../../../core/hooks/useFormat';
import { InfoModal } from '../../../components/ui/InfoModal';

export function PredictiveAIWidget() {
  const { monthlyStats } = useHomeData();
  const { fmt } = useFormat();
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const prediction = useMemo(() => {
    const income = monthlyStats?.income || 0;
    const expense = monthlyStats?.expense || 0;
    
    const today = new Date();
    const currentDay = Math.max(1, today.getDate());
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    
    // Simple linear projection
    const dailyBurnRate = expense / currentDay;
    const projectedTotalExpense = dailyBurnRate * daysInMonth;
    const projectedSavings = income - projectedTotalExpense;
    
    let status: 'good' | 'warning' | 'danger' = 'good';
    let message = 'جاري التحليل...';
    let icon = 'psychology';
    let color = 'text-emerald-500 dark:text-emerald-400';
    let bg = 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20';

    if (income === 0 && expense === 0) {
      status = 'warning';
      message = 'نحتاج لمزيد من المعاملات لتقديم توقعات دقيقة لهذا الشهر.';
      icon = 'hourglass_empty';
      color = 'text-slate-500 dark:text-slate-400';
      bg = 'from-slate-500/5 to-slate-400/5 border-slate-500/10';
    } else if (projectedSavings > (income * 0.2)) { // Saving > 20%
      status = 'good';
      message = `أنت على المسار الصحيح! من المتوقع أن توفر حوالي ${fmt(projectedSavings)} بنهاية الشهر بناءً على عاداتك الحالية.`;
      icon = 'trending_up';
      color = 'text-emerald-600 dark:text-emerald-400';
      bg = 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20';
    } else if (projectedSavings >= 0) { // Saving 0-20%
      status = 'warning';
      message = `معدل صرفك معقول. من المتوقع أن يتبقى لك ${fmt(projectedSavings)} بنهاية الشهر. استمر في المراقبة.`;
      icon = 'balance';
      color = 'text-amber-600 dark:text-amber-400';
      bg = 'from-amber-500/10 to-yellow-500/10 border-amber-500/20';
    } else { // Burning cash
      status = 'danger';
      message = `تنبيه مبكر! استمرارك بهذا المعدل قد يكلفك عجزاً قدره ${fmt(Math.abs(projectedSavings))} بنهاية الشهر.`;
      icon = 'trending_down';
      color = 'text-rose-600 dark:text-rose-400';
      bg = 'from-rose-500/10 to-red-500/10 border-rose-500/20';
    }

    return { status, message, icon, color, bg, projectedSavings };
  }, [monthlyStats, fmt]);

  return (
    <>
      <div 
        className={`rounded-[32px] p-6 bg-gradient-to-br border flex flex-col justify-between h-full relative overflow-hidden group transition-all duration-500 cursor-pointer ${prediction.bg}`}
        onClick={() => setIsInfoOpen(true)}
      >
        
        {/* Background Decor */}
        <div className="absolute -left-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500 transform group-hover:scale-110 pointer-events-none">
          <span className="material-symbols-outlined text-[120px] font-thin">psychology</span>
        </div>

        <div className="relative z-10 flex flex-col h-full pointer-events-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/60 dark:bg-black/30 shadow-sm border border-white/20 dark:border-white/5 flex items-center justify-center backdrop-blur-md">
                <span className={`material-symbols-outlined text-2xl ${prediction.color}`}>
                  {prediction.icon}
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-tight">الذكاء التنبؤي</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">AI Projection</p>
              </div>
            </div>
            <button aria-label="More information" 
              className="w-8 h-8 rounded-full bg-slate-50/50 dark:bg-[#25282d]/50 group-hover:bg-slate-100 dark:group-hover:bg-[#25282d] flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors pointer-events-auto"
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">info</span>
            </button>
          </div>

          <div className="mt-auto">
            <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
              {prediction.message}
            </p>
          </div>
        </div>
      </div>

      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title="الذكاء التنبؤي وتوقعات السيولة"
        description="تقوم هذه الأداة بتحليل نمط إنفاقك اليومي وتوقع المسار المالي حتى نهاية الشهر الحالي لمساعدتك في اتخاذ قرارات أفضل قبل فوات الأوان."
        headerIcon="psychology"
        headerIconColorClass="text-emerald-500"
        headerIconBgClass="bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/10"
        points={[
          {
            icon: 'speed',
            iconColorClass: 'text-indigo-400',
            iconBgClass: 'bg-indigo-500/10 border-indigo-500/20',
            title: 'معدل حرق السيولة (Burn Rate)',
            titleColorClass: 'text-indigo-300',
            body: 'يتم حساب متوسط ما تصرفه يومياً وبناءً عليه يتم توقع إجمالي مصاريفك بنهاية الشهر.'
          },
          {
            icon: 'savings',
            iconColorClass: 'text-emerald-400',
            iconBgClass: 'bg-emerald-500/10 border-emerald-500/20',
            title: 'توقع الفائض المالي',
            titleColorClass: 'text-emerald-300',
            body: 'يقارن النظام الدخل المتوقع بإجمالي المصاريف المتوقعة ليعطيك مؤشراً مبكراً عما إذا كنت ستحقق فائضاً أو عجزاً بنهاية الشهر.'
          }
        ]}
      />
    </>
  );
}
