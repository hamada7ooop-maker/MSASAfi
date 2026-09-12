import { db } from "../core/db/core";
import { initLanguage } from "../i18n/engine";
import { useSettingsStore } from "../store/settingsStore";
import { useAppStore } from "../store/appStore";

/**
 * Initializes Language, Theme, Palettes, and General App Settings.
 */
export async function initSettings(): Promise<void> {
  await initLanguage();
  
  const [
    savedLang,
    incog,
    onboarded,
    theme,
    darkPalette,
    lightPalette,
    hourlyRate,
    isWorkHoursEnabled,
    useBiometricVal,
    hasPinHash,
    hasPinLegacy
  ] = await Promise.all([
    db.getSetting("language").then((v: unknown) => (typeof v === "string" ? v : "ar")),
    db.getSetting("incognito").then((v: unknown) => v === true),
    db.getSetting("hasOnboarded").then((v: unknown) => v === true),
    db.getSetting("theme").then((v: unknown) => (typeof v === "string" ? v : "light")),
    db.getSetting("darkPalette").then((v: unknown) => (typeof v === "string" ? v : "dim")),
    db.getSetting("lightPalette").then((v: unknown) => (typeof v === "string" ? v : "default")),
    db.getSetting("hourlyRate").then((v: unknown) => Number(v) || 0),
    db.getSetting("isWorkHoursEnabled").then((v: unknown) => v === "true" || v === true),
    db.getSetting("useBiometric").then((v: unknown) => v === true || v === "true"),
    db.getSetting("pinHash").then((v: unknown) => !!v),
    db.getSetting("pin").then((v: unknown) => !!v)
  ]);

  // Apply dark mode to DOM
  const root = document.documentElement;
  const isDark = theme === "dark" || (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);

  // Sync Zustand Store
  const settingsStore = useSettingsStore.getState();
  settingsStore.setLang(savedLang as import('@/types').LanguageCode);
  settingsStore.setIncognito(incog);
  settingsStore.setHasOnboarded(onboarded);
  settingsStore.setTheme(theme as "light" | "dark" | "auto");
  settingsStore.setDarkPalette(darkPalette);
  settingsStore.setLightPalette(lightPalette);
  settingsStore.setHourlyRate(hourlyRate);
  settingsStore.setIsWorkHoursEnabled(isWorkHoursEnabled);
  settingsStore.setUseBiometric(Boolean(useBiometricVal && (hasPinHash || hasPinLegacy)));

  useAppStore.getState().setIncognito(incog);
}
