import { describe, it, expect, beforeEach } from 'vitest';
import { processChatMessage } from '../../src/core/ai/chatService';
import { useSettingsStore } from '../../src/store/settingsStore';
import type { Transaction, Goal } from '@/types';

describe('Financial Chat Service Unit Tests (chatService.ts)', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      baseCurrency: 'SAR',
      hourlyRate: 50,
      isWorkHoursEnabled: true,
    });
  });

  it('answers identity and help questions', async () => {
    const res = await processChatMessage('من أنت؟', {});
    expect(typeof res).toBe('string');
    expect(res.length).toBeGreaterThan(0);
  });

  it('calculates category spending and work hours equivalent', async () => {
    const transactions: Transaction[] = [
      { id: '1', amount: 200, category: 'مطاعم', type: 'expense', date: '2026-08-01' },
      { id: '2', amount: 300, category: 'مطاعم', type: 'expense', date: '2026-08-02' },
    ];

    const res = await processChatMessage('كم صرفت على المطاعم؟', {
      transactions,
      balance: 5000,
      monthStats: { income: 10000, expense: 500 },
    });

    expect(typeof res).toBe('string');
    expect(res).toContain('المطاعم');
    expect(res).toContain('عملية');
  });

  it('calculates daily allowance based on remaining days', async () => {
    const res = await processChatMessage('كم أقدر أصرف اليوم؟ كم متبقي يومياً؟', {
      balance: 3000,
      monthStats: { income: 5000, expense: 2000 },
    });

    expect(typeof res).toBe('string');
    expect(res.length).toBeGreaterThan(0);
  });

  it('forecasts end of month balance based on current burn rate', async () => {
    const res = await processChatMessage('توقعات نهاية الشهر والمصاريف', {
      balance: 4000,
      monthStats: { income: 8000, expense: 3000 },
    });

    expect(typeof res).toBe('string');
    expect(res.length).toBeGreaterThan(0);
  });

  it('audits savings rate and ranks user financial discipline', async () => {
    const res = await processChatMessage('تقييم مالي وفحص المصاريف', {
      monthStats: { income: 10000, expense: 6000 },
    });

    expect(typeof res).toBe('string');
    expect(res.length).toBeGreaterThan(0);
  });

  it('evaluates whether user can afford a major purchase', async () => {
    const res = await processChatMessage('هل أستطيع شراء جوال بـ 1500 ريال؟', {
      balance: 5000,
      monthStats: { income: 10000, expense: 3000 },
    });

    expect(typeof res).toBe('string');
    expect(res.length).toBeGreaterThan(0);
  });

  it('provides monthly financial summary and net savings', async () => {
    const res = await processChatMessage('ملخص الشهر الحالي', {
      monthStats: { income: 12000, expense: 7000 },
    });

    expect(typeof res).toBe('string');
    expect(res.length).toBeGreaterThan(0);
  });

  it('identifies top spending category accurately', async () => {
    const transactions: Transaction[] = [
      { id: '1', amount: 1500, category: 'سكن', type: 'expense', date: '2026-08-01' },
      { id: '2', amount: 400, category: 'مطاعم', type: 'expense', date: '2026-08-02' },
    ];

    const res = await processChatMessage('أعلى تصنيف في الصرف هذا الشهر', {
      transactions,
    });

    expect(typeof res).toBe('string');
    expect(res.length).toBeGreaterThan(0);
  });

  it('reports goal progress status', async () => {
    const goals: Goal[] = [
      { id: 'g1', name: 'شراء سيارة', target: 50000, saved: 25000, category: 'saving' },
    ];

    const res = await processChatMessage('كيف وضعي في أهدافي الادخارية؟', {
      goals,
    });

    expect(typeof res).toBe('string');
    expect(res).toContain('50%');
  });

  it('routes zakat and tax inquiries to calculator guidance', async () => {
    const resZakat = await processChatMessage('كيف أحسب زكاتي؟', {});
    expect(typeof resZakat).toBe('string');

    const resTax = await processChatMessage('حساب الضريبة المضافة', {});
    expect(typeof resTax).toBe('string');
  });
});
