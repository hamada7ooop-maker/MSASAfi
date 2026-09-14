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

// دالة مساعدة متطورة لتحويل ألوان oklch المترجمة من Tailwind CSS v4 إلى صيغة RGB مدعومة في html2canvas لتجنب خطأ التصدير.
function oklchToRgb(oklchStr: string): string {
  const regex = /oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/g;
  
  return oklchStr.replace(regex, (match, p1, p2, p3, p4) => {
    const L = p1.endsWith('%') ? parseFloat(p1) / 100 : parseFloat(p1);
    const C = parseFloat(p2);
    const H = parseFloat(p3);
    const A = p4 ? (p4.endsWith('%') ? parseFloat(p4) / 100 : parseFloat(p4)) : 1;
    
    // تحويل OKLCH إلى OKLAB
    const a = C * Math.cos((H * Math.PI) / 180);
    const b = C * Math.sin((H * Math.PI) / 180);
    
    // تحويل OKLAB إلى LMS
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    
    const l = Math.max(0, Math.pow(l_, 3));
    const m = Math.max(0, Math.pow(m_, 3));
    const s = Math.max(0, Math.pow(s_, 3));
    
    // تحويل LMS إلى RGB خطي
    const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const b_rgb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
    
    // تصحيح Gamma للتحويل إلى sRGB
    const f = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
    const R = Math.max(0, Math.min(255, Math.round(f(r) * 255)));
    const G = Math.max(0, Math.min(255, Math.round(f(g) * 255)));
    const B = Math.max(0, Math.min(255, Math.round(f(b_rgb) * 255)));
    
    return A === 1 ? `rgb(${R}, ${G}, ${B})` : `rgba(${R}, ${G}, ${B}, ${A})`;
  });
}

// دالة مساعدة متطورة لتحويل ألوان oklab المترجمة من Tailwind CSS v4 إلى صيغة RGB مدعومة في html2canvas
function oklabToRgb(oklabStr: string): string {
  const regex = /oklab\(\s*([\d.]+%?)\s+([-+]?[\d.]+)\s+([-+]?[\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/g;
  
  return oklabStr.replace(regex, (match, p1, p2, p3, p4) => {
    const L = p1.endsWith('%') ? parseFloat(p1) / 100 : parseFloat(p1);
    const a = parseFloat(p2);
    const b = parseFloat(p3);
    const A = p4 ? (p4.endsWith('%') ? parseFloat(p4) / 100 : parseFloat(p4)) : 1;
    
    // تحويل OKLAB إلى LMS
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    
    const l = Math.max(0, Math.pow(l_, 3));
    const m = Math.max(0, Math.pow(m_, 3));
    const s = Math.max(0, Math.pow(s_, 3));
    
    // تحويل LMS إلى RGB خطي
    const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const b_rgb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
    
    // تصحيح Gamma للتحويل إلى sRGB
    const f = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
    const R = Math.max(0, Math.min(255, Math.round(f(r) * 255)));
    const G = Math.max(0, Math.min(255, Math.round(f(g) * 255)));
    const B = Math.max(0, Math.min(255, Math.round(f(b_rgb) * 255)));
    
    return A === 1 ? `rgb(${R}, ${G}, ${B})` : `rgba(${R}, ${G}, ${B}, ${A})`;
  });
}

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

  if (isAdvisorLoading) {
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

      {/* Financial Score Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#002b59] to-[#1a4175] rounded-[3rem] p-8 shadow-2xl border border-white/10 group">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-700"></div>
        <div className="relative z-10 flex flex-col items-center text-center gap-4">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle cx="64" cy="64" r="60" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/10" />
              <circle cx="64" cy="64" r="60" fill="none" stroke="currentColor" strokeWidth="8" className="text-blue-400 transition-all duration-1000" strokeDasharray={377} strokeDashoffset={377 - (377 * financialScore / 100)} />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-black text-white">{financialScore}</span>
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">%</span>
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-white">{t('ai.advisor.score')}</h3>
            <p className="text-white/60 text-xs font-medium max-w-[240px] leading-relaxed">
              {t('ai.advisor.scoreDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* Deep Insights (New Logic) */}
      <section className="space-y-4">
        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">
          {t('ai.advisor.insights')}
        </h4>
        <div className="bg-white dark:bg-[#1e2124] rounded-[2.5rem] p-7 shadow-sm border border-black/5 dark:border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform duration-700">
             <span className="material-symbols-outlined" style={{ fontSize: '80px' }}>psychology</span>
          </div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3 text-blue-500">
               <span className="material-symbols-outlined">analytics</span>
               <span className="text-xs font-black uppercase tracking-widest">{t('common.lastMonth')}</span>
            </div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {deepInsights || t('chat.ai.noTopData')}
            </p>
          </div>
        </div>
      </section>

      <NecessityBreakdown necessityStats={necessityStats} />

      <RetirementSimulator necessityStats={necessityStats} />

      {/* Smart Challenges */}
      {challenges.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
              {t('ai.advisor.challenges')}
            </h4>
            <span className="px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black rounded-full animate-pulse">
              HOT
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {challenges.map((ch) => (
              <div key={ch.id} className="bg-gradient-to-br from-surface to-surface-container-low border border-outline-variant/30 rounded-[2.5rem] p-6 shadow-sm group active:scale-[0.98] transition-all">
                <div className="flex gap-5">
                  <div className="w-16 h-16 rounded-[1.8rem] bg-amber-500/10 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                    {ch.icon}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-base font-black text-slate-800 dark:text-white">{ch.title}</h5>
                      <span className="text-xs font-black text-amber-600 tabular-nums">+{ch.reward} 🪙</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                      {ch.body}
                    </p>
                    <button 
                      onClick={() => handleAcceptChallenge(ch.id)}
                      className="mt-3 w-full py-3 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-black/10 hover:shadow-xl transition-all"
                    >
                      {t('ai.challenge.accept')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Smart Recommendations */}
      <section className="space-y-4">
        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">
          {t('ai.advisor.recs')}
        </h4>
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div 
              key={rec.id} 
              className={`p-6 rounded-[2.5rem] bg-white dark:bg-[#1e2124] border border-black/5 dark:border-white/5 shadow-sm flex gap-5 items-start relative overflow-hidden group hover:shadow-md transition-all ${rec.priority === 'high' ? 'border-l-4 border-l-rose-500' : ''}`}
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-500">
                {rec.icon}
              </div>
              <div className="flex-1 space-y-2">
                <h5 className="text-sm font-black text-slate-800 dark:text-white">{rec.title}</h5>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  {rec.body}
                </p>
                {rec.action && (
                  <button 
                    onClick={() => navigate(`/${rec.action}`)}
                    className="mt-2 text-blue-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all"
                  >
                    {t('action.show')} <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

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
