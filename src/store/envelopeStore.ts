import { useSettingsStore } from './settingsStore';
import { useShallow } from 'zustand/react/shallow';
import type { DigitalEnvelope } from '@/types';

export interface EnvelopeState {
  envelopes: DigitalEnvelope[];
  setEnvelopes: (envelopes: DigitalEnvelope[]) => void;
  addEnvelope: (name: string, limit: number, color: string, icon: string) => void;
  deleteEnvelope: (id: string) => void;
  updateEnvelopeBalance: (id: string, amount: number) => void;
}

function getEnvelopeSlice(store = useSettingsStore.getState()): EnvelopeState {
  return {
    envelopes: store.envelopes,
    setEnvelopes: store.setEnvelopes,
    addEnvelope: store.addEnvelope,
    deleteEnvelope: store.deleteEnvelope,
    updateEnvelopeBalance: store.updateEnvelopeBalance,
  };
}

export function useEnvelopeStore(): EnvelopeState;
export function useEnvelopeStore<T>(selector: (state: EnvelopeState) => T): T;
export function useEnvelopeStore<T>(selector?: (state: EnvelopeState) => T) {
  // useShallow keeps the snapshot referentially stable — without it the
  // no-selector overload returns a fresh object every render and trips
  // useSyncExternalStore into an infinite re-render loop.
  return useSettingsStore(
    useShallow((store) => {
    const slice = getEnvelopeSlice(store);
    return selector ? selector(slice) : slice;
  })
  );
}

useEnvelopeStore.getState = getEnvelopeSlice;
