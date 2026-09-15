import { safeInnerHTML } from '../core/security';
import { db as DB } from './db/core';
import { t, isAppLTR, changeLanguage, LANGUAGE_META } from '../i18n/engine';
import { getConversionRate, silentFail } from '../core/utils';
import { springCss } from '../components/motion/tokens';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { useSettingsStore } from '../store/settingsStore';
import { useAppStore } from '../store/appStore';
import { CURRENCIES } from './currency';
import { toast } from '../toast';
import { Capacitor } from '@capacitor/core';
import { APP_VERSION } from './constants';

let onboardSlide = 0;

declare global {
  var triggerBiometricAuth: (() => Promise<void>) | undefined;
  var __isAuthenticating: boolean | undefined;
  var _ignoreNextResume: boolean | undefined;
  var nextOnboardSlide: (() => void) | undefined;
  var skipOnboarding: (() => Promise<void>) | undefined;
  var runQuickStartOnboarding: ((onComplete: () => void) => void) | undefined;
  var qs_setLang: ((l: string) => Promise<void>) | undefined;
  var qs_setCurr: ((c: string) => Promise<void>) | undefined;
  var qs_setNum: ((sys: 'latn' | 'arab') => Promise<void>) | undefined;
  var qs_setDec: ((d: 0 | 1 | 2) => Promise<void>) | undefined;
  var qs_setSep: ((sep: 'comma_dot' | 'dot_comma' | 'space_comma' | 'space_dot' | 'none') => Promise<void>) | undefined;
  var qs_setTheme: ((th: 'light' | 'dark' | 'auto') => Promise<void>) | undefined;
}

// ===== PIN PAGE =====
export function renderPinPage(): string {
  const useBiometric = useSettingsStore.getState().useBiometric;
  return `
  <div class="min-h-screen bg-gradient-to-br from-[#002b59] to-[#1a4175] flex flex-col items-center justify-center px-6">
    <div class="mb-8 text-center">
      <div class="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-xl border border-white/10 shadow-2xl">
        <span class="material-symbols-outlined text-white text-4xl">lock</span>
      </div>
      <h1 class="text-3xl font-black text-white mb-2">${t('app.name')}</h1>
      <p class="text-white/60 text-sm font-medium tracking-wide uppercase">${t('pin.title')}</p>
    </div>
    
    <div class="flex gap-4 mb-10">
      ${[0, 1, 2, 3].map((i) => `<div id="pin-dot-${i}" class="w-4 h-4 rounded-full bg-white/20 border border-white/10 shadow-inner transition-all duration-300"></div>`).join('')}
    </div>
    
    <p id="pin-error" class="text-red-300 text-sm mb-6 h-5 opacity-0 transition-opacity font-bold"></p>
    
    <div class="grid grid-cols-3 gap-4 w-72">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `
        <button aria-label="pin press" data-action="pin-press" data-value="${n}" class="h-16 rounded-[1.5rem] bg-white/10 text-white text-2xl font-bold hover:bg-white/20 active:scale-90 transition-all backdrop-blur-md border border-white/5 shadow-lg">${n}</button>
      `).join('')}
      
      ${useBiometric ? `
        <button aria-label="triggerBiometricAuth" id="biometric-login-btn" onclick="globalThis.triggerBiometricAuth()" class="h-16 rounded-[1.5rem] bg-blue-500/30 text-blue-200 text-3xl font-bold hover:bg-blue-500/50 active:scale-90 transition-all flex items-center justify-center border border-blue-400/20 shadow-lg shadow-blue-900/20">
          <span class="material-symbols-outlined text-3xl">fingerprint</span>
        </button>
      ` : `
        <button aria-label="pin press" data-action="pin-press" data-value="clear" class="h-16 rounded-[1.5rem] bg-white/5 text-white/40 text-xs font-bold hover:bg-white/10 transition-all uppercase tracking-widest">${t('pin.clear')}</button>
      `}
      
      <button aria-label="pin press" data-action="pin-press" data-value="0" class="h-16 rounded-[1.5rem] bg-white/10 text-white text-2xl font-bold hover:bg-white/20 active:scale-90 transition-all backdrop-blur-md border border-white/5 shadow-lg">0</button>
      
      <button aria-label="pin press" data-action="pin-press" data-value="back" class="h-16 rounded-[1.5rem] bg-white/5 text-white/50 hover:bg-white/10 transition-all flex items-center justify-center active:scale-90">
        <span class="material-symbols-outlined">backspace</span>
      </button>
    </div>
    
    ${useBiometric ? `
      <div class="mt-8">
        <button aria-label="triggerBiometricAuth" onclick="globalThis.triggerBiometricAuth()" class="text-blue-200/60 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
          <span class="material-symbols-outlined text-sm">security</span>
          ${t('onboard.useBiometric') || 'Tap to Unlock'}
        </button>
      </div>
    ` : ''}
  </div>`;
}

export function initBiometricAuth(renderApp: () => void, resetAutoLock: () => void): void {
  globalThis.triggerBiometricAuth = async () => {
    if (globalThis.__isAuthenticating) return;
    try {
      globalThis.__isAuthenticating = true;
      globalThis._ignoreNextResume = true;
      if (!Capacitor.isNativePlatform()) {
        silentFail('Biometrics only available on native platforms.')(new Error('not_native'));
        return;
      }
      const available = await NativeBiometric.isAvailable();
      if (available.isAvailable) {
        await NativeBiometric.verifyIdentity({
          reason: t('onboard.biometricReason'),
          title: t('onboard.loginTitle'),
          subtitle: '',
          description: ''
        });
        
        // Restore encryption key!
        const { secureGet } = await import('./secureStore');
        const pin = await secureGet('pin');
        if (pin) {
          const { db: DB_CORE } = await import('./db/core');
          const salt = (await DB_CORE.getSetting('pinSalt')) as string;
          // Unwrap the master data key — never re-derive it from the PIN.
          // Records are encrypted under a persistent key that the PIN merely
          // wraps; deriving here would install a key that does not match the
          // stored ciphertext. See core/security/vaultKey.ts.
          const { unlockVault } = await import('./security/vaultKey');
          const key = await unlockVault(pin, salt);
          if (!key) throw new Error('Failed to unwrap vault key after biometric auth.');
        } else {
          throw new Error('No PIN securely stored, fallback to manual entry.');
        }

        useAppStore.getState().setCurrentPage('home');
        renderApp();
        resetAutoLock();
        setTimeout(() => { 
          globalThis._ignoreNextResume = false;
          globalThis.__isAuthenticating = false;
        }, 2000);
      }
    } catch (e) {
      silentFail('Biometric auth failed or canceled')(e);
      setTimeout(() => { 
        globalThis._ignoreNextResume = false; 
        globalThis.__isAuthenticating = false;
      }, 1000);
      toast(t('onboard.biometricFallback'), 'info');
    }
  };
}

export async function renderCurrencyConfirmModal(detected: string): Promise<boolean> {
  const meta = CURRENCIES[detected] || { flag: '🌐', symbol: '' };
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-fadeIn';
  safeInnerHTML(overlay, `
    <div class="bg-white dark:bg-[#1e2124] rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-slideUp text-center border border-white/5">
      <div class="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <span class="text-5xl">${meta.flag}</span>
      </div>
      <h2 class="text-xl font-black mb-2 text-[#002b59] dark:text-blue-100">${t('currency.detectTitle') || 'Detected Currency'}</h2>
      <p class="text-sm text-on-surface-variant mb-8 leading-relaxed">
        ${t('currency.detectMsg', { code: detected, name: t(`currency.name.${detected}`) }) || `We detected your currency as <b>${detected}</b>. Is this correct?`}
      </p>
      <div class="flex flex-col gap-3">
        <button aria-label="Action Button" id="curr-confirm-yes" class="w-full py-4 rounded-2xl bg-[#002b59] text-white font-black text-base shadow-xl shadow-blue-900/20 active:scale-95 transition-all">
          ${t('action.confirm') || 'Yes, Proceed'}
        </button>
        <button aria-label="Action Button" id="curr-confirm-no" class="w-full py-4 rounded-2xl bg-slate-100 dark:bg-white/5 text-on-surface-variant font-bold text-sm active:scale-95 transition-all">
          ${t('currency.detectChange') || 'Change Manually'}
        </button>
      </div>
    </div>
  `);
  document.body.appendChild(overlay);

  return new Promise((resolve) => {
    overlay.querySelector('#curr-confirm-yes')?.addEventListener('click', () => {
      overlay.remove();
      resolve(true);
    });
    overlay.querySelector('#curr-confirm-no')?.addEventListener('click', () => {
      overlay.remove();
      resolve(false);
    });
  });
}

// ===== SPLASH SCREEN =====
export function renderSplashPage(renderApp: () => void): string {
  setTimeout(async () => {
    const hasOnboarded = await DB.getSetting('hasOnboarded');
    if (!hasOnboarded) {
      useAppStore.getState().setCurrentPage('onboarding');
    } else {
      const hasPin = (await DB.getSetting('pinHash')) || (await DB.getSetting('pin'));
      // Flag the vault as encrypted BEFORE the PIN screen appears, so any
      // write attempted while locked is refused rather than silently stored
      // in plaintext.
      const { setEncryptionRequired } = await import('./security/crypto');
      setEncryptionRequired(Boolean(hasPin));
      useAppStore.getState().setCurrentPage(hasPin ? 'pin' : 'home');
    }
    renderApp();
  }, 1800);
  return `
  <div class="min-h-screen bg-gradient-to-br from-[#001a38] via-[#002b59] to-[#1a4175] flex flex-col items-center justify-center relative overflow-hidden">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute w-96 h-96 bg-blue-400/[0.08] rounded-full blur-3xl -top-20 -right-20" style="animation:float 6s ease-in-out infinite"></div>
      <div class="absolute w-72 h-72 bg-emerald-400/[0.08] rounded-full blur-3xl -bottom-10 -left-10" style="animation:float 8s ease-in-out infinite 1s"></div>
      <div class="absolute w-64 h-64 bg-violet-400/[0.05] rounded-full blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style="animation:float 7s ease-in-out infinite 0.5s"></div>
    </div>
    <div class="relative z-10 flex flex-col items-center" style="animation:splashScale 0.8s ${springCss('smooth')}">
      <div class="w-28 h-28 bg-white/10 backdrop-blur-xl rounded-[1.75rem] flex items-center justify-center mb-8 shadow-2xl border border-white/10" style="animation:float 3s ease-in-out infinite">
        <span class="material-symbols-outlined text-white text-6xl" style="font-variation-settings:'FILL' 1">account_balance_wallet</span>
      </div>
      <h1 class="text-5xl font-black text-white mb-3 tracking-tight" style="animation:splashGlow 2s ease-in-out infinite">${t('app.name')}</h1>
      <p class="text-blue-200/50 text-sm font-medium tracking-[0.2em]">${t('app.subtitle')}</p>
      <div class="mt-12 flex gap-2">
        <div class="w-1.5 h-1.5 rounded-full bg-blue-300/80" style="animation:dotPulse 1.4s ease-in-out infinite"></div>
        <div class="w-1.5 h-1.5 rounded-full bg-blue-300/60" style="animation:dotPulse 1.4s ease-in-out infinite 0.2s"></div>
        <div class="w-1.5 h-1.5 rounded-full bg-blue-300/40" style="animation:dotPulse 1.4s ease-in-out infinite 0.4s"></div>
      </div>
    </div>
    <p class="absolute bottom-8 text-blue-300/20 text-[10px] font-bold tracking-widest">Masarifi V${APP_VERSION}</p>
  </div>`;
}

// ===== ONBOARDING =====
const ONBOARD_BG = [
  'from-[#001a38] via-[#002b59] to-[#1a4175]',
  'from-[#032e0a] via-[#0a4a12] to-[#1b6d24]',
  'from-[#3b0003] via-[#5e0006] to-[#88000e]',
  'from-[#5c2d00] via-[#92400e] to-[#d97706]',
];

const ONBOARD_ICONS = ['account_balance_wallet', 'insert_chart', 'emoji_events', 'rocket_launch'];
const ONBOARD_COUNT = ONBOARD_BG.length;

export function renderOnboardingPage(): string {
  const idx = onboardSlide;
  const s = { icon: ONBOARD_ICONS[idx], bg: ONBOARD_BG[idx] };
  const isLast = idx === ONBOARD_COUNT - 1;
  const sTitle = t(`onboard.slide${idx}.title`);
  const sDesc = t(`onboard.slide${idx}.desc`);
  const skipText = t('onboard.skip');
  const nextText = t('onboard.next');
  const startText = t('onboard.start');
  return `
  <div class="min-h-screen bg-gradient-to-br ${s.bg} flex flex-col relative overflow-hidden transition-colors duration-700">
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute w-80 h-80 bg-white/5 rounded-full blur-3xl top-10 -right-20"></div>
      <div class="absolute w-60 h-60 bg-white/5 rounded-full blur-3xl -bottom-10 left-10"></div>
    </div>
    <div class="flex justify-between items-center p-5 relative z-10">
      <button aria-label="onboard skip" data-action="onboard-skip" class="text-white/50 text-sm font-medium px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors">${isLast ? '' : skipText}</button>
      <div class="flex gap-2">${ONBOARD_BG.map((_, i) => `<div class="h-1.5 rounded-full transition-all duration-500 ${i === idx ? 'bg-white w-8' : 'bg-white/20 w-1.5'}"></div>`).join('')}</div>
    </div>
    <div class="flex-1 flex flex-col items-center justify-center px-10 relative z-10" style="animation:onboardSlide 0.5s ease-out">
      <div class="w-36 h-36 bg-white/10 backdrop-blur-sm rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl border border-white/10" style="animation:float 4s ease-in-out infinite">
        <span class="material-symbols-outlined text-white" style="font-size:80px;font-variation-settings:'FILL' 1">${s.icon}</span>
      </div>
      <h2 class="text-4xl font-black text-white mb-5 text-center leading-tight">${sTitle}</h2>
      <p class="text-white/60 text-center text-base leading-relaxed max-w-[280px]">${sDesc}</p>
    </div>
    <div class="p-6 pb-10 relative z-10">
      <button aria-label="${isLast ? 'onboard skip' : 'onboard next'}" data-action="${isLast ? 'onboard-skip' : 'onboard-next'}" class="w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${isLast ? 'bg-white text-gray-900 shadow-xl shadow-black/20' : 'bg-white/15 text-white backdrop-blur-sm border border-white/20'}">
        ${isLast ? `<span class="material-symbols-outlined">rocket_launch</span> ${startText}` : `${nextText} <span class="material-symbols-outlined text-sm">${isAppLTR() ? 'arrow_forward' : 'arrow_back'}</span>`}
      </button>
    </div>
  </div>`;
}

export function initOnboardingHandlers(renderApp: () => void, navigateTo: (page: string) => void): void {
  globalThis.nextOnboardSlide = function (): void {
    if (onboardSlide < ONBOARD_COUNT - 1) {
      onboardSlide++;
      renderApp();
    }
  };
  globalThis.skipOnboarding = async function (): Promise<void> {
    if (globalThis.runQuickStartOnboarding) {
      globalThis.runQuickStartOnboarding(() => {
        DB.setSetting('hasOnboarded', true);
        useSettingsStore.getState().setHasOnboarded(true);
        onboardSlide = 0;
        navigateTo('home');
      });
    }
  };

  globalThis.runQuickStartOnboarding = (onComplete: () => void): void => {
    let step = 0;
    const steps = [
      { id: 'lang', icon: 'language', title: 'onboard.qs.lang', stepKey: 'onboard.qs.step1' },
      { id: 'curr', icon: 'payments', title: 'onboard.qs.currency', stepKey: 'onboard.qs.step2' },
      { id: 'fmt', icon: 'format_list_numbered', title: 'onboard.qs.numbers', stepKey: 'onboard.qs.step3' },
      { id: 'theme', icon: 'palette', title: 'onboard.qs.theme', stepKey: 'onboard.qs.step4' },
      { id: 'acc', icon: 'account_balance_wallet', title: 'onboard.qs.account', stepKey: 'onboard.qs.step5' },
      { id: 'ready', icon: 'check_circle', title: 'onboard.qs.welcome', stepKey: '' }
    ];

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[2000] bg-slate-900 flex flex-col items-center justify-center p-8 transition-all duration-500 font-sans';
    overlay.style.background = 'linear-gradient(135deg, #001a38 0%, #002b59 100%)';
    document.body.appendChild(overlay);

    const renderStep = (): void => {
      const s = steps[step];
      const isLast = step === steps.length - 1;
      const settings = useSettingsStore.getState();

      let content = '';
      if (s.id === 'lang') {
        content = `
            <div class="grid grid-cols-1 gap-3 w-full">
                ${Object.entries(LANGUAGE_META || {
                  ar: { name: 'العربية', flag: '🇸🇦' },
                  en: { name: 'English', flag: '🇺🇸' },
                  fr: { name: 'Français', flag: '🇫🇷' },
                  tr: { name: 'Türkçe', flag: '🇹🇷' }
                }).slice(0, 4).map(([code, meta]) => `
                    <button aria-label="qs setLang" onclick="globalThis.qs_setLang('${code}')" class="w-full py-4 px-6 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-lg border-2 transition-all flex items-center justify-between ${settings.language === code ? 'border-blue-400 bg-blue-400/10' : 'border-transparent'}">
                        <span>${meta.name}</span>
                        <span class="text-2xl">${meta.flag}</span>
                    </button>
                `).join('')}
            </div>`;
      } else if (s.id === 'curr') {
        const list = ['SAR', 'EGP', 'USD', 'EUR', 'AED', 'KWD', 'QAR', 'OMR', 'BHD', 'JOD', 'LBP', 'TRY'];
        content = `
            <div class="grid grid-cols-3 gap-2 w-full max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                ${list.map((c) => `
                    <button aria-label="qs setCurr" onclick="globalThis.qs_setCurr('${c}')" class="py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm border-2 transition-all ${settings.baseCurrency === c ? 'border-blue-400 bg-blue-400/10' : 'border-transparent'}">
                        <div class="text-[10px] opacity-60 mb-1">${CURRENCIES[c]?.flag || ''}</div>
                        ${c}
                    </button>
                `).join('')}
            </div>`;
      } else if (s.id === 'fmt') {
        content = `
            <div class="space-y-4 w-full">
                <!-- Number System -->
                <div class="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <p class="text-[10px] text-blue-300 mb-3 uppercase tracking-widest font-black">${t('onboard.qs.numbers')}</p>
                    <div class="flex gap-2">
                        <button aria-label="qs setNum" onclick="globalThis.qs_setNum('latn')" class="flex-1 py-3 rounded-xl bg-white/5 text-white font-black border-2 transition-all ${settings.numberSystem === 'latn' ? 'border-blue-400 bg-blue-400/10' : 'border-transparent'}">1,234.56</button>
                        <button aria-label="qs setNum" onclick="globalThis.qs_setNum('arab')" class="flex-1 py-3 rounded-xl bg-white/5 text-white font-black border-2 transition-all ${settings.numberSystem === 'arab' ? 'border-blue-400 bg-blue-400/10' : 'border-transparent'}">١،٢٣٤.٥٦</button>
                    </div>
                </div>
                <!-- Decimals -->
                <div class="bg-white/5 p-4 rounded-2xl border border-white/10">
                   <p class="text-[10px] text-blue-300 mb-3 uppercase tracking-widest font-black">${t('onboard.qs.decimals')}</p>
                   <div class="flex gap-2">
                        <button aria-label="qs setDec" onclick="globalThis.qs_setDec(0)" class="flex-1 py-3 rounded-xl bg-white/5 text-white font-black border-2 transition-all ${settings.decimalPlaces === 0 ? 'border-blue-400 bg-blue-400/10' : 'border-transparent'}">1234</button>
                        <button aria-label="qs setDec" onclick="globalThis.qs_setDec(2)" class="flex-1 py-3 rounded-xl bg-white/5 text-white font-black border-2 transition-all ${settings.decimalPlaces === 2 ? 'border-blue-400 bg-blue-400/10' : 'border-transparent'}">1234.56</button>
                   </div>
                </div>
                <!-- Separator -->
                <div class="bg-white/5 p-4 rounded-2xl border border-white/10">
                   <p class="text-[10px] text-blue-300 mb-3 uppercase tracking-widest font-black">${t('onboard.qs.separator')}</p>
                   <div class="grid grid-cols-2 gap-2">
                        <button aria-label="qs setSep" onclick="globalThis.qs_setSep('comma_dot')" class="py-3 rounded-xl bg-white/5 text-white font-black border-2 text-[10px] transition-all ${settings.numberSeparator === 'comma_dot' ? 'border-blue-400 bg-blue-400/10' : 'border-transparent'}">1,000.00</button>
                        <button aria-label="qs setSep" onclick="globalThis.qs_setSep('dot_comma')" class="py-3 rounded-xl bg-white/5 text-white font-black border-2 text-[10px] transition-all ${settings.numberSeparator === 'dot_comma' ? 'border-blue-400 bg-blue-400/10' : 'border-transparent'}">1.000,00</button>
                   </div>
                </div>
            </div>`;
      } else if (s.id === 'theme') {
        content = `
            <div class="grid grid-cols-1 gap-3 w-full">
                <button aria-label="qs setTheme" onclick="globalThis.qs_setTheme('auto')" class="w-full flex items-center justify-between p-5 rounded-2xl bg-white/5 text-white border-2 transition-all ${settings.theme === 'auto' ? 'border-blue-400 bg-blue-400/10' : 'border-transparent'}">
                   <div class="flex items-center gap-4"><span class="material-symbols-outlined text-slate-400">brightness_auto</span><span class="font-bold">${t('settings.themeAuto')}</span></div>
                   ${settings.theme === 'auto' ? '<span class="material-symbols-outlined text-blue-400">check_circle</span>' : ''}
                </button>
                <button aria-label="qs setTheme" onclick="globalThis.qs_setTheme('light')" class="w-full flex items-center justify-between p-5 rounded-2xl bg-white/5 text-white border-2 transition-all ${settings.theme === 'light' ? 'border-blue-400 bg-blue-400/10' : 'border-transparent'}">
                   <div class="flex items-center gap-4"><span class="material-symbols-outlined text-amber-400">light_mode</span><span class="font-bold">${t('settings.themeLight')}</span></div>
                   ${settings.theme === 'light' ? '<span class="material-symbols-outlined text-blue-400">check_circle</span>' : ''}
                </button>
                <button aria-label="qs setTheme" onclick="globalThis.qs_setTheme('dark')" class="w-full flex items-center justify-between p-5 rounded-2xl bg-white/5 text-white border-2 transition-all ${settings.theme === 'dark' ? 'border-blue-400 bg-blue-400/10' : 'border-transparent'}">
                   <div class="flex items-center gap-4"><span class="material-symbols-outlined text-indigo-400">dark_mode</span><span class="font-bold">${t('settings.themeDark')}</span></div>
                   ${settings.theme === 'dark' ? '<span class="material-symbols-outlined text-blue-400">check_circle</span>' : ''}
                </button>
            </div>`;
      } else if (s.id === 'acc') {
        content = `
            <div class="space-y-4 w-full animate-fadeIn">
                <div class="bg-white/5 p-5 rounded-[2rem] border border-white/10 shadow-xl">
                    <div class="mb-4">
                        <p class="text-[10px] text-blue-300 mb-2 uppercase tracking-widest font-black">${t('onboard.qs.accType')}</p>
                        <select id="qs-acc-type" class="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:border-blue-400 transition-all">
                            <option value="bank" style="color:black">🏦 ${t('account.bank')}</option>
                            <option value="cash" style="color:black">💵 ${t('account.cash')}</option>
                            <option value="ewallet" style="color:black">📱 ${t('account.ewallet')}</option>
                            <option value="crypto" style="color:black">🪙 ${t('account.crypto')}</option>
                        </select>
                    </div>
                    <div class="mb-4">
                        <p class="text-[10px] text-blue-300 mb-2 uppercase tracking-widest font-black">${t('onboard.qs.accName')}</p>
                        <input type="text" id="qs-acc-name" class="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:border-blue-400 transition-all" placeholder="${t('account.namePh')}" />
                    </div>
                    <div>
                        <p class="text-[10px] text-blue-300 mb-2 uppercase tracking-widest font-black">${t('onboard.qs.accBalance')}</p>
                        <input type="number" id="qs-acc-bal" step="0.01" class="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:border-blue-400 transition-all" placeholder="0.00" />
                    </div>
                </div>
            </div>`;
      } else if (s.id === 'ready') {
        content = `
            <div class="text-center space-y-6 py-4">
                <div class="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
                    <span class="material-symbols-outlined text-green-400" style="font-size:48px">check_circle</span>
                </div>
                <p class="text-white/80 text-lg font-medium leading-relaxed">${t('onboard.qs.ready')}</p>
            </div>`;
      }

      safeInnerHTML(overlay, `
            <div class="flex-1 flex flex-col items-center justify-center w-full max-w-sm animate-fadeIn">
                <div class="mb-4 text-center">
                    <p class="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">${t(s.stepKey) || ''}</p>
                    <h2 class="text-3xl font-black text-white mb-2">${t(s.title)}</h2>
                    <p class="text-white/40 text-sm">${t('onboard.qs.sub')}</p>
                </div>
                
                <div class="w-full mt-8">
                    ${content}
                </div>
            </div>
            
            <div class="w-full max-w-sm mt-10">
                <button aria-label="Action Button" id="qs-next" class="w-full py-5 rounded-2xl bg-white text-[#002b59] font-black text-lg shadow-2xl shadow-blue-500/10 flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <span>${isLast ? t('onboard.qs.finish') : t('onboard.next')}</span>
                    <span class="material-symbols-outlined">${isLast ? 'rocket_launch' : isAppLTR() ? 'arrow_forward' : 'arrow_back'}</span>
                </button>
                <div class="flex justify-center gap-2 mt-8">
                    ${steps.map((_, i) => `<div class="h-1 rounded-full transition-all duration-300 ${i === step ? 'w-10 bg-blue-400' : 'w-2 bg-white/20'}"></div>`).join('')}
                </div>
            </div>
        `);

      const nextBtn = overlay.querySelector<HTMLButtonElement>('#qs-next');
      if (nextBtn) {
        nextBtn.onclick = async () => {
          if (s.id === 'acc') {
            const aNameInput = document.getElementById('qs-acc-name') as HTMLInputElement | null;
            const aTypeInput = document.getElementById('qs-acc-type') as HTMLSelectElement | null;
            const aBalInput = document.getElementById('qs-acc-bal') as HTMLInputElement | null;
            const aName = aNameInput?.value;
            const aType = aTypeInput?.value;
            const aBal = parseFloat(aBalInput?.value || '0') || 0;
            if (aName) {
              const normalizedBal = aBal / getConversionRate();
              await DB.addAccount({
                name: aName,
                type: (aType || 'bank') as 'bank' | 'cash' | 'ewallet' | 'crypto',
                balance: normalizedBal,
                initialBalance: normalizedBal,
                currency: useSettingsStore.getState().baseCurrency
              });
            }
          }
          if (isLast) {
            overlay.classList.add('opacity-0', 'scale-95');

            // Prevent old content from peaking through while overlay fades
            const appEl = document.getElementById('app');
            if (appEl) appEl.style.opacity = '0';

            onComplete();

            setTimeout(() => {
              overlay.remove();
              if (appEl) appEl.style.opacity = '1';
            }, 500);
          } else {
            step++;
            renderStep();
          }
        };
      }
    };

    renderStep();

    // QS State Helpers
    globalThis.qs_setLang = async (l: string) => {
      await changeLanguage(l);
      useSettingsStore.getState().setLang(l as import('@/types').LanguageCode);
      renderStep();
    };
    globalThis.qs_setCurr = async (c: string) => {
      await DB.setSetting('baseCurrency', c);
      useSettingsStore.getState().setBaseCurrency(c);
      renderStep();
    };
    globalThis.qs_setNum = async (sys: 'latn' | 'arab') => {
      await DB.setSetting('numberSystem', sys);
      useSettingsStore.getState().setNumberSystem(sys);
      renderStep();
    };
    globalThis.qs_setDec = async (d: 0 | 1 | 2) => {
      await DB.setSetting('decimalPlaces', d);
      useSettingsStore.getState().setDecimalPlaces(d);
      renderStep();
    };
    globalThis.qs_setSep = async (sep: 'comma_dot' | 'dot_comma' | 'space_comma' | 'space_dot' | 'none') => {
      await DB.setSetting('numberSeparator', sep);
      useSettingsStore.getState().setNumberSeparator(sep);
      renderStep();
    };
    globalThis.qs_setTheme = async (th: 'light' | 'dark' | 'auto') => {
      await DB.setSetting('theme', th);
      useSettingsStore.getState().setTheme(th);
      renderStep();
    };
  };
}
