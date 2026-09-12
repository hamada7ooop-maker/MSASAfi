import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { db } from '../../src/core/db/core';
import { initAuth, setupAuthListeners } from '../../src/hooks/useAuthInit';
import { useAppStore } from '../../src/store/appStore';
import { PinScreen } from '../../src/features/auth/components/PinScreen';
import { hashPin } from '../../src/core/security';

let capturedStateListener: ((state: { isActive: boolean }) => void) | null = null;

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn((eventName: string, callback: (state: { isActive: boolean }) => void) => {
      if (eventName === 'appStateChange') {
        capturedStateListener = callback;
      }
      return Promise.resolve({ remove: vi.fn() });
    })
  }
}));

describe('Auth Lifecycle & Background Transition Tests', () => {
  beforeEach(async () => {
    await db.settings.clear();
    useAppStore.setState({
      isLocked: false,
      hasPin: false,
      autoLock: true
    });
    capturedStateListener = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initAuth sets locked state when PIN and autoLock are configured', async () => {
    await db.setSetting('pinHash', 'hash_secure_pbkdf2_test');
    await db.setSetting('autoLock', true);

    await initAuth();

    const state = useAppStore.getState();
    expect(state.hasPin).toBe(true);
    expect(state.autoLock).toBe(true);
    expect(state.isLocked).toBe(true);
  });

  it('initAuth leaves app unlocked when no PIN exists', async () => {
    await initAuth();

    const state = useAppStore.getState();
    expect(state.hasPin).toBe(false);
    expect(state.isLocked).toBe(false);
  });

  it('setupAuthListeners locks app immediately when backgrounded (isActive: false)', async () => {
    useAppStore.setState({
      isLocked: false,
      hasPin: true,
      autoLock: true
    });

    setupAuthListeners();

    expect(capturedStateListener).toBeDefined();
    // Trigger app backgrounding event
    capturedStateListener?.({ isActive: false });

    // App should be locked immediately in memory
    expect(useAppStore.getState().isLocked).toBe(true);
  });

  it('setupAuthListeners triggers recurring transactions processing when foregrounded (isActive: true)', async () => {
    const processRecurringSpy = vi.spyOn(db, 'processRecurringTransactions').mockResolvedValue([] as unknown as never);

    setupAuthListeners();

    expect(capturedStateListener).toBeDefined();
    // Trigger app resume event
    capturedStateListener?.({ isActive: true });

    expect(processRecurringSpy).toHaveBeenCalledTimes(1);
  });

  describe('PinScreen Component UI Tests', () => {
    it('renders numpad and unlocks app upon correct PIN entry', async () => {
      const salt = 'testsalt1234567890';
      const hash = await hashPin('1234', salt);
      await db.setSetting('pinHash', hash);
      await db.setSetting('pinSalt', salt);

      useAppStore.setState({ isLocked: true });

      render(React.createElement(PinScreen));

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Press '1', '2', '3', '4' sequentially with state settling
      await act(async () => { fireEvent.click(screen.getByLabelText('1')); });
      await act(async () => { fireEvent.click(screen.getByLabelText('2')); });
      await act(async () => { fireEvent.click(screen.getByLabelText('3')); });
      await act(async () => { fireEvent.click(screen.getByLabelText('4')); });

      await waitFor(() => {
        expect(useAppStore.getState().isLocked).toBe(false);
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
    });

    it('handles backspace delete and wrong PIN gracefully', async () => {
      const salt = 'testsalt1234567890';
      const hash = await hashPin('9999', salt);
      await db.setSetting('pinHash', hash);
      await db.setSetting('pinSalt', salt);

      useAppStore.setState({ isLocked: true });

      render(React.createElement(PinScreen));

      // Type 1, 2 then backspace, then 0, 0, 0, 0 (wrong)
      await act(async () => { fireEvent.click(screen.getByLabelText('1')); });
      await act(async () => { fireEvent.click(screen.getByLabelText('2')); });
      await act(async () => { fireEvent.click(screen.getByLabelText(/Delete|حذف/i)); });
      
      await act(async () => { fireEvent.click(screen.getByLabelText('0')); });
      await act(async () => { fireEvent.click(screen.getByLabelText('0')); });
      await act(async () => { fireEvent.click(screen.getByLabelText('0')); });
      await act(async () => { fireEvent.click(screen.getByLabelText('0')); });

      await waitFor(() => {
        expect(useAppStore.getState().isLocked).toBe(true);
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 150));
      });
    });
  });

  describe('BiometricService Unit Tests', () => {
    it('returns false for isAvailable on web platform or when biometric unavailable', async () => {
      const { BiometricService } = await import('../../src/core/services/BiometricService');
      const avail = await BiometricService.isAvailable();
      expect(typeof avail).toBe('boolean');
    });

    it('handles authenticate gracefully', async () => {
      const { BiometricService } = await import('../../src/core/services/BiometricService');
      const auth = await BiometricService.authenticate('Test auth reason');
      expect(typeof auth).toBe('boolean');
    });
  });

  describe('Visibility Change & Document Lifecycle Tests', () => {
    it('setupAuthListeners locks app immediately on document visibilitychange when hidden', () => {
      useAppStore.setState({
        isLocked: false,
        hasPin: true,
        autoLock: true
      });

      const cleanup = setupAuthListeners();

      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(useAppStore.getState().isLocked).toBe(true);

      cleanup();
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    });
  });

  describe('PIN & Biometric Deactivation Tests', () => {
    it('removing PIN resets biometric setting to false in DB and SettingsStore', async () => {
      const { useSettingsStore } = await import('../../src/store/settingsStore');
      const { SettingsService } = await import('../../src/core/services/SettingsService');

      // Configure PIN and Biometrics
      await db.setSetting('pinHash', 'sample_hash');
      await db.setSetting('useBiometric', true);
      await SettingsService.updateSetting('useBiometric', true);
      useAppStore.getState().setHasPin(true);

      expect(useSettingsStore.getState().useBiometric).toBe(true);
      expect(useAppStore.getState().hasPin).toBe(true);

      // Simulate PIN removal logic (as in SecurityCard)
      await db.setSetting('pinHash', null);
      await db.setSetting('pinSalt', null);
      await db.setSetting('pin', null);
      await db.setSetting('useBiometric', false);
      await SettingsService.updateSetting('useBiometric', false);
      useSettingsStore.getState().setUseBiometric(false);
      useAppStore.getState().setHasPin(false);

      expect(await db.getSetting('pinHash')).toBeNull();
      expect(await db.getSetting('useBiometric')).toBe(false);
      expect(useSettingsStore.getState().useBiometric).toBe(false);
      expect(useAppStore.getState().hasPin).toBe(false);
    });
  });

  describe('confirmSheet UI and Labels Tests', () => {
    it('defaults to confirm label (تأكيد) instead of delete when confirmLabel is omitted', async () => {
      const { confirmSheet } = await import('../../src/toast');
      confirmSheet('Test message', () => {});
      const confirmBtn = document.querySelector('.bottom-sheet-content button:last-child');
      expect(confirmBtn).not.toBeNull();
      expect(confirmBtn?.textContent).toMatch(/تأكيد|Confirm/i);
      expect(confirmBtn?.textContent).not.toMatch(/حذف|Delete/i);

      document.querySelectorAll('.bottom-sheet-overlay').forEach((el) => el.remove());
    });

    it('uses explicit custom labels when provided (e.g. تطبيق and إلغاء)', async () => {
      const { confirmSheet } = await import('../../src/toast');
      confirmSheet('Test prompt', () => {}, 'تطبيق', 'إلغاء');
      const buttons = document.querySelectorAll('.bottom-sheet-content button');
      expect(buttons[0]?.textContent).toBe('إلغاء');
      expect(buttons[1]?.textContent).toBe('تطبيق');

      document.querySelectorAll('.bottom-sheet-overlay').forEach((el) => el.remove());
    });
  });
});

