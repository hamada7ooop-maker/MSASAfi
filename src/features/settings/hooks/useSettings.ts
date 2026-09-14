import { useState, useEffect, useCallback } from 'react';
import { SettingsRepository } from '../../../core/db/repositories/settings';
import { SettingsService } from '../../../core/services/SettingsService';
import { silentFail } from '../../../core/utils';
import { toast } from '../../../toast';
import { t } from '../../../i18n/engine';

export function useSettings() {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load all settings into local state
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await SettingsRepository.getAll();
      setSettings(loaded);
    } catch (error) {
      silentFail('[useSettings] Error fetching settings')(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  /**
   * Generic updater that handles DB, Store, Legacy state, and side effects via SettingsService.
   */
  const updateSetting = async (key: string, value: unknown) => {
    // 1. Local UI update for immediate feedback. Capture the previous value
    //    from this render's closure first: if persistence fails, the
    //    optimistic update must be rolled back or the UI keeps asserting a
    //    setting the database never stored. (This hook is plain-state, not
    //    reducer-based, so the closure value is the last rendered truth.)
    const previousValue = settings[key];

    setSettings(prev => ({ ...prev, [key]: value }));

    // 2. Delegate to central service
    try {
      await SettingsService.updateSetting(key, value);
    } catch (e) {
      // Directive 15 (silentFail audit): surfaced + rolled back. Previously
      // this swallowed the failure after the optimistic update, so a failed
      // write left the toggle showing the new state forever — the classic
      // "setting that resets itself" bug report, except it never reset.
      silentFail(`[useSettings] Failed to update ${key}`)(e);
      setSettings(prev => ({ ...prev, [key]: previousValue }));
      toast(t('common.error') || 'Error', 'error');
    }
  };

  return {
    settings,
    isLoading,
    updateSetting,
    refresh: fetchSettings
  };
}
