import React from 'react';
import { useAdvisorData } from '../hooks/useAdvisorData';
import { ErrorState } from '../../../components/common/ErrorState';
import { useI18n } from '../../../i18n/index';
import { useNavigate } from 'react-router-dom';
import { checkMilestone } from '../../../core/loyalty';
import { toast } from '../../../toast';
import { ExportService } from '../../reports/services/exportService';
import { silentFail } from '../../../core/utils';
import { RetirementSimulator } from './RetirementSimulator';
import { NecessityBreakdown } from './NecessityBreakdown';
import { AdvisorChallenges } from './AdvisorChallenges';
import { AdvisorRecommendations } from './AdvisorRecommendations';
import { AdvisorScoreCard } from './AdvisorScoreCard';
import { AdvisorDeepInsights } from './AdvisorDeepInsights';

import { oklabToRgb, oklchToRgb } from '../utils/pdfColors';

export function AdvisorPage() {
  const { t, isRTL } = useI18n();
  const navigate = useNavigate();
  const { 
    financialScore, 
    challenges, 
    recommendations, 
    deepInsights, 
    isAdvisorLoading,
    necessityStats,
    error,
    retry
  } = useAdvisorData();

  const [isExporting, setIsExporting] = React.useState(false);

  const handlePrint = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        toast(t('report.exportPdfLoading') || 'جاري تجهيز التحليل للطباعة والمشاركة... 🖨️');
        await handleExportPDF();
      } else {
        window.print();
      }
    } catch (e) {
      window.print();
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    const element = document.getElementById('advisor-print-container');
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
    element.style.background = document.documentElement.classList.contains('dark') ? '#1a1d21' : '#ffffff';
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
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1a1d21' : '#ffffff',
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
      const fileName = `masarifi_advisor_${dateStr}.pdf`;
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        await ExportService.saveFileNative(pdfBase64, fileName, 'application/pdf', true);
      } else {
        doc.save(fileName);
      }
      toast(t('report.exportPdfOk') || 'تم تصدير التقرير بنجاح ✅', 'success');
    } catch (error) {
      silentFail('Advisor PDF export error')(error);
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

  // Wave 4: Plan & Retirement Simulator states

  React.useEffect(() => {
    checkMilestone('ADVISOR');
  }, []);

  const handleAcceptChallenge = (_id: string) => {
    toast(t('reward.challenge_completed') + ' 🎉', 'success');
    checkMilestone('OPPORTUNITY');
  };

  // Directive 17 item 3: skeletons only while the first result is genuinely
  // pending — an early failure must show the error state instead (D16).
  if (isAdvisorLoading && !error) {
    return (
      <div className="p-6 space-y-8 animate-pulse">
        <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-[2.5rem]"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-[2.5rem]"></div>
      </div>
    );
  }

  // Directive 16: an advisor page with no insights because the analysis fetch
  // failed is not the same as one with nothing to say — say which it is.
  if (error) return <ErrorState onRetry={retry} />;

  return (
    <>
    {/* أنماط الطباعة الخاصة بصفحة المستشار المالي */}
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
        #main-content > div > div > *:not(#advisor-print-container) {
          display: none !important;
        }
        #advisor-print-container {
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
        #advisor-print-container .hidden.md\:block,
        #advisor-print-container .md\:block {
          display: block !important;
        }
        #advisor-print-container .hidden.md\:flex,
        #advisor-print-container .md\:flex {
          display: flex !important;
        }
        #advisor-print-container .hidden.md\:inline,
        #advisor-print-container .md\:inline {
          display: inline !important;
        }
        #advisor-print-container .hidden.md\:table-cell,
        #advisor-print-container .md\:table-cell {
          display: table-cell !important;
        }
        #advisor-print-container .hidden.md\:grid,
        #advisor-print-container .md\:grid {
          display: grid !important;
        }

        #advisor-print-container .flex-col.md\:flex-row {
          flex-direction: row !important;
        }
        #advisor-print-container .grid-cols-1.md\:grid-cols-2 {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        #advisor-print-container .grid-cols-1.md\:grid-cols-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }
        #advisor-print-container .grid-cols-1.md\:grid-cols-4 {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        }
        #advisor-print-container .grid-cols-1.sm\:grid-cols-2.md\:grid-cols-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }
        #advisor-print-container .grid-cols-2.md\:grid-cols-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }
        #advisor-print-container .md\:p-8 {
          padding: 2rem !important;
        }
        #advisor-print-container .md\:gap-6 {
          gap: 1.5rem !important;
        }
        #advisor-print-container * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        [style*="background-color"] {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `}</style>
    <div id="advisor-print-container" className="p-5 space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <button 
            aria-label={t('action.back') || 'Back'}
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-2xl bg-surface-container-low flex items-center justify-center text-slate-500 active:scale-90 transition-all no-print"
          >
            <span className="material-symbols-outlined" aria-hidden="true">{isRTL ? 'arrow_forward' : 'arrow_back'}</span>
          </button>
          <h2 className="text-3xl text-premium-header text-[var(--color-primary)] dark:text-blue-100">
            {t('ai.advisor.title')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* أزرار الطباعة والتصدير */}
          <button
            id="advisor-print-btn"
            onClick={handlePrint}
            className="no-print w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition-all"
            title={t('common.print') || 'طباعة'}
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">print</span>
          </button>
          <button
            id="advisor-pdf-btn"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="no-print w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 hover:bg-blue-500/20 active:scale-90 transition-all disabled:opacity-50"
            title={t('report.exportPdf') || 'تصدير PDF'}
          >
            {isExporting
              ? <span className="material-symbols-outlined text-lg animate-spin" aria-hidden="true">progress_activity</span>
              : <span className="material-symbols-outlined text-lg" aria-hidden="true">picture_as_pdf</span>
            }
          </button>
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-blue-500 animate-pulse">auto_awesome</span>
          </div>
        </div>
      </div>

      <AdvisorScoreCard score={financialScore} />

      <AdvisorDeepInsights insights={deepInsights} />

      <NecessityBreakdown necessityStats={necessityStats} />

      <RetirementSimulator necessityStats={necessityStats} />

      <AdvisorChallenges challenges={challenges} onAccept={handleAcceptChallenge} />

      <AdvisorRecommendations recommendations={recommendations} onNavigate={(action) => navigate(`/${action}`)} />

      {/* Footer Insight */}
      <div className="py-10 text-center opacity-30 select-none">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">
          POWERED BY MASARIFI AI NEURAL ENGINE
        </p>
      </div>
    </div>
    </>
  );
}
