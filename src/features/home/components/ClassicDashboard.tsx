import React from 'react';
import { useHomeData } from '../hooks/useHomeData';
import { BalanceCard } from './BalanceCard';
import { IncomeExpenseCards } from './IncomeExpenseCards';
import { AIPulse } from './AIPulse';
import { QuickAccess } from './QuickAccess';
import { RecentTransactions } from './RecentTransactions';
import { AlertsCenter } from './AlertsCenter';
import { SavingsTree } from './SavingsTree';
import { WhatIfSimulator } from './WhatIfSimulator';
import { NewsPulse, EconomicPulse, CryptoPulse, CurrencyPulse } from './MarketWidgets';
import { WeeklyReview } from './WeeklyReview';
import { HabitStreak } from './HabitStreak';
import { UpcomingBills } from './UpcomingBills';
import { TopExpenses } from './TopExpenses';
import { DailyPacing } from './DailyPacing';
import { Insights } from './Insights';
import { DashboardCharts } from './DashboardCharts';
import { City3DWidget } from './City3DWidget';
import { PredictiveAIWidget } from './PredictiveAIWidget';
import { GamificationWidget, GamificationRankCard } from './GamificationWidget';
import { FinancialScoreCard } from './FinancialScoreCard';

import { NetWorthTrend } from './NetWorthTrend';
import { SalaryCountdown } from './SalaryCountdown';
import { useI18n } from '../../../i18n/index';
import { useAppStore } from '../../../store/appStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';
import { getRandomTip } from '../../../core/categoryUtils';
import { APP_VERSION } from '../../../core/constants';
import { CardSkeleton } from '../../../components/ui/Skeleton';
import { WidgetErrorBoundary } from '../../../components/common/WidgetErrorBoundary';

/**
 * Classic Dashboard Component - The main landing page.
 */
export function ClassicDashboard() {
  const { 
    balance, 
    monthlyStats, 
    recentTransactions, 
    isLoading,
    financialScore,
    sustainability,
    prediction,
    anomalies,
    budgets,
    categoryBreakdown,
    streak,
    upcomingBills,
    marketData,
    recommendations,
    netWorthHistory,
    nwPeriod,
    setNwPeriod
  } = useHomeData();

  const { t } = useI18n();
  const { 
    setGlobalActionOpen, 
    isHomeEditing, 
    setHomeEditing 
  } = useAppStore(
    useShallow((s) => ({
      setGlobalActionOpen: s.setGlobalActionOpen,
      isHomeEditing: s.isHomeEditing,
      setHomeEditing: s.setHomeEditing
    }))
  );
  const { homeOrder, setHomeOrder, isSimpleMode } = useSettingsStore(
    useShallow((s) => ({
      homeOrder: s.homeOrder,
      setHomeOrder: s.setHomeOrder,
      isSimpleMode: s.isSimpleMode
    }))
  );
  const dailyTip = React.useMemo(() => getRandomTip(), []);

  const filteredHomeOrder = React.useMemo(() => {
    if (!isSimpleMode) return homeOrder;
    // Basic essential blocks for a streamlined experience
    const simpleBlocks = ['banner', 'balance', 'incomeExpense', 'recent', 'quickAccess', 'alerts'];
    return homeOrder.filter(item => simpleBlocks.includes(item.id));
  }, [homeOrder, isSimpleMode]);

  const moveItem = React.useCallback((index: number, direction: 'up' | 'down') => {
    const currentHomeOrder = useSettingsStore.getState().homeOrder;
    const newOrder = [...currentHomeOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setHomeOrder(newOrder);
  }, [setHomeOrder]);

  const toggleVisibility = React.useCallback((index: number) => {
    const currentHomeOrder = useSettingsStore.getState().homeOrder;
    const newOrder = [...currentHomeOrder];
    newOrder[index] = { ...newOrder[index], visible: !newOrder[index].visible };
    setHomeOrder(newOrder);
  }, [setHomeOrder]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-6">
        <div className="h-40 bg-gradient-to-br from-blue-600/20 to-blue-400/10 rounded-[2rem] animate-pulse"></div>
        <div className="grid grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const renderSection = (id: string) => {
    switch (id) {
      case 'banner':
        return (
          <button 
            className="w-full relative overflow-hidden bg-gradient-to-br from-[#002b59] to-[#1a4175] dark:from-[#002b59] dark:to-[#091a2d] rounded-[32px] p-7 shadow-xl border border-white/10 group active:scale-[0.98] transition-all flex items-center justify-between"
            onClick={() => setGlobalActionOpen(true)}
          >
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
            <div className="relative z-10 text-left">
              <span className="text-white/60 text-[10px] font-black uppercase tracking-widest block mb-1">
                {t('home.quickActionSub') || 'Smart Action Hub'}
              </span>
              <h2 className="text-white text-xl font-black leading-tight">
                 {t('home.quickActionTitle') || 'ماذا تريد أن تفعل؟'}
              </h2>
            </div>
            <div className="relative z-10 w-14 h-14 rounded-full bg-amber-500/90 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:scale-110 group-hover:bg-amber-400 flex-shrink-0 transition-all duration-300 shadow-lg shadow-amber-500/20">
              <span className="material-symbols-outlined text-white text-3xl font-light" style={{ color: 'white' }}>bolt</span>
            </div>
          </button>
        );
      case 'pacing':
        return <DailyPacing monthlyStats={monthlyStats} balance={balance} />;
      case 'weeklyReview':
        return (
          <WidgetErrorBoundary widgetName="المراجعة الأسبوعية">
            <WeeklyReview weeklyData={monthlyStats.weekly} />
          </WidgetErrorBoundary>
        );
      case 'savings':
      case 'tree':
        return (
          <WidgetErrorBoundary widgetName="شجرة الادخار">
            <SavingsTree monthlyStats={monthlyStats} budgets={budgets} />
          </WidgetErrorBoundary>
        );

      case 'predictiveAI':
        return (
          <WidgetErrorBoundary widgetName="الذكاء الاصطناعي التنبؤي">
            <PredictiveAIWidget />
          </WidgetErrorBoundary>
        );
      case 'financialScore':
        return (
          <WidgetErrorBoundary widgetName="مؤشر الصحة المالية">
            <FinancialScoreCard />
          </WidgetErrorBoundary>
        );
      case 'gamification':
        return (
          <WidgetErrorBoundary widgetName="التصنيف ونقاط الخبرة">
            {filteredHomeOrder.some(s => s.id === 'financialScore' && s.visible) ? (
              <GamificationRankCard />
            ) : (
              <GamificationWidget />
            )}
          </WidgetErrorBoundary>
        );
      case 'city3d':
        return (
          <WidgetErrorBoundary widgetName="المدينة ثلاثية الأبعاد">
            <City3DWidget />
          </WidgetErrorBoundary>
        );
      case 'whatIf':
        return (
          <WidgetErrorBoundary widgetName="محاكي ماذا لو">
            <WhatIfSimulator categoryBreakdown={categoryBreakdown} />
          </WidgetErrorBoundary>
        );
      case 'upcoming':
        return (
          <WidgetErrorBoundary widgetName="الفواتير القادمة">
            <UpcomingBills bills={upcomingBills} />
          </WidgetErrorBoundary>
        );
      case 'topExpenses':
        return (
          <WidgetErrorBoundary widgetName="أعلى المصروفات">
            <TopExpenses categoryBreakdown={categoryBreakdown} />
          </WidgetErrorBoundary>
        );
      case 'balance':
        return (
          <WidgetErrorBoundary widgetName="بطاقة الرصيد">
            <BalanceCard 
              balance={balance} 
              financialScore={financialScore}
              prediction={prediction}
            />
          </WidgetErrorBoundary>
        );
      case 'incomeExpense':
        return (
          <WidgetErrorBoundary widgetName="الدخل والمصروفات">
            <div className="fin-card p-6 hover:shadow-2xl hover:border-blue-500/10 transition-all duration-500">
               <div className="flex items-center gap-2 mb-6 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  <h3 className="text-premium-header text-sm text-[var(--color-primary)] dark:text-blue-100 uppercase tracking-tighter">
                    {t('home.section.incomeExpense')}
                  </h3>
               </div>
               <IncomeExpenseCards 
                 income={monthlyStats.income} 
                 expense={monthlyStats.expense}
               />
            </div>
          </WidgetErrorBoundary>
        );
      case 'netWorth':
        return (
          <WidgetErrorBoundary widgetName="اتجاه صافي الثروة">
            <NetWorthTrend 
              key={`nw-trend-${nwPeriod}-${netWorthHistory?.length}-${balance}`}
              data={netWorthHistory || []} 
              period={nwPeriod} 
              onPeriodChange={setNwPeriod} 
            />
          </WidgetErrorBoundary>
        );
      case 'alerts':
        return (
          <WidgetErrorBoundary widgetName="مركز التنبيهات">
            <AlertsCenter 
              anomalies={anomalies} 
              balance={balance} 
              prediction={prediction} 
            />
          </WidgetErrorBoundary>
        );
      case 'insights':
        return (
          <WidgetErrorBoundary widgetName="التحليلات والتوصيات">
            <Insights recommendations={recommendations} monthlyStats={monthlyStats} />
          </WidgetErrorBoundary>
        );
      case 'charts':
        return (
          <WidgetErrorBoundary widgetName="الرسوم البيانية">
            <DashboardCharts categoryBreakdown={categoryBreakdown} monthlyStats={monthlyStats} />
          </WidgetErrorBoundary>
        );
      case 'pulse':
      case 'aiPulse':
        return (
          <WidgetErrorBoundary widgetName="نبض الذكاء المالي">
            <AIPulse sustainability={sustainability} />
          </WidgetErrorBoundary>
        );
      case 'habitStreak':
        return (
          <WidgetErrorBoundary widgetName="سلسلة العادات">
            <HabitStreak streak={streak} />
          </WidgetErrorBoundary>
        );
      case 'dailyTip':
        return (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[32px] p-6 shadow-lg text-white relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 opacity-10 group-hover:scale-125 transition-transform duration-700">
              <span className="material-symbols-outlined" style={{ fontSize: '100px' }}>lightbulb</span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-amber-300">emoji_objects</span>
              <h3 className="font-black text-[10px] uppercase tracking-widest text-white/80">{t('home.section.dailyTip')}</h3>
            </div>
            <p className="text-sm font-bold leading-relaxed relative z-10">{dailyTip.text}</p>
          </div>
        );
      case 'quickAccess':
        return <QuickAccess />;
      case 'recent':
        return (
          <WidgetErrorBoundary widgetName="آخر المعاملات">
            <RecentTransactions transactions={recentTransactions} />
          </WidgetErrorBoundary>
        );
      case 'economic':
      case 'economicPulse':
        return (
          <WidgetErrorBoundary widgetName="المؤشرات الاقتصادية">
            <EconomicPulse data={marketData?.economic} missing={marketData?.economic === 'missing'} />
          </WidgetErrorBoundary>
        );
      case 'crypto':
      case 'cryptoPulse':
        return (
          <WidgetErrorBoundary widgetName="سوق الكريبتو">
            <CryptoPulse data={marketData?.crypto} />
          </WidgetErrorBoundary>
        );
      case 'news':
      case 'newsPulse':
        return (
          <WidgetErrorBoundary widgetName="الأخبار المالية">
            <NewsPulse data={marketData?.news} missing={marketData?.news === 'missing'} />
          </WidgetErrorBoundary>
        );
      case 'currencies':
      case 'currencyPulse':
        return (
          <WidgetErrorBoundary widgetName="أسعار العملات">
            <CurrencyPulse />
          </WidgetErrorBoundary>
        );
      case 'salaryCountdown':
        return (
          <WidgetErrorBoundary widgetName="العد التنازلي للراتب">
            <SalaryCountdown />
          </WidgetErrorBoundary>
        );
      default:
        return null;
    }
  };

  return (
    <div className="animate-in fade-in duration-700 pb-32 space-y-6">
      {/* Customization Header */}
      <div className="flex items-center justify-between px-2 pt-2">
        <div className="space-y-1">
          <h1 className="text-3xl text-premium-header text-[var(--color-primary)] dark:text-blue-100">
            {t('nav.home')}
          </h1>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-70">
              {t('home.welcome') || 'Welcome back!'}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setHomeEditing(!isHomeEditing)}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isHomeEditing ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-surface-container-low text-slate-500 hover:bg-surface-container-high'}`}
          title={isHomeEditing ? t('action.done') : t('action.customize')}
        >
          <span className="material-symbols-outlined text-xl">
            {isHomeEditing ? 'check' : 'dashboard_customize'}
          </span>
        </button>
      </div>

      <div className="space-y-6">
        {filteredHomeOrder.map((section, index) => {
          if (!section.visible && !isHomeEditing) return null;

          // In non-edit mode: if financialScore and gamification are adjacent & visible, pair them into the twin 2-column grid
          if (!isHomeEditing) {
            if (section.id === 'financialScore') {
              const nextSection = filteredHomeOrder[index + 1];
              if (nextSection && nextSection.id === 'gamification' && nextSection.visible) {
                return (
                  <div key="financialScore-gamification-pair" className="relative group transition-all">
                    <WidgetErrorBoundary widgetName="مؤشر الصحة والتصنيف المالي">
                      <GamificationWidget />
                    </WidgetErrorBoundary>
                  </div>
                );
              }
            } else if (section.id === 'gamification') {
              const prevSection = filteredHomeOrder[index - 1];
              if (prevSection && prevSection.id === 'financialScore' && prevSection.visible) {
                // Already rendered paired above with financialScore
                return null;
              }
            }
          }

          return (
            <div key={section.id} className={`relative group transition-all ${isHomeEditing ? 'p-4 border-2 border-dashed border-blue-500/30 rounded-[2.5rem] bg-blue-50/10' : ''}`}>
              {isHomeEditing && (
                <div className="absolute -top-3 left-6 right-6 flex items-center justify-between z-20">
                  <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg border border-white/20">
                    {t(section.labelKey) || section.id}
                  </span>
                  <div className="flex gap-1.5 p-1 bg-white dark:bg-slate-700 rounded-full shadow-xl border border-black/5 dark:border-white/10">
                    <button 
                      onClick={() => moveItem(index, 'up')} 
                      disabled={index === 0}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all active:scale-90"
                    >
                      <span className="material-symbols-outlined text-xl">keyboard_arrow_up</span>
                    </button>
                    <button 
                      onClick={() => moveItem(index, 'down')} 
                      disabled={index === homeOrder.length - 1}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all active:scale-90"
                    >
                      <span className="material-symbols-outlined text-xl">keyboard_arrow_down</span>
                    </button>
                    <div className="w-px h-6 bg-slate-100 dark:bg-slate-600 my-auto mx-0.5"></div>
                    <button 
                      onClick={() => toggleVisibility(index)} 
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${section.visible ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}
                    >
                      <span className="material-symbols-outlined text-xl">{section.visible ? 'visibility' : 'visibility_off'}</span>
                    </button>
                  </div>
                </div>
              )}
              <div className={!section.visible ? 'opacity-40 grayscale' : ''}>
                {renderSection(section.id)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Branding */}
        <div className="py-10 text-center opacity-30 select-none">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">
          MASARIFI INTELLIGENCE ENGINE V{APP_VERSION}
        </p>
      </div>
    </div>
  );
}
