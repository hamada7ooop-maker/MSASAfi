import { db } from '../core';
import type { Account } from '@/types';
import { triggerNotificationRefresh } from '@/core/events';
import { silentFail, ignore } from '@/core/utils';
import { recordException } from '@/core/crashlytics';

/**
 * Repository for Account-related database operations.
 */
export const AccountRepository = {
  
  /**
   * Gets all accounts.
   */
  async getAll(): Promise<Account[]> {
    return await db.accounts.toArray();
  },

  /**
   * Gets total balance across all accounts.
   */
  async getTotalBalance(): Promise<number> {
    const accounts = await this.getAll();
    return accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  },

  /**
   * Gets a single account by ID.
   */
  async getById(id: string): Promise<Account | null> {
    return (await db.accounts.get(id)) || null;
  },

  /**
   * Adds a new account.
   */
  async add(acc: Omit<Account, 'id'>): Promise<Account> {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
    const item: Account = { ...acc, id, initialBalance: acc.balance };
    await db.accounts.put(item);
    db.recordAction('add_account', `Added account: ${item.name}`, { name: item.name, type: item.type }).catch(silentFail('recordAction:add_account'));
    triggerNotificationRefresh().catch(ignore());
    return item;
  },

  /**
   * Updates an account.
   */
  async update(id: string, data: Partial<Account>): Promise<void> {
    const existing = await db.accounts.get(id);
    if (existing) {
      if (data.balance !== undefined && data.balance !== existing.balance) {
        const transactions = await db.transactions.toArray();
        const accTxns = transactions.filter(t => !t.isDraft && (t.accountId === id || t.account === existing.name));
        let txnSum = 0;
        for (const t of accTxns) {
          const amt = Number(t.amount) || 0;
          if (t.type === 'income') txnSum += amt;
          else if (t.type === 'expense') txnSum -= amt;
        }
        data.initialBalance = data.balance - txnSum;
      }
      const updated = { ...existing, ...data };
      await db.accounts.put(updated);
      db.recordAction('update_account', `Updated account: ${updated.name}`, { name: updated.name }).catch(silentFail('recordAction:update_account'));
      triggerNotificationRefresh().catch(ignore());
    }
  },

  /**
   * Deletes an account.
   */
  async delete(id: string): Promise<void> {
    const existing = await db.accounts.get(id);
    await db.accounts.delete(id);
    if (existing) db.recordAction('delete_account', `Deleted account: ${existing.name}`, { name: existing.name }).catch(silentFail('recordAction:delete_account'));
    triggerNotificationRefresh().catch(ignore());
  },

  /**
   * Auto-repairs account balances if they are corrupted (NaN or mismatched).
   * Runs once per user session to ensure data integrity after the encryption bug.
   */
  async repairBalances(): Promise<void> {
    if (sessionStorage.getItem('balances_repaired_v2')) return;

    try {
      const accounts = await db.accounts.toArray();
      if (accounts.length === 0) return;
      
      const transactions = await db.transactions.toArray();
      let repairedCount = 0;

      for (const acc of accounts) {
        let calculated = Number(acc.initialBalance) || 0;
        const accTxns = transactions.filter(t => !t.isDraft && (t.accountId === acc.id || t.account === acc.name));
        
        for (const t of accTxns) {
           const amt = Number(t.amount) || 0;
           if (t.type === 'income') calculated += amt;
           else if (t.type === 'expense') calculated -= amt;
        }
        
        const currentBal = Number(acc.balance);
        // Only repair if it's NaN (corruption). 
        // Differences are now assumed to be intentional manual adjustments.
        if (Number.isNaN(currentBal)) {
           acc.balance = calculated;
           await db.accounts.put(acc);
           repairedCount++;
        }
      }
      
      sessionStorage.setItem('balances_repaired_v2', 'true');
      if (repairedCount > 0) {
        recordException(
          `[Accounts] Balance corruption detected and repaired on ${repairedCount} accounts`,
          new Error('auto-repaired')
        );
      }
    } catch (e) {
      recordException('[Repair] Failed to repair balances', e as Error);
    }
  }
};
