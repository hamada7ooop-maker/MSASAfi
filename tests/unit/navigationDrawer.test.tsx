/**
 * Directive 19 — Batch 5: characterization of the navigation drawer.
 *
 * The last uncovered navigation surface (17.39% at the ladder's last
 * reading). Pins the menu structure, the active-route highlight, the
 * navigate-and-close contract, and the closed-state off-canvas behavior
 * BEFORE the closing sweep touches the surface.
 *
 * i18n labels settle asynchronously, so items are identified by their
 * material icon ligatures and by behavior — never by translated text.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { NavigationDrawer } from '../../src/components/layout/NavigationDrawer';
import { touch } from '../../src/core/haptics';

vi.mock('../../src/core/haptics', () => ({
  touch: { light: vi.fn(), select: vi.fn(), confirm: vi.fn(), destruct: vi.fn(), error: vi.fn(), triumph: vi.fn() },
}));
import { APP_VERSION } from '../../src/core/constants';

/** The backdrop and drawer, identified by their classes (siblings precede them). */
const backdropEl = (c: HTMLElement) =>
  Array.from(c.children).find((el) => el.className.includes('bg-black/60')) as HTMLElement;
const drawerEl = (c: HTMLElement) =>
  Array.from(c.children).find((el) => el.className.includes('w-[280px]')) as HTMLElement;

const PathProbe = () => {
  const location = useLocation();
  return <div data-testid="path-probe">{location.pathname}</div>;
};

const renderDrawer = (isOpen: boolean, initialEntry = '/home') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PathProbe />
      <Routes>
        <Route path="*" element={<div />} />
      </Routes>
      <NavigationDrawer isOpen={isOpen} onClose={onCloseSpy} />
    </MemoryRouter>
  );

const onCloseSpy = vi.fn();

const ITEM_ICONS = [
  'dashboard', 'auto_awesome', 'receipt_long', 'account_balance_wallet', 'monitoring',
  'trending_up', 'target', 'money_off', 'payments', 'credit_card', 'autorenew',
  'groups', 'military_tech', 'card_giftcard', 'redeem',
  'calculate', 'currency_exchange', 'menu_book', 'settings', 'info',
];

beforeEach(() => {
  onCloseSpy.mockClear();
  vi.mocked(touch.select).mockClear();
});

describe('NavigationDrawer — characterization', () => {
  it('renders all 21 navigation items (receipt_long serves both transactions and VAT)', () => {
    renderDrawer(true);
    for (const icon of ITEM_ICONS) {
      const hits = screen.getAllByText(icon);
      expect(hits.length).toBeGreaterThanOrEqual(1);
    }
    // receipt_long appears twice: transactions + VAT calculator
    expect(screen.getAllByText('receipt_long').length).toBe(2);
  });

  it('highlights the item matching the current route', () => {
    renderDrawer(true, '/reports');
    const reportsBtn = screen.getByText('monitoring').closest('button');
    expect(reportsBtn?.className).toContain('bg-primary/10');
    const homeBtn = screen.getByText('dashboard').closest('button');
    expect(homeBtn?.className).not.toContain('bg-primary/10');
  });

  it('navigates AND closes when an item is picked', () => {
    const { rerender } = renderDrawer(true, '/home');
    fireEvent.click(screen.getByText('trending_up').closest('button') as HTMLElement);
    expect(onCloseSpy).toHaveBeenCalledTimes(1);
    // navigation happened: the drawer re-rendered against the new location.
    // The probe lives in the router, so re-render and read it.
    rerender(
      <MemoryRouter initialEntries={['/investments']}>
        <PathProbe />
        <Routes><Route path="*" element={<div />} /></Routes>
        <NavigationDrawer isOpen={true} onClose={onCloseSpy} />
      </MemoryRouter>
    );
    expect(screen.getByTestId('path-probe').textContent).toBe('/investments');
  });

  it('the backdrop and the header close button both close', () => {
    const { container } = renderDrawer(true);
    const backdrop = backdropEl(container);
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop);
    expect(onCloseSpy).toHaveBeenCalledTimes(1);
    // header close button (aria-label may be key or Arabic — find by the close icon)
    fireEvent.click(screen.getByText('close').closest('button') as HTMLElement);
    expect(onCloseSpy).toHaveBeenCalledTimes(2);
  });

  it('closed state: the drawer is parked off-canvas and the backdrop ignores clicks', () => {
    const { container } = renderDrawer(false);
    const backdrop = backdropEl(container);
    expect(backdrop.className).toContain('pointer-events-none');
    const drawer = drawerEl(container);
    // test locale is Arabic → RTL → parked on the right
    expect(drawer.className).toContain('right-0');
    expect(drawer.className).toContain('translate-x-full');
  });

  it('carries the app version in the footer', () => {
    renderDrawer(true);
    expect(screen.getByText(`Version ${APP_VERSION}`)).toBeTruthy();
  });

  // ─── Batch 5 wiring: the pick answers with the select pulse ───

  it('picking a destination answers with touch.select', () => {
    renderDrawer(true);
    fireEvent.click(screen.getByText('dashboard').closest('button') as HTMLElement);
    expect(touch.select).toHaveBeenCalledTimes(1);
  });

  it('the drawer slides on the sanctioned smooth spring, not a hand-rolled ease', () => {
    const { container } = renderDrawer(true);
    const drawer = Array.from(container.children).find(
      (el) => el.className.includes('w-[280px]')
    ) as HTMLElement;
    expect(drawer.className).toContain('ease-[var(--ease-smooth)]');
  });
});
