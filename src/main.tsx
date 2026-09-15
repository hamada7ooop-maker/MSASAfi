// ============================================
// مصاريفي v20.6.0 — React Entry Point
// ============================================

// ─── Font Imports (matching legacy main.js) ─────────────────────────────
/* ═══ Directive 19 — one family, five weights ═══
   IBM Plex Sans Arabic covers Arabic + Latin in a single family.
   Tajawal (6 weights), Manrope (3), and Inter (3) were removed:
   ~12 woff2 files stopped shipping with the bundle. */
import '@fontsource/ibm-plex-sans-arabic/300.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import 'material-symbols/outlined.css';

// ─── Core Styles ────────────────────────────────────────────────────────
import './index.css';
import './styles/globals.css';

// ─── Security & Privacy (Shake to Blur) ──────────────────────────────────
import { setupPrivacyShield } from './core/security';
setupPrivacyShield();

// ─── React ──────────────────────────────────────────────────────────────
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppRoot as App } from './AppRoot';
import { defineCustomElements } from '@ionic/pwa-elements/loader';

// Initialize Capacitor PWA Elements (Camera, etc. on Web)
defineCustomElements(window);

// ============================================
// Global Numeric Input Restriction (from legacy app.js)
// Prevents letters/symbols in numeric fields on mobile keyboards
// ============================================
import { registerToBridge, bridge } from './core/AppBridge';

const restrictToNum = (el: HTMLElement | HTMLInputElement) => {
  if (!el || !(el instanceof HTMLInputElement)) return;
  const start = el.selectionStart;
  const oldVal = el.value;
  // Strip anything that isn't a digit, dot, or comma
  let val = oldVal.replace(/[^0-9.,]/g, '');

  // Allow only one decimal separator (dot or comma)
  const firstDot = val.indexOf('.');
  const firstComma = val.indexOf(',');
  let sepIdx = -1;
  if (firstDot !== -1 && firstComma !== -1) sepIdx = Math.min(firstDot, firstComma);
  else sepIdx = firstDot !== -1 ? firstDot : firstComma;

  if (sepIdx !== -1) {
    const before = val.substring(0, sepIdx + 1);
    const after = val.substring(sepIdx + 1).replace(/[.,]/g, '');
    val = before + after;
  }

  if (val !== oldVal) {
    el.value = val;
    const diff = oldVal.length - val.length;
    try { el.setSelectionRange((start || 0) - diff, (start || 0) - diff); } catch { /* ignore */ }
  }
};
registerToBridge('restrictToNum', restrictToNum);

// Global handlers for numeric input to prevent mobile bypasses
document.addEventListener('compositionend', (e) => {
  const target = e.target as HTMLElement;
  if (target.getAttribute('oninput')?.includes('restrictToNum')) {
    bridge.restrictToNum?.(target);
  }
});
document.addEventListener('paste', (e) => {
  const target = e.target as HTMLElement;
  if (target.getAttribute('oninput')?.includes('restrictToNum')) {
    setTimeout(() => bridge.restrictToNum?.(target), 0);
  }
});
document.addEventListener('blur', (e) => {
  const target = e.target as HTMLElement;
  if (target.getAttribute('oninput')?.includes('restrictToNum')) {
    bridge.restrictToNum?.(target);
  }
}, true);

// ============================================
// Global Error Handlers & Crash Reporting
// ============================================
import { recordException } from './core/crashlytics';

window.onerror = function(msg: string | Event, _url?: string, _lineNo?: number, _columnNo?: number, error?: Error) {
  recordException(`[Global] ${String(msg)}`, error);
  return false;
};

window.addEventListener('unhandledrejection', function(event) {
  const reason = event.reason as { message?: string } | undefined;
  const msg = reason?.message || String(event.reason || '');

  // Ignore harmless errors
  if (['Transition was skipped', 'aborted', 'The user aborted'].some(s => msg.includes(s))) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }

  recordException(`[Promise] ${msg}`, event.reason instanceof Error ? event.reason : undefined);
}, true);

// ============================================
// ♿ A11Y: Auto-apply aria-hidden to decorative material-symbols icons
// ============================================
(function applyAriaHiddenToIcons() {
  function processIcons(root: Element | Document) {
    root.querySelectorAll('.material-symbols-outlined:not([aria-label]):not([aria-hidden])').forEach(el => {
      // Only mark as hidden if the icon is NOT the sole content of a labelled button
      const parent = el.parentElement;
      if (parent && (parent.getAttribute('aria-label') || parent.textContent?.trim() !== el.textContent?.trim())) {
        el.setAttribute('aria-hidden', 'true');
      }
    });
  }

  // Process initial icons
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => processIcons(document));
  } else {
    processIcons(document);
  }

  // Watch for new icons added dynamically
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) {
          if (node.classList?.contains('material-symbols-outlined')) {
            processIcons(node.parentElement || document);
          } else {
            processIcons(node);
          }
        }
      }
    }
  });
  const targetNode = document.getElementById('react-root') || document.body;
  observer.observe(targetNode, { childList: true, subtree: true });
})();

import { db } from './core/db/core';

import { logger } from './core/logger';

// ============================================
// Bootstrap React Application
// ============================================
const container = document.getElementById('react-root');

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  // Expose DB for debugging
  if (import.meta.env.DEV) {
    (window as Window & { MasarifiDB?: unknown }).MasarifiDB = db;
    logger.info('React', 'Root mounted successfully');
  }
} else {
  logger.error('Main', '#react-root container not found in index.html');
}
