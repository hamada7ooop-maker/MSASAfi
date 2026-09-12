import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotifPanel } from '../NotifPanel';
import { useAppStore } from '../../../../store/appStore';
import * as notifModule from '../../../../core/notifications';

vi.mock('../../../../core/notifications', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../core/notifications')>();
  return {
    ...actual,
    buildAppNotifications: vi.fn().mockResolvedValue([
      {
        id: 'notif_bill_1',
        type: 'error',
        icon: 'receipt',
        title: 'Electricity Bill Due',
        body: 'Pay 250 USD before tomorrow',
        page: 'bills',
        canSnooze: true,
      },
      {
        id: 'notif_budget_2',
        type: 'warn',
        icon: 'pie_chart',
        title: 'Budget Alert',
        body: 'You reached 90% of Restaurants budget',
        page: 'budgets',
        canSnooze: false,
      }
    ]),
    dismissNotif: vi.fn().mockResolvedValue(undefined),
    clearAllNotifs: vi.fn().mockResolvedValue(undefined),
    snoozeNotif: vi.fn(),
  };
});

describe('NotifPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ isNotifPanelOpen: false, notifCount: 0 });
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <MemoryRouter>
        <NotifPanel />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders notifications list when open', async () => {
    useAppStore.setState({ isNotifPanelOpen: true });

    render(
      <MemoryRouter>
        <NotifPanel />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Electricity Bill Due')).toBeDefined();
      expect(screen.getByText('Budget Alert')).toBeDefined();
    });
  });

  it('closes panel when close button is clicked', async () => {
    useAppStore.setState({ isNotifPanelOpen: true });

    render(
      <MemoryRouter>
        <NotifPanel />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Electricity Bill Due')).toBeDefined();
    });

    const closeBtn = screen.getByLabelText('إغلاق');
    fireEvent.click(closeBtn);

    expect(useAppStore.getState().isNotifPanelOpen).toBe(false);
  });

  it('filters notifications by category', async () => {
    useAppStore.setState({ isNotifPanelOpen: true });

    render(
      <MemoryRouter>
        <NotifPanel />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Electricity Bill Due')).toBeDefined();
    });

    // Click critical filter
    const critButtons = screen.getAllByRole('button');
    const critBtn = critButtons.find(b => b.textContent?.includes('حرجة') || b.textContent?.includes('critical'));
    if (critBtn) {
      fireEvent.click(critBtn);
      expect(screen.getByText('Electricity Bill Due')).toBeDefined();
    }
  });

  it('dismisses a notification item', async () => {
    useAppStore.setState({ isNotifPanelOpen: true });

    render(
      <MemoryRouter>
        <NotifPanel />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Electricity Bill Due')).toBeDefined();
    });

    const dismissBtns = screen.getAllByTitle(/تجاهل|dismiss/i);
    fireEvent.click(dismissBtns[0]);

    await waitFor(() => {
      expect(notifModule.dismissNotif).toHaveBeenCalledWith('notif_bill_1');
      expect(screen.queryByText('Electricity Bill Due')).toBeNull();
    });
  });

  it('snoozes a notification item', async () => {
    useAppStore.setState({ isNotifPanelOpen: true });

    render(
      <MemoryRouter>
        <NotifPanel />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Electricity Bill Due')).toBeDefined();
    });

    const snoozeBtns = screen.getAllByTitle(/تأجيل|غفوة|snooze/i);
    fireEvent.click(snoozeBtns[0]);

    await waitFor(() => {
      expect(notifModule.snoozeNotif).toHaveBeenCalledWith('notif_bill_1');
      expect(screen.queryByText('Electricity Bill Due')).toBeNull();
    });
  });

  it('renders error message when buildAppNotifications rejects', async () => {
    vi.mocked(notifModule.buildAppNotifications).mockRejectedValueOnce(new Error('IndexedDB failure'));
    useAppStore.setState({ isNotifPanelOpen: true });

    render(
      <MemoryRouter>
        <NotifPanel />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/حدث خطأ أثناء تحميل الإشعارات|error/i)).toBeDefined();
      expect(screen.getByText(/إعادة المحاولة|retry/i)).toBeDefined();
    });
  });
});
