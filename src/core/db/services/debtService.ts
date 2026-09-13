import type { MasarifiDB } from '../schema';
import type { Debt } from '@/types';
import { t } from '@/i18n/engine';
import { addMoney } from '@/core/money';

export const DebtService = {
  async payDebt(db: MasarifiDB, debtId: string, amount: number, accountId?: string): Promise<Debt | undefined> {
    const debt = await db.debts.get(debtId);
    if (!debt) return undefined;
    // Rounded accumulation so `total - paid` reaches exactly zero on the final
    // payment instead of a residue like 1e-11 — see core/money.ts.
    const newPaid = addMoney(debt.paid || 0, amount);
    await db.debts.update(debtId, { paid: newPaid });

    const accId = accountId || (await db.accounts.toCollection().first())?.id;
    if (accId) {
      const acc = await db.accounts.get(accId);
      if (acc) {
        // Correct Logic: 
        // If 'lent' (I lent money), receiving it back INCREASES balance.
        // If 'owed' (I owe money), paying it back DECREASES balance.
        const isLent = debt.type === 'lent';
        const balanceChange = isLent ? amount : -amount;
        const txType = isLent ? 'income' : 'expense';
        const txCat = isLent ? 'استثمار' : 'ديون';
        const txDesc = isLent 
          ? t('debt.pay.lentDesc', { name: debt.name }) 
          : t('debt.pay.owedDesc', { name: debt.name });

        await db.accounts.update(accId, { balance: addMoney(acc.balance || 0, balanceChange) });
        await db.addTransaction({
          amount,
          type: txType,
          category: txCat,
          description: txDesc,
          date: new Date().toISOString().slice(0, 10),
          createdAt: new Date().toISOString(),
          accountId: accId,
          account: acc.name
        });
      }
    }
    await db.recordAction('pay_debt', `Paid ${amount} towards debt: ${debt.name}`);
    return { ...debt, paid: newPaid };
  }
};
