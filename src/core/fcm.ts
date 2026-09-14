// ============================================
// مصاريفي — Firebase Cloud Messaging (FCM)
// ============================================

import { db as DB } from './db/core';
import { t } from '../i18n/engine';
import { toast } from '../toast';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token, type ActionPerformed, type PushNotificationSchema } from '@capacitor/push-notifications';
import { silentFail } from './utils';

export interface FCMResult {
  ok: boolean;
  reason?: string;
}

let _initialized = false;

// Helper to prevent permanent hangs
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`Timeout: ${label} (${ms}ms)`));
      }
    }, ms);
    promise
      .then((val) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(val);
        }
      })
      .catch((err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      });
  });
}

// ─── Initialize FCM ────────────────────────────────────────────────────────
export async function initFCM(
  navigateTo?: (page: string) => void,
  force = false
): Promise<FCMResult> {
  if (_initialized && !force) return { ok: true };

  await DB.setSetting('fcmLastError', null);

  // Platform check — FCM only works on native
  if (!Capacitor.isNativePlatform()) {
    await DB.setSetting('fcmLastError', 'web_not_supported');
    return { ok: false, reason: 'web_not_supported' };
  }

  // Plugin availability check
  if (!PushNotifications || typeof PushNotifications.checkPermissions !== 'function') {
    await DB.setSetting('fcmLastError', 'plugin_unavailable');
    return { ok: false, reason: 'plugin_unavailable' };
  }

  try {
    // Clean up existing listeners to avoid duplicates
    try {
      await withTimeout(PushNotifications.removeAllListeners(), 3000, 'cleanup');
    } catch (_) {
      /* Initial state or no previous FCM listeners registered — expected */
    }

    // ── Register event listeners ──
    PushNotifications.addListener('registration', async (token: Token) => {
      try {
        await DB.setSetting('fcmToken', token.value);
        await DB.setSetting('fcmRegisteredAt', new Date().toISOString());
        toast(t('push.enabled') || '✅ تم تفعيل الإشعارات', 'success');
        _initialized = true;
      } catch (e) {
        silentFail('[FCM] registration handler error')(e);
      }
    }).catch(silentFail('[FCM] addListener registration'));

    PushNotifications.addListener('registrationError', async (err: { error: string } | { message: string } | unknown) => {
      const errorObj = err as { error?: string; message?: string };
      const errMsg = String(errorObj?.error || errorObj?.message || JSON.stringify(err) || 'unknown');
      silentFail('[FCM] registrationError: ' + errMsg)(err);
      await DB.setSetting('fcmLastError', errMsg).catch(silentFail('[FCM] persist fcmLastError'));
      toast(t('push.failed') || '❌ فشل تسجيل الإشعارات: ' + errMsg.slice(0, 60), 'error');
    }).catch(silentFail('[FCM] addListener registrationError'));

    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      toast(`🔔 ${notification.title || ''}: ${notification.body || ''}`, 'info');
    }).catch(silentFail('[FCM] addListener received'));

    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      const data = action.notification?.data as { page?: string } | undefined;
      if (data?.page && navigateTo) navigateTo(data.page);
    }).catch(silentFail('[FCM] addListener action'));

    // ── Check & request permissions ──────────────────────────────────────
    const perm = await withTimeout(
      PushNotifications.checkPermissions(),
      8000,
      'checkPermissions'
    );

    if (perm.receive !== 'granted') {
      const req = await withTimeout(
        PushNotifications.requestPermissions(),
        60000,
        'requestPermissions'
      );
      if (req.receive !== 'granted') {
        await DB.setSetting('fcmLastError', 'permission_denied');
        toast(t('push.permDenied') || '⛔ لم تُمنح صلاحية الإشعارات', 'warning');
        return { ok: false, reason: 'permission_denied' };
      }
    }

    // ── Trigger FCM registration ─
    await withTimeout(PushNotifications.register(), 15000, 'register');

    return { ok: true };
  } catch (e: unknown) {
    const err = e as Error;
    const msg = String(err?.message || e);
    silentFail('[FCM] Error: ' + msg)(e);
    await DB.setSetting('fcmLastError', msg).catch(silentFail('[FCM] persist fcmLastError'));
    return { ok: false, reason: msg };
  }
}

export async function getFCMToken(): Promise<string | null> {
  return ((await DB.getSetting('fcmToken')) as string | undefined) || null;
}

export async function isFCMReady(): Promise<boolean> {
  return !!(await getFCMToken());
}

export async function getFCMLastError(): Promise<string | null> {
  return ((await DB.getSetting('fcmLastError')) as string | undefined) || null;
}

// ─── Unregister / Cleanup ──────────────────────────────────────────────────
export async function disableFCM(): Promise<FCMResult> {
  try {
    if (Capacitor.isNativePlatform() && PushNotifications) {
      await withTimeout(PushNotifications.removeAllListeners(), 3000, 'removeAll');
    }
    await DB.setSetting('fcmToken', null);
    await DB.setSetting('fcmRegisteredAt', null);
    await DB.setSetting('fcmLastError', null);
    _initialized = false;
    return { ok: true };
  } catch (e: unknown) {
    const err = e as Error;
    return { ok: false, reason: err?.message || 'exception' };
  }
}
