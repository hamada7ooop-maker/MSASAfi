import React, { useMemo, useState } from 'react';
import { useHomeData } from '../hooks/useHomeData';
import { FinancialScoreCard } from './FinancialScoreCard';
import { InfoModal } from '../../../components/ui/InfoModal';

export interface GamificationRankCardProps {
  className?: string;
}

export function GamificationRankCard({ className = '' }: GamificationRankCardProps) {
  const { financialScore } = useHomeData();
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const { level, progress, title, nextTitle, neededXp } = useMemo(() => {
    const score = Number(financialScore) || 0;

    let lvl = 1;
    let rank = 'مبتدئ مالي';
    let nextRank = 'متدرب مالي';
    let baseScore = 0;
    let nextScore = 20;

    if (score >= 80) {
      lvl = 5;
      rank = 'خبير مالي';
      nextRank = 'القمة المالية';
      baseScore = 80;
      nextScore = 100;
    } else if (score >= 60) {
      lvl = 4;
      rank = 'محترف مالي';
      nextRank = 'خبير مالي';
      baseScore = 60;
      nextScore = 80;
    } else if (score >= 40) {
      lvl = 3;
      rank = 'مخطط ذكي';
      nextRank = 'محترف مالي';
      baseScore = 40;
      nextScore = 60;
    } else if (score >= 20) {
      lvl = 2;
      rank = 'متدرب مالي';
      nextRank = 'مخطط ذكي';
      baseScore = 20;
      nextScore = 40;
    }

    const currentXp = Math.max(0, score - baseScore);
    const requiredXp = nextScore - baseScore;
    const p = lvl === 5 && score >= 100 ? 100 : Math.min(100, Math.max(0, (currentXp / requiredXp) * 100));

    return { 
      level: lvl, 
      progress: p, 
      title: rank, 
      nextTitle: nextRank,
      neededXp: requiredXp - currentXp
    };
  }, [financialScore]);

  // SVG circular calculation for XP progress
  const radius = 30;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <>
      <div 
        className={`rounded-[32px] p-5 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-yellow-500/5 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-500/20 flex flex-col justify-between h-full relative overflow-hidden group cursor-pointer shadow-sm hover:shadow-md transition-all ${className}`}
        onClick={() => setIsInfoOpen(true)}
      >
        {/* Background Decor */}
        <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500 transform group-hover:scale-110 group-hover:rotate-12 pointer-events-none">
          <span className="material-symbols-outlined text-[90px] text-amber-500">social_leaderboard</span>
        </div>

        <div className="relative z-10 flex flex-col h-full pointer-events-none gap-3.5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-lg">military_tech</span>
              التصنيف المالي ونقاط الخبرة
            </h3>
            <button 
              className="w-8 h-8 rounded-full bg-slate-50/50 dark:bg-[#25282d]/50 group-hover:bg-slate-100 dark:group-hover:bg-[#25282d] flex items-center justify-center text-slate-400 group-hover:text-amber-500 transition-colors pointer-events-auto shrink-0 border border-black/5 dark:border-white/5"
              title="معلومات الرتب ونقاط الخبرة"
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">info</span>
            </button>
          </div>

          {/* Core Visual & Stats */}
          <div className="flex items-center gap-4 mt-0.5">
            {/* Circular XP Progress Gauge */}
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
                  stroke="#f59e0b"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.4))' }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xl font-black text-amber-600 dark:text-amber-400 leading-none tracking-tighter">
                  {Math.round(progress)}%
                </span>
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
                  XP
                </span>
              </div>
            </div>

            {/* Level & Rank Details */}
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm shadow-orange-500/20 flex items-center justify-center text-white font-black text-xs border border-white/20 shrink-0">
                  {level}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-[10px] font-bold text-slate-400 leading-none mb-0.5">المستوى الحالي</span>
                  <span className="text-sm text-amber-600 dark:text-amber-400 font-black leading-none truncate">
                    {title}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold flex items-center justify-between">
                <span>الرتبة القادمة:</span>
                <span className="text-slate-700 dark:text-slate-200 font-extrabold">{nextTitle}</span>
              </div>
            </div>
          </div>

          {/* Shimmer Linear Progress Line & Next Goal */}
          <div className="space-y-1.5 pt-1 border-t border-amber-500/10 dark:border-white/5">
            <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 dark:text-slate-400">
              <span>التقدم للمستوى {level < 5 ? level + 1 : level}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            
            <div className="h-2 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden shadow-inner relative" dir="ltr">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
              />
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            </div>

            <div className="text-[9.5px] text-slate-500 dark:text-slate-400 font-medium leading-tight">
              {level === 5 && progress >= 100 ? (
                <span className="text-emerald-500 font-bold">🎉 حققت أعلى تصنيف مالي بنجاح!</span>
              ) : (
                <>باقي <span className="font-extrabold text-amber-600 dark:text-amber-400">{neededXp} نقطة XP</span> للترقية إلى {nextTitle}</>
              )}
            </div>
          </div>
        </div>
      </div>

      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title="التصنيف المالي ونقاط الخبرة (XP)"
        description="نظام تحفيزي ممتع يرقي مستواك المالي ويكافئك على الانضباط وإدارة الأموال بحكمة:"
        headerIcon="military_tech"
        headerIconColorClass="text-amber-500"
        headerIconBgClass="bg-amber-500/10 border-amber-500/20 shadow-amber-500/10"
        points={[
          {
            icon: 'stars',
            iconColorClass: 'text-amber-400',
            iconBgClass: 'bg-amber-500/10 border-amber-500/20',
            title: 'كيف تكسب نقاط الخبرة (XP)؟',
            titleColorClass: 'text-slate-800 dark:text-slate-200',
            body: 'تحصل على نقاط خبرة مستمرة برفع مؤشر صحتك المالية، تسجيل المعاملات بانتظام، والالتزام بحدود الميزانيات.'
          },
          {
            icon: 'upgrade',
            iconColorClass: 'text-orange-400',
            iconBgClass: 'bg-orange-500/10 border-orange-500/20',
            title: 'سلم الرتب والمستويات',
            titleColorClass: 'text-slate-800 dark:text-slate-200',
            body: 'تتدرج من \"مبتدئ مالي\" (مستوى 1) ثم \"متدرب\" ثم \"مخطط ذكي\" ثم \"محترف مالي\" وحتى أعلى رتبة \"خبير مالي\" (مستوى 5).'
          },
          {
            icon: 'emoji_events',
            iconColorClass: 'text-yellow-400',
            iconBgClass: 'bg-yellow-500/10 border-yellow-500/20',
            title: 'المكافآت والترقيات',
            titleColorClass: 'text-slate-800 dark:text-slate-200',
            body: 'كل مستوى جديد يفتح لك إنجازات خاصة، ويزيد من نقاط الولاء التي يمكن الاستفادة منها داخل متجر المكافآت.'
          }
        ]}
      />
    </>
  );
}

/**
 * Main Gamification Widget rendering the two split cards in a responsive grid.
 */
export function GamificationWidget() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FinancialScoreCard />
      <GamificationRankCard />
    </div>
  );
}
