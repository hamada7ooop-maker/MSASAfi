import { describe, it, expect, beforeEach } from 'vitest';
import { StatementParser } from '../../src/services/statementParser';
import { calculateAmortization } from '../../src/features/debts/utils/amortization';
import { StatisticsService } from '../../src/core/services/StatisticsService';
import { evaluateExpression } from '../../src/core/calcEngine';
import { db } from '../../src/core/db/core';

describe('Financial High-Risk Engines Unit Tests', () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.accounts.clear();
  });

  describe('StatementParser (statementParser.ts)', () => {
    it('smartSplits CSV with quotes and commas properly', () => {
      const csv = 'Date,Description,Amount\n2026-08-01,"Coffee, Supermarket",-25.50\n2026-08-02,Salary,5000';
      const rows = StatementParser.smartSplitCSV(csv);
      expect(rows.length).toBe(3);
      expect(rows[1][1]).toBe('Coffee, Supermarket');
      expect(rows[1][2]).toBe('-25.50');
      expect(rows[2][2]).toBe('5000');
    });

    it('parses dates in multiple standard formats and Arabic months', () => {
      const parsedIso = StatementParser.parseDate('2026-08-30');
      expect(parsedIso.slice(0, 10)).toBe('2026-08-30');

      const parsedArabic = StatementParser.parseDate('15 مايو، 2026');
      expect(parsedArabic).toBeDefined();
    });

    it('parses complete CSV file into structured transactions with multi-language columns', async () => {
      const csvContent = `تاريخ,البيان,التصنيف,مدين,دائن
2026-08-01,راتب شهري,راتب,,15000
2026-08-05,سوبرماركت التميمي,بقالة,450,
2026-08-10,فاتورة كهرباء,فواتير,320,`;

      const file = new File([csvContent], 'statement.csv', { type: 'text/csv' });
      const txns = await StatementParser.parseCSV(file);

      expect(txns.length).toBe(3);
      expect(txns[0].type).toBe('income');
      expect(txns[0].amount).toBe(15000);
      expect(txns[1].type).toBe('expense');
      expect(txns[1].amount).toBe(450);
      expect(txns[2].amount).toBe(320);
    });

    it('handles Debit/Credit single Amount with negative values', async () => {
      const csvContent = `Date,Details,Category,Amount
2026-08-15,Amazon Order,Shopping,-120.00
2026-08-16,Freelance Project,Income,800.00`;

      const file = new File([csvContent], 'bank.csv', { type: 'text/csv' });
      const txns = await StatementParser.parseCSV(file);

      expect(txns.length).toBe(2);
      expect(txns[0].type).toBe('expense');
      expect(txns[0].amount).toBe(120);
      expect(txns[1].type).toBe('income');
      expect(txns[1].amount).toBe(800);
    });

    it('throws error on empty or invalid CSV files', async () => {
      const file = new File([''], 'empty.csv', { type: 'text/csv' });
      await expect(StatementParser.parseCSV(file)).rejects.toThrow('File is empty or invalid');
    });
  });

  describe('Loan Amortization (amortization.ts)', () => {
    it('calculates 0% interest loan correctly', () => {
      const res = calculateAmortization(12000, 0, 12, 'flat');
      expect(res.monthlyPayment).toBe(1000);
      expect(res.totalInterest).toBe(0);
      expect(res.totalPayment).toBe(12000);
      expect(res.schedule.length).toBe(12);
      expect(res.schedule[11].remainingBalance).toBe(0);
    });

    it('calculates flat interest schedule accurately', () => {
      const res = calculateAmortization(10000, 5, 10, 'flat');
      // Total Interest = 10000 * 0.05 * (10/12) = 416.666...
      expect(res.totalInterest).toBeCloseTo(416.67, 1);
      expect(res.totalPayment).toBeCloseTo(10416.67, 1);
      expect(res.schedule.length).toBe(10);
      expect(res.schedule[9].remainingBalance).toBe(0);
    });

    it('calculates declining EMI interest schedule accurately', () => {
      const res = calculateAmortization(100000, 6, 24, 'declining');
      expect(res.monthlyPayment).toBeGreaterThan(4400);
      expect(res.totalPayment).toBeGreaterThan(100000);
      expect(res.totalInterest).toBeGreaterThan(0);
      expect(res.schedule.length).toBe(24);
      expect(res.schedule[23].remainingBalance).toBeCloseTo(0, 0);
    });

    it('handles zero or negative loan principals gracefully', () => {
      const res1 = calculateAmortization(0, 5, 12, 'declining');
      expect(res1.monthlyPayment).toBe(0);
      expect(res1.schedule).toEqual([]);

      const res2 = calculateAmortization(10000, 5, 0, 'declining');
      expect(res2.monthlyPayment).toBe(0);
    });
  });

  describe('StatisticsService (StatisticsService.ts)', () => {
    it('computes monthly summary with expense breakdown and shared splits', async () => {
      await db.transactions.clear();
      await db.accounts.clear();
      
      const acc = { id: 'acc_fe_1', name: 'Main Wallet', type: 'cash', balance: 5000, currency: 'SAR', icon: 'wallet', color: '#1' };
      await db.accounts.add(acc);

      await db.transactions.add({
        id: 'fe_tx1',
        amount: 5000,
        type: 'income',
        category: 'راتب',
        date: '2030-05-01',
        createdAt: '2030-05-01T10:00:00Z',
        accountId: 'acc_fe_1',
      });

      await db.transactions.add({
        id: 'fe_tx2',
        amount: 600,
        type: 'expense',
        category: 'مطاعم',
        date: '2030-05-05',
        createdAt: '2030-05-05T12:00:00Z',
        accountId: 'acc_fe_1',
        shared: true,
        splitBy: 2, // effective 300
      });

      await db.transactions.add({
        id: 'fe_tx3',
        amount: 200,
        type: 'expense',
        category: 'بقالة',
        date: '2030-05-10',
        createdAt: '2030-05-10T14:00:00Z',
        accountId: 'acc_fe_1',
      });

      const summary = await StatisticsService.getMonthlySummary(2030, 4); // month is 0-indexed: 4 = May

      expect(summary.income).toBe(5000);
      expect(summary.expense).toBe(500); // 300 + 200
      expect(summary.breakdown['مطاعم']).toBe(300);
      expect(summary.breakdown['بقالة']).toBe(200);
    });

    it('retrieves previous month summary accurately', async () => {
      await db.transactions.clear();
      await db.transactions.add({
        id: 'fe_tx_prev',
        amount: 1500,
        type: 'expense',
        category: 'سكن',
        date: '2030-04-15',
        createdAt: '2030-04-15T10:00:00Z',
        accountId: 'acc_fe_1',
      });

      const prevSummary = await StatisticsService.getPreviousMonthSummary(2030, 4);
      expect(prevSummary?.expense).toBe(1500);
    });
  });

  describe('CalcEngine (calcEngine.ts)', () => {
    it('evaluates basic and complex arithmetic expressions with correct precedence', () => {
      expect(evaluateExpression('2 + 3 * 4')).toBe(14);
      expect(evaluateExpression('(2 + 3) * 4')).toBe(20);
      expect(evaluateExpression('100 / 4 - 5')).toBe(20);
      expect(evaluateExpression('-5 + 10')).toBe(5);
      expect(evaluateExpression('10 + -5')).toBe(5);
    });

    it('handles decimal numbers and multiple operations', () => {
      expect(evaluateExpression('12.5 * 2 + 5.5')).toBe(30.5);
    });

    it('throws or handles invalid expressions gracefully', () => {
      expect(() => evaluateExpression('5 ++ 2')).toThrow();
    });
  });

  describe('Financial Health Score and Category Utils', () => {
    it('calculates financial score correctly for balanced scenario', () => {
      const score = StatisticsService.calculateFinancialScore({
        monthStats: { income: 10000, expense: 5000 },
        budgets: [{ id: 'b1', category: 'dining', limit: 2000 }],
        savings: 15000,
        debts: []
      });
      expect(score).toBeGreaterThanOrEqual(70);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('penalizes financial score for deficit and heavy debt', () => {
      const score = StatisticsService.calculateFinancialScore({
        monthStats: { income: 3000, expense: 6000 },
        budgets: [{ id: 'b1', category: 'dining', limit: 1000 }],
        savings: -500,
        debts: [{ id: 'd1', person: 'Bank', total: 20000, paid: 1000, type: 'owed' }]
      });
      expect(score).toBeLessThanOrEqual(50);
    });

    it('returns a tip object from getRandomTip', async () => {
      const { getRandomTip } = await import('@/core/categoryUtils');
      const tip = getRandomTip();
      expect(tip).toBeDefined();
      expect(typeof tip.text).toBe('string');
    });
  });
});
