import { describe, it, expect, beforeEach } from 'vitest';
import { db as DB } from '@/core/db/core';
import { TransactionRepository } from '../../src/core/db/repositories/transactions';
import { AccountRepository } from '../../src/core/db/repositories/accounts';
import { BudgetRepository } from '../../src/core/db/repositories/budgets';
import { AssetRepository } from '../../src/core/db/repositories/assets';
import { DebtRepository } from '../../src/core/db/repositories/debts';
import { GoalRepository } from '../../src/core/db/repositories/goals';
import { AssetsEngine } from '../../src/core/utils/assetsEngine';
import type { Budget, Asset, Debt, Goal } from '../../src/types';

describe('Comprehensive End-to-End User Financial Journey Integration Test', () => {
  beforeEach(async () => {
    await DB.transactions.clear();
    await DB.accounts.clear();
    await DB.budgets.clear();
    await DB.assets.clear();
    await DB.debts.clear();
    await DB.goals.clear();
    if (DB.auditLog) await DB.auditLog.clear();
  });

  it('orchestrates complete financial cycle across Accounts, Transactions, Budgets, Assets and Rollback', async () => {
    // 1. Onboarding / Accounts Setup
    const bankAcc = await AccountRepository.add({
      name: 'حساب الراجحي الأساسي',
      balance: 0,
      type: 'bank',
      color: '#002b59',
      icon: 'account_balance',
    });
    const cashAcc = await AccountRepository.add({
      name: 'المحفظة النقدية',
      balance: 0,
      type: 'cash',
      color: '#10b981',
      icon: 'payments',
    });

    const accounts = await AccountRepository.getAll();
    expect(accounts.length).toBe(2);

    // 2. Setup Budget for Groceries (1000 SAR)
    const foodBudget: Budget = {
      id: 'bgt_journey_food',
      category: 'مواد غذائية',
      limit: 1000,
      period: 'monthly',
      spent: 0,
    };
    await BudgetRepository.add(foodBudget);

    // 3. User Receives Salary (+12,000 SAR to Bank Account)
    const salaryTx = await TransactionRepository.add({
      amount: 12000,
      type: 'income',
      category: 'راتب',
      description: 'راتب شهر يونيو',
      date: '2026-06-01',
      accountId: bankAcc.id,
      account: bankAcc.name,
    });
    expect(salaryTx.id).toBeDefined();

    let bankInDb = await DB.accounts.get(bankAcc.id);
    expect(bankInDb?.balance).toBe(12000);

    // 4. User Buys Groceries (-350 SAR from Bank Account)
    const foodTx = await TransactionRepository.add({
      amount: 350,
      type: 'expense',
      category: 'مواد غذائية',
      description: 'مشتريات السوبرماركت',
      date: '2026-06-02',
      accountId: bankAcc.id,
      account: bankAcc.name,
    });
    expect(foodTx.id).toBeDefined();

    bankInDb = await DB.accounts.get(bankAcc.id);
    expect(bankInDb?.balance).toBe(11650); // 12000 - 350

    // 5. Transfer from Bank to Cash (-1000 from Bank, +1000 to Cash)
    await TransactionRepository.add({
      amount: 1000,
      type: 'expense',
      category: 'تحويل مالي',
      description: 'سحب كاش للصراف',
      date: '2026-06-03',
      accountId: bankAcc.id,
      account: bankAcc.name,
    });
    await TransactionRepository.add({
      amount: 1000,
      type: 'income',
      category: 'تحويل مالي',
      description: 'إيداع كاش في المحفظة',
      date: '2026-06-03',
      accountId: cashAcc.id,
      account: cashAcc.name,
    });

    bankInDb = await DB.accounts.get(bankAcc.id);
    const cashInDb = await DB.accounts.get(cashAcc.id);
    expect(bankInDb?.balance).toBe(10650); // 11650 - 1000
    expect(cashInDb?.balance).toBe(1000);

    // 6. Verify Budget Consumption
    const allTxns = await DB.getTransactions();
    const foodSpending = allTxns
      .filter(t => t.type === 'expense' && t.category === 'مواد غذائية')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    expect(foodSpending).toBe(350);
    const budgetPct = Math.round((foodSpending / foodBudget.limit) * 100);
    expect(budgetPct).toBe(35);

    // 7. Add Capital Asset and Compute Depreciation
    const laptopAsset: Asset = {
      id: 'asset_journey_mac',
      name: 'MacBook Pro M3',
      category: 'electronics',
      purchasePrice: 10000,
      salvageValue: 1000,
      lifespanYears: 5,
      depreciationMethod: 'straight_line',
      purchaseDate: '2026-01-01',
    };
    await AssetRepository.add(laptopAsset);

    const assetMetrics = AssetsEngine.calculateMetrics(laptopAsset, '2027-01-01');
    expect(assetMetrics.annualDepreciation).toBe(1800); // (10000 - 1000) / 5 = 1800
    expect(assetMetrics.depreciationSchedule.length).toBe(6); // Year 0 to 5
    expect(assetMetrics.depreciationSchedule[1].bookValue).toBe(8200); // 10000 - 1800

    // 8. Soft Delete Expense & Verify Data Integrity / Reconciled Rollback
    await TransactionRepository.delete(foodTx.id);
    const bankAfterDelete = await DB.accounts.get(bankAcc.id);
    // Deleting 350 expense returns funds: 10650 + 350 = 11000
    expect(bankAfterDelete?.balance).toBe(11000);
  });

  it('orchestrates Debt Lifecycle from Creation to Partial and Full Settlement', async () => {
    // 1. Initial Account Setup with 20,000 SAR
    const bankAcc = await AccountRepository.add({
      name: 'حساب بنك الإنماء',
      balance: 20000,
      type: 'bank',
      color: '#7c3aed',
      icon: 'account_balance',
    });

    // 2. Register a Loan/Debt of 10,000 SAR owed to financial entity
    const carLoan: Omit<Debt, 'id' | 'createdAt'> = {
      type: 'owed',
      name: 'تمويل شراء سيارة',
      person: 'مصرف الراجحي للتمويل',
      total: 10000,
      paid: 0,
      dueDate: '2026-12-31',
      accountId: bankAcc.id,
    };
    const savedDebt = await DebtRepository.add(carLoan);
    expect(savedDebt.id).toBeDefined();
    expect(savedDebt.total).toBe(10000);
    expect(savedDebt.paid).toBe(0);

    // 3. First installment payment: 3,000 SAR
    const installment1 = await TransactionRepository.add({
      amount: 3000,
      type: 'expense',
      category: 'ديون والتزامات',
      description: 'سداد القسط الأول - تمويل السيارة',
      date: '2026-07-01',
      accountId: bankAcc.id,
      account: bankAcc.name,
    });
    expect(installment1.id).toBeDefined();

    // Verify bank account deducted: 20,000 - 3,000 = 17,000 SAR
    let bankInDb = await DB.accounts.get(bankAcc.id);
    expect(bankInDb?.balance).toBe(17000);

    // Update debt progress
    await DebtRepository.update(savedDebt.id, { paid: 3000 });
    let debtInDb = await DB.debts.get(savedDebt.id);
    expect(debtInDb?.paid).toBe(3000);
    const remainingAfterP1 = (debtInDb?.total || 0) - (debtInDb?.paid || 0);
    expect(remainingAfterP1).toBe(7000);
    const progressP1 = Math.round(((debtInDb?.paid || 0) / (debtInDb?.total || 1)) * 100);
    expect(progressP1).toBe(30);

    // 4. Final installment payment: 7,000 SAR (Full settlement)
    const installment2 = await TransactionRepository.add({
      amount: 7000,
      type: 'expense',
      category: 'ديون والتزامات',
      description: 'سداد القسط الأخير والمخالصة النهائية',
      date: '2026-08-01',
      accountId: bankAcc.id,
      account: bankAcc.name,
    });
    expect(installment2.id).toBeDefined();

    // Verify bank account deducted: 17,000 - 7,000 = 10,000 SAR
    bankInDb = await DB.accounts.get(bankAcc.id);
    expect(bankInDb?.balance).toBe(10000);

    // Mark debt as fully settled
    await DebtRepository.update(savedDebt.id, { paid: 10000 });
    debtInDb = await DB.debts.get(savedDebt.id);
    expect(debtInDb?.paid).toBe(10000);
    const remainingFinal = (debtInDb?.total || 0) - (debtInDb?.paid || 0);
    expect(remainingFinal).toBe(0);
    const progressFinal = Math.round(((debtInDb?.paid || 0) / (debtInDb?.total || 1)) * 100);
    expect(progressFinal).toBe(100);
  });

  it('orchestrates Savings Goal Lifecycle with Target Accumulation and Progress Milestones', async () => {
    // 1. Initial Account with 30,000 SAR
    const bankAcc = await AccountRepository.add({
      name: 'حساب بنك الرياض للادخار',
      balance: 30000,
      type: 'bank',
      color: '#0284c7',
      icon: 'savings',
    });

    // 2. Create a Savings Goal: Emergency Fund (25,000 SAR)
    const emergencyGoal: Omit<Goal, 'id' | 'createdAt'> = {
      name: 'صندوق الطوارئ 6 أشهر',
      target: 25000,
      saved: 0,
      targetDate: '2027-01-01',
      color: '#10b981',
      accountId: bankAcc.id,
    };
    const createdGoal = await GoalRepository.add(emergencyGoal);
    expect(createdGoal.id).toBeDefined();
    expect(createdGoal.target).toBe(25000);
    expect(createdGoal.saved).toBe(0);

    // 3. First Month Allocation (+10,000 SAR to Goal)
    await TransactionRepository.add({
      amount: 10000,
      type: 'expense',
      category: 'ادخار واستثمار',
      description: 'تخصيص ادخار شهري لصندوق الطوارئ',
      date: '2026-07-01',
      accountId: bankAcc.id,
      account: bankAcc.name,
    });

    let bankInDb = await DB.accounts.get(bankAcc.id);
    expect(bankInDb?.balance).toBe(20000); // 30,000 - 10,000

    await GoalRepository.update(createdGoal.id, { saved: 10000 });
    let goalInDb = await DB.goals.get(createdGoal.id);
    expect(goalInDb?.saved).toBe(10000);
    expect((goalInDb?.target || 0) - (goalInDb?.saved || 0)).toBe(15000);
    const goalPct1 = Math.round(((goalInDb?.saved || 0) / (goalInDb?.target || 1)) * 100);
    expect(goalPct1).toBe(40);

    // 4. Second Allocation (+15,000 SAR to reach 100% completion)
    await TransactionRepository.add({
      amount: 15000,
      type: 'expense',
      category: 'ادخار واستثمار',
      description: 'إيداع مكافأة نهاية المشروع لإتمام صندوق الطوارئ',
      date: '2026-08-01',
      accountId: bankAcc.id,
      account: bankAcc.name,
    });

    bankInDb = await DB.accounts.get(bankAcc.id);
    expect(bankInDb?.balance).toBe(5000); // 20,000 - 15,000

    await GoalRepository.update(createdGoal.id, { saved: 25000 });
    goalInDb = await DB.goals.get(createdGoal.id);
    expect(goalInDb?.saved).toBe(25000);
    expect((goalInDb?.target || 0) - (goalInDb?.saved || 0)).toBe(0);
    const goalPctFinal = Math.round(((goalInDb?.saved || 0) / (goalInDb?.target || 1)) * 100);
    expect(goalPctFinal).toBe(100);
  });
});
