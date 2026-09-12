import { safeInnerHTML } from './security';
import { registerToBridge } from './AppBridge';
import { invalidateCache, fmtRaw } from './utils';

const notifyRender = (): void => {};

export function animateCounters(): void {
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const target = parseFloat(el.dataset.count || '0');
    const duration = 600;
    const start = performance.now();
    const initial = 0;
    function tick(now: number): void {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = initial + (target - initial) * eased;
      el.textContent = fmtRaw(current, 0);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

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

let _ptrActive = false;
export function initPullToRefresh(): void {
  let startY = 0;
  const ptrEl = document.createElement('div');
  ptrEl.id = 'ptr-indicator';
  ptrEl.className = 'ptr-indicator';
  safeInnerHTML(
    ptrEl,
    '<span class="material-symbols-outlined ptr-spinner text-[#002b59] dark:text-blue-300" style="font-size:20px">refresh</span>'
  );
  document.body.appendChild(ptrEl);

  document.addEventListener(
    'touchstart',
    (e) => {
      if (window.scrollY === 0) startY = e.touches[0].clientY;
      else startY = 0;
    },
    { passive: true }
  );

  document.addEventListener(
    'touchmove',
    (e) => {
      if (startY === 0 || _ptrActive) return;
      const diff = e.touches[0].clientY - startY;
      if (diff > 60 && window.scrollY === 0) {
        ptrEl.classList.add('active');
      }
    },
    { passive: true }
  );

  document.addEventListener(
    'touchend',
    () => {
      if (ptrEl.classList.contains('active') && !_ptrActive) {
        _ptrActive = true;
        if (navigator.vibrate) navigator.vibrate(15);
        invalidateCache();
        notifyRender();
        ptrEl.classList.remove('active');
        _ptrActive = false;
      } else {
        ptrEl.classList.remove('active');
      }
      startY = 0;
    },
    { passive: true }
  );
}

export function haptic(ms = 10): void {
  if (navigator.vibrate) navigator.vibrate(ms);
}
registerToBridge('haptic', haptic);
