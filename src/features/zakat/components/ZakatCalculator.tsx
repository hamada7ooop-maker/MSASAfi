import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { useSettingsStore } from '../../../store/settingsStore';
import { db as DB } from '@/core/db/core';
import { toast } from '../../../toast';
import { checkMilestone } from '../../../core/loyalty';
import { silentFail, parseNum, sanitizeNumericInput } from '../../../core/utils';

interface ZakatHistory {
  date: string;
  amount: number;
  assets: Record<string, unknown>;
  method: 'gold' | 'silver';
}

interface AnimatedNumberProps {
  value: number;
  formatter: (val: number) => string;
  baseCurrency: string;
}

function AnimatedNumber({ value, formatter, baseCurrency }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(0);

  useEffect(() => {
    const start = prevValueRef.current;
    const end = value;
    prevValueRef.current = value;
    if (start === end) return;

    setIsAnimating(true);
    const duration = 1000; // ms
    const startTime = performance.now();

    let animationFrameId: number;

    const updateNumber = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function: easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const current = start + (end - start) * easeProgress;
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateNumber);
      } else {
        setDisplayValue(end);
        setIsAnimating(false);
      }
    };

    animationFrameId = requestAnimationFrame(updateNumber);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value]);

  const formatted = formatter(displayValue).replace(/[^\d.,]/g, '').trim();

  return (
    <div className={`relative flex items-baseline justify-center gap-2 transition-all duration-500 ${isAnimating ? 'scale-105 filter drop-shadow-[0_0_20px_rgba(253,224,71,0.8)]' : ''}`}>
      <span className="font-black text-5xl md:text-7xl tabular-nums tracking-tighter text-white">
        {formatted}
      </span>
      <span className="font-bold text-lg opacity-90 text-blue-200 shrink-0">{baseCurrency}</span>
      
      {/* 🪙 Floating coins reward sparkles when animating */}
      {isAnimating && (
        <span className="absolute -top-3 -right-6 animate-bounce text-amber-300 text-lg select-none pointer-events-none">
          🪙
        </span>
      )}
    </div>
  );
}

export function ZakatCalculator() {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const baseCurrency = useSettingsStore(s => s.baseCurrency);
  const unlockedItems = useSettingsStore(s => s.unlockedItems || []);
  
  const [activeTab, setActiveTab] = useState<'zakat' | 'history'>('zakat');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const isPro = unlockedItems.includes('perk:zakat-pro');

  const assetMeta: Record<string, { label: string; icon: string; color: string; bg: string }> = {
    cash: { label: t('zakat.asset.cash'), icon: 'account_balance', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    gold: { label: t('zakat.asset.gold'), icon: 'diamond', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    invest: { label: t('zakat.asset.invest'), icon: 'trending_up', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    trade: { label: t('zakat.asset.trade'), icon: 'storefront', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    livestock: { label: t('zakat.asset.livestock'), icon: 'pets', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    crops: { label: t('zakat.asset.crops'), icon: 'eco', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
    realestate: { label: t('zakat.asset.realestate'), icon: 'apartment', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' }
  };

  // Zakat State
  const [goldPrice, setGoldPrice] = useState('500');
  const [silverPrice, setSilverPrice] = useState('9');
  const [nisabMethod, setNisabMethod] = useState<'gold' | 'silver'>('gold');
  const [isSyncing, setIsSyncing] = useState(false);
  const [history, setHistory] = useState<ZakatHistory[]>([]);
  
  // Gold Valuation State
  const [goldCalcType, setGoldCalcType] = useState<'direct' | 'smart'>('direct');
  const [goldItems, setGoldItems] = useState<{ id: string; label: string; weight: string; caliber: number }[]>([
    { id: '1', label: '', weight: '', caliber: 21 }
  ]);
  const [showGoldModal, setShowGoldModal] = useState(false);

  // Modal Temp states
  const [tempGoldCalcType, setTempGoldCalcType] = useState<'direct' | 'smart'>('direct');
  const [tempGoldItems, setTempGoldItems] = useState<typeof goldItems>([]);
  const [tempDirectGoldVal, setTempDirectGoldVal] = useState('');

  const [assets, setAssets] = useState({
    cash: '',
    gold: '',
    invest: '',
    trade: '',
    livestock: '',
    crops: '',
    realestate: ''
  });

  const syncPrices = async () => {
    setIsSyncing(true);
    let success = false;

    // 1. محاولة جلب الأسعار بشكل موحد وخالٍ من المفاتيح باستخدام FXRatesAPI
    try {
      const res = await fetch('https://api.fxratesapi.com/latest');
      if (!res.ok) throw new Error('FXRatesAPI failed');
      
      const data = await res.json();
      if (data && data.success && data.rates) {
        const xau = data.rates.XAU; // أونصة لكل 1 دولار
        const xag = data.rates.XAG; // أونصة لكل 1 دولار
        const targetRate = data.rates[baseCurrency] || 1;

        if (xau > 0 && xag > 0) {
          // التحويل إلى دولار للأونصة
          const goldOunceUsd = 1 / xau;
          const silverOunceUsd = 1 / xag;

          // التحويل إلى دولار للجرام (أونصة تروي = 31.1034768 جرام)
          const goldGramUsd = goldOunceUsd / 31.1034768;
          const silverGramUsd = silverOunceUsd / 31.1034768;

          // التحويل إلى العملة المستهدفة
          const goldPriceGram = goldGramUsd * targetRate;
          const silverPriceGram = silverGramUsd * targetRate;

          const goldValStr = goldPriceGram.toFixed(2);
          const silverValStr = silverPriceGram.toFixed(2);

          setGoldPrice(goldValStr);
          setSilverPrice(silverValStr);

          await DB.setSetting('lastGoldPrice', goldValStr);
          await DB.setSetting('lastSilverPrice', silverValStr);

          toast(t('settings.msg.saved') || 'Synced Successfully', 'success');
          success = true;
        }
      }
    } catch (e: unknown) {
      silentFail('[Zakat] FXRatesAPI sync failed, trying fallback')(e);
    }

    // 2. الاسترجاع البديل (Fallback) باستخدام GoldAPI.io إذا تم تكوين مفتاح للعميل وفشل الطلب الموحد
    if (!success) {
      try {
        const apiKey = (await DB.getSetting('goldApiKey')) as string | undefined;
        if (!apiKey) {
          toast(t('market.error.fetch') || 'Failed to fetch live prices', 'error');
          setIsSyncing(false);
          return;
        }

        const GOLD_API_BASE = import.meta.env.DEV ? '/api/gold' : 'https://www.goldapi.io/api';
        
        // جلب أسعار الذهب والفضة معاً
        const [resGold, resSilver] = await Promise.all([
          fetch(`${GOLD_API_BASE}/XAU/${baseCurrency}`, {
            headers: { 'x-access-token': apiKey, 'Content-Type': 'application/json' }
          }),
          fetch(`${GOLD_API_BASE}/XAG/${baseCurrency}`, {
            headers: { 'x-access-token': apiKey, 'Content-Type': 'application/json' }
          })
        ]);

        if (!resGold.ok || !resSilver.ok) throw new Error('GoldAPI separate fetch failed');

        const dataGold = await resGold.json();
        const dataSilver = await resSilver.json();

        const goldGram = dataGold.price_gram_24k || (dataGold.price ? dataGold.price / 31.1034768 : 0);
        const silverGram = dataSilver.price_gram_24k || (dataSilver.price ? dataSilver.price / 31.1034768 : 0);

        if (goldGram > 0 && silverGram > 0) {
          const goldValStr = goldGram.toFixed(2);
          const silverValStr = silverGram.toFixed(2);

          setGoldPrice(goldValStr);
          setSilverPrice(silverValStr);

          await DB.setSetting('lastGoldPrice', goldValStr);
          await DB.setSetting('lastSilverPrice', silverValStr);

          toast(t('settings.msg.saved') || 'Synced Successfully', 'success');
        } else {
          throw new Error('Invalid fallback data');
        }
      } catch (err) {
        silentFail('[Zakat] Fallback failed')(err);
        toast(t('market.error.fetch') || 'Failed to fetch live prices', 'error');
      }
    }

    setIsSyncing(false);
  };

  const loadHistory = async () => {
    const saved = (await DB.getSetting('zakatHistory')) as string | undefined;
    if (saved) setHistory(JSON.parse(saved));

    const savedGold = (await DB.getSetting('lastGoldPrice')) as string | undefined;
    const savedSilver = (await DB.getSetting('lastSilverPrice')) as string | undefined;

    if (savedGold) setGoldPrice(savedGold);
    if (savedSilver) setSilverPrice(savedSilver);

    // Load dynamic gold items & settings
    const savedGoldItems = (await DB.getSetting('zakatGoldItems')) as string | undefined;
    if (savedGoldItems) setGoldItems(JSON.parse(savedGoldItems));

    const savedGoldCalcType = await DB.getSetting('zakatGoldCalcType');
    if (savedGoldCalcType) setGoldCalcType(savedGoldCalcType as 'direct' | 'smart');

    const savedAssets = (await DB.getSetting('zakatAssets')) as string | undefined;
    if (savedAssets) setAssets(JSON.parse(savedAssets));

    // إذا كانت هذه هي المرة الأولى لفتح الحاسبة ولم تكن هناك قيم محفوظة، نقوم بالمزامنة تلقائياً بالخلفية
    if (!savedGold || !savedSilver) {
      setTimeout(() => {
        syncPrices();
      }, 600); // تأخير بسيط لضمان سلاسة الواجهة وتحميل المكون بالكامل
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAssetChange = (key: keyof typeof assets, value: string) => {
    const sanitized = sanitizeNumericInput(value);
    setAssets(prev => {
      const updated = { ...prev, [key]: sanitized };
      DB.setSetting('zakatAssets', JSON.stringify(updated));
      return updated;
    });
  };

  const openGoldModal = () => {
    setTempGoldCalcType(goldCalcType);
    setTempGoldItems(goldItems.map(item => ({ ...item })));
    setTempDirectGoldVal(assets.gold);
    setShowGoldModal(true);
  };

  const addTempGoldItem = () => {
    setTempGoldItems(prev => [
      ...prev,
      { id: Date.now().toString(), label: '', weight: '', caliber: 21 }
    ]);
  };

  const deleteTempGoldItem = (id: string) => {
    setTempGoldItems(prev => prev.filter(item => item.id !== id));
  };

  const updateTempGoldItem = (id: string, key: 'label' | 'weight' | 'caliber', val: string | number) => {
    const finalVal = key === 'weight' ? sanitizeNumericInput(String(val)) : val;
    setTempGoldItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [key]: finalVal };
      }
      return item;
    }));
  };

  const applyGoldSmartCalc = async () => {
    setGoldItems(tempGoldItems);
    setGoldCalcType(tempGoldCalcType);
    await DB.setSetting('zakatGoldItems', JSON.stringify(tempGoldItems));
    await DB.setSetting('zakatGoldCalcType', tempGoldCalcType);

    // Compute the dynamic flat value to update parent state
    const currentGoldPriceNum = parseNum(goldPrice) || 500;
    const computedVal = tempGoldCalcType === 'smart'
      ? tempGoldItems.reduce((sum, item) => {
          const w = parseNum(item.weight) || 0;
          return sum + w * (item.caliber / 24) * currentGoldPriceNum;
        }, 0)
      : (parseNum(tempDirectGoldVal) || 0);

    setAssets(prev => {
      const updated = { 
        ...prev, 
        gold: tempGoldCalcType === 'smart' ? computedVal.toFixed(2) : tempDirectGoldVal 
      };
      DB.setSetting('zakatAssets', JSON.stringify(updated));
      return updated;
    });

    setShowGoldModal(false);
    toast(t('settings.msg.saved') || 'Saved Successfully', 'success');
  };

  const saveCalculation = async () => {
    let isDup = false;
    
    // منع تكرار العمليات بشكل متزامن وآمن من خلال دالة التحديث الذاتي للحالة
    setHistory(prev => {
      if (prev.length > 0) {
        const lastEntry = prev[0];
        const isDuplicate = lastEntry.amount === zakatAmount && 
          lastEntry.method === nisabMethod &&
          JSON.stringify(lastEntry.assets) === JSON.stringify(assets);
        
        if (isDuplicate) {
          isDup = true;
          return prev;
        }
      }

      const entry: ZakatHistory = {
        date: new Date().toISOString(),
        amount: zakatAmount,
        assets: { ...assets, gold: goldValueToUse.toFixed(2) },
        method: nisabMethod
      };
      
      const newHistory = [entry, ...prev].slice(0, 20);
      DB.setSetting('zakatHistory', JSON.stringify(newHistory));
      return newHistory;
    });

    if (isDup) {
      toast(t('zakat.alreadySaved') || 'This calculation is already saved in history!', 'warning');
      return;
    }
    
    // منح الإنجاز
    await checkMilestone('ZAKAT_PRO');
    toast(t('zakat.saveSuccess') || 'Calculation Saved & Milestone Achieved! 🕋', 'success');
  };

  // Calculations
  const currentGoldPrice = parseNum(goldPrice) || 500;
  const currentSilverPrice = parseNum(silverPrice) || 9;

  const goldValueToUse = goldCalcType === 'smart'
    ? goldItems.reduce((sum, item) => {
        const w = parseNum(item.weight) || 0;
        return sum + w * (item.caliber / 24) * currentGoldPrice;
      }, 0)
    : (parseNum(assets.gold) || 0);

  const totalAssets = Object.entries(assets).reduce((sum, [key, val]) => {
    if (key === 'gold') return sum + goldValueToUse;
    return sum + (parseNum(val as string) || 0);
  }, 0);
  
  const nisab = nisabMethod === 'gold' ? 85 * currentGoldPrice : 595 * currentSilverPrice;
  const isAboveNisab = totalAssets >= nisab;
  const zakatAmount = isAboveNisab ? totalAssets * 0.025 : 0;

  // Gold equivalent and helper calculations
  const totalEqWeight = goldItems.reduce((sum, item) => {
    const w = parseNum(item.weight) || 0;
    return sum + w * (item.caliber / 24);
  }, 0);
  
  // Temp Modal calculations
  const tempEqWeight = tempGoldItems.reduce((sum, item) => {
    const w = parseNum(item.weight) || 0;
    return sum + w * (item.caliber / 24);
  }, 0);
  const tempActualWeight = tempGoldItems.reduce((sum, item) => sum + (parseNum(item.weight) || 0), 0);
  const tempGoldVal = tempGoldCalcType === 'smart'
    ? tempEqWeight * currentGoldPrice
    : (parseNum(tempDirectGoldVal) || 0);

  const progressPct = Math.min((tempEqWeight / 85) * 100, 100);

  return (
    <div className="flex flex-col min-h-full bg-[#f8f9fa] dark:bg-[#121214] pb-32 relative animate-in fade-in duration-300">
      
      {/* Premium Tab Switcher */}
      <div className="px-2 py-4 sticky top-0 z-30 bg-white/80 dark:bg-[#121214]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 -mx-4 shadow-sm">
        <div className="flex p-1 bg-slate-100 dark:bg-[#1e2124] rounded-full max-w-md mx-auto shadow-inner border border-slate-200 dark:border-slate-800">
          <button 
            onClick={() => setActiveTab('zakat')} 
            className={`flex-1 py-2 rounded-full text-[10px] font-black transition-all duration-300 flex items-center justify-center gap-1.5 ${
              activeTab === 'zakat' ? 'bg-[#002b59] text-white shadow-md' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-sm">mosque</span>
            {t('zakat.tabZakat')}
          </button>
          <button 
            onClick={() => setActiveTab('history')} 
            className={`flex-1 py-2 rounded-full text-[10px] font-black transition-all duration-300 flex items-center justify-center gap-1.5 ${
              activeTab === 'history' ? 'bg-[#002b59] text-white shadow-md' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-sm">history</span>
            {t('zakat.history')}
          </button>
        </div>
      </div>

      <main className="flex-1 w-full max-w-3xl mx-auto py-6 flex flex-col gap-6 px-4">
        {activeTab === 'zakat' && (
          <>
            {/* Zakat Banner */}
            <section className="sticky top-[73px] z-20 rounded-3xl md:rounded-[2.5rem] p-5 md:p-8 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#002b59] to-blue-800 shadow-2xl shadow-blue-900/20 transition-all duration-300">
              <div className="absolute inset-0 bg-white/5 pointer-events-none"></div>
              
              <h2 className="font-bold text-sm mb-2 z-10 text-blue-200 uppercase tracking-widest">
                {t('zakat.totalDue')}
              </h2>
              
              <div className="flex items-baseline gap-2 z-10 text-white">
                <AnimatedNumber value={zakatAmount} formatter={fmt} baseCurrency={baseCurrency} />
              </div>
              
              {!isAboveNisab && totalAssets > 0 && (
                <p className="text-[10px] mt-4 z-10 px-4 py-1.5 rounded-full text-red-200 bg-red-900/40 backdrop-blur-md border border-red-500/30 font-bold animate-pulse">
                  {t('zakat.belowNisab')} ({fmt(nisab)})
                </p>
              )}
              {isAboveNisab && (
                 <button 
                  onClick={saveCalculation}
                  className="mt-6 z-10 px-6 py-2.5 rounded-full bg-emerald-500 text-white font-black text-xs shadow-lg active:scale-95 transition-all flex items-center gap-2"
                 >
                   <span className="material-symbols-outlined text-sm">save</span>
                   {t('zakat.save')}
                 </button>
              )}
            </section>

            {/* Nisab Selector */}
            <div className="bg-white dark:bg-[#1e2124] rounded-[2rem] p-2 flex border border-slate-200 dark:border-slate-800 shadow-sm">
              <button 
                onClick={() => setNisabMethod('gold')}
                className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${nisabMethod === 'gold' ? 'bg-amber-100 text-amber-900' : 'text-slate-400'}`}
              >
                <span className="material-symbols-outlined text-sm">diamond</span>
                {t('zakat.nisabGold')}
              </button>
              <button 
                onClick={() => isPro ? setNisabMethod('silver') : toast(t('shop.perk.zakatPro') + ' Required', 'error')}
                className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${nisabMethod === 'silver' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'} ${!isPro ? 'opacity-50' : ''}`}
              >
                <span className="material-symbols-outlined text-sm">token</span>
                {t('zakat.nisabSilver')}
                {!isPro && <span className="material-symbols-outlined text-xs">lock</span>}
              </button>
            </div>

            {/* Price Syncing */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-3xl border border-amber-100 dark:border-amber-900/20">
                <p className="text-[9px] font-black text-amber-700 dark:text-amber-500 mb-2 uppercase tracking-widest">{t('zakat.goldPriceToday')}</p>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="flex items-center gap-1 bg-white dark:bg-amber-950/40 px-3 py-1.5 rounded-2xl border border-amber-200/50 dark:border-amber-900/30 flex-1">
                    <input 
                      type="text" 
                      inputMode="decimal"
                      dir="ltr"
                      value={goldPrice} 
                      onChange={(e) => {
                        const val = sanitizeNumericInput(e.target.value);
                        setGoldPrice(val);
                        DB.setSetting('lastGoldPrice', val);
                      }}
                      onCompositionEnd={(e) => {
                        const val = sanitizeNumericInput(e.currentTarget.value);
                        setGoldPrice(val);
                        DB.setSetting('lastGoldPrice', val);
                      }}
                      className="w-full bg-transparent font-black text-sm text-amber-900 dark:text-amber-100 focus:outline-none placeholder-amber-400"
                      placeholder="0"
                    />
                    <small className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{baseCurrency}</small>
                  </div>
                   <button onClick={() => syncPrices()} disabled={isSyncing} className="w-8 h-8 rounded-full bg-white dark:bg-amber-900/30 flex items-center justify-center text-amber-600 shadow-sm active:rotate-180 transition-all duration-500 shrink-0 disabled:opacity-50">
                    <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
                  </button>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/50">
                <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">{t('zakat.silverPriceToday')}</p>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900/40 px-3 py-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/30 flex-1">
                    <input 
                      type="text" 
                      inputMode="decimal"
                      dir="ltr"
                      value={silverPrice} 
                      onChange={(e) => {
                        const val = sanitizeNumericInput(e.target.value);
                        setSilverPrice(val);
                        DB.setSetting('lastSilverPrice', val);
                      }}
                      onCompositionEnd={(e) => {
                        const val = sanitizeNumericInput(e.currentTarget.value);
                        setSilverPrice(val);
                        DB.setSetting('lastSilverPrice', val);
                      }}
                      className="w-full bg-transparent font-black text-sm text-slate-800 dark:text-slate-100 focus:outline-none placeholder-slate-400"
                      placeholder="0"
                    />
                    <small className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{baseCurrency}</small>
                  </div>
                   <button onClick={() => isPro ? syncPrices() : toast(t('shop.perk.zakatPro') + ' Required', 'error')} disabled={isSyncing} className={`w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-slate-600 shadow-sm ${!isPro ? 'opacity-30' : 'active:rotate-180 transition-all duration-500'} shrink-0 disabled:opacity-50`}>
                    <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin' : ''}`}>{isPro ? 'sync' : 'lock'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Zakat Educational Card */}
            <div className="bg-[#002b59]/5 dark:bg-[#002b59]/10 rounded-[2rem] p-6 border border-[#002b59]/10 dark:border-[#002b59]/20 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
              <div className="flex items-center gap-2 text-[#002b59] dark:text-blue-300">
                <span className="material-symbols-outlined text-lg">info</span>
                <h4 className="font-black text-xs uppercase tracking-wider">{t('zakat.edu.title')}</h4>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
                {t('zakat.edu.desc', { pct: '2.5%' })}
              </p>
              <div className="grid grid-cols-2 gap-3 text-[10px]">
                <div className="bg-white/80 dark:bg-[#121214]/60 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                  <span className="block font-black text-slate-800 dark:text-slate-200 mb-1">{t('zakat.edu.goldNisabTitle')}</span>
                  <span className="text-slate-500 dark:text-slate-400">{t('zakat.edu.goldNisabDesc')}</span>
                </div>
                <div className="bg-white/80 dark:bg-[#121214]/60 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                  <span className="block font-black text-slate-800 dark:text-slate-200 mb-1">{t('zakat.edu.silverNisabTitle')}</span>
                  <span className="text-slate-500 dark:text-slate-400">{t('zakat.edu.silverNisabDesc')}</span>
                </div>
              </div>
            </div>

            {/* Assets Title */}
            <div className="flex items-center justify-between">
              <h3 className="text-[#002b59] dark:text-blue-200 font-black text-lg uppercase tracking-tight">
                {t('zakat.assetsTitle')}
              </h3>
            </div>

            {/* Asset Inputs */}
            <div className="space-y-3">
              {[
                { id: 'cash', icon: 'account_balance', label: t('zakat.asset.cash'), color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                { id: 'gold', icon: 'diamond', label: t('zakat.asset.gold'), color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                { id: 'invest', icon: 'trending_up', label: t('zakat.asset.invest'), color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                { id: 'trade', icon: 'storefront', label: t('zakat.asset.trade'), color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
                { id: 'livestock', icon: 'pets', label: t('zakat.asset.livestock'), color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                { id: 'crops', icon: 'eco', label: t('zakat.asset.crops'), color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
                { id: 'realestate', icon: 'apartment', label: t('zakat.asset.realestate'), color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' }
              ].map((item) => {
                const isGoldRow = item.id === 'gold';
                const isGoldSmart = goldCalcType === 'smart';
                return (
                  <div 
                    key={item.id} 
                    onClick={() => isGoldRow && openGoldModal()}
                    className={`bg-white dark:bg-[#1c1f23] rounded-3xl p-4 flex items-center justify-between border border-slate-100 dark:border-slate-800 shadow-sm focus-within:ring-2 focus-within:ring-[#002b59]/20 transition-all ${isGoldRow ? 'cursor-pointer hover:border-amber-400/50' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${item.bg} ${item.color}`}>
                        <span className="material-symbols-outlined text-xl">{item.icon}</span>
                      </div>
                      <div>
                        <label className="font-black text-sm text-slate-800 dark:text-slate-200 truncate block">{item.label}</label>
                        {isGoldRow && (
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full mt-0.5 ${isGoldSmart ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-slate-100 text-slate-500'}`}>
                            <span className="material-symbols-outlined text-[10px]">
                              {isGoldSmart ? 'auto_awesome' : 'edit'}
                            </span>
                            {isGoldSmart 
                              ? `${totalEqWeight.toFixed(1)}g عيار 24` 
                              : t('zakat.gold.directValue')
                            }
                          </span>
                        )}
                      </div>
                    </div>
                    {isGoldRow ? (
                      <div className="w-28 bg-slate-50 dark:bg-[#121214] border border-slate-200/50 dark:border-slate-800 rounded-2xl py-3 px-3 text-center font-black text-sm text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                        {fmt(goldValueToUse)}
                      </div>
                    ) : (
                      <input 
                        type="text" 
                        inputMode="decimal"
                        dir="ltr"
                        value={assets[item.id as keyof typeof assets]}
                        onChange={(e) => handleAssetChange(item.id as keyof typeof assets, e.target.value)}
                        onCompositionEnd={(e) => handleAssetChange(item.id as keyof typeof assets, e.currentTarget.value)}
                        className="w-28 bg-slate-50 dark:bg-[#121214] border border-transparent rounded-2xl py-3 px-3 text-center font-black text-sm text-slate-800 dark:text-white focus:outline-none transition-all placeholder-slate-400" 
                        placeholder="0" 
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className="flex flex-col gap-4">
             {!isPro && (
                <div className="p-10 text-center bg-white dark:bg-[#1e2124] rounded-[3rem] border border-dashed border-slate-300 dark:border-slate-700">
                  <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">lock</span>
                  <h4 className="font-black text-slate-800 dark:text-white mb-2">{t('shop.perk.zakatPro')}</h4>
                  <p className="text-xs text-slate-500 mb-6">{t('shop.perk.zakatProDesc')}</p>
                  <button onClick={() => window.location.hash = '/shop'} className="px-8 py-3 bg-[#002b59] text-white rounded-full font-black text-xs active:scale-95 transition-all">
                    {t('title.shop')}
                  </button>
                </div>
             )}
             
             {isPro && history.length === 0 && (
                <div className="p-20 text-center text-slate-400 font-bold italic text-sm">
                  {t('zakat.noHistory') || 'No saved calculations yet'}
                </div>
             )}

             {isPro && history.map((entry, idx) => {
                const isExpanded = expandedIndex === idx;
                return (
                  <div 
                    key={idx} 
                    className="bg-white dark:bg-[#1c1f23] rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden transition-all duration-300"
                  >
                    {/* Main Summary Card */}
                    <div 
                      onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                      className="p-5 flex items-center justify-between cursor-pointer active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 mb-1">{new Date(entry.date).toLocaleDateString()}</span>
                        <span className="font-black text-slate-800 dark:text-white text-lg">{fmt(entry.amount)}</span>
                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-1">
                          {entry.method === 'gold' ? t('zakat.nisabGold') : t('zakat.nisabSilver')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400">{t('zakat.details')}</span>
                        <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-amber-500' : ''}`}>
                          chevron_left
                        </span>
                      </div>
                    </div>

                    {/* Expandable Asset Breakdown */}
                    {isExpanded && entry.assets && (
                      <div className="px-5 pb-5 pt-3 border-t border-slate-100/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30 space-y-3 animate-in slide-in-from-top duration-300">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                          {t('zakat.breakdownTitle')}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {Object.entries(entry.assets).map(([key, val]) => {
                            const valNum = parseNum(val as string) || 0;
                            if (valNum <= 0) return null;
                            const meta = assetMeta[key] || { label: key, icon: 'help', color: 'text-slate-400', bg: 'bg-slate-100' };

                            return (
                              <div key={key} className="flex items-center justify-between bg-white dark:bg-[#1a1c1e] p-3 rounded-2xl border border-slate-200/40 dark:border-slate-800/80">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${meta.bg} ${meta.color}`}>
                                    <span className="material-symbols-outlined text-sm">{meta.icon}</span>
                                  </div>
                                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                                    {meta.label}
                                  </span>
                                </div>
                                <span className="text-xs font-black text-slate-800 dark:text-white tabular-nums">
                                  {fmt(valNum)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
             })}
          </div>
        )}
      </main>

      {/* Gold Smart Calculator Modal / Drawer */}
      {showGoldModal && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#1a1c1e] w-full md:max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] max-h-[90vh] overflow-y-auto shadow-2xl border-t md:border border-slate-100 dark:border-slate-800 flex flex-col p-6 animate-in slide-in-from-bottom duration-500 relative">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-2xl">diamond</span>
                <h3 className="text-[#002b59] dark:text-amber-400 font-black text-lg">
                  {t('zakat.gold.calcType')}
                </h3>
              </div>
              <button 
                onClick={() => setShowGoldModal(false)}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 py-6 space-y-6">
              
              {/* Tab Selector */}
              <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setTempGoldCalcType('direct')}
                  className={`flex-1 py-2.5 rounded-full text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                    tempGoldCalcType === 'direct'
                      ? 'bg-[#002b59] text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  {t('zakat.gold.directValue')}
                </button>
                <button
                  onClick={() => setTempGoldCalcType('smart')}
                  className={`flex-1 py-2.5 rounded-full text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                    tempGoldCalcType === 'smart'
                      ? 'bg-[#002b59] text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  {t('zakat.gold.smartCalc')}
                </button>
              </div>

              {/* DIRECT ENTRY MODE */}
              {tempGoldCalcType === 'direct' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('zakat.gold.directValueLabel')}
                    </label>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <input
                        type="text"
                        inputMode="decimal"
                        dir="ltr"
                        value={tempDirectGoldVal}
                        onChange={(e) => setTempDirectGoldVal(sanitizeNumericInput(e.target.value))}
                        onCompositionEnd={(e) => setTempDirectGoldVal(sanitizeNumericInput(e.currentTarget.value))}
                        placeholder="0.00"
                        className="flex-1 bg-transparent font-black text-lg text-slate-800 dark:text-white focus:outline-none placeholder-slate-400"
                      />
                      <span className="font-bold text-slate-500">{baseCurrency}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                      {t('zakat.gold.directValueHint')}
                    </p>
                  </div>
                </div>
              )}

              {/* SMART CALCULATOR MODE */}
              {tempGoldCalcType === 'smart' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  
                  {/* Nisab Progress */}
                  <div className="bg-amber-500/5 dark:bg-amber-500/10 rounded-3xl p-4 border border-amber-500/15 space-y-3">
                    <div className="flex items-center justify-between text-xs font-black text-amber-800 dark:text-amber-400">
                      <span>{t('zakat.gold.nisabProgress')}</span>
                      <span>{tempEqWeight.toFixed(2)} / 85 {t('zakat.gold.weight')}</span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-500" 
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 leading-relaxed">
                      <span className="material-symbols-outlined text-[14px] text-amber-500 shrink-0">
                        {tempEqWeight >= 85 ? 'stars' : 'info'}
                      </span>
                      {tempEqWeight >= 85 
                        ? t('zakat.gold.aboveNisabMsg') 
                        : t('zakat.gold.belowNisabMsg').replace('{grams}', (85 - tempEqWeight).toFixed(2))
                      }
                    </p>
                  </div>

                  {/* List of Gold Items */}
                  <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        {t('zakat.gold.itemsList')}
                      </h4>
                      <button
                        onClick={addTempGoldItem}
                        className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        {t('zakat.gold.addItem')}
                      </button>
                    </div>

                    {tempGoldItems.map((item) => (
                      <div key={item.id} className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800/60 space-y-3 relative group">
                        
                        {/* Top Line */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            dir="auto"
                            placeholder={t('zakat.gold.itemLabelPh')}
                            value={item.label}
                            onChange={(e) => updateTempGoldItem(item.id, 'label', e.target.value)}
                            onCompositionEnd={(e) => updateTempGoldItem(item.id, 'label', e.currentTarget.value)}
                            className="bg-white dark:bg-[#121214] border border-slate-200/50 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-black text-slate-800 dark:text-white flex-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          {tempGoldItems.length > 1 && (
                            <button
                              onClick={() => deleteTempGoldItem(item.id)}
                              className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/20 text-red-500 hover:bg-red-100 flex items-center justify-center shrink-0"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          )}
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-3 items-center">
                          {/* Weight input */}
                          <div className="flex items-center gap-2 bg-white dark:bg-[#121214] border border-slate-200/50 dark:border-slate-800 rounded-xl px-3 py-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              dir="ltr"
                              placeholder={t('zakat.gold.weightPh')}
                              value={item.weight}
                              onChange={(e) => updateTempGoldItem(item.id, 'weight', e.target.value)}
                              onCompositionEnd={(e) => updateTempGoldItem(item.id, 'weight', e.currentTarget.value)}
                              className="w-full bg-transparent font-black text-xs text-slate-800 dark:text-white focus:outline-none placeholder-slate-400"
                            />
                            <span className="text-[10px] font-bold text-slate-400">g</span>
                          </div>

                          {/* Caliber segmented button */}
                          <div className="flex bg-slate-100 dark:bg-[#121214] p-0.5 rounded-xl border border-slate-200/40 dark:border-slate-800/80">
                            {[18, 21, 22, 24].map(c => (
                              <button
                                key={c}
                                onClick={() => updateTempGoldItem(item.id, 'caliber', c)}
                                className={`flex-1 py-1 rounded-lg text-[9px] font-black transition-all ${
                                  item.caliber === c
                                    ? 'bg-[#002b59] text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                                }`}
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Equivalency Badge */}
                        <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 pt-1">
                          <span>{t('zakat.gold.caliber')}: {t('zakat.gold.caliberDisplay', { caliber: String(item.caliber) })}</span>
                          <span className="bg-amber-100/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 px-2 py-0.5 rounded-lg">
                            {t('zakat.gold.eqWeight')}: {((parseNum(item.weight) || 0) * (item.caliber / 24)).toFixed(2)}g
                          </span>
                        </div>

                      </div>
                    ))}
                  </div>

                  {/* Summary calculations */}
                  <div className="bg-[#002b59]/5 dark:bg-[#121214] border border-slate-200/50 dark:border-slate-800 p-5 rounded-3xl grid grid-cols-3 gap-3 text-center">
                    <div>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">{t('zakat.gold.actualWeightLabel')}</span>
                      <span className="font-black text-xs text-slate-700 dark:text-slate-200">{tempActualWeight.toFixed(2)}g</span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">{t('zakat.gold.eqWeightLabel')}</span>
                      <span className="font-black text-xs text-amber-600 dark:text-amber-400">{tempEqWeight.toFixed(2)}g</span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">{t('zakat.gold.estValueLabel')}</span>
                      <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">{fmt(tempGoldVal)}</span>
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowGoldModal(false)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-2xl font-black text-xs active:scale-95 transition-all"
              >
                {t('action.cancel') || 'إلغاء'}
              </button>
              <button
                onClick={applyGoldSmartCalc}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-all"
              >
                {t('zakat.gold.applySave')}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
