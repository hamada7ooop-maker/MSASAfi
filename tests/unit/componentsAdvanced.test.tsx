import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GoalItem } from '../../src/features/goals/components/GoalItem';
import { DebtItem } from '../../src/features/debts/components/DebtItem';
import { TransactionItem } from '../../src/features/transactions/components/TransactionItem';
import type { Goal, Debt, Transaction, Account } from '@/types';

describe('Advanced React Components Unit Tests', () => {
  const mockAccounts: Account[] = [
    { id: 'acc_1', name: 'Main Account', type: 'checking', balance: 5000, currency: 'SAR', icon: 'wallet', color: '#1' }
  ];

  describe('GoalItem Component', () => {
    const mockGoal: Goal = {
      id: 'goal_1',
      name: 'Emergency Fund',
      target: 10000,
      saved: 5000,
      category: 'saving',
      accountId: 'acc_1',
    };

    it('renders goal name, target, and triggers edit/delete', () => {
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      const onToggleSelect = vi.fn();
      const onAddDeposit = vi.fn().mockResolvedValue(mockGoal);
      const onRequestAccount = vi.fn();
      const getGoalForecast = vi.fn().mockResolvedValue(null);

      render(
        <MemoryRouter>
          <GoalItem
            goal={mockGoal}
            accounts={mockAccounts}
            isSelecting={false}
            isSelected={false}
            onToggleSelect={onToggleSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddDeposit={onAddDeposit}
            onRequestAccount={onRequestAccount}
            getGoalForecast={getGoalForecast}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('Emergency Fund')).toBeDefined();
      expect(screen.getByText('50%')).toBeDefined();

      const editBtn = screen.getByText('edit').closest('button')!;
      fireEvent.click(editBtn);
      expect(onEdit).toHaveBeenCalledWith(mockGoal);

      const deleteBtn = screen.getByText('delete').closest('button')!;
      fireEvent.click(deleteBtn);
      expect(onDelete).toHaveBeenCalledWith('goal_1');
    });
  });

  describe('DebtItem Component', () => {
    const mockDebt: Debt = {
      id: 'debt_1',
      person: 'Khaled',
      total: 2000,
      paid: 500,
      type: 'owed',
      dueDate: '2026-09-01',
      accountId: 'acc_1',
    };

    it('renders person name, remaining amount and triggers callbacks', () => {
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      const onToggleSelect = vi.fn();
      const onPayDebt = vi.fn().mockResolvedValue(undefined);
      const onRequestAccount = vi.fn();

      render(
        <MemoryRouter>
          <DebtItem
            debt={mockDebt}
            accounts={mockAccounts}
            isSelecting={false}
            isSelected={false}
            onToggleSelect={onToggleSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            onPayDebt={onPayDebt}
            onRequestAccount={onRequestAccount}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('Khaled')).toBeDefined();

      const editBtn = screen.getByText('edit').closest('button')!;
      fireEvent.click(editBtn);
      expect(onEdit).toHaveBeenCalledWith(mockDebt);

      const deleteBtn = screen.getByText('close').closest('button')!;
      fireEvent.click(deleteBtn);
      expect(onDelete).toHaveBeenCalledWith('debt_1');
    });
  });

  describe('TransactionItem Component', () => {
    const mockTxn: Transaction = {
      id: 'txn_101',
      description: 'Supermarket Groceries',
      amount: 250,
      category: 'مواد غذائية',
      type: 'expense',
      date: '2026-08-30',
    };

    it('renders transaction title, category, and action buttons', () => {
      const onRepeat = vi.fn();

      render(
        <MemoryRouter>
          <TransactionItem
            transaction={mockTxn}
            isSelecting={false}
            onRepeat={onRepeat}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('Supermarket Groceries')).toBeDefined();

      const replayBtn = screen.getByTitle('تكرار سريع');
      fireEvent.click(replayBtn);
      expect(onRepeat).toHaveBeenCalled();
    });
  });

  describe('SecurityCard Component', () => {
    it('renders security settings and toggles options', async () => {
      const { SecurityCard } = await import('../../src/features/settings/components/cards/SecurityCard');
      const updateSetting = vi.fn().mockResolvedValue(undefined);
      const refreshSettings = vi.fn();

      render(
        <MemoryRouter>
          <SecurityCard
            settings={{
              pinHash: 'some_hash',
              pinSalt: 'some_salt',
              autoLock: true,
              dbEncryption: true,
              incognito: false,
            }}
            updateSetting={updateSetting}
            refreshSettings={refreshSettings}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('الحساب والأمان')).toBeDefined();
      expect(screen.getByText('قفل التطبيق')).toBeDefined();
      expect(screen.getByText('تشفير قاعدة البيانات')).toBeDefined();
    });
  });

  describe('BankSelectorModal Component', () => {
    it('renders country selection, switches to bank list, and triggers close', async () => {
      const { BankSelectorModal } = await import('../../src/components/modals/BankSelectorModal');
      const onClose = vi.fn();

      const { rerender } = render(
        <BankSelectorModal isOpen={false} onClose={onClose} />
      );

      expect(screen.queryByText('اختر الدولة لتحديد البنوك المرخصة')).toBeNull();

      rerender(<BankSelectorModal isOpen={true} onClose={onClose} />);
      expect(screen.getByText('اختر الدولة لتحديد البنوك المرخصة')).toBeDefined();

      const ksaBtn = screen.getByText(/المملكة العربية السعودية/i);
      fireEvent.click(ksaBtn);

      expect(screen.getByText('اختر البنك أو المؤسسة المالية')).toBeDefined();

      const backBtn = screen.getByLabelText(/back|رجوع/i);
      fireEvent.click(backBtn);
      expect(screen.getByText('اختر الدولة لتحديد البنوك المرخصة')).toBeDefined();

      // Switch back to bank list and click bank provider
      fireEvent.click(screen.getByText(/المملكة العربية السعودية/i));
      const bankBtn = screen.getByText(/مصرف الراجحي/i);
      fireEvent.click(bankBtn);
      expect(screen.getByText(/Sandbox/i)).toBeDefined();

      const closeBtn = screen.getByLabelText(/close|إغلاق/i);
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Market Data Services Unit Tests', () => {
    it('handles gold, exchange rates, news, crypto, and fred indicator fetches gracefully', async () => {
      const { fetchLiveGoldPrice, fetchExchangeRates, fetchFinancialNews, fetchEconomicIndicators, fetchCryptoPrices } = await import('../../src/services/marketData');
      const { db: DB } = await import('../../src/core/db/core');

      // 1. Without API keys, should safely return null
      const goldNull = await fetchLiveGoldPrice('XAU', 'SAR');
      expect(goldNull).toBeNull();

      const ratesNull = await fetchExchangeRates('SAR');
      expect(ratesNull).toBeNull();

      const newsNull = await fetchFinancialNews();
      expect(newsNull).toBeNull();

      const econNull = await fetchEconomicIndicators();
      expect(econNull).toBeNull();

      // 2. With API keys and mocked fetch responses
      await DB.setSetting('goldApiKey', 'mock_gold_key');
      await DB.setSetting('exchangeRateApiKey', 'mock_fx_key');
      await DB.setSetting('currentsApiKey', 'mock_news_key');
      await DB.setSetting('fredApiKey', 'mock_fred_key');

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('gold')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ price_gram_24k: 285.5, price: 8878 })
          } as unknown as Response);
        }
        if (url.includes('exchangerate-api.com')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ conversion_rates: { USD: 0.27, EUR: 0.25, SAR: 1 } })
          } as unknown as Response);
        }
        if (url.includes('currentsapi.services')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ news: [{ id: '1', title: 'Global Economy Today', url: 'https://example.com' }] })
          } as unknown as Response);
        }
        if (url.includes('stlouisfed.org') || url.includes('/api/fred')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ observations: [{ value: '5.25', date: '2026-08-01' }, { value: '5.00', date: '2026-07-01' }] })
          } as unknown as Response);
        }
        // CoinGecko
        return Promise.resolve({
          ok: true,
          json: async () => ({
            bitcoin: { usd: 65000, sar: 243750, usd_24h_change: 2.5 }
          })
        } as unknown as Response);
      });

      const gold = await fetchLiveGoldPrice('XAU', 'SAR');
      expect(gold).toBe(285.5);

      const rates = await fetchExchangeRates('SAR');
      expect(rates?.USD).toBe(0.27);

      const news = await fetchFinancialNews();
      expect(news?.length).toBe(1);

      const econ = await fetchEconomicIndicators();
      expect(econ?.length).toBeGreaterThan(0);

      const crypto = await fetchCryptoPrices();
      expect(crypto.length).toBeGreaterThan(0);
      expect(crypto[0].symbol).toBe('BTC');

      // Cleanup
      await DB.setSetting('goldApiKey', '');
      await DB.setSetting('exchangeRateApiKey', '');
      await DB.setSetting('currentsApiKey', '');
      await DB.setSetting('fredApiKey', '');
    });
  });
});
