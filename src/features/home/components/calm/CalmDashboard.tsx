import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/index';
import { useHomeData } from '../../hooks/useHomeData';
import { CalmHero } from './CalmHero';
import { CalmStats } from './CalmStats';
import { CalmActivity } from './CalmActivity';
import '@/styles/calm.css';

interface CalmDashboardProps {
  /** Switches back to the classic dashboard. */
  onExit: () => void;
}

/**
 * "Calm Premium" dashboard — a living prototype.
 *
 * Deliberately renders 4 focused surfaces instead of the classic dashboard's
 * ~55 widgets. The hierarchy is: one hero, a quiet stats tier, activity, and
 * a small action row. Everything else moves behind navigation.
 *
 * It reuses useHomeData() unchanged, so both dashboards read identical data.
 */
export function CalmDashboard({ onExit }: CalmDashboardProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const {
    balance,
    monthlyStats,
    recentTransactions,
    financialScore,
    allBudgets,
    isLoading,
  } = useHomeData();

  const { safeToday, daysLeft, budgetUsedPct } = useMemo(() => {
    const now = new Date();
    const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remaining = Math.max(1, total - now.getDate() + 1);

    const income = monthlyStats?.income || 0;
    const expense = monthlyStats?.expense || 0;

    // Prefer the user's own budget ceiling; fall back to income, then balance.
    const ceiling = (allBudgets || []).reduce(
      (sum, b) => sum + (Number(b.limit) || 0),
      0
    );
    const envelope = ceiling > 0 ? ceiling : (income > 0 ? income : Math.max(0, balance));

    const left = Math.max(0, envelope - expense);

    return {
      safeToday: left / remaining,
      daysLeft: remaining,
      budgetUsedPct: ceiling > 0 ? (expense / ceiling) * 100 : null,
    };
  }, [monthlyStats, allBudgets, balance]);

  if (isLoading) {
    return (
      <div className="calm min-h-screen" style={{ padding: 'var(--calm-s4)' }}>
        <div
          className="calm-card"
          style={{ height: 210, borderRadius: 'var(--calm-radius-lg)' }}
        />
      </div>
    );
  }

  return (
    <div
      className="calm min-h-screen"
      style={{
        padding: 'var(--calm-s4)',
        paddingBottom: 'calc(var(--calm-s6) * 2.5)',
      }}
    >
      <header className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[0.72rem]" style={{ color: 'var(--calm-ink-faint)' }}>
            {new Intl.DateTimeFormat('ar', { weekday: 'long', day: 'numeric', month: 'long' })
              .format(new Date())}
          </p>
          <h1 className="text-[1.35rem] font-black" style={{ letterSpacing: '-0.02em' }}>
            {t('home.greeting') || 'أهلاً بك'}
          </h1>
        </div>

        <button
          type="button"
          onClick={onExit}
          className="text-[0.72rem] font-semibold px-3 py-2 rounded-full calm-card"
          style={{ color: 'var(--calm-ink-soft)' }}
        >
          {t('home.classicView') || 'العرض الكلاسيكي'}
        </button>
      </header>

      <div className="calm-stagger" style={{ display: 'grid', gap: 'var(--calm-s3)' }}>
        <CalmHero
          balance={balance}
          safeToday={safeToday}
          daysLeft={daysLeft}
          score={financialScore ?? 0}
        />

        <CalmStats
          income={monthlyStats?.income || 0}
          expense={monthlyStats?.expense || 0}
          budgetUsedPct={budgetUsedPct}
        />

        <CalmActivity transactions={recentTransactions} />

        <div className="grid grid-cols-2 gap-3">
          <Action
            icon="add"
            label={t('home.addTransaction') || 'إضافة حركة'}
            primary
            onClick={() => navigate('/transactions/add')}
          />
          <Action
            icon="insights"
            label={t('nav.reports') || 'التقارير'}
            onClick={() => navigate('/reports')}
          />
        </div>
      </div>
    </div>
  );
}

function Action({
  icon, label, onClick, primary = false,
}: { icon: string; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={primary ? '' : 'calm-card'}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '0.95rem',
        borderRadius: 'var(--calm-radius)',
        fontWeight: 700,
        fontSize: '0.84rem',
        ...(primary
          ? { background: 'var(--calm-accent)', color: '#fff', border: 'none' }
          : { color: 'var(--calm-ink)' }),
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">
        {icon}
      </span>
      {label}
    </button>
  );
}
