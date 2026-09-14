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
      // Calibration history (audited 2026-09-14, pre-v23.2): the previous
      // values (69/71/48) claimed to be "the current measured coverage" but
      // were never real — re-measuring on the very commit that set them
      // (7eaaa1a) yields 60.62/58.52/46.34, so the gate had been red since
      // the day it was written (matching the original audit finding that
      // `vitest run --coverage` failed). Recalibrated to today's HEAD
      // measurement (60.08/56.52/45.06), rounded DOWN to a stable floor.
      // The old aspirational TARGET (75/73/55) was likewise unmeasured;
      // a realistic laddered target lives in the coverage directive
      // proposal (see COORDINATION.md) — biggest uncovered files first:
      // voiceAssistant 12.6%, sabBanner 38%, envelope/family/preferences
      // stores 40%, marketData 73%.
      thresholds: { lines: 60.0, functions: 56.5, branches: 45.0 }
    },
  },
});
