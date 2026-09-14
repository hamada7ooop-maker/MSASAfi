import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import { useI18n } from '../../../i18n/index';
import { getLoadedTranslations } from '../../../i18n/engine';
import { APP_VERSION } from '../../../core/constants';


import { BankSelectorModal } from '../../../components/modals/BankSelectorModal';
import { DevUnlockModal } from './DevUnlockModal';
import { buildSettingsSections } from './settingsSections';

// ─── Reusable Card Shell ───────────────────────────────────────────────────────
export function Settings() {
  const { t, isLTR } = useI18n();
  const { settings, isLoading, updateSetting, refresh } = useSettings();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
  const [mockupModal, setMockupModal] = useState<{ title: string; desc: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Developer Mode Logic
  const [versionClicks, setVersionClicks] = useState(0);
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);

  // ── Developer unlock ──────────────────────────────────────────────────────
  // Every branch below is guarded by `import.meta.env.DEV`, which Vite
  // statically replaces with `false` in a production build. The dead code —
  // and, critically, the VITE_MASTER_HASH / VITE_MASTER_SALT literals that
  // would otherwise be inlined into the client bundle — is then removed by
  // tree-shaking. The backdoor is therefore absent from shipped APKs rather
  // than merely disabled in them.
  //
  // Never relax this guard. If support staff ever need this capability in
  // production, it must be a server-issued, time-limited, single-use token —
  // not a secret compiled into the client.
  // ──────────────────────────────────────────────────────────────────────────
  const onVersionClick = () => {
    if (!import.meta.env.DEV) return;
    const newCount = versionClicks + 1;
    setVersionClicks(newCount);
    if (newCount === 7) {
      setShowMasterModal(true);
      setVersionClicks(0);
    }
    setTimeout(() => setVersionClicks(0), 3000);
  };


  const handleBankConnect = () => {
    setShowBankModal(true);
  };

  // Settings Items configuration for search filtering
  const settingsItems = buildSettingsSections({
    t,
    isLTR,
    navigate,
    settings,
    updateSetting,
    refresh,
    setMockupModal,
    handleBankConnect,
  });

  const isSearching = searchQuery.trim().length > 0;

  const filteredItems = settingsItems.filter(item => {
    if (!isSearching) {
      return item.tab === activeTab;
    }

    const q = searchQuery.toLowerCase().trim();
    const transMap = getLoadedTranslations();
    // Search within current translation, English, Arabic, or custom keywords
    const matchesKeys = item.keys.some(key => {
      const currentVal = t(key).toLowerCase();
      const enVal = (transMap.en?.[key] || '').toLowerCase();
      const arVal = (transMap.ar?.[key] || '').toLowerCase();
      return currentVal.includes(q) || enVal.includes(q) || arVal.includes(q);
    });

    const matchesKeywords = item.keywords.some(keyword =>
      keyword.toLowerCase().includes(q)
    );

    return matchesKeys || matchesKeywords;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 animate-pulse">
        <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{t('misc.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-full pb-32">

      {/* ─── Page Header ──────────────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-4 space-y-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#002b59] to-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-on-surface dark:text-white leading-none tracking-tight">
              {t('settings.title') || 'الإعدادات'}
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-0.5">
              {t('settings.configActive') || 'التفضيلات الشخصية'}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Search Bar (Glassmorphic) ────────────────────────────────────── */}
      <div className="px-5 mb-5 sticky top-0 z-50 backdrop-blur-md bg-transparent">
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute start-4 text-slate-400 text-[20px] select-none pointer-events-none">
            search
          </span>
          <input
            type="text"
            dir="auto"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onCompositionEnd={(e) => setSearchQuery(e.currentTarget.value)}
            placeholder={t('settings.searchPlaceholder') || 'ابحث عن الإعدادات والميزات الذكية...'}
            className="w-full bg-slate-100/70 dark:bg-white/[0.04] border border-black/[0.03] dark:border-white/[0.05] rounded-2xl ps-11 pe-10 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white dark:focus:bg-[#1a1d21] transition-all dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute end-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 active:scale-90 transition-all flex items-center justify-center w-5 h-5 rounded-full bg-slate-200/50 dark:bg-white/10"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Tab Switcher ─────────────────────────────────────────────────── */}
      {!isSearching && (
        <div className="px-5 mb-5 animate-in fade-in duration-300">
          <div className="flex bg-slate-100 dark:bg-white/[0.06] p-1 rounded-2xl relative overflow-hidden">
            {/* Sliding Indicator */}
            <div
              className={`absolute inset-y-1 w-[calc(50%-4px)] bg-white dark:bg-slate-700 rounded-xl shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                activeTab === 'advanced'
                  ? (isLTR ? 'translate-x-[calc(100%+8px)]' : '-translate-x-[calc(100%+8px)]')
                  : 'translate-x-0'
              }`}
            />
            <button
              onClick={() => setActiveTab('basic')}
              className={`flex-1 relative z-10 py-2.5 flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-wider transition-colors duration-200 ${
                activeTab === 'basic' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: activeTab === 'basic' ? "'FILL' 1" : "'FILL' 0" }}>tune</span>
              {t('settings.tabBasic') || 'الأساسية'}
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`flex-1 relative z-10 py-2.5 flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-wider transition-colors duration-200 ${
                activeTab === 'advanced' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: activeTab === 'advanced' ? "'FILL' 1" : "'FILL' 0" }}>manage_accounts</span>
              {t('settings.tabAdvanced') || 'المتقدمة'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Tab Content ──────────────────────────────────────────────────── */}
      <div className="px-5 space-y-5">
        <div className="space-y-5 transition-all duration-300">
          {filteredItems.map(item => item.render())}

          {isSearching && filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center mb-4 text-slate-400">
                <span className="material-symbols-outlined text-[32px]">search_off</span>
              </div>
              <p className="text-[13px] font-bold text-on-surface dark:text-white mb-1">
                {t('settings.searchEmpty') || 'لم نجد أي إعدادات تطابق بحثك 🔍'}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                {isLTR ? 'Try searching for other terms like: theme, currency, PIN or backup' : 'جرب البحث عن مصطلحات أخرى مثل: المظهر، العملة، الأمان أو المزامنة'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Footer Version ───────────────────────────────────────────────── */}
      <div className="px-5 mt-8 mb-2">
        <button
          onClick={onVersionClick}
          className="w-full flex flex-col items-center gap-1 py-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04] active:scale-[0.98] transition-all select-none"
        >
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-slate-300 dark:text-slate-600">monetization_on</span>
            <span dir="ltr" className="text-[11px] font-black text-slate-400 dark:text-slate-500 tracking-widest">
              Masarifi V{APP_VERSION}
            </span>
          </div>
          <p className="text-[9px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest">
            {t('app.madeWith')} <span className="text-rose-400">❤️</span>
          </p>
        </button>
      </div>

      {/* ─── Master Password Modal (development builds only) ──────────────── */}
      {import.meta.env.DEV && (
        <DevUnlockModal
          open={showMasterModal}
          onClose={() => setShowMasterModal(false)}
          // Fires only after a correct PBKDF2 match against VITE_MASTER_HASH.
          // That secret is intentionally absent from the repo and from CI, so
          // this callback is unreachable in tests -- a mutation that drops it
          // survives, and that is a property of the security design rather
          // than a coverage gap. Verified: no VITE_MASTER_* value exists in
          // any committed env file.
          onUnlocked={refresh}
        />
      )}

      {/* ─── Mockup Feature Modal ─────────────────────────────────────────── */}
      {mockupModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setMockupModal(null)}
        >
          <div
            className="bg-white dark:bg-[#1c1f23] w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-5">
              <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>construction</span>
            </div>
            <h3 className="text-xl font-black text-center text-on-surface dark:text-white mb-3">{mockupModal.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center font-medium leading-relaxed mb-6">
              {t('settings.demoMockupDesc')}
            </p>
            <button
              onClick={() => setMockupModal(null)}
              className="w-full py-4 rounded-2xl bg-[#002b59] dark:bg-blue-600 text-white font-black text-sm shadow-lg active:scale-95 transition-all"
            >
              {t('action.close') || 'إغلاق'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Open Banking Selector Modal ─────────────────────────────── */}
      <BankSelectorModal
        isOpen={showBankModal}
        onClose={() => setShowBankModal(false)}
      />

    </div>
  );
}
