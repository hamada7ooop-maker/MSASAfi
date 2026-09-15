import type { Asset } from '../../../types';
import { AssetsEngine, type AssetMetrics } from '../../../core/utils/assetsEngine';

/**
 * Directive 19 — deferred decomposition: the assets portfolio aggregation.
 *
 * Lifted verbatim from the page body: every asset is run through the
 * engine, and the summary panel's four figures are folded in the same
 * pass. Pure — same inputs, same outputs, no React.
 */

export interface ProcessedAsset {
  asset: Asset;
  metrics: AssetMetrics;
}

export interface AssetPortfolioSummary {
  totalPurchasePrice: number;
  totalAccumulatedDepreciation: number;
  totalBookValue: number;
  activeWarrantiesCount: number;
}

export function processAssets(assets: Asset[]): ProcessedAsset[] {
  return assets.map(asset => ({
    asset,
    metrics: AssetsEngine.calculateMetrics(asset),
  }));
}

export function summarizeAssets(processed: ProcessedAsset[]): AssetPortfolioSummary {
  let totalPurchasePrice = 0;
  let totalAccumulatedDepreciation = 0;
  let totalBookValue = 0;
  let activeWarrantiesCount = 0;

  for (const { asset, metrics } of processed) {
    totalPurchasePrice += Number(asset.purchasePrice) || 0;
    totalAccumulatedDepreciation += metrics.accumulatedDepreciation;
    totalBookValue += metrics.currentBookValue;

    if (asset.warrantyExpiry && !metrics.isWarrantyExpired) {
      activeWarrantiesCount++;
    }
  }

  return {
    totalPurchasePrice,
    totalAccumulatedDepreciation,
    totalBookValue,
    activeWarrantiesCount,
  };
}
