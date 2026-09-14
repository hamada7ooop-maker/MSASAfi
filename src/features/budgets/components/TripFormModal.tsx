import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { db } from '@/core/db/core';
import { toast } from '../../../toast';
import { checkMilestone, triggerCoinAnimation } from '../../../core/loyalty';
import { silentFail, sanitizeNumericInput } from '../../../core/utils';
import type { Trip } from '@/types';

export interface TripFormModalProps {
  open: boolean;
  /** The trip being edited, or null for a new one. Drives both the prefill and
   *  the add-vs-update branch on save. */
  tripToEdit: Trip | null;
  onClose: () => void;
  /** Fired after a successful write so the parent can reload the grid. */
  onSaved: () => void;
}

/**
 * Add / edit trip sheet.
 *
 * Extracted from TravelBudget.tsx (923 lines) as part of L-1. The eight form
 * fields live here because nothing outside this sheet reads them; hoisting
 * them into the page was what gave it eight useState calls it never used
 * elsewhere.
 *
 * The parent keeps only what it genuinely owns: whether the sheet is open and
 * which trip (if any) is being edited.
 */
export function TripFormModal({ open, tripToEdit, onClose, onSaved }: TripFormModalProps) {
  const { t } = useI18n();
  const { parseNum, fmtRaw } = useFormat();

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [limit, setLimit] = useState('');
  const [exchangeRate, setExchangeRate] = useState('4.0');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  /**
   * Prefill whenever the sheet opens.
   *
   * Keyed on `open` as well as the trip, so reopening for a NEW trip after an
   * edit resets the fields instead of inheriting the previous trip's budget.
   */
  React.useEffect(() => {
    if (!open) return;
    if (tripToEdit) {
      setName(tripToEdit.name);
      setCurrency(tripToEdit.currency);
      setLimit(tripToEdit.limit.toString());
      setExchangeRate(tripToEdit.exchangeRate.toString());
      setStartDate(tripToEdit.startDate);
      setEndDate(tripToEdit.endDate);
      setDescription(tripToEdit.description || '');
      setIsActive(tripToEdit.isActive);
    } else {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setName('');
      setCurrency('EUR');
      setLimit('');
      setExchangeRate('4.0');
      setStartDate(today);
      setEndDate(nextWeek);
      setDescription('');
      setIsActive(true);
    }
  }, [open, tripToEdit]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast(t('travel.errName') || 'يرجى إدخال اسم الرحلة', 'error');
      return;
    }
    const numLimit = parseNum(limit);
    if (numLimit <= 0) {
      toast(t('travel.errBudget') || 'يرجى إدخال ميزانية صالحة', 'error');
      return;
    }
    const numRate = parseNum(exchangeRate);
    if (numRate <= 0) {
      toast(t('travel.errRate') || 'يرجى إدخال سعر صرف صالح', 'error');
      return;
    }

    const colors = [
      'from-blue-500 to-indigo-600',
      'from-emerald-500 to-teal-600',
      'from-violet-500 to-purple-600',
      'from-amber-500 to-orange-600',
      'from-rose-500 to-pink-600',
      'from-cyan-500 to-blue-600'
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const tripData: Trip = {
      id: tripToEdit ? tripToEdit.id : crypto.randomUUID(),
      name: name.trim(),
      currency: currency.toUpperCase(),
      limit: numLimit,
      exchangeRate: numRate,
      startDate,
      endDate,
      isActive,
      color: tripToEdit ? tripToEdit.color : randomColor,
      description: description.trim() || undefined
    };

    try {
      if (tripToEdit) {
        await db.trips.put(tripData);
        toast(t('travel.tripUpdated') || 'تم تحديث ميزانية الرحلة بنجاح! ✈️', 'success');
      } else {
        await db.trips.add(tripData);
        toast(t('travel.tripAdded') || 'تمت إضافة ميزانية الرحلة بنجاح! ✈️', 'success');
        
        // Award Loyalty 2.0 milestone
        checkMilestone('FIRST_BUDGET');
        triggerCoinAnimation();
      }
      onClose();
      onSaved();
    } catch (err) {
      silentFail('[TravelBudget] Failed to save trip')(err);
      toast(t('travel.errSaving') || 'حدث خطأ أثناء الحفظ', 'error');
    }
  };

  if (!open) return null;

  return (
      <div className="fixed inset-0 z-[100000] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
        <div 
          className="w-full max-w-md bg-white dark:bg-[#181a1d] rounded-t-[3rem] rounded-b-[2rem] p-6 space-y-6 shadow-2xl border border-slate-100 dark:border-white/5 animate-in slide-in-from-bottom-24 duration-300 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}>
          {/* Modal Header */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-[#002b59] dark:text-blue-100">
                {tripToEdit ? (t('travel.editTrip') || 'تعديل الرحلة') : (t('travel.createTrip') || 'إضافة رحلة جديدة')}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                {t('travel.modalSubtitle') || 'أدخل تفاصيل وميزانية رحلتك القادمة'}
              </p>
            </div>
            <button aria-label={t('action.close') || 'Close'} 
              onClick={() => onClose()}
              className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">close</span>
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Trip Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {t('travel.tripName') || 'اسم الرحلة / الوجهة'}
              </label>
              <input 
                type="text"
                dir="auto"
                autoComplete="off"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                onCompositionEnd={(e) => setName((e.target as HTMLInputElement).value)}
                onBlur={(e) => setName(e.target.value)}
                placeholder="رحلة اليابان، صيف 2026..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 font-bold text-sm text-[#002b59] dark:text-blue-100 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>

            {/* Currency & Exchange Rate Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {t('travel.currency') || 'عملة الرحلة'}
                </label>
                <select 
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 font-bold text-sm text-[#002b59] dark:text-blue-100 focus:outline-none"
                >
                  {['USD', 'EUR', 'GBP', 'AED', 'TRY', 'JPY', 'CHF', 'CAD', 'SAR'].map(cur => (
                    <option key={cur} value={cur}>{cur}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {t('travel.rate') || 'سعر الصرف لـ ر.س'}
                </label>
                <input 
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  autoComplete="off"
                  required
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(sanitizeNumericInput(e.target.value))}
                  onCompositionEnd={(e) => setExchangeRate(sanitizeNumericInput((e.target as HTMLInputElement).value))}
                  onBlur={(e) => setExchangeRate(sanitizeNumericInput(e.target.value))}
                  placeholder="4.00"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 font-bold text-sm text-[#002b59] dark:text-blue-100 focus:outline-none"
                />
              </div>
            </div>

            {/* Budget Limit */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {t('travel.budgetLimit') || 'الميزانية بالعملة الأجنبية'}
              </label>
              <div className="relative flex items-center">
                <input 
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  autoComplete="off"
                  required
                  value={limit}
                  onChange={(e) => setLimit(sanitizeNumericInput(e.target.value))}
                  onCompositionEnd={(e) => setLimit(sanitizeNumericInput((e.target as HTMLInputElement).value))}
                  onBlur={(e) => setLimit(sanitizeNumericInput(e.target.value))}
                  placeholder="2000"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 font-bold text-sm text-[#002b59] dark:text-blue-100 focus:outline-none pr-12"
                />
                <span className="absolute right-4 font-black text-sm text-slate-400 uppercase">
                  {currency}
                </span>
              </div>
              {limit && exchangeRate && (
                <p className="text-[9px] text-slate-400 font-bold mt-1">
                  ≈ {fmtRaw(((parseNum(limit) || 0) * (parseNum(exchangeRate) || 1)), 0)} {t('currency.sar') || 'ر.س'}
                </p>
              )}
            </div>

            {/* Dates Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {t('travel.startDate') || 'تاريخ البدء'}
                </label>
                <input 
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 font-bold text-xs text-[#002b59] dark:text-blue-100 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {t('travel.endDate') || 'تاريخ الانتهاء'}
                </label>
                <input 
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 font-bold text-xs text-[#002b59] dark:text-blue-100 focus:outline-none"
                />
              </div>
            </div>

            {/* Description / Notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {t('travel.notes') || 'ملاحظات وتفاصيل إضافية'}
              </label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ملاحظات حول الطيران، الفندق، إلخ..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 font-bold text-sm text-[#002b59] dark:text-blue-100 focus:outline-none min-h-[80px]"
              />
            </div>

            {/* Form buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => onClose()}
                className="flex-1 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-500 font-black text-xs hover:bg-slate-100 transition-all active:scale-95"
              >
                {t('action.cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 py-3.5 rounded-2xl bg-blue-600 text-white font-black text-xs shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
              >
                {t('action.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}
