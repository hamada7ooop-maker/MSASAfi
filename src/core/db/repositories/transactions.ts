import { db } from '../core';
import type { Transaction } from '@/types';
import { updateHomeWidget } from '../../../widgets/homeWidget';
import { triggerNotificationRefresh } from '@/core/events';
import { silentFail, ignore } from '@/core/utils';
import { logger } from '../../logger';

/**
 * Repository for Transaction-related database operations.
 */
export const TransactionRepository = {
  
  /**
   * Generates a unique ID for a record.
   */
  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
  },

  /**
   * Duplicates an existing transaction.
   */
  async duplicate(id: string): Promise<Transaction | null> {
    const existing = await db.transactions.get(id);
    if (!existing) return null;

    const { id: _, createdAt: __, ...data } = existing;
    return await this.add(data);
  },

  /**
   * Adds a new transaction and updates account balance.
   */
  async add(t: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const createdAt = new Date().toISOString();
    const item: Transaction = { 
      ...t, 
      id: this.generateId(), 
      createdAt, 
      date: t.date || createdAt 
    };

    await db.transactions.put(item);

    // ── Audit Log ──────────────────────────────────────────────────
    db.recordAction('add_transaction', `Added: ${item.description || item.amount}`, {
      amount: item.amount,
      type: item.type,
      category: item.category,
      currency: item.currency,
      description: item.description,
      date: item.date,
    }).catch(silentFail('recordAction:add_transaction'));

    // Update Account Balance
    if (item.isDraft !== true) {
      const targetAccId = item.accountId || item.account;
      
      if (targetAccId) {
        const acc = await db.accounts.get(targetAccId);
        if (acc) {
          const amt = Number(item.amount) || 0;
          const newBalance = item.type === 'income' ? (acc.balance + amt) : (acc.balance - amt);
          acc.balance = newBalance;
          await db.accounts.put(acc);
        } else {
          silentFail('[TxnRepo] Account not found for balance update')(new Error(targetAccId));
        }
      }
    }

    // Side Effects (Compatibility with Vanilla)
    updateHomeWidget().catch(ignore());
    triggerNotificationRefresh().catch(ignore());
    
    return item;
  },

  /**
   * Updates an existing transaction and adjusts balances correctly.
   */
  async update(id: string, data: Partial<Transaction>): Promise<Transaction | null> {
    const existing = await db.transactions.get(id);
    if (!existing) return null;

    const updated: Transaction = { ...existing, ...data };
    await db.transactions.put(updated);

    // ── Audit Log ──────────────────────────────────────────────────
    db.recordAction('update_transaction', `Updated: ${updated.description || updated.amount}`, {
      amount: updated.amount,
      type: updated.type,
      category: updated.category,
      currency: updated.currency,
      description: updated.description,
    }).catch(silentFail('recordAction:update_transaction'));

    // Balance adjustment logic
    const wasDraft = existing.isDraft === true;
    const isDraft = updated.isDraft === true;

    if (wasDraft && isDraft) {
      // Both are drafts, do absolutely nothing to balances.
    } else if (wasDraft && !isDraft) {
      // Transition from Draft to Active (Publishing)
      const newAccId = updated.accountId || updated.account;
      const newAmt = updated.amount || 0;
      if (newAccId) {
        const newAcc = await db.accounts.get(newAccId);
        if (newAcc) {
          newAcc.balance = updated.type === 'income' ? (newAcc.balance + newAmt) : (newAcc.balance - newAmt);
          await db.accounts.put(newAcc);
        }
      }
    } else if (!wasDraft && isDraft) {
      // Transition from Active to Draft (Reversing previous balance)
      const oldAccId = existing.accountId || existing.account;
      const oldAmt = existing.amount || 0;
      if (oldAccId) {
        const oldAcc = await db.accounts.get(oldAccId);
        if (oldAcc) {
          oldAcc.balance = existing.type === 'income' ? (oldAcc.balance - oldAmt) : (oldAcc.balance + oldAmt);
          await db.accounts.put(oldAcc);
        }
      }
    } else {
      // Both are active: Apply standard balance adjustment logic
      const oldAccId = existing.accountId || existing.account;
      const newAccId = updated.accountId || updated.account;
      const oldAmt = existing.amount || 0;
      const newAmt = updated.amount || 0;

      if (oldAccId === newAccId && oldAccId) {
        const acc = await db.accounts.get(oldAccId);
        if (acc) {
          let diff = 0;
          if (existing.type === updated.type) {
             diff = newAmt - oldAmt;
             acc.balance = updated.type === 'income' ? (acc.balance + diff) : (acc.balance - diff);
             await db.accounts.put(acc);
          } else {
             // Type changed (income <-> expense)
             const tempBal = existing.type === 'income' ? (acc.balance - oldAmt) : (acc.balance + oldAmt);
             acc.balance = updated.type === 'income' ? (tempBal + newAmt) : (tempBal - newAmt);
             await db.accounts.put(acc);
          }
        }
      } else {
        // Account changed
        if (oldAccId) {
          const oldAcc = await db.accounts.get(oldAccId);
          if (oldAcc) {
            oldAcc.balance = existing.type === 'income' ? (oldAcc.balance - oldAmt) : (oldAcc.balance + oldAmt);
            await db.accounts.put(oldAcc);
          }
        }
        if (newAccId) {
          const newAcc = await db.accounts.get(newAccId);
          if (newAcc) {
            newAcc.balance = updated.type === 'income' ? (newAcc.balance + newAmt) : (newAcc.balance - newAmt);
            await db.accounts.put(newAcc);
          }
        }
      }
    }

    updateHomeWidget().catch(ignore());
    triggerNotificationRefresh().catch(ignore());
    return updated;
  },

  /**
   * Soft deletes a transaction, reverses balance impact, and flags it.
   */
  async delete(id: string): Promise<void> {
    logger.debug('TxnRepo', 'Soft Deleting:', id);
    try {
      const existing = await db.transactions.get(id);
      if (existing && !existing.isDeleted) {
        // Reverse balance impact if it wasn't a draft
        if (existing.isDraft !== true) {
          const targetAccId = existing.accountId || existing.account;
          if (targetAccId) {
            const acc = await db.accounts.get(targetAccId);
            if (acc) {
              const amt = Number(existing.amount) || 0;
              acc.balance = existing.type === 'income' ? (acc.balance - amt) : (acc.balance + amt);
              await db.accounts.put(acc);
              logger.debug('TxnRepo', 'Reverted balance for soft delete:', targetAccId);
            }
          }
        }
        
        // Flag as deleted
        existing.isDeleted = true;
        existing.deletedAt = new Date().toISOString();
        await db.transactions.put(existing);

        // ── Audit Log ──────────────────────────────────────────────────
        db.recordAction('soft_delete_transaction', `Soft Deleted: ${existing.description || existing.amount}`, {
          amount: existing.amount,
          type: existing.type,
          category: existing.category,
          currency: existing.currency,
          description: existing.description,
        }).catch(silentFail('recordAction:soft_delete_transaction'));
      }

      updateHomeWidget().catch(ignore());
      triggerNotificationRefresh().catch(ignore());
    } catch (err) {
      logger.error('TxnRepo', 'Soft Delete error', err);
      throw err;
    }
  },

  async deleteMany(ids: string[]): Promise<void> {
    logger.debug('TxnRepo', 'Bulk Soft Deleting:', ids.length, 'items');
    try {
      if (ids.length === 0) return;

      const txns = await db.transactions.bulkGet(ids);
      const activeTxns = txns.filter((t): t is Transaction => !!t && !t.isDeleted);
      if (activeTxns.length === 0) return;

      const accountImpacts: Record<string, number> = {};

      for (const tx of activeTxns) {
        if (tx.isDraft !== true) {
          const targetAccId = tx.accountId || tx.account;
          if (targetAccId) {
            const amt = Number(tx.amount) || 0;
            const change = tx.type === 'income' ? -amt : amt;
            accountImpacts[targetAccId] = (accountImpacts[targetAccId] || 0) + change;
          }
        }
      }

      for (const [accId, diff] of Object.entries(accountImpacts)) {
        const acc = await db.accounts.get(accId);
        if (acc) {
          acc.balance += diff;
          await db.accounts.put(acc);
          logger.debug('TxnRepo', `Bulk updated balance for account ${accId} by ${diff}`);
        }
      }

      const now = new Date().toISOString();
      const updatedTxns = activeTxns.map(t => ({
        ...t,
        isDeleted: true,
        deletedAt: now
      }));

      await db.transactions.bulkPut(updatedTxns);

      db.recordAction('bulk_soft_delete_transactions', `Bulk Soft Deleted ${updatedTxns.length} transactions`, {
        count: updatedTxns.length,
        ids: ids
      }).catch(silentFail('recordAction:bulk_soft_delete_transactions'));

      updateHomeWidget().catch(ignore());
      triggerNotificationRefresh().catch(ignore());
    } catch (err) {
      logger.error('TxnRepo', 'Bulk Soft Delete error', err);
      throw err;
    }
  },

  /**
   * Restores a soft-deleted transaction, re-applying its balance impact.
   */
  async restore(id: string): Promise<void> {
    logger.debug('TxnRepo', 'Restoring transaction:', id);
    try {
      const existing = await db.transactions.get(id);
      if (existing && existing.isDeleted) {
        // Re-apply balance impact if not a draft
        if (existing.isDraft !== true) {
          const targetAccId = existing.accountId || existing.account;
          if (targetAccId) {
            const acc = await db.accounts.get(targetAccId);
            if (acc) {
              const amt = Number(existing.amount) || 0;
              acc.balance = existing.type === 'income' ? (acc.balance + amt) : (acc.balance - amt);
              await db.accounts.put(acc);
              logger.debug('TxnRepo', 'Re-applied balance for restore:', targetAccId);
            }
          }
        }

        existing.isDeleted = false;
        delete existing.deletedAt;
        await db.transactions.put(existing);

        // ── Audit Log ──────────────────────────────────────────────────
        db.recordAction('restore_transaction', `Restored: ${existing.description || existing.amount}`, {
          amount: existing.amount,
          type: existing.type,
          category: existing.category,
          currency: existing.currency,
          description: existing.description,
        }).catch(silentFail('recordAction:restore_transaction'));
      }

      updateHomeWidget().catch(ignore());
      triggerNotificationRefresh().catch(ignore());
    } catch (err) {
      logger.error('TxnRepo', 'Restore error', err);
      throw err;
    }
  },

  /**
   * Permanently deletes a soft-deleted transaction (Dexie hard delete).
   */
  async hardDelete(id: string): Promise<void> {
    logger.debug('TxnRepo', 'Hard Deleting:', id);
    try {
      const existing = await db.transactions.get(id);
      await db.transactions.delete(id);

      // ── Audit Log ──────────────────────────────────────────────────
      if (existing) {
        db.recordAction('hard_delete_transaction', `Permanently Deleted: ${existing.description || existing.amount}`, {
          amount: existing.amount,
          type: existing.type,
          category: existing.category,
        }).catch(silentFail('recordAction:hard_delete_transaction'));
      }

      updateHomeWidget().catch(ignore());
      triggerNotificationRefresh().catch(ignore());
    } catch (err) {
      logger.error('TxnRepo', 'Hard delete error', err);
      throw err;
    }
  },

  /**
   * Gets all soft-deleted transactions.
   */
  async getDeleted(): Promise<Transaction[]> {
    const all = await db.transactions.toArray();
    return all.filter(t => t.isDeleted === true).sort((a, b) => new Date(b.deletedAt || '').getTime() - new Date(a.deletedAt || '').getTime());
  },

  /**
   * Empties the entire trash bin (hard deletes all isDeleted=true transactions).
   */
  async emptyTrash(): Promise<void> {
    logger.debug('TxnRepo', 'Emptying Trash');
    try {
      const deleted = await this.getDeleted();
      const ids = deleted.map(t => t.id);
      await db.transactions.bulkDelete(ids);

      // ── Audit Log ──────────────────────────────────────────────────
      db.recordAction('empty_trash', `Emptied trash bin, deleted ${ids.length} items`, {}).catch(silentFail('recordAction:empty_trash'));

      updateHomeWidget().catch(ignore());
      triggerNotificationRefresh().catch(ignore());
    } catch (err) {
      logger.error('TxnRepo', 'Empty trash error', err);
      throw err;
    }
  },

  /**
   * Gets recent transactions (excluding drafts and deleted).
   */
  async getRecent(limit: number = 5): Promise<Transaction[]> {
    return this.getAll(limit);
  },

  /**
   * Gets transactions with pagination, filtering out drafts and deleted.
   */
  async getAll(limit: number | null = null, offset: number = 0): Promise<Transaction[]> {
    const all = await db.transactions.orderBy('date').reverse().toArray();
    const filtered = all.filter(t => !t.isDraft && !t.isDeleted);
    if (limit !== null) {
      return filtered.slice(offset, offset + limit);
    }
    return offset ? filtered.slice(offset) : filtered;
  },

  /**
   * Gets total number of transactions (excluding drafts and deleted).
   */
  async getTransactionsCount(): Promise<number> {
    const all = await db.transactions.toArray();
    return all.filter(t => !t.isDraft && !t.isDeleted).length;
  },

  /**
   * Gets transactions by a list of IDs.
   */
  async getTransactionsByIds(ids: string[]): Promise<Transaction[]> {
    return await db.transactions.bulkGet(ids).then(results => results.filter((t): t is Transaction => !!t && !t.isDraft && !t.isDeleted));
  },

  /**
   * Gets a single transaction by ID.
   */
  async getById(id: string): Promise<Transaction | undefined> {
    return await db.transactions.get(id);
  },

  /**
   * Gets transactions for a specific month (excluding drafts and deleted).
   */
  async getByMonth(year: number, month: number): Promise<Transaction[]> {
    const startDate = new Date(year, month, 1).toISOString();
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();
    
    const txns = await db.transactions
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
    return txns.filter(t => !t.isDraft && !t.isDeleted);
  },

  /**
   * Gets monthly stats (income, expense, count).
   */
  async getMonthlyStats(year: number, month: number): Promise<{ income: number; expense: number; count: number }> {
    const txns = await this.getByMonth(year, month);
    const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => {
        let amt = t.amount || 0;
        if (t.shared && t.splitBy && t.splitBy > 1) amt = amt / t.splitBy;
        return s + amt;
    }, 0);
    return { income, expense, count: txns.length };
  },

  /**
   * Gets expense breakdown by category.
   */
  async getCategoryBreakdown(year: number, month: number): Promise<Record<string, number>> {
    const txns = await this.getByMonth(year, month);
    const expenses = txns.filter(t => t.type === 'expense');
    const cats: Record<string, number> = {};
    
    expenses.forEach(t => {
      if (t.splits && t.splits.length > 0) {
        t.splits.forEach(s => {
          const cat = s.category || 'other';
          let amt = s.amount || 0;
          if (t.shared && t.splitBy && t.splitBy > 1) amt = amt / t.splitBy;
          cats[cat] = (cats[cat] || 0) + amt;
        });
      } else {
        const cat = t.category || 'other';
        let amt = t.amount || 0;
        if (t.shared && t.splitBy && t.splitBy > 1) amt = amt / t.splitBy;
        cats[cat] = (cats[cat] || 0) + amt;
      }
    });
    
    return cats;
  },

  /**
   * Gets statistics for the last 6 months (excluding drafts and deleted).
   */
  async getLast6MonthsStats(): Promise<Array<{ year: number, month: number, income: number, expense: number, count: number, balance: number }>> {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
    
    const all = (await db.transactions
      .where('date')
      .aboveOrEqual(sixMonthsAgo)
      .toArray()).filter(t => !t.isDraft && !t.isDeleted);

    const months: Array<{ year: number, month: number, income: number, expense: number, count: number }> = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ 
        year: d.getFullYear(), 
        month: d.getMonth(), 
        income: 0, 
        expense: 0, 
        count: 0 
      });
    }

    all.forEach(t => {
      const d = new Date(t.date || t.createdAt || Date.now());
      const ty = d.getFullYear();
      const tm = d.getMonth();
      
      const mMatch = months.find(m => m.year === ty && m.month === tm);
      if (mMatch) {
        const amt = t.amount || 0;
        const impact = (t.shared && t.splitBy && t.splitBy > 1) ? (amt / t.splitBy) : amt;
        
        if (t.type === 'income') mMatch.income += amt;
        else if (t.type === 'expense') mMatch.expense += impact;
        mMatch.count++;
      }
    });

    return months.map(m => ({ ...m, balance: m.income - m.expense }));
  },

  /**
   * Gets transactions within a date range (excluding drafts and deleted).
   */
  async getByRange(from: string, to: string): Promise<Transaction[]> {
    const txns = await db.transactions
      .where('date')
      .between(from, to, true, true)
      .toArray();
    return txns.filter(t => !t.isDraft && !t.isDeleted);
  },

  /**
   * Gets total spent in a specific category for a month.
   */
  async getSpentInCategory(category: string, year: number, month: number): Promise<number> {
    const txns = await this.getByMonth(year, month);
    return txns
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => {
        if (t.splits && t.splits.length > 0) {
          const splitAmt = t.splits
            .filter(s => s.category === category)
            .reduce((sSum, s) => sSum + (s.amount || 0), 0);
          let amt = splitAmt;
          if (t.shared && t.splitBy && t.splitBy > 1) amt = amt / t.splitBy;
          return sum + amt;
        } else {
          if (t.category !== category) return sum;
          let amt = t.amount || 0;
          if (t.shared && t.splitBy && t.splitBy > 1) amt = amt / t.splitBy;
          return sum + amt;
        }
      }, 0);
  },

  /**
   * Gets all saved drafts.
   */
  async getDrafts(): Promise<Transaction[]> {
    const all = await db.transactions.toArray();
    return all.filter(t => t.isDraft === true && !t.isDeleted).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  /**
   * Gets all favorite transactions.
   */
  async getFavorites(): Promise<Transaction[]> {
    const all = await db.transactions.toArray();
    return all.filter(t => t.isFavorite === true && !t.isDraft && !t.isDeleted).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
};
