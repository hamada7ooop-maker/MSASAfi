import React from 'react';
import { useI18n } from '../../../i18n/index';
import { useAppStore } from '../../../store/appStore';
import { ExportService } from '../services/exportService';

export function ReportsExports() {
  const { t } = useI18n();
  const setReportBuilderOpen = useAppStore((s) => s.setReportBuilderOpen);

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-black/5 dark:border-white/5">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-600 text-lg">description</span>
          {t('report.professionalSystem') || 'نظام التقارير الاحترافي'}
        </h3>
        <span className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase">
          v2.0
        </span>
      </div>

      <div className="p-4 mb-6 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-500/10">
        <p className="text-xs text-blue-700 dark:text-blue-300 font-bold leading-relaxed">
          {t('report.builderPromo') || 'قم بتوليد تقارير مالية مخصصة تشمل الرسوم البيانية، الملخصات الضريبية، وكشوف الحسابات بتنسيقات متعددة.'}
        </p>
      </div>

      <button 
        onClick={() => setReportBuilderOpen(true)}
        className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl bg-blue-600 text-white font-black text-sm transition-all active:scale-95 shadow-xl shadow-blue-500/30 hover:bg-blue-700 mb-4"
      >
        <span className="material-symbols-outlined">analytics</span>
        {t('report.openBuilder') || 'فتح منشئ التقارير'}
      </button>

      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => ExportService.generateTaxReport()}
          className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 font-black text-[10px] uppercase transition-all active:scale-95 border border-amber-200 dark:border-amber-900/30"
        >
          <span className="material-symbols-outlined text-lg">account_balance</span>
          {t('report.taxAnnualShort') || 'التقرير الضريبي'}
        </button>

        <button 
          onClick={() => ExportService.exportData('xlsx')}
          className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase transition-all active:scale-95 border border-emerald-200 dark:border-emerald-900/30"
        >
          <span className="material-symbols-outlined text-lg">grid_on</span>
          {t('report.quickExcel') || 'إكسل سريع'}
        </button>
      </div>
    </div>
  );
}
