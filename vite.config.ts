import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { CSP } from './src/csp';

/**
 * Strips legacy .woff formats and non-Arabic/non-Latin subsets from @fontsource
 * to drastically reduce bundle size while preserving 100% Arabic + Latin/Latin-ext.
 */
function fontOptimizerPlugin(): Plugin {
  return {
    name: 'masarifi-font-optimizer',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('@fontsource') || !id.endsWith('.css')) return null;

      // 1. Drop legacy .woff fallback URLs (modern WebView/browsers only need .woff2)
      const transformed = code.replace(/,\s*url\([^)]+\.woff\)\s*format\(['"]woff['"]\)/g, '');

      // 2. Drop unused non-Arabic / non-Latin subsets (Cyrillic, Greek, Vietnamese)
      const blocks = transformed.split('@font-face');
      const filtered = blocks.filter((block, idx) => {
        if (idx === 0) return true;
        const lower = block.toLowerCase();
        return !lower.includes('cyrillic') && !lower.includes('greek') && !lower.includes('vietnamese');
      });

      return {
        code: filtered.join('@font-face'),
        map: null,
      };
    },
  };
}

/**
 * Injects the Content Security Policy from src/csp.ts into index.html at build
 * time, replacing the %CSP% placeholder. The policy previously existed as a
 * second hand-maintained copy in the HTML; keeping one source removes the
 * chance of the dev-server header and the shipped meta tag drifting apart.
 */
function cspInjectorPlugin(): Plugin {
  return {
    name: 'masarifi-csp-injector',
    transformIndexHtml(html) {
      if (!html.includes('%CSP%')) {
        throw new Error(
          'index.html is missing the %CSP% placeholder — the Content Security Policy would ship empty.'
        );
      }
      return html.replace('%CSP%', CSP);
    },
  };
}

export default defineConfig({
  plugins: [
    fontOptimizerPlugin(),
    cspInjectorPlugin(),
    react(),
    tailwindcss(),
  ],
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
  // ─── Strip dev-only code in production ───────────────────────────────────
  // NOTE: this MUST live at the config root. `build.esbuild` is not a valid
  // Vite option and is silently ignored (verified: console.log/debugger
  // survived into dist/ while it was nested under `build`).
  // `console.error` is intentionally NOT dropped — it is used by ErrorBoundary
  // and critical failure paths; `logger.ts` already gates dev-only output.
  esbuild: {
    drop: ['debugger'],
    pure: ['console.log', 'console.warn', 'console.debug', 'console.info'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // ─── Chunk Strategy ───────────────────────────────────────────────────
    rollupOptions: {
      output: {
        chunkFileNames:  'assets/[name]-[hash].js',
        entryFileNames:  'assets/[name]-[hash].js',
        assetFileNames:  'assets/[name]-[hash][extname]',
        manualChunks(id) {
          const normId = id.replace(/\\/g, '/');
          // ── Heavy vendor chunks — loaded only when needed ──────────────
          if (normId.includes('chart.js'))                        return 'vendor-charts';
          if (normId.includes('jspdf') || normId.includes('html2canvas')) return 'vendor-pdf';
          if (normId.includes('tesseract'))                       return 'vendor-ocr';
          if (normId.includes('canvas-confetti'))                 return 'vendor-confetti';
          if (normId.includes('sortablejs'))                      return 'vendor-sortable';
          // ── React & State management — always loaded ────────────────
          if (normId.includes('react-dom') || normId.includes('react/') || normId.includes('scheduler') || normId.includes('zustand')) return 'vendor-react';
          if (normId.includes('react-router'))                    return 'vendor-router';
          // ── Capacitor & native bridge — unified to eliminate circular chunk TDZ ───
          if (normId.includes('@capacitor') || normId.includes('@ionic/pwa-elements')) return 'vendor-capacitor';
          // ── Translations & i18n engine — isolated so components don't drag in AI ──
          if (normId.includes('translations.js') || normId.includes('/src/i18n/')) return 'app-i18n';
          // ── AI Engine — strictly AI algorithms and assistant ──────────
          if (normId.includes('/src/core/ai/') || normId.includes('/src/ai.')) return 'feature-ai';
          // ── Core DB + security — always needed ────────────────────────
          // (Dexie, DOMPurify) stay in main bundle
        },
      },
    },
    // Raise warning threshold — our vendor chunks are intentionally large
    chunkSizeWarningLimit: 600,
    // Disable source maps for production release
    sourcemap: false,
  },
  // Pre-bundle heavy dependencies to improve cold-start performance
  optimizeDeps: {
    include: ['dexie', 'chart.js', 'tesseract.js']
  },
  server: {
    port: 5173,
    host: true,
    headers: {
      // Single source of truth: src/csp.ts (also injected into index.html).
      'Content-Security-Policy': CSP
    },
    watch: {
      ignored: [
        '**/android/**',
        '**/ios/**',
        '**/dist/**',
        '**/node_modules/**',
      ],
    },
    proxy: {
      '/google-ai': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/google-ai/, ''),
      },
      '/api/fred': {
        target: 'https://api.stlouisfed.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fred/, ''),
      },
      '/api/gold': {
        target: 'https://www.goldapi.io/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gold/, ''),
      },
    },
  },
});
