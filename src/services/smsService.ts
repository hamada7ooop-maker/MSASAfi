/**
 * SMS Service - Extracts financial data from bank SMS messages.
 */

export interface SMSResult {
  amount: number;
  description: string;
  type: 'income' | 'expense';
}

export function parseSMS(text: string): SMSResult | null {
  if (!text || text.length < 5) return null;

  const lower = text.toLowerCase();
  
  // 1. Extract Amount
  // Matches: 123.45, 1,234.56, 12500.00, 123٫45
  const amountRegex = /\b(\d{1,3}(?:,\d{3})*|\d+)(?:[.,٫](\d{1,2}))?\b/g;
  const matches = text.match(amountRegex);
  let amount = 0;
  
  if (matches) {
    // Convert to proper float values
    const nums = matches.map(m => {
      const normalized = m.replace(/,/g, '').replace(/٫/g, '.');
      return parseFloat(normalized);
    }).filter(n => !isNaN(n) && n > 0 && n < 10000000);
    if (nums.length > 0) {
      amount = nums[0];
    }
  }

  // 2. Identify Type
  let type: 'income' | 'expense' = 'expense';
  const incomeKeywords = ['deposited', 'received', 'credited', 'إيداع', 'تم استلام', 'تم إضافة'];
  if (incomeKeywords.some(k => lower.includes(k))) {
    type = 'income';
  }

  // 3. Extract Merchant/Description
  let description = '';
  
  // Common pattern: "at [Merchant] on [Date]"
  const merchantMatch = text.match(/(?:at|in|from|لدى|في)\s+([^,.\n]+)(?:\s+on|\s+at|\s+بتاريخ|$)/i);
  if (merchantMatch && merchantMatch[1]) {
    description = merchantMatch[1].trim();
  } else {
    // Fallback: Use the first 30 chars
    description = text.slice(0, 30) + (text.length > 30 ? '...' : '');
  }

  return { amount, description, type };
}
