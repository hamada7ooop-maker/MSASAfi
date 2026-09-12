import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/core/db/core';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { renderHook, act } from '@testing-library/react';
import { parseNum, normalizeArabicDigits } from '@/core/utils';
import { useSettingsStore } from '@/store/settingsStore';
import { TransactionRepository } from '@/core/db/repositories/transactions';
import { FAMILY_SHARED_CATEGORY_KEY } from '@/core/categoryConstants';

describe('Wallet Transfer, Arabic IME & Allowance Payout Unit Tests', () => {
  beforeEach(async () => {
    await db.accounts.clear();
    await db.transactions.clear();
    useSettingsStore.setState({ childAccounts: [] });
  });

  describe('Inter-Account Transfer (transferBetween dual ledger)', () => {
    it('correctly deducts from source wallet and adds to destination wallet with dual transactions', async () => {
      const acc1 = await db.accounts.put({
        id: 'acc_wallet_main',
        name: 'المحفظة الرئيسية',
        balance: 1000,
        type: 'cash',
        currency: 'SAR',
        createdAt: new Date().toISOString()
      });

      const acc2 = await db.accounts.put({
        id: 'acc_bank_savings',
        name: 'حساب الادخار',
        balance: 200,
        type: 'bank',
        currency: 'SAR',
        createdAt: new Date().toISOString()
      });

      const { result } = renderHook(() => useAccounts());

      let transferSuccess = false;
      await act(async () => {
        transferSuccess = await result.current.transferBetween(acc1, acc2, 350);
      });

      expect(transferSuccess).toBe(true);

      // Verify updated balances in DB
      const updatedAcc1 = await db.accounts.get(acc1);
      const updatedAcc2 = await db.accounts.get(acc2);

      expect(updatedAcc1?.balance).toBe(650);
      expect(updatedAcc2?.balance).toBe(550);

      // Verify dual transactions in ledger
      const txs = await db.transactions.toArray();
      expect(txs.length).toBe(2);

      const debitTx = txs.find(t => t.accountId === acc1);
      expect(debitTx).toBeDefined();
      expect(debitTx?.type).toBe('expense');
      expect(debitTx?.amount).toBe(350);
      expect(debitTx?.category).toBe('transfer');

      const creditTx = txs.find(t => t.accountId === acc2);
      expect(creditTx).toBeDefined();
      expect(creditTx?.type).toBe('income');
      expect(creditTx?.amount).toBe(350);
      expect(creditTx?.category).toBe('transfer');
    });

    it('rejects transfer when amount is zero or negative or accounts are identical', async () => {
      const acc1 = await db.accounts.put({
        id: 'acc_wallet_cash',
        name: 'كاش',
        balance: 500,
        type: 'cash',
        currency: 'SAR',
        createdAt: new Date().toISOString()
      });

      const { result } = renderHook(() => useAccounts());

      let fail1 = false;
      let fail2 = false;
      await act(async () => {
        fail1 = await result.current.transferBetween(acc1, acc1, 100);
        fail2 = await result.current.transferBetween(acc1, 'other', -50);
      });

      expect(fail1).toBe(false);
      expect(fail2).toBe(false);

      const unchanged = await db.accounts.get(acc1);
      expect(unchanged?.balance).toBe(500);
    });
  });

  describe('Arabic-Indic Numeral Parsing (parseNum)', () => {
    it('accurately parses Arabic-Indic digits to standard numbers', () => {
      expect(parseNum('١٢٥٠')).toBe(1250);
      expect(parseNum('٠')).toBe(0);
      expect(parseNum('٩٨٧٦٥٤٣٢١٠')).toBe(9876543210);
    });

    it('correctly handles Arabic decimals and Persian digits', () => {
      expect(parseNum('١٢٥٠.٥٠')).toBe(1250.5);
      expect(parseNum('١٢٥٠٫٧٥')).toBe(1250.75);
      expect(parseNum('  ٣٥٠  ')).toBe(350);
    });

    it('parses standard numbers and edge cases gracefully', () => {
      expect(parseNum('1500.50')).toBe(1500.5);
      expect(parseNum('')).toBe(0);
      expect(parseNum(null)).toBe(0);
      expect(parseNum(undefined)).toBe(0);
      expect(parseNum('abc')).toBe(0);
    });
  });

  describe('Arabic-Indic Digit Normalization (normalizeArabicDigits)', () => {
    it('accurately converts Eastern Arabic-Indic digits to Western digits', () => {
      expect(normalizeArabicDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
      expect(normalizeArabicDigits('Card ٤١١١ ٢٢٢٢ ٣٣٣٣ ٤٤٤٤')).toBe('Card 4111 2222 3333 4444');
      expect(normalizeArabicDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
    });

    it('returns empty string on empty/null/undefined', () => {
      expect(normalizeArabicDigits('')).toBe('');
      expect(normalizeArabicDigits(null)).toBe('');
      expect(normalizeArabicDigits(undefined)).toBe('');
    });
  });

  describe('Child Accounts & Allowance Parent Account Deduction', () => {
    it('creates child account with correct initial state', () => {
      const { addChildAccount } = useSettingsStore.getState();
      addChildAccount('يوسف', 9, 40, 'weekly');

      const accounts = useSettingsStore.getState().childAccounts;
      expect(accounts.length).toBe(1);
      expect(accounts[0].name).toBe('يوسف');
      expect(accounts[0].age).toBe(9);
      expect(accounts[0].allowance).toBe(40);
      expect(accounts[0].balance).toBe(0);
      expect(accounts[0].transactions).toEqual([]);
    });

    it('deducts allowance from parent financial account when paid', async () => {
      const parentAccId = await db.accounts.put({
        id: 'acc_parent_main',
        name: 'حساب الراتب',
        balance: 5000,
        type: 'bank',
        currency: 'SAR',
        createdAt: new Date().toISOString()
      });

      const { addChildAccount, payChildAllowance } = useSettingsStore.getState();
      addChildAccount('نورة', 11, 100, 'monthly');

      const child = useSettingsStore.getState().childAccounts[0];

      // Simulate parent allowance confirmation payout
      await TransactionRepository.add({
        type: 'expense',
        amount: child.allowance,
        category: FAMILY_SHARED_CATEGORY_KEY,
        description: `مصروف: ${child.name}`,
        accountId: parentAccId,
        date: new Date().toISOString()
      });

      payChildAllowance(child.id);

      // Verify parent account was deducted
      const updatedParentAcc = await db.accounts.get(parentAccId);
      expect(updatedParentAcc?.balance).toBe(4900);

      // Verify child wallet was credited
      const updatedChild = useSettingsStore.getState().childAccounts.find(c => c.id === child.id);
      expect(updatedChild?.balance).toBe(100);
      expect(updatedChild?.transactions.length).toBe(1);
      expect(updatedChild?.transactions[0].amount).toBe(100);
      expect(updatedChild?.transactions[0].type).toBe('income');
    });
  });
});
