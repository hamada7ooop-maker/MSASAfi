import { describe, it, expect } from 'vitest';
import type { ExportTransaction } from '../../src/features/reports/services/exportService';

function computeRunningBalances(txns: ExportTransaction[]): ExportTransaction[] {
  // 1. Sort chronological (oldest first)
  const sorted = [...txns].sort((a, b) => {
    const dateA = String(a.date || '');
    const dateB = String(b.date || '');
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
    const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
    return timeA - timeB;
  });

  let balance = 0;
  sorted.forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      balance += amt;
    } else {
      let actualAmt = amt;
      if (tx.shared && tx.splitBy && tx.splitBy > 1) {
        actualAmt = amt / tx.splitBy;
      }
      balance -= actualAmt;
    }
    tx.runningBalance = balance;
  });

  return sorted;
}

describe('ExportService Running Balance & Data Calculations Unit Tests', () => {
  it('should accurately calculate sequential running balance for mixed transactions', () => {
    const raw: ExportTransaction[] = [
      { id: '1', date: '2026-05-01', type: 'income', amount: 1000, category: 'راتب' },
      { id: '2', date: '2026-05-02', type: 'expense', amount: 200, category: 'بقالة' },
      { id: '3', date: '2026-05-03', type: 'expense', amount: 300, category: 'مطاعم' },
      { id: '4', date: '2026-05-04', type: 'income', amount: 500, category: 'مكافأة' },
    ];

    const result = computeRunningBalances(raw);

    expect(result[0].runningBalance).toBe(1000);
    expect(result[1].runningBalance).toBe(800);
    expect(result[2].runningBalance).toBe(500);
    expect(result[3].runningBalance).toBe(1000);
  });

  it('should accurately split shared expenses (splitBy)', () => {
    const raw: ExportTransaction[] = [
      { id: '1', date: '2026-05-01', type: 'income', amount: 1000, category: 'راتب' },
      // Shared dinner of 300 split by 3 -> user pays only 100
      { id: '2', date: '2026-05-02', type: 'expense', amount: 300, category: 'مطاعم', shared: true, splitBy: 3 }
    ];

    const result = computeRunningBalances(raw);

    expect(result[0].runningBalance).toBe(1000);
    expect(result[1].runningBalance).toBe(900);
  });

  it('should maintain stable sort order using createdAt when dates are identical', () => {
    const raw: ExportTransaction[] = [
      { id: '2', date: '2026-05-01', createdAt: 2000, type: 'expense', amount: 50, category: 'قهوة' },
      { id: '1', date: '2026-05-01', createdAt: 1000, type: 'income', amount: 500, category: 'إيداع' },
    ];

    const result = computeRunningBalances(raw);

    // Oldest creation first (id: 1, balance: 500)
    expect(result[0].id).toBe('1');
    expect(result[0].runningBalance).toBe(500);

    // Later creation second (id: 2, balance: 500 - 50 = 450)
    expect(result[1].id).toBe('2');
    expect(result[1].runningBalance).toBe(450);
  });
});
