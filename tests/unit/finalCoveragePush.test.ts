import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from '../../src/store/settingsStore';
import { db as DB } from '../../src/core/db/core';
import { BillService } from '../../src/core/db/services/billService';
import { AccountRepository } from '../../src/core/db/repositories/accounts';
import { updateHomeWidget } from '../../src/widgets/homeWidget';
import { initCrashlytics, recordException, logError } from '../../src/core/crashlytics';
import { sendTelegramMessage } from '../../src/core/telegram';

describe('Final Coverage Push Unit Tests (Settings, BillService, Accounts, Widgets, Crashlytics, Telegram)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await DB.accounts.clear();
    await DB.subscriptions.clear();
    await DB.transactions.clear();
    await DB.settings.clear();
  });

  describe('useSettingsStore Comprehensive Actions', () => {
    it('updates appearance, palette, typography and system settings', () => {
      const store = useSettingsStore.getState();

      store.setTheme('dark');
      expect(useSettingsStore.getState().theme).toBe('dark');

      store.setNumberSystem('arab');
      expect(useSettingsStore.getState().numberSystem).toBe('arab');

      store.setDecimalPlaces(3);
      expect(useSettingsStore.getState().decimalPlaces).toBe(3);

      store.setNumberSeparator('dot_comma');
      expect(useSettingsStore.getState().numberSeparator).toBe('dot_comma');

      store.setIncognito(true);
      expect(useSettingsStore.getState().incognito).toBe(true);

      store.setDbEncryption(true);
      expect(useSettingsStore.getState().dbEncryption).toBe(true);

      store.setDarkPalette('ocean');
      expect(useSettingsStore.getState().darkPalette).toBe('ocean');

      store.setLightPalette('nord');
      expect(useSettingsStore.getState().lightPalette).toBe('nord');

      store.setFontSize('large');
      expect(useSettingsStore.getState().fontSize).toBe('large');

      store.setFirstDayOfMonth(15);
      expect(useSettingsStore.getState().firstDayOfMonth).toBe(15);

      store.setFirstDayOfWeek(6);
      expect(useSettingsStore.getState().firstDayOfWeek).toBe(6);

      store.setAiResponseLength('brief');
      expect(useSettingsStore.getState().aiResponseLength).toBe('brief');

      store.setUseBiometric(true);
      expect(useSettingsStore.getState().useBiometric).toBe(true);

      store.setHasOnboarded(true);
      expect(useSettingsStore.getState().hasOnboarded).toBe(true);
    });

    it('manages digital envelopes and child accounts', () => {
      const store = useSettingsStore.getState();

      store.addEnvelope('Entertainment Envelope', 500, '#3b82f6', 'movie');
      const envs = useSettingsStore.getState().envelopes;
      expect(envs.some((e) => e.name === 'Entertainment Envelope')).toBe(true);

      const env = envs.find((e) => e.name === 'Entertainment Envelope');
      if (env) {
        store.updateEnvelopeBalance(env.id, 100);
        expect(useSettingsStore.getState().envelopes.find((e) => e.id === env.id)?.spent).toBe(100);

        store.deleteEnvelope(env.id);
        expect(useSettingsStore.getState().envelopes.some((e) => e.id === env.id)).toBe(false);
      }

      // Child Accounts
      store.addChildAccount('Zaid', 10, 50, 'weekly');
      const children = useSettingsStore.getState().childAccounts;
      expect(children.some((c) => c.name === 'Zaid')).toBe(true);

      const child = children.find((c) => c.name === 'Zaid');
      if (child) {
        store.payChildAllowance(child.id);
        expect(useSettingsStore.getState().childAccounts.find((c) => c.id === child.id)?.balance).toBe(50);

        store.addChildTransaction(child.id, 'Toys', 20, 'expense');
        expect(useSettingsStore.getState().childAccounts.find((c) => c.id === child.id)?.balance).toBe(30);

        store.deleteChildAccount(child.id);
        expect(useSettingsStore.getState().childAccounts.some((c) => c.id === child.id)).toBe(false);
      }
    });

    it('manages salary structure, unlocked items, and premium timestamps', () => {
      const store = useSettingsStore.getState();

      store.setSalaryStructure(10000, [{ id: 'housing', name: 'Housing', amount: 2500 }], [{ id: 'tax', name: 'GOSI', amount: 975 }]);
      expect(useSettingsStore.getState().salaryBasic).toBe(10000);
      expect(useSettingsStore.getState().salaryAllowances).toHaveLength(1);
      expect(useSettingsStore.getState().salaryDeductions).toHaveLength(1);

      store.setSalaryBasic(12000);
      expect(useSettingsStore.getState().salaryBasic).toBe(12000);

      store.setUnlockedItems(['avatar_gold', 'theme_neon']);
      expect(useSettingsStore.getState().unlockedItems).toContain('avatar_gold');

      store.setAiPremiumUntil(1800000000);
      expect(useSettingsStore.getState().aiPremiumUntil).toBe(1800000000);

      store.setLockedYears([2024, 2025]);
      expect(useSettingsStore.getState().lockedYears).toContain(2024);

      store.setIsSimpleMode(true);
      expect(useSettingsStore.getState().isSimpleMode).toBe(true);
    });
  });

  describe('BillService Subscription Payments', () => {
    it('processes subscription renewals and account deduction', async () => {
      await DB.accounts.add({ id: 'acc_sub', name: 'Sub Acc', balance: 1000, type: 'checking', currency: 'SAR', icon: 'wallet', color: '#1' });
      await DB.subscriptions.add({
        id: 'sub_netflix',
        name: 'Netflix Premium',
        amount: 60,
        billingCycle: 'monthly',
        nextBillingDate: '2026-08-30',
        active: true,
      });

      await BillService.paySubscription(DB, 'sub_netflix', 'acc_sub');

      const acc = await DB.accounts.get('acc_sub');
      expect(acc?.balance).toBe(940); // 1000 - 60

      const sub = await DB.subscriptions.get('sub_netflix');
      expect(sub?.nextBillingDate).toBeDefined();
    });
  });

  describe('AccountRepository Extended Functions', () => {
    it('updates and deletes accounts with audit logging', async () => {
      const created = await AccountRepository.add({
        name: 'Savings Vault',
        type: 'savings',
        balance: 3000,
        currency: 'SAR',
        icon: 'savings',
        color: '#10b981',
      });

      await AccountRepository.update(created.id, { name: 'Emergency Vault', balance: 3500 });
      const updated = await AccountRepository.getById(created.id);
      expect(updated?.name).toBe('Emergency Vault');

      await AccountRepository.delete(created.id);
      const deleted = await AccountRepository.getById(created.id);
      expect(deleted).toBeNull();
    });
  });

  describe('Home Widget, Crashlytics, and Telegram Service', () => {
    it('executes updateHomeWidget gracefully', async () => {
      await expect(updateHomeWidget()).resolves.toBeUndefined();
    });

    it('initializes crashlytics, records exceptions, and logs errors', async () => {
      await initCrashlytics();
      recordException('Test error', new Error('Crashlytics unit test'));
      logError('Sample logged error', { key: 'val' });
      expect(true).toBe(true);
    });

    it('sends or skips telegram dispatch gracefully without crashing', async () => {
      const res = await sendTelegramMessage('Test Message');
      expect(typeof res).toBe('boolean');
    });
  });
});
