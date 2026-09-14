import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db/core';
import { useI18n } from '../../../i18n/index';
import { toast } from '../../../toast';
import { ExportService } from '../services/exportService';
import { silentFail } from '../../../core/utils';

import { oklchToRgb, oklabToRgb } from '../utils/colorUtils';
import { AnalysisTab } from './analytics/AnalysisTab';
import { HeatmapTab } from './analytics/HeatmapTab';
import { FreedomTab } from './analytics/FreedomTab';
import { ComparisonTab } from './analytics/ComparisonTab';
import {
  getPrevMonthDates,
  calculateTotalWealth,
  calculateCurrentMonthExpenses,
  calculateFreedomData,
  calculateDayOfWeekSpending,
  calculateTimeOfDaySpending,
  calculateSeasonalSpending,
  calculateNeedsVsWants,
  calculateWastedSpending,
  calculateMoodSpending,
  calculatePeriodComparison,
  calculateHeatmapData,
} from '../utils/analyticsMath';

export function AdvancedAnalytics() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'analysis' | 'heatmap' | 'freedom' | 'comparison'>('analysis');
  const [heatmapMonth, setHeatmapMonth] = useState<number>(new Date().getMonth());
  const [heatmapYear, setHeatmapYear] = useState<number>(new Date().getFullYear());
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState<{ day: number; amount: number; count: number } | null>(null);

  // Custom Date Range Comparison States
  const defaultNow = new Date();
  const firstDayThisMonth = new Date(defaultNow.getFullYear(), defaultNow.getMonth(), 1).toISOString().split('T')[0];
  const lastDayThisMonth = new Date(defaultNow.getFullYear(), defaultNow.getMonth() + 1, 0).toISOString().split('T')[0];
  const prevMonthDates = getPrevMonthDates();

  const [compareStartA, setCompareStartA] = useState<string>(firstDayThisMonth);
  const [compareEndA, setCompareEndA] = useState<string>(lastDayThisMonth);
  const [compareStartB, setCompareStartB] = useState<string>(prevMonthDates.start);
  const [compareEndB, setCompareEndB] = useState<string>(prevMonthDates.end);

  // Live Query Active Accounts & Transactions
  const rawAccounts = useLiveQuery(() => db.accounts.toArray());
  const rawTransactions = useLiveQuery(() => db.transactions.toArray());
  const accounts = useMemo(() => rawAccounts || [], [rawAccounts]);
  const transactions = useMemo(() => rawTransactions || [], [rawTransactions]);

  // Filter Active Non-Deleted Transactions
  const activeTxns = useMemo(() => {
    return transactions.filter(t => !t.isDraft && !t.isDeleted);
  }, [transactions]);

  // Total wealth across all accounts
  const totalWealth = useMemo(() => calculateTotalWealth(accounts), [accounts]);

  // Total current month's expenses
  const currentMonthExpenses = useMemo(() => calculateCurrentMonthExpenses(activeTxns), [activeTxns]);

  // Baseline Monthly Expense (current month's expense or 3000 baseline fallback)
  const baselineMonthlyExpense = useMemo(() => {
    return currentMonthExpenses || 3000;
  }, [currentMonthExpenses]);

  // --- 1. FINANCIAL FREEDOM SCORE ---
  const freedomData = useMemo(() => {
    return calculateFreedomData(totalWealth, baselineMonthlyExpense);
  }, [totalWealth, baselineMonthlyExpense]);

  // --- 2. DAYS OF WEEK SPENDING ---
  const dayOfWeekSpending = useMemo(() => {
    return calculateDayOfWeekSpending(activeTxns);
  }, [activeTxns]);

  const maxDaySpending = useMemo(() => {
    return Math.max(...dayOfWeekSpending, 1);
  }, [dayOfWeekSpending]);

  // --- 3. TIME OF DAY SPENDING ---
  const timeOfDaySpending = useMemo(() => {
    return calculateTimeOfDaySpending(activeTxns);
  }, [activeTxns]);

  // --- 4. SEASONAL SPENDING ---
  const seasonalSpending = useMemo(() => {
    return calculateSeasonalSpending(activeTxns);
  }, [activeTxns]);

  // --- 5. NEEDS VS WANTS ---
  const needsVsWants = useMemo(() => {
    return calculateNeedsVsWants(activeTxns);
  }, [activeTxns]);

  // --- 6. WASTED SPENDING (IMPULSE/EMOTIONAL) ---
  const wastedSpending = useMemo(() => {
    return calculateWastedSpending(activeTxns);
  }, [activeTxns]);

  // --- MOOD SPENDING STATISTICS ---
  const moodSpending = useMemo(() => {
    return calculateMoodSpending(activeTxns);
  }, [activeTxns]);

  // --- CUSTOM DATE RANGE COMPARISON CALCULATOR ---
  const comparisonData = useMemo(() => {
    return calculatePeriodComparison(activeTxns, compareStartA, compareEndA, compareStartB, compareEndB);
  }, [activeTxns, compareStartA, compareEndA, compareStartB, compareEndB]);

  // --- 7. HEATMAP CALENDAR GENERATOR ---
  const heatmapData = useMemo(() => {
    return calculateHeatmapData(activeTxns, heatmapYear, heatmapMonth);
  }, [activeTxns, heatmapMonth, heatmapYear]);

  const daysOfWeekLabels = useMemo(() => [
    t('misc.day.0') || 'الأحد',
    t('misc.day.1') || 'الإثنين',
    t('misc.day.2') || 'الثلاثاء',
    t('misc.day.3') || 'الأربعاء',
    t('misc.day.4') || 'الخميس',
    t('misc.day.5') || 'الجمعة',
    t('misc.day.6') || 'السبت'
  ], [t]);

  const monthsLabels = useMemo(() => [
    t('misc.month.0') || 'يناير',
    t('misc.month.1') || 'فبراير',
    t('misc.month.2') || 'مارس',
    t('misc.month.3') || 'أبريل',
    t('misc.month.4') || 'مايو',
    t('misc.month.5') || 'يونيو',
    t('misc.month.6') || 'يوليو',
    t('misc.month.7') || 'أغسطس',
    t('misc.month.8') || 'سبتمبر',
    t('misc.month.9') || 'أكتوبر',
    t('misc.month.10') || 'نوفمبر',
    t('misc.month.11') || 'ديسمبر'
  ], [t]);

  const handlePrint = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        toast(t('report.exportPdfLoading') || 'جاري تجهيز التحليل للطباعة والمشاركة... 🖨️');
        await handleExportPDF();
      } else {
        window.print();
      }
    } catch {
      window.print();
    }
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('advanced-analytics-container');
    if (!element) {
      toast(t('analytics.containerNotFound') || 'لم يتم العثور على حاوية التحليلات', 'error');
      return;
    }

    toast(t('report.exportGenerating') || 'جاري توليد التقرير...');

    // تزييف مؤقت لـ getComputedStyle لتصفية وتحويل ألوان oklch و oklab إلى rgb لتفادي استثناءات html2canvas باستخدام Proxy محكم يمنع Illegal invocation
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
          // اعتراض getPropertyValue
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
          
          // قراءة القيمة مباشرة من الـ target الأصلي لتجنب Illegal invocation للـ getters الخاصة بالمتصفح
          const value = Reflect.get(target, prop);
          
          // إذا كانت القيمة دالة، نقوم بربطها بالـ target لضمان تشغيلها ضمن السياق الأصلي
          if (typeof value === 'function') {
            return value.bind(target);
          }
          
          // اعتراض الخصائص اللونية الشائعة
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

    // حفظ الأنماط الأصلية للعناصر التي تعيق html2canvas
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

    // تغطية الحاوية الرئيسية بخلفية صلبة مؤقتاً
    const origContainerStyle = {
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
        allowTaint: false, // يجب أن تكون false لتجنب SecurityError عند استخدام toDataURL
        logging: false,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1a1d21' : '#ffffff',
        foreignObjectRendering: false,
        ignoreElements: (el) =>
          el.classList.contains('no-print') ||
          el.id === 'analytics-print-btn' ||
          el.id === 'analytics-pdf-btn'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const imgWidth = 210; // A4 عرض بالـ mm
      const pageHeight = 297; // A4 ارتفاع بالـ mm
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
      const fileName = `masarifi_analytics_${activeTab}_${dateStr}.pdf`;

      // على المتصفح: تحميل مباشر بدون base64 وسيط
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        await ExportService.saveFileNative(pdfBase64, fileName, 'application/pdf', true);
      } else {
        doc.save(fileName);
      }

      toast(t('report.exportPdfOk') || 'تم تصدير الـ PDF بنجاح! 📄', 'success');
    } catch (error) {
      silentFail('[AdvancedAnalytics] PDF export error')(error);
      toast(t('report.exportFail') || 'فشل التصدير، يرجى المحاولة لاحقاً', 'error');
    } finally {
      // استعادة الدالة الأصلية لـ getComputedStyle لمنع أي تداخل
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
      element.style.backdropFilter = origContainerStyle.backdropFilter;
      element.style.setProperty('-webkit-backdrop-filter', origContainerStyle.backdropFilter);
      element.style.background = origContainerStyle.background;
      element.style.boxShadow = origContainerStyle.boxShadow;
    }
  };

  return (
    <div id="advanced-analytics-container" className="fin-card p-6 md:p-8 rounded-[2.5rem] bg-white/80 dark:bg-[#1a1d21]/80 border border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-xl space-y-6">
      <style>{`
        @media print {
          /* إخفاء جميع عناصر الخلفية والنصوص العائمة للـ Preview Mode */
          body::before, body::after, html::before, html::after {
            display: none !important;
            content: none !important;
          }
          
          /* تهيئة الحاوية والصفحة بالكامل للطباعة الاحترافية */
          body {
            background: white !important;
            color: black !important;
          }

          /* إخفاء أجزاء التطبيق الجانبية وغير الضرورية للطباعة */
          header, footer, nav, .bottom-nav, .no-print,
          #analytics-print-btn, #analytics-pdf-btn,
          .masarifi-toast, .ptr-indicator, .floating-actions-container {
            display: none !important;
          }

          /* إخفاء جميع العناصر مباشرة تحت البودي ما عدا حاوية تطبيق الـ React */
          body > *:not(#react-root) {
            display: none !important;
          }

          /* تحرير جميع الحاويات الأبوية بالكامل وإلغاء قيود الارتفاع والـ overflow */
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

          /* إخفاء إخوة main-content داخل AppShell */
          #react-root > div > *:not(#main-content) {
            display: none !important;
          }

          /* إخفاء كل العناصر الشريكة لصفحة التقارير والمحاويات غير المعنية داخل صفحة التقارير */
          #main-content > div > div > *:not(#advanced-analytics-container) {
            display: none !important;
          }

          /* تنسيق حاوية التحليلات لفرض مظهر سطح المكتب العريض بالكامل عند الطباعة */
          #advanced-analytics-container {
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

          /* إظهار جميع العناصر المخفية وتوزيع الجداول والأعمدة كنسخة سطح المكتب */
          #advanced-analytics-container .hidden.md\:block,
          #advanced-analytics-container .md\:block {
            display: block !important;
          }
          #advanced-analytics-container .hidden.md\:flex,
          #advanced-analytics-container .md\:flex {
            display: flex !important;
          }
          #advanced-analytics-container .hidden.md\:inline,
          #advanced-analytics-container .md\:inline {
            display: inline !important;
          }
          #advanced-analytics-container .hidden.md\:table-cell,
          #advanced-analytics-container .md\:table-cell {
            display: table-cell !important;
          }
          #advanced-analytics-container .hidden.md\:grid,
          #advanced-analytics-container .md\:grid {
            display: grid !important;
          }

          #advanced-analytics-container .flex-col.md\:flex-row {
            flex-direction: row !important;
          }
          #advanced-analytics-container .grid-cols-1.md\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          #advanced-analytics-container .grid-cols-1.md\:grid-cols-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
          #advanced-analytics-container .grid-cols-1.md\:grid-cols-4 {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }
          #advanced-analytics-container .grid-cols-1.sm\:grid-cols-2.md\:grid-cols-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
          #advanced-analytics-container .grid-cols-2.md\:grid-cols-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
          #advanced-analytics-container .md\:p-8 {
            padding: 2rem !important;
          }
          #advanced-analytics-container .md\:gap-6 {
            gap: 1.5rem !important;
          }

          /* الحفاظ على ألوان الخلفية الحيوية للبطاقات وخريطة الحرارة ومؤشرات الأداء بدقة 100% */
          #advanced-analytics-container * {
            color: #1a1a1a !important;
            border-color: #e2e8f0 !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* تخصيص مظهر البطاقات الملونة لضمان استقرار قراءتها عند الطباعة */
          .fin-card {
            background-color: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 1rem !important;
            padding: 15px !important;
          }

          /* استقرار ألوان خريطة الحرارة وخطوات التقدم والـ gauge */
          [style*="background-color"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          #advanced-analytics-container .flex, 
          #advanced-analytics-container .grid {
            display: flex !important;
          }

          #advanced-analytics-container button {
            background-color: #f1f5f9 !important;
            border: 1px solid #cbd5e1 !important;
          }

          #advanced-analytics-container button.bg-white,
          #advanced-analytics-container button.bg-slate-700 {
            background-color: #cbd5e1 !important;
            color: black !important;
          }
        }
      `}</style>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-5">
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div>
            <h3 className="text-xl font-black text-[#002b59] dark:text-blue-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-500">analytics</span>
              {t('analytics.title') || 'تحليل الإنفاق المتقدم'}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1">
              {t('analytics.subtitle') || 'دراسة عميقة لسلوكك الاستهلاكي ومؤشراتك المالية'}
            </p>
          </div>
          {/* Action Buttons */}
          <div className="flex gap-2 no-print shrink-0">
            <button
              id="analytics-print-btn"
              onClick={handlePrint}
              className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-black/5 dark:border-white/5 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              title={t('analytics.print') || 'طباعة التحليل 🖨️'}
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">print</span>
            </button>
            <button
              id="analytics-pdf-btn"
              onClick={handleExportPDF}
              className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-black/5 dark:border-white/5 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              title={t('analytics.exportPdf') || 'تصدير PDF 📄'}
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">picture_as_pdf</span>
            </button>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl border border-black/5 dark:border-white/5">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'analysis'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-md'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {t('analytics.tab.advanced') || 'تحليل الإنفاق'}
          </button>
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'heatmap'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-md'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {t('analytics.tab.heatmap') || 'خريطة الحرارة'}
          </button>
          <button
            onClick={() => setActiveTab('freedom')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'freedom'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-md'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {t('analytics.tab.freedom') || 'درجة الحرية'}
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'comparison'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-md'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {t('analytics.tab.comparison') || 'مقارنة فترات 📊'}
          </button>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="space-y-6">
        {activeTab === 'analysis' && (
          <AnalysisTab
            needsVsWants={needsVsWants}
            wastedSpending={wastedSpending}
            moodSpending={moodSpending}
            dayOfWeekSpending={dayOfWeekSpending}
            daysOfWeekLabels={daysOfWeekLabels}
            maxDaySpending={maxDaySpending}
            timeOfDaySpending={timeOfDaySpending}
            seasonalSpending={seasonalSpending}
          />
        )}

        {/* Heatmap Calendar */}
        {activeTab === 'heatmap' && (
          <HeatmapTab
            heatmapData={heatmapData}
            heatmapMonth={heatmapMonth}
            setHeatmapMonth={setHeatmapMonth}
            heatmapYear={heatmapYear}
            setHeatmapYear={setHeatmapYear}
            selectedHeatmapDay={selectedHeatmapDay}
            setSelectedHeatmapDay={setSelectedHeatmapDay}
            monthsLabels={monthsLabels}
            daysOfWeekLabels={daysOfWeekLabels}
          />
        )}

        {/* Financial Freedom Score */}
        {activeTab === 'freedom' && (
          <FreedomTab freedomData={freedomData} totalWealth={totalWealth} />
        )}

        {activeTab === 'comparison' && (
          <ComparisonTab
            comparisonData={comparisonData}
            compareStartA={compareStartA}
            setCompareStartA={setCompareStartA}
            compareEndA={compareEndA}
            setCompareEndA={setCompareEndA}
            compareStartB={compareStartB}
            setCompareStartB={setCompareStartB}
            compareEndB={compareEndB}
            setCompareEndB={setCompareEndB}
          />
        )}
      </div>
    </div>
  );
}
