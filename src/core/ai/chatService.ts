import { fmt, getMonthName } from '../utils';
import { t } from '../../i18n/engine';
import { useSettingsStore } from '../../store/settingsStore';
import { CATEGORY_MAP, getKeywords, getLocalizedCategory } from './constants';
import { getRandomTip } from './analysisService';
import { generateDeepInsights } from './insightsService';
import type { Transaction, Budget, Goal } from '@/types';

export interface ChatMessageContext {
  transactions?: Transaction[];
  budgets?: Budget[];
  balance?: number;
  monthStats?: { income?: number; expense?: number; net?: number };
  goals?: Array<Goal & { title?: string }>;
}

function hasPhrase(lower: string, ...phrases: Array<string | string[] | undefined | null>): boolean {
  return phrases.flat().some((p) => p && typeof p === 'string' && lower.includes(p.toLowerCase()));
}

function categoryFromMessage(lower: string): string | null {
  const keywords = getKeywords();
  for (const [id, kwList] of Object.entries(keywords)) {
    const legacyLabel = CATEGORY_MAP[id] || '';
    if (legacyLabel && lower.includes(legacyLabel.toLowerCase())) return legacyLabel;
    if (Array.isArray(kwList)) {
      for (const kw of kwList) {
        if (kw && kw.length >= 3 && lower.includes(kw.toLowerCase())) return legacyLabel;
      }
    }
  }
  return null;
}

export async function processChatMessage(message: string, data: ChatMessageContext): Promise<string> {
  const { transactions = [], balance = 0, monthStats = {}, goals = [] } = data;
  const lower = message.toLowerCase().trim();
  const income = monthStats.income || 0;
  const expense = monthStats.expense || 0;
  const curr = useSettingsStore.getState().baseCurrency;

  const tArray = (key: string): string[] => {
    const val = t(key);
    return Array.isArray(val) ? val : [];
  };

  if (hasPhrase(lower, t('chat.q.d4').toLowerCase(), t('chat.ai.help').toLowerCase(), ...tArray('chat.triggers.identity'))) {
    return t('chat.ai.identity');
  }

  const catRequested = categoryFromMessage(lower);
  if (catRequested) {
    const targetId = Object.keys(CATEGORY_MAP).find(k => CATEGORY_MAP[k] === catRequested) || '';
    const localizedLabel = getLocalizedCategory(targetId);
    
    const spent = transactions.filter(tx => tx.type === 'expense' && tx.category === catRequested && !tx.isDeleted).reduce((s, tx) => {
      let amt = Number(tx.amount) || 0;
      if (tx.shared && tx.splitBy && tx.splitBy > 1) amt = amt / tx.splitBy;
      return s + amt;
    }, 0);
    const count = transactions.filter(tx => tx.type === 'expense' && tx.category === catRequested && !tx.isDeleted).length;

    if (spent === 0) return t('chat.ai.catZero') + localizedLabel;
    
    let msg = t('chat.ai.catSpent', { cat: localizedLabel, spent: fmt(spent), curr, count: String(count) });
    
    // Work Hours Perspective
    const { hourlyRate: hRate, isWorkHoursEnabled } = useSettingsStore.getState();
    const hr = isWorkHoursEnabled ? (hRate || 0) : 0;
    if (hr > 0) {
      const hours = (spent / hr).toFixed(1);
      msg += "\n\n⏱️ " + t('txn.workHours', { hours });
    }
    
    return msg;
  }

  if (hasPhrase(lower, t('chat.q.d1').toLowerCase(), ...tArray('chat.triggers.daily'), 'يومي', 'يومياً', 'daily')) {
    const daysRemaining = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate() + 1;
    if (balance <= 0) return t('chat.ai.dailyDeficit', { balance: fmt(balance) });
    const dailyLimit = balance / daysRemaining;
    return t('chat.ai.dailyAllow', { days: String(daysRemaining), daily: fmt(dailyLimit), curr });
  }

  if (hasPhrase(lower, t('chat.q.d2').toLowerCase(), ...tArray('chat.triggers.forecast'), 'توقع', 'توقعات', 'forecast')) {
    const daysPassed = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const avgExp = daysPassed > 0 ? expense / daysPassed : 0;
    const projected = avgExp * daysInMonth;
    let msg = t('chat.ai.projBase', { avg: fmt(avgExp), projected: fmt(projected), curr });
    if (balance < 0) msg += t('chat.ai.projNegBal', { balance: fmt(balance) });
    else if (projected > income && income > 0) msg += t('chat.ai.projOver', { delta: fmt(projected - income), curr });
    else msg += t('chat.ai.projGood', { amount: fmt(income - projected), curr });
    return msg;
  }

  if (hasPhrase(lower, t('chat.q.d0').toLowerCase(), t('chat.q.d7').toLowerCase(), t('chat.randPool.1').toLowerCase(), t('chat.randPool.2').toLowerCase(), ...tArray('chat.triggers.audit'), 'تقييم', 'فحص', 'اداء', 'audit')) {
    const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
    let rank = t('chat.ai.rankNovice');
    if (savingsRate >= 30) rank = t('chat.ai.rankPro');
    else if (savingsRate >= 15) rank = t('chat.ai.rankRising');
    let msg = t('chat.ai.auditHead', { rank, rate: String(savingsRate) });
    if (savingsRate < 0) msg += t('chat.ai.auditSpend');
    else if (savingsRate < 15) msg += t('chat.ai.auditSave');
    return msg;
  }

  if (hasPhrase(lower, t('chat.q.d3').toLowerCase(), ...tArray('chat.triggers.peak'), 'اغلى يوم', 'أغلى يوم', 'peak')) {
    const dayMap: Record<number, number> = {};
    transactions.filter(tx => tx.type === 'expense').forEach(tx => {
      const d = new Date(tx.date || tx.createdAt || Date.now()).getDate();
      dayMap[d] = (dayMap[d] || 0) + (Number(tx.amount) || 0);
    });
    const maxDay = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0];
    if (!maxDay) return t('chat.ai.noDaySpend');
    return t('chat.ai.peakDay', { day: maxDay[0], amt: fmt(maxDay[1]), curr });
  }

  if (hasPhrase(lower, ...tArray('chat.triggers.afford'), 'اشتري', 'أشتري', 'شراء', 'اقدر', 'أقدر', 'afford', 'buy')) {
    const numbers = message.match(/[\d,]+/g);
    if (numbers && balance > 0) {
      const amount = parseFloat(numbers[0].replace(/,/g, ''));
      const pct = Math.round((amount / balance) * 100);
      
      // Work Hours Check
      let workHoursMsg = "";
      const { hourlyRate: hRate, isWorkHoursEnabled } = useSettingsStore.getState();
      const hr = isWorkHoursEnabled ? (hRate || 0) : 0;
      if (hr > 0) {
        const hours = (amount / hr).toFixed(1);
        workHoursMsg = "\n\n⏱️ " + t('txn.workHours', { hours });
      }

      if (amount > balance) return t('chat.ai.rejectBuy', { amt: fmt(amount), balance: fmt(balance) }) + workHoursMsg;
      if (pct > 30) return t('chat.ai.warnBuy', { pct: String(pct) }) + workHoursMsg;
      return t('chat.ai.okBuy', { pct: String(pct) }) + workHoursMsg;
    }
  }

  if (hasPhrase(lower, ...tArray('chat.triggers.deep'))) {
    return await generateDeepInsights(data);
  }
  
  if (hasPhrase(lower, t('chat.q.d5').toLowerCase(), ...tArray('chat.triggers.summary'), 'ملخص', 'summary') && !hasPhrase(lower, 'credit report')) {
    const net = income - expense;
    const monthLabel = getMonthName(new Date().getMonth());
    const savePct = income > 0 ? String(Math.round((net / income) * 100)) : '0';
    
    let msg = t('chat.ai.monthly', {
      month: monthLabel,
      income: fmt(income),
      expense: fmt(expense),
      net: fmt(net),
      savePct,
    });

    // Work Hours Perspective
    const hRate = useSettingsStore.getState().hourlyRate;
    if (hRate > 0 && expense > 0) {
      const hours = (expense / hRate).toFixed(1);
      msg += "\n\n⏱️ " + t('txn.workHours', { hours });
    }

    return msg;
  }

  if (hasPhrase(lower, t('chat.q.d6').toLowerCase(), t('chat.randPool.0').toLowerCase(), ...tArray('chat.triggers.top'), 'اعلى', 'أعلى', 'top')) {
    const catMap: Record<string, number> = {};
    transactions.filter(tx => tx.type === 'expense').forEach(tx => {
      let amt = Number(tx.amount) || 0;
      if (tx.shared && tx.splitBy && tx.splitBy > 1) amt = amt / tx.splitBy;
      catMap[tx.category] = (catMap[tx.category] || 0) + amt;
    });
    const top = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
    if (!top) return t('chat.ai.noTopData');
    const topId = Object.keys(CATEGORY_MAP).find(k => CATEGORY_MAP[k] === top[0]) || '';
    const localizedTop = getLocalizedCategory(topId);
    return t('chat.ai.topCat', { cat: localizedTop, amt: fmt(top[1]), curr });
  }

  if (hasPhrase(lower, t('chat.randPool.3').toLowerCase(), ...tArray('chat.triggers.gifts'), 'هدايا', 'هدية', 'gifts')) {
    const giftExp = transactions.filter(t => t.type === 'expense' && (t.category === 'هدايا' || t.category === 'gifts' || t.category === 'Gifts')).reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
    return t('chat.ai.giftSpent', { amt: fmt(giftExp), curr });
  }

  if (hasPhrase(lower, ...tArray('chat.triggers.goals'), 'هدف', 'أهداف', 'أهدافي', 'goal', 'goals')) {
    if (goals.length === 0) return t('chat.ai.noGoals');
    const g = goals[0];
    const target = Number(g.target) || 1;
    const saved = Number(g.saved) || 0;
    const pct = Math.round((saved / target) * 100);
    return t('chat.ai.goalProg', {
      title: g.title || g.name || '',
      pct: String(pct),
      rem: fmt(target - saved),
      curr,
    });
  }

  if (hasPhrase(lower, t('chat.q.fixedAdvice').toLowerCase(), ...tArray('chat.triggers.advice'))) {
    const fullTip = getRandomTip().text;
    const emojiRegex = /^([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2194}-\u{2199}\u{21A9}-\u{21AA}\u{3297}\u{3299}]+)\s*(.*)$/u;
    const match = fullTip.match(emojiRegex);
    let icon = '💡';
    let text = fullTip;
    if (match) {
      icon = match[1];
      text = match[2];
    }
    return t('chat.ai.adviceWrap', { icon, text });
  }

  if (hasPhrase(lower, 'zakat', 'زكاة', 'زكاتي', 'tax', 'ضريبة', 'ضرائب', 'الضريبة', 'الزكاة', t('chat.q.d8').toLowerCase(), t('chat.q.d9').toLowerCase())) {
    return t('chat.ai.goToZakat');
  }

  return t('chat.ai.help');
}
