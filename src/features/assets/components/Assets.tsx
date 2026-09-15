import React, { useState } from 'react';
import { useAssets } from '../hooks/useAssets';
import { useI18n } from '../../../i18n/index';
import type { Asset } from '../../../types';
import { bridge } from '../../../core/AppBridge';
import { toast } from '../../../toast';
import { AssetFormModal } from './AssetFormModal';
import { AssetDetailModal } from './AssetDetailModal';
import { AssetSummaryPanel } from './AssetSummaryPanel';
import { AssetCategoryFilter } from './AssetCategoryFilter';
import { AssetCard } from './AssetCard';
import { processAssets, summarizeAssets } from '../utils/assetPortfolio';
import { exportElementAsPdf } from '../utils/exportElementAsPdf';
import { ASSETS_PRINT_CSS } from '../utils/assetsPrintCss';

/**
 * تتبع الأصول والممتلكات — the orchestrator.
 *
 * Directive 19 — deferred decomposition: this file was 591 lines carrying
 * four jobs at once (a ~150-line PDF export pipeline duplicated in
 * AssetDetailModal, a ~100-line print stylesheet, the summary dashboard and
 * the card grid). Each piece now lives in its own module pinned by
 * tests/unit/assetsPage.test.tsx, which was written green on the monolith
 * before the split; this file only wires state to those pieces.
 */
export function Assets() {
  const { t } = useI18n();

  const { assets, isLoading, addAsset, updateAsset, deleteAsset } = useAssets();

  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Partial<Asset> | undefined>();
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);
  const [isExportingPage, setIsExportingPage] = useState(false);

  // الفلاتر
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const handlePrintAssets = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        toast(t('report.exportPdfLoading') || 'جاري تجهيز التحليل للطباعة والمشاركة... 🖨️');
        await handleExportAssetsPDF();
      } else {
        window.print();
      }
    } catch {
      window.print();
    }
  };

  const handleExportAssetsPDF = () =>
    exportElementAsPdf({
      elementId: 'assets-print-container',
      fileName: `masarifi_assets_${new Date().toISOString().split('T')[0]}.pdf`,
      successToast: t('report.exportPdfOk') || 'تم تصدير تقرير الأصول بنجاح ✅',
      errorToast: t('report.exportFail') || 'فشل التصدير',
      errorLabel: 'Assets PDF export error',
      darkBackground: '#111827',
      onExportingChange: setIsExportingPage,
    });

  if (isLoading) return (
    <div className="flex items-center justify-center p-20 animate-pulse text-slate-400">
      {t('misc.loading') || 'جاري تحميل الأصول...'}
    </div>
  );

  // حساب المقاييس الإجمالية للأصول الحالية
  const processedAssets = processAssets(assets);
  const summary = summarizeAssets(processedAssets);

  const filteredAssets = processedAssets.filter(item => {
    if (selectedCategory === 'all') return true;
    return item.asset.category === selectedCategory;
  });

  const handleSave = async (data: Omit<Asset, 'id'>) => {
    if (editingAsset?.id) {
      await updateAsset(editingAsset.id, data);
    } else {
      await addAsset(data);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    bridge.confirmSheet(
      'هل أنت متأكد من رغبتك في حذف هذا الأصل نهائياً؟',
      async () => {
        await deleteAsset(id);
      },
      'حذف',
      'إلغاء'
    );
  };

  return (
    <>
    {/* أنماط طباعة صفحة الأصول */}
    <style>{ASSETS_PRINT_CSS}</style>
    <div id="assets-print-container" className="p-5 space-y-6 pb-32 animate-in fade-in duration-700 text-right" dir="rtl">
      {/* العنوان والتوجيه */}
      <div className="flex items-center justify-between px-1">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-blue-900 dark:text-blue-100 flex items-center gap-2">
            تتبع الأصول والممتلكات
          </h2>
          <div className="flex items-center gap-2 justify-end">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-70">
              {assets.length} أصول مسجلة في محفظتك
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* زر الطباعة */}
          <button
            id="assets-print-btn"
            onClick={handlePrintAssets}
            className="no-print w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition-all"
            title={t('common.print') || 'طباعة قائمة الأصول'}
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">print</span>
          </button>
          {/* زر تصدير PDF */}
          <button
            id="assets-pdf-btn"
            onClick={handleExportAssetsPDF}
            disabled={isExportingPage}
            className="no-print w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 hover:bg-blue-500/20 active:scale-90 transition-all disabled:opacity-50"
            title={t('report.exportPdf') || 'تصدير PDF'}
          >
            {isExportingPage
              ? <span className="material-symbols-outlined text-lg animate-spin" aria-hidden="true">progress_activity</span>
              : <span className="material-symbols-outlined text-lg" aria-hidden="true">picture_as_pdf</span>
            }
          </button>
          {/* زر إضافة أصل جديد */}
          <button aria-label={t('action.add') || 'Add'}
            onClick={() => { setEditingAsset(undefined); setShowModal(true); }}
            className="no-print w-10 h-10 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">add</span>
          </button>
        </div>
      </div>

      {/* لوحة الملخص المالي للأصول (Glassmorphism Dashboard) */}
      <AssetSummaryPanel summary={summary} />

      {/* الفلترة حسب الفئة */}
      <AssetCategoryFilter
        selectedCategory={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {/* قائمة الأصول */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white dark:bg-[#1e2124] rounded-[2.5rem] p-12 text-center border border-black/5 dark:border-white/5 space-y-4">
          <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700">inventory_2</span>
          <p className="text-slate-400 font-bold">لا يوجد أصول مسجلة ضمن هذه الفئة حالياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssets.map(({ asset, metrics }) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              metrics={metrics}
              onView={setViewingAsset}
              onEdit={(a) => { setEditingAsset(a); setShowModal(true); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* نافذة الإضافة والتعديل */}
      {showModal && (
        <AssetFormModal
          asset={editingAsset}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* نافذة تفاصيل الاستهلاك والضمان */}
      {viewingAsset && (
        <AssetDetailModal
          asset={viewingAsset}
          onClose={() => setViewingAsset(null)}
        />
      )}
    </div>
    </>
  );
}
