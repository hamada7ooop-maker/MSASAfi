import { fmt, getMonthName } from '../utils';
import { t, LANGUAGE_META } from '../../i18n/engine';
import { CURRENCIES } from '../currency';
import { CATEGORY_MAP } from '../categoryUtils';
import { useSettingsStore } from '../../store/settingsStore';
import { TransactionRepository } from '../db/repositories/transactions';
import { BudgetRepository } from '../db/repositories/budgets';
import { GoalRepository } from '../db/repositories/goals';
import { DebtRepository } from '../db/repositories/debts';
import { AccountRepository } from '../db/repositories/accounts';
import { StatisticsService, calculateFinancialScore } from '../services/StatisticsService';

/**
 * Builds the financial summary sent to the AI provider as system context.
 *
 * Extracted from core/gemini.ts as part of L-1. This is the single place that
 * decides **what personal data leaves the device**, so it is deliberately one
 * readable function rather than being interleaved with transport code: a
 * reviewer asking "what do we send?" should have exactly one file to read.
 */

export async function buildFinancialContext(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // 1. Fetch deterministic data via Repositories
  const [
    monthlyStats,
    allBudgets,
    allGoals,
    allDebts,
    totalBalance,
    recentTxnsList
  ] = await Promise.all([
    StatisticsService.getMonthlySummary(year, month),
    BudgetRepository.getAll(),
    GoalRepository.getAll(),
    DebtRepository.getAll(),
    AccountRepository.getTotalBalance(),
    TransactionRepository.getAll(10)
  ]);

  const currency = useSettingsStore.getState().baseCurrency || 'SAR';
  const monthName = getMonthName(month);
  const financialScore = calculateFinancialScore({
    monthStats: monthlyStats,
    budgets: allBudgets,
    savings: totalBalance,
    debts: allDebts
  });

  const getAiCatLabel = (cat: string): string => {
    const catId = Object.keys(CATEGORY_MAP).find(k => (CATEGORY_MAP as Record<string, string>)[k] === cat);
    if (catId) return t(`ai.cat.${catId}`) || cat;
    return cat;
  };

  // Format Category Breakdown
  const catBreakdown = Object.entries(monthlyStats.breakdown || {})
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 6)
    .map(([c, a]) => `${getAiCatLabel(c)}: ${fmt(a as number)}`)
    .join(', ');

  // Format Recent Transactions
  const recentTxnsText = recentTxnsList.map(tx => {
    const date = tx.date ? tx.date.substring(0, 10) : '?';
    const cat = getAiCatLabel(tx.category);
    const typeLabel = tx.type === 'income' ? '+' : '-';
    return `${date} ${typeLabel}${fmt(tx.amount)} ${cat}${tx.description ? ' (' + tx.description + ')' : ''}`;
  }).join('\n');

  // Format Budgets
  const budgetStatus = allBudgets.slice(0, 5).map(b => {
    const spent = monthlyStats.breakdown[b.category] || 0;
    const pct = b.limit > 0 ? Math.round(spent / b.limit * 100) : 0;
    return `${getAiCatLabel(b.category)}: ${fmt(spent)}/${fmt(b.limit)} (${pct}%)${pct >= 100 ? ' ❌' : ''}`;
  }).join(', ');

  // Format Goals & Debts
  const activeGoals = allGoals.filter(g => (g.saved || 0) < g.target)
    .map(g => `${g.name || (g as { title?: string }).title || ''}: ${fmt(g.saved || 0)}/${fmt(g.target)}`).join(', ');
  
  const activeDebts = allDebts.filter(d => (Number(d.paid) || 0) < Number(d.total))
    .map(d => `${d.name}: ${fmt(Number(d.total) - (Number(d.paid) || 0))} remaining`).join(', ');

  const currentLangCode = useSettingsStore.getState().language || 'ar';
  const currentLangMeta = (LANGUAGE_META as Record<string, { name?: string; nameEn?: string }>)[currentLangCode];
  const currentLangName = currentLangMeta?.nameEn || currentLangMeta?.name || 'Arabic';

  // Work Hours Context
  const { hourlyRate: hRate, isWorkHoursEnabled } = useSettingsStore.getState();
  const hourlyRate = isWorkHoursEnabled ? (hRate || 0) : 0;
  const debtInHours = hourlyRate > 0 ? (allDebts.filter(d => (Number(d.total) - (Number(d.paid) || 0)) > 0).reduce((s, d) => s + (Number(d.total) - (Number(d.paid) || 0)), 0) / hourlyRate).toFixed(1) : '0';

  // App Knowledge Strings
  const currencyCount = Object.keys(CURRENCIES).length;
  const langCount = Object.keys(LANGUAGE_META).length;

  return `${t('ai.prompt.identity')}

═══ APP KNOWLEDGE ═══
🌍 Languages: ${langCount} | 💱 Currencies: ${currencyCount}
${t('ai.prompt.features')}
👤 Context: Language=${currentLangName}, Currency=${currency}, HourlyRate=${hourlyRate}

═══ DETERMINISTIC FINANCIAL TRUTH (DO NOT CONTRADICT THIS) ═══
📊 Financial Health Score: ${financialScore}/100
💰 Current Total Balance: ${fmt(totalBalance)} ${currency}
🗓️ Month: ${monthName} ${year}
📈 Monthly Income: ${fmt(monthlyStats.income)}
📉 Monthly Expense: ${fmt(monthlyStats.expense)}
🏦 Monthly Net: ${fmt(monthlyStats.net)}
🏷️ Top Categories: ${catBreakdown || 'None'}
🎯 Budget Status: ${budgetStatus || 'None'}
⭐ Active Goals: ${activeGoals || 'None'}
💳 Active Debts: ${activeDebts || 'None'}
⏳ Work Hours to clear Debt: ${debtInHours}h

═══ RECENT ACTIVITY ═══
${recentTxnsText || 'No recent activity'}

═══ AI ADVISOR RULES ═══
1. ALWAYS reply in ${currentLangName}.
2. Be CONCISE but insightful.
3. Your advice MUST align with the Financial Health Score of ${financialScore}.
4. Use ${currency} for all amounts.
5. If HourlyRate > 0, occasionally mention how many work hours a purchase costs to add perspective.
6. If score < 50, be firm and cautionary. If > 80, be encouraging.
`;
}

// ─── Generic HTTP helper ──────────────────────────────────────────────────────


