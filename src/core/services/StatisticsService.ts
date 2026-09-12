import { db } from '../db/core';
import { silentFail } from '../utils';
import type { Budget, Debt } from '../../types';

export interface MonthlySummary {
  income: number;
  expense: number;
  net: number;
  count: number;
  breakdown: Record<string, number>;
  weekly: { 
    income: number; 
    expense: number; 
    net: number; 
  };
}

export const StatisticsService = {
  
  /**
   * Calculates a comprehensive monthly summary.
   */
  async getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
    const mStr = String(month + 1).padStart(2, '0');
    const lastDay = new Date(year, month + 1, 0).getDate();
    const start = `${year}-${mStr}-01`;
    const end = `${year}-${mStr}-${String(lastDay).padStart(2, '0')}`;
    
    const all = await db.transactions.toArray();
    const txns = all.filter(t => {
      if (t.isDraft || t.isDeleted) return false;
      const d = t.date || (t.createdAt ? String(t.createdAt).slice(0, 10) : '');
      return d >= start && d <= end;
    });

    const income = txns
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    
    const expense = txns
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => {
        let amt = Number(t.amount) || 0;
        if (t.shared && t.splitBy && t.splitBy > 1) amt = amt / t.splitBy;
        return sum + amt;
      }, 0);

    const breakdown: Record<string, number> = {};
    txns.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category || 'other';
      let amt = Number(t.amount) || 0;
      if (t.shared && t.splitBy && t.splitBy > 1) amt = amt / t.splitBy;
      breakdown[cat] = (breakdown[cat] || 0) + amt;
    });

    // Weekly trend for the dashboard (relative to current time)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0,0,0,0);
    const weeklyTxns = txns.filter(t => new Date(t.date || t.createdAt!) >= weekStart);
    const weeklyIncome = weeklyTxns.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const weeklyExpense = weeklyTxns.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);

    return {
      income,
      expense,
      net: income - expense,
      count: txns.length,
      breakdown,
      weekly: { 
        income: weeklyIncome, 
        expense: weeklyExpense, 
        net: weeklyIncome - weeklyExpense 
      }
    };
  },

  /**
   * Gets summary for the previous month.
   */
  async getPreviousMonthSummary(year: number, month: number) {
    let pYear = year;
    let pMonth = month - 1;
    if (pMonth < 0) {
      pMonth = 11;
      pYear--;
    }
    return this.getMonthlySummary(pYear, pMonth);
  },

  /**
   * Calculates net for the last 7 days.
   */
  async getWeeklyTrend() {
    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 6);
    weekAgo.setHours(0, 0, 0, 0);
    
    const startDate = weekAgo.toISOString().slice(0, 10);
    const endDate = now.toISOString().slice(0, 10);

    const all = await db.transactions.toArray();
    const txns = all.filter(t => {
      if (t.isDraft || t.isDeleted) return false;
      const d = t.date || (t.createdAt ? String(t.createdAt).slice(0, 10) : '');
      return d >= startDate && d <= endDate;
    });

    const income = txns
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
    const expense = txns
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => {
        let amt = Number(t.amount) || 0;
        if (t.shared && t.splitBy && t.splitBy > 1) amt = amt / t.splitBy;
        return sum + amt;
      }, 0);

    return {
      income,
      expense,
      net: income - expense
    };
  },

  /**
   * Calculates net worth history for the last X months.
   */
  async getNetWorthHistory(months: number = 6, currentBalance?: number, currentOwed?: number) {
    const { AccountRepository } = await import('../db/repositories/accounts');
    const { DebtRepository } = await import('../db/repositories/debts');
    
    const balance = Number(currentBalance !== undefined ? currentBalance : await AccountRepository.getTotalBalance()) || 0;
    let owed = Number(currentOwed) || 0;
    if (currentOwed === undefined) {
      const debts = await DebtRepository.getAll();
      owed = debts.reduce((sum, d) => sum + (Number(d.total || 0) - Number(d.paid || 0)), 0);
    }
    
    const currentNetWorth = balance - owed;
    const results = [];
    const now = new Date();
    
    // Calculate the start date boundary to only pull relevant historical transactions
    const startBoundDate = new Date(now.getFullYear(), now.getMonth() - months, 1).toISOString().slice(0, 10);
    
    // Fetch only transactions from that boundary forward
    const allTxns = await db.transactions
      .where('date')
      .aboveOrEqual(startBoundDate)
      .filter(t => !t.isDraft && !t.isDeleted)
      .toArray();
    
    const lang = localStorage.getItem('masarifi_lang') || 'ar';
    const locale = lang === 'ar' ? 'ar-SA' : 'en-US';

    try {
      // 1. Calculate historical points (start of each month)
      for (let i = months; i >= 1; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        let label = '';
        try {
          label = date.toLocaleString(locale, { month: 'short' });
        } catch (e) {
          label = date.toLocaleString('en-US', { month: 'short' });
        }
        
        const txnsSince = allTxns.filter(t => {
          const tDate = new Date(t.date || t.createdAt || Date.now());
          return !isNaN(tDate.getTime()) && tDate.getTime() >= date.getTime();
        });

        const incomeSince = txnsSince.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const expenseSince = txnsSince.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
        
        const historicalNW = (currentNetWorth || 0) - ((incomeSince || 0) - (expenseSince || 0));
        
        results.push({
          label,
          value: Number.isFinite(historicalNW) ? Math.round(historicalNW) : (currentNetWorth || 0),
          timestamp: date.getTime()
        });
      }

      // 2. Add "Current" point (Today)
      let todayLabel = '';
      try {
        todayLabel = now.toLocaleString(locale, { month: 'short', day: 'numeric' });
      } catch (e) {
        todayLabel = 'Today';
      }
      
      results.push({
        label: todayLabel,
        value: Math.round(currentNetWorth || 0),
        timestamp: now.getTime()
      });

    } catch (err) {
      silentFail('[StatisticsService] getNetWorthHistory error')(err);
      results.push({ label: 'Now', value: Math.round(currentNetWorth || 0), timestamp: Date.now() });
    }
    
    return results;
  },

  /**
   * Calculates a baseline financial health score (0-100) based on income, expenses, budgets, savings, and debts.
   */
  calculateFinancialScore(data: {
    monthStats?: { income?: number; expense?: number };
    budgets?: Budget[];
    savings?: number;
    debts?: Debt[];
  }): number {
    return calculateFinancialScore(data);
  }
};

export function calculateFinancialScore(data: {
  monthStats?: { income?: number; expense?: number };
  budgets?: Budget[];
  savings?: number;
  debts?: Debt[];
}): number {
  const { monthStats = {}, budgets = [], savings = 0, debts = [] } = data;
  let score = 50;

  const income = monthStats.income || 0;
  const expense = monthStats.expense || 0;
  
  if (income > 0) {
    const sr = (income - expense) / income;
    if (sr >= 0.2) score += 20;
    else if (sr > 0) score += 10;
    else if (sr < 0) score -= 20; 
  } else if (expense > 0) {
    score -= 15; 
  }

  if (budgets.length > 0) {
    const totalLimits = budgets.reduce((sum, b) => sum + (Number(b.limit) || 0), 0);
    if (totalLimits > 0) {
      if (expense <= totalLimits * 0.8) score += 15;
      else if (expense <= totalLimits) score += 5;
      else score -= 10;
    }
  }

  if (savings < 0) {
    score -= 30; 
  } else if (savings > 0) {
    score += 10;
  }
  
  const totalDebts = debts
    .filter(d => d.type === 'owed')
    .reduce((sum, d) => sum + Math.max(0, (Number(d.total) || 0) - (Number(d.paid) || 0)), 0);
    
  if (totalDebts > 0 && totalDebts > savings) score -= 10;
  else if (totalDebts === 0) score += 5;

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  return finalScore;
}

