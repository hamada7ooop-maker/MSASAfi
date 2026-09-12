import { db } from "../core/db/core";
import { useAppStore } from "../store/appStore";
import { checkDailyLoyalty } from "../core/loyalty";

/**
 * Initializes Loyalty points, streak, and daily rewards.
 */
export async function initLoyalty(): Promise<void> {
  const [points, streak] = await Promise.all([
    db.getSetting("userPoints").then((v: unknown) => Number(v) || 0),
    db.getSetting("loginStreak").then((v: unknown) => Number(v) || 0)
  ]);

  const { setUserPoints, setLoginStreak } = useAppStore.getState();
  setUserPoints(points);
  setLoginStreak(streak);

  await checkDailyLoyalty();
}
