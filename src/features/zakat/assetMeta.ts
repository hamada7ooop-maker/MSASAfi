/**
 * Presentation metadata for the zakat asset buckets.
 *
 * Shared by the asset editor and the history breakdown, which is why it lives
 * outside both. It is deliberately presentation ONLY -- label, icon, colour.
 * Which buckets are zakatable, and at what rate, is decided in
 * `src/core/zakatEngine.ts`; nothing here may imply otherwise.
 */
export interface ZakatAssetMeta {
  label: string;
  icon: string;
  color: string;
  bg: string;
}

type Translate = (key: string) => string;

export function buildAssetMeta(t: Translate): Record<string, ZakatAssetMeta> {
  return {
    cash: { label: t('zakat.asset.cash'), icon: 'account_balance', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    gold: { label: t('zakat.asset.gold'), icon: 'diamond', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    invest: { label: t('zakat.asset.invest'), icon: 'trending_up', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    trade: { label: t('zakat.asset.trade'), icon: 'storefront', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    livestock: { label: t('zakat.asset.livestock'), icon: 'pets', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    crops: { label: t('zakat.asset.crops'), icon: 'eco', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
    realestate: { label: t('zakat.asset.realestate'), icon: 'apartment', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  };
}
