import React, { useState } from 'react';
import { useAssets } from '../hooks/useAssets';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { AssetsEngine } from '../../../core/utils/assetsEngine';
import type { Asset } from '../../../types';
import { bridge } from '../../../core/AppBridge';
import { ExportService } from '../../reports/services/exportService';
import { toast } from '../../../toast';
import { silentFail } from '../../../core/utils';
import { oklchToRgb, oklabToRgb } from '../../reports/utils/colorUtils';
import { AssetFormModal } from './AssetFormModal';
import { AssetDetailModal } from './AssetDetailModal';

export function Assets() {
  const { t } = useI18n();
  const { fmt, getCurrencySymbol } = useFormat();
  
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

  const handleExportAssetsPDF = async () => {
    setIsExportingPage(true);
    const element = document.getElementById('assets-print-container');
    if (!element) { setIsExportingPage(false); return; }

    // تزييف مؤقت لـ getComputedStyle لتصفية وتحويل ألوان oklch و oklab إلى rgb لتفادي استثناءات html2canvas باستخدام Proxy محكم
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function (el: Element, pseudoElt?: string | null): CSSStyleDeclaration {
      const style = originalGetComputedStyle(el, pseudoElt);
      
      const colorProps = [
        'backgroundColor', 'color', 'borderColor', 
        'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
        'outlineColor', 'fill', 'stroke'
      ];

      return new Proxy(style, {
        get(target, prop) {
          if (prop === 'getPropertyValue') {
            return function(propertyName: string) {
              const val = target.getPropertyValue(propertyName);
              if (typeof val === 'string') {
                if (val.includes('oklch')) return oklchToRgb(val);
                if (val.includes('oklab')) return oklabToRgb(val);
              }
              return val;
            };
          }
          
          const value = Reflect.get(target, prop);
          if (typeof value === 'function') {
            return value.bind(target);
          }
          
          if (typeof prop === 'string') {
            const isColorProp = colorProps.includes(prop) || 
              prop.toLowerCase().includes('color') || 
              prop === 'fill' || prop === 'stroke';
            if (isColorProp && typeof value === 'string') {
              if (value.includes('oklch')) return oklchToRgb(value);
              if (value.includes('oklab')) return oklabToRgb(value);
            }
          }
          
          return value;
        }
      });
    };

    // حفظ الأنماط الأصلية للعناصر التي تعيق html2canvas (مثل الـ backdropFilter)
    const savedStyles: { el: HTMLElement; backdropFilter: string; background: string }[] = [];
    const allEls = element.querySelectorAll<HTMLElement>('*');
    allEls.forEach(el => {
      const cs = window.getComputedStyle(el);
      if (cs.backdropFilter && cs.backdropFilter !== 'none') {
        savedStyles.push({ el, backdropFilter: el.style.backdropFilter, background: el.style.background });
        el.style.backdropFilter = 'none';
        el.style.setProperty('-webkit-backdrop-filter', 'none');
        if (!el.style.background) el.style.background = '#ffffff';
      }
    });

    const origStyle = {
      backdropFilter: element.style.backdropFilter,
      background: element.style.background,
      boxShadow: element.style.boxShadow,
    };
    element.style.backdropFilter = 'none';
    element.style.setProperty('-webkit-backdrop-filter', 'none');
    element.style.background = document.documentElement.classList.contains('dark') ? '#111827' : '#ffffff';
    element.style.boxShadow = 'none';

    // حفظ تنسيقات العرض والأبعاد الأصلية للحاوية لفرض مظهر سطح المكتب
    const originalWidth = element.style.width;
    const originalMaxWidth = element.style.maxWidth;
    const originalMinWidth = element.style.minWidth;

    element.classList.add('force-desktop-print');
    element.style.width = '1200px';
    element.style.maxWidth = '1200px';
    element.style.minWidth = '1200px';

    // إعطاء مهلة قصيرة للمتصفح لإعادة رسم الحاوية بالتنسيق العريض الجديد قبل الالتقاط
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const { jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#111827' : '#ffffff',
        foreignObjectRendering: false,
        ignoreElements: (el: Element) => el.classList.contains('no-print'),
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const doc = new jsPDF('p', 'mm', 'a4');
      let heightLeft = imgHeight;
      let position = 0;
      doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `masarifi_assets_${dateStr}.pdf`;
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        await ExportService.saveFileNative(pdfBase64, fileName, 'application/pdf', true);
      } else {
        doc.save(fileName);
      }
      toast(t('report.exportPdfOk') || 'تم تصدير تقرير الأصول بنجاح ✅', 'success');
    } catch (error) {
      silentFail('Assets PDF export error')(error);
      toast(t('report.exportFail') || 'فشل التصدير', 'error');
    } finally {
      // استعادة الدالة الأصلية لـ getComputedStyle
      window.getComputedStyle = originalGetComputedStyle;

      // استعادة فئات التجاوز وعرض سطح المكتب الأصلي
      element.classList.remove('force-desktop-print');
      element.style.width = originalWidth;
      element.style.maxWidth = originalMaxWidth;
      element.style.minWidth = originalMinWidth;

      // استعادة الأنماط الأصلية
      savedStyles.forEach(({ el, backdropFilter, background }) => {
        el.style.backdropFilter = backdropFilter;
        el.style.setProperty('-webkit-backdrop-filter', backdropFilter);
        el.style.background = background;
      });

      element.style.backdropFilter = origStyle.backdropFilter;
      element.style.setProperty('-webkit-backdrop-filter', origStyle.backdropFilter);
      element.style.background = origStyle.background;
      element.style.boxShadow = origStyle.boxShadow;
      setIsExportingPage(false);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center p-20 animate-pulse text-slate-400">
      {t('misc.loading') || 'جاري تحميل الأصول...'}
    </div>
  );

  // حساب المقاييس الإجمالية للأصول الحالية
  let totalPurchasePrice = 0;
  let totalAccumulatedDepreciation = 0;
  let totalBookValue = 0;
  let activeWarrantiesCount = 0;

  const processedAssets = assets.map(asset => {
    const metrics = AssetsEngine.calculateMetrics(asset);
    
    totalPurchasePrice += Number(asset.purchasePrice) || 0;
    totalAccumulatedDepreciation += metrics.accumulatedDepreciation;
    totalBookValue += metrics.currentBookValue;
    
    if (asset.warrantyExpiry && !metrics.isWarrantyExpired) {
      activeWarrantiesCount++;
    }

    return {
      asset,
      metrics
    };
  });

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
    <style>{`
      @media print {
        body::before, body::after, html::before, html::after {
          display: none !important;
          content: none !important;
        }
        body {
          background: white !important;
          color: black !important;
        }
        header, footer, nav, .bottom-nav, .no-print,
        .masarifi-toast, .ptr-indicator, .floating-actions-container {
          display: none !important;
        }
        #react-root, #react-root > div, #app, .flex.flex-col.h-screen,
        #main-content, #main-content > div, #main-content > div > div {
          height: auto !important;
          min-height: 100% !important;
          overflow: visible !important;
          display: block !important;
          position: static !important;
          background: white !important;
          padding: 0 !important;
          margin: 0 !important;
          max-width: 100% !important;
          width: 100% !important;
          box-shadow: none !important;
          border: none !important;
        }
        #react-root > div > *:not(#main-content) {
          display: none !important;
        }
        #main-content > div > div > *:not(#assets-print-container) {
          display: none !important;
        }
        #assets-print-container {
          position: relative !important;
          left: 0 !important;
          top: 0 !important;
          width: 1200px !important;
          max-width: 1200px !important;
          min-width: 1200px !important;
          height: auto !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          background: white !important;
          color: #1a1a1a !important;
          padding: 10px !important;
          margin: 0 !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          overflow: visible !important;
          display: block !important;
        }

        /* إظهار جميع العناصر المخفية وتوزيع الشبكات كنسخة سطح المكتب */
        #assets-print-container .hidden.md\:block,
        #assets-print-container .md\:block {
          display: block !important;
        }
        #assets-print-container .hidden.md\:flex,
        #assets-print-container .md\:flex {
          display: flex !important;
        }
        #assets-print-container .hidden.md\:inline,
        #assets-print-container .md\:inline {
          display: inline !important;
        }
        #assets-print-container .hidden.md\:table-cell,
        #assets-print-container .md\:table-cell {
          display: table-cell !important;
        }
        #assets-print-container .hidden.md\:grid,
        #assets-print-container .md\:grid {
          display: grid !important;
        }

        #assets-print-container .flex-col.md\:flex-row {
          flex-direction: row !important;
        }
        #assets-print-container .grid-cols-1.md\:grid-cols-2 {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        #assets-print-container .grid-cols-1.md\:grid-cols-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }
        #assets-print-container .grid-cols-1.md\:grid-cols-4 {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        }
        #assets-print-container .grid-cols-1.sm\:grid-cols-2.md\:grid-cols-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }
        #assets-print-container .grid-cols-2.md\:grid-cols-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }
        #assets-print-container .md\:p-8 {
          padding: 2rem !important;
        }
        #assets-print-container .md\:gap-6 {
          gap: 1.5rem !important;
        }
        #assets-print-container * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        [style*="background-color"] {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `}</style>
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
      <div className="relative overflow-hidden bg-gradient-to-br from-[#002b59] to-[#014282] dark:from-[#111827] dark:to-[#1f2937] text-white p-7 rounded-[2.5rem] shadow-xl space-y-6 border border-white/10">
        {/* تأثير التوهج */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="grid grid-cols-3 gap-6 relative z-10">
          <div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">إجمالي القيمة الشرائية</span>
            <h3 className="text-lg font-black text-slate-100">{fmt(totalPurchasePrice)} {getCurrencySymbol()}</h3>
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">الاستهلاك المتراكم</span>
            <h3 className="text-lg font-black text-rose-300">-{fmt(totalAccumulatedDepreciation)} {getCurrencySymbol()}</h3>
          </div>
          <div>
            <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest block mb-1">صافي القيمة الحالية</span>
            <h3 className="text-2xl font-black text-emerald-400">{fmt(totalBookValue)} {getCurrencySymbol()}</h3>
          </div>
        </div>

        <div className="h-px bg-white/10 relative z-10" />

        <div className="flex items-center justify-between text-xs font-bold text-slate-300 relative z-10">
          <span>الاستهلاك الحالي يتم تحديثه تلقائياً بناءً على تقادم الأصول</span>
          <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
            {activeWarrantiesCount} ضمانات نشطة
            <span className="material-symbols-outlined text-sm text-emerald-400">gpp_good</span>
          </span>
        </div>
      </div>

      {/* الفلترة حسب الفئة */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" dir="rtl">
        {[
          { id: 'all', label: 'الكل 📁' },
          { id: 'real_estate', label: 'عقارات 🏠' },
          { id: 'vehicle', label: 'مركبات 🚗' },
          { id: 'electronics', label: 'إلكترونيات 💻' },
          { id: 'other', label: 'أخرى 💎' }
        ].map(btn => (
          <button
            key={btn.id}
            onClick={() => setSelectedCategory(btn.id)}
            className={`px-5 py-3 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${
              selectedCategory === btn.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-[#1e2124] text-slate-600 dark:text-slate-300 border border-black/5 dark:border-white/5 hover:scale-105'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* قائمة الأصول */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white dark:bg-[#1e2124] rounded-[2.5rem] p-12 text-center border border-black/5 dark:border-white/5 space-y-4">
          <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700">inventory_2</span>
          <p className="text-slate-400 font-bold">لا يوجد أصول مسجلة ضمن هذه الفئة حالياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssets.map(({ asset, metrics }) => {
            const usedPercent = Math.min(100, Math.round((metrics.elapsedYears / asset.lifespanYears) * 100));
            
            return (
              <div 
                key={asset.id}
                onClick={() => setViewingAsset(asset)}
                className="bg-white dark:bg-[#1e2124] p-5 rounded-[2.5rem] shadow-sm border border-black/5 dark:border-white/5 hover:-translate-y-1 active:scale-98 transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col justify-between space-y-4"
              >
                {/* رأس كارت الأصل */}
                <div className="flex items-start justify-between">
                  {/* زر التعديل والحذف */}
                  <div className="flex gap-2">
                    <button aria-label={t('action.edit') || 'Edit'} 
                      onClick={(e) => { e.stopPropagation(); setEditingAsset(asset); setShowModal(true); }}
                      className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true">edit</span>
                    </button>
                    <button aria-label={t('action.delete') || 'Delete'} 
                      onClick={(e) => handleDelete(e, asset.id)}
                      className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 flex items-center justify-center transition-colors"
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true">delete</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <h4 className="text-base font-black text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                        {asset.name}
                      </h4>
                      <span className="text-[10px] font-black text-slate-400">
                        تاريخ الشراء: {asset.purchaseDate}
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-2xl">
                      {asset.category === 'real_estate' && '🏠'}
                      {asset.category === 'vehicle' && '🚗'}
                      {asset.category === 'electronics' && '💻'}
                      {asset.category === 'other' && '💎'}
                    </div>
                  </div>
                </div>

                {/* مقاييس القيمة الحالية وشريط الاستهلاك */}
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold items-end">
                    <div className="text-right">
                      <span className="text-slate-400 block text-[9px]">القيمة الدفترية الحالية</span>
                      <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                        {fmt(metrics.currentBookValue)} {getCurrencySymbol()}
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="text-slate-400 block text-[9px]">سعر الشراء الكلي</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {fmt(asset.purchasePrice)} {getCurrencySymbol()}
                      </span>
                    </div>
                  </div>

                  {/* شريط الإهلاك البصري */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-black text-slate-400">
                      <span>متبقي {(100 - usedPercent)}% من العمر الخدمي</span>
                      <span>مستهلك {usedPercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${usedPercent > 80 ? 'bg-rose-500' : usedPercent > 50 ? 'bg-amber-500' : 'bg-blue-500'}`}
                        style={{ width: `${usedPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* مؤشر الضمان الصغير */}
                {asset.warrantyExpiry && (
                  <div className="flex items-center gap-1.5 justify-end text-[9px] font-black">
                    {metrics.isWarrantyExpired ? (
                      <span className="text-rose-500 flex items-center gap-0.5 bg-rose-50 dark:bg-rose-950/20 px-2 py-1 rounded-full">
                        الضمان منتهي
                        <span className="material-symbols-outlined text-[10px]">gpp_bad</span>
                      </span>
                    ) : (
                      <span className="text-emerald-500 flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-full animate-pulse">
                        الضمان نشط (تبقّى {fmt(metrics.warrantyDaysLeft)} يوم)
                        <span className="material-symbols-outlined text-[10px]">gpp_good</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
