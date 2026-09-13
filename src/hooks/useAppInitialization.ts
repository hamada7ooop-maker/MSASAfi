import { useState, useEffect } from "react";
import { useSettingsStore } from "../store/settingsStore";
import { initAuth, setupAuthListeners } from "./useAuthInit";
import { initSettings } from "./useSettingsInit";
import { initLoyalty } from "./useLoyaltyInit";
import { initServices } from "./useServicesInit";
import { logger } from "../core/logger";
import { initCrashlytics } from "../core/crashlytics";

/**
 * useAppInitialization Hook
 * Orchestrates modular startup initializers (Auth, Settings, Loyalty, Services).
 */
export function useAppInitialization() {
  const [isInitialized, setIsInitialized] = useState(false);
  const hasOnboarded = useSettingsStore(s => s.hasOnboarded);

  useEffect(() => {
    let cleanupAuth: (() => void) | undefined;

    async function initialize() {
      try {
        logger.info("React", "Starting Modular App Initialization...");

        // Crash reporting first, so faults during the rest of startup are
        // captured. No-op unless VITE_CRASH_REPORTING=true on a native build.
        await initCrashlytics();

        // Parallel modular execution
        await Promise.allSettled([
          initSettings(),
          initAuth(),
          initLoyalty(),
          initServices()
        ]);

        // Setup background listeners
        cleanupAuth = setupAuthListeners();

        logger.info("React", "Modular App Initialization Complete");
        setIsInitialized(true);
      } catch (error) {
        logger.error("React Init", "App initialization failed", error);
        setIsInitialized(true);
      }
    }

    initialize();

    return () => {
      if (cleanupAuth) cleanupAuth();
    };
  }, []);

  return { isInitialized, hasOnboarded };
}
