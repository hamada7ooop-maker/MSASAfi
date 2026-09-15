import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// The PDF pipeline is mocked at the module boundary: the real jsPDF and
// html2canvas never load in jsdom — what is pinned here is the ORCHESTRATION
// (spinner state, canvas capture, page composition, filename, toast) that
// the component owns.
vi.mock('jspdf', () => ({
  // A REGULAR function, not an arrow: the component constructs with `new`,
  // and arrow functions cannot be constructed.
  jsPDF: vi.fn().mockImplementation(function () {
    return {
      addImage: vi.fn(),
      addPage: vi.fn(),
      save: vi.fn(),
      output: vi.fn(() => 'data:application/pdf;base64,QUFB'),
    };
  }),
}));
vi.mock('html2canvas', () => ({
  default: vi.fn(async () => ({
    toDataURL: vi.fn(() => 'data:image/jpeg;base64,QkJC'),
    height: 100,
    width: 100,
  })),
}));
// The native bridge is web in jsdom — asserted explicitly rather than left
// to the real core's environment probing (which differs between the print
// and PDF paths in this environment).
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
}));
import { AssetFormModal } from '../../src/features/assets/components/AssetFormModal';
import { AssetDetailModal } from '../../src/features/assets/components/AssetDetailModal';
import type { Asset } from '../../src/types';

describe('Asset Modals Unit Tests (AssetFormModal & AssetDetailModal)', () => {
  describe('AssetFormModal', () => {
    it('renders form with dialog role and inputs', () => {
      const handleClose = vi.fn();
      const handleSave = vi.fn();

      render(
        <AssetFormModal
          onClose={handleClose}
          onSave={handleSave}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/مثال: سيارة كورولا/i)).toBeInTheDocument();
      expect(screen.getByText('إلغاء')).toBeInTheDocument();
      expect(screen.getByText('حفظ الأصل')).toBeInTheDocument();
    });

    it('invokes onClose when Escape key is pressed', () => {
      const handleClose = vi.fn();
      const handleSave = vi.fn();

      render(
        <AssetFormModal
          onClose={handleClose}
          onSave={handleSave}
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('populates fields when editing an existing asset', () => {
      const existingAsset: Asset = {
        id: 'ast_1',
        name: 'فيلا حي النرجس',
        category: 'real_estate',
        purchasePrice: 1500000,
        salvageValue: 300000,
        lifespanYears: 30,
        depreciationMethod: 'straight_line',
        purchaseDate: '2020-01-01',
      };

      render(
        <AssetFormModal
          asset={existingAsset}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      const nameInput = screen.getByDisplayValue('فيلا حي النرجس');
      expect(nameInput).toBeInTheDocument();
    });
  });

  describe('AssetDetailModal', () => {
    const asset: Asset = {
      id: 'ast_car_1',
      name: 'تويوتا كامري 2024',
      category: 'vehicle',
      purchasePrice: 120000,
      salvageValue: 20000,
      lifespanYears: 10,
      depreciationMethod: 'straight_line',
      purchaseDate: '2024-01-01',
    };

    it('renders asset details, depreciation metrics and schedule table', () => {
      render(
        <AssetDetailModal
          asset={asset}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('تويوتا كامري 2024')).toBeInTheDocument();
      expect(screen.getByText(/جدول الاستهلاك الزمني/i)).toBeInTheDocument();
      expect(screen.getByText(/القيمة الدفترية الحالية/i)).toBeInTheDocument();
    });

    it('closes on Escape key press', () => {
      const handleClose = vi.fn();

      render(
        <AssetDetailModal
          asset={asset}
          onClose={handleClose}
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    // ─── Directive 19 Batch 5: the export flows, pinned before the sweep ───

    it('the backdrop closes the modal', () => {
      const handleClose = vi.fn();
      const { container } = render(
        <AssetDetailModal asset={asset} onClose={handleClose} />
      );
      const backdrop = Array.from(container.querySelectorAll('div')).find(
        (d) => d.className.includes('bg-black/60') && d.getAttribute('aria-hidden') === 'true'
      ) as HTMLElement;
      expect(backdrop).toBeTruthy();
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('print (web path) calls window.print', async () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      const { container } = render(
        <AssetDetailModal asset={asset} onClose={vi.fn()} />
      );
      const printBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('print')
      ) as HTMLElement;
      expect(printBtn).toBeTruthy();
      fireEvent.click(printBtn);
      await waitFor(() => expect(printSpy).toHaveBeenCalledTimes(1));
      printSpy.mockRestore();
    });

    it('the PDF export runs the full pipeline: spinner → canvas → page → success toast', async () => {
      const { jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      const { container } = render(
        <AssetDetailModal asset={asset} onClose={vi.fn()} />
      );

      const pdfBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('picture_as_pdf')
      ) as HTMLElement;
      expect(pdfBtn).toBeTruthy();
      fireEvent.click(pdfBtn);

      // Success lands as a toast on the body. The i18n key resolves to the
      // Arabic locale's "تم تصدير التقرير بنجاح!" (or the fallback while the
      // locale loads) — "بنجاح" is the stable half both spellings share.
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/بنجاح|exportPdfOk/);
      });
      // the pipeline really ran: canvas captured, page composed, saved
      expect(html2canvas).toHaveBeenCalledTimes(1);
      expect(jsPDF).toHaveBeenCalledTimes(1);
      // and the button settled back from its spinner
      await waitFor(() => {
        expect(
          Array.from(container.querySelectorAll('button')).some((b) =>
            b.textContent?.includes('picture_as_pdf')
          )
        ).toBe(true);
      });
    });

    it('carries the print-scoped export container', () => {
      render(<AssetDetailModal asset={asset} onClose={vi.fn()} />);
      expect(document.getElementById('asset-detail-print-container')).toBeTruthy();
    });
  });
});
