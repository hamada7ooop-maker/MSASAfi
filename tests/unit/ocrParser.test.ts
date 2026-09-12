import { describe, it, expect } from 'vitest';

function extractReceiptAmount(text: string, keywordsStr: string = ''): number {
  const cleanNumbers = (matches: RegExpMatchArray | null) => 
    matches ? matches.map((v) => parseFloat(v.replace(',', '.'))).filter((v) => v > 0 && v < 10000) : [];

  const keywords = [...new Set([
    'total due', 'grand total', 'total', 'amount', 'net', 'المجموع الإجمالي', 'المجموع', 'الإجمالي', 'المبلغ',
    ...keywordsStr.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  ])];

  let extractedAmount = 0;
  const lines = text.split('\n');

  // Search from bottom to top since totals are at the end of receipts
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    // Ignore lines that are explicitly 'subtotal' if we want final total
    if (line.toLowerCase().includes('subtotal')) continue;

    if (keywords.some((k) => line.toLowerCase().includes(k))) {
      const lineNums = cleanNumbers(line.match(/\b\d+([.,]\d{1,2})?\b/g));
      if (lineNums.length > 0) {
        extractedAmount = Math.max(...lineNums);
        break;
      }
    }
  }

  if (extractedAmount === 0 && text) {
    // Exclude lines with '#' (e.g. Invoice #98231)
    const validLines = lines.filter(l => !l.includes('#')).join('\n');
    const allNums = cleanNumbers(validLines.match(/\b\d+([.,]\d{1,2})?\b/g));
    if (allNums.length > 0) extractedAmount = Math.max(...allNums);
  }

  return extractedAmount;
}

describe('OCR Receipt Amount Extraction Unit Tests', () => {
  it('should extract amount associated with Total in English receipt', () => {
    const receiptText = `
      SUPERMARKET STORE #12
      Item 1   15.00
      Item 2   25.50
      Subtotal 40.50
      VAT 15%   6.08
      TOTAL DUE: 46.58 SAR
      Thank you for visiting!
    `;
    const amount = extractReceiptAmount(receiptText);
    expect(amount).toBe(46.58);
  });

  it('should extract amount associated with Arabic receipt total', () => {
    const receiptText = `
      سوبرماركت التميمي
      مشتريات بقالة: 120.00
      ضريبة القيمة المضافة 15%: 18.00
      المجموع الإجمالي: 138.00 ريال
    `;
    const amount = extractReceiptAmount(receiptText);
    expect(amount).toBe(138.00);
  });

  it('should fallback to max reasonable number if no keyword found', () => {
    const receiptText = `
      Invoice #98231
      Line: 12.50
      Line: 88.00
    `;
    const amount = extractReceiptAmount(receiptText);
    expect(amount).toBe(88.00);
  });
});
