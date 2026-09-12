import { classifyTransactionSmart } from './classification';
import type { Transaction } from '@/types';

export async function parseVoiceInput(text: string): Promise<{
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
} | null> {
  if (!text) return null;
  
  // Normalize Arabic numerals to Latin digits
  const normalizedText = text.replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 1632));
  
  // Extract numbers
  const numberRegex = /(\d+[.,]?\d*)/g;
  const matches = normalizedText.match(numberRegex);
  let amount = 0;
  if (matches && matches.length > 0) {
    amount = parseFloat(matches[0].replace(',', ''));
  }
  
  // Remove amount from text to get description
  let description = normalizedText.replace(numberRegex, '').replace(/\s+/g, ' ').trim();
  
  // Clean up common prefixes and units
  const cleanWords = ['دفعت', 'صرفت', 'اشتريت', 'دخل', 'إيداع', 'ريال', 'درهم', 'دولار', 'جنيه', 'SAR', 'AED', 'USD', 'EGP', 'ريالاً', 'درهماً'];
  for (const word of cleanWords) {
    description = description.replace(new RegExp(`\\b${word}\\b`, 'g'), '');
  }
  description = description.replace(/\s+/g, ' ').trim();
  if (!description) {
    description = text; // fallback
  }
  
  // Determine type: income vs expense
  let type: 'income' | 'expense' = 'expense';
  const incomeKeywords = ['دخل', 'راتب', 'جاني', 'إيداع', 'كسبت', 'ربحت', 'salary', 'income', 'deposit'];
  if (incomeKeywords.some(kw => text.toLowerCase().includes(kw))) {
    type = 'income';
  }
  
  // Classify category smart
  const category = await classifyTransactionSmart(description);
  
  return {
    amount,
    description,
    category,
    type
  };
}

export interface DetectedSubscription {
  description: string;
  amount: number;
  category: string;
  period: 'weekly' | 'monthly';
  confidence: 'high' | 'medium';
}

export function detectSubscriptions(transactions: Transaction[]): DetectedSubscription[] {
  const expenses = transactions.filter(t => t.type === 'expense' && !t.isDraft);
  const groups: Record<string, Transaction[]> = {};
  
  // Group by normalized description (lowercase, no numbers/spaces)
  expenses.forEach(e => {
    const key = (e.description || '').toLowerCase().replace(/[\d\s\W]+/g, '');
    if (key.length >= 3) {
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    }
  });
  
  const subscriptions: DetectedSubscription[] = [];
  
  for (const [, list] of Object.entries(groups)) {
    if (list.length < 2) continue;
    
    // Sort by date ascending
    const sorted = [...list].sort((a, b) => new Date(a.date || a.createdAt || Date.now()).getTime() - new Date(b.date || b.createdAt || Date.now()).getTime());
    
    // Calculate time differences
    const diffs: number[] = [];
    const amounts: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const d1 = new Date(sorted[i-1].date || sorted[i-1].createdAt || Date.now());
      const d2 = new Date(sorted[i].date || sorted[i].createdAt || Date.now());
      const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      diffs.push(diffDays);
      amounts.push(Number(sorted[i].amount) || 0);
    }
    
    // Check if amounts are consistent
    const avgAmount = list.reduce((s, e) => s + (Number(e.amount) || 0), 0) / list.length;
    const consistentAmount = avgAmount > 0 && list.every(e => Math.abs((Number(e.amount) || 0) - avgAmount) / avgAmount < 0.1);
    
    if (consistentAmount && diffs.length > 0) {
      // Check if diffs match weekly (7 days) or monthly (30 days) within +/- 3 days margin
      const isWeekly = diffs.every(d => Math.abs(d - 7) <= 2 || Math.abs(d - 14) <= 2); 
      const isMonthly = diffs.every(d => Math.abs(d - 30) <= 4 || Math.abs(d - 28) <= 4 || Math.abs(d - 31) <= 4);
      
      if (isWeekly || isMonthly) {
        const last = sorted[sorted.length - 1];
        subscriptions.push({
          description: last.description || '',
          amount: Number(last.amount) || 0,
          category: last.category,
          period: isWeekly ? 'weekly' : 'monthly',
          confidence: list.length >= 3 ? 'high' : 'medium'
        });
      }
    }
  }
  return subscriptions;
}

export function detectDuplicates(
  newTx: { amount: number; category: string; description?: string; date?: string }, 
  existingTxns: Transaction[]
): Transaction[] {
  const targetDate = newTx.date ? newTx.date.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return existingTxns.filter(t => {
    if (t.type !== 'expense' || t.isDraft) return false;
    const tDate = String(t.date || t.createdAt || '').slice(0, 10);
    if (tDate && tDate !== targetDate) return false;
    
    // Match amount and category exactly
    const sameAmount = Math.abs((Number(t.amount) || 0) - newTx.amount) < 0.01;
    const sameCategory = t.category === newTx.category;
    
    if (sameAmount && sameCategory) {
      if (newTx.description && t.description) {
        const desc1 = t.description.trim().toLowerCase();
        const desc2 = newTx.description.trim().toLowerCase();
        return desc1 === desc2 || desc1.includes(desc2) || desc2.includes(desc1);
      }
      return true;
    }
    return false;
  });
}
