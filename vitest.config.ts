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
      thresholds: { lines: 64.1, functions: 59.2, branches: 48.3 }
    },
  },
});
