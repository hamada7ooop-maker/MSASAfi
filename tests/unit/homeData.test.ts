import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../../src/core/db/core";
import { TransactionRepository } from "../../src/core/db/repositories/transactions";
import { BillRepository } from "../../src/core/db/repositories/bills";
import { DebtRepository } from "../../src/core/db/repositories/debts";
import { AccountRepository } from "../../src/core/db/repositories/accounts";

describe("Home Data Repositories Unit Tests", () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.bills.clear();
    await db.subscriptions.clear();
    await db.budgets.clear();
    await db.goals.clear();
    await db.debts.clear();
    await db.accounts.clear();
  });

  it("should support TransactionRepository.getRecent and getAll", async () => {
    await TransactionRepository.add({
      amount: 150,
      type: "expense",
      category: "dining",
      date: new Date().toISOString()
    });
    const recent = await TransactionRepository.getRecent(5);
    expect(recent).toBeDefined();
    expect(recent.length).toBe(1);
    expect(recent[0].amount).toBe(150);
  });

  it("should support BillRepository.getUpcoming and getSubscriptions", async () => {
    await BillRepository.add({
      name: "Electricity",
      amount: 250,
      dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      isPaid: false
    });
    const upcoming = await BillRepository.getUpcoming(30);
    expect(upcoming).toBeDefined();
    expect(upcoming.length).toBe(1);
    expect(upcoming[0].name).toBe("Electricity");
    const subs = await BillRepository.getSubscriptions();
    expect(subs).toBeDefined();
    expect(Array.isArray(subs)).toBe(true);
  });

  it("should support DebtRepository.getOwed and AccountRepository.getTotalBalance", async () => {
    await AccountRepository.add({
      name: "Primary Bank",
      balance: 5000,
      type: "bank"
    });
    const total = await AccountRepository.getTotalBalance();
    expect(total).toBe(5000);
    await DebtRepository.add({
      person: "Friend",
      total: 1000,
      paid: 200,
      type: "owed"
    });
    const owed = await DebtRepository.getOwed();
    expect(owed.length).toBe(1);
    expect(owed[0].person).toBe("Friend");
  });

  it("should calculate Net Worth history points accurately via StatisticsService", async () => {
    const { StatisticsService } = await import("../../src/core/services/StatisticsService");
    
    await AccountRepository.add({
      name: "Savings",
      balance: 10000,
      type: "bank"
    });

    const history = await StatisticsService.getNetWorthHistory(6, 10000, 2000);
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(7); // 6 historical months + current
    expect(history[history.length - 1].value).toBe(8000); // 10000 - 2000
    expect(typeof history[0].label).toBe("string");
  });
});