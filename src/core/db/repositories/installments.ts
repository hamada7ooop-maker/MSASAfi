import { db } from '../core';
import type { Installment } from '@/types';

export const InstallmentRepository = {
  async getAll(): Promise<Installment[]> {
    return await db.installments.toArray();
  },

  async add(itemData: Omit<Installment, 'id'>): Promise<Installment> {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
    const item: Installment = { ...itemData, id };
    await db.installments.put(item);
    return item;
  },

  async update(id: string, data: Partial<Installment>): Promise<void> {
    await db.installments.update(id, data);
  },

  async delete(id: string): Promise<void> {
    await db.installments.delete(id);
  },

  async payInstallment(id: string, accountId?: string): Promise<void> {
    const item = await db.installments.get(id);
    if (!item) return;

    if (item.paidPayments >= item.totalPayments) {
      return;
    }

    const updatedPaid = item.paidPayments + 1;
    
    // Calculate new due date (next month)
    const currentDue = new Date(item.dueDate);
    currentDue.setMonth(currentDue.getMonth() + 1);
    const newDueDate = currentDue.toISOString().split('T')[0];

    await db.installments.update(id, {
      paidPayments: updatedPaid,
      dueDate: newDueDate
    });

    // Record a transaction
    if (accountId) {
      const txId = Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
      await db.transactions.put({
        id: txId,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        amount: item.amount,
        type: 'expense',
        category: 'أقساط والتزامات',
        description: `قسط: ${item.name} (${updatedPaid}/${item.totalPayments})`,
        accountId
      });

      // Deduct from account balance
      const account = await db.accounts.get(accountId);
      if (account) {
        await db.accounts.update(accountId, {
          balance: account.balance - item.amount
        });
      }
    }
  }
};
