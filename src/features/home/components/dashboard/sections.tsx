import React from 'react';
import { useI18n } from '../../../../i18n/index';
import { WidgetErrorBoundary } from '../../../../components/common/WidgetErrorBoundary';
import { IncomeExpenseCards } from '../IncomeExpenseCards';
import { AIPulse } from '../AIPulse';
import { QuickAccess } from '../QuickAccess';
import { RecentTransactions } from '../RecentTransactions';
import { AlertsCenter } from '../AlertsCenter';
import { SavingsTree } from '../SavingsTree';
import { WhatIfSimulator } from '../WhatIfSimulator';
import { WeeklyReview } from '../WeeklyReview';
import { HabitStreak } from '../HabitStreak';
import { UpcomingBills } from '../UpcomingBills';
import { TopExpenses } from '../TopExpenses';
import { DailyPacing } from '../DailyPacing';
import { Insights } from '../Insights';
import { DashboardCharts } from '../DashboardCharts';
import { City3DWidget } from '../City3DWidget';
import { PredictiveAIWidget } from '../PredictiveAIWidget';
import { GamificationWidget, GamificationRankCard } from '../GamificationWidget';
import { FinancialScoreCard } from '../FinancialScoreCard';
import { NetWorthTrend } from '../NetWorthTrend';
import { SalaryCountdown } from '../SalaryCountdown';
import { SmartActionBanner } from './SmartActionBanner';
import { DailyTipCard } from './DailyTipCard';
import { HeroBalanceCard } from './HeroBalanceCard';
import { PulseStrip } from './PulseStrip';
import type { useHomeData } from '../../hooks/useHomeData';

/**
 * Directive 19 — Batch 1: the dashboard section routing table, extracted
 * from ClassicDashboard. Pure routing: every case is pinned by the
 * dashboard characterization suite (including the legacy id aliases).
 */
export type SectionDeps = {
  data: ReturnType<typeof useHomeData>;
  dailyTip: string;
  onOpenActionSheet: () => void;
  showRankCard: boolean;
};

export function DashboardSection({ id, deps }: { id: string; deps: SectionDeps }) {
  const { t } = useI18n();
  const { data, dailyTip, onOpenActionSheet, showRankCard } = deps;
  const { monthlyStats } = data;

  switch (id) {
    case 'banner':
      return <SmartActionBanner onOpen={onOpenActionSheet} />;
    case 'pacing':
      return <DailyPacing monthlyStats={monthlyStats} balance={data.balance} />;
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
          <SavingsTree monthlyStats={monthlyStats} budgets={data.budgets} />
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
          {showRankCard ? <GamificationRankCard /> : <GamificationWidget />}
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
          <WhatIfSimulator categoryBreakdown={data.categoryBreakdown} />
        </WidgetErrorBoundary>
      );
    case 'upcoming':
      return (
        <WidgetErrorBoundary widgetName="الفواتير القادمة">
          <UpcomingBills bills={data.upcomingBills} />
        </WidgetErrorBoundary>
      );
    case 'topExpenses':
      return (
        <WidgetErrorBoundary widgetName="أعلى المصروفات">
          <TopExpenses categoryBreakdown={data.categoryBreakdown} />
        </WidgetErrorBoundary>
      );
    case 'balance':
      return (
        <WidgetErrorBoundary widgetName="بطاقة الرصيد">
          <HeroBalanceCard balance={data.balance} prediction={data.prediction} />
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
            <IncomeExpenseCards income={monthlyStats.income} expense={monthlyStats.expense} />
          </div>
        </WidgetErrorBoundary>
      );
    case 'netWorth':
      return (
        <WidgetErrorBoundary widgetName="اتجاه صافي الثروة">
          <NetWorthTrend
            key={`nw-trend-${data.nwPeriod}-${data.netWorthHistory?.length}-${data.balance}`}
            data={data.netWorthHistory || []}
            period={data.nwPeriod}
            onPeriodChange={data.setNwPeriod}
          />
        </WidgetErrorBoundary>
      );
    case 'alerts':
      return (
        <WidgetErrorBoundary widgetName="مركز التنبيهات">
          <AlertsCenter anomalies={data.anomalies} balance={data.balance} prediction={data.prediction} />
        </WidgetErrorBoundary>
      );
    case 'insights':
      return (
        <WidgetErrorBoundary widgetName="التحليلات والتوصيات">
          <Insights recommendations={data.recommendations} monthlyStats={monthlyStats} />
        </WidgetErrorBoundary>
      );
    case 'charts':
      return (
        <WidgetErrorBoundary widgetName="الرسوم البيانية">
          <DashboardCharts categoryBreakdown={data.categoryBreakdown} monthlyStats={monthlyStats} />
        </WidgetErrorBoundary>
      );
    case 'pulse':
    case 'aiPulse':
      return (
        <WidgetErrorBoundary widgetName="نبض الذكاء المالي">
          <AIPulse sustainability={data.sustainability} />
        </WidgetErrorBoundary>
      );
    case 'habitStreak':
      return (
        <WidgetErrorBoundary widgetName="سلسلة العادات">
          <HabitStreak streak={data.streak} />
        </WidgetErrorBoundary>
      );
    case 'dailyTip':
      return <DailyTipCard tip={dailyTip} />;
    case 'quickAccess':
      return <QuickAccess />;
    case 'recent':
      return (
        <WidgetErrorBoundary widgetName="آخر المعاملات">
          <RecentTransactions transactions={data.recentTransactions} />
        </WidgetErrorBoundary>
      );
    case 'economic':
    case 'economicPulse':
      return (
        <WidgetErrorBoundary widgetName="المؤشرات الاقتصادية">
          <PulseStrip kind="economic" economic={data.marketData?.economic} />
        </WidgetErrorBoundary>
      );
    case 'crypto':
    case 'cryptoPulse':
      return (
        <WidgetErrorBoundary widgetName="سوق الكريبتو">
          <PulseStrip kind="crypto" crypto={data.marketData?.crypto} />
        </WidgetErrorBoundary>
      );
    case 'news':
    case 'newsPulse':
      return (
        <WidgetErrorBoundary widgetName="الأخبار المالية">
          <PulseStrip kind="news" news={data.marketData?.news} />
        </WidgetErrorBoundary>
      );
    case 'currencies':
    case 'currencyPulse':
      return (
        <WidgetErrorBoundary widgetName="أسعار العملات">
          <PulseStrip kind="currency" />
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
}

export default DashboardSection;
