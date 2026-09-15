import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  setBuilder: vi.fn(), tax: vi.fn(), xlsx: vi.fn(), toast: vi.fn(),
}));

vi.mock('../../src/i18n/index', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    formatCategoryLabel: (key: string) => `label:${key}`,
    relDate: () => 'today',
  }),
}));
vi.mock('../../src/core/hooks/useFormat', () => ({
  useFormat: () => ({ fmt: (n: number) => String(n), fmtShort: (n: number) => String(n), getCurrencySymbol: () => 'SAR' }),
}));
vi.mock('../../src/toast', () => ({ toast: mocks.toast }));
vi.mock('../../src/store/appStore', () => ({ useAppStore: (selector: (state: unknown) => unknown) => selector({ setReportBuilderOpen: mocks.setBuilder }) }));
vi.mock('../../src/features/reports/services/exportService', () => ({ ExportService: { generateTaxReport: mocks.tax, exportData: mocks.xlsx } }));

import { Calculator } from '../../src/components/Calculator';
import { ProfessionalCalculator } from '../../src/components/ui/ProfessionalCalculator';
import { ReportsExports } from '../../src/features/reports/components/ReportsExports';
import { ReportsSummary } from '../../src/features/reports/components/ReportsSummary';
import { ReportsTopExpenses } from '../../src/features/reports/components/ReportsTopExpenses';
import { ReportsWeeklyBrief } from '../../src/features/reports/components/ReportsWeeklyBrief';

beforeEach(() => vi.clearAllMocks());

describe('Directive 20 calculators and report widgets', () => {
  it('calculates, clears, backspaces, confirms, and closes the compact calculator', () => {
    const confirm = vi.fn();
    const close = vi.fn();
    render(<Calculator initialValue="" onConfirm={confirm} onClose={close} />);
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '=' }));
    expect(screen.getByText('5', { selector: 'p' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }));
    expect(confirm).toHaveBeenCalledWith('5');
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(close).toHaveBeenCalled();
    fireEvent.click(screen.getByText('5', { selector: 'p' }));
    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    expect(screen.getByText('0', { selector: 'p' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: '÷' })[0]);
    fireEvent.click(screen.getByText('⌫'));
  });

  it('shows an error for an invalid compact expression without throwing', () => {
    render(<Calculator initialValue="2+" onConfirm={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '=' }));
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('does not copy an empty professional display', () => {
    render(<ProfessionalCalculator onClose={vi.fn()} initialValue="0" />);
    fireEvent.click(screen.getByRole('button', { name: 'action.copy' }));
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it('covers professional calculator history, parentheses, sign, copy, and error recovery', () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    const close = vi.fn();
    render(<ProfessionalCalculator onClose={close} initialValue="2" />);
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '=' }));
    expect(screen.getByText(/2\+3 = 5/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    fireEvent.click(screen.getByRole('button', { name: '()' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    fireEvent.click(screen.getByRole('button', { name: '()' }));
    fireEvent.click(screen.getByRole('button', { name: '±' }));
    fireEvent.click(screen.getByRole('button', { name: 'backspace' }));
    fireEvent.click(screen.getByRole('button', { name: 'action.copy' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'action.close' }));
    expect(close).toHaveBeenCalled();
  });

  it('renders report exports and routes each export action', () => {
    render(<ReportsExports />);
    fireEvent.click(screen.getByText('report.openBuilder'));
    fireEvent.click(screen.getByText('report.taxAnnualShort'));
    fireEvent.click(screen.getByText('report.quickExcel'));
    expect(mocks.setBuilder).toHaveBeenCalledWith(true);
    expect(mocks.tax).toHaveBeenCalled();
    expect(mocks.xlsx).toHaveBeenCalledWith('xlsx');
  });

  it('covers savings verdicts, comparison changes, empty expenses, and weekly totals', () => {
    const { rerender } = render(<ReportsSummary stats={{ income: 100, expense: 70, count: 2 }} prevStats={{ income: 100, expense: 50, count: 1 }} />);
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('report.rateExcellent')).toBeInTheDocument();
    rerender(<ReportsSummary stats={{ income: 100, expense: 95, count: 2 }} prevStats={null} />);
    expect(screen.getByText('5%')).toBeInTheDocument();
    expect(screen.getByText('report.ratePoor')).toBeInTheDocument();
    rerender(<ReportsSummary stats={{ income: 100, expense: 85, count: 2 }} prevStats={{ income: 0, expense: 0, count: 0 }} />);
    expect(screen.getByText('report.rateGood')).toBeInTheDocument();

    const expenses = [{ id: 'e1', amount: 40, category: 'food', description: 'Lunch', date: '2026-01-01' }] as never[];
    const { unmount } = render(<ReportsTopExpenses expenses={expenses as never} />);
    expect(screen.getByText('Lunch')).toBeInTheDocument();
    unmount();
    const { container } = render(<ReportsTopExpenses expenses={[]} />);
    expect(container.firstChild).toBeNull();
    render(<ReportsWeeklyBrief stats={{ income: 120, expense: 40, count: 3 }} />);
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
