import { useState, useEffect, useCallback } from 'react';
import { SettingsRepository } from '../../../core/db/repositories/settings';
import { SettingsService } from '../../../core/services/SettingsService';
import { silentFail } from '../../../core/utils';

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
    // 1. Local UI update for immediate feedback
    setSettings(prev => ({ ...prev, [key]: value }));

    // 2. Delegate to central service
    try {
      await SettingsService.updateSetting(key, value);
    } catch (e) {
      silentFail(`[useSettings] Failed to update ${key}`)(e);
      // Optional: rollback local state if critical? 
      // Usually settings are robust enough to not need strict rollbacks in UI.
    }
  };

  return {
    settings,
    isLoading,
    updateSetting,
    refresh: fetchSettings
  };
}
