import { Preferences } from '@capacitor/preferences';
import { toast } from '../toast';
import { t } from '../i18n/engine';
import { secureSet } from './secureStore';

/**
 * Process a Google OAuth redirect URL or hash fragment
 */
export async function processOAuthResponse(urlOrHash: string | null | undefined): Promise<boolean> {
  if (!urlOrHash) return false;

  let fragment = urlOrHash;
  if (urlOrHash.includes('#')) {
    fragment = urlOrHash.split('#')[1] || '';
  } else if (urlOrHash.includes('?')) {
    fragment = urlOrHash.split('?')[1] || '';
  }

  const params = new URLSearchParams(fragment);
  const token = params.get('access_token');

  if (token) {
    // Force clear hash for security if we are on the current window
    if (urlOrHash === window.location.hash || urlOrHash === window.location.href) {
      window.location.hash = '';
    }

    // Store token in secure storage when available (fallback to Preferences)
    await secureSet('_masarifi_drive_token', token);
    const expiresInParam = params.get('expires_in');
    const expiresMs = expiresInParam ? parseInt(expiresInParam, 10) * 1000 : 3600 * 1000;
    const expiryTime = (Date.now() + expiresMs - 300000).toString();
    await Preferences.set({ key: '_masarifi_drive_token_expiry', value: expiryTime });

    // Auto-navigate to settings to resume
    setTimeout(() => {
      window.location.hash = '#/settings';
      toast(t('auth.authenticating'));
    }, 800);

    return true;
  }
  return false;
}
