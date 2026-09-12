import { Capacitor } from '@capacitor/core';
import { db as DB } from '@/core/db/core';
import { useSettingsStore } from '../store/settingsStore';
import { silentFail } from '../core/utils';

declare global {
  var WidgetPlugin: { update: (data: Record<string, string>) => Promise<void> } | undefined;
}

export interface HomeWidgetData {
  balance: string;
  income: string;
  expense: string;
  currency: string;
}

/**
 * Updates the native home screen widget with the latest financial data.
 */
export async function updateHomeWidget(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const balance = await DB.getTotalBalance();
    const now = new Date();
    const stats = await DB.getMonthlyStats(now.getFullYear(), now.getMonth());

    const widgetData: HomeWidgetData = {
      balance: balance.toFixed(2),
      income: stats.income.toFixed(2),
      expense: stats.expense.toFixed(2),
      currency: useSettingsStore.getState().baseCurrency || 'SAR'
    };

    // Attempt to use a generic widget plugin if available
    if (globalThis.WidgetPlugin && typeof globalThis.WidgetPlugin.update === 'function') {
      await globalThis.WidgetPlugin.update(widgetData as unknown as Record<string, string>);
    } else {
      // Fallback: Using Capacitor Preferences to store shared data for Native Widget to read
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({
        key: 'masarifi_widget_data',
        value: JSON.stringify(widgetData)
      });
    }
  } catch (error) {
    silentFail('Failed to update Home Widget')(error);
  }
}
