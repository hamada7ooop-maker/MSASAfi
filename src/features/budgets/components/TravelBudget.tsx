import React, { useState, useEffect } from 'react';
import { useI18n } from '../../../i18n/index';
import { db } from '@/core/db/core';
import { toast, confirmSheet } from '../../../toast';
import { silentFail } from '../../../core/utils';
import type { Trip } from '@/types';
import { TripFormModal } from './TripFormModal';
import { TripCard } from './TripCard';
import { useTravelForecast } from '../hooks/useTravelForecast';

/**
 * ميزانية السفر — the orchestrator.
 *
 * Directive 19 — decomposition continuation: this file peaked at 923 lines,
 * shed the form modal first, and now gives up the rest — the cross-currency
 * math (utils/tripMetrics), the weather vocabulary (utils/travelWeather),
 * the live forecast effect (hooks/useTravelForecast) and the card itself
 * (TripCard). tests/unit/travelBudget.test.tsx was written before the first
 * extraction and pins the currency conversion these pieces must keep
 * producing; the same suite guards every split since.
 */
export function TravelBudget() {
  const { t } = useI18n();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripExpenses, setTripExpenses] = useState<Record<string, import('@/types').Transaction[]>>({});
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tripToEdit, setTripToEdit] = useState<Trip | null>(null);

  // Live travel & weather forecast for the selected trip (cache-first).
  const { forecastData, forecastLoading } = useTravelForecast(selectedTrip);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allTrips = await db.trips.toArray();
      setTrips(allTrips);

      // Fetch all transactions linked to these trips.
      //
      // Deliberately `toArray()` then filter in JS, NOT `db.transactions
      // .filter(...)`. Dexie's `Table.filter` walks a cursor, and the
      // encryption middleware cannot decrypt inside the cursor protocol
      // (WebCrypto is async, a cursor's `value` getter is not). Rows arriving
      // that way keep their envelope, so `tx.amount` reads as undefined and
      // every trip shows zero spending for any user with a PIN set.
      const expenses = (await db.transactions.toArray())
        .filter(tx => tx.tripId !== undefined && tx.tripId !== null);

      const grouped: Record<string, import('@/types').Transaction[]> = {};
      allTrips.forEach(tr => {
        grouped[tr.id] = expenses.filter(tx => tx.tripId === tr.id);
      });
      setTripExpenses(grouped);
    } catch (e) {
      silentFail('[TravelBudget] Failed to load data')(e);
    }
  };

  // These now only express intent. Prefilling and resetting the form belongs
  // to TripFormModal, which keys off `tripToEdit` when it opens -- so the two
  // cannot drift out of step the way two copies of the same prefill would.
  const handleAddNew = () => {
    setTripToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (trip: Trip) => {
    setTripToEdit(trip);
    setIsModalOpen(true);
  };

  const handleDelete = (tripId: string) => {
    confirmSheet(
      t('travel.deleteConfirm') || 'هل أنت متأكد من حذف هذه الرحلة؟ لن يتم حذف المعاملات المرتبطة بها ولكن سيتم فك ارتباطها.',
      async () => {
        try {
          await db.trips.delete(tripId);

        // Unlink associated transactions safely
        // Same reason as in loadData: cursor reads skip decryption.
        const txs = (await db.transactions.toArray()).filter(tx => tx.tripId === tripId);
        for (const tx of txs) {
          await db.transactions.update(tx.id, { tripId: undefined });
        }

        toast(t('txn.deleted') || 'تم الحذف بنجاح', 'success');
        setSelectedTrip(null);
        loadData();
      } catch (err) {
        // Directive 15 (silentFail audit): surfaced — a failed delete left the
        // trip on screen with no explanation, while the success toast for
        // deletes made users assume it had worked.
        silentFail('[TravelBudget] Failed to delete trip')(err);
        toast(t('travel.errDelete') || 'حدث خطأ أثناء الحذف', 'error');
      }
    },
    t('action.delete') || 'حذف',
    t('action.cancel') || 'إلغاء'
  );
  };

  const handleToggleActive = async (trip: Trip) => {
    try {
      await db.trips.update(trip.id, { isActive: !trip.isActive });
      toast(trip.isActive ? (t('travel.tripArchived') || 'تم أرشفة الرحلة بنجاح') : (t('travel.tripActivated') || 'تم تنشيط الرحلة بنجاح'));
      loadData();
      if (selectedTrip?.id === trip.id) {
        setSelectedTrip({ ...trip, isActive: !trip.isActive });
      }
    } catch (err) {
      silentFail('[TravelBudget] Failed to toggle trip state')(err);
    }
  };

  return (
    <div className="p-5 space-y-6 pb-32 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-center px-1">
        <div className="space-y-1">
          <h2 className="text-3xl text-premium-header text-[var(--color-primary)] dark:text-blue-100 font-black">
            ✈️ {t('travel.title') || 'ميزانية السفر'}
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-70">
              {t('travel.subtitle') || 'إدارة نفقات الرحلات بعملات متعددة'}
            </p>
          </div>
        </div>

        <button
          onClick={handleAddNew}
          className="w-10 h-10 rounded-2xl flex items-center justify-center bg-blue-600 text-white shadow-lg shadow-blue-500/30 transition-all active:scale-95"
          title={t('action.add')}
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">add</span>
        </button>
      </div>

      {/* Trips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trips.map(trip => (
          <TripCard
            key={trip.id}
            trip={trip}
            txs={tripExpenses[trip.id] || []}
            isSelected={selectedTrip?.id === trip.id}
            forecastData={forecastData}
            forecastLoading={forecastLoading}
            onSelect={setSelectedTrip}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
          />
        ))}

        {trips.length === 0 && (
          <div className="col-span-1 md:col-span-2 py-20 text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-4xl text-slate-400">flight_takeoff</span>
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">
              {t('travel.noTrips') || 'لا توجد رحلات سفر'}
            </h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">
              {t('travel.noTripsSub') || 'خطط لرحلاتك القادمة وتحكم بنفقات السفر بعملات متعددة بكل سهولة!'}
            </p>
            <button aria-label={t('action.add') || 'Add'}
              onClick={handleAddNew}
              className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition-all inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">add</span>
              {t('travel.createTrip') || 'إضافة رحلتك الأولى'}
            </button>
          </div>
        )}
      </div>

      {/* Modal Add/Edit */}
      <TripFormModal
        open={isModalOpen}
        tripToEdit={tripToEdit}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadData}
      />
    </div>
  );
}
