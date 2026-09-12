import React, { useState, useEffect } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { AssetsEngine } from '../../../core/utils/assetsEngine';
import type { Asset } from '../../../types';
import { ExportService } from '../../reports/services/exportService';
import { toast } from '../../../toast';
import { silentFail } from '../../../core/utils';
import { oklchToRgb, oklabToRgb } from '../../reports/utils/colorUtils';
import { useFocusTrap } from '../../../core/hooks/useFocusTrap';

export interface AssetDetailModalProps {
  asset: Asset;
  onClose: () => void;
}

export function AssetDetailModal({
  asset,
  onClose
}: AssetDetailModalProps) {
  const { t } = useI18n();
  const { fmt, fmtDate, getCurrencySymbol } = useFormat();
  const [isExporting, setIsExporting] = useState(false);
  const containerRef = useFocusTrap<HTMLDivElement>();
  
  const metrics = AssetsEngine.calculateMetrics(asset);
  
  // حساب النسبة المئوية للعمر المستهلك
  const usefulLifeUsedPercent = Math.min(100, Math.round((metrics.elapsedYears / asset.lifespanYears) * 100));

  // Accessibility: Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePrintAsset = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        toast(t('report.exportPdfLoading') || 'جاري تجهيز التحليل للطباعة والمشاركة... 🖨️');
        await handleExportAssetPDF();
      } else {
        window.print();
      }
    } catch {
      window.print();
    }
  };

  const handleExportAssetPDF = async () => {
    setIsExporting(true);
    const element = document.getElementById('asset-detail-print-container');
    if (!element) { setIsExporting(false); return; }

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
    element.style.background = document.documentElement.classList.contains('dark') ? '#1e2124' : '#ffffff';
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
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1e2124' : '#ffffff',
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
      const safeName = asset.name.replace(/[^a-z0-9؀-ۿ]/gi, '_').slice(0, 30);
      const fileName = `masarifi_asset_${safeName}_${dateStr}.pdf`;
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        await ExportService.saveFileNative(pdfBase64, fileName, 'application/pdf', true);
      } else {
        doc.save(fileName);
      }
      toast(t('report.exportPdfOk') || 'تم تصدير تفاصيل الأصل بنجاح ✅', 'success');
    } catch (error) {
      silentFail('Asset detail PDF export error')(error);
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
      setIsExporting(false);
    }
  };

  return (
    <>
    {/* أنماط طباعة تفاصيل الأصل */}
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
        /* إخفاء الخلفية المعتمة للنافذة المنبثقة */
        .fixed.inset-0.z-\[200\] {
          position: static !important;
          background: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          display: block !important;
          padding: 0 !important;
        }
        /* تحرير حاوية تفاصيل الأصل بمظهر سطح المكتب العريض */
        #asset-detail-print-container {
          position: static !important;
          width: 1200px !important;
          max-width: 1200px !important;
          min-width: 1200px !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          background: white !important;
          color: #1a1a1a !important;
          padding: 16px !important;
          margin: 0 !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          display: block !important;
        }

        /* إظهار جميع العناصر المخفية وتوزيع الشبكات كنسخة سطح المكتب */
        #asset-detail-print-container .hidden.md\:block,
        #asset-detail-print-container .md\:block {
          display: block !important;
        }
        #asset-detail-print-container .hidden.md\:flex,
        #asset-detail-print-container .md\:flex {
          display: flex !important;
        }
        #asset-detail-print-container .hidden.md\:table-cell,
        #asset-detail-print-container .md\:table-cell {
          display: table-cell !important;
        }
        #asset-detail-print-container .hidden.md\:grid,
        #asset-detail-print-container .md\:grid {
          display: grid !important;
        }
        #asset-detail-print-container .flex-col.md\:flex-row {
          flex-direction: row !important;
        }
        #asset-detail-print-container .grid-cols-1.md\:grid-cols-2 {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        #asset-detail-print-container .grid-cols-1.md\:grid-cols-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }
        #asset-detail-print-container .grid-cols-1.md\:grid-cols-4 {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        }
        #asset-detail-print-container .md\:p-8 {
          padding: 2rem !important;
        }
        #asset-detail-print-container .md\:gap-6 {
          gap: 1.5rem !important;
        }
        #asset-detail-print-container * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        [style*="background-color"] {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `}</style>
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-detail-title"
    >
      <div 
        ref={containerRef}
        id="asset-detail-print-container" 
        className="bg-white dark:bg-[#1e2124] w-full max-w-2xl rounded-[2.5rem] p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh] scrollbar-hide text-right" 
        dir="rtl" 
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2 no-print" />
        
        {/* رأس النافذة مع أزرار الطباعة والتصدير */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="no-print w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
            {/* زر الطباعة */}
            <button
              onClick={handlePrintAsset}
              className="no-print w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition-all"
              title={t('common.print') || 'طباعة تفاصيل الأصل'}
            >
              <span className="material-symbols-outlined text-lg">print</span>
            </button>
            {/* زر تصدير PDF */}
            <button
              onClick={handleExportAssetPDF}
              disabled={isExporting}
              className="no-print w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 hover:bg-blue-500/20 active:scale-90 transition-all disabled:opacity-50"
              title={t('report.exportPdf') || 'تصدير PDF'}
            >
              {isExporting
                ? <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                : <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
              }
            </button>
          </div>
          <div>
            <span className="text-[10px] font-black bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full mb-1 inline-block">
              {asset.category === 'real_estate' && '🏠 عقارات'}
              {asset.category === 'vehicle' && '🚗 مركبات'}
              {asset.category === 'electronics' && '💻 إلكترونيات'}
              {asset.category === 'other' && '💎 أخرى'}
            </span>
            <h3 id="asset-detail-title" className="text-2xl font-black dark:text-white">{asset.name}</h3>
          </div>
        </div>

        {/* كروت القيمة السريعة */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-black/5 dark:border-white/5 text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">قيمة الشراء</span>
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{fmt(asset.purchasePrice)} {getCurrencySymbol()}</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-black/5 dark:border-white/5 text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">الاستهلاك المتراكم</span>
            <span className="text-sm font-black text-rose-500">{fmt(metrics.accumulatedDepreciation)} {getCurrencySymbol()}</span>
          </div>
          <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-3xl border border-blue-500/10 text-center">
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">القيمة الدفترية الحالية</span>
            <span className="text-sm font-black text-blue-600 dark:text-blue-400">{fmt(metrics.currentBookValue)} {getCurrencySymbol()}</span>
          </div>
        </div>

        {/* حالة الضمان ونسبة الاستهلاك */}
        <div className="space-y-4 bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-[2rem] border border-black/5 dark:border-white/5">
          {/* شريط تقدم العمر الخدمي للاصل */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-400">العمر الافتراضي: {asset.lifespanYears} سنوات</span>
              <span className="text-slate-700 dark:text-slate-300">مستهلك بنسبة {usefulLifeUsedPercent}%</span>
            </div>
            <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${usefulLifeUsedPercent > 80 ? 'bg-rose-500' : usefulLifeUsedPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${usefulLifeUsedPercent}%` }}
              />
            </div>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-700/50 my-2" />

          {/* تفاصيل التواريخ والضمان */}
          <div className="grid grid-cols-2 gap-4 text-xs font-bold">
            <div className="space-y-1">
              <span className="text-slate-400 block">تاريخ الشراء</span>
              <span className="text-slate-700 dark:text-slate-200">{fmtDate(asset.purchaseDate)}</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 block">حالة الضمان</span>
              {asset.warrantyExpiry ? (
                metrics.isWarrantyExpired ? (
                  <span className="text-rose-500 flex items-center gap-1 justify-end">
                    منتهي ({fmtDate(asset.warrantyExpiry)})
                    <span className="material-symbols-outlined text-sm">gpp_bad</span>
                  </span>
                ) : (
                  <span className="text-emerald-500 flex items-center gap-1 justify-end">
                    نشط (تبقّى {fmt(metrics.warrantyDaysLeft)} يوم)
                    <span className="material-symbols-outlined text-sm">gpp_good</span>
                  </span>
                )
              ) : (
                <span className="text-slate-400">لا يوجد ضمان مسجل</span>
              )}
            </div>
          </div>
        </div>

        {/* جدول الإهلاك الزمني */}
        <div className="space-y-3">
          <h4 className="text-sm font-black dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-blue-500">date_range</span>
            جدول الاستهلاك الزمني (سنة بسنة)
          </h4>
          <div className="overflow-x-auto rounded-3xl border border-black/5 dark:border-white/5 bg-slate-50/20 dark:bg-slate-800/10">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-100/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="p-3 text-center">السنة</th>
                  <th className="p-3">التاريخ المتوقع</th>
                  <th className="p-3">مصروف الاستهلاك</th>
                  <th className="p-3">الاستهلاك المتراكم</th>
                  <th className="p-3">القيمة الدفترية</th>
                </tr>
              </thead>
              <tbody className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {metrics.depreciationSchedule.map((item) => (
                  <tr key={item.year} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="p-3 text-center text-slate-400 font-mono">
                      {item.year === 0 ? 'الشراء' : `السنة ${item.year}`}
                    </td>
                    <td className="p-3 font-mono">{fmtDate(item.yearDate)}</td>
                    <td className="p-3 text-rose-500 font-mono">
                      {item.year === 0 ? '-' : `-${fmt(item.depreciationExpense)}`}
                    </td>
                    <td className="p-3 font-mono">{fmt(item.accumulatedDepreciation)}</td>
                    <td className="p-3 font-mono font-black text-slate-700 dark:text-slate-200">
                      {fmt(item.bookValue)} {getCurrencySymbol()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* الملاحظات إن وجدت */}
        {asset.notes && (
          <div className="bg-slate-50 dark:bg-slate-800/20 p-4 rounded-3xl text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
            <span className="font-bold text-slate-600 dark:text-slate-300 block mb-1">ملاحظات</span>
            {asset.notes}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
