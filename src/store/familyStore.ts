import { useSettingsStore } from './settingsStore';
import type { ChildAccount } from '@/types';

export interface FamilyAccountsState {
  childAccounts: ChildAccount[];
  setChildAccounts: (accounts: ChildAccount[]) => void;
  addChildAccount: (name: string, age: number, allowance: number, allowancePeriod: 'daily' | 'weekly' | 'monthly') => void;
  updateChildAccount: (id: string, name: string, age: number, allowance: number, allowancePeriod: 'daily' | 'weekly' | 'monthly') => void;
  deleteChildAccount: (id: string) => void;
  addChildTransaction: (childId: string, description: string, amount: number, type: 'income' | 'expense') => void;
  payChildAllowance: (childId: string) => void;
}

function getFamilySlice(store = useSettingsStore.getState()): FamilyAccountsState {
  return {
    childAccounts: store.childAccounts,
    setChildAccounts: store.setChildAccounts,
    addChildAccount: store.addChildAccount,
    updateChildAccount: store.updateChildAccount,
    deleteChildAccount: store.deleteChildAccount,
    addChildTransaction: store.addChildTransaction,
    payChildAllowance: store.payChildAllowance,
  };
}

export function useFamilyStore(): FamilyAccountsState;
export function useFamilyStore<T>(selector: (state: FamilyAccountsState) => T): T;
export function useFamilyStore<T>(selector?: (state: FamilyAccountsState) => T) {
  return useSettingsStore((store) => {
    const slice = getFamilySlice(store);
    return selector ? selector(slice) : slice;
  });
}

useFamilyStore.getState = getFamilySlice;
