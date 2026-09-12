import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '../store/onboardingStore';
import { useI18n } from '../../../i18n/index';
import { useSettingsStore } from '../../../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';
import { db as DB } from '@/core/db/core';
import { CURRENCIES } from '../../../core/currency';
import { toast } from '../../../toast';
import { APP_VERSION } from '../../../core/constants';
import { parseNum, sanitizeNumericInput, sanitizeNameInput } from '../../../core/utils';

// --- STYLES & CONSTANTS ---
const ONBOARD_BG = [
  'from-[#001a38] via-[#002b59] to-[#1a4175]',
  'from-[#032e0a] via-[#0a4a12] to-[#1b6d24]',
  'from-[#3b0003] via-[#5e0006] to-[#88000e]',
  'from-[#5c2d00] via-[#92400e] to-[#d97706]'
];

const ONBOARD_ICONS = ['account_balance_wallet', 'insert_chart', 'emoji_events', 'rocket_launch'];

// --- SUB-COMPONENTS ---

function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const { t } = useI18n();
  
  useEffect(() => {
    const timer = setTimeout(onComplete, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#001a38] via-[#002b59] to-[#1a4175] flex flex-col items-center justify-center overflow-hidden">
      {/* Ambient Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-blue-400/[0.08] rounded-full blur-3xl -top-20 -right-20 animate-pulse"></div>
        <div className="absolute w-72 h-72 bg-emerald-400/[0.08] rounded-full blur-3xl -bottom-10 -left-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center animate-in zoom-in duration-1000">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/10 backdrop-blur-xl rounded-[1.75rem] flex items-center justify-center mb-5 sm:mb-6 shadow-2xl border border-white/10">
          <span className="material-symbols-outlined text-white text-4xl sm:text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-1.5 tracking-tight">{t('app.name')}</h1>
        <p className="text-blue-200/50 text-[10px] sm:text-xs font-medium tracking-[0.2em]">{t('app.subtitle')}</p>
        <div className="mt-8 sm:mt-10 flex gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-300/80 animate-bounce"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-blue-300/60 animate-bounce [animation-delay:0.2s]"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-blue-300/40 animate-bounce [animation-delay:0.4s]"></div>
        </div>
      </div>

      <p className="absolute bottom-5 sm:bottom-6 text-blue-300/20 text-[9px] font-bold tracking-widest uppercase">Premium Experience • V{APP_VERSION}</p>
    </div>
  );
}

function OnboardingSlides() {
  const { t, isLTR } = useI18n();
  const { slideIndex, nextSlide, setScreen } = useOnboardingStore();
  
  const isLast = slideIndex === 3;
  const bgClass = ONBOARD_BG[slideIndex];
  const icon = ONBOARD_ICONS[slideIndex];

  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${bgClass} flex flex-col overflow-hidden transition-all duration-700`}>
      {/* Ambient Blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-80 h-80 bg-white/5 rounded-full blur-3xl top-10 -right-20"></div>
        <div className="absolute w-60 h-60 bg-white/5 rounded-full blur-3xl -bottom-10 left-10"></div>
      </div>
      
      {/* Top bar: Skip + Dots */}
      <div className="flex justify-between items-center px-4 py-3 sm:px-5 sm:py-4 relative z-10 shrink-0">
        <button 
          onClick={() => setScreen('quickstart')}
          className="text-white/50 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors min-h-[36px] flex items-center"
        >
          {isLast ? '' : t('onboard.skip')}
        </button>
        <div className="flex gap-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === slideIndex ? 'bg-white w-8' : 'bg-white/20 w-1.5'}`}></div>
          ))}
        </div>
      </div>

      {/* Center Content: Icon + Title + Desc */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 relative z-10 animate-in slide-in-from-bottom-8 duration-500 min-h-0">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/10 backdrop-blur-sm rounded-[1.75rem] sm:rounded-[2rem] flex items-center justify-center mb-4 sm:mb-6 shadow-2xl border border-white/10 animate-pulse shrink-0">
          <span className="material-symbols-outlined text-white text-4xl sm:text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </div>
        <h2 className="text-lg sm:text-2xl font-black text-white mb-2 sm:mb-3 text-center leading-tight px-2">
          {t(`onboard.slide${slideIndex}.title`)}
        </h2>
        <p className="text-white/60 text-center text-xs sm:text-sm leading-relaxed max-w-[260px] sm:max-w-[300px] px-2">
          {t(`onboard.slide${slideIndex}.desc`)}
        </p>
      </div>

      {/* Bottom Action Button */}
      <div className="p-4 sm:p-5 relative z-10 shrink-0">
        <button 
          onClick={isLast ? () => setScreen('quickstart') : nextSlide}
          className={`w-full py-3.5 sm:py-4 rounded-[2rem] font-black text-xs sm:text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 ${
            isLast ? 'bg-white text-gray-900 shadow-xl shadow-black/20' : 'bg-white/15 text-white backdrop-blur-md border border-white/20'
          }`}
        >
          {isLast ? (
            <><span className="material-symbols-outlined text-sm sm:text-base">rocket_launch</span> {t('onboard.start')}</>
          ) : (
            <>{t('onboard.next')} <span className="material-symbols-outlined text-xs sm:text-sm">{isLTR ? 'arrow_forward' : 'arrow_back'}</span></>
          )}
        </button>
      </div>
    </div>
  );
}

function QuickStartWizard() {
  const { t, isLTR, setLang } = useI18n();
  const navigate = useNavigate();
  const { quickStartStep: step, nextQuickStep } = useOnboardingStore();
  
  // Reactive Settings
  const { 
    language: storeLang, 
    baseCurrency: storeCurrency, 
    numberSystem: storeNumSys, 
    decimalPlaces: storeDecimals, 
    numberSeparator: storeSeparator,
    theme: storeTheme 
  } = useSettingsStore(
    useShallow((s) => ({
      language: s.language,
      baseCurrency: s.baseCurrency,
      numberSystem: s.numberSystem,
      decimalPlaces: s.decimalPlaces,
      numberSeparator: s.numberSeparator,
      theme: s.theme
    }))
  );

  // Form State for Account (remains local until finish)
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<'bank' | 'cash' | 'ewallet' | 'crypto' | 'savings' | 'credit'>('bank');
  const [accBal, setAccBal] = useState('');

  const steps = [
    { id: 'lang', icon: 'language', title: 'onboard.qs.lang' },
    { id: 'curr', icon: 'payments', title: 'onboard.qs.currency' },
    { id: 'fmt', icon: 'format_list_numbered', title: 'onboard.qs.numbers' },
    { id: 'theme', icon: 'palette', title: 'onboard.qs.theme' },
    { id: 'acc', icon: 'account_balance_wallet', title: 'onboard.qs.account' },
    { id: 'ready', icon: 'check_circle', title: 'onboard.qs.welcome' }
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleFinish = async () => {
    // 1. Save Initial Account
    if (accName) {
      await DB.addAccount({
        name: accName,
        type: accType,
        balance: parseNum(accBal) || 0,
        currency: (await DB.getSetting('baseCurrency')) || 'SAR'
      });
    }

    // 2. Mark Onboarding Complete
    await DB.setSetting('hasOnboarded', true);
    useSettingsStore.getState().setHasOnboarded(true);
    
    // 3. Navigate Home
    navigate('/home');
    toast(t('onboard.qs.ready') || 'Ready!', 'success');
  };

  const handleUpdateSetting = async (key: string, val: unknown) => {
    await DB.setSetting(key, val);
    const store = useSettingsStore.getState();
    if (key === 'theme') store.setTheme(val === 'system' ? 'auto' : (val as 'light' | 'dark' | 'auto'));
    if (key === 'language') await setLang(String(val));
    if (key === 'baseCurrency') store.setBaseCurrency(String(val));
    if (key === 'numberSystem') store.setNumberSystem(val === 'eastern' || val === 'arab' ? 'arab' : 'latn');
    if (key === 'decimalPlaces') store.setDecimalPlaces(Math.min(2, Math.max(0, Number(val))) as 0 | 1 | 2);
    if (key === 'numberSeparator') store.setNumberSeparator(val === 'space' ? 'space_comma' : val === 'dot' ? 'dot_comma' : 'comma_dot');
  };

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #001a38 0%, #002b59 100%)' }}
    >
      {/* Ambient Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-72 h-72 bg-blue-500/[0.07] rounded-full blur-3xl -top-20 -right-10"></div>
        <div className="absolute w-56 h-56 bg-indigo-400/[0.07] rounded-full blur-3xl -bottom-10 -left-10"></div>
      </div>

      {/* Header: Sub-label + Title + Divider — Shrink-0 so it never gets squeezed out */}
      <div className="relative z-10 shrink-0 pt-[calc(1rem+env(safe-area-inset-top,0px))] sm:pt-5 px-4 sm:px-5 pb-2 text-center animate-in fade-in duration-300">
        <p className="text-blue-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] mb-0.5">
          {t('onboard.qs.sub') || 'Initial Configuration'}
        </p>
        <h2 className="text-lg sm:text-xl font-black text-white">{t(current.title)}</h2>
        <div className="w-10 h-0.5 bg-blue-500/30 rounded-full mx-auto mt-1.5"></div>
      </div>

      {/* Scrollable Content Area — Takes remaining space and scrolls internally */}
      <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-2 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="w-full max-w-sm mx-auto flex flex-col justify-center min-h-full py-2">

          {current.id === 'lang' && (
            <div className="grid grid-cols-1 gap-2 w-full">
              {['ar', 'en', 'fr', 'tr'].map(l => (
                <button 
                  key={l}
                  onClick={() => handleUpdateSetting('language', l)}
                  className={`w-full py-3 sm:py-3.5 px-4 sm:px-5 rounded-2xl bg-white/5 text-white font-black text-base border-2 transition-all flex items-center justify-between active:scale-[0.98] ${storeLang === l ? 'border-blue-400 bg-blue-400/10' : 'border-transparent'}`}
                >
                  <span>{l === 'ar' ? 'العربية' : l === 'en' ? 'English' : l === 'fr' ? 'Français' : 'Türkçe'}</span>
                  <span className="text-xl">{l === 'ar' ? '🇸🇦' : l === 'en' ? '🇺🇸' : l === 'fr' ? '🇫🇷' : '🇹🇷'}</span>
                </button>
              ))}
            </div>
          )}

          {current.id === 'curr' && (
            <div className="grid grid-cols-3 gap-2 w-full">
              {['SAR', 'EGP', 'USD', 'EUR', 'AED', 'KWD', 'QAR', 'OMR', 'BHD', 'JOD', 'LBP', 'TRY'].map(c => (
                <button 
                  key={c}
                  onClick={() => handleUpdateSetting('baseCurrency', c)}
                  className={`py-2.5 sm:py-3 rounded-2xl bg-white/5 text-white font-black text-xs border-2 transition-all active:scale-[0.97] ${storeCurrency === c ? 'border-blue-400 bg-blue-400/10' : 'border-transparent'}`}
                >
                  <div className="text-[10px] opacity-60 mb-0.5">{CURRENCIES[c]?.flag || ''}</div>
                  {c}
                </button>
              ))}
            </div>
          )}

          {current.id === 'fmt' && (
            <div className="space-y-2.5 w-full">
              <div className="bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/10">
                <p className="text-[9px] sm:text-[10px] text-blue-300 mb-1.5 uppercase tracking-widest font-black">{t('onboard.qs.numbers')}</p>
                <div className="flex gap-2">
                  <button onClick={() => handleUpdateSetting('numberSystem', 'latn')} className={`flex-1 py-2.5 rounded-xl bg-white/5 text-white font-black text-sm border-2 transition-all active:scale-[0.97] ${storeNumSys === 'latn' ? 'border-blue-400 bg-blue-400/10' : 'border-transparent'}`}>1,234.56</button>
                  <button onClick={() => handleUpdateSetting('numberSystem', 'arab')} className={`flex-1 py-2.5 rounded-xl bg-white/5 text-white font-black text-sm border-2 transition-all active:scale-[0.97] ${storeNumSys === 'arab' ? 'border-blue-400 bg-blue-400/10' : 'border-transparent'}`}>١،٢٣٤.٥٦</button>
                </div>
              </div>
              <div className="bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/10">
                <p className="text-[9px] sm:text-[10px] text-blue-300 mb-1.5 uppercase tracking-widest font-black">{t('onboard.qs.decimals')}</p>
                <div className="flex gap-2">
                  <button onClick={() => handleUpdateSetting('decimalPlaces', 0)} className={`flex-1 py-2.5 rounded-xl bg-white/5 text-white font-black text-sm border-2 transition-all active:scale-[0.97] ${storeDecimals === 0 ? 'border-blue-400 bg-blue-400/10' : 'border-transparent'}`}>1234</button>
                  <button onClick={() => handleUpdateSetting('decimalPlaces', 2)} className={`flex-1 py-2.5 rounded-xl bg-white/5 text-white font-black text-sm border-2 transition-all active:scale-[0.97] ${storeDecimals === 2 ? 'border-blue-400 bg-blue-400/10' : 'border-transparent'}`}>1234.56</button>
                </div>
              </div>
              <div className="bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/10">
                <p className="text-[9px] sm:text-[10px] text-blue-300 mb-1.5 uppercase tracking-widest font-black">{t('onboard.qs.separator') || 'Number Separator'}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleUpdateSetting('numberSeparator', 'comma_dot')} className={`py-2.5 rounded-xl bg-white/5 text-white font-black border-2 transition-all text-[11px] active:scale-[0.97] ${storeSeparator === 'comma_dot' ? 'border-blue-400 bg-blue-400/10' : 'border-transparent'}`}>1,234.56</button>
                  <button onClick={() => handleUpdateSetting('numberSeparator', 'dot_comma')} className={`py-2.5 rounded-xl bg-white/5 text-white font-black border-2 transition-all text-[11px] active:scale-[0.97] ${storeSeparator === 'dot_comma' ? 'border-blue-400 bg-blue-400/10' : 'border-transparent'}`}>1.234,56</button>
                  <button onClick={() => handleUpdateSetting('numberSeparator', 'space_comma')} className={`py-2.5 rounded-xl bg-white/5 text-white font-black border-2 transition-all text-[11px] active:scale-[0.97] ${storeSeparator === 'space_comma' ? 'border-blue-400 bg-blue-400/10' : 'border-transparent'}`}>1 234,56</button>
                  <button onClick={() => handleUpdateSetting('numberSeparator', 'none')} className={`py-2.5 rounded-xl bg-white/5 text-white font-black border-2 transition-all text-[11px] active:scale-[0.97] ${storeSeparator === 'none' ? 'border-blue-400 bg-blue-400/10' : 'border-transparent'}`}>1234.56</button>
                </div>
              </div>
            </div>
          )}

          {current.id === 'theme' && (
            <div className="grid grid-cols-1 gap-2.5 w-full">
              {['auto', 'light', 'dark'].map(th => (
                <button 
                  key={th}
                  onClick={() => handleUpdateSetting('theme', th)}
                  className={`w-full flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-white/5 text-white border-2 transition-all active:scale-[0.98] ${storeTheme === th ? 'border-blue-400 bg-blue-400/10' : 'border-transparent'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">
                      {th === 'auto' ? 'brightness_auto' : th === 'light' ? 'light_mode' : 'dark_mode'}
                    </span>
                    <span className="font-black text-xs uppercase tracking-widest">{t(`settings.theme${th.charAt(0).toUpperCase() + th.slice(1)}`)}</span>
                  </div>
                  {storeTheme === th && <span className="material-symbols-outlined text-blue-400 text-lg">check_circle</span>}
                </button>
              ))}
            </div>
          )}

          {current.id === 'acc' && (
            <div className="space-y-3 w-full">
              <div className="bg-white/5 p-4 sm:p-5 rounded-2xl border border-white/10 shadow-xl space-y-3">
                <div>
                  <p className="text-[9px] sm:text-[10px] text-blue-300 mb-1.5 uppercase tracking-widest font-black">{t('onboard.qs.accType')}</p>
                  <select 
                    value={accType}
                    onChange={e => setAccType(e.target.value as 'bank' | 'cash' | 'ewallet' | 'crypto' | 'savings' | 'credit')}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 sm:py-3 px-4 text-white font-black text-sm focus:outline-none focus:border-blue-400 transition-all appearance-none"
                  >
                    <option value="bank" className="text-black">🏦 {t('account.bank')}</option>
                    <option value="cash" className="text-black">💵 {t('account.cash')}</option>
                    <option value="ewallet" className="text-black">📱 {t('account.ewallet')}</option>
                  </select>
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] text-blue-300 mb-1.5 uppercase tracking-widest font-black">{t('onboard.qs.accName')}</p>
                  <input 
                    type="text" 
                    dir="auto"
                    autoComplete="off"
                    value={accName}
                    onChange={e => setAccName(sanitizeNameInput(e.target.value))}
                    onCompositionEnd={e => setAccName(sanitizeNameInput((e.target as HTMLInputElement).value))}
                    onBlur={e => setAccName(sanitizeNameInput(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 sm:py-3 px-4 text-white font-black text-sm focus:outline-none focus:border-blue-400 transition-all placeholder:text-white/20" 
                    placeholder={t('account.namePh')} 
                  />
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] text-blue-300 mb-1.5 uppercase tracking-widest font-black">{t('onboard.qs.accBalance')}</p>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    dir="ltr"
                    autoComplete="off"
                    value={accBal}
                    onChange={e => setAccBal(sanitizeNumericInput(e.target.value))}
                    onCompositionEnd={e => setAccBal(sanitizeNumericInput((e.target as HTMLInputElement).value))}
                    onBlur={e => setAccBal(sanitizeNumericInput(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 sm:py-3 px-4 text-white font-black text-sm focus:outline-none focus:border-blue-400 transition-all placeholder:text-white/20" 
                    placeholder="0.00" 
                  />
                </div>
              </div>
            </div>
          )}

          {current.id === 'ready' && (
            <div className="text-center space-y-4 sm:space-y-5 py-4 sm:py-6 animate-in zoom-in duration-500">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-green-500/20">
                <span className="material-symbols-outlined text-green-400 text-4xl sm:text-5xl">check_circle</span>
              </div>
              <p className="text-white/80 text-base sm:text-lg font-black leading-relaxed px-4">
                {t('onboard.qs.ready') || 'You are all set to start your financial journey!'}
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Footer: Next/Finish Button + Progress Dots — Always visible, never scrolls away */}
      <div className="relative z-10 shrink-0 px-4 sm:px-5 pt-2 pb-4 sm:pb-5">
        <div className="w-full max-w-sm mx-auto">
          <button 
            onClick={isLast ? handleFinish : nextQuickStep}
            className="w-full py-3.5 sm:py-4 rounded-[2.5rem] bg-white text-[#002b59] font-black text-sm sm:text-base shadow-2xl shadow-blue-500/10 flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <span>{isLast ? t('onboard.qs.finish') : t('onboard.next')}</span>
            <span className="material-symbols-outlined">{isLast ? 'rocket_launch' : isLTR ? 'arrow_forward' : 'arrow_back'}</span>
          </button>
          
          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mt-3 sm:mt-4">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 sm:w-10 bg-blue-400' : 'w-1.5 sm:w-2 bg-white/20'}`}></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * OnboardingFlow — الحاوية الرئيسية لشاشات التهيئة.
 *
 * تُغلِّف جميع شاشات التهيئة داخل طبقة ثابتة تملأ الشاشة بنسبة 100٪ (fixed inset-0)
 * مع معامل ترتيب رأسي عالٍ (z-[9999]) لضمان:
 *   1. ملء الشاشة الكاملة على جميع الأجهزة بدون أي تمرير خارجي.
 *   2. إخفاء الشريط العلوي والسفلي وزر الإجراءات العائم تماماً أثناء التهيئة.
 *   3. منع ظهور أي عنصر خلفي من خلال الطبقة.
 */
export function OnboardingFlow() {
  const { screen, setScreen } = useOnboardingStore();

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden touch-none"
      style={{ height: '100dvh', width: '100dvw' }}
      aria-modal="true"
      role="dialog"
      aria-label="Onboarding"
    >
      {/* Prevent any background interaction */}
      <div className="absolute inset-0 bg-[#001a38]" aria-hidden="true" />

      {/* Active Onboarding Screen */}
      <div className="absolute inset-0">
        {screen === 'splash' && <SplashScreen onComplete={() => setScreen('slides')} />}
        {screen === 'slides' && <OnboardingSlides />}
        {screen === 'quickstart' && <QuickStartWizard />}
      </div>
    </div>
  );
}
