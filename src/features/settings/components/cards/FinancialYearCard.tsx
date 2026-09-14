import React, { useState } from 'react';
import { useI18n } from '../../../../i18n/index';
import { useSettingsStore } from '../../../../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';
import { toast } from '../../../../toast';

export function FinancialYearCard() {
  const { t } = useI18n();
  const { lockedYears, setLockedYears } = useSettingsStore(
    useShallow((s) => ({
      lockedYears: s.lockedYears,
      setLockedYears: s.setLockedYears
    }))
  );

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const toggleYearLock = (year: number) => {
    const isLocked = lockedYears.includes(year);
    const nextYears = isLocked
      ? lockedYears.filter((y) => y !== year)
      : [...lockedYears, year];

    if (isLocked) {
      toast(t('settings.yearUnlockedSuccess') || `تم إلغاء قفل السنة ${year} 🔓`, 'success');
    } else {
      toast(t('settings.yearLockedSuccess') || `تم قفل السنة ${year} 🔒`, 'success');
    }
    setLockedYears(nextYears);
  };

  const isSelectedLocked = lockedYears.includes(selectedYear);

  return (
    <div className="space-y-1 animate-in slide-in-from-bottom-4 duration-500">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 px-1 mb-2">
        {t('settings.advanced.archive') || 'أرشفة السنوات المالية'}
      </p>

      <div className="bg-white/40 dark:bg-white/[0.02] backdrop-blur-md rounded-[1.75rem] overflow-hidden border border-white/20 dark:border-white/[0.05] shadow-[0_8px_32px_0_rgba(31,38,135,0.03)]">

        {/* Description */}
        <div className="px-4 pt-4 pb-3 flex gap-3 items-start border-b border-slate-100/30 dark:border-white/[0.02]">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock_clock</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-400 font-bold leading-relaxed">
            {t('settings.advanced.archive.desc') || 'قم بقفل السنوات المالية السابقة لمنع أي تعديل أو حذف أو إضافة معاملات بها لحفظ سلامة البيانات التاريخية.'}
          </p>
        </div>

        {/* Year Picker + Action */}
        <div className="px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
            </div>
            <div>
              <p className="text-[13px] font-black text-on-surface dark:text-white leading-tight">
                {t('settings.advanced.archive.select') || 'السنة المالية'}
              </p>
              <div className="relative mt-0.5">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03] text-[11px] font-black text-indigo-600 dark:text-indigo-400 outline-none rounded-lg px-2 py-0.5 cursor-pointer"
                >
                  {years.map((yr) => (
                    <option key={yr} value={yr} className="dark:bg-[#1a1d21] text-black dark:text-white">
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={() => toggleYearLock(selectedYear)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-[11px] uppercase tracking-wider shadow-md active:scale-95 transition-all ${
              isSelectedLocked
                ? 'bg-rose-500 text-white shadow-rose-500/20'
                : 'bg-indigo-600 text-white shadow-indigo-600/20'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isSelectedLocked ? 'lock_open' : 'lock'}
            </span>
            {isSelectedLocked
              ? (t('settings.advanced.archive.unlock') || 'فتح القفل')
              : (t('settings.advanced.archive.lock') || 'قفل السنة')}
          </button>
        </div>

        {/* Locked Years Badges */}
        {lockedYears.length > 0 && (
          <div className="px-4 pb-4 border-t border-slate-100/30 dark:border-white/[0.02] pt-3 space-y-2">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 px-0.5">
              {t('settings.advanced.archive.locked_list') || 'السنوات المقفولة'}
            </p>
            <div className="flex flex-wrap gap-2">
              {lockedYears.map((yr) => (
                <div
                  key={yr}
                  className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 px-3 py-1.5 rounded-2xl text-[11px] font-black animate-in zoom-in-95 duration-200"
                >
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                  <span>{yr}</span>
                  <button
                    onClick={() => toggleYearLock(yr)}
                    className="ms-0.5 w-4 h-4 flex items-center justify-center rounded-full hover:bg-rose-500/20 transition-colors active:scale-90"
                    title={t('settings.advanced.archive.unlock') || 'إلغاء القفل'}
                  >
                    <span className="material-symbols-outlined text-[12px]" aria-hidden="true">close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
