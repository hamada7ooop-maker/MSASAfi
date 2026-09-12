import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { db } from '@/core/db/core';
import { toast, confirmSheet } from '../../../toast';
import { checkMilestone, triggerCoinAnimation } from '../../../core/loyalty';
import { silentFail, sanitizeNumericInput } from '../../../core/utils';
import type { Transaction, Trip } from '@/types';

const LOCAL_FALLBACKS: Record<string, {
  flag: string;
  capital: string;
  languages: string;
  temp: number;
  weatherCode: number;
  countryName: string;
  latlng: [number, number];
  countryCode: string;
}> = {
  'japan': {
    flag: 'https://flagcdn.com/w320/jp.png',
    capital: 'طوكيو (Tokyo)',
    languages: 'اليابانية (Japanese)',
    temp: 18,
    weatherCode: 1,
    countryName: 'اليابان (Japan)',
    latlng: [35.6762, 139.6503],
    countryCode: 'jp'
  },
  'united arab emirates': {
    flag: 'https://flagcdn.com/w320/ae.png',
    capital: 'أبوظبي (Abu Dhabi)',
    languages: 'العربية (Arabic)',
    temp: 32,
    weatherCode: 0,
    countryName: 'الإمارات العربية المتحدة (UAE)',
    latlng: [25.2048, 55.2708],
    countryCode: 'ae'
  },
  'united kingdom': {
    flag: 'https://flagcdn.com/w320/gb.png',
    capital: 'لندن (London)',
    languages: 'الإنجليزية (English)',
    temp: 14,
    weatherCode: 51,
    countryName: 'المملكة المتحدة (UK)',
    latlng: [51.5074, -0.1278],
    countryCode: 'gb'
  },
  'france': {
    flag: 'https://flagcdn.com/w320/fr.png',
    capital: 'باريس (Paris)',
    languages: 'الفرنسية (French)',
    temp: 16,
    weatherCode: 2,
    countryName: 'فرنسا (France)',
    latlng: [48.8566, 2.3522],
    countryCode: 'fr'
  },
  'saudi arabia': {
    flag: 'https://flagcdn.com/w320/sa.png',
    capital: 'الرياض (Riyadh)',
    languages: 'العربية (Arabic)',
    temp: 30,
    weatherCode: 0,
    countryName: 'المملكة العربية السعودية (KSA)',
    latlng: [24.7136, 46.6753],
    countryCode: 'sa'
  },
  'turkey': {
    flag: 'https://flagcdn.com/w320/tr.png',
    capital: 'أنقرة (Ankara)',
    languages: 'التركية (Turkish)',
    temp: 20,
    weatherCode: 1,
    countryName: 'تركيا (Turkey)',
    latlng: [41.0082, 28.9784],
    countryCode: 'tr'
  },
  'egypt': {
    flag: 'https://flagcdn.com/w320/eg.png',
    capital: 'القاهرة (Cairo)',
    languages: 'العربية (Arabic)',
    temp: 26,
    weatherCode: 0,
    countryName: 'جمهورية مصر العربية (Egypt)',
    latlng: [30.0444, 31.2357],
    countryCode: 'eg'
  },
  'malaysia': {
    flag: 'https://flagcdn.com/w320/my.png',
    capital: 'كوالالمبور (Kuala Lumpur)',
    languages: 'الملايو (Malay)',
    temp: 28,
    weatherCode: 95,
    countryName: 'ماليزيا (Malaysia)',
    latlng: [3.1390, 101.6869],
    countryCode: 'my'
  },
  'indonesia': {
    flag: 'https://flagcdn.com/w320/id.png',
    capital: 'جاكرتا (Jakarta)',
    languages: 'الإندونيسية (Indonesian)',
    temp: 29,
    weatherCode: 95,
    countryName: 'إندونيسيا (Indonesia)',
    latlng: [-6.2088, 106.8456],
    countryCode: 'id'
  }
};

export function TravelBudget() {
  const { t } = useI18n();
  const { fmt, parseNum, fmtRaw } = useFormat();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripExpenses, setTripExpenses] = useState<Record<string, Transaction[]>>({});
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tripToEdit, setTripToEdit] = useState<Trip | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [limit, setLimit] = useState('');
  const [exchangeRate, setExchangeRate] = useState('4.0');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Weather & Country Live Data States
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastData, setForecastData] = useState<{
    flag: string;
    capital: string;
    languages: string;
    temp: number;
    weatherCode: number;
    countryName: string;
    isOffline?: boolean;
  } | null>(null);

  const forecastCacheRef = useRef<Record<string, {
    flag: string;
    capital: string;
    languages: string;
    temp: number;
    weatherCode: number;
    countryName: string;
    isOffline?: boolean;
  }>>({});

  const extractCountry = (nameStr: string): string => {
    const lowercase = nameStr.toLowerCase();
    if (lowercase.includes('يابان') || lowercase.includes('japan')) return 'Japan';
    if (lowercase.includes('دبي') || lowercase.includes('امارات') || lowercase.includes('dubai') || lowercase.includes('uae')) return 'United Arab Emirates';
    if (lowercase.includes('لندن') || lowercase.includes('بريطانيا') || lowercase.includes('london') || lowercase.includes('uk')) return 'United Kingdom';
    if (lowercase.includes('باريس') || lowercase.includes('فرنسا') || lowercase.includes('paris') || lowercase.includes('france')) return 'France';
    if (lowercase.includes('سعودي') || lowercase.includes('جدة') || lowercase.includes('رياض') || lowercase.includes('saudi') || lowercase.includes('ksa')) return 'Saudi Arabia';
    if (lowercase.includes('تركيا') || lowercase.includes('اسطنبول') || lowercase.includes('turkey') || lowercase.includes('istanbul')) return 'Turkey';
    if (lowercase.includes('مصر') || lowercase.includes('قاهرة') || lowercase.includes('egypt') || lowercase.includes('cairo')) return 'Egypt';
    if (lowercase.includes('ماليزيا') || lowercase.includes('malaysia')) return 'Malaysia';
    if (lowercase.includes('اندونيسيا') || lowercase.includes('indonesia')) return 'Indonesia';
    
    return nameStr.replace(/(رحلة|سفر|صيف|شتاء|إلى|الي|سياحة|travel|trip|to|summer|winter)/gi, '').trim();
  };

  const getWeatherInfo = (code: number) => {
    if (code === 0) return { icon: 'wb_sunny', text: t('travel.weather.sunny') || 'سماء صافية ☀️', color: 'from-amber-400 to-orange-500' };
    if (code >= 1 && code <= 3) return { icon: 'partly_cloudy_day', text: t('travel.weather.cloudy') || 'غائم جزئياً 🌤️', color: 'from-slate-400 to-blue-400' };
    if (code >= 45 && code <= 48) return { icon: 'foggy', text: t('travel.weather.foggy') || 'ضباب كثيف 🌫️', color: 'from-slate-400 to-slate-500' };
    if (code >= 51 && code <= 67) return { icon: 'rainy', text: t('travel.weather.rainy') || 'رذاذ/أمطار خفيفة 🌧️', color: 'from-blue-400 to-indigo-500' };
    if (code >= 71 && code <= 77) return { icon: 'ac_unit', text: t('travel.weather.snowy') || 'تساقط ثلوج ❄️', color: 'from-sky-300 to-blue-400' };
    if (code >= 80 && code <= 82) return { icon: 'rainy_heavy', text: t('travel.weather.rainHeavy') || 'زخات مطرية ⛈️', color: 'from-indigo-500 to-purple-600' };
    if (code >= 95) return { icon: 'thunderstorm', text: t('travel.weather.stormy') || 'عواصف رعدية 🌩️', color: 'from-slate-800 to-purple-950' };
    return { icon: 'device_thermostat', text: t('travel.weather.moderate') || 'طقس معتدل 🌡️', color: 'from-teal-400 to-emerald-500' };
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedTripId = selectedTrip?.id;
  const selectedTripName = selectedTrip?.name;

  useEffect(() => {
    if (!selectedTripId || !selectedTripName) {
      setForecastData(null);
      setForecastLoading(false);
      return;
    }
    
    const countryQuery = extractCountry(selectedTripName);
    const cacheKey = countryQuery.toLowerCase();

    // 1. If cached, use it immediately with zero delay
    if (forecastCacheRef.current[cacheKey]) {
      setForecastData(forecastCacheRef.current[cacheKey]);
      setForecastLoading(false);
      return;
    }

    // 2. Pre-populate with matching local fallback to prevent layout shifts/flickering
    const matchedKey = Object.keys(LOCAL_FALLBACKS).find(k => cacheKey.includes(k) || k.includes(cacheKey));
    const fallback = matchedKey ? LOCAL_FALLBACKS[matchedKey] : null;

    if (fallback) {
      setForecastData({ ...fallback, isOffline: true });
    }

    const controller = new AbortController();
    let isCancelled = false;

    const fetchForecast = async () => {
      setForecastLoading(true);
      try {
        let lat: number;
        let lng: number;
        let flag = fallback?.flag || '';
        let capital = fallback?.capital || '';
        let languages = fallback?.languages || '';
        let commonName = fallback?.countryName || selectedTripName;

        if (fallback?.latlng) {
          [lat, lng] = fallback.latlng;
        } else {
          // Open-Meteo Geocoding API with full CORS support
          const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(countryQuery)}&count=1&language=en&format=json`, {
            signal: controller.signal
          });
          if (!geoRes.ok) throw new Error('Geocoding failed');
          const geoData = await geoRes.json();
          const place = geoData?.results?.[0];
          if (!place) throw new Error('Location not found');
          lat = place.latitude;
          lng = place.longitude;
          if (place.country_code) {
            flag = `https://flagcdn.com/w320/${place.country_code.toLowerCase()}.png`;
          }
          commonName = place.country || place.name || selectedTripName;
          capital = place.name || '';
          languages = t('travel.forecast.unknownLang') || 'متعددة';
        }

        // Fetch live weather from Open-Meteo (open CORS)
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`, {
          signal: controller.signal
        });
        if (!weatherRes.ok) throw new Error('Weather not available');
        const weatherInfo = await weatherRes.json();
        
        if (!isCancelled && !controller.signal.aborted) {
          const liveData = {
            flag: flag || 'https://flagcdn.com/w320/un.png',
            capital: capital || t('travel.forecast.noCapital') || 'العاصمة',
            languages: languages || t('travel.forecast.unknownLang') || 'غير محدد',
            temp: Math.round(weatherInfo?.current_weather?.temperature ?? 20),
            weatherCode: weatherInfo?.current_weather?.weathercode || 0,
            countryName: commonName,
            isOffline: false
          };
          forecastCacheRef.current[cacheKey] = liveData;
          setForecastData(liveData);
          
          // Award Loyalty 2.0 milestone
          checkMilestone('FIRST_WEATHER');
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        silentFail('[TravelForecast] Failed to load travel info')(err);
        
        if (!isCancelled && !controller.signal.aborted) {
          if (fallback) {
            const fbData = { ...fallback, isOffline: true };
            forecastCacheRef.current[cacheKey] = fbData;
            setForecastData(fbData);
          } else {
            const genericData = {
              flag: 'https://flagcdn.com/w320/un.png',
              capital: t('travel.forecast.noCapital') || 'غير محدد',
              languages: t('travel.forecast.unknownLang') || 'غير محدد',
              temp: 22,
              weatherCode: 99,
              countryName: selectedTripName,
              isOffline: true
            };
            forecastCacheRef.current[cacheKey] = genericData;
            setForecastData(genericData);
          }
        }
      } finally {
        if (!isCancelled && !controller.signal.aborted) {
          setForecastLoading(false);
        }
      }
    };
    
    fetchForecast();
    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [selectedTripId, selectedTripName, t]);

  const loadData = async () => {
    try {
      const allTrips = await db.trips.toArray();
      setTrips(allTrips);

      // Fetch all transactions linked to these trips
      const expenses = await db.transactions
        .filter(tx => tx.tripId !== undefined && tx.tripId !== null)
        .toArray();

      const grouped: Record<string, Transaction[]> = {};
      allTrips.forEach(tr => {
        grouped[tr.id] = expenses.filter(tx => tx.tripId === tr.id);
      });
      setTripExpenses(grouped);
    } catch (e) {
      silentFail('[TravelBudget] Failed to load data')(e);
    }
  };

  const handleAddNew = () => {
    setTripToEdit(null);
    setName('');
    setCurrency('EUR');
    setLimit('');
    setExchangeRate('4.0');
    
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(nextWeek);
    setDescription('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleEdit = (trip: Trip) => {
    setTripToEdit(trip);
    setName(trip.name);
    setCurrency(trip.currency);
    setLimit(trip.limit.toString());
    setExchangeRate(trip.exchangeRate.toString());
    setStartDate(trip.startDate);
    setEndDate(trip.endDate);
    setDescription(trip.description || '');
    setIsActive(trip.isActive);
    setIsModalOpen(true);
  };

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
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      silentFail('[TravelBudget] Failed to save trip')(err);
      toast(t('travel.errSaving') || 'حدث خطأ أثناء الحفظ', 'error');
    }
  };

  const handleDelete = (tripId: string) => {
    confirmSheet(
      t('travel.deleteConfirm') || 'هل أنت متأكد من حذف هذه الرحلة؟ لن يتم حذف المعاملات المرتبطة بها ولكن سيتم فك ارتباطها.',
      async () => {
        try {
          await db.trips.delete(tripId);
        
        // Unlink associated transactions safely
        const txs = await db.transactions.filter(tx => tx.tripId === tripId).toArray();
        for (const tx of txs) {
          await db.transactions.update(tx.id, { tripId: undefined });
        }
        
        toast(t('txn.deleted') || 'تم الحذف بنجاح', 'success');
        setSelectedTrip(null);
        loadData();
      } catch (err) {
        silentFail('[TravelBudget] Failed to delete trip')(err);
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
          <span className="material-symbols-outlined text-xl">add</span>
        </button>
      </div>

      {/* Trips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trips.map(trip => {
          const txs = tripExpenses[trip.id] || [];
          const spentPrimary = txs.reduce((sum, tx) => sum + (parseNum(tx.amount) || 0), 0);
          const spentForeign = spentPrimary / (parseNum(trip.exchangeRate) || 1);
          const limitPrimary = (parseNum(trip.limit) || 0) * (parseNum(trip.exchangeRate) || 1);
          const pct = limitPrimary > 0 ? Math.min(100, Math.max(0, (spentPrimary / limitPrimary) * 100)) : 0;
          
          const isWarning = pct >= 85 && pct < 100;
          const isDanger = pct >= 100;

          return (
            <div 
              key={trip.id}
              onClick={() => setSelectedTrip(selectedTrip?.id === trip.id ? null : trip)}
              className={`fin-card overflow-hidden cursor-pointer transition-all duration-300 relative ${
                selectedTrip?.id === trip.id ? 'ring-2 ring-blue-500 scale-[1.01]' : 'hover:scale-[1.005]'
              }`}
            >
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
                {selectedTrip?.id === trip.id && (
                  <div 
                    onClick={(e) => e.stopPropagation()} 
                    className="pt-4 border-t border-slate-50 dark:border-white/5 space-y-4 animate-in slide-in-from-top-4 duration-300"
                  >
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
                            const weather = getWeatherInfo(forecastData.weatherCode);
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
                        onClick={() => handleEdit(trip)}
                        className="flex-1 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-[#002b59] dark:text-blue-100 font-black text-[10px] hover:bg-slate-100 transition-all flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                        {t('action.edit')}
                      </button>
                      <button
                        onClick={() => handleToggleActive(trip)}
                        className="flex-1 py-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-black text-[10px] hover:bg-indigo-50 transition-all flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {trip.isActive ? 'archive' : 'unarchive'}
                        </span>
                        {trip.isActive ? (t('action.archive') || 'أرشفة') : (t('action.activate') || 'تنشيط')}
                      </button>
                      <button
                        onClick={() => handleDelete(trip.id)}
                        className="w-10 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 flex items-center justify-center active:scale-95 transition-all"
                        title={t('action.delete')}
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
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
        })}

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
            <button
              onClick={handleAddNew}
              className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition-all inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">add</span>
              {t('travel.createTrip') || 'إضافة رحلتك الأولى'}
            </button>
          </div>
        )}
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100000] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
          <div 
            className="w-full max-w-md bg-white dark:bg-[#181a1d] rounded-t-[3rem] rounded-b-[2rem] p-6 space-y-6 shadow-2xl border border-slate-100 dark:border-white/5 animate-in slide-in-from-bottom-24 duration-300 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
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
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
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
                  onClick={() => setIsModalOpen(false)}
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
      )}
    </div>
  );
}
