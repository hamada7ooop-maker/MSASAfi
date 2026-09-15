import React from 'react';
import { onActivate } from '@/core/a11yKeyboard';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import type { Transaction, Trip } from '@/types';
import { tripSpendMetrics } from '../utils/tripMetrics';
import { getWeatherInfo } from '../utils/travelWeather';
import type { TravelForecast } from '../hooks/useTravelForecast';

/**
 * Directive 19 — decomposition continuation: the trip card.
 *
 * The card lifted verbatim from TravelBudget.tsx — color strip, the
 * cross-currency spent/budget pair (now via the pure tripSpendMetrics),
 * the consumption bar with its 85%/100% warning bands, the expandable
 * forecast hub and the linked-transactions list. A fin-card with closed
 * bounds; it carries cv-item + contain-card (§5.1 rule 3).
 */

interface TripCardProps {
  trip: Trip;
  txs: Transaction[];
  isSelected: boolean;
  forecastData: TravelForecast | null;
  forecastLoading: boolean;
  onSelect: (trip: Trip | null) => void;
  onEdit: (trip: Trip) => void;
  onDelete: (tripId: string) => void;
  onToggleActive: (trip: Trip) => void;
}

export function TripCard({
  trip,
  txs,
  isSelected,
  forecastData,
  forecastLoading,
  onSelect,
  onEdit,
  onDelete,
  onToggleActive,
}: TripCardProps) {
  const { t } = useI18n();
  const { fmt, fmtRaw } = useFormat();
  const { spentPrimary, spentForeign, limitPrimary, pct, isWarning, isDanger } = tripSpendMetrics(trip, txs);

  return (
    <div
      onClick={() => onSelect(isSelected ? null : trip)}
      className={`cv-item contain-card fin-card overflow-hidden cursor-pointer transition-all duration-300 relative ${
        isSelected ? 'ring-2 ring-blue-500 scale-[1.01]' : 'hover:scale-[1.005]'
      }`}
      role="button" tabIndex={0} onKeyDown={onActivate(() => onSelect(isSelected ? null : trip))}>
{/* Premium Top Color Strip */}
      <div className={`h-1.5 bg-gradient-to-r ${trip.color}`}></div>

      <div className="p-5 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-base font-black text-[#002b59] dark:text-blue-100 flex items-center gap-1.5">
              {trip.name}
              {!trip.isActive && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-[8px] font-black uppercase tracking-tight">
                  {t('travel.archived') || 'مؤرشفة'}
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              📅 {trip.startDate} {t('travel.to') || 'إلى'} {trip.endDate}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-xl">
              1 {trip.currency} = {fmt(trip.exchangeRate)} {t('currency.sar') || 'ر.س'}
            </span>
          </div>
        </div>

        {/* Spent & Budget Summary */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/30">
            <span className="text-[9px] font-black text-slate-400 block tracking-wider uppercase">
              {t('travel.spent') || 'المصروف'}
            </span>
            <span className="text-sm font-black text-[#002b59] dark:text-blue-100 block mt-0.5">
              {fmtRaw(spentForeign, 2)} {trip.currency}
            </span>
            <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
              ≈ {fmtRaw(spentPrimary, 0)} {t('currency.sar') || 'ر.س'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/30">
            <span className="text-[9px] font-black text-slate-400 block tracking-wider uppercase">
              {t('budget.limit') || 'الميزانية'}
            </span>
            <span className="text-sm font-black text-[#002b59] dark:text-blue-100 block mt-0.5">
              {fmt(trip.limit)} {trip.currency}
            </span>
            <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
              ≈ {fmtRaw(limitPrimary, 0)} {t('currency.sar') || 'ر.س'}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-slate-400">{t('travel.progress') || 'نسبة الاستهلاك'}</span>
            <span className={isDanger ? "text-rose-500 font-black" : isWarning ? "text-amber-500 font-black" : "text-green-500 font-black"}>
              {fmtRaw(pct, 1)}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div 
              style={{ width: `${pct}%` }}
              className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                isDanger ? 'from-rose-500 to-pink-600' : isWarning ? 'from-amber-400 to-orange-500' : 'from-emerald-400 to-teal-500'
              }`}
            ></div>
          </div>
        </div>

        {/* Expandable detailed section */}
        {isSelected && (
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="pt-4 border-t border-slate-50 dark:border-white/5 space-y-4 animate-in slide-in-from-top-4 duration-300">
            {trip.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/20 p-3 rounded-2xl">
                💡 {trip.description}
              </p>
            )}

            {/* Live Travel & Weather Forecast Hub */}
            <div className="p-4 rounded-3xl bg-white/40 dark:bg-[#002b59]/10 backdrop-blur-xl border border-white/40 dark:border-white/5 shadow-2xl space-y-3 relative overflow-hidden group">
              {/* Decorative Background Blur */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-700"></div>
              
              <div className="flex justify-between items-center relative z-10">
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs text-blue-500 animate-pulse">partly_cloudy_day</span>
                  {t('travel.forecast.title') || 'مرافئ الطقس الحي ومعلومات السفر'}
                </h4>
                <div className="flex items-center gap-1">
                  {forecastLoading && !forecastData ? (
                    <span className="text-[8px] text-blue-500 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                      {t('travel.forecast.loading') || 'جاري التحميل...'}
                    </span>
                  ) : forecastData && forecastData.isOffline ? (
                    <span className="text-[8px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      ⚠️ {t('travel.forecast.offlineFallback') || 'الذاكرة المحلية'}
                    </span>
                  ) : forecastData ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      <span className="text-[8px] text-emerald-500 font-bold">{t('travel.forecast.liveBadge') || 'مباشر'}</span>
                    </>
                  ) : null}
                </div>
              </div>

              {forecastLoading && !forecastData ? (
                <div className="flex items-center justify-center py-6 gap-2">
                  <div className="w-5 h-5 rounded-full border-2 border-indigo-500/20 border-t-indigo-600 animate-spin"></div>
                  <span className="text-xs text-slate-400 font-bold">{t('travel.forecast.loading') || 'جاري استدعاء البيانات الحية...'}</span>
                </div>
              ) : forecastData ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                  {/* Weather Widget */}
                  {(() => {
                    const weather = getWeatherInfo(forecastData.weatherCode, t);
                    return (
                      <div className={`p-3 rounded-2xl bg-gradient-to-br ${weather.color} text-white shadow-lg space-y-2 relative overflow-hidden`}>
                        <div className="absolute -right-3 -top-3 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
                        <div className="flex justify-between items-center">
                          <span className="material-symbols-outlined text-3xl opacity-90 drop-shadow">{weather.icon}</span>
                          <span className="text-2xl font-black tracking-tighter drop-shadow">{forecastData.temp}°C</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold opacity-80 block">{t('travel.forecast.weather') || 'حالة الطقس بالعاصمة'}</span>
                          <span className="text-xs font-black drop-shadow block mt-0.5">{weather.text}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Country Info Widget */}
                  <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-white/50 dark:border-white/5 flex gap-3 items-center">
                    {forecastData.flag && (
                      <img 
                        src={forecastData.flag} 
                        alt={forecastData.countryName} 
                        className="w-12 h-9 object-cover rounded-lg shadow-md border border-slate-200 dark:border-slate-800"
                      />
                    )}
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <span className="text-[9px] font-black text-slate-400 block tracking-wider uppercase">{forecastData.countryName}</span>
                      <span className="text-xs font-black text-[#002b59] dark:text-blue-100 block truncate">
                        🏛️ {forecastData.capital || t('travel.forecast.noCapital')}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block truncate">
                        🗣️ {forecastData.languages}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400 font-bold bg-slate-50/50 dark:bg-slate-800/10 rounded-2xl border border-dashed border-slate-100 dark:border-white/5">
                  ⚠️ {t('travel.forecast.offline') || 'البيانات الحية غير متوفرة حالياً (Silent Fallback)'}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(trip)}
                className="flex-1 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-[#002b59] dark:text-blue-100 font-black text-[10px] hover:bg-slate-100 transition-all flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                {t('action.edit')}
              </button>
              <button
                onClick={() => onToggleActive(trip)}
                className="flex-1 py-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-black text-[10px] hover:bg-indigo-50 transition-all flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">
                  {trip.isActive ? 'archive' : 'unarchive'}
                </span>
                {trip.isActive ? (t('action.archive') || 'أرشفة') : (t('action.activate') || 'تنشيط')}
              </button>
              <button
                onClick={() => onDelete(trip.id)}
                className="w-10 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 flex items-center justify-center active:scale-95 transition-all"
                title={t('action.delete')}
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">delete</span>
              </button>
            </div>

            {/* Transactions Linked list */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                🧾 {t('travel.transactions') || 'المعاملات المرتبطة بالرحلة'} ({txs.length})
              </h4>
              {txs.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 font-bold bg-slate-50/50 dark:bg-slate-800/10 rounded-2xl border border-dashed border-slate-100 dark:border-white/5">
                  {t('travel.noTransactions') || 'لا توجد معاملات مرتبطة بهذه الرحلة بعد'}
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {txs.map((tx: Transaction) => (
                    <div key={tx.id} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/20">
                      <div>
                        <span className="text-xs font-black text-[#002b59] dark:text-blue-100 block">
                          {tx.description}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold">
                          {tx.category ? t(tx.category) : t('travel.splitTransaction') || 'معاملة مقسمة'} • {new Date(tx.date).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                        - {fmt(tx.amount)} {t('currency.sar') || 'ر.س'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
