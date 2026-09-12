import type { MasarifiDB } from '../schema';
import { t } from '@/i18n/engine';

export const BillService = {
  async markBillPaid(db: MasarifiDB, billId: string, accountId?: string): Promise<void> {
    const bill = await db.bills.get(billId);
    if (!bill) return;
    await db.bills.update(billId, { isPaid: true, paidDate: new Date().toISOString() });
    
    const accId = accountId || (await db.accounts.toCollection().first())?.id;
    if (accId) {
      const acc = await db.accounts.get(accId);
      if (acc) {
        await db.accounts.update(accId, { balance: (acc.balance || 0) - (bill.amount || 0) });
        await db.addTransaction({
          amount: bill.amount,
          type: 'expense',
          category: 'فواتير',
          description: t('bill.payDesc', { name: bill.name }),
          date: new Date().toISOString().slice(0, 10),
          createdAt: new Date().toISOString(),
          accountId: accId,
          account: acc.name
        });
      }
    }
    await db.recordAction('pay_bill', `Marked bill paid: ${bill.name}`);
  },

  async paySubscription(db: MasarifiDB, subId: string, accountId?: string): Promise<void> {
    const sub = await db.subscriptions.get(subId);
    if (!sub) return;
    
    const next = new Date(sub.nextBillingDate || new Date());
    next.setMonth(next.getMonth() + 1);
    await db.subscriptions.update(subId, { nextBillingDate: next.toISOString().slice(0, 10) });

    const accId = accountId || (await db.accounts.toCollection().first())?.id;
    if (accId) {
      const acc = await db.accounts.get(accId);
      if (acc) {
        await db.accounts.update(accId, { balance: (acc.balance || 0) - (sub.amount || 0) });
        await db.addTransaction({
          amount: sub.amount,
          type: 'expense',
          category: 'اشتراكات',
          description: t('sub.payDesc', { name: sub.name }),
          date: new Date().toISOString().slice(0, 10),
          createdAt: new Date().toISOString(),
          accountId: accId,
          account: acc.name
        });
      }
    }
    await db.recordAction('pay_subscription', `Paid subscription: ${sub.name}`);
  }
};
