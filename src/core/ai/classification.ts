import { db as DB } from '@/core/db/core';
import { CANONICAL_CATEGORY_OTHER } from '../categoryConstants';
import { RuleRepository } from '../db/repositories/rules';
import { CATEGORY_MAP, getKeywords } from './constants';
import { silentFail } from '../utils';
import type { Transaction } from '@/types';

export function classifyTransaction(description?: string): string {
  if (!description) return CANONICAL_CATEGORY_OTHER;
  const lower = description.toLowerCase();
  const keywords = getKeywords();
  
  for (const [id, kwList] of Object.entries(keywords)) {
    if (Array.isArray(kwList)) {
      for (const kw of kwList) {
        if (kw && lower.includes(kw.toLowerCase())) return CATEGORY_MAP[id] || CANONICAL_CATEGORY_OTHER;
      }
    }
  }
  return CANONICAL_CATEGORY_OTHER;
}

export async function classifyTransactionSmart(description: string): Promise<string> {
  if (!description || description.trim().length < 2) {
    return CANONICAL_CATEGORY_OTHER;
  }
  
  // 1. Try User-defined Rules first (Highest Priority)
  try {
    const ruleMatch = await RuleRepository.match(description);
    if (ruleMatch) return ruleMatch;
  } catch (e) {
    silentFail('[AI] Rule matching error')(e);
  }

  // 2. Try legacy heuristics
  const base = classifyTransaction(description);
  
  try {
    const learning = (await DB.getSetting<Record<string, string>>('categoryLearningMap')) || {};
    const text = description.toLowerCase();
    let best = { score: 0, category: base };
    
    for (const [token, category] of Object.entries(learning)) {
      if (text.includes(token) && token.length > best.score) {
        best = { score: token.length, category: category as string };
      }
    }
    return best.category || base;
  } catch (error) {
    silentFail('[AI] Classification error')(error);
    return base;
  }
}

export async function recordCategoryFeedback(description: string, category: string): Promise<void> {
  if (!description || !category || description.trim().length < 2) return;
  try {
    const tokens = description.toLowerCase().trim().split(/\s+/).filter(t => t.length >= 3);
    if (tokens.length === 0) return;
    
    const learning = (await DB.getSetting<Record<string, string>>('categoryLearningMap')) || {};
    for (const token of tokens) {
      learning[token] = category;
    }
    await DB.setSetting('categoryLearningMap', learning);
  } catch (e) {
    silentFail('[AI] Save category feedback error')(e);
  }
}

export function getTransactionNecessity(tx?: Partial<Transaction>): 'need' | 'want' {
  if (tx && (tx.necessity === 'need' || tx.necessity === 'want')) {
    return tx.necessity;
  }
  
  const cat = String((tx && tx.category) || '').toLowerCase();
  const needs = [
    'groceries', 'مواد غذائية',
    'housing', 'سكن',
    'bills', 'فواتير',
    'education', 'تعليم',
    'health', 'صحة',
    'transport', 'مواصلات',
    'بنزين', 'ديزل', 'وقود', 'كهرباء', 'مياه', 'صيانة', 'رواتب عمال', 'يوميات عمال', 'عمالة'
  ];
  
  const isNeed = needs.some(n => cat.includes(n.toLowerCase()));
  return isNeed ? 'need' : 'want';
}
