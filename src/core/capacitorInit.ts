import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { db as DB } from './db/core';
import { RecurringService } from './db/services/recurringService';
import { processOAuthResponse } from './auth';
import { scheduleUpcomingNotifications } from './notifications';
import { t } from '../i18n/engine';
import { confirmSheet } from '../toast';
import { addDiagnosticLog } from './diagnostics';
import { bridge } from './AppBridge';
import { useAppStore } from '../store/appStore';

export function initCapacitorPlugins(
  _renderAppCallback?: () => void,
  syncWidgetCallback?: () => Promise<void> | void
): void {
  try {
    addDiagnosticLog('CAPACITOR', 'Initializing Capacitor plugins');

    if (!Capacitor.isNativePlatform()) {
      addDiagnosticLog('CAPACITOR', 'Not running on native platform');
      return;
    }

    addDiagnosticLog('CAPACITOR', 'Running on native platform', {
      platform: Capacitor.getPlatform()
    });

    // Deep link listener — catches com.masarifi.app://oauth2redirect#access_token=...
    try {
      App.addListener('appUrlOpen', async (data) => {
        addDiagnosticLog('CAPACITOR', 'App URL opened', { url: data.url });
        if (data.url && data.url.includes('oauth2redirect')) {
          await processOAuthResponse(data.url);
        }
      });
      addDiagnosticLog('CAPACITOR', 'App URL listener registered');
    } catch (e: unknown) {
      const err = e as Error;
      addDiagnosticLog('CAPACITOR', 'Failed to register app URL listener', err.message);
    }

    try {
      App.addListener('backButton', () => {
        // 1. Close any open modals/sheets/overlays first
        const modal = document.querySelector(
          '.fixed[style*="z-index"]:not(.masarifi-toast), .sheet-overlay, .bottom-sheet-overlay, [data-action="modal-close"], #quick-add-modal-overlay'
        ) as HTMLElement | null;
        if (modal) {
          // If it's the quick add modal, call its internal closer if possible, or just remove
          if (modal.id === 'quick-add-modal-overlay') {
            if (bridge.__closeQuickAdd) bridge.__closeQuickAdd();
            else modal.remove();
            return;
          }

          // If it's a bottom-sheet-overlay from toast, we can just click its cancel button or remove it
          const cancelBtn = modal.querySelector<HTMLButtonElement>('#cs-cancel');
          if (cancelBtn) cancelBtn.click();
          else modal.remove();
          return;
        }

        // 2. Close notification panel if open
        const { isNotifPanelOpen, setNotifPanelOpen } = useAppStore.getState();
        if (isNotifPanelOpen) {
          setNotifPanelOpen(false);
          return;
        }

        // 3. Navigate back to home or exit
        const hash = window.location.hash;
        if (hash && hash !== '#/' && hash !== '#/home' && hash !== '') {
          window.history.back();
        } else {
          // Prevent stacking: only show if no confirm sheet is already open
          if (!document.querySelector('.bottom-sheet-overlay')) {
            confirmSheet(
              t('exit.confirm'),
              () => {
                App.exitApp();
              },
              t('action.exit') || 'إغلاق',
              t('action.cancel') || 'إلغاء'
            );
          }
        }
      });
      addDiagnosticLog('CAPACITOR', 'Back button listener registered');
    } catch (e: unknown) {
      const err = e as Error;
      addDiagnosticLog('CAPACITOR', 'Failed to register back button listener', err.message);
    }

    // Lifecycle: Process recurring transactions when returning from background
    try {
      App.addListener('appStateChange', async (state) => {
        addDiagnosticLog('CAPACITOR', 'App state changed', { isActive: state.isActive });
        if (state.isActive) {
          addDiagnosticLog('LIFECYCLE', 'App became active. Syncing data...');
          await Promise.allSettled([
            RecurringService.processRecurringTransactions(DB),
            scheduleUpcomingNotifications(),
            syncWidgetCallback ? syncWidgetCallback() : Promise.resolve()
          ]);
        }
      });
      addDiagnosticLog('CAPACITOR', 'App state listener registered');
    } catch (e: unknown) {
      const err = e as Error;
      addDiagnosticLog('CAPACITOR', 'Failed to register app state listener', err.message);
    }

    addDiagnosticLog('CAPACITOR', 'Capacitor plugins initialized successfully');
  } catch (e: unknown) {
    const err = e as Error;
    addDiagnosticLog('CAPACITOR', 'CRITICAL ERROR during initialization', {
      message: err.message,
      stack: err.stack
    });
    throw e;
  }
}
