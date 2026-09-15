import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ZakatNisabBanner } from '../../src/features/zakat/components/ZakatNisabBanner';
import { toast } from '../../src/toast';
import { useSettingsStore, DEFAULT_SETTINGS } from '../../src/store/settingsStore';

vi.mock('../../src/toast', () => ({ toast: vi.fn() }));
vi.mock('../../src/features/zakat/components/AnimatedNumber', () => ({
  AnimatedNumber: ({ value }: { value: number }) => <span data-testid="animated">{value}</span>,
}));

const mockToast = vi.mocked(toast);

type BannerOverrides = Partial<Parameters<typeof ZakatNisabBanner>[0]>;

function mountBanner(overrides: BannerOverrides = {}) {
  const props = {
    zakatAmount: 2500,
    nisab: 5000,
    isAboveNisab: true,
    totalAssets: 20000,
    nisabMethod: 'gold' as const,
    onNisabMethodChange: vi.fn(),
    isPro: true,
    goldPrice: '320',
    onGoldPriceChange: vi.fn(),
    silverPrice: '4',
    onSilverPriceChange: vi.fn(),
    isSyncing: false,
    onSyncPrices: vi.fn(),
    onSave: vi.fn(),
    hawl: { status: 'complete' as const, daysRemaining: 0 },
    isDueNow: true,
    nisabReachedDate: '',
    onNisabReachedDateChange: vi.fn(),
    ...overrides,
  };
  return { props, view: render(<ZakatNisabBanner {...props} />) };
}

describe('ZakatNisabBanner Unit Tests (ZakatNisabBanner.tsx)', () => {
  beforeEach(() => {
    mockToast.mockClear();
    useSettingsStore.setState({ ...DEFAULT_SETTINGS });
  });

  describe('verdict presentation', () => {
    it('renders the zakat amount and the save action when above nisab and due', () => {
      const { props } = mountBanner();
      expect(screen.getByTestId('animated')).toHaveTextContent('2500');
      const save = screen.getByRole('button', { name: /save|حفظ/i });
      fireEvent.click(save);
      expect(props.onSave).toHaveBeenCalledTimes(1);
    });

    it('flags the figure as an estimate when above nisab but the hawl is not complete', () => {
      mountBanner({ isDueNow: false, hawl: { status: 'incomplete', daysRemaining: 40 } });
      expect(screen.getAllByText(/تقدير|estimate/i).length).toBeGreaterThan(0);
      expect(document.body.textContent).toContain('40');
    });

    it('renders hawl wording per status, substituting {days} for incomplete', () => {
      const { rerender } = render(
        <ZakatNisabBanner
          {...mountBanner().props}
          hawl={{ status: 'incomplete', daysRemaining: 40 }}
        />
      );
      expect(document.body.textContent).toContain('40');

      rerender(
        <ZakatNisabBanner
          {...mountBanner().props}
          hawl={{ status: 'unknown', daysRemaining: null }}
        />
      );
      expect(document.body.textContent).not.toContain('null');
    });

    it('shows the below-nisab notice with the formatted threshold when assets exist', () => {
      mountBanner({ isAboveNisab: false, totalAssets: 800 });
      expect(document.body.textContent).toMatch(/5[,.]?000/);
      // No save action below nisab
      expect(screen.queryByRole('button', { name: /save|حفظ/i })).toBeNull();
    });

    it('shows no below-nisab notice when there is nothing to assess', () => {
      mountBanner({ isAboveNisab: false, totalAssets: 0 });
      expect(screen.queryByRole('button', { name: /save|حفظ/i })).toBeNull();
    });
  });

  describe('nisab method selector', () => {
    it('switches to the gold method', () => {
      const { props } = mountBanner({ nisabMethod: 'silver' });
      fireEvent.click(screen.getAllByRole('button', { name: /gold|ذهب/i })[0]);
      expect(props.onNisabMethodChange).toHaveBeenCalledWith('gold');
    });

    it('switches to the silver method for Pro users', () => {
      const { props } = mountBanner({ isPro: true });
      fireEvent.click(screen.getAllByRole('button', { name: /silver|فضة|token/i })[0]);
      expect(props.onNisabMethodChange).toHaveBeenCalledWith('silver');
    });

    it('blocks the silver method for non-Pro users with an error toast', () => {
      const { props } = mountBanner({ isPro: false });
      fireEvent.click(screen.getAllByRole('button', { name: /silver|فضة|token/i })[0]);
      expect(props.onNisabMethodChange).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('Required'), 'error');
    });
  });

  describe('metal price inputs', () => {
    it('forwards sanitized gold price edits', () => {
      const { props } = mountBanner();
      const goldInput = screen.getByDisplayValue('320');
      fireEvent.change(goldInput, { target: { value: '12x3' } });
      expect(props.onGoldPriceChange).toHaveBeenCalledTimes(1);
      const forwarded = props.onGoldPriceChange.mock.calls[0][0];
      expect(forwarded).not.toContain('x');
    });

    it('forwards sanitized silver price edits', () => {
      const { props } = mountBanner();
      fireEvent.change(screen.getByDisplayValue('4'), { target: { value: '5.5' } });
      expect(props.onSilverPriceChange).toHaveBeenCalledWith('5.5');
    });
  });

  describe('price syncing', () => {
    it('triggers a sync from the gold panel when idle', () => {
      const { props } = mountBanner({ isSyncing: false });
      const refresh = screen.getByRole('button', { name: /refresh|تحديث/i });
      expect(refresh).not.toBeDisabled();
      fireEvent.click(refresh);
      expect(props.onSyncPrices).toHaveBeenCalledTimes(1);
    });

    it('disables syncing while a sync is in flight', () => {
      mountBanner({ isSyncing: true });
      const refresh = screen.getByRole('button', { name: /refresh|تحديث/i });
      expect(refresh).toBeDisabled();
    });

    it('blocks the silver sync button for non-Pro users', () => {
      const { props } = mountBanner({ isPro: false });
      // The silver panel button carries no accessible name (icon-only);
      // it is the second icon-only button after the gold refresh button.
      const lockButtons = screen.getAllByText('lock').map((el) => el.closest('button')!);
      const selectorSilver = screen.getAllByRole('button', { name: /silver|فضة|token/i })[0];
      const silverSync = lockButtons.find((b) => b !== selectorSilver)!;
      fireEvent.click(silverSync);
      expect(props.onSyncPrices).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('Required'), 'error');
    });
  });

  describe('hawl start date', () => {
    it('forwards date changes', () => {
      const { props } = mountBanner();
      const dateInput = document.getElementById('zakat-hawl-date') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: '2026-01-15' } });
      expect(props.onNisabReachedDateChange).toHaveBeenCalledWith('2026-01-15');
    });
  });
});
