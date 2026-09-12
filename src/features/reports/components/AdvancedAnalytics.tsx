import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db/core';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { toast } from '../../../toast';
import { ExportService } from '../services/exportService';
import { silentFail } from '../../../core/utils';

import { oklchToRgb, oklabToRgb } from '../utils/colorUtils';
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
  const { fmt, getCurrencySymbol } = useFormat();
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
              <span className="material-symbols-outlined text-lg">print</span>
            </button>
            <button
              id="analytics-pdf-btn"
              onClick={handleExportPDF}
              className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-black/5 dark:border-white/5 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              title={t('analytics.exportPdf') || 'تصدير PDF 📄'}
            >
              <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
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
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Needs vs Wants & Wasted Rate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Needs vs Wants */}
              <div className="fin-card p-5 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 space-y-4">
                <h4 className="text-xs font-black text-[#002b59] dark:text-blue-100 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-500 text-sm">balance</span>
                  {t('analytics.needsWants') || 'الضروريات مقابل الكماليات'}
                </h4>
                <div className="space-y-2">
                  <div className="h-6 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                    <div
                      style={{ width: `${needsVsWants.needsPct}%` }}
                      className="bg-emerald-500 h-full flex items-center justify-center text-[9px] font-black text-white"
                      title={t('analytics.needsLabel', { amt: fmt(needsVsWants.needs) })}
                    >
                      {needsVsWants.needsPct > 15 ? `${needsVsWants.needsPct.toFixed(0)}%` : ''}
                    </div>
                    <div
                      style={{ width: `${needsVsWants.wantsPct}%` }}
                      className="bg-amber-500 h-full flex items-center justify-center text-[9px] font-black text-white"
                      title={t('analytics.wantsLabel', { amt: fmt(needsVsWants.wants) })}
                    >
                      {needsVsWants.wantsPct > 15 ? `${needsVsWants.wantsPct.toFixed(0)}%` : ''}
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>{t('analytics.needsLabel', { amt: `${fmt(needsVsWants.needs)} ${getCurrencySymbol()}` })}</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>{t('analytics.wantsLabel', { amt: `${fmt(needsVsWants.wants)} ${getCurrencySymbol()}` })}</span>
                  </div>
                </div>
              </div>

              {/* Wasted Spending */}
              <div className="fin-card p-5 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-3xl">heart_broken</span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-[#002b59] dark:text-blue-100">
                    {t('analytics.wasted') || 'معدل الهدر المالي'}
                  </h4>
                  <p className="text-lg font-black text-red-500">
                    {wastedSpending.rate.toFixed(1)}% <span className="text-xs text-slate-400">({fmt(wastedSpending.amount)} {getCurrencySymbol()})</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                    {wastedSpending.rate > 20 
                      ? t('analytics.wasted.warning')
                      : t('analytics.wasted.good')}
                  </p>
                </div>
              </div>
            </div>

            {/* Emotional & Mood Spending Analytics */}
            <div className="fin-card p-6 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 space-y-6">
              <div>
                <h4 className="text-xs font-black text-[#002b59] dark:text-blue-100 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-purple-500 text-sm">psychology</span>
                  {t('analytics.mood.title')}
                </h4>
                <p className="text-[10px] text-slate-400 font-bold mt-1">
                  {t('analytics.mood.desc')}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { key: 'happy', label: t('analytics.mood.happy'), data: moodSpending.moods.happy, color: 'bg-emerald-500' },
                  { key: 'sad', label: t('analytics.mood.sad'), data: moodSpending.moods.sad, color: 'bg-blue-500' },
                  { key: 'stressed', label: t('analytics.mood.stressed'), data: moodSpending.moods.stressed, color: 'bg-red-500' },
                  { key: 'tired', label: t('analytics.mood.tired'), data: moodSpending.moods.tired, color: 'bg-amber-500' },
                  { key: 'neutral', label: t('analytics.mood.neutral'), data: moodSpending.moods.neutral, color: 'bg-slate-500' }
                ].map((mObj) => {
                  const pct = moodSpending.total > 0 ? (mObj.data.amount / moodSpending.total) * 100 : 0;
                  return (
                    <div key={mObj.key} className="p-3 bg-white dark:bg-slate-800/50 rounded-2xl border border-black/5 dark:border-white/5 space-y-2 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 font-black block">{mObj.label}</span>
                        <span className="text-xs font-black text-[#002b59] dark:text-blue-100 mt-1 block">
                          {fmt(mObj.data.amount)} {getCurrencySymbol()}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                          {t('analytics.mood.txCount', { count: mObj.data.count })}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div style={{ width: `${pct}%` }} className={`h-full ${mObj.color} rounded-full`}></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {moodSpending.hasEmotionalSpending && (
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs font-black text-purple-700 dark:text-purple-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">lightbulb</span>
                  <span>
                    {t('analytics.mood.insight', {
                      mood: moodSpending.highestMood === 'happy'
                        ? t('analytics.mood.happyWord')
                        : moodSpending.highestMood === 'sad'
                        ? t('analytics.mood.sadWord')
                        : moodSpending.highestMood === 'stressed'
                        ? t('analytics.mood.stressedWord')
                        : t('analytics.mood.tiredWord')
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Days of Week & Times of Day */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Days of Week */}
              <div className="fin-card p-5 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 space-y-4">
                <h4 className="text-xs font-black text-[#002b59] dark:text-blue-100 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-blue-500 text-sm">calendar_view_week</span>
                  {t('analytics.days') || 'الإنفاق حسب أيام الأسبوع'}
                </h4>
                <div className="space-y-2">
                  {daysOfWeekLabels.map((day, idx) => {
                    const amt = dayOfWeekSpending[idx];
                    const pct = (amt / maxDaySpending) * 100;
                    return (
                      <div key={day} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-slate-500">{day}</span>
                          <span className="text-[#002b59] dark:text-blue-200">{fmt(amt)} {getCurrencySymbol()}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className="bg-blue-500 h-full rounded-full transition-all duration-500"
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Times of Day & Seasons */}
              <div className="space-y-6">
                {/* Times of Day */}
                <div className="fin-card p-5 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 space-y-4">
                  <h4 className="text-xs font-black text-[#002b59] dark:text-blue-100 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-amber-500 text-sm">schedule</span>
                    {t('analytics.times') || 'الإنفاق حسب أوقات اليوم'}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'morning', label: t('analytics.time.morning'), val: timeOfDaySpending.morning, amt: timeOfDaySpending.amounts.morning },
                      { key: 'afternoon', label: t('analytics.time.afternoon'), val: timeOfDaySpending.afternoon, amt: timeOfDaySpending.amounts.afternoon },
                      { key: 'evening', label: t('analytics.time.evening'), val: timeOfDaySpending.evening, amt: timeOfDaySpending.amounts.evening },
                      { key: 'night', label: t('analytics.time.night'), val: timeOfDaySpending.night, amt: timeOfDaySpending.amounts.night }
                    ].map(tObj => (
                      <div key={tObj.key} className="p-3 bg-white dark:bg-slate-800/50 rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold block">{tObj.label}</span>
                        <span className="text-sm font-black text-[#002b59] dark:text-blue-100 block">
                          {tObj.val.toFixed(0)}%
                        </span>
                        <span className="text-[9px] text-slate-400/80 font-bold block">
                          {fmt(tObj.amt)} {getCurrencySymbol()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seasonal Spending */}
                <div className="fin-card p-5 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 space-y-4">
                  <h4 className="text-xs font-black text-[#002b59] dark:text-blue-100 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-purple-500 text-sm">ac_unit</span>
                    {t('analytics.seasons') || 'الإنفاق حسب مواسم السنة'}
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: 'winter', val: seasonalSpending.winter },
                      { key: 'spring', val: seasonalSpending.spring },
                      { key: 'summer', val: seasonalSpending.summer },
                      { key: 'autumn', val: seasonalSpending.autumn }
                    ].map(sObj => (
                      <div key={sObj.key} className="text-center space-y-1 p-2 bg-white dark:bg-slate-800/50 rounded-xl">
                        <span className="text-[9px] text-slate-400 font-black block">{t(`analytics.season.${sObj.key}`)}</span>
                        <span className="text-xs font-black text-[#002b59] dark:text-blue-100 block">{sObj.val.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Heatmap Calendar */}
        {activeTab === 'heatmap' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-black text-[#002b59] dark:text-blue-100 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-rose-500 text-sm">calendar_month</span>
                  {t('analytics.heatmap.title') || 'خريطة الإنفاق الحرارية'}
                </h4>
                <p className="text-[10px] text-slate-400 font-bold mt-1">
                  {t('analytics.heatmap.desc') || 'توضيح بصري لكثافة إنفاقك اليومي على مدار الشهر.'}
                </p>
              </div>

              {/* Month Selector */}
              <div className="flex gap-2">
                <select
                  value={heatmapMonth}
                  onChange={(e) => {
                    setHeatmapMonth(Number(e.target.value));
                    setSelectedHeatmapDay(null);
                  }}
                  className="bg-slate-100 dark:bg-slate-800 text-xs font-black p-3.5 rounded-2xl border-none text-[#002b59] dark:text-white"
                >
                  {monthsLabels.map((lbl, idx) => (
                    <option key={idx} value={idx}>{lbl}</option>
                  ))}
                </select>
                <select
                  value={heatmapYear}
                  onChange={(e) => {
                    setHeatmapYear(Number(e.target.value));
                    setSelectedHeatmapDay(null);
                  }}
                  className="bg-slate-100 dark:bg-slate-800 text-xs font-black p-3.5 rounded-2xl border-none text-[#002b59] dark:text-white"
                >
                  {[2025, 2026, 2027].map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {daysOfWeekLabels.map(d => <div key={d}>{d}</div>)}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {/* Empty cells before the first day of the month */}
                {Array.from({ length: heatmapData.firstDayIndex }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square bg-slate-50/20 dark:bg-slate-800/10 rounded-2xl border border-dashed border-slate-100 dark:border-white/5 opacity-30"></div>
                ))}

                {/* Days of the month */}
                {Array.from({ length: heatmapData.totalDays }).map((_, i) => {
                  const dayNum = i + 1;
                  const dayStats = heatmapData.dailySpending[dayNum] || { amount: 0, count: 0 };
                  const intensity = heatmapData.maxDailySpend > 0 ? (dayStats.amount / heatmapData.maxDailySpend) : 0;

                  // Determine color class based on intensity
                  let bgStyle: React.CSSProperties = {};
                  let borderClass = 'border-slate-100 dark:border-white/5';
                  let textClass = 'text-[#002b59] dark:text-blue-100';

                  if (dayStats.amount === 0) {
                    bgStyle = { backgroundColor: 'transparent' };
                  } else if (intensity < 0.25) {
                    bgStyle = { backgroundColor: 'rgba(59, 130, 246, 0.15)' }; // Light blue
                  } else if (intensity < 0.6) {
                    bgStyle = { backgroundColor: 'rgba(99, 102, 241, 0.35)' }; // Indigo
                  } else if (intensity < 0.9) {
                    bgStyle = { backgroundColor: 'rgba(124, 58, 237, 0.6)' }; // Purple
                  } else {
                    bgStyle = { backgroundColor: 'rgba(244, 63, 94, 0.85)' }; // Rose
                    borderClass = 'border-red-500/50 dark:border-red-400/50 animate-pulse';
                    textClass = 'text-white font-black';
                  }

                  return (
                    <button
                      key={`day-${dayNum}`}
                      onClick={() => setSelectedHeatmapDay({ day: dayNum, amount: dayStats.amount, count: dayStats.count })}
                      style={bgStyle}
                      className={`aspect-square rounded-2xl border ${borderClass} flex flex-col items-center justify-center gap-0.5 hover:scale-105 active:scale-95 transition-all relative group`}
                    >
                      <span className={`text-[10px] font-black ${textClass}`}>{dayNum}</span>
                      {dayStats.amount > 0 && (
                        <span className={`text-[8px] opacity-80 ${dayStats.amount > heatmapData.maxDailySpend * 0.9 ? 'text-white' : 'text-slate-500 dark:text-slate-400'} font-bold`}>
                          {dayStats.amount.toFixed(0)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Day stats card */}
              {selectedHeatmapDay && (
                <div className="fin-card p-5 bg-blue-500/10 border border-blue-500/20 rounded-3xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-1">
                    <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest block">
                      {t('analytics.heatmap.dayDetails', { day: selectedHeatmapDay.day, month: monthsLabels[heatmapMonth], year: heatmapYear })}
                    </span>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {t('analytics.heatmap.totalSpend')} <span className="text-sm font-black text-[#002b59] dark:text-blue-100">{fmt(selectedHeatmapDay.amount)} {getCurrencySymbol()}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold">
                      {t('analytics.heatmap.txCount', { count: selectedHeatmapDay.count })}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedHeatmapDay(null)}
                    className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Financial Freedom Score */}
        {activeTab === 'freedom' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Score Gauge */}
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 rounded-[2rem] space-y-4">
                <h4 className="text-xs font-black text-[#002b59] dark:text-blue-100 flex items-center gap-1.5 self-start">
                  <span className="material-symbols-outlined text-emerald-500 text-sm">account_balance</span>
                  {t('analytics.freedom.score') || 'درجة الحرية المالية'}
                </h4>

                <div className="relative w-36 h-36 flex items-center justify-center">
                  {/* Progress Ring */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="64"
                      className="stroke-slate-200 dark:stroke-slate-800 fill-none"
                      strokeWidth="12"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r="64"
                      className="stroke-emerald-500 fill-none transition-all duration-1000 ease-out"
                      strokeWidth="12"
                      strokeDasharray={402}
                      strokeDashoffset={402 - (402 * freedomData.score) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-black text-[#002b59] dark:text-blue-100">
                      {freedomData.score.toFixed(1)}%
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">{t('analytics.freedom.independenceScore')}</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 font-bold text-center leading-relaxed max-w-xs">
                  {t('analytics.freedom.desc') || 'مبني على قاعدة الـ 4% (العيش من عوائد 25 ضعف مصاريفك السنوية).'}
                </p>
              </div>

              {/* Security Months Indicator */}
              <div className="space-y-4">
                <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                    <span className="material-symbols-outlined text-2xl">shield</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest block">
                      {t('analytics.freedom.months') || 'أشهر الأمان المالي'}
                    </span>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {freedomData.monthsOfSecurity.toFixed(1)} <span className="text-xs font-bold text-slate-400">{t('analytics.freedom.monthsSuffix')}</span>
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                      {t('analytics.freedom.monthsDesc') || 'الفترة التي يمكنك العيش فيها دون دخل بناءً على ثروتك الحالية.'}
                    </p>
                  </div>
                </div>

                {/* Wealth Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 rounded-2xl space-y-1">
                    <span className="text-[9px] text-slate-400 font-bold block">{t('analytics.freedom.totalWealth')}</span>
                    <span className="text-sm font-black text-[#002b59] dark:text-blue-100 block">
                      {fmt(totalWealth)} {getCurrencySymbol()}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 rounded-2xl space-y-1">
                    <span className="text-[9px] text-slate-400 font-bold block">{t('analytics.freedom.targetCapital')}</span>
                    <span className="text-sm font-black text-[#002b59] dark:text-blue-100 block">
                      {fmt(freedomData.requiredCapital)} {getCurrencySymbol()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'comparison' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Custom Range Picker Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 rounded-3xl">
              {/* Period A Selectors */}
              <div className="space-y-3 p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-black/5 dark:border-white/5">
                <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-white/5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-200">{t('analytics.compare.periodA')}</h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[8px] text-slate-400 font-bold block">{t('analytics.compare.fromDate')}</label>
                    <input
                      type="date"
                      value={compareStartA}
                      onChange={e => setCompareStartA(e.target.value)}
                      className="w-full text-[10px] font-bold p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl text-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-slate-400 font-bold block">{t('analytics.compare.toDate')}</label>
                    <input
                      type="date"
                      value={compareEndA}
                      onChange={e => setCompareEndA(e.target.value)}
                      className="w-full text-[10px] font-bold p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl text-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Period B Selectors */}
              <div className="space-y-3 p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-black/5 dark:border-white/5">
                <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-white/5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0"></span>
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-200">{t('analytics.compare.periodB')}</h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[8px] text-slate-400 font-bold block">{t('analytics.compare.fromDate')}</label>
                    <input
                      type="date"
                      value={compareStartB}
                      onChange={e => setCompareStartB(e.target.value)}
                      className="w-full text-[10px] font-bold p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl text-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-slate-400 font-bold block">{t('analytics.compare.toDate')}</label>
                    <input
                      type="date"
                      value={compareEndB}
                      onChange={e => setCompareEndB(e.target.value)}
                      className="w-full text-[10px] font-bold p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl text-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Overall Comparative Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total Income Compare */}
              <div className="p-5 bg-white dark:bg-slate-800/40 rounded-[2rem] border border-black/5 dark:border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-emerald-500 font-black flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    {t('analytics.compare.totalIncome')}
                  </span>
                  {(() => {
                    const diff = comparisonData.periodA.income - comparisonData.periodB.income;
                    const isUp = diff >= 0;
                    return (
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                        isUp ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                      }`}>
                        <span className="material-symbols-outlined text-[10px]">
                          {isUp ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                        {isUp ? t('analytics.compare.increase') : t('analytics.compare.decrease')} ({fmt(Math.abs(diff))})
                      </span>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-slate-50 dark:border-white/5 pt-3">
                  <div>
                    <span className="text-[8px] text-slate-400 font-bold block">{t('analytics.compare.lblPeriodA')}</span>
                    <span className="text-sm font-black text-[#002b59] dark:text-blue-100">
                      {fmt(comparisonData.periodA.income)} {getCurrencySymbol()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 font-bold block">{t('analytics.compare.lblPeriodB')}</span>
                    <span className="text-sm font-bold text-slate-400">
                      {fmt(comparisonData.periodB.income)} {getCurrencySymbol()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Expense Compare */}
              <div className="p-5 bg-white dark:bg-slate-800/40 rounded-[2rem] border border-black/5 dark:border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-rose-500 font-black flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">trending_down</span>
                    {t('analytics.compare.totalExpense')}
                  </span>
                  {(() => {
                    const diff = comparisonData.periodA.expense - comparisonData.periodB.expense;
                    const isUp = diff >= 0;
                    return (
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                        isUp ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'
                      }`}>
                        <span className="material-symbols-outlined text-[10px]">
                          {isUp ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                        {isUp ? t('analytics.compare.increase') : t('analytics.compare.decrease')} ({fmt(Math.abs(diff))})
                      </span>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-slate-50 dark:border-white/5 pt-3">
                  <div>
                    <span className="text-[8px] text-slate-400 font-bold block">{t('analytics.compare.lblPeriodA')}</span>
                    <span className="text-sm font-black text-[#002b59] dark:text-blue-100">
                      {fmt(comparisonData.periodA.expense)} {getCurrencySymbol()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 font-bold block">{t('analytics.compare.lblPeriodB')}</span>
                    <span className="text-sm font-bold text-slate-400">
                      {fmt(comparisonData.periodB.expense)} {getCurrencySymbol()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Cash Flow Compare */}
              <div className="p-5 bg-white dark:bg-slate-800/40 rounded-[2rem] border border-black/5 dark:border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-blue-500 font-black flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">monetization_on</span>
                    {t('analytics.compare.netSavings')}
                  </span>
                  {(() => {
                    const diff = comparisonData.periodA.net - comparisonData.periodB.net;
                    const isUp = diff >= 0;
                    return (
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                        isUp ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                      }`}>
                        <span className="material-symbols-outlined text-[10px]">
                          {isUp ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                        {isUp ? t('analytics.compare.improvement') : t('analytics.compare.decline')} ({fmt(Math.abs(diff))})
                      </span>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-slate-50 dark:border-white/5 pt-3">
                  <div>
                    <span className="text-[8px] text-slate-400 font-bold block">{t('analytics.compare.lblPeriodA')}</span>
                    <span className={`text-sm font-black ${
                      comparisonData.periodA.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                    }`}>
                      {fmt(comparisonData.periodA.net)} {getCurrencySymbol()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 font-bold block">{t('analytics.compare.lblPeriodB')}</span>
                    <span className="text-sm font-bold text-slate-400">
                      {fmt(comparisonData.periodB.net)} {getCurrencySymbol()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Side-by-Side Category Spending breakdown */}
            <div className="p-6 bg-white dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 rounded-[2rem] space-y-4">
              <div>
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-500 text-sm">difference</span>
                  {t('analytics.compare.categoriesAnalysis')}
                </h4>
                <p className="text-[9px] text-slate-400 font-bold">
                  {t('analytics.compare.categoriesAnalysisDesc')}
                </p>
              </div>

              {comparisonData.categoryComparison.length === 0 ? (
                <div className="text-center py-8 text-xs font-bold text-slate-400">
                  {t('analytics.compare.noData')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/5 text-[9px] text-slate-400 font-bold">
                        <th className="pb-3 text-right">{t('analytics.compare.category')}</th>
                        <th className="pb-3 text-center">{t('analytics.compare.periodANew')}</th>
                        <th className="pb-3 text-center">{t('analytics.compare.periodBRef')}</th>
                        <th className="pb-3 text-center">{t('analytics.compare.difference')}</th>
                        <th className="pb-3 text-center">{t('analytics.compare.changePct')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                      {comparisonData.categoryComparison.map((item, index) => {
                        const isIncrease = item.diff > 0;
                        return (
                          <tr key={index} className="text-[10px] font-bold text-slate-700 dark:text-slate-200">
                            <td className="py-3 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[7px]">📁</span>
                              {t(`category.${item.category}`) || item.category}
                            </td>
                            <td className="py-3 text-center font-black text-[#002b59] dark:text-blue-100">
                              {fmt(item.amtA)} {getCurrencySymbol()}
                              <span className="text-[8px] text-slate-400 font-bold block">({t('analytics.compare.txSuffix', { count: item.countA })})</span>
                            </td>
                            <td className="py-3 text-center text-slate-400">
                              {fmt(item.amtB)} {getCurrencySymbol()}
                              <span className="text-[8px] text-slate-400 font-bold block">({t('analytics.compare.txSuffix', { count: item.countB })})</span>
                            </td>
                            <td className={`py-3 text-center ${isIncrease ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {isIncrease ? '+' : ''}{fmt(item.diff)} {getCurrencySymbol()}
                            </td>
                            <td className="py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${
                                isIncrease ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'
                              }`}>
                                {isIncrease ? '📈' : '📉'} {item.pctChange.toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
