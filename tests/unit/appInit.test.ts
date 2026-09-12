import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../../src/core/db/core";
import { initAuth } from "../../src/hooks/useAuthInit";
import { initSettings } from "../../src/hooks/useSettingsInit";
import { initLoyalty } from "../../src/hooks/useLoyaltyInit";
import { initServices } from "../../src/hooks/useServicesInit";
import { useAppStore } from "../../src/store/appStore";
import { useSettingsStore } from "../../src/store/settingsStore";

describe("Modular App Initialization Units", () => {
  beforeEach(async () => {
    await db.settings.clear();
    await db.notifications.clear();
  });

  it("should initialize auth correctly when PIN is present", async () => {
    await db.setSetting("pinHash", "fake_hash_123");
    await db.setSetting("autoLock", true);

    await initAuth();
    expect(useAppStore.getState().isLocked).toBe(true);
  });

  it("should initialize settings correctly", async () => {
    await db.setSetting("language", "ar");
    await db.setSetting("theme", "dark");
    await db.setSetting("hourlyRate", 120);

    await initSettings();
    expect(useSettingsStore.getState().language).toBe("ar");
    expect(useSettingsStore.getState().theme).toBe("dark");
    expect(useSettingsStore.getState().hourlyRate).toBe(120);
  });

  it("should initialize loyalty correctly and award daily login points", async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    await db.setSetting("lastLoyaltyLog", yesterday);
    await db.setSetting("userPoints", 350);
    await db.setSetting("loginStreak", 5);

    await initLoyalty();
    // 350 initial + 10 daily login reward = 360, streak increments to 6
    expect(useAppStore.getState().userPoints).toBe(360);
    expect(useAppStore.getState().loginStreak).toBe(6);
  });

  it("should initialize background services without throwing", async () => {
    await expect(initServices()).resolves.not.toThrow();
  });
});
