import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StatementParser } from '../../src/services/statementParser';
import { classifyTransactionSmart } from '../../src/ai';
import { CANONICAL_CATEGORY_OTHER } from '../../src/core/categoryConstants';

vi.mock('../../src/ai', () => ({
  classifyTransactionSmart: vi.fn(),
}));

const mockClassify = vi.mocked(classifyTransactionSmart);

function csvFile(text: string): File {
  return new File([text], 'statement.csv', { type: 'text/csv' });
}

describe('StatementParser Unit Tests (statementParser.ts)', () => {
  beforeEach(() => {
    mockClassify.mockReset().mockResolvedValue(CANONICAL_CATEGORY_OTHER);
  });

  describe('cleanAmount', () => {
    it.each([
      ['1234.56', 1234.56],
      ['$1,234.56', 1234.56], // currency symbol + thousands comma
      ['SAR 250', 250],
      ['-45.20', -45.2], // negatives preserved (sign drives the type)
      ['1.000.50', 1000.5], // multi-dot: last dot is the decimal
      ['', 0],
      ['n/a', 0],
    ])('cleans %s → %s', (raw, expected) => {
      expect(StatementParser.cleanAmount(raw)).toBe(expected);
    });
  });

  describe('smartSplitCSV', () => {
    it('splits on the first delimiter found (comma)', () => {
      expect(StatementParser.smartSplitCSV('a,b,c')).toEqual([['a', 'b', 'c']]);
    });

    it('supports semicolon, tab and Arabic comma delimiters', () => {
      expect(StatementParser.smartSplitCSV('a;b;c')).toEqual([['a', 'b', 'c']]);
      expect(StatementParser.smartSplitCSV('a\tb\tc')).toEqual([['a', 'b', 'c']]);
      expect(StatementParser.smartSplitCSV('a،b،c')).toEqual([['a', 'b', 'c']]);
    });

    it('keeps quoted cells intact even when they contain the delimiter', () => {
      const rows = StatementParser.smartSplitCSV('"قهوة, لاتيه",10.5,2026-09-01');
      expect(rows[0][0]).toBe('قهوة, لاتيه');
      expect(rows[0][1]).toBe('10.5');
    });

    it('drops blank lines and trims cells', () => {
      const rows = StatementParser.smartSplitCSV(' a , b \n\n  c , d  \n');
      expect(rows).toEqual([
        ['a', 'b'],
        ['c', 'd'],
      ]);
    });
  });

  describe('guessColumnByContent', () => {
    it('finds the date column by scanning a sample row', () => {
      const rows = [['note', '2026-09-01', '42']];
      expect(StatementParser.guessColumnByContent(rows, 'date')).toBe(1);
    });

    it('finds the amount column by scanning a sample row', () => {
      const rows = [['note', 'abc', '42.5']];
      expect(StatementParser.guessColumnByContent(rows, 'amount')).toBe(2);
    });

    it('documents a heuristic weakness: a preceding date column satisfies the amount guess first', () => {
      // '2026-09-01' parses as the number 2026, so the amount scan latches
      // onto the date column when it comes first. Pinned as-is (audited
      // behavior, flagged in the audit report); a fix needs owner sign-off.
      const rows = [['note', '2026-09-01', '42.5']];
      expect(StatementParser.guessColumnByContent(rows, 'amount')).toBe(1);
    });

    it('returns -1 when nothing matches or there is no data', () => {
      expect(StatementParser.guessColumnByContent([['x', 'y']], 'date')).toBe(-1);
      expect(StatementParser.guessColumnByContent([], 'amount')).toBe(-1);
    });
  });

  describe('parseDate', () => {
    it('parses ISO dates', () => {
      expect(StatementParser.parseDate('2026-09-14')).toBe('2026-09-14T00:00:00.000Z');
    });

    it('parses Arabic month names with day, year, time and PM modifier', () => {
      const expected = new Date(2026, 3, 3, 15, 8).toISOString();
      expect(StatementParser.parseDate('3 ابريل، 2026 03:08 PM')).toBe(expected);
    });

    it('treats 12 AM as midnight', () => {
      const expected = new Date(2026, 3, 3, 0, 8).toISOString();
      expect(StatementParser.parseDate('3 ابريل، 2026 12:08 AM')).toBe(expected);
    });

    it('parses English month abbreviations', () => {
      const expected = new Date(2026, 0, 5, 0, 0).toISOString();
      expect(StatementParser.parseDate('5 Jan 2026')).toBe(expected);
    });

    it('parses DD-MM-YYYY when the first component exceeds 12', () => {
      const expected = new Date(2026, 8, 14).toISOString();
      expect(StatementParser.parseDate('14-09-2026')).toBe(expected);
    });

    it('parses MM-DD-YYYY otherwise', () => {
      const expected = new Date(2026, 8, 14).toISOString();
      expect(StatementParser.parseDate('09/14/2026')).toBe(expected);
    });

    it('expands two-digit years to 2000+', () => {
      const expected = new Date(2026, 8, 14).toISOString();
      expect(StatementParser.parseDate('14-09-26')).toBe(expected);
    });

    it('falls back to "now" for unparseable or empty input', () => {
      for (const raw of ['xyz', '']) {
        const parsed = new Date(StatementParser.parseDate(raw)).getTime();
        expect(Math.abs(Date.now() - parsed)).toBeLessThan(5000);
      }
    });
  });

  describe('parseCSV', () => {
    it('rejects files with fewer than 2 rows', async () => {
      await expect(StatementParser.parseCSV(csvFile('only,header'))).rejects.toThrow(
        'File is empty or invalid'
      );
    });

    it('parses a standard English statement: sign drives the type, ids are unique', async () => {
      const csv = [
        'Date,Description,Amount,Category',
        '2026-09-01,"Salary",5000,دخل',
        '2026-09-02,"Coffee shop",-12.5,مطاعم',
      ].join('\n');
      const txns = await StatementParser.parseCSV(csvFile(csv));

      expect(txns).toHaveLength(2);
      expect(txns[0]).toMatchObject({
        description: 'Salary',
        amount: 5000,
        type: 'income',
        category: 'دخل',
        date: '2026-09-01T00:00:00.000Z',
      });
      expect(txns[1]).toMatchObject({ amount: 12.5, type: 'expense', category: 'مطاعم' });
      expect(txns[0].id).toBeTruthy();
      expect(txns[0].id).not.toBe(txns[1].id);
    });

    it('detects Arabic headers (التاريخ/البيان/المبلغ/القسم)', async () => {
      const csv = ['التاريخ,البيان,المبلغ,القسم', '2026-09-01,رواتب,9000,دخل'].join('\n');
      const txns = await StatementParser.parseCSV(csvFile(csv));
      expect(txns[0]).toMatchObject({
        description: 'رواتب',
        amount: 9000,
        type: 'income',
        category: 'دخل',
      });
    });

    it('uses the credit/debit columns when present (credit wins → income)', async () => {
      const csv = [
        'Date,Description,Debit,Credit',
        '2026-09-01,Refund,,250',
        '2026-09-02,Grocery,80,',
      ].join('\n');
      const txns = await StatementParser.parseCSV(csvFile(csv));
      expect(txns[0]).toMatchObject({ type: 'income', amount: 250 });
      expect(txns[1]).toMatchObject({ type: 'expense', amount: 80 });
    });

    it('falls back to the signed amount when both debit and credit are empty', async () => {
      const csv = ['Date,Description,Debit,Credit,Amount', '2026-09-01,Mixed,,,-99'].join('\n');
      const txns = await StatementParser.parseCSV(csvFile(csv));
      expect(txns[0]).toMatchObject({ type: 'expense', amount: 99 });
    });

    it("refines the type from a Type column (e.g. 'إيداع' forces income)", async () => {
      const csv = ['Date,Description,Amount,Type', '2026-09-01,Transfer,300,إيداع'].join('\n');
      const txns = await StatementParser.parseCSV(csvFile(csv));
      expect(txns[0].type).toBe('income');
    });

    it("treats unrecognized Type values as expense", async () => {
      const csv = ['Date,Description,Amount,Type', '2026-09-01,Fee,300,unknown-kind'].join('\n');
      const txns = await StatementParser.parseCSV(csvFile(csv));
      expect(txns[0].type).toBe('expense');
    });

    it('keeps a specific provided category verbatim', async () => {
      const csv = ['Date,Description,Amount,Category', '2026-09-01,Bakery,-30,مخبز'].join('\n');
      const txns = await StatementParser.parseCSV(csvFile(csv));
      expect(txns[0].category).toBe('مخبز');
      expect(mockClassify).not.toHaveBeenCalled();
    });

    it('consults the AI classifier for generic categories (POS/purchase/...) and adopts its answer when it is specific', async () => {
      mockClassify.mockResolvedValue('مطاعم');
      const csv = ['Date,Description,Amount,Category', '2026-09-01,Cafe purchase,-30,POS'].join('\n');
      const txns = await StatementParser.parseCSV(csvFile(csv));
      expect(mockClassify).toHaveBeenCalledWith('Cafe purchase');
      expect(txns[0].category).toBe('مطاعم');
    });

    it('keeps the generic label when the AI classifier cannot do better', async () => {
      mockClassify.mockResolvedValue(CANONICAL_CATEGORY_OTHER);
      const csv = ['Date,Description,Amount,Category', '2026-09-01,Cafe purchase,-30,POS'].join('\n');
      const txns = await StatementParser.parseCSV(csvFile(csv));
      expect(txns[0].category).toBe('POS');
    });

    it('classifies via AI when no category column exists', async () => {
      mockClassify.mockResolvedValue('مواصلات');
      const csv = ['Date,Description,Amount', '2026-09-01,Uber ride,-22'].join('\n');
      const txns = await StatementParser.parseCSV(csvFile(csv));
      expect(txns[0].category).toBe('مواصلات');
    });

    it('skips malformed rows (too few cells) and zero amounts', async () => {
      const csv = [
        'Date,Description,Amount',
        '2026-09-01',
        '2026-09-02,Valid,-50',
        '2026-09-03,Zero,0',
        '2026-09-04,Junk,abc',
      ].join('\n');
      const txns = await StatementParser.parseCSV(csvFile(csv));
      expect(txns).toHaveLength(1);
      expect(txns[0].description).toBe('Valid');
    });

    it('captures the account/wallet column when present', async () => {
      const csv = ['Date,Description,Amount,Account', '2026-09-01,Salary,1000,الرئيسية'].join('\n');
      const txns = await StatementParser.parseCSV(csvFile(csv));
      expect(txns[0].accountName).toBe('الرئيسية');
    });

    it('documents the reverse weakness: a plain amount preceding the date hijacks the date guess (V8 quirk)', async () => {
      // new Date('-44.5') is VALID in V8 (it parses as May 1, 2044!), so the
      // content-based DATE guess latches onto the amount column when it comes
      // first. Both the date and the amount end up reading column 1: the date
      // becomes 2044-05-01 while the real date column is ignored entirely.
      // Pinned as audited behavior; flagged for a future fix decision.
      const csv = ['col_a,col_b,col_c', 'coffee,-44.5,2026-09-01'].join('\n');
      const txns = await StatementParser.parseCSV(csvFile(csv));
      expect(txns[0]).toMatchObject({
        date: new Date('-44.5').toISOString(),
        description: 'coffee',
        amount: 44.5,
        type: 'expense',
      });
    });

    it('documents the end-to-end effect of the amount-guess weakness (date-first rows)', async () => {
      // With obscure headers and the date in the FIRST column, the content
      // fallback mistakes the date for the amount (2026-09-01 → 2026), so the
      // transaction imports as an income of 2026 instead of an expense of 44.5.
      // Pinned as audited behavior; flagged for a future fix decision.
      const csv = ['col_a,col_b,col_c', '2026-09-01,Some shop,-44.5'].join('\n');
      const txns = await StatementParser.parseCSV(csvFile(csv));
      expect(txns[0]).toMatchObject({
        date: '2026-09-01T00:00:00.000Z',
        description: 'Some shop',
        amount: 2026,
        type: 'income',
      });
    });

    it('defaults the description to "Imported" when the cell is empty', async () => {
      const csv = ['Date,Description,Amount', '2026-09-01,,-50'].join('\n');
      const txns = await StatementParser.parseCSV(csvFile(csv));
      expect(txns[0].description).toBe('Imported');
    });
  });

  describe('String.prototype.includesAny extension', () => {
    it('is installed and works', () => {
      expect('banana'.includesAny(['nan'])).toBe(true);
      expect('banana'.includesAny(['zzz'])).toBe(false);
    });
  });
});
