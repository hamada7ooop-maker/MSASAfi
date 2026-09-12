import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { useSettingsStore } from '../../../store/settingsStore';
import { CURRENCY_RATES, CURRENCIES } from '../../../core/currency';

export interface EconomicIndicator {
  id: string;
  value: number;
  change: number | string;
  type?: 'pct' | 'num';
}

export interface CryptoCoin {
  id: string;
  name: string;
  symbol: string;
  priceUsd: number;
  change24h: number;
  icon?: string;
}

export interface MarketNewsItem {
  id?: string;
  title: string;
  source?: string;
  url?: string;
  image?: string;
}

const FALLBACK_ECONOMIC_INDICATORS: EconomicIndicator[] = [
  { id: 'interestRate', value: 5.25, change: 0, type: 'pct' },
  { id: 'inflation', value: 2.8, change: -0.2, type: 'pct' },
  { id: 'gdp', value: 3.1, change: 0.4, type: 'pct' },
  { id: 'sp500', value: 5648, change: 1.15, type: 'num' },
  { id: 'oil', value: 78.5, change: -0.85, type: 'num' },
  { id: 'goldFred', value: 2510, change: 0.95, type: 'num' },
  { id: 'dollarIndex', value: 101.4, change: -0.3, type: 'num' },
  { id: 'unemployment', value: 4.1, change: 0.1, type: 'pct' }
];

const FALLBACK_CRYPTO_COINS: CryptoCoin[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', priceUsd: 64500, change24h: 2.45 },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', priceUsd: 3450, change24h: 1.25 },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', priceUsd: 590, change24h: -0.45 },
  { id: 'solana', symbol: 'SOL', name: 'Solana', priceUsd: 145.2, change24h: 4.30 },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', priceUsd: 0.39, change24h: -1.15 }
];

const FALLBACK_MARKET_NEWS: MarketNewsItem[] = [
  {
    id: '1',
    title: 'توقعات باستقرار السياسات النقدية والتركيز على نمو القطاعات الإنتاجية والتكنولوجية',
    source: 'الأسواق المالية',
    url: 'https://www.reuters.com'
  },
  {
    id: '2',
    title: 'استمرار التدفقات الاستثمارية في الأسواق المالية وصناديق التوفير والاستثمار طويل الأجل',
    source: 'بلومبرغ اقتصاد',
    url: 'https://www.bloomberg.com'
  },
  {
    id: '3',
    title: 'مؤشرات التضخم العالمية تسجل استقراراً نسبياً يدعم ثقة المستهلكين والأنشطة التجارية',
    source: 'أخبار الاقتصاد',
    url: 'https://www.cnbc.com'
  },
  {
    id: '4',
    title: 'توسع متسارع في اعتماد حلول التكنولوجيا المالية والمدفوعات الرقمية الذكية',
    source: 'فايننشال تايمز',
    url: 'https://www.ft.com'
  }
];

// --- 1. Economic Pulse ---
export function EconomicPulse({ data, missing: _missing }: { data?: EconomicIndicator[] | 'missing' | null; missing?: boolean }) {
  const { t } = useI18n();
  const { fmtRaw } = useFormat();

  const displayData = Array.isArray(data) && data.length > 0 ? data : FALLBACK_ECONOMIC_INDICATORS;
  const isFallback = !Array.isArray(data) || data.length === 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-xl border border-black/5 dark:border-white/5 h-full">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-black text-sm uppercase tracking-tighter flex items-center gap-2 text-blue-500">
          <span className="material-symbols-outlined">analytics</span>
          {t('home.section.economic')}
        </h3>
        {isFallback && (
          <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-full">
            مؤشرات قياسية
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide">
        {displayData.map((item, i) => (
          <div key={i} className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-black/5 dark:border-white/5 group hover:border-blue-500/20 transition-all flex flex-col items-center text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">
              {t(`market.economic.${item.id}`) || item.id}
            </p>
            <div className="flex flex-col items-center justify-center gap-1">
              <p className="font-black text-slate-800 dark:text-white text-xs">
                {item.type === 'pct' ? `${fmtRaw(item.value, 2)}%` : fmtRaw(item.value, item.value > 1000 ? 0 : 2)}
              </p>
              {(() => {
                const changeNum = typeof item.change === 'number' ? item.change : parseFloat(String(item.change)) || 0;
                return (
                  <span className={`text-[9px] font-black flex items-center gap-0.5 ${changeNum >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    <span className="text-[12px]">{changeNum >= 0 ? '▲' : '▼'}</span>
                    {Math.abs(changeNum)}%
                  </span>
                );
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- 2. Currency Pulse ---
export function CurrencyPulse() {
  const { t } = useI18n();
  const baseCurrency = useSettingsStore(s => s.baseCurrency);

  const getMajorRates = () => {
    if (!CURRENCY_RATES || !baseCurrency) return null;
    const targets = ['USD', 'EUR', 'GBP', 'AED', 'EGP', 'KWD', 'SAR', 'QAR', 'BHD', 'OMR', 'JOD'];
    const baseToUsdRate = CURRENCY_RATES[baseCurrency] || 1;
    return targets
      .filter(curr => curr !== baseCurrency)
      .map(curr => {
        const usdToTargetRate = CURRENCY_RATES[curr];
        if (!usdToTargetRate) return null;
        const rateRelativeToBase = usdToTargetRate / baseToUsdRate;
        return { code: curr, rate: rateRelativeToBase };
      })
      .filter((r): r is { code: string; rate: number } => r !== null)
      .slice(0, 8);
  };

  const majorRates = getMajorRates();
  if (!majorRates || majorRates.length === 0) return null;

  return (
    <div className="bg-white/50 dark:bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/30 dark:border-white/[0.06] shadow-[0_8px_40px_0_rgba(31,38,135,0.04)] relative overflow-hidden group">
      {/* Background glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center gap-3.5 mb-6 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/25 transition-transform duration-500 group-hover:rotate-12">
          <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>currency_exchange</span>
        </div>
        <div>
          <h3 className="text-base font-black text-slate-800 dark:text-white tracking-wide leading-tight">
            {t('title.currencies') || 'أسعار الصرف الكبرى'}
          </h3>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5">
            {t('currencies.base') || 'العملة الأساسية'}: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{CURRENCIES[baseCurrency]?.flag} {baseCurrency} ({CURRENCIES[baseCurrency]?.symbol})</span>
          </p>
        </div>
      </div>

      {/* Horizontal scroll */}
      <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide relative z-10 snap-x">
        {majorRates.map((r, i) => {
          const meta = CURRENCIES[r.code];
          return (
            <div key={i} className="flex-shrink-0 bg-white/40 dark:bg-white/[0.02] backdrop-blur-md p-5 rounded-[1.75rem] border border-white/40 dark:border-white/[0.04] min-w-[155px] flex flex-col items-center justify-center text-center shadow-sm hover:scale-105 hover:shadow-md hover:border-emerald-500/20 dark:hover:border-emerald-500/20 transition-all duration-300 snap-start group/item relative overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-emerald-500/5 dark:bg-emerald-500/2 rounded-bl-full pointer-events-none" />
              
              <span className="text-3xl drop-shadow-sm mb-2.5 transition-transform duration-300 group-hover/item:scale-110">
                {meta?.flag || '🌐'}
              </span>
              
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                {r.code} / {baseCurrency}
              </span>
              
              <p className="font-black text-lg text-slate-800 dark:text-white tracking-tight">
                {r.rate < 0.01 ? r.rate.toFixed(4) : r.rate.toFixed(2)}
              </p>
              
              <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                1 {baseCurrency} = {r.rate.toFixed(2)} {meta?.symbol || r.code}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- 3. Crypto Pulse ---
export function CryptoPulse({ data }: { data?: CryptoCoin[] | null }) {
  const { t } = useI18n();
  const { fmtRaw } = useFormat();

  const displayData = Array.isArray(data) && data.length > 0 ? data : FALLBACK_CRYPTO_COINS;

  return (
    <div className="bg-white/50 dark:bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/30 dark:border-white/[0.06] shadow-[0_8px_40px_0_rgba(31,38,135,0.04)] relative overflow-hidden group">
      {/* Background glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-500/10 dark:bg-orange-500/5 rounded-full blur-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3.5 mb-6 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-orange-500/25 transition-transform duration-500 group-hover:rotate-12">
          <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>currency_bitcoin</span>
        </div>
        <div>
          <h3 className="text-base font-black text-slate-800 dark:text-white tracking-wide leading-tight">
            {t('home.section.crypto') || 'سوق العملات الرقمية'}
          </h3>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5">
            {t('market.crypto.realtime') || 'أسعار العملات الرقمية المشفرة لحظة بلحظة'}
          </p>
        </div>
      </div>

      {/* Horizontal scroll */}
      <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide relative z-10 snap-x">
        {displayData.map((coin, i) => {
          const isUp = coin.change24h >= 0;
          return (
            <div key={i} className="flex-shrink-0 bg-white/40 dark:bg-white/[0.02] backdrop-blur-md p-5 rounded-[1.75rem] border border-white/40 dark:border-white/[0.04] min-w-[145px] flex flex-col items-center justify-center text-center shadow-sm hover:scale-105 hover:shadow-md hover:border-orange-500/20 dark:hover:border-orange-500/20 transition-all duration-300 snap-start group/item relative overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-orange-500/5 dark:bg-orange-500/2 rounded-bl-full pointer-events-none" />
              
              <div className="flex flex-col items-center gap-1.5 mb-1.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 flex items-center justify-center shadow-inner group-hover/item:rotate-12 transition-transform duration-300">
                  <span className="text-sm font-black text-orange-600 dark:text-orange-400">{coin.symbol}</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate max-w-[110px]">
                  {coin.name}
                </span>
              </div>
              
              <p className="font-black text-base text-slate-800 dark:text-white tracking-tight mt-1">
                ${fmtRaw(coin.priceUsd || 0, 2)}
              </p>
              
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] font-black mt-2.5 backdrop-blur-sm ${
                isUp 
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/10' 
                  : 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/10'
              }`}>
                <span>{isUp ? '▲' : '▼'}</span>
                {Math.abs(coin.change24h).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- 4. News Pulse ---
export function NewsPulse({ data, missing: _missing }: { data?: MarketNewsItem[] | 'missing' | null; missing?: boolean }) {
  const { t } = useI18n();

  const displayData = Array.isArray(data) && data.length > 0 ? data : FALLBACK_MARKET_NEWS;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-xl border border-black/5 dark:border-white/5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-black text-sm uppercase tracking-tighter flex items-center gap-2 text-indigo-500">
          <span className="material-symbols-outlined">newspaper</span>
          {t('home.section.news')}
        </h3>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
        {displayData.map((item, i) => (
          <a key={i} href={item.url || '#'} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 w-[240px] group bg-slate-50 dark:bg-slate-900/40 rounded-3xl overflow-hidden border border-black/5 dark:border-white/5 snap-start active:scale-[0.98] transition-all">
            <div className="relative h-28 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 overflow-hidden">
              {item.image ? (
                <img src={item.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center opacity-30">
                  <span className="material-symbols-outlined text-4xl">article</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <h4 className="text-[11px] font-black text-slate-700 dark:text-slate-200 line-clamp-2 leading-relaxed mb-2 group-hover:text-blue-500 transition-colors">{item.title}</h4>
              <div className="flex items-center justify-between">
                <p className="text-[8px] text-slate-400 uppercase tracking-widest font-bold truncate max-w-[120px]">{item.source}</p>
                <span className="text-[8px] font-black text-blue-500 uppercase">{t('action.more')}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function _MissingKeyPlaceholder({ type }: { type: 'economic' | 'news' }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const color = type === 'economic' ? 'blue' : 'indigo';
  const icon = type === 'economic' ? 'analytics' : 'newspaper';
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-xl border border-black/5 dark:border-white/5 text-center">
      <div className="flex items-center justify-between mb-5">
        <h3 className={`font-black text-sm uppercase tracking-tighter flex items-center gap-2 text-${color}-500`}>
          <span className="material-symbols-outlined">{icon}</span>
          {t(`home.section.${type}`)}
        </h3>
        <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400">API KEY REQUIRED</span>
      </div>
      <p className="text-[10px] text-slate-400 font-bold uppercase mb-3">{t('settings.marketApiKeys')}</p>
      <button 
        onClick={() => navigate('/settings')}
        className={`bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 px-4 py-2 rounded-xl text-[10px] font-black active:scale-95 transition-all`}
      >
        {t('action.manage')}
      </button>
    </div>
  );
}
