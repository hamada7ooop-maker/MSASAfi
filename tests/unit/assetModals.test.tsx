import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
  });
});
