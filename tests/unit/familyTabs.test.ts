import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../../src/store/settingsStore';
import { t } from '../../src/i18n/engine';

describe('Family Tabs & Multi-Section Management (Shared Wallet & Monitored Kids)', () => {
  beforeEach(() => {
    // Reset childAccounts in settingsStore
    useSettingsStore.setState({ childAccounts: [] });
  });

  describe('Translations for Family Tabs', () => {
    it('provides localized labels for both tabs', () => {
      const sharedTabLabel = t('family.tabShared');
      const childrenTabLabel = t('family.tabChildren');

      expect(sharedTabLabel).toBeTruthy();
      expect(childrenTabLabel).toBeTruthy();
      expect(sharedTabLabel).toContain('المحفظة المشتركة');
      expect(childrenTabLabel).toContain('حسابات الأطفال');
    });
  });

  describe('Monitored Children Tab Operations', () => {
    it('creates child account with correct initial balance and periodic allowance', () => {
      const { addChildAccount } = useSettingsStore.getState();

      addChildAccount('سعود', 9, 50, 'weekly');

      const accounts = useSettingsStore.getState().childAccounts;
      expect(accounts).toHaveLength(1);
      expect(accounts[0].name).toBe('سعود');
      expect(accounts[0].age).toBe(9);
      expect(accounts[0].allowance).toBe(50);
      expect(accounts[0].allowancePeriod).toBe('weekly');
      expect(accounts[0].balance).toBe(0);
      expect(accounts[0].transactions).toEqual([]);
    });

    it('records child spend and reward transactions correctly updating balance', () => {
      const { addChildAccount, addChildTransaction } = useSettingsStore.getState();

      addChildAccount('سارة', 11, 100, 'monthly');
      const childId = useSettingsStore.getState().childAccounts[0].id;

      // 1. Reward transaction (+30)
      addChildTransaction(childId, 'مكافأة تفوق دراسي', 30, 'income');
      let account = useSettingsStore.getState().childAccounts[0];
      expect(account.balance).toBe(30);
      expect(account.transactions).toHaveLength(1);
      expect(account.transactions[0].type).toBe('income');
      expect(account.transactions[0].amount).toBe(30);

      // 2. Spend transaction (-10)
      addChildTransaction(childId, 'شراء قصة مصورة', 10, 'expense');
      account = useSettingsStore.getState().childAccounts[0];
      expect(account.balance).toBe(20);
      expect(account.transactions).toHaveLength(2);
      expect(account.transactions[0].type).toBe('expense'); // newest first
      expect(account.transactions[0].amount).toBe(10);
    });

    it('pays child allowance and deposits it to child wallet balance', () => {
      const { addChildAccount, payChildAllowance } = useSettingsStore.getState();

      addChildAccount('عمر', 8, 40, 'weekly');
      const childId = useSettingsStore.getState().childAccounts[0].id;

      payChildAllowance(childId);

      const account = useSettingsStore.getState().childAccounts[0];
      expect(account.balance).toBe(40);
      expect(account.transactions).toHaveLength(1);
      expect(account.transactions[0].type).toBe('income');
      expect(account.transactions[0].amount).toBe(40);
      expect(account.transactions[0].description).toBe('المصروف الدوري');
    });

    it('computes total kids balances and periodic allowances aggregates', () => {
      const { addChildAccount, addChildTransaction } = useSettingsStore.getState();

      addChildAccount('فهد', 7, 25, 'weekly');
      addChildAccount('نورة', 10, 50, 'weekly');

      const accounts = useSettingsStore.getState().childAccounts;
      addChildTransaction(accounts[0].id, 'عيدية', 50, 'income');
      addChildTransaction(accounts[1].id, 'مكافأة حفظ قرآن', 70, 'income');

      const updatedAccounts = useSettingsStore.getState().childAccounts;
      const totalBalance = updatedAccounts.reduce((sum, c) => sum + (c.balance || 0), 0);
      const totalAllowance = updatedAccounts.reduce((sum, c) => sum + (c.allowance || 0), 0);

      expect(totalBalance).toBe(120);
      expect(totalAllowance).toBe(75);
    });

    it('deletes child account safely', () => {
      const { addChildAccount, deleteChildAccount } = useSettingsStore.getState();

      addChildAccount('ريان', 6, 20, 'daily');
      expect(useSettingsStore.getState().childAccounts).toHaveLength(1);

      const childId = useSettingsStore.getState().childAccounts[0].id;
      deleteChildAccount(childId);

      expect(useSettingsStore.getState().childAccounts).toHaveLength(0);
    });

    it('updates child account details (name, age, allowance, period) accurately', () => {
      const { addChildAccount, updateChildAccount } = useSettingsStore.getState();

      addChildAccount('ريان', 6, 20, 'daily');
      const childId = useSettingsStore.getState().childAccounts[0].id;

      updateChildAccount(childId, 'ريان المطور', 7, 35, 'weekly');

      const updated = useSettingsStore.getState().childAccounts.find(c => c.id === childId);
      expect(updated).toBeDefined();
      expect(updated?.name).toBe('ريان المطور');
      expect(updated?.age).toBe(7);
      expect(updated?.allowance).toBe(35);
      expect(updated?.allowancePeriod).toBe('weekly');
    });
  });

  describe('Edit Family Member & Child Translations', () => {
    it('provides localized labels for editing members and children', () => {
      expect(t('family.editMember')).toBeTruthy();
      expect(t('family.memberUpdated')).toBeTruthy();
      expect(t('family.monitored.editChild')).toBeTruthy();
      expect(t('family.monitored.childUpdated')).toBeTruthy();
    });
  });
});

import { sanitizeNumericInput, sanitizeIntegerInput, sanitizeNameInput } from '../../src/core/utils';

describe('Strict Input Sanitization (Letters & Digits segregation)', () => {
  describe('sanitizeNumericInput', () => {
    it('strictly strips Latin and Arabic letters from numeric input', () => {
      expect(sanitizeNumericInput('abc')).toBe('');
      expect(sanitizeNumericInput('12abc34')).toBe('1234');
      expect(sanitizeNumericInput('٥٠ريال')).toBe('50');
      expect(sanitizeNumericInput('أحمد')).toBe('');
    });

    it('preserves valid decimal point and strips extraneous dots', () => {
      expect(sanitizeNumericInput('12.50')).toBe('12.50');
      expect(sanitizeNumericInput('12.5.8')).toBe('12.58');
      expect(sanitizeNumericInput('.5')).toBe('.5');
    });

    it('normalizes Eastern Arabic and Persian digits to standard ASCII digits', () => {
      expect(sanitizeNumericInput('١٢٣.٤٥')).toBe('123.45');
      expect(sanitizeNumericInput('۱۲۳.۴۵')).toBe('123.45');
      expect(sanitizeNumericInput('٥٠٠')).toBe('500');
    });

    it('handles negative sign correctly when allowed', () => {
      expect(sanitizeNumericInput('-100', true, true)).toBe('-100');
      expect(sanitizeNumericInput('-100', true, false)).toBe('100');
    });

    it('strips special currency and punctuation symbols', () => {
      expect(sanitizeNumericInput('$150.00')).toBe('150.00');
      expect(sanitizeNumericInput('€ 99.9%')).toBe('99.9');
      expect(sanitizeNumericInput('1,000.50')).toBe('1000.50');
    });
  });

  describe('sanitizeIntegerInput', () => {
    it('strips decimals and letters, leaving digits only', () => {
      expect(sanitizeIntegerInput('12.5')).toBe('125');
      expect(sanitizeIntegerInput('15abc')).toBe('15');
      expect(sanitizeIntegerInput('٢٥')).toBe('25');
    });
  });

  describe('sanitizeNameInput', () => {
    it('strips standard and Arabic-Indic numerals from name fields', () => {
      expect(sanitizeNameInput('محمد 123')).toBe('محمد ');
      expect(sanitizeNameInput('خالد ١٢')).toBe('خالد ');
      expect(sanitizeNameInput('User 404')).toBe('User ');
    });

    it('preserves valid letters and spaces', () => {
      expect(sanitizeNameInput('سعود عبد العزيز')).toBe('سعود عبد العزيز');
      expect(sanitizeNameInput('John Doe')).toBe('John Doe');
    });
  });
});
