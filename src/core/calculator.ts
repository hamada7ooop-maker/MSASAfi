import { safeInnerHTML } from './security';
import { registerToBridge } from './AppBridge';
import { t } from '../i18n/engine';
import { evaluateExpression } from './calcEngine';
import { useSettingsStore } from '../store/settingsStore';
import { CURRENCIES, CURRENCY_RATES } from './currency';

let targetInputId: string | null = null;
let expression = '';

export function openCalculator(inputId?: string): void {
  targetInputId = inputId || null;
  expression = '';
  renderCalculator();
}

function renderCalculator(): void {
  const existing = document.getElementById('global-calc');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'global-calc';
  modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4';
  safeInnerHTML(
    modal,
    `
    <div class="bg-white dark:bg-[#1e2124] rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-pageSlideUp">
      <!-- Header -->
      <div class="p-6 pb-2 flex justify-between items-center">
        <h3 class="font-black text-[#002b59] dark:text-blue-200">${t('calc.title')}</h3>
        <button aria-label="Close Calculator" data-action="calc-close" class="p-2 bg-slate-100 dark:bg-white/5 rounded-full"><span class="material-symbols-outlined text-sm">close</span></button>
      </div>

      <!-- Display -->
      <div class="px-6 py-4 pb-2">
        <div class="bg-slate-50 dark:bg-black/20 rounded-3xl p-6 text-right border border-slate-100 dark:border-white/5">
          <div id="calc-exp" class="text-xs text-slate-400 font-bold h-4 overflow-hidden mb-1">${expression || ''}</div>
          <div id="calc-result" class="text-3xl font-black text-[#002b59] dark:text-white truncate">0</div>
        </div>
      </div>

      <!-- Currency Converter -->
      <div class="px-6 pb-4">
        <div class="bg-slate-50 dark:bg-black/20 rounded-xl p-2 flex items-center justify-between gap-1 border border-slate-100 dark:border-white/5">
          <select id="calc-from-curr" class="bg-transparent border-none text-xs font-bold dark:text-white focus:outline-none w-full max-w-[80px]">
             ${Object.keys(CURRENCIES || { USD: 1, SAR: 1 })
               .map((c) => `<option value="${c}" ${c === 'USD' ? 'selected' : ''}>${c}</option>`)
               .join('')}
          </select>
          <button aria-label="Action Button" id="calc-btn-convert" class="p-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0 hover:scale-110 active:scale-95 transition-transform"><span class="material-symbols-outlined text-sm">sync_alt</span></button>
          <select id="calc-to-curr" class="bg-transparent border-none text-xs font-bold dark:text-white focus:outline-none w-full max-w-[80px]" dir="ltr">
             ${Object.keys(CURRENCIES || { USD: 1, SAR: 1 })
               .map(
                 (c) =>
                   `<option value="${c}" ${
                     c === (useSettingsStore.getState().baseCurrency || 'SAR') ? 'selected' : ''
                   }>${c}</option>`
               )
               .join('')}
          </select>
        </div>
      </div>

      <!-- Keys Grid -->
      <div class="px-6 pb-4 grid grid-cols-4 gap-3">
        ${renderKey('C', 'text-red-500 bg-red-50 dark:bg-red-500/10')}
        ${renderKey('(', 'bg-surface-container-low text-on-surface-variant')}
        ${renderKey(')', 'bg-surface-container-low text-on-surface-variant')}
        ${renderKey('/', 'text-blue-500 bg-blue-50 dark:bg-blue-500/10')}

        ${renderKey('7', 'bg-white dark:bg-[#2a2d30] shadow-sm')}
        ${renderKey('8', 'bg-white dark:bg-[#2a2d30] shadow-sm')}
        ${renderKey('9', 'bg-white dark:bg-[#2a2d30] shadow-sm')}
        ${renderKey('*', 'text-blue-500 bg-blue-50 dark:bg-blue-500/10')}

        ${renderKey('4', 'bg-white dark:bg-[#2a2d30] shadow-sm')}
        ${renderKey('5', 'bg-white dark:bg-[#2a2d30] shadow-sm')}
        ${renderKey('6', 'bg-white dark:bg-[#2a2d30] shadow-sm')}
        ${renderKey('-', 'text-blue-500 bg-blue-50 dark:bg-blue-500/10')}

        ${renderKey('1', 'bg-white dark:bg-[#2a2d30] shadow-sm')}
        ${renderKey('2', 'bg-white dark:bg-[#2a2d30] shadow-sm')}
        ${renderKey('3', 'bg-white dark:bg-[#2a2d30] shadow-sm')}
        ${renderKey('+', 'text-blue-500 bg-blue-50 dark:bg-blue-500/10')}

        ${renderKey('±', 'bg-white dark:bg-[#2a2d30] shadow-sm font-light')}
        ${renderKey('0', 'bg-white dark:bg-[#2a2d30] shadow-sm')}
        ${renderKey('.', 'bg-white dark:bg-[#2a2d30] shadow-sm')}
        ${renderKey('%', 'bg-white dark:bg-[#2a2d30] shadow-sm font-light')}
        
        <div class="col-span-4">${renderKey('=', 'bg-[#002b59] text-white w-full h-12')}</div>
      </div>

      <!-- Apply Button -->
      <div class="px-6 pb-8">
        <button aria-label="Action Button" id="calc-apply" class="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
          <span class="material-symbols-outlined">check_circle</span>
          ${t('calc.apply')}
        </button>
      </div>
    </div>
  `
  );

  document.body.appendChild(modal);

  modal.querySelector<HTMLButtonElement>('[data-action="calc-close"]')?.addEventListener('click', () => {
    modal.remove();
  });

  modal.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.key) handleInput(btn.dataset.key);
    });
  });

  modal.querySelector<HTMLButtonElement>('#calc-apply')?.addEventListener('click', () => {
    const val = document.getElementById('calc-result')?.textContent || '0';
    if (targetInputId) {
      const target = document.getElementById(targetInputId) as HTMLInputElement | null;
      if (target) {
        target.value = val;
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    modal.remove();
  });

  const btnConvert = modal.querySelector<HTMLButtonElement>('#calc-btn-convert');
  if (btnConvert) {
    btnConvert.addEventListener('click', () => {
      const fromCur = (document.getElementById('calc-from-curr') as HTMLSelectElement | null)?.value || 'USD';
      const toCur = (document.getElementById('calc-to-curr') as HTMLSelectElement | null)?.value || 'SAR';
      const fromRate = CURRENCY_RATES[fromCur] || 1;
      const toRate = CURRENCY_RATES[toCur] || 1;

      try {
        const currentVal = evaluateExpression(expression || '0');
        const converted = (currentVal / fromRate) * toRate;
        expression = String(Math.round(converted * 100) / 100);
        const expEl = document.getElementById('calc-exp');
        const resEl = document.getElementById('calc-result');
        if (expEl) expEl.textContent = expression;
        if (resEl) resEl.textContent = expression;
      } catch (_) {
        // Calculation error ignored
      }
    });
  }
}

function renderKey(key: string, classes?: string): string {
  let content = key;
  if (key === '*') content = '×';
  if (key === '/') content = '÷';
  const isAction = ['C', '(', ')', '/', '*', '-', '+', '=', '±', '%'].includes(key);
  const baseClasses =
    classes ||
    (isAction
      ? 'text-[#002b59] dark:text-blue-200'
      : 'text-[#002b59] dark:text-[#f8fafc] dark:bg-[#2a2d30]');

  return `<button aria-label="Action Button" data-key="${key}" class="${baseClasses} h-14 rounded-2xl flex items-center justify-center text-lg font-bold hover:opacity-80 active:scale-90 transition-all select-none">${content}</button>`;
}

function handleInput(key: string): void {
  const resEl = document.getElementById('calc-result');
  const expEl = document.getElementById('calc-exp');

  if (key === 'C') {
    expression = '';
  } else if (key === '±') {
    if (expression.startsWith('-')) expression = expression.slice(1);
    else expression = '-' + expression;
  } else if (key === '%') {
    try {
      const val = evaluateExpression(expression);
      expression = String(val / 100);
    } catch (_) {
      // Percentage error ignored
    }
  } else if (key === '=') {
    try {
      const result = evaluateExpression(expression);
      expression = String(Math.round(result * 100) / 100);
    } catch (_) {
      if (resEl) resEl.textContent = 'Error';
      return;
    }
  } else {
    // Avoid double operators
    if (
      ['+', '-', '*', '/', '%'].includes(key) &&
      ['+', '-', '*', '/', '%'].includes(expression.slice(-1))
    ) {
      expression = expression.slice(0, -1) + key;
    } else {
      expression += key;
    }
  }

  if (expEl) expEl.textContent = expression;
  try {
    const live = evaluateExpression(expression);
    if (resEl) resEl.textContent = Number.isFinite(live) ? String(Math.round(live * 100) / 100) : '0';
  } catch (_) {
    if (!expression && resEl) resEl.textContent = '0';
  }
}

registerToBridge('openCalculator', openCalculator);
