import React, { useMemo, useState } from 'react';
import { useHomeData } from '../hooks/useHomeData';
import { InfoModal } from '../../../components/ui/InfoModal';
import { useI18n } from '@/i18n/index';

export interface FinancialScoreCardProps {
  scoreOverride?: number;
  className?: string;
}

export function FinancialScoreCard({ scoreOverride, className = '' }: FinancialScoreCardProps) {
  const { financialScore: hookScore, monthlyStats, owedDebts, totalBalance } = useHomeData();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const { t } = useI18n();

  const financialScore = scoreOverride !== undefined ? scoreOverride : hookScore;

  const { scoreColor, statusText, statusBadgeClass, guideText, metrics } = useMemo(() => {
    const score = Number(financialScore) || 0;
    const isExcellent = score >= 70;
    const isWarning = score >= 40 && score < 70;
    const color = isExcellent ? '#10b981' : isWarning ? '#fbbf24' : '#f43f5e';

    const status = isExcellent 
      ? 'ممتاز 🟢' 
      : isWarning 
      ? 'متزن 🟡' 
      : 'يحتاج انتباه 🔴';

    const badgeClass = isExcellent
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      : isWarning
      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';

    const guide = isExcellent
      ? 'أداء مالي استثنائي، مدخراتك وإدارتك للمصاريف تعزز نموك المستدام.'
      : isWarning
      ? 'وضعك المالي مستقر، يمكنك رفع درجاتك بزيادة الفائض الشهري وتخفيض الديون.'
      : 'انتبه لنفقاتك الشهرية والتزامات الديون لرفع درجة أمانك المالي.';

    // Approximate component breakdown percentages
    const income = monthlyStats?.income || 0;
    const expense = monthlyStats?.expense || 0;
    const surplusRatio = income > 0 ? Math.max(0, Math.min(100, Math.round(((income - expense) / income) * 100))) : 0;
    let totalDebt = 0;
    for (const d of owedDebts || []) {
      totalDebt += d.remaining !== undefined ? d.remaining : ((d.total || 0) - (d.paid || 0));
    }
    const liquidityRatio = totalBalance > 0 ? Math.min(100, Math.round((totalBalance / Math.max(1, expense * 3)) * 100)) : 0;

    return {
      scoreColor: color,
      statusText: status,
      statusBadgeClass: badgeClass,
      guideText: guide,
      metrics: {
        surplus: surplusRatio,
        liquidity: liquidityRatio,
        debtControl: totalDebt === 0 ? 100 : Math.max(10, Math.min(100, Math.round(100 - (totalDebt / Math.max(1, totalBalance + totalDebt)) * 100)))
      }
    };
  }, [financialScore, monthlyStats, owedDebts, totalBalance]);

  // SVG circular calculation
  const radius = 30;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ((financialScore || 0) / 100) * circumference;

  return (
    <>
      <div 
        className={`rounded-[32px] p-5 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 dark:from-emerald-500/10 dark:to-cyan-500/10 border border-emerald-500/20 flex flex-col justify-between h-full relative overflow-hidden group cursor-pointer shadow-sm hover:shadow-md transition-all ${className}`}
        onClick={() => setIsInfoOpen(true)}
      >
        {/* Background Decor */}
        <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500 transform group-hover:scale-110 group-hover:rotate-12 pointer-events-none">
          <span className="material-symbols-outlined text-[90px] text-emerald-500">monitoring</span>
        </div>

        <div className="relative z-10 flex flex-col h-full pointer-events-none gap-3.5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500 text-lg">speed</span>
              مؤشر الصحة المالية
            </h3>
            <button 
              className="w-8 h-8 rounded-full bg-slate-50/50 dark:bg-[#25282d]/50 group-hover:bg-slate-100 dark:group-hover:bg-[#25282d] flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors pointer-events-auto shrink-0 border border-black/5 dark:border-white/5"
              title="معلومات المؤشر"
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">info</span>
            </button>
          </div>

          {/* Core Visual & Stats */}
          <div className="flex items-center gap-4 mt-0.5">
            {/* Circular Progress Gauge */}
            <div className="relative w-[76px] h-[76px] flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 76 76">
                <circle
                  cx="38"
                  cy="38"
                  r={radius}
                  fill="transparent"
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-700/50"
                  strokeWidth={strokeWidth}
                />
                <circle
                  cx="38"
                  cy="38"
                  r={radius}
                  fill="transparent"
                  stroke={scoreColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                  style={{ filter: `drop-shadow(0 0 4px ${scoreColor}40)` }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xl font-black text-slate-800 dark:text-white leading-none tracking-tighter" style={{ color: scoreColor }}>
                  {financialScore}
                </span>
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
                  من 100
                </span>
              </div>
            </div>

            {/* Status & Sub-bars */}
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${statusBadgeClass}`}>
                  {statusText}
                </span>
              </div>

              {/* Mini metric indicators */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 dark:text-slate-400">
                  <span>الفائض المالي</span>
                  <span className="font-extrabold text-slate-700 dark:text-slate-300">{metrics.surplus}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden" dir="ltr">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, metrics.surplus)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 dark:text-slate-400 pt-0.5">
                  <span>الاستقرار النقدي</span>
                  <span className="font-extrabold text-slate-700 dark:text-slate-300">{metrics.liquidity}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Guidance Note */}
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium pt-1 border-t border-emerald-500/10 dark:border-white/5 leading-tight">
            {guideText}
          </div>
        </div>
      </div>

      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title="مؤشر الصحة المالية (Financial Health)"
        description="تقييم مالي ذكي يقيس مدى أمان واستقرار وضعك المالي بناءً على ثلاثة محاور رئيسية تتكامل لتحقيق الاستدامة المالية:"
        headerIcon="speed"
        headerIconColorClass="text-emerald-500"
        headerIconBgClass="bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/10"
        points={[
          {
            icon: 'trending_up',
            iconColorClass: 'text-emerald-400',
            iconBgClass: 'bg-emerald-500/10 border-emerald-500/20',
            title: t('home.scoreModal.surplusTitle') || 'نسبة الفائض المالي (الدخل مقابل المصروفات)',
            titleColorClass: 'text-slate-800 dark:text-slate-200',
            body: t('home.scoreModal.surplusBody') || 'ارتفاع الدخل مقارنة بالمصاريف يكسبك نقاطاً إضافية، بينما يؤدي الإنفاق الزائد لخصم النقاط.'
          },
          {
            icon: 'account_balance',
            iconColorClass: 'text-teal-400',
            iconBgClass: 'bg-teal-500/10 border-teal-500/20',
            title: t('home.scoreModal.balanceTitle') || 'الاستقرار النقدي وتغطية الطوارئ',
            titleColorClass: 'text-slate-800 dark:text-slate-200',
            body: t('home.scoreModal.balanceBody') || 'الحفاظ على رصيد وسيولة كافية تغطي نفقات عدة أشهر يرفع تقييم أمانك المالي ويحميك من الصدمات.'
          },
          {
            icon: 'credit_score',
            iconColorClass: 'text-rose-400',
            iconBgClass: 'bg-rose-500/10 border-rose-500/20',
            title: t('home.scoreModal.debtTitle') || 'إدارة الديون والالتزامات',
            titleColorClass: 'text-slate-800 dark:text-slate-200',
            body: t('home.scoreModal.debtBody') || 'سداد الديون بانتظام وخفض نسبتها مقارنة بمدخراتك يعزز مرونتك ويزيد من قوة مؤشرك المالي.'
          }
        ]}
      />
    </>
  );
}
