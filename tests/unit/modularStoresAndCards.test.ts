import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '@/store/settingsStore';
import { useAppPreferencesStore } from '@/store/appPreferencesStore';
import { useFamilyStore } from '@/store/familyStore';
import { useEnvelopeStore } from '@/store/envelopeStore';
import { getCardNetwork } from '@/features/cards/components/VirtualCard';
import { CARD_STYLES, LOCAL_BINS, LOCAL_TEXTS, COUNTRY_NAMES } from '@/features/cards/data/cardConstants';

describe('Modular Stores and Card Constants Unit Tests', () => {
  beforeEach(() => {
    // Reset settings store to baseline
    useSettingsStore.setState({
      language: 'ar',
      theme: 'auto',
      baseCurrency: 'SAR',
      numberSystem: 'latn',
      decimalPlaces: 2,
      numberSeparator: 'comma_dot',
      currencyDisplayMode: 'symbol',
      incognito: false,
      dbEncryption: true,
      useBiometric: false,
      childAccounts: [],
      envelopes: [],
    });
  });

  describe('useAppPreferencesStore', () => {
    it('reads and synchronizes application preferences with useSettingsStore', () => {
      const prefs = useAppPreferencesStore.getState();
      expect(prefs.language).toBe('ar');
      expect(prefs.baseCurrency).toBe('SAR');
      expect(prefs.theme).toBe('auto');

      prefs.setTheme('dark');
      expect(useSettingsStore.getState().theme).toBe('dark');
      expect(useAppPreferencesStore.getState().theme).toBe('dark');

      prefs.setBaseCurrency('AED');
      expect(useSettingsStore.getState().baseCurrency).toBe('AED');

      prefs.setNumberSystem('arab');
      expect(useSettingsStore.getState().numberSystem).toBe('arab');

      prefs.setIncognito(true);
      expect(useSettingsStore.getState().incognito).toBe(true);
    });

    it('supports selector functions for fine-grained reactivity', () => {
      const lang = useAppPreferencesStore.getState().language;
      expect(lang).toBe('ar');
    });
  });

  describe('useFamilyStore', () => {
    it('manages monitored child accounts through modular slice', () => {
      const family = useFamilyStore.getState();
      expect(family.childAccounts).toHaveLength(0);

      family.addChildAccount('عمر', 10, 50, 'weekly');
      const updatedAccounts = useSettingsStore.getState().childAccounts;
      expect(updatedAccounts).toHaveLength(1);
      expect(updatedAccounts[0].name).toBe('عمر');
      expect(updatedAccounts[0].age).toBe(10);
      expect(updatedAccounts[0].allowance).toBe(50);

      const childId = updatedAccounts[0].id;

      // Update child
      family.updateChildAccount(childId, 'عمر محمد', 11, 75, 'monthly');
      const modifiedChild = useSettingsStore.getState().childAccounts[0];
      expect(modifiedChild.name).toBe('عمر محمد');
      expect(modifiedChild.age).toBe(11);
      expect(modifiedChild.allowance).toBe(75);

      // Add child transaction
      family.addChildTransaction(childId, 'مكافأة تفوق', 30, 'income');
      expect(useSettingsStore.getState().childAccounts[0].balance).toBe(30);

      // Pay allowance
      family.payChildAllowance(childId);
      expect(useSettingsStore.getState().childAccounts[0].balance).toBe(105);

      // Delete child
      family.deleteChildAccount(childId);
      expect(useSettingsStore.getState().childAccounts).toHaveLength(0);
    });
  });

  describe('useEnvelopeStore', () => {
    it('manages digital budgeting envelopes through modular slice', () => {
      const envelopeStore = useEnvelopeStore.getState();
      expect(envelopeStore.envelopes).toHaveLength(0);

      envelopeStore.addEnvelope('طعام وشراب', 1000, '#10b981', 'restaurant');
      const envs = useSettingsStore.getState().envelopes;
      expect(envs).toHaveLength(1);
      expect(envs[0].name).toBe('طعام وشراب');
      expect(envs[0].limit).toBe(1000);
      expect(envs[0].spent).toBe(0);

      const envId = envs[0].id;

      envelopeStore.updateEnvelopeBalance(envId, 250);
      expect(useSettingsStore.getState().envelopes[0].spent).toBe(250);

      envelopeStore.deleteEnvelope(envId);
      expect(useSettingsStore.getState().envelopes).toHaveLength(0);
    });
  });

  describe('Card Constants and Card Detection', () => {
    it('correctly classifies card networks based on BIN prefixes', () => {
      expect(getCardNetwork('4000123456789010')).toBe('visa');
      expect(getCardNetwork('5100123456789010')).toBe('mastercard');
      expect(getCardNetwork('6000123456789010')).toBe('mada');
      expect(getCardNetwork('3700123456789010')).toBe('generic');
    });

    it('has all 11 languages present in LOCAL_TEXTS and valid country names', () => {
      const languages = ['ar', 'en', 'fr', 'tr', 'ur', 'ms', 'id', 'fa', 'es', 'de', 'it'];
      for (const lang of languages) {
        expect(LOCAL_TEXTS[lang]).toBeDefined();
        expect(LOCAL_TEXTS[lang].title).toBeTruthy();
      }

      expect(COUNTRY_NAMES.saudi.ar).toBe('المملكة العربية السعودية');
      expect(CARD_STYLES.length).toBeGreaterThanOrEqual(6);
      expect(Object.keys(LOCAL_BINS).length).toBeGreaterThanOrEqual(20);
    });
  });
});
