import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateHomeWidget } from '@/widgets/homeWidget';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const prefStore = new Map<string, string>();
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      prefStore.set(key, value);
    }),
    get: vi.fn(async ({ key }: { key: string }) => {
      return { value: prefStore.get(key) ?? null };
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      prefStore.delete(key);
    })
  }
}));

describe('HomeWidget Unit Tests (homeWidget.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prefStore.clear();
  });

  it('skips widget update if not native platform', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    await expect(updateHomeWidget()).resolves.toBeUndefined();
  });

  it('updates widget using generic WidgetPlugin when available', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    (globalThis as unknown as { WidgetPlugin?: { update: typeof mockUpdate } }).WidgetPlugin = {
      update: mockUpdate
    };

    await updateHomeWidget();

    expect(mockUpdate).toHaveBeenCalled();
    delete (globalThis as unknown as { WidgetPlugin?: unknown }).WidgetPlugin;
  });

  it('falls back to Preferences.set when WidgetPlugin is not available', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    delete (globalThis as unknown as { WidgetPlugin?: unknown }).WidgetPlugin;

    await updateHomeWidget();

    expect(Preferences.set).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'masarifi_widget_data' })
    );
  });
});
