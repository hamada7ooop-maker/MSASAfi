import React, { useState, useMemo } from 'react';
import { useI18n } from '../../../i18n/index';
import { CURRENCIES, CURRENCY_RATES, CRYPTO_CHANGES, updateExchangeRates, type CurrencyMeta } from '../../../core/currency';
import { useSettingsStore } from '../../../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';
import { useIsMounted } from '../../../hooks/useIsMounted';
import { fmtRaw, parseNum, sanitizeNumericInput } from '@core/utils';
import { toast } from '../../../toast';

interface CurrencyCardItem {
  code: string;
  name: string;
  flag: string;
  symbol: string;
  converted: number;
}

export function Currencies() {
  const { t } = useI18n();
  const isMounted = useIsMounted();
  const { baseCurrency, setBaseCurrency } = useSettingsStore(
    useShallow((s) => ({
      baseCurrency: s.baseCurrency,
      setBaseCurrency: s.setBaseCurrency
    }))
  );
  
  const [amount, setAmount] = useState('100');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateTrigger, setUpdateTrigger] = useState(0);
  
  // Converter State
  const [convFrom, setConvFrom] = useState('USD');
  const [convTo, setConvTo] = useState('SAR');
  const [convAmount, setConvAmount] = useState('1000');
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  const numAmount = parseNum(amount) || 1;

  const handleUpdateRates = async () => {
    setIsUpdating(true);
    try {
      await updateExchangeRates();
      if (isMounted.current) {
        setUpdateTrigger(prev => prev + 1);
        toast(t('currencies.updated') || 'Rates updated!', 'success');
      }
    } catch {
      if (isMounted.current) {
        toast(t('currencies.updateFail') || 'Update failed', 'error');
      }
    } finally {
      if (isMounted.current) {
        setIsUpdating(false);
      }
    }
  };

  const handleSetBase = (code: string) => {
    setBaseCurrency(code);
    toast(`${t('currencies.baseSet') || 'Base currency set to'} ${code}`, 'success');
  };

  const groupedCurrencies = useMemo(() => {
    void updateTrigger;
    const grouped: Record<string, CurrencyCardItem[]> = {};
    const query = searchQuery.toLowerCase().trim();
    
    Object.entries(CURRENCIES).forEach(([code, meta]: [string, CurrencyMeta]) => {
      if (code === baseCurrency && !query) return;
      
      const name = meta.symbol || code;
      if (query && !code.toLowerCase().includes(query) && !name.toLowerCase().includes(query)) return;
 
      if (!grouped[meta.region]) grouped[meta.region] = [];
      
      const rate = CURRENCY_RATES[code] || 1;
      const converted = numAmount * rate;
      
      grouped[meta.region].push({
        code,
        name,
        flag: meta.flag,
        symbol: meta.symbol,
        converted
      });
    });
    return grouped;
  }, [baseCurrency, numAmount, searchQuery, updateTrigger]);

  // Converter Logic
  const fromRate = CURRENCY_RATES[convFrom] || 1;
  const toRate = CURRENCY_RATES[convTo] || 1;
  const convResult = (parseNum(convAmount) || 0) / fromRate * toRate;

  const handleSwap = () => {
    setConvFrom(convTo);
    setConvTo(convFrom);
  };

  const regionOrder = ['gulf', 'northAfrica', 'levant', 'americas', 'europe', 'asia', 'oceania', 'africa', 'crypto'];

  // Crypto Ticker Setup
  const btcPrice = 1 / (CURRENCY_RATES.BTC || 0.000015);
  const ethPrice = 1 / (CURRENCY_RATES.ETH || 0.00032);
  const usdtPrice = 1 / (CURRENCY_RATES.USDT || 1.0);

  const cryptos = [
    { id: 'BTC', name: 'Bitcoin', flag: '₿', price: btcPrice, change: CRYPTO_CHANGES.BTC || 0, color: 'from-amber-500/10 to-orange-600/10 dark:from-amber-500/20 dark:to-orange-600/20 border-amber-500/20 dark:border-amber-500/30' },
    { id: 'ETH', name: 'Ethereum', flag: '⟠', price: ethPrice, change: CRYPTO_CHANGES.ETH || 0, color: 'from-indigo-500/10 to-blue-600/10 dark:from-indigo-500/20 dark:to-blue-600/20 border-indigo-500/20 dark:border-indigo-500/30' },
    { id: 'USDT', name: 'Tether', flag: '💲', price: usdtPrice, change: CRYPTO_CHANGES.USDT || 0, color: 'from-emerald-500/10 to-teal-600/10 dark:from-emerald-500/20 dark:to-teal-600/20 border-emerald-500/20 dark:border-emerald-500/30' }
  ];

  return (
    <div className="p-4 space-y-6 pb-32 animate-in fade-in duration-500">
      <div className="flex items-center justify-between px-1 pt-2">
        <h2 className="text-2xl font-black text-[#002b59] dark:text-blue-100 flex items-center gap-2">
          <span className="material-symbols-outlined text-green-500 text-3xl">currency_exchange</span>
          {t('title.currencies') || 'Currencies'}
        </h2>
        <button 
          onClick={handleUpdateRates}
          disabled={isUpdating}
          className={`w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 active:scale-90 transition-all ${isUpdating ? 'animate-spin' : ''}`}
        >
          <span className="material-symbols-outlined">sync</span>
        </button>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-[2rem] p-6 text-white shadow-xl shadow-green-500/20 relative overflow-hidden group">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
        
        <p className="text-green-100 text-[10px] font-black uppercase tracking-[0.2em] mb-3">
          {t('currencies.base') || 'Base Currency'}
        </p>
        <div className="flex items-center gap-4">
          <span className="text-5xl drop-shadow-lg">{CURRENCIES[baseCurrency]?.flag}</span>
          <div>
             <p className="text-4xl font-black">{baseCurrency}</p>
             <p className="text-[10px] text-green-100 font-bold opacity-80">{CURRENCIES[baseCurrency]?.symbol} • {t('currencies.active') || 'Active'}</p>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-white/20">
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="text-green-100 text-[10px] font-black uppercase tracking-widest block">{t('currencies.amount') || 'Amount to Convert'}</label>
              <p className="text-[9px] text-green-200/70 font-bold tracking-wider">{t('currency.appBase') || 'App Base Currency'}</p>
            </div>
            <select 
              value={baseCurrency} 
              onChange={(e) => handleSetBase(e.target.value)}
              className="bg-white/20 text-white border-none rounded-xl px-3 py-2 text-[10px] font-bold backdrop-blur-sm max-w-[140px] outline-none"
            >
              {Object.entries(CURRENCIES).map(([code, meta]: [string, CurrencyMeta]) => (
                <option key={code} value={code} className="text-slate-800">{meta.flag} {code}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <input 
              type="text" 
              inputMode="decimal"
              dir="ltr"
              autoComplete="off"
              value={amount}
              onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
              onCompositionEnd={(e) => setAmount(sanitizeNumericInput((e.target as HTMLInputElement).value))}
              onBlur={(e) => setAmount(sanitizeNumericInput(e.target.value))}
              className="w-full bg-white/10 backdrop-blur-md border border-white/30 text-white placeholder-white/50 p-4 rounded-2xl font-black text-2xl outline-none focus:ring-2 ring-white/50 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Crypto Pulse Ticker */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {t('currency.cryptoPulse') || 'نبض العملات الرقمية الفوري'}
          </h3>
          <span className="text-[9px] font-black tracking-wider text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-full uppercase">CoinGecko LIVE</span>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x">
          {cryptos.map(c => {
            const isUp = c.change >= 0;
            return (
              <div key={c.id} className={`snap-center shrink-0 w-[170px] bg-gradient-to-br ${c.color} backdrop-blur-xl border rounded-[2rem] p-4 flex flex-col justify-between shadow-[0_8px_32px_0_rgba(0,0,0,0.03)] relative overflow-hidden group`}>
                <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-all duration-500" />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-white/20 dark:bg-white/10 flex items-center justify-center font-black text-lg shadow-inner text-slate-700 dark:text-white">{c.flag}</span>
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-white leading-none">{c.id}</p>
                      <p className="text-[9px] font-medium text-slate-400 dark:text-slate-500 leading-none mt-1">{c.name}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 ${isUp ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                    <span className="material-symbols-outlined text-[10px] font-black">{isUp ? 'arrow_drop_up' : 'arrow_drop_down'}</span>
                    {isUp ? '+' : ''}{c.change.toFixed(2)}%
                  </span>
                </div>
                
                <div className="mt-4">
                  <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-widest font-black leading-none">{t('currency.livePrice') || 'السعر الحالي'}</p>
                  <p className="text-base font-black text-slate-800 dark:text-white mt-1 leading-none tracking-tight tabular-nums" dir="ltr">
                    ${c.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Converter Widget */}
      <div className="bg-white/50 dark:bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/30 dark:border-white/[0.06] shadow-[0_8px_40px_0_rgba(31,38,135,0.04)] space-y-4 relative overflow-hidden group">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl opacity-60 pointer-events-none" />
        
        <div className="flex items-center gap-3.5 mb-2 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="material-symbols-outlined text-white text-xl">calculate</span>
          </div>
          <h3 className="font-black text-base text-slate-800 dark:text-white tracking-wide">
            {t('currency.convert') || 'محول العملات الذكي'}
          </h3>
        </div>
        
        <div className="bg-white/40 dark:bg-white/[0.02] backdrop-blur-md p-5 rounded-[1.75rem] border border-white/40 dark:border-white/[0.04] flex items-center justify-between shadow-sm focus-within:ring-2 focus-within:ring-blue-500/30 transition-all duration-300 relative z-10">
          <div>
            <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 block mb-1.5">{t('currency.fromLabel') || 'من'}</label>
            <select value={convFrom} onChange={e => setConvFrom(e.target.value)} className="bg-slate-100/50 dark:bg-slate-850/50 text-slate-800 dark:text-white font-extrabold text-sm rounded-xl px-3 py-2 outline-none border-none max-w-[130px] appearance-none cursor-pointer">
              {Object.entries(CURRENCIES).map(([code, meta]: [string, CurrencyMeta]) => (
                <option key={code} value={code} className="dark:bg-slate-800 text-slate-800 dark:text-white">{meta.flag} {code}</option>
              ))}
            </select>
          </div>
          <input 
            type="text" 
            inputMode="decimal" 
            dir="ltr"
            autoComplete="off"
            value={convAmount} 
            onChange={e => setConvAmount(sanitizeNumericInput(e.target.value))} 
            onCompositionEnd={e => setConvAmount(sanitizeNumericInput((e.target as HTMLInputElement).value))}
            onBlur={e => setConvAmount(sanitizeNumericInput(e.target.value))}
            className="bg-transparent border-none text-right font-black text-3xl w-full min-w-0 text-slate-800 dark:text-white outline-none pl-4 pr-1 tabular-nums focus:ring-0 focus:outline-none" 
          />
        </div>

        <div className="flex justify-center -my-3.5 relative z-20">
          <button onClick={handleSwap} className="w-12 h-12 rounded-full bg-[#002b59] dark:bg-blue-600 text-white flex items-center justify-center active:scale-90 hover:scale-110 transition-all shadow-xl shadow-blue-900/35 dark:shadow-blue-500/20 border border-white/20">
            <span className="material-symbols-outlined text-2xl transition-transform duration-500 hover:rotate-180">swap_vert</span>
          </button>
        </div>

        <div className="bg-white/40 dark:bg-white/[0.02] backdrop-blur-md p-5 rounded-[1.75rem] border border-white/40 dark:border-white/[0.04] flex items-center justify-between shadow-sm transition-all duration-300 relative z-10">
          <div>
            <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 block mb-1.5">{t('currency.toLabel') || 'إلى'}</label>
            <select value={convTo} onChange={e => setConvTo(e.target.value)} className="bg-slate-100/50 dark:bg-slate-850/50 text-slate-800 dark:text-white font-extrabold text-sm rounded-xl px-3 py-2 outline-none border-none max-w-[130px] appearance-none cursor-pointer">
              {Object.entries(CURRENCIES).map(([code, meta]: [string, CurrencyMeta]) => (
                <option key={code} value={code} className="dark:bg-slate-800 text-slate-800 dark:text-white">{meta.flag} {code}</option>
              ))}
            </select>
          </div>
          <div className="text-right pl-4 pr-1">
            <p className="font-black text-3xl text-emerald-600 dark:text-emerald-500 tracking-tight truncate tabular-nums bg-emerald-500/5 dark:bg-emerald-500/2 px-3.5 py-1.5 rounded-xl border border-emerald-500/10" dir="ltr">
              {fmtRaw(convResult)}
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-[#1e2124] p-2 rounded-2xl flex items-center gap-2 border border-slate-100 dark:border-slate-800 shadow-sm focus-within:ring-2 ring-blue-500/20 transition-all">
        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-[#2a2d30] flex items-center justify-center text-slate-400">
          <span className="material-symbols-outlined">search</span>
        </div>
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('currency.searchPh') || 'Search currency...'}
          className="flex-1 bg-transparent border-none text-sm font-bold dark:text-white outline-none p-1"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
      </div>

      <div className="space-y-8">
        {regionOrder.map(region => {
          const items = groupedCurrencies[region];
          if (!items || items.length === 0) return null;

          return (
            <div key={region} className="space-y-4">
              <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                {t(`region.${region}`) || region}
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {items.map(item => (
                  <div key={item.code} className="bg-white dark:bg-[#1c1f23] rounded-[2rem] p-5 border border-slate-100 dark:border-white/5 flex items-center justify-between shadow-sm group hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <span className="text-4xl drop-shadow-sm group-hover:scale-110 transition-transform">{item.flag}</span>
                      <div>
                        <p className="font-black text-sm text-[#002b59] dark:text-blue-100">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-black tracking-widest">{item.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-black text-xl text-[#002b59] dark:text-blue-100">
                          {fmtRaw(item.converted, 4)}
                        </p>
                        <p className="text-[10px] text-green-500 font-black uppercase tracking-widest">{item.symbol}</p>
                      </div>
                      <button 
                        onClick={() => handleSetBase(item.code)}
                        className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-center transition-all active:scale-90"
                        title={t('currencies.setBase')}
                      >
                        <span className="material-symbols-outlined text-xl">star</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
