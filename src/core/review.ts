import { Capacitor } from '@capacitor/core';
import { db as DB } from './db/core';
import { silentFail } from './utils';

let _hasRequestedReview = false;

/**
 * Prompts the user for an app store review using the native Android/iOS review dialog.
 */
export async function checkAndPromptReview(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (_hasRequestedReview) return;

  try {
    const hasReviewed = (await DB.getSetting('hasReviewedApp')) || false;
    if (hasReviewed) return;

    const txns = await DB.getTransactions();
    if (!txns || txns.length < 5) return;

    const { Browser } = await import('@capacitor/browser');
    await Browser.open({
      url: 'https://play.google.com/store/apps/details?id=com.masarifi.app',
      presentationStyle: 'popover'
    });

    _hasRequestedReview = true;
    await DB.setSetting('hasReviewedApp', true);
  } catch (err) {
    silentFail('[Review] Failed to open review')(err);
  }
}
