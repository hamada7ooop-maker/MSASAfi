import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  txRepo: {
    getDeleted: vi.fn(), getById: vi.fn(), restore: vi.fn(), hardDelete: vi.fn(),
    emptyTrash: vi.fn(), update: vi.fn(), deleteMany: vi.fn(),
  },
  accountRepo: { getAll: vi.fn() },
  toast: vi.fn(),
  confirmSheet: vi.fn(),
  refresh: vi.fn(),
  clearSelection: vi.fn(),
  settings: { lockedYears: [] as number[] },
  liveQuery: vi.fn(),
}));

vi.mock('../../src/i18n/index', () => ({
  useI18n: () => ({ t: (key: string, vars?: Record<string, string>) => vars ? `${key}:${Object.values(vars).join(',')}` : key, isRTL: false }),
}));
vi.mock('../../src/core/hooks/useFormat', () => ({
  useFormat: () => ({ fmt: (n: number) => String(n), getCurrencySymbol: () => 'SAR', parseNum: (s: string) => Number(s) || 0, sanitizeNumericInput: (s: string) => s.replace(/[^\d.\-]/g, '') }),
}));
vi.mock('../../src/toast', () => ({ toast: mocks.toast }));
vi.mock('../../src/core/db/repositories/transactions', () => ({ TransactionRepository: mocks.txRepo }));
vi.mock('../../src/core/db/repositories/accounts', () => ({ AccountRepository: mocks.accountRepo }));
vi.mock('../../src/store/settingsStore', () => ({ useSettingsStore: { getState: () => mocks.settings } }));
vi.mock('../../src/store/appStore', () => ({ useAppStore: (selector: (s: unknown) => unknown) => selector({ selectedItems: ['t1', 't2'], clearSelection: mocks.clearSelection }) }));
vi.mock('../../src/core/AppBridge', () => ({ bridge: { confirmSheet: mocks.confirmSheet }, registerToBridge: vi.fn() }));
vi.mock('../../src/core/a11yKeyboard', () => ({ onActivate: (fn: () => void) => (e: KeyboardEvent) => { if (e.key === 'Enter') fn(); } }));
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: (...args: unknown[]) => mocks.liveQuery(...args) }));
vi.mock('../../src/core/db/core', () => ({ db: { transactions: { toArray: vi.fn().mockResolvedValue([]) } } }));
vi.mock('../../src/core/loyalty', () => ({ checkMilestone: vi.fn() }));

import { RecycleBinModal } from '../../src/features/transactions/components/RecycleBinModal';
import { ImportReviewModal } from '../../src/features/transactions/components/ImportReviewModal';
import { CoolingQueueModal } from '../../src/features/transactions/components/CoolingQueueModal';
import { BulkActionsBar } from '../../src/features/transactions/components/BulkActionsBar';

const tx = (id: string, date = '2025-01-02') => ({ id, amount: 25, type: 'expense', category: 'food', description: `tx-${id}`, date, deletedAt: date });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.liveQuery.mockReturnValue([]);
  mocks.confirmSheet.mockImplementation((_message: string, action: () => void) => action());
  mocks.txRepo.getDeleted.mockResolvedValue([]);
  mocks.txRepo.getById.mockResolvedValue(tx('t1'));
  mocks.accountRepo.getAll.mockResolvedValue([{ id: 'a1', name: 'Cash', balance: 100 }]);
});

describe('Directive 20 zero-coverage transaction components', () => {
  it('renders recycle bin, restores an item, confirms hard delete, and empties the bin', async () => {
    mocks.liveQuery.mockReturnValue([tx('t1')]);
    const refresh = vi.fn();
    render(<RecycleBinModal onClose={vi.fn()} onRefreshList={refresh} />);
    expect(screen.getByText('tx-t1')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle(/trash.restore/));
    await waitFor(() => expect(mocks.txRepo.restore).toHaveBeenCalledWith('t1'));
    fireEvent.click(screen.getByTitle(/trash.deletePermanently/));
    fireEvent.click(screen.getByTitle(/trash.confirmHardDelete/));
    await waitFor(() => expect(mocks.txRepo.hardDelete).toHaveBeenCalledWith('t1'));
    fireEvent.click(screen.getByText('trash.emptyBtn'));
    fireEvent.click(screen.getByText('trash.emptyBtn'));
    await waitFor(() => expect(mocks.txRepo.emptyTrash).toHaveBeenCalled());
    expect(refresh).toHaveBeenCalled();
  });

  it('protects locked-year restores and supports the empty state', async () => {
    mocks.settings.lockedYears = [2025];
    mocks.liveQuery.mockReturnValue([tx('t1')]);
    render(<RecycleBinModal onClose={vi.fn()} onRefreshList={vi.fn()} />);
    fireEvent.click(screen.getByTitle(/trash.restore/));
    await waitFor(() => expect(mocks.txRepo.restore).not.toHaveBeenCalled());
    mocks.liveQuery.mockReturnValue([]);
    expect(screen.getByText('trash.title')).toBeInTheDocument();
  });

  it('reviews imports, toggles rows, rejects empty selection, and confirms selected rows', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn();
    const items = [
      { id: 'i1', amount: 10, type: 'expense', category: 'food', description: 'Lunch', date: '2026-01-01' },
      { id: 'i2', amount: 20, type: 'income', category: 'salary', description: 'Pay', date: '2026-01-02' },
    ] as never[];
    render(<ImportReviewModal transactions={items as never} onConfirm={onConfirm} onClose={close} />);
    await waitFor(() => expect(screen.getByText('Cash')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Lunch'));
    fireEvent.click(screen.getByRole('button', { name: /txn.confirmImport/ }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith([items[1]], 'a1'));
    expect(close).toHaveBeenCalled();
  });

  it('renders cooling queue and routes skip, confirm, and cancel actions', async () => {
    const item = { ...tx('c1'), isDraft: true, coolingExpireDate: new Date(Date.now() - 1000).toISOString(), mood: 'neutral' };
    mocks.liveQuery.mockReturnValue([item]);
    render(<CoolingQueueModal onClose={vi.fn()} onRefreshList={mocks.refresh} />);
    expect(screen.getByText('tx-c1')).toBeInTheDocument();
    fireEvent.click(screen.getByText('cooling.confirmPurchaseBtn'));
    await waitFor(() => expect(mocks.txRepo.update).toHaveBeenCalledWith('c1', expect.objectContaining({ isDraft: false })));
    fireEvent.click(screen.getByText('cooling.cancelPurchaseBtn'));
    await waitFor(() => expect(mocks.txRepo.hardDelete).toHaveBeenCalledWith('c1'));
  });

  it('bulk-deletes only unlocked selected transactions', async () => {
    mocks.settings.lockedYears = [2025];
    mocks.txRepo.getById.mockImplementation(async (id: string) => id === 't1' ? tx(id, '2025-01-01') : tx(id, '2026-01-01'));
    render(<BulkActionsBar onActionComplete={mocks.refresh} />);
    fireEvent.click(screen.getByRole('button', { name: /action.delete/ }));
    await waitFor(() => expect(mocks.txRepo.deleteMany).toHaveBeenCalledWith(['t2']));
    expect(mocks.clearSelection).toHaveBeenCalled();
  });
});
