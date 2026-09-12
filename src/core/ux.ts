// ============================================
// مصاريفي — أدوات تجربة المستخدم (UX Utilities)
// Extracted from app.js for modularity
// ============================================
import { safeInnerHTML } from './security';
import { $, getConversionRate, invalidateCache, fmtRaw } from './utils';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { registerToBridge } from './AppBridge';

const _lastValues: Record<string, number> = {};

// ===== Skeleton Loading Screen =====
export function showSkeleton(): void {
  const app = $('#app');
  if (!app) return;
  const main = document.getElementById('main-content');
  if (main) {
    safeInnerHTML(
      main,
      `
      <div class="space-y-6 animate-fadeIn p-2">
        <div class="skeleton-card skeleton mb-2"></div>
        <div class="grid grid-cols-2 gap-4">
          <div class="skeleton h-28 rounded-2xl"></div>
          <div class="skeleton h-28 rounded-2xl"></div>
        </div>
        <div class="skeleton h-16 w-full rounded-2xl"></div>
        <div class="skeleton h-40 w-full rounded-2xl mt-4"></div>
        <div class="space-y-3 mt-6">
          <div class="flex items-center gap-3">
             <div class="skeleton-circle skeleton"></div>
             <div class="flex-1 space-y-2"><div class="skeleton h-3 w-1/2"></div><div class="skeleton h-2 w-1/4"></div></div>
          </div>
          <div class="flex items-center gap-3">
             <div class="skeleton-circle skeleton"></div>
             <div class="flex-1 space-y-2"><div class="skeleton h-3 w-2/3"></div><div class="skeleton h-2 w-1/3"></div></div>
          </div>
        </div>
      </div>`
    );
  }
}

// ===== Animated Number Counter =====
export function animateCounters(): void {
  const rate = getConversionRate();
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const targetRaw = parseFloat(el.dataset.count || '0');
    const target = targetRaw * rate;
    const parentText = el.parentElement?.innerText.substring(0, 10) || '';
    const key = el.id || el.className + parentText;
    const prev = _lastValues[key] || 0;

    if (Math.abs(target - prev) < 0.01) {
      el.textContent = fmtRaw(target, target > 0 && target < 100 ? 2 : 0);
      return;
    }

    const duration = 600;
    const start = performance.now();
    function tick(now: number): void {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = prev + (target - prev) * eased;
      el.textContent = fmtRaw(current, current > 0 && current < 100 ? 2 : 0);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        _lastValues[key] = target;
      }
    }
    requestAnimationFrame(tick);
  });
}

// ===== Swipe-to-delete gesture (legacy touch-based) =====
export function setupSwipeGestures(): void {
  document.querySelectorAll<HTMLElement>('.swipe-item').forEach((item) => {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    const threshold = 60;

    item.addEventListener(
      'touchstart',
      (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
        item.style.transition = 'none';
      },
      { passive: true }
    );

    item.addEventListener(
      'touchmove',
      (e) => {
        if (!isDragging) return;
        currentX = e.touches[0].clientX;
        const diff = startX - currentX;
        if (diff > 0 && diff < 120) {
          item.style.transform = `translateX(-${diff}px)`;
        }
      },
      { passive: true }
    );

    item.addEventListener(
      'touchend',
      () => {
        isDragging = false;
        item.style.transition = 'transform 0.3s ease-out';
        const diff = startX - currentX;
        if (diff > threshold) {
          item.style.transform = `translateX(-80px)`;
          const deleteBtn = item.querySelector<HTMLElement>('.swipe-delete-btn');
          if (deleteBtn) deleteBtn.style.display = 'flex';
        } else {
          item.style.transform = 'translateX(0)';
        }
      },
      { passive: true }
    );
  });
}

// ===== Animate Progress Bars =====
export function animateProgressBars(): void {
  document.querySelectorAll<HTMLElement>('.progress-animate').forEach((bar) => {
    const targetWidth = bar.style.width;
    bar.style.width = '0';
    requestAnimationFrame(() => {
      bar.style.transition = 'width 0.8s ease-out';
      bar.style.width = targetWidth;
    });
  });
}

// ===== Pull-to-Refresh =====
export function initPullToRefresh(renderApp: () => Promise<void> | void): void {
  let startY = 0;
  let isRefreshing = false;
  const ptrEl = document.createElement('div');
  ptrEl.id = 'ptr-indicator';
  ptrEl.className =
    'ptr-indicator fixed top-[70px] left-1/2 -translate-x-1/2 z-[10000] w-10 h-10 bg-white dark:bg-[#1e2124] rounded-full shadow-xl flex items-center justify-center pointer-events-none opacity-0 transition-all scale-50';
  safeInnerHTML(
    ptrEl,
    '<span class="material-symbols-outlined ptr-spinner text-[#002b59] dark:text-blue-300" style="font-size:20px">refresh</span>'
  );
  document.body.appendChild(ptrEl);

  document.addEventListener(
    'touchstart',
    (e) => {
      const mainContent = document.getElementById('main-content');
      const isAtTop = mainContent ? mainContent.scrollTop === 0 : window.scrollY === 0;

      if (isAtTop) {
        startY = e.touches[0].clientY;
      } else {
        startY = -1;
      }
    },
    { passive: true }
  );

  document.addEventListener(
    'touchmove',
    (e) => {
      if (startY === -1 || isRefreshing) return;
      const y = e.touches[0].clientY;
      const diff = y - startY;
      if (diff > 20 && diff < 120) {
        ptrEl.style.opacity = String(Math.min((diff - 20) / 60, 1));
        ptrEl.style.transform = `translateX(-50%) scale(${
          0.5 + Math.min(diff / 120, 0.5)
        }) translateY(${Math.min(diff / 2, 50)}px) rotate(${diff * 2}deg)`;
      }
    },
    { passive: true }
  );

  document.addEventListener(
    'touchend',
    async (e) => {
      const diff = e.changedTouches[0].clientY - startY;
      if (startY !== -1 && diff > 80 && !isRefreshing) {
        isRefreshing = true;
        ptrEl.style.opacity = '1';
        ptrEl.querySelector('span')?.classList.add('ptr-spinner-anim');
        haptic();
        invalidateCache();
        await renderApp();
        setTimeout(() => {
          ptrEl.style.opacity = '0';
          ptrEl.style.transform = 'translateX(-50%) scale(0.5)';
          ptrEl.querySelector('span')?.classList.remove('ptr-spinner-anim');
          isRefreshing = false;
        }, 500);
      } else if (startY !== -1) {
        ptrEl.style.opacity = '0';
        ptrEl.style.transform = 'translateX(-50%) scale(0.5)';
      }
      startY = -1;
    },
    { passive: true }
  );
}

// ===== Haptic Vibration =====
export async function haptic(style: ImpactStyle = ImpactStyle.Light): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style });
    } else if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  } catch (_) {
    // Ignore haptic errors on unsupported hardware
  }
}

// Make haptic available via AppBridge
registerToBridge('haptic', () => { void haptic(); });
