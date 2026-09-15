import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@features': path.resolve(__dirname, './src/features'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@store': path.resolve(__dirname, './src/store'),
      '@types': path.resolve(__dirname, './src/types'),
      '@i18n': path.resolve(__dirname, './src/i18n'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx,js,jsx}', 'tests/**/*.test.{ts,tsx,js,jsx}'],
    fileParallelism: false,
    testTimeout: 20000,
    silent: true,
    onConsoleLog() {
      return false;
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'src/locales/**',
        'src/translations.js',
        'src/features/arcade/**',
        'node_modules/**',
        'dist/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.test.{ts,tsx,js,jsx}'
      ],
      // ─── Coverage ratchet ──────────────────────────────────────────────
      // The ratchet rule: these numbers are the CURRENT measured coverage,
      // so the gate is green today and any regression fails the build.
      // Raise them as tests are added; never lower them.
      //
      // Calibration history:
      // · 2026-09-14 (pre-v23.2): recalibrated a false zero-point. The
      //   previous values (69/71/48) claimed to be "the current measured
      //   coverage" but were never real — re-measuring on the very commit
      //   that set them (7eaaa1a) yields 60.62/58.52/46.34, so the gate had
      //   been red since the day it was written. Floor set to the true
      //   measurement of the time: 60.0/56.5/45.0.
      // · 2026-09-14 (Directive 18, step 1 — first raise): +76 tests
      //   (voiceAssistant 13.6%→100% statements, settingsService
      //   4.6%→94% statements). Measured 62.21/57.68/46.66 → raised to
      //   62.0/57.5/46.5 (rounded down for run-to-run stability).
      // · 2026-09-14 (Directive 18, step 2 — second raise): +59 tests.
      //   The three modular stores (envelope/family/appPreferences) lifted
      //   to 100% statements AND a latent infinite-render defect fixed in
      //   them (useShallow); statementParser 73.6%→98.9% with two column-
      //   guessing weaknesses documented. Measured 62.62/58.05/47.24 →
      //   raised to 62.5/57.8/46.9.
      // · 2026-09-15 (Directive 18, step 3 — third raise): +52 tests and the
      //   owner-approved statementParser column-guess fix. marketData
      //   73%→95%, settingsStore 80.3%→95.5%, exportService 0.8%→94.6%
      //   (nominal test file replaced with a real one), zakat banner
      //   38.5%→85.7%. Measured 64.01/59.02/48.11 → raised to
      //   63.9/58.8/48.0. Ladder complete for this directive round.
      // - Directive 19 Batch 0 (2026-09-15): +40 tests (1152 × 121); motion
      //   tokens, NumberText, GlassPanel, haptics vocabulary + settings
      //   switch fully covered. Measured 64.16/59.22/48.33 → raised to
      //   64.1/59.2/48.3.
      // - Directive 19 Batch 1 (2026-09-15): +41 tests (1193 × 125);
      //   dashboard decomposed (characterization-first), NumberFlow,
      //   HeroBalanceCard, PulseStrip suites. Measured 64.55/59.71/48.82 and
      //   64.45/59.68/48.63 across two full runs → raised to 64.4/59.6/48.6
      //   (margin below both measurements, per the drift rule).
      // - Directive 19 Batch 2 (2026-09-15): +32 tests (1225 × 128);
      //   QuickAddModal characterized (16) then rebuilt — haptic vocabulary
      //   wired into the financial flow (8), drag-to-dismiss useSheetDrag
      //   suite (6), legacy useHaptic redirect verified (2). Measured
      //   64.93/59.95/49.31 → raised to 64.8/59.8/49.2 (margin below the
      //   measurement, per the drift rule; confirmed stable by the ci:check
      //   run on the same commit).
      // - Directive 19 Batch 3 (2026-09-15): +24 tests (1249 × 129);
      //   BankCardsManager characterized (20, of which 7 new: delete ×3,
      //   dots, reveal-off, keyboard, load failure) then decomposed into
      //   deck pieces; useDeckSwipe physics suite (8) + haptic/swipe
      //   integration (9). The composition root reached 100/90/100/100
      //   (was 79.22/79.41/80.64/78.46). Measured 65.19/60.24/49.45 →
      //   raised to 65.0/60.0/49.3 (margin below the measurement, per the
      //   drift rule; confirmed stable by the ci:check run on the same
      //   commit).
      // - Directive 19 Batch 4 (2026-09-15): +32 tests (1281 × 130); the
      //   unified chart theme (chartTheme.ts at 100%) + characterization and
      //   theme-wiring suites for all four chart surfaces. NetWorthTrend
      //   25.5%→90.4% lines, DashboardCharts →89.2%, PortfolioBreakdown
      //   →95.5%, ReportsTrend →85.7%. Measured 65.92/61.23/50.05 → raised
      //   to 65.7/61.0/49.9 (margin below the measurement, per the drift
      //   rule; confirmed stable by the ci:check run on the same commit).
      // - Directive 19 Batch 5 (2026-09-15): +21 tests (1302 × 131); the
      //   closing sweep. The ladder trio lifted: NavigationDrawer 17.4%→100%
      //   statements, DevUnlockModal 9.61%→92.6%, AssetDetailModal
      //   13.39%→71.3%. Plus the ease-token static pins. Measured
      //   66.94/61.67/50.30 → raised to 66.7/61.5/50.1 (margin below the
      //   measurement, per the drift rule; confirmed stable by the ci:check
      //   run on the same commit). The directive closes as v23.3.0.
      // - Post-directive decomposition batch (2026-09-15): +27 tests
      //   (1344 × 137); the deferred splits delivered — Assets 591→200+
      //   4 modules, AssetDetailModal 472→329 via the shared PDF export
      //   service (the ~150-line pipeline that used to live twice),
      //   Investments 505→213+3 modules. Characterization first (17 tests,
      //   green on the monolith before the split), then primitives.
      //   Measured 67.13/62.08/50.64 → raised to 67.1/62.0/50.6 (tenth
      //   raise; margin below the measurement, per the drift rule).
      // - Decomposition continuation (2026-09-15): +9 tests (1353 × 138);
      //   TravelBudget 584→194 — the trip card, the cross-currency math
      //   (tripMetrics), the weather vocabulary (travelWeather) and the
      //   live-forecast effect (useTravelForecast) all extracted; the
      //   pre-existing travelBudget suite stayed green through the split.
      //   Measured 67.2/62.12/50.93 → raised to 67.2/62.1/50.9 (eleventh
      //   raise; margin below the measurement, per the drift rule).
      // - Cloud ladder (2026-09-15): +23 tests (1376 × 139); cloud.ts — the
      //   E2E encrypted sync service — lifted 3.44%→94.48% lines with real
      //   PBKDF2/AES-GCM and the real DB; the suite caught a REAL data-
      //   integrity defect: cloudRestore's clear-phase called deleteTransaction
      //   detached from its receiver, so the TypeError vanished into the
      //   catch and restores re-imported over stale rows. Measured
      //   68.13/62.8/51.34 → raised to 68.1/62.7/51.3 (twelfth raise).
      thresholds: { lines: 68.1, functions: 62.7, branches: 51.3 }
    },
  },
});
