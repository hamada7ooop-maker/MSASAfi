import React from 'react';
import { useI18n } from '../../../../i18n/index';
import { useFormat } from '../../../../core/hooks/useFormat';
import { useSettingsStore } from '../../../../store/settingsStore';
import { CURRENCY_RATES, CURRENCIES } from '../../../../core/currency';

/**
 * Directive 19 — Batch 1: the unified market PulseStrip.
 *
 * One sleek single-strip horizontal feed replacing the four tall market
 * cards (economic / currencies / crypto / news). Each pulse section renders
 * the SAME strip chassis — a one-line glass rail with compact cells — so the
 * market reads as one continuous language instead of four competing cards.
 * Vertical footprint: ~300px of card stack collapses to one ~64px rail.
 *
 * Data contracts and fallback sets are inherited as-is from the classic
 * MarketWidgets (including graceful fallback when an API key is absent) —
 * this is a visual unification, not a data rewrite.
 */
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

export type PulseKind = 'economic' | 'currency' | 'crypto' | 'news';

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
  { id: '1', title: 'توقعات باستقرار السياسات النقدية والتركيز على نمو القطاعات الإنتاجية والتكنولوجية', source: 'الأسواق المالية', url: 'https://www.reuters.com' },
  { id: '2', title: 'استمرار التدفقات الاستثمارية في الأسواق المالية وصناديق التوفير والاستثمار طويل الأجل', source: 'بلومبرغ اقتصاد', url: 'https://www.bloomberg.com' },
  { id: '3', title: 'مؤشرات التضخم العالمية تسجل استقراراً نسبياً يدعم ثقة المستهلكين والأنشطة التجارية', source: 'أخبار الاقتصاد', url: 'https://www.cnbc.com' },
  { id: '4', title: 'توسع متسارع في اعتماد حلول التكنولوجيا المالية والمدفوعات الرقمية الذكية', source: 'فايننشال تايمز', url: 'https://www.ft.com' }
];

const KIND_META: Record<PulseKind, { icon: string; labelKey: string }> = {
  economic: { icon: 'analytics', labelKey: 'home.section.economic' },
  currency: { icon: 'currency_exchange', labelKey: 'title.currencies' },
  crypto: { icon: 'currency_bitcoin', labelKey: 'home.section.crypto' },
  news: { icon: 'newspaper', labelKey: 'home.section.news' },
};

function ChangeBadge({ change, className = '' }: { change: number; className?: string }) {
  const up = change >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[9px] font-black shrink-0 ${className}`}
      style={{ color: up ? 'var(--color-income)' : 'var(--color-expense)' }}
    >
      <span aria-hidden="true">{up ? '▲' : '▼'}</span>
      {Math.abs(change)}%
    </span>
  );
}

function EconomicCells({ data }: { data?: EconomicIndicator[] | 'missing' | null }) {
  const { t } = useI18n();
  const { fmtRaw } = useFormat();
  const items = Array.isArray(data) && data.length > 0 ? data : FALLBACK_ECONOMIC_INDICATORS;
  return (
    <>
      {items.map((item, i) => {
        const changeNum = typeof item.change === 'number' ? item.change : parseFloat(String(item.change)) || 0;
        return (
          <div key={i} className="pulse-cell" data-testid="pulse-cell">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-60 truncate max-w-[90px]">
              {t(`market.economic.${item.id}`) || item.id}
            </span>
            <span className="num-fin text-[11px] font-black whitespace-nowrap">
              {item.type === 'pct' ? `${fmtRaw(item.value, 2)}%` : fmtRaw(item.value, item.value > 1000 ? 0 : 2)}
            </span>
            <ChangeBadge change={changeNum} />
          </div>
        );
      })}
    </>
  );
}

function CurrencyCells() {
  const baseCurrency = useSettingsStore((s) => s.baseCurrency);
  if (!CURRENCY_RATES || !baseCurrency) return null;
  const targets = ['USD', 'EUR', 'GBP', 'AED', 'EGP', 'KWD', 'SAR', 'QAR', 'BHD', 'OMR', 'JOD'];
  const baseToUsdRate = CURRENCY_RATES[baseCurrency] || 1;
  const rates = targets
    .filter((curr) => curr !== baseCurrency)
    .map((curr) => {
      const usdToTargetRate = CURRENCY_RATES[curr];
      if (!usdToTargetRate) return null;
      return { code: curr, rate: usdToTargetRate / baseToUsdRate };
    })
    .filter((r): r is { code: string; rate: number } => r !== null)
    .slice(0, 8);
  if (rates.length === 0) return null;
  return (
    <>
      {rates.map((r, i) => (
        <div key={i} className="pulse-cell" data-testid="pulse-cell">
          <span aria-hidden="true">{CURRENCIES[r.code]?.flag || '🌐'}</span>
          <span className="text-[9px] font-black uppercase tracking-widest opacity-60">
            {r.code}/{baseCurrency}
          </span>
          <span className="num-fin text-[11px] font-black whitespace-nowrap">
            {r.rate < 0.01 ? r.rate.toFixed(4) : r.rate.toFixed(2)}
          </span>
        </div>
      ))}
    </>
  );
}

function CryptoCells({ data }: { data?: CryptoCoin[] | null }) {
  const { fmtRaw } = useFormat();
  const items = Array.isArray(data) && data.length > 0 ? data : FALLBACK_CRYPTO_COINS;
  return (
    <>
      {items.map((coin, i) => (
        <div key={i} className="pulse-cell" data-testid="pulse-cell">
          <span className="text-[9px] font-black uppercase tracking-widest opacity-80">{coin.symbol}</span>
          <span className="num-fin text-[11px] font-black whitespace-nowrap">${fmtRaw(coin.priceUsd || 0, 2)}</span>
          <ChangeBadge change={coin.change24h} />
        </div>
      ))}
    </>
  );
}

function NewsCells({ data }: { data?: MarketNewsItem[] | 'missing' | null }) {
  const items = Array.isArray(data) && data.length > 0 ? data : FALLBACK_MARKET_NEWS;
  return (
    <>
      {items.map((item, i) => (
        <a
          key={i}
          href={item.url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="pulse-cell max-w-[260px] no-underline"
          data-testid="pulse-cell"
        >
          <span className="text-[10px] font-bold truncate max-w-[170px]">{item.title}</span>
          <span className="text-[8px] uppercase tracking-widest opacity-50 truncate max-w-[70px]">{item.source}</span>
        </a>
      ))}
    </>
  );
}

export interface PulseStripProps {
  kind: PulseKind;
  economic?: EconomicIndicator[] | 'missing' | null;
  crypto?: CryptoCoin[] | null;
  news?: MarketNewsItem[] | 'missing' | null;
}

export function PulseStrip({ kind, economic, crypto, news }: PulseStripProps) {
  const { t } = useI18n();
  const meta = KIND_META[kind];

  return (
    <div
      className="pulse-strip"
      data-testid={`pulse-strip-${kind}`}
      role="group"
      aria-label={t(meta.labelKey) || meta.labelKey}
    >
      <div className="flex items-center gap-1.5 shrink-0 pe-1">
        <span className="material-symbols-outlined text-[16px] opacity-70" aria-hidden="true">
          {meta.icon}
        </span>
        <span className="text-[9px] font-black uppercase tracking-widest opacity-60 whitespace-nowrap">
          {t(meta.labelKey) || meta.labelKey}
        </span>
      </div>
      <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none flex-1 min-w-0 py-0.5">
        {kind === 'economic' && <EconomicCells data={economic} />}
        {kind === 'currency' && <CurrencyCells />}
        {kind === 'crypto' && <CryptoCells data={crypto} />}
        {kind === 'news' && <NewsCells data={news} />}
      </div>
    </div>
  );
}

export default PulseStrip;
