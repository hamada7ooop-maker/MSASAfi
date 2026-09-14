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
      //   Ladder continues: exportService 0.8%, sabBanner 38%,
      //   envelope/family/preferences stores 40%, marketData 73%.
      thresholds: { lines: 62.0, functions: 57.5, branches: 46.5 }
    },
  },
});
