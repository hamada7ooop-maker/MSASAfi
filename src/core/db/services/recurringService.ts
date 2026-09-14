import type { MasarifiDB } from '../schema';
import type { Transaction } from '@/types';

export const RecurringService = {
  isProcessingRecurring: false,

  async processRecurringTransactions(db: MasarifiDB): Promise<void> {
    if (this.isProcessingRecurring) return;
    this.isProcessingRecurring = true;
    try {
      if (!db.recurringTransactions) return;
      // `toArray()` then filter in JS: Dexie's Table.filter walks a cursor, and
      // the encryption middleware cannot decrypt inside the cursor protocol, so
      // cursor-read rows keep their envelope. recurringTransactions is not an
      // encrypted table today, but using the cursor form here would silently
      // break the moment it becomes one.
      const txns = (await db.recurringTransactions.toArray()).filter(t => !!t.isActive && t.autoConfirm !== false);
      if (!txns.length) {
        this.isProcessingRecurring = false;
        return;
      }

      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);

      for (const rt of txns) {
        let next = new Date(rt.nextDate);
        // Safety break to prevent infinite loops if something is wrong with the date
        let safety = 0;

        while (next.toISOString().slice(0, 10) <= todayStr && safety < 50) {
          safety++;
          // Create transaction & Update Balance
          const targetAccId = rt.accountId || rt.account;
          if (targetAccId) {
            const acc = await db.accounts.get(targetAccId);
            if (acc) {
              const amt = Number(rt.amount) || 0;
              acc.balance = rt.type === 'income' ? (acc.balance + amt) : (acc.balance - amt);
              await db.accounts.put(acc);
            }
          }

          const txId = `tx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
          const txData: Transaction = {
            ...rt,
            id: txId,
            description: `[${rt.frequency}] ${rt.description || rt.category}`,
            date: next.toISOString().slice(0, 10),
            createdAt: Date.now()
          };
          
          await db.transactions.put(txData);
          await db.recordAction('add_transaction', `Added recurring: ${txData.description}`, txData as unknown as Record<string, unknown>);

          const newDate = new Date(next);
          if (rt.frequency === 'daily') newDate.setDate(newDate.getDate() + 1);
          else if (rt.frequency === 'weekly') newDate.setDate(newDate.getDate() + 7);
          else if (rt.frequency === 'monthly') newDate.setMonth(newDate.getMonth() + 1);
          else if (rt.frequency === 'yearly') newDate.setFullYear(newDate.getFullYear() + 1);
          else break;

          next = newDate;
        }

        if (safety > 0) {
          await db.recurringTransactions.update(rt.id, {
            nextDate: next.toISOString().slice(0, 10)
          });
        }
      }
    } finally {
      this.isProcessingRecurring = false;
    }
  }
};
