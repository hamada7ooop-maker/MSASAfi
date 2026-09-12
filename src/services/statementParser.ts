import { classifyTransactionSmart } from '../ai';
import { CANONICAL_CATEGORY_OTHER } from '../core/categoryConstants';

export interface ImportedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  id?: string;
  accountName?: string;
  accountId?: string;
}

/**
 * StatementParser - Military-grade CSV parsing for financial data.
 * Designed to handle any bank format or app export with high resilience.
 */
export const StatementParser = {
  async parseCSV(file: File): Promise<ImportedTransaction[]> {
    const text = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsText(file); });
    const rows = this.smartSplitCSV(text);
    
    if (rows.length < 2) throw new Error('File is empty or invalid');

    const headers = rows[0].map(h => h.toLowerCase().trim());
    const dataRows = rows.slice(1);

    let dateIdx = -1, descIdx = -1, amountIdx = -1, debitIdx = -1, creditIdx = -1, typeIdx = -1, categoryIdx = -1, accountIdx = -1;

    // 1. Header-Based Detection (Multi-Language)
    headers.forEach((h, i) => {
      // Prioritize exact matches for critical columns
      if (['date', 'تاريخ'].some(k => h === k) || ['date', 'تاريخ', 'datum', 'fecha', 'дата', 'tarih', 'दिनांक', '日期', 'time', 'وقت'].some(k => h.includes(k))) {
        if (dateIdx === -1) dateIdx = i;
      }
      
      if (['الملاحظات', 'notes', 'note'].some(k => h === k) || ['desc', 'تفاصيل', 'البيان', 'details', 'detail', 'concept', 'causale', 'описание', 'açıklama', 'विवरण', '描述', 'الوصف', 'payee', 'merchant', 'الجهة', 'الملاحظات'].some(k => h.includes(k))) {
        if (descIdx === -1) descIdx = i;
      }

      if (['القسم', 'category'].some(k => h === k) || ['category', 'تصنيف', 'التصنيف', 'cat', 'فئة', 'فئه', 'تنسيق', 'القسم'].some(k => h.includes(k))) {
        // Prefer 'القسم' over 'القسم الرئيسي' if both exist
        if (categoryIdx === -1 || headers[categoryIdx].includes('رئيسي') || headers[categoryIdx].includes('main')) {
          categoryIdx = i;
        }
      }

      if (['account', 'محفظة', 'المحفظة', 'wallet', 'حساب'].some(k => h.includes(k))) accountIdx = i;

      if (['amount', 'مبلغ', 'قيمة', 'التكلفة'].some(k => h === k) || ['amount', 'مبلغ', 'قيمة', 'montant', 'importe', 'betrag', 'importo', 'valor', 'сумма', 'tutar', 'राशि', '金额', 'value', 'قيمه', 'التكلفة'].some(k => h.includes(k))) {
        if (amountIdx === -1) amountIdx = i;
      }

      if (['debit', 'مدين', 'سحب', 'débit', 'soll', 'debito', 'дебет', 'borç', 'नाम', '借方', 'مصروفات', 'المصروفات', 'expense', 'out', 'خرج'].some(k => h.includes(k))) {
        if (debitIdx === -1) debitIdx = i;
      }

      if (['credit', 'دائن', 'إيداع', 'crédit', 'haben', 'credito', 'кредит', 'alacak', 'जما', '贷方', 'دخل', 'الدخل', 'income', 'in', 'وارد'].some(k => h.includes(k))) {
        if (creditIdx === -1) creditIdx = i;
      }

      if (['type', 'نوع', 'tipo', 'art', 'тип', 'tür', 'प्रकार', '类型'].some(k => h.includes(k))) {
        if (typeIdx === -1) typeIdx = i;
      }
    });

    // 2. Content-Based Fallback (If headers are missing or obscure)
    if (dateIdx === -1) dateIdx = this.guessColumnByContent(dataRows, 'date');
    if (amountIdx === -1 && debitIdx === -1) amountIdx = this.guessColumnByContent(dataRows, 'amount');
    if (descIdx === -1) descIdx = dateIdx === 0 ? 1 : 0; // Default guess

    const results: ImportedTransaction[] = [];

    for (const cells of dataRows) {
      if (cells.length < 2) continue;

      let amount = 0;
      let type: 'income' | 'expense' = 'expense';

      // Amount Logic
      if (debitIdx !== -1 || creditIdx !== -1) {
        const debit = this.cleanAmount(cells[debitIdx]);
        const credit = this.cleanAmount(cells[creditIdx]);
        if (credit > 0) { amount = credit; type = 'income'; }
        else if (debit > 0) { amount = debit; type = 'expense'; }
        else {
          const raw = this.cleanAmount(cells[amountIdx]);
          amount = Math.abs(raw);
          type = raw < 0 ? 'expense' : 'income';
        }
      } else {
        const raw = this.cleanAmount(cells[amountIdx]);
        amount = Math.abs(raw);
        type = (raw < 0) ? 'expense' : 'income';
        
        // Refine type if 'Type' column exists
        if (typeIdx !== -1) {
          const tStr = cells[typeIdx].toLowerCase();
          const isIncome = ['cr', 'deposit', 'credit', 'إيداع', 'دخل', 'إيراد', 'revenu', 'virement', 'ingreso', 'einnahme', 'entrata', 'renda', 'доход', 'gelir', 'आय', '收入'].some(k => tStr.includes(k));
          type = isIncome ? 'income' : 'expense';
        }
      }

      if (isNaN(amount) || amount === 0) continue;

      const description = cells[descIdx]?.trim() || 'Imported';
      let category = 'أخرى';
      
      const providedCat = categoryIdx !== -1 ? cells[categoryIdx]?.trim() : '';
      
      if (providedCat && providedCat !== 'أخرى' && providedCat !== 'other') {
        const genericLabels = ['pos', 'purchase', 'transfer', 'payment', 'مشتريات', 'نقاط بيع', 'تحويل', 'دفعة', 'عام', 'فاتورة'];
        const isGeneric = genericLabels.some(g => providedCat.toLowerCase().includes(g));
        
        if (isGeneric) {
          const aiCat = await classifyTransactionSmart(description);
          category = aiCat !== CANONICAL_CATEGORY_OTHER ? aiCat : providedCat;
        } else {
          category = providedCat;
        }
      } else {
        category = await classifyTransactionSmart(description);
      }

      results.push({
        date: this.parseDate(cells[dateIdx]),
        description,
        amount,
        type,
        category,
        accountName: accountIdx !== -1 ? cells[accountIdx]?.trim() : undefined,
        id: Math.random().toString(36).substr(2, 9)
      });
    }

    return results;
  },

  /**
   * Cleans currency strings into numbers (handles $, €, commas, etc)
   */
  cleanAmount(raw: string): number {
    if (!raw) return 0;
    // Remove currency codes, symbols, and thousands separators (commas/spaces)
    // Keep decimal point and negative sign
    let clean = raw.replace(/[^\d.-]/g, '');
    
    // If multiple dots exist (like in some European formats 1.000,50), handle them
    if ((clean.match(/\./g) || []).length > 1) {
       // Assuming last one is decimal
       const parts = clean.split('.');
       const last = parts.pop();
       clean = parts.join('') + '.' + last;
    }

    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  },

  /**
   * Robust CSV splitter that respects quotes and multiple delimiters
   */
  smartSplitCSV(text: string): string[][] {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    return lines.map(line => {
      const result = [];
      let current = '';
      let inQuotes = false;
      const delims = [',', ';', '\t', '،'];
      const activeDelim = delims.find(d => line.includes(d)) || ',';

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === activeDelim && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  },

  /**
   * Guesses column index by scanning data samples
   */
  guessColumnByContent(rows: string[][], type: 'date' | 'amount'): number {
    if (rows.length === 0) return -1;
    const sample = rows[0];
    for (let i = 0; i < sample.length; i++) {
      const val = sample[i];
      if (type === 'date' && !isNaN(new Date(val).getTime()) && val.includesAny(['-', '/', ':'])) return i;
      if (type === 'amount' && !isNaN(parseFloat(val.replace(/[^\d.-]/g, ''))) && /[\d]/.test(val)) return i;
    }
    return -1;
  },

  /**
   * Intelligent date normalizer with multi-language support (including Arabic months)
   */
  parseDate(raw: string): string {
    if (!raw) return new Date().toISOString();
    const clean = raw.trim().replace(/["]/g, '').toLowerCase();

    // Try standard ISO/JS parsing
    const d = new Date(clean);
    if (!isNaN(d.getTime())) return d.toISOString();

    // Multi-language month mapping
    const months: Record<string, number> = {
      'يناير': 0, 'فبراير': 1, 'مارس': 2, 'ابريل': 3, 'مايو': 4, 'يونيو': 5,
      'يوليو': 6, 'أغسطس': 7, 'سبتمبر': 8, 'أكتوبر': 9, 'نوفمبر': 10, 'ديسمبر': 11,
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };

    // Detect Arabic month names
    for (const [mName, mIdx] of Object.entries(months)) {
      if (clean.includes(mName)) {
        // Format like "3 ابريل، 2026 03:08 AM"
        const dayMatch = clean.match(/(\d{1,2})/);
        const yearMatch = clean.match(/(\d{4})/);
        const timeMatch = clean.match(/(\d{1,2}:\d{2})/);
        
        if (dayMatch && yearMatch) {
          const day = parseInt(dayMatch[0]);
          const year = parseInt(yearMatch[0]);
          let hour = 0, min = 0;
          if (timeMatch) {
            const [h, m] = timeMatch[0].split(':').map(Number);
            hour = h; min = m;
            if (clean.includes('pm') && hour < 12) hour += 12;
            if (clean.includes('am') && hour === 12) hour = 0;
          }
          return new Date(year, mIdx, day, hour, min).toISOString();
        }
      }
    }

    // Handle common numeric formats
    const parts = clean.split(/[./-]/);
    if (parts.length === 3) {
      const p0 = parseInt(parts[0]), p1 = parseInt(parts[1]), p2 = parseInt(parts[2]);
      if (p0 > 1000) return new Date(p0, p1 - 1, p2).toISOString(); // YYYY-MM-DD
      if (p0 > 12) return new Date(p2.toString().length === 2 ? 2000 + p2 : p2, p1 - 1, p0).toISOString(); // DD-MM-YYYY
      return new Date(p2.toString().length === 2 ? 2000 + p2 : p2, p0 - 1, p1).toISOString(); // MM-DD-YYYY
    }
    return new Date().toISOString();
  }
};

// Extension for convenience
declare global {
  interface String {
    includesAny(keys: string[]): boolean;
  }
}
if (!String.prototype.includesAny) {
  String.prototype.includesAny = function(keys: string[]) {
    return keys.some(k => this.includes(k));
  };
}

