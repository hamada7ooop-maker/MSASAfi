import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../../../i18n/index';
import { useSettingsStore } from '../../../store/settingsStore';
import { db as DB } from '@/core/db/core';
import { getApiKey } from '@/core/apiKeys';
import { toast } from '../../../toast';
import { checkMilestone } from '../../../core/loyalty';
import { silentFail, parseNum, sanitizeNumericInput } from '../../../core/utils';
import { calculateZakat } from '@/core/zakatEngine';
import { ZakatNisabBanner } from './ZakatNisabBanner';
import { ZakatAssetsEditor } from './ZakatAssetsEditor';
import { ZakatHistoryTab } from './ZakatHistoryTab';
import { GoldSmartCalcModal } from './GoldSmartCalcModal';

interface ZakatHistory {
  date: string;
  amount: number;
  assets: Record<string, unknown>;
  method: 'gold' | 'silver';
}

export function ZakatCalculator() {
  const { t } = useI18n();
  const baseCurrency = useSettingsStore(s => s.baseCurrency);
  const unlockedItems = useSettingsStore(s => s.unlockedItems || []);
  
  const [activeTab, setActiveTab] = useState<'zakat' | 'history'>('zakat');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const isPro = unlockedItems.includes('perk:zakat-pro');


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

  /**
   * Immediately-due debts, deducted from the zakatable base.
   *
   * Previously absent entirely, so a user with 100,000 cash and 90,000 of due
   * debt was charged as if they held the full 100,000.
   */
  const [liabilities, setLiabilities] = useState('');

  /**
   * The date the wealth first reached nisab, for the hawl (lunar year).
   *
   * Optional: when it is blank the engine reports `hawl.status === 'unknown'`
   * and the screen presents the figure as an estimate rather than as an
   * obligation that has already fallen due.
   */
  const [nisabReachedDate, setNisabReachedDate] = useState('');

  const syncPrices = useCallback(async () => {
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
        const apiKey = await getApiKey('goldApiKey');
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
    // `baseCurrency` is read when fetching the gold/silver rates: without it
    // here, changing the currency left the calculator quoting prices in the
    // previous one. `t` is read for the toast copy.
  }, [baseCurrency, t]);

  const loadHistory = useCallback(async () => {
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

    const savedLiabilities = (await DB.getSetting('zakatLiabilities')) as string | undefined;
    if (savedLiabilities) setLiabilities(savedLiabilities);

    const savedNisabDate = (await DB.getSetting('zakatNisabReachedDate')) as string | undefined;
    if (savedNisabDate) setNisabReachedDate(savedNisabDate);

    // إذا كانت هذه هي المرة الأولى لفتح الحاسبة ولم تكن هناك قيم محفوظة، نقوم بالمزامنة تلقائياً بالخلفية
    if (!savedGold || !savedSilver) {
      setTimeout(() => {
        syncPrices();
      }, 600); // تأخير بسيط لضمان سلاسة الواجهة وتحميل المكون بالكامل
    }
  }, [syncPrices]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleLiabilitiesChange = (value: string) => {
    const sanitized = sanitizeNumericInput(value);
    setLiabilities(sanitized);
    DB.setSetting('zakatLiabilities', sanitized);
  };

  const handleNisabDateChange = (value: string) => {
    setNisabReachedDate(value);
    DB.setSetting('zakatNisabReachedDate', value);
  };

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

  /**
   * ── Canonical zakat calculation ────────────────────────────────────────
   *
   * Delegated to `core/zakatEngine.ts`. This screen previously re-implemented
   * the sum inline and charged 2.5% on EVERY bucket, including livestock,
   * crops and property. That is wrong across all four Sunni schools: crops are
   * 5%/10% at harvest against a nisab of five awsuq, livestock is a fixed
   * in-kind amount, and property held to live in or rent carries no zakat on
   * the asset itself. A user with modest cash and a house was being told they
   * owed thousands.
   *
   * Nothing here computes; the engine decides and this screen reports.
   * ───────────────────────────────────────────────────────────────────────
   */
  const zakatResult = React.useMemo(
    () =>
      calculateZakat({
        assets: {
          cash: parseNum(assets.cash) || 0,
          // The gold row may be a direct value or an itemised karat breakdown;
          // either way it arrives here already converted to currency.
          gold: goldValueToUse,
          invest: parseNum(assets.invest) || 0,
          trade: parseNum(assets.trade) || 0,
          livestock: parseNum(assets.livestock) || 0,
          crops: parseNum(assets.crops) || 0,
          realestate: parseNum(assets.realestate) || 0,
        },
        liabilities: parseNum(liabilities) || 0,
        goldPricePerGram: currentGoldPrice,
        silverPricePerGram: currentSilverPrice,
        nisabMethod,
        nisabReachedDate: nisabReachedDate || null,
      }),
    [
      assets,
      goldValueToUse,
      liabilities,
      currentGoldPrice,
      currentSilverPrice,
      nisabMethod,
      nisabReachedDate,
    ]
  );

  const {
    monetaryTotal,
    excludedBreakdown,
    excludedTotal,
    netZakatableBase,
    nisab,
    isAboveNisab,
    zakatAmount,
    hawl,
    isDueNow,
  } = zakatResult;

  // Kept for the "total wealth entered" readout, which is a different figure
  // from the zakatable base and must not be confused with it.
  const totalAssets = monetaryTotal + excludedTotal;

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
            <ZakatNisabBanner
              zakatAmount={zakatAmount}
              nisab={nisab}
              isAboveNisab={isAboveNisab}
              totalAssets={totalAssets}
              nisabMethod={nisabMethod}
              onNisabMethodChange={setNisabMethod}
              isPro={isPro}
              goldPrice={goldPrice}
              onGoldPriceChange={(v) => { setGoldPrice(v); DB.setSetting('lastGoldPrice', v); }}
              silverPrice={silverPrice}
              onSilverPriceChange={(v) => { setSilverPrice(v); DB.setSetting('lastSilverPrice', v); }}
              isSyncing={isSyncing}
              onSyncPrices={syncPrices}
              onSave={saveCalculation}
              hawl={hawl}
              isDueNow={isDueNow}
              nisabReachedDate={nisabReachedDate}
              onNisabReachedDateChange={handleNisabDateChange}
            />
            <ZakatAssetsEditor
              assets={assets}
              onAssetChange={(key, value) => handleAssetChange(key as keyof typeof assets, value)}
              goldCalcType={goldCalcType}
              goldValue={goldValueToUse}
              totalEquivalentWeight={totalEqWeight}
              onOpenGoldModal={openGoldModal}
              liabilities={liabilities}
              onLiabilitiesChange={handleLiabilitiesChange}
              netZakatableBase={netZakatableBase}
              excludedBreakdown={excludedBreakdown}
            />
          </>
        )}

        {activeTab === 'history' && (
          <ZakatHistoryTab
            history={history}
            expandedIndex={expandedIndex}
            onToggleExpand={setExpandedIndex}
            isPro={isPro}
          />
        )}
      </main>

      <GoldSmartCalcModal
        open={showGoldModal}
        calcType={tempGoldCalcType}
        onCalcTypeChange={setTempGoldCalcType}
        items={tempGoldItems}
        onAddItem={addTempGoldItem}
        onDeleteItem={deleteTempGoldItem}
        onUpdateItem={updateTempGoldItem}
        directValue={tempDirectGoldVal}
        onDirectValueChange={setTempDirectGoldVal}
        equivalentWeight={tempEqWeight}
        actualWeight={tempActualWeight}
        goldValue={tempGoldVal}
        progressPct={progressPct}
        onCancel={() => setShowGoldModal(false)}
        onApply={applyGoldSmartCalc}
      />

    </div>
  );
}
