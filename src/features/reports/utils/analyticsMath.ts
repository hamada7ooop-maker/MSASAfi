import type { Account, Transaction } from '../../../types';

export function getEffectiveAmount(t: Transaction): number {
  let amt = t.amount || 0;
  if (t.shared && t.splitBy && t.splitBy > 1) {
    amt = amt / t.splitBy;
  }
  return amt;
}

export function getPrevMonthDates(): { start: string; end: string } {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end };
}

export function calculateTotalWealth(accounts: Account[]): number {
  return accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
}

export function calculateCurrentMonthExpenses(activeTxns: Transaction[]): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  return activeTxns
    .filter((t) => {
      const d = new Date(t.date || t.createdAt || Date.now());
      return t.type === 'expense' && d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    })
    .reduce((sum, t) => sum + getEffectiveAmount(t), 0);
}

export function calculateFreedomData(totalWealth: number, baselineMonthlyExpense: number) {
  const annualExpenses = baselineMonthlyExpense * 12;
  const requiredCapital = annualExpenses / 0.04; // 4% rule (25x annual expenses)
  const score = requiredCapital > 0 ? Math.min((totalWealth / requiredCapital) * 100, 100) : 0;
  const monthsOfSecurity = baselineMonthlyExpense > 0 ? totalWealth / baselineMonthlyExpense : 0;

  return {
    requiredCapital,
    score,
    monthsOfSecurity,
    annualExpenses,
  };
}

export function calculateDayOfWeekSpending(activeTxns: Transaction[]): number[] {
  const days = [0, 0, 0, 0, 0, 0, 0]; // Sun to Sat
  activeTxns
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const d = new Date(t.date || t.createdAt || Date.now());
      days[d.getDay()] += getEffectiveAmount(t);
    });
  return days;
}

export function calculateTimeOfDaySpending(activeTxns: Transaction[]) {
  const times = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  activeTxns
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const d = new Date(t.date || t.createdAt || Date.now());
      const hour = d.getHours();
      const amt = getEffectiveAmount(t);

      if (hour >= 5 && hour < 12) times.morning += amt;
      else if (hour >= 12 && hour < 17) times.afternoon += amt;
      else if (hour >= 17 && hour < 21) times.evening += amt;
      else times.night += amt;
    });

  const total = Object.values(times).reduce((s, v) => s + v, 0) || 1;
  return {
    morning: (times.morning / total) * 100,
    afternoon: (times.afternoon / total) * 100,
    evening: (times.evening / total) * 100,
    night: (times.night / total) * 100,
    amounts: times,
  };
}

export function calculateSeasonalSpending(activeTxns: Transaction[]) {
  const seasons = { winter: 0, spring: 0, summer: 0, autumn: 0 };
  activeTxns
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const d = new Date(t.date || t.createdAt || Date.now());
      const m = d.getMonth();
      const amt = getEffectiveAmount(t);

      if (m === 11 || m === 0 || m === 1) seasons.winter += amt;
      else if (m >= 2 && m <= 4) seasons.spring += amt;
      else if (m >= 5 && m <= 7) seasons.summer += amt;
      else seasons.autumn += amt;
    });

  const total = Object.values(seasons).reduce((s, v) => s + v, 0) || 1;
  return {
    winter: (seasons.winter / total) * 100,
    spring: (seasons.spring / total) * 100,
    summer: (seasons.summer / total) * 100,
    autumn: (seasons.autumn / total) * 100,
    amounts: seasons,
  };
}

export function calculateNeedsVsWants(activeTxns: Transaction[]) {
  let needs = 0;
  let wants = 0;
  const needsCategories = [
    'groceries',
    'housing',
    'transport',
    'health',
    'bills',
    'education',
    'مواد غذائية',
    'سكن',
    'مواصلات',
    'صحة',
    'فواتير',
    'تعليم',
  ];

  activeTxns
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const cat = (t.category || '').toLowerCase();
      const isNeed = needsCategories.some((nc) => cat.includes(nc));
      const amt = getEffectiveAmount(t);

      if (isNeed) needs += amt;
      else wants += amt;
    });

  const total = needs + wants || 1;
  return {
    needsPct: (needs / total) * 100,
    wantsPct: (wants / total) * 100,
    needs,
    wants,
  };
}

export function calculateWastedSpending(activeTxns: Transaction[]) {
  let wasted = 0;
  activeTxns
    .filter((t) => t.type === 'expense' && (t.mood === 'impulse' || t.mood === 'stressed' || t.mood === 'sad'))
    .forEach((t) => {
      wasted += getEffectiveAmount(t);
    });

  const totalExp =
    activeTxns
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + getEffectiveAmount(t), 0) || 1;

  return {
    amount: wasted,
    rate: (wasted / totalExp) * 100,
  };
}

export function calculateMoodSpending(activeTxns: Transaction[]) {
  const moods = {
    happy: { amount: 0, count: 0 },
    sad: { amount: 0, count: 0 },
    stressed: { amount: 0, count: 0 },
    tired: { amount: 0, count: 0 },
    neutral: { amount: 0, count: 0 },
  };

  activeTxns
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const m = (t.mood || 'neutral') as keyof typeof moods;
      const amt = getEffectiveAmount(t);

      if (moods[m]) {
        moods[m].amount += amt;
        moods[m].count += 1;
      }
    });

  const total = Object.values(moods).reduce((s, v) => s + v.amount, 0) || 1;

  let highestMood = 'neutral';
  let maxAmt = 0;
  Object.entries(moods).forEach(([k, v]) => {
    if (k !== 'neutral' && v.amount > maxAmt) {
      maxAmt = v.amount;
      highestMood = k;
    }
  });

  return {
    moods,
    total,
    highestMood,
    hasEmotionalSpending: maxAmt > 0,
  };
}

export function calculatePeriodComparison(
  activeTxns: Transaction[],
  compareStartA: string,
  compareEndA: string,
  compareStartB: string,
  compareEndB: string
) {
  const filterAndSum = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endStr);
    end.setHours(23, 59, 59, 999);

    let income = 0;
    let expense = 0;
    const categories: Record<string, { amount: number; count: number }> = {};

    activeTxns.forEach((t) => {
      const d = new Date(t.date || t.createdAt || Date.now());
      if (d >= start && d <= end) {
        const amt = getEffectiveAmount(t);

        if (t.type === 'income') {
          income += amt;
        } else if (t.type === 'expense') {
          expense += amt;
          const cat = t.category || 'أخرى';
          if (!categories[cat]) categories[cat] = { amount: 0, count: 0 };
          categories[cat].amount += amt;
          categories[cat].count += 1;
        }
      }
    });

    return { income, expense, categories, net: income - expense };
  };

  const periodA = filterAndSum(compareStartA, compareEndA);
  const periodB = filterAndSum(compareStartB, compareEndB);

  const allCategories = Array.from(
    new Set([...Object.keys(periodA.categories), ...Object.keys(periodB.categories)])
  );

  const categoryComparison = allCategories
    .map((cat) => {
      const amtA = periodA.categories[cat]?.amount || 0;
      const amtB = periodB.categories[cat]?.amount || 0;
      const countA = periodA.categories[cat]?.count || 0;
      const countB = periodB.categories[cat]?.count || 0;

      const diff = amtA - amtB;
      const pctChange = amtB > 0 ? (diff / amtB) * 100 : amtA > 0 ? 100 : 0;

      return {
        category: cat,
        amtA,
        amtB,
        countA,
        countB,
        diff,
        pctChange,
      };
    })
    .sort((a, b) => b.amtA - a.amtA);

  return {
    periodA,
    periodB,
    categoryComparison,
  };
}

export function calculateHeatmapData(
  activeTxns: Transaction[],
  heatmapYear: number,
  heatmapMonth: number
) {
  const totalDays = new Date(heatmapYear, heatmapMonth + 1, 0).getDate();
  const firstDayIndex = new Date(heatmapYear, heatmapMonth, 1).getDay();

  const dailySpending: Record<number, { amount: number; count: number }> = {};
  for (let d = 1; d <= totalDays; d++) {
    dailySpending[d] = { amount: 0, count: 0 };
  }

  activeTxns
    .filter((t) => {
      const d = new Date(t.date || t.createdAt || Date.now());
      return t.type === 'expense' && d.getFullYear() === heatmapYear && d.getMonth() === heatmapMonth;
    })
    .forEach((t) => {
      const d = new Date(t.date || t.createdAt || Date.now()).getDate();
      const amt = getEffectiveAmount(t);

      if (dailySpending[d]) {
        dailySpending[d].amount += amt;
        dailySpending[d].count += 1;
      }
    });

  const maxDailySpend = Math.max(...Object.values(dailySpending).map((x) => x.amount), 1);

  return {
    totalDays,
    firstDayIndex,
    dailySpending,
    maxDailySpend,
  };
}
