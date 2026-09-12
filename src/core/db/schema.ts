import Dexie, { type Table } from 'dexie';
import type { 
  Transaction, Account, Budget, Goal, Debt, Bill, 
  Category, SettingEntry, AppNotification, Challenge, 
  Investment, ChatMessage, ClassificationRule, Installment,
  Asset, BankCard, AuditLogEntry, Subscription, Trip, RecurringTransaction
} from '@/types';

import { CategoryInitService } from './services/categoryInitService';
import { GoalService } from './services/goalService';
import { DebtService } from './services/debtService';
import { BillService } from './services/billService';
import { RecurringService } from './services/recurringService';
import { DemoDataService } from './seed/demoData';
import { silentFail } from '../errors';

/**
 * MasarifiDB Class - Handles IndexedDB operations via Dexie.
 * Strictly maintains existing table names and indexes for backward compatibility.
 */
export class MasarifiDB extends Dexie {
  assets!: Table<Asset>;
  transactions!: Table<Transaction>;
  accounts!: Table<Account>;
  budgets!: Table<Budget>;
  goals!: Table<Goal>;
  debts!: Table<Debt>;
  bills!: Table<Bill>;
  categories!: Table<Category>;
  settings!: Table<SettingEntry>;
  auditLog!: Table<AuditLogEntry>;
  subscriptions!: Table<Subscription>;
  investments!: Table<Investment>;
  challenges!: Table<Challenge>;
  recurringTransactions!: Table<RecurringTransaction>;
  chatHistory!: Table<ChatMessage>;
  notifications!: Table<AppNotification>;
  classificationRules!: Table<ClassificationRule>;
  trips!: Table<Trip>;
  installments!: Table<Installment>;
  cards!: Table<BankCard>;

  constructor() {
    super('MasarifiDB');

    this.version(30).stores({
      transactions: 'id, date, createdAt, category, type, accountId, account, goalId, isDemo, [type+date], [category+type], [accountId+type]',
      budgets: 'id, category, isDemo',
      goals: 'id, isDemo',
      debts: 'id, type, isDemo',
      bills: 'id, dueDate, type, isPaid, isDemo, [type+dueDate]',
      accounts: 'id, isDemo',
      subscriptions: 'id, isDemo',
      investments: 'id, isDemo',
      challenges: 'id, isDemo',
      categories: 'id, order, isDemo',
      recurringTransactions: 'id, nextDate, isActive, isDemo',
      settings: 'id, key',
      auditLog: 'id, timestamp, action',
      notifications: 'id, date, timestamp, read',
      chatHistory: 'id, timestamp',
      classificationRules: 'id, priority, isActive',
      trips: 'id, isActive, currency',
      installments: 'id, isDemo, dueDate',
      assets: 'id, category, isDemo, purchaseDate'
    });

    this.version(31).stores({
      transactions: 'id, date, createdAt, category, type, accountId, account, goalId, isDemo, [type+date], [category+type], [accountId+type]',
      budgets: 'id, category, isDemo',
      goals: 'id, isDemo',
      debts: 'id, type, isDemo',
      bills: 'id, dueDate, type, isPaid, isDemo, [type+dueDate]',
      accounts: 'id, isDemo',
      subscriptions: 'id, isDemo',
      investments: 'id, isDemo',
      challenges: 'id, isDemo',
      categories: 'id, order, isDemo',
      recurringTransactions: 'id, nextDate, isActive, isDemo',
      settings: 'id, key',
      auditLog: 'id, timestamp, action',
      notifications: 'id, date, timestamp, read',
      chatHistory: 'id, timestamp',
      classificationRules: 'id, priority, isActive',
      trips: 'id, isActive, currency',
      installments: 'id, isDemo, dueDate',
      assets: 'id, category, isDemo, purchaseDate',
      cards: 'id, isDemo'
    });
  }

  // --- Audit Log ---
  async recordAction(action: string, description: string, details: Record<string, unknown> = {}): Promise<void> {
    try {
      if (!this.auditLog) return;
      await this.auditLog.add({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date().toISOString(),
        action,
        description,
        details: details ? JSON.parse(JSON.stringify(details)) : {} // Ensure clonable
      }).catch(silentFail('[DB] Audit Log skip'));
    } catch (e) {
      silentFail('[DB] recordAction error')(e);
    }
  }

  async pruneAuditLog(days = 30): Promise<void> {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const iso = cutoff.toISOString();
      await this.auditLog.where('timestamp').below(iso).delete();
    } catch (e) {
      silentFail('[DB] Audit prune failed')(e);
    }
  }

  // --- Settings Helpers ---
  async getSetting<T = unknown>(key: string): Promise<T | undefined> {
    const s = await this.settings.get(key);
    return s?.value as T | undefined;
  }

  async setSetting(key: string, value: unknown): Promise<void> {
    await this.settings.put({ id: key, key, value });
    
    // Prevent internal background tasks from flooding the audit log
    const ignoredKeys = [
      'lastCurrencyUpdate', 
      'userPoints', 
      'unlockedRewards', 
      'dismissedNotifs',
      'browserNotifs',
      'completedMilestones',
      'streakShields',
      'aiPremiumUntil',
      'hasReviewedApp'
    ];
    if (!ignoredKeys.includes(key) && !key.startsWith('lastSysNotif') && !key.startsWith('lastBrowserNotif')) {
      await this.recordAction('update_setting', `Updated setting: ${key}`, { key, value });
    }
  }

  async putSetting(key: string, value: unknown): Promise<void> {
    return this.setSetting(key, value);
  }

  // --- Category & Account Lifecycle Delegation ---
  async initDefaultCategories(force = false): Promise<void> {
    return CategoryInitService.initDefaultCategories(this, force);
  }

  async initDefaultAccounts(): Promise<void> {
    return CategoryInitService.initDefaultAccounts(this);
  }

  async cleanupDuplicateCategories(): Promise<void> {
    return CategoryInitService.cleanupDuplicateCategories(this);
  }

  async appendMissingDefaultCategories(): Promise<void> {
    return CategoryInitService.appendMissingDefaultCategories(this);
  }

  async repairCategories(): Promise<void> {
    return CategoryInitService.repairCategories(this);
  }

  async cleanupDuplicateAssets(): Promise<void> {
    return CategoryInitService.cleanupDuplicateAssets(this);
  }

  // --- Goals & Debts & Bills Financial Actions Delegation ---
  async getGoalTransactions(goalId: string): Promise<Transaction[]> {
    return GoalService.getGoalTransactions(this, goalId);
  }

  async addToGoal(goalId: string, amount: number, accountId?: string): Promise<Goal | undefined> {
    return GoalService.addToGoal(this, goalId, amount, accountId);
  }

  async payDebt(debtId: string, amount: number, accountId?: string): Promise<Debt | undefined> {
    return DebtService.payDebt(this, debtId, amount, accountId);
  }

  async markBillPaid(billId: string, accountId?: string): Promise<void> {
    return BillService.markBillPaid(this, billId, accountId);
  }

  async paySubscription(subId: string, accountId?: string): Promise<void> {
    return BillService.paySubscription(this, subId, accountId);
  }

  // --- Recurring Transactions Delegation ---
  async getRecurringTransactions(): Promise<RecurringTransaction[]> { 
    return this.recurringTransactions.toArray(); 
  }

  async addRecurringTransaction(data: Omit<RecurringTransaction, 'id'> & { id?: string }): Promise<string> {
    const id = data.id || `rec_${Date.now()}`;
    await this.recurringTransactions.put({ ...data, id } as RecurringTransaction);
    await this.recordAction('add_recurring', `Added recurring transaction: ${data.description || ''}`, { id, ...data });
    return id;
  }

  async updateRecurringTransaction(id: string, data: Partial<RecurringTransaction>): Promise<void> {
    await this.recurringTransactions.update(id, data);
    await this.recordAction('update_recurring', `Updated recurring: ${id}`, { id, ...data });
  }

  async deleteRecurringTransaction(id: string): Promise<void> {
    await this.recurringTransactions.delete(id);
    await this.recordAction('delete_recurring', `Deleted recurring: ${id}`, { id });
  }

  async processRecurringTransactions(): Promise<void> {
    return RecurringService.processRecurringTransactions(this);
  }

  // --- Demo Data Seeding & Clearing Delegation ---
  async seedDemoData(clearFirst = false): Promise<void> {
    return DemoDataService.seedDemoData(this, clearFirst);
  }

  async clearDemoData(): Promise<number> {
    return DemoDataService.clearDemoData(this);
  }

  async clearAll(): Promise<void> {
    await Promise.all(this.tables.map(table => table.clear()));
    await this.recordAction('wipe_data', 'Database wiped');
  }

  // --- CRUD Helpers for Compatibility ---
  async getCategories(): Promise<Category[]> { return this.categories.toArray(); }
  async getTransactions(): Promise<Transaction[]> { return this.transactions.toArray(); }
  async getAccounts(): Promise<Account[]> { return this.accounts.toArray(); }
  async getBudgets(): Promise<Budget[]> { return this.budgets.toArray(); }
  async getGoals(): Promise<Goal[]> { return this.goals.toArray(); }
  async getBills(): Promise<Bill[]> { return this.bills.toArray(); }
  async getDebts(): Promise<Debt[]> { return this.debts.toArray(); }
  async getInvestments(): Promise<Investment[]> { return this.investments.toArray(); }
  async getAssets(): Promise<Asset[]> { return this.assets.toArray(); }
  async getChallenges(): Promise<Challenge[]> { return this.challenges.toArray(); }
  async getSubscriptions(): Promise<Subscription[]> { return this.subscriptions.toArray(); }
  async getNotifications(): Promise<AppNotification[]> { return this.notifications.toArray(); }
  async getAuditLog(): Promise<AuditLogEntry[]> { return this.auditLog.orderBy('timestamp').reverse().toArray(); }

  // --- CRUD Operations for Transactions ---
  async getTransaction(id: string): Promise<Transaction | undefined> { 
    return this.transactions.get(id); 
  }

  async addTransaction(data: Omit<Transaction, 'id'> & { id?: string }): Promise<string> { 
    const id = data.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.transactions.put({ ...data, id } as Transaction);
    await this.recordAction('add_transaction', `Added transaction: ${data.description || id}`);
    return id;
  }

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<void> { 
    await this.transactions.update(id, data);
    await this.recordAction('update_transaction', `Updated transaction: ${id}`);
  }

  async deleteTransaction(id: string): Promise<void> { 
    await this.transactions.delete(id);
    await this.recordAction('delete_transaction', `Deleted transaction: ${id}`);
  }

  // --- CRUD Operations for Accounts ---
  async getAccount(id: string): Promise<Account | undefined> { 
    return this.accounts.get(id); 
  }

  async addAccount(data: Omit<Account, 'id'> & { id?: string }): Promise<string> { 
    const id = data.id || `acc_${Date.now()}`;
    await this.accounts.put({ ...data, id } as Account);
    await this.recordAction('add_account', `Added account: ${data.name || id}`);
    return id;
  }

  async updateAccount(id: string, data: Partial<Account>): Promise<void> { 
    const existing = await this.accounts.get(id);
    if (existing && data.balance !== undefined && data.balance !== existing.balance) {
      const transactions = await this.transactions.toArray();
      const accTxns = transactions.filter(t => t.accountId === id || t.account === existing.name);
      let txnSum = 0;
      for (const t of accTxns) {
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') txnSum += amt;
        else if (t.type === 'expense') txnSum -= amt;
      }
      data.initialBalance = data.balance - txnSum;
    }
    await this.accounts.update(id, data);
    await this.recordAction('update_account', `Updated account: ${id}`);
  }

  async deleteAccount(id: string): Promise<void> { 
    await this.accounts.delete(id);
    await this.recordAction('delete_account', `Deleted account: ${id}`);
  }

  // --- CRUD Operations for Budgets ---
  async getBudget(id: string): Promise<Budget | undefined> { 
    return this.budgets.get(id); 
  }

  async addBudget(data: Omit<Budget, 'id'> & { id?: string }): Promise<string> { 
    const id = data.id || `bud_${Date.now()}`;
    await this.budgets.put({ ...data, id } as Budget);
    await this.recordAction('add_budget', `Added budget: ${data.name || id}`);
    return id;
  }

  async updateBudget(id: string, data: Partial<Budget>): Promise<void> { 
    await this.budgets.update(id, data); 
    await this.recordAction('update_budget', `Updated budget: ${id}`);
  }

  async deleteBudget(id: string): Promise<void> { 
    await this.budgets.delete(id); 
    await this.recordAction('delete_budget', `Deleted budget: ${id}`);
  }

  // --- CRUD Operations for Categories ---
  async getCategory(id: string): Promise<Category | undefined> { 
    return this.categories.get(id); 
  }

  async addCategory(data: Omit<Category, 'id'> & { id?: string; order?: number }): Promise<string> { 
    const id = data.id || `cat_${Date.now()}`;
    const count = await this.categories.count();
    const order = data.order ?? count;
    await this.categories.put({ ...data, id, order } as Category);
    await this.recordAction('add_category', `Added category: ${data.name || id}`);
    return id;
  }

  async updateCategory(id: string, data: Partial<Category>): Promise<void> { 
    await this.categories.update(id, data); 
    await this.recordAction('update_category', `Updated category: ${id}`);
  }

  async deleteCategory(id: string): Promise<void> { 
    await this.categories.delete(id); 
    await this.recordAction('delete_category', `Deleted category: ${id}`);
  }

  // --- CRUD Operations for Goals ---
  async getGoal(id: string): Promise<Goal | undefined> { 
    return this.goals.get(id); 
  }

  async addGoal(data: Omit<Goal, 'id'> & { id?: string }): Promise<string> { 
    const id = data.id || `goal_${Date.now()}`;
    await this.goals.put({ ...data, id } as Goal);
    await this.recordAction('add_goal', `Added goal: ${data.name || id}`);
    return id;
  }

  async updateGoal(id: string, data: Partial<Goal>): Promise<void> { 
    await this.goals.update(id, data); 
    await this.recordAction('update_goal', `Updated goal: ${id}`);
  }

  async deleteGoal(id: string): Promise<void> { 
    await this.goals.delete(id); 
    await this.recordAction('delete_goal', `Deleted goal: ${id}`);
  }

  // --- CRUD Operations for Bills ---
  async getBill(id: string): Promise<Bill | undefined> { 
    return this.bills.get(id); 
  }

  async addBill(data: Omit<Bill, 'id'> & { id?: string }): Promise<string> { 
    const id = data.id || `bill_${Date.now()}`;
    await this.bills.put({ ...data, id } as Bill);
    await this.recordAction('add_bill', `Added bill: ${data.name || id}`);
    return id;
  }

  async updateBill(id: string, data: Partial<Bill>): Promise<void> { 
    await this.bills.update(id, data); 
    await this.recordAction('update_bill', `Updated bill: ${id}`);
  }

  async deleteBill(id: string): Promise<void> { 
    await this.bills.delete(id); 
    await this.recordAction('delete_bill', `Deleted bill: ${id}`);
  }

  // --- CRUD Operations for Debts ---
  async getDebt(id: string): Promise<Debt | undefined> { 
    return this.debts.get(id); 
  }

  async addDebt(data: Omit<Debt, 'id'> & { id?: string }): Promise<string> { 
    const id = data.id || `debt_${Date.now()}`;
    await this.debts.put({ ...data, id } as Debt);
    await this.recordAction('add_debt', `Added debt: ${data.name || id}`);
    return id;
  }

  async updateDebt(id: string, data: Partial<Debt>): Promise<void> { 
    await this.debts.update(id, data); 
    await this.recordAction('update_debt', `Updated debt: ${id}`);
  }

  async deleteDebt(id: string): Promise<void> { 
    await this.debts.delete(id); 
    await this.recordAction('delete_debt', `Deleted debt: ${id}`);
  }

  // --- CRUD Operations for Installments ---
  async getInstallments(): Promise<Installment[]> { 
    return this.installments.toArray(); 
  }

  async addInstallment(data: Omit<Installment, 'id'> & { id?: string }): Promise<string> {
    const id = data.id || `inst_${Date.now()}`;
    await this.installments.put({ ...data, id } as Installment);
    await this.recordAction('add_installment', `Added installment: ${data.name || id}`);
    return id;
  }

  async updateInstallment(id: string, data: Partial<Installment>): Promise<void> {
    await this.installments.update(id, data);
    await this.recordAction('update_installment', `Updated installment: ${id}`);
  }

  async deleteInstallment(id: string): Promise<void> {
    await this.installments.delete(id);
    await this.recordAction('delete_installment', `Deleted installment: ${id}`);
  }

  // --- CRUD Operations for Investments ---
  async getInvestment(id: string): Promise<Investment | undefined> { 
    return this.investments.get(id); 
  }

  async addInvestment(data: Omit<Investment, 'id'> & { id?: string }): Promise<string> { 
    const id = data.id || `inv_${Date.now()}`;
    await this.investments.put({ ...data, id } as Investment);
    await this.recordAction('add_investment', `Added investment: ${data.name || id}`);
    return id;
  }

  async updateInvestment(id: string, data: Partial<Investment>): Promise<void> { 
    await this.investments.update(id, data); 
    await this.recordAction('update_investment', `Updated investment: ${id}`);
  }

  async deleteInvestment(id: string): Promise<void> { 
    await this.investments.delete(id); 
    await this.recordAction('delete_investment', `Deleted investment: ${id}`);
  }

  // --- CRUD Operations for Subscriptions ---
  async getSubscription(id: string): Promise<Subscription | undefined> { 
    return this.subscriptions.get(id); 
  }

  async addSubscription(data: Omit<Subscription, 'id'> & { id?: string }): Promise<string> { 
    const id = data.id || `sub_${Date.now()}`;
    await this.subscriptions.put({ ...data, id } as Subscription);
    await this.recordAction('add_subscription', `Added subscription: ${data.name || id}`);
    return id;
  }

  async updateSubscription(id: string, data: Partial<Subscription>): Promise<void> { 
    await this.subscriptions.update(id, data); 
    await this.recordAction('update_subscription', `Updated subscription: ${id}`);
  }

  async deleteSubscription(id: string): Promise<void> { 
    await this.subscriptions.delete(id); 
    await this.recordAction('delete_subscription', `Deleted subscription: ${id}`);
  }

  // --- CRUD Operations for Challenges ---
  async getChallenge(id: string): Promise<Challenge | undefined> { 
    return this.challenges.get(id); 
  }

  async addChallenge(data: Omit<Challenge, 'id'> & { id?: string }): Promise<string> { 
    const id = data.id || `chal_${Date.now()}`;
    await this.challenges.put({ ...data, id } as Challenge);
    await this.recordAction('add_challenge', `Added challenge: ${data.name || id}`);
    return id;
  }

  async updateChallenge(id: string, data: Partial<Challenge>): Promise<void> { 
    await this.challenges.update(id, data); 
    await this.recordAction('update_challenge', `Updated challenge: ${id}`);
  }

  async deleteChallenge(id: string): Promise<void> { 
    await this.challenges.delete(id); 
    await this.recordAction('delete_challenge', `Deleted challenge: ${id}`);
  }

  // --- Aggregate Helpers ---
  async getTotalBalance(): Promise<number> {
    const accs = await this.accounts.toArray();
    return accs.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  }

  async getMonthlyStats(year: number, month: number): Promise<{ income: number; expense: number }> {
    const start = new Date(year, month, 1).toISOString().slice(0, 10);
    const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
    const txns = await this.transactions.where('date').between(start, end, true, true).toArray();
    
    let income = 0;
    let expense = 0;
    txns.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') income += amt;
      else if (t.type === 'expense') expense += amt;
    });
    return { income, expense };
  }

  async getCategoryBreakdown(year: number, month: number): Promise<Record<string, number>> {
    const start = new Date(year, month, 1).toISOString().slice(0, 10);
    const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
    const txns = await this.transactions.where('date').between(start, end, true, true).toArray();
    
    const breakdown: Record<string, number> = {};
    txns.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category || 'other';
      breakdown[cat] = (breakdown[cat] || 0) + (Number(t.amount) || 0);
    });
    return breakdown;
  }

  async saveTransaction(data: Omit<Transaction, 'id'> & { id?: string }): Promise<string> {
    return this.addTransaction(data);
  }
}

/**
 * Fields that should be encrypted before storage.
 */
export { ENCRYPTED_FIELDS } from './encryption';

