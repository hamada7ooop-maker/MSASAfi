import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEnvelopeStore } from '../../src/store/envelopeStore';
import { useFamilyStore } from '../../src/store/familyStore';
import { useAppPreferencesStore } from '../../src/store/appPreferencesStore';
import { useSettingsStore, DEFAULT_SETTINGS } from '../../src/store/settingsStore';

/**
 * The three modular stores (envelope / family / appPreferences) are selector
 * slices over useSettingsStore: their hooks project the shared store into a
 * narrow API, and their actions ARE the settings store actions. These tests
 * drive every action through the slice wrappers and pin the state transitions
 * the UI depends on (id generation, balance math, clamping, prepend order).
 */
describe('Modular Stores Unit Tests (envelopeStore / familyStore / appPreferencesStore)', () => {
  beforeEach(() => {
    useSettingsStore.setState({ ...DEFAULT_SETTINGS, envelopes: [], childAccounts: [] });
  });

  describe('useEnvelopeStore', () => {
    it('getState() projects the envelope slice of the settings store', () => {
      const slice = useEnvelopeStore.getState();
      expect(slice.envelopes).toEqual([]);
      expect(slice.setEnvelopes).toBe(useSettingsStore.getState().setEnvelopes);
      expect(slice.addEnvelope).toBe(useSettingsStore.getState().addEnvelope);
    });

    it('addEnvelope appends a fresh envelope with a unique id and spent=0', () => {
      const slice = useEnvelopeStore.getState();
      slice.addEnvelope('سفر', 5000, 'blue', 'flight');
      slice.addEnvelope('طوارئ', 1000, 'red', 'emergency');
      const envelopes = useEnvelopeStore.getState().envelopes;
      expect(envelopes).toHaveLength(2);
      expect(envelopes[0]).toMatchObject({ name: 'سفر', limit: 5000, spent: 0, color: 'blue', icon: 'flight' });
      expect(envelopes[1]).toMatchObject({ name: 'طوارئ', limit: 1000, spent: 0 });
      expect(envelopes[0].id).not.toBe(envelopes[1].id);
      expect(envelopes[0].id).toBeTruthy();
    });

    it('updateEnvelopeBalance adds spending and clamps at zero (no negative spent)', () => {
      const slice = useEnvelopeStore.getState();
      slice.addEnvelope('سفر', 5000, 'blue', 'flight');
      const { id } = useEnvelopeStore.getState().envelopes[0];

      slice.updateEnvelopeBalance(id, 300);
      expect(useEnvelopeStore.getState().envelopes[0].spent).toBe(300);

      slice.updateEnvelopeBalance(id, -1000); // refund larger than spent
      expect(useEnvelopeStore.getState().envelopes[0].spent).toBe(0);
    });

    it('updateEnvelopeBalance ignores unknown ids', () => {
      const slice = useEnvelopeStore.getState();
      slice.addEnvelope('سفر', 5000, 'blue', 'flight');
      slice.updateEnvelopeBalance('missing-id', 100);
      expect(useEnvelopeStore.getState().envelopes[0].spent).toBe(0);
    });

    it('deleteEnvelope removes only the target envelope', () => {
      const slice = useEnvelopeStore.getState();
      slice.addEnvelope('أ', 100, 'red', 'a');
      slice.addEnvelope('ب', 200, 'blue', 'b');
      const [first] = useEnvelopeStore.getState().envelopes;
      slice.deleteEnvelope(first.id);
      const remaining = useEnvelopeStore.getState().envelopes;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].name).toBe('ب');
    });

    it('setEnvelopes replaces the collection wholesale', () => {
      useEnvelopeStore
        .getState()
        .setEnvelopes([{ id: 'e1', name: 'جاهز', limit: 50, spent: 20, color: 'green', icon: 'x' }]);
      expect(useEnvelopeStore.getState().envelopes).toHaveLength(1);
      expect(useEnvelopeStore.getState().envelopes[0].id).toBe('e1');
    });

    it('hook returns the full slice, and selectors track live state', () => {
      const { result: sliceHook } = renderHook(() => useEnvelopeStore());
      expect(sliceHook.current.envelopes).toEqual([]);

      const { result: selected } = renderHook(() => useEnvelopeStore((s) => s.envelopes.length));
      expect(selected.current).toBe(0);
      act(() => {
        sliceHook.current.addEnvelope('سفر', 5000, 'blue', 'flight');
      });
      expect(selected.current).toBe(1);
    });
  });

  describe('useFamilyStore', () => {
    it('getState() projects the family slice of the settings store', () => {
      const slice = useFamilyStore.getState();
      expect(slice.childAccounts).toEqual([]);
      expect(slice.addChildAccount).toBe(useSettingsStore.getState().addChildAccount);
      expect(slice.payChildAllowance).toBe(useSettingsStore.getState().payChildAllowance);
    });

    it('addChildAccount appends a child with zero balance and no transactions', () => {
      useFamilyStore.getState().addChildAccount('سارة', 10, 20, 'weekly');
      const accounts = useFamilyStore.getState().childAccounts;
      expect(accounts).toHaveLength(1);
      expect(accounts[0]).toMatchObject({
        name: 'سارة',
        age: 10,
        balance: 0,
        allowance: 20,
        allowancePeriod: 'weekly',
        transactions: [],
      });
      expect(accounts[0].id).toBeTruthy();
    });

    it('updateChildAccount rewrites profile fields without touching balance/transactions', () => {
      useFamilyStore.getState().addChildAccount('سارة', 10, 20, 'weekly');
      const { id } = useFamilyStore.getState().childAccounts[0];
      useFamilyStore.getState().addChildTransaction(id, 'هدية', 15, 'income');
      useFamilyStore.getState().updateChildAccount(id, 'سارة الكبرى', 11, 25, 'monthly');
      const child = useFamilyStore.getState().childAccounts[0];
      expect(child).toMatchObject({ name: 'سارة الكبرى', age: 11, allowance: 25, allowancePeriod: 'monthly' });
      expect(child.balance).toBe(15);
      expect(child.transactions).toHaveLength(1);
    });

    it('deleteChildAccount removes only the target child', () => {
      useFamilyStore.getState().addChildAccount('أ', 8, 5, 'daily');
      useFamilyStore.getState().addChildAccount('ب', 9, 5, 'daily');
      const [first] = useFamilyStore.getState().childAccounts;
      useFamilyStore.getState().deleteChildAccount(first.id);
      const remaining = useFamilyStore.getState().childAccounts;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].name).toBe('ب');
    });

    it('addChildTransaction: income raises the balance and prepends the transaction', () => {
      useFamilyStore.getState().addChildAccount('سارة', 10, 20, 'weekly');
      const { id } = useFamilyStore.getState().childAccounts[0];
      useFamilyStore.getState().addChildTransaction(id, 'عيدية', 50, 'income');
      useFamilyStore.getState().addChildTransaction(id, 'مصروف مدرسي', 10, 'expense');
      const child = useFamilyStore.getState().childAccounts[0];
      expect(child.balance).toBe(40);
      expect(child.transactions).toHaveLength(2);
      expect(child.transactions[0].description).toBe('مصروف مدرسي'); // newest first
      expect(child.transactions[0].id).not.toBe(child.transactions[1].id);
      expect(child.transactions[0].date).toBeTruthy();
    });

    it('addChildTransaction on an unknown child is a no-op', () => {
      useFamilyStore.getState().addChildAccount('سارة', 10, 20, 'weekly');
      useFamilyStore.getState().addChildTransaction('ghost-child', 'هدية', 50, 'income');
      const child = useFamilyStore.getState().childAccounts[0];
      expect(child.balance).toBe(0);
      expect(child.transactions).toHaveLength(0);
    });

    it('payChildAllowance credits the allowance as a periodic income transaction', () => {
      useFamilyStore.getState().addChildAccount('سارة', 10, 20, 'weekly');
      const { id } = useFamilyStore.getState().childAccounts[0];
      useFamilyStore.getState().payChildAllowance(id);
      const child = useFamilyStore.getState().childAccounts[0];
      expect(child.balance).toBe(20);
      expect(child.transactions).toHaveLength(1);
      expect(child.transactions[0]).toMatchObject({
        description: 'المصروف الدوري',
        amount: 20,
        type: 'income',
      });
    });

    it('payChildAllowance refuses children with zero allowance (guard)', () => {
      useFamilyStore.getState().addChildAccount('سارة', 10, 0, 'weekly');
      const { id } = useFamilyStore.getState().childAccounts[0];
      useFamilyStore.getState().payChildAllowance(id);
      const child = useFamilyStore.getState().childAccounts[0];
      expect(child.balance).toBe(0);
      expect(child.transactions).toHaveLength(0);
    });

    it('hook returns the full slice, and selectors track live state', () => {
      const { result: sliceHook } = renderHook(() => useFamilyStore());
      const { result: selected } = renderHook(() => useFamilyStore((s) => s.childAccounts.length));
      expect(selected.current).toBe(0);
      act(() => {
        sliceHook.current.addChildAccount('سارة', 10, 20, 'weekly');
      });
      expect(selected.current).toBe(1);
      expect(sliceHook.current.childAccounts[0].name).toBe('سارة');
    });
  });

  describe('useAppPreferencesStore', () => {
    it('getState() projects the preference slice with the real setters', () => {
      const slice = useAppPreferencesStore.getState();
      expect(slice.language).toBe(DEFAULT_SETTINGS.language);
      expect(slice.baseCurrency).toBe(DEFAULT_SETTINGS.baseCurrency);
      expect(slice.setLang).toBe(useSettingsStore.getState().setLang);
      expect(slice.setFontSize).toBe(useSettingsStore.getState().setFontSize);
    });

    it('every preference setter mutates the underlying settings store', () => {
      const slice = useAppPreferencesStore.getState();
      slice.setLang('en');
      slice.setTheme('dark');
      slice.setBaseCurrency('USD');
      slice.setNumberSystem('arab');
      slice.setDecimalPlaces(3);
      slice.setNumberSeparator('space');
      slice.setCurrencyDisplayMode('code');
      slice.setIncognito(true);
      slice.setDbEncryption(false);
      slice.setDarkPalette('midnight');
      slice.setLightPalette('sunset');
      slice.setUseBiometric(true);
      slice.setFontSize('large');

      const after = useAppPreferencesStore.getState();
      expect(after.language).toBe('en');
      expect(after.theme).toBe('dark');
      expect(after.baseCurrency).toBe('USD');
      expect(after.numberSystem).toBe('arab');
      expect(after.decimalPlaces).toBe(3);
      expect(after.numberSeparator).toBe('space');
      expect(after.currencyDisplayMode).toBe('code');
      expect(after.incognito).toBe(true);
      expect(after.dbEncryption).toBe(false);
      expect(after.darkPalette).toBe('midnight');
      expect(after.lightPalette).toBe('sunset');
      expect(after.useBiometric).toBe(true);
      expect(after.fontSize).toBe('large');
    });

    it('hook selectors track live preference changes', () => {
      const { result } = renderHook(() => useAppPreferencesStore((s) => s.language));
      expect(result.current).toBe('ar');
      act(() => {
        useAppPreferencesStore.getState().setLang('fr');
      });
      expect(result.current).toBe('fr');
    });
  });
});
