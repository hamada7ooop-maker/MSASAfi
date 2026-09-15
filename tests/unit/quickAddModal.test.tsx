import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QuickAddModal } from '../../src/components/modals/QuickAddModal';
import { useAppStore } from '../../src/store/appStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { TransactionRepository } from '../../src/core/db/repositories/transactions';
import { AccountRepository } from '../../src/core/db/repositories/accounts';
import { toast } from '../../src/toast';
import { checkMilestone } from '../../src/core/loyalty';
import { parseSMS } from '../../src/services/smsService';

/**
 * Directive 19 / Batch 2 — CHARACTERIZATION FIRST.
 *
 * The quick-add sheet is the most frequent financial interaction in the app
 * and had ZERO tests. This suite pins its behavioral contract BEFORE the
 * thumb-first rebuild touches anything: open/close semantics, the
 * expense/income toggle, validation failures, the save path (add + edit),
 * the locked-year guard, delete, the turbo-scanner lock, and SMS parsing.
 * The rebuild (haptics vocabulary + drag-to-dismiss + spring) must keep
 * every assertion here green.
 */

vi.mock('../../src/core/db/repositories/transactions', () => ({
  TransactionRepository: {
    getById: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('../../src/core/db/repositories/accounts', () => ({
  AccountRepository: { getAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/core/db/core', () => ({
  db: {
    getCategories: vi.fn().mockResolvedValue([
      { id: 'c1', name: 'طعام', type: 'expense', color: '#f97316', icon: 'restaurant' },
      { id: 'c2', name: 'راتب', type: 'income', color: '#22c55e', icon: 'payments' },
      { id: 'c3', name: 'عام', type: 'both', color: '#3b82f6', icon: 'category' },
    ]),
  },
}));
vi.mock('../../src/features/transactions/components/OCRScanner', () => ({
  OCRScanner: () => <div data-testid="ocr-scanner" />,
}));
vi.mock('../../src/services/smsService', () => ({ parseSMS: vi.fn() }));
vi.mock('../../src/core/loyalty', () => ({ checkMilestone: vi.fn() }));
vi.mock('../../src/toast', () => ({ toast: vi.fn() }));
vi.mock('../../src/ai', () => ({ classifyTransactionSmart: vi.fn().mockResolvedValue(null) }));
vi.mock('../../src/core/hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ current: null }),
}));
vi.mock('../../src/core/haptics', () => ({
  touch: {
    light: vi.fn(),
    select: vi.fn(),
    confirm: vi.fn(),
    destruct: vi.fn(),
    error: vi.fn(),
    triumph: vi.fn(),
  },
}));
import { touch } from '../../src/core/haptics';
const mockTouch = vi.mocked(touch);
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}));

const mockToast = vi.mocked(toast);
const mockAdd = vi.mocked(TransactionRepository.add);
const mockUpdate = vi.mocked(TransactionRepository.update);
const mockDelete = vi.mocked(TransactionRepository.delete);
const mockGetById = vi.mocked(TransactionRepository.getById);
const mockParseSMS = vi.mocked(parseSMS);
const mockMilestone = vi.mocked(checkMilestone);

function openSheet() {
  useAppStore.setState({ isQuickAddOpen: true, editingTransactionId: null });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTouch.light.mockClear();
  mockAdd.mockResolvedValue(undefined);
  mockUpdate.mockResolvedValue(undefined);
  mockDelete.mockResolvedValue(undefined);
  AccountRepository.getAll.mockResolvedValue([{ id: 'a1', name: 'رئيسي' }] as never);
  mockNavigate.mockClear();
  useAppStore.setState({ isQuickAddOpen: false, editingTransactionId: null });
  useSettingsStore.setState({ lockedYears: [], unlockedItems: [] });
});


// ── Locale-agnostic locators ────────────────────────────────────────────────
// The ar locale loads asynchronously mid-suite, so aria-labels flip from keys
// to Arabic between tests. Icon ligatures, placeholders and ids are stable.
const amountInput = () => screen.getByPlaceholderText('0') as HTMLInputElement;
const confirmBtn = () => screen.getByText('check_circle').closest('button') as HTMLElement;
const deleteBtn = () => screen.getByText('delete', { selector: 'span' }).closest('button') as HTMLElement;
const smsBtn = () => screen.getByText('sms', { selector: 'span' }).closest('button') as HTMLElement;
const scanBtn = () => screen.getByText(/lock|document_scanner/).closest('button') as HTMLElement;
const foodChip = () => screen.getByText('restaurant').closest('button') as HTMLElement;
/** loadData resolves async (DB.getCategories) — wait for the chips. */
const awaitCategories = () => screen.findByText('restaurant');

function mountSheet() {
  return render(<QuickAddModal />);
}

describe('QuickAddModal — characterization (the financial core)', () => {
  it('renders nothing while closed', () => {
    mountSheet();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens as a modal dialog titled by the quick-add heading', () => {
    openSheet();
    mountSheet();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'quick-add-title');
    expect(document.getElementById('quick-add-title')).toBeTruthy();
  });

  it('toggles expense/income with pressed state', () => {
    openSheet();
    mountSheet();
    const group = screen.getByRole('group');
    const [expense, income] = Array.from(group.querySelectorAll('button'));
    expect(expense).toHaveAttribute('aria-pressed', 'true');
    expect(income).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(income);
    expect(income).toHaveAttribute('aria-pressed', 'true');
    expect(expense).toHaveAttribute('aria-pressed', 'false');
  });

  it('sanitizes amount input as the user types', () => {
    openSheet();
    mountSheet();
    fireEvent.change(amountInput(), { target: { value: '12.3.4abc' } });
    // sanitizeNumericInput keeps a legal decimal shape only
    expect(amountInput().value).toMatch(/^\d*\.?\d*$/);
  });

  it('rejects an empty amount with an error toast and saves nothing', async () => {
    openSheet();
    mountSheet();
    fireEvent.click(confirmBtn());
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.anything(), 'error'));
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('defaults the category to the first one matching the current type', async () => {
    openSheet();
    mountSheet();
    await awaitCategories();
    fireEvent.change(amountInput(), { target: { value: '50' } });
    fireEvent.click(confirmBtn());
    await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
    expect((mockAdd.mock.calls[0][0] as Record<string, unknown>).category).toBe('طعام');
  });

  it('rejects when no accounts exist', async () => {
    AccountRepository.getAll.mockResolvedValue([] as never);
    openSheet();
    mountSheet();
    await awaitCategories();
    fireEvent.change(amountInput(), { target: { value: '50' } });
    fireEvent.click(foodChip());
    fireEvent.click(confirmBtn());
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.anything(), 'error'));
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('saves a valid expense: repository.add + success toast + FIRST_TRANSACTION + close', async () => {
    openSheet();
    mountSheet();
    await awaitCategories();
    fireEvent.change(amountInput(), { target: { value: '75.25' } });
    fireEvent.click(foodChip());
    fireEvent.click(confirmBtn());

    await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
    const payload = mockAdd.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.amount).toBe(75.25);
    expect(payload.type).toBe('expense');
    expect(payload.category).toBe('طعام'); // the restaurant chip was picked
    expect(payload.accountId).toBe('a1');
    expect(mockMilestone).toHaveBeenCalledWith('FIRST_TRANSACTION');
    await waitFor(() => expect(useAppStore.getState().isQuickAddOpen).toBe(false));
  });

  it('blocks saving into a locked fiscal year with a clear error', async () => {
    openSheet();
    mountSheet();
    await awaitCategories();
    useSettingsStore.setState({ lockedYears: [new Date().getFullYear()] });
    fireEvent.change(amountInput(), { target: { value: '10' } });
    fireEvent.click(foodChip());
    fireEvent.click(confirmBtn());
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.anything(), 'error'));
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('edit mode: loads the transaction and updates it instead of adding', async () => {
    mockGetById.mockResolvedValue({
      id: 't1', amount: 42, type: 'income', category: 'راتب', date: '2026-01-05T10:00:00.000Z',
    } as never);
    useAppStore.setState({ isQuickAddOpen: true, editingTransactionId: 't1' });
    mountSheet();

    await waitFor(() => expect(mockGetById).toHaveBeenCalledWith('t1'));
    await waitFor(() => expect(amountInput().value).toBe('42'));
    fireEvent.change(amountInput(), { target: { value: '60' } });
    fireEvent.click(confirmBtn());

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('t1', expect.objectContaining({ amount: 60 })));
    expect(mockAdd).not.toHaveBeenCalled();
    expect(mockMilestone).not.toHaveBeenCalled();
  });

  it('edit mode: delete asks for confirmation, then deletes and closes', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    mockGetById.mockResolvedValue({ id: 't1', amount: 42, type: 'expense', category: 'طعام' } as never);
    useAppStore.setState({ isQuickAddOpen: true, editingTransactionId: 't1' });
    mountSheet();

    await waitFor(() => expect(amountInput().value).toBe('42'));
    fireEvent.click(deleteBtn());
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('t1'));
    await waitFor(() => expect(useAppStore.getState().isQuickAddOpen).toBe(false));
    vi.unstubAllGlobals();
  });

  it('the turbo scanner stays locked without the perk: warning + shop route', () => {
    openSheet();
    mountSheet();
    fireEvent.click(scanBtn());
    expect(mockToast).toHaveBeenCalledWith(expect.anything(), 'warning');
    expect(mockNavigate).toHaveBeenCalledWith('/shop');
    expect(useAppStore.getState().isQuickAddOpen).toBe(false);
  });

  it('with the perk, the scanner opens inline', () => {
    useSettingsStore.setState({ unlockedItems: ['perk:turbo-scanner'] });
    openSheet();
    mountSheet();
    fireEvent.click(scanBtn());
    expect(screen.getByTestId('ocr-scanner')).toBeInTheDocument();
  });

  it('SMS parsing fills amount/type/category and confirms to the user', async () => {
    mockParseSMS.mockReturnValue({ amount: 120.5, type: 'expense', description: 'شراء' } as never);
    openSheet();
    mountSheet();
    fireEvent.click(smsBtn());
    const smsField = await screen.findByPlaceholderText(/رسالة|smsPrompt/i);
    fireEvent.change(smsField, { target: { value: 'مصروف 120.5' } });
    fireEvent.click(screen.getByText(/parse|تحليل/i).closest('button') as HTMLElement);

    await waitFor(() => expect(amountInput().value).toBe('120.5'));
    expect(mockToast).toHaveBeenCalledWith(expect.anything(), 'success');
  });

  it('SMS parse failure surfaces an error toast', async () => {
    mockParseSMS.mockReturnValue(null as never);
    openSheet();
    mountSheet();
    fireEvent.click(smsBtn());
    const smsField = await screen.findByPlaceholderText(/رسالة|smsPrompt/i);
    fireEvent.change(smsField, { target: { value: 'نص عشوائي' } });
    fireEvent.click(screen.getByText(/parse|تحليل/i).closest('button') as HTMLElement);
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.anything(), 'error'));
  });

  it('the overlay backdrop closes the sheet', () => {
    openSheet();
    mountSheet();
    fireEvent.click(screen.getByRole('presentation').firstChild as HTMLElement);
    expect(useAppStore.getState().isQuickAddOpen).toBe(false);
  });
});

describe('QuickAddModal — Batch 2: the haptic vocabulary in the financial flow', () => {
  it('a rejected amount answers with touch.error', async () => {
    openSheet();
    mountSheet();
    fireEvent.click(confirmBtn());
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.anything(), 'error'));
    expect(mockTouch.error).toHaveBeenCalled();
  });

  it('a locked fiscal year answers with touch.error', async () => {
    openSheet();
    mountSheet();
    await awaitCategories();
    useSettingsStore.setState({ lockedYears: [new Date().getFullYear()] });
    fireEvent.change(amountInput(), { target: { value: '10' } });
    fireEvent.click(foodChip());
    fireEvent.click(confirmBtn());
    await waitFor(() => expect(mockTouch.error).toHaveBeenCalled());
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('a confirmed transaction answers with touch.confirm', async () => {
    openSheet();
    mountSheet();
    await awaitCategories();
    fireEvent.change(amountInput(), { target: { value: '30' } });
    fireEvent.click(confirmBtn());
    await waitFor(() => expect(mockTouch.confirm).toHaveBeenCalledTimes(1));
    expect(mockAdd).toHaveBeenCalledTimes(1);
  });

  it('a confirmed delete carries the gravity: touch.destruct', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    mockGetById.mockResolvedValue({ id: 't1', amount: 42, type: 'expense', category: 'طعام' } as never);
    useAppStore.setState({ isQuickAddOpen: true, editingTransactionId: 't1' });
    mountSheet();
    await waitFor(() => expect(amountInput().value).toBe('42'));
    fireEvent.click(deleteBtn());
    await waitFor(() => expect(mockTouch.destruct).toHaveBeenCalledTimes(1));
    vi.unstubAllGlobals();
  });

  it('toggling expense/income taps touch.select; picking a category taps touch.light', async () => {
    openSheet();
    mountSheet();
    await awaitCategories();
    // pick a category FIRST — switching to income filters the expense chips away
    fireEvent.click(foodChip());
    expect(mockTouch.light).toHaveBeenCalledTimes(1);
    const group = screen.getByRole('group');
    const [, income] = Array.from(group.querySelectorAll('button'));
    fireEvent.click(income);
    expect(mockTouch.select).toHaveBeenCalledTimes(1);
  });
});

describe('QuickAddModal — Batch 2: drag-to-dismiss (thumb-first)', () => {
  it('pulling the handle beyond the threshold dismisses the sheet', async () => {
    openSheet();
    mountSheet();
    const handle = screen.getByTestId('sheet-handle');
    fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 260 }); // 160px pull > 96
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 260 });
    expect(useAppStore.getState().isQuickAddOpen).toBe(false);
  });

  it('a short pull springs back without dismissing', async () => {
    vi.useFakeTimers({ toFake: ['performance'] });
    try {
      openSheet();
      mountSheet();
      const handle = screen.getByTestId('sheet-handle');
      fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100 });
      // a slow 40px pull over 100ms = 0.4 px/ms — under the flick threshold
      vi.advanceTimersByTime(100);
      fireEvent.pointerMove(handle, { pointerId: 1, clientY: 140 });
      fireEvent.pointerUp(handle, { pointerId: 1, clientY: 140 });
      expect(useAppStore.getState().isQuickAddOpen).toBe(true);
      // sheet transform released back to its seat
      const sheet = document.getElementById('quick-add-sheet') as HTMLElement;
      expect(sheet.style.transform).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('a fast flick dismisses even from a short pull', () => {
    vi.useFakeTimers({ toFake: ['performance'] });
    try {
      openSheet();
      mountSheet();
      const handle = screen.getByTestId('sheet-handle');
      fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100 });
      // 32px in ~10ms = ~3 px/ms — well above the 0.6 px/ms flick threshold
      vi.advanceTimersByTime(10);
      fireEvent.pointerMove(handle, { pointerId: 1, clientY: 132 });
      fireEvent.pointerUp(handle, { pointerId: 1, clientY: 132 });
      expect(useAppStore.getState().isQuickAddOpen).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
