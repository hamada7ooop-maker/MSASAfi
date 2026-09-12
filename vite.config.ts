import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

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

export default defineConfig({
  plugins: [
    fontOptimizerPlugin(),
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
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // ─── Strip ALL dev-only code in production ─────────────────────────────
    esbuild: {
      drop: ['debugger'],
      pure: ['console.log', 'console.warn', 'console.debug', 'console.info', 'console.error'],
      treeShaking: true,
    },
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
      'Content-Security-Policy': [
        "default-src 'self' data: blob: gap:",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://apis.google.com https://accounts.google.com",
        "worker-src 'self' blob:",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self' data:",
        "img-src 'self' data: blob: https://*.googleusercontent.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com https://*.githubusercontent.com https://*.stlouisfed.org https://api.coingecko.com https://flagcdn.com",
        "connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* https://*.googleapis.com https://generativelanguage.googleapis.com https://api.exchangerate-api.com https://v6.exchangerate-api.com https://open.er-api.com https://api.frankfurter.app https://*.google.com https://text.pollinations.ai https://gen.pollinations.ai https://*.supabase.co https://bdquhhaorjrbpqkzcolj.supabase.co wss://*.supabase.co https://api.groq.com https://*.puter.com wss://*.puter.com https://ipapi.co https://freeipapi.com http://ip-api.com https://api.stlouisfed.org https://api.coingecko.com https://api.currentsapi.services https://restcountries.com https://*.open-meteo.com",
        "frame-src 'self' https://accounts.google.com"
      ].join('; ')
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
