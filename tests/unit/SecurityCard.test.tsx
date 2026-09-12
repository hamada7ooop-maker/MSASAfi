import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SecurityCard } from '@/features/settings/components/cards/SecurityCard';
import { BrowserRouter } from 'react-router-dom';
import { toast } from '@/toast';

vi.mock('@/toast', () => ({
  toast: vi.fn()
}));

describe('SecurityCard Component (SecurityCard.tsx)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders security settings and prevents enabling biometrics when no PIN is configured', () => {
    const updateSetting = vi.fn();
    const refreshSettings = vi.fn();

    const settings = {
      pinHash: null,
      pin: null,
      useBiometric: false,
      autoLock: true,
      shakeToBlur: true,
      incognito: false,
      autoBackup: false
    };

    render(
      <BrowserRouter>
        <SecurityCard
          settings={settings}
          updateSetting={updateSetting}
          refreshSettings={refreshSettings}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('القفل التلقائي')).toBeDefined();

    // The first switch is biometric
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThan(0);

    // Clicking biometric switch without PIN should NOT call updateSetting and should show toast error
    fireEvent.click(switches[0]);
    expect(updateSetting).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.stringContaining('PIN'),
      'error'
    );
  });

  it('toggles autoLock switch successfully', () => {
    const updateSetting = vi.fn();
    const refreshSettings = vi.fn();

    const settings = {
      pinHash: 'dummy_hash',
      useBiometric: false,
      autoLock: true,
      shakeToBlur: true,
      incognito: false
    };

    render(
      <BrowserRouter>
        <SecurityCard
          settings={settings}
          updateSetting={updateSetting}
          refreshSettings={refreshSettings}
        />
      </BrowserRouter>
    );

    const switches = screen.getAllByRole('switch');
    // switches[1] is autoLock
    fireEvent.click(switches[1]);
    expect(updateSetting).toHaveBeenCalledWith('autoLock', false);
  });

  it('toggles dbEncryption and incognito mode switches successfully', () => {
    const updateSetting = vi.fn();
    const refreshSettings = vi.fn();

    const settings = {
      pinHash: 'dummy_hash',
      useBiometric: false,
      autoLock: true,
      dbEncryption: true,
      incognito: false
    };

    render(
      <BrowserRouter>
        <SecurityCard
          settings={settings}
          updateSetting={updateSetting}
          refreshSettings={refreshSettings}
        />
      </BrowserRouter>
    );

    const switches = screen.getAllByRole('switch');
    // switches[2] is dbEncryption, switches[3] is incognito
    fireEvent.click(switches[2]);
    expect(updateSetting).toHaveBeenCalledWith('dbEncryption', false);

    fireEvent.click(switches[3]);
    expect(updateSetting).toHaveBeenCalledWith('incognito', true);
  });

  it('allows disabling biometric when PIN is set', () => {
    const updateSetting = vi.fn();
    const refreshSettings = vi.fn();

    const settings = {
      pinHash: 'dummy_hash_for_test',
      useBiometric: true,
      autoLock: true,
      lockTimeout: 'immediate',
      shakeToBlur: true
    };

    render(
      <BrowserRouter>
        <SecurityCard
          settings={settings}
          updateSetting={updateSetting}
          refreshSettings={refreshSettings}
        />
      </BrowserRouter>
    );

    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    expect(updateSetting).toHaveBeenCalledWith('useBiometric', false);
  });
});
