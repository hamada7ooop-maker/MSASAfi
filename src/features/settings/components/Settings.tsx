import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import { useI18n } from '../../../i18n/index';
import { toast } from '../../../toast';
import { translations } from '../../../translations.js';
import { APP_VERSION } from '../../../core/constants';
import { useSettingsStore } from '../../../store/settingsStore';
import { useAppStore } from '../../../store/appStore';
import { db as DB } from '@/core/db/core';
import { timingSafeEqual } from '@/core/security/crypto';


import { GeneralSettingsCard } from './cards/GeneralSettingsCard';
import { SalaryStructureCard } from './cards/SalaryStructureCard';
import { SecurityCard } from './cards/SecurityCard';
import { BackupSyncCard } from './cards/BackupSyncCard';
import { AdvancedAPICard } from './cards/AdvancedAPICard';
import { SupportActionsCard } from './cards/SupportActionsCard';
import { PushNotificationsCard } from './cards/PushNotificationsCard';
import { AutoClassificationCard } from './cards/AutoClassificationCard';
import { FinancialYearCard } from './cards/FinancialYearCard';
import { BankSelectorModal } from '../../../components/modals/BankSelectorModal';

// ─── Reusable Card Shell ───────────────────────────────────────────────────────
function SettingsCard({
  icon,
  iconColor,
  label,
  sublabel,
  badge,
  onClick,
  isLTR,
  children,
}: {
  icon: string;
  iconColor: string;
  label: string;
  sublabel?: string;
  badge?: string;
  onClick?: () => void;
  isLTR?: boolean;
  children?: React.ReactNode;
}) {
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] active:bg-slate-100 dark:active:bg-white/[0.05] transition-colors group text-start"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-on-surface dark:text-white leading-tight truncate">{label}</p>
            {sublabel && <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">{sublabel}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ms-3">
          {badge && <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">{badge}</span>}
          <span className={`material-symbols-outlined text-slate-300 dark:text-slate-600 text-[18px] transition-transform ${isLTR ? 'group-hover:translate-x-0.5' : 'group-hover:-translate-x-0.5'}`}>
            {isLTR ? 'chevron_right' : 'chevron_left'}
          </span>
        </div>
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-on-surface dark:text-white leading-tight">{label}</p>
          {sublabel && <p className="text-[10px] text-slate-400 font-medium mt-0.5">{sublabel}</p>}
        </div>
      </div>
      {children && <div className="shrink-0 ms-3">{children}</div>}
    </div>
  );
}

// ─── Section Group Container ───────────────────────────────────────────────────
function SectionGroup({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`animate-in slide-in-from-bottom-4 duration-500 ${className}`}>
      {title && (
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 px-1 mb-2">
          {title}
        </p>
      )}
      <div className="bg-surface-container-lowest dark:bg-[#1a1d21] rounded-[1.75rem] overflow-hidden border border-black/[0.04] dark:border-white/[0.06] shadow-sm divide-y divide-slate-100/70 dark:divide-white/[0.04]">
        {children}
      </div>
    </div>
  );
}

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
  const [masterPass, setMasterPass] = useState('');

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

  const handleMasterPass = async () => {
    if (!import.meta.env.DEV) return;

    const targetHash = import.meta.env.VITE_MASTER_HASH as string | undefined;
    const salt = import.meta.env.VITE_MASTER_SALT as string | undefined;

    if (!targetHash || !salt || !masterPass.trim()) {
      toast(t('common.error'), 'error');
      setShowMasterModal(false);
      setMasterPass('');
      return;
    }

    try {
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(masterPass),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: enc.encode(salt), iterations: 600000, hash: 'SHA-256' },
        keyMaterial,
        256
      );
      const inputHash = Array.from(new Uint8Array(bits))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Constant-time: `===` on strings short-circuits at the first differing
      // byte, which leaks how much of the secret was guessed correctly.
      if (timingSafeEqual(inputHash, targetHash)) {
        await DB.recordAction('DEV_UNLOCK', 'Developer master unlock used');
        await unlockEverything();
        setShowMasterModal(false);
        setMasterPass('');
        toast(t('settings.masterSuccess'), 'success');
      } else {
        await DB.recordAction('DEV_UNLOCK_FAILED', 'Developer master unlock attempt failed');
        toast(t('common.error'), 'error');
        setMasterPass('');
      }
    } catch {
      toast(t('common.error'), 'error');
      setMasterPass('');
    }
  };

  const unlockEverything = async () => {
    const ALL_PERKS = ['perk:ai-pro', 'perk:icon-pack', 'perk:widget-unlock'];
    const ALL_THEMES = [
      'palette:soft', 'palette:cool', 'palette:sepia', 'palette:rose', 'palette:lavender', 'palette:sage',
      'palette:black', 'palette:midnight', 'palette:oled', 'palette:royal-gold', 'palette:aurora', 'palette:crimson', 'palette:forest', 'palette:vantablack'
    ];
    const ALL_MILESTONES = [
      'first_txn', 'first_acc', 'first_goal', 'first_debt', 'first_bill',
      'first_budget', 'first_chall', 'first_inv', 'first_recur', 'first_rep',
      'first_ai', 'first_theme', 'first_cat', 'first_backup', 'first_sync', 'first_mem'
    ];

    const store = useSettingsStore.getState();
    const appStore = useAppStore.getState();

    const points = 99999;
    await DB.setSetting('userPoints', points);
    appStore.setUserPoints(points);

    const allUnlocked = [...ALL_PERKS, ...ALL_THEMES];
    await DB.setSetting('unlockedRewards', allUnlocked);
    store.setUnlockedItems(allUnlocked);

    await DB.setSetting('completedMilestones', ALL_MILESTONES);
    store.setCompletedMilestones(ALL_MILESTONES);

    const tenYears = 10 * 365 * 24 * 60 * 60 * 1000;
    const expiry = Date.now() + tenYears;
    await DB.setSetting('aiPremiumUntil', expiry);
    store.setAiPremiumUntil(expiry);

    refresh();
  };

  const handleBankConnect = () => {
    setShowBankModal(true);
  };

  // Settings Items configuration for search filtering
  const settingsItems = [
    // --- BASIC TAB ---
    {
      id: 'general',
      tab: 'basic',
      keys: [
        'settings.sectionGeneral', 'settings.language', 'settings.theme', 
        'settings.palette', 'settings.sectionNumbers', 'settings.currency', 
        'settings.currencyDisplay', 'settings.numbers', 'settings.decimals', 
        'settings.separator', 'settings.sectionCalendar', 'settings.startOfMonth', 
        'settings.firstDayOfWeek', 'settings.sectionAppearance', 'settings.fontSize', 
        'settings.sectionProductivity', 'settings.shakeToBlur', 'settings.simpleMode', 
        'settings.hourlyRatePh', 'settings.notifications'
      ],
      keywords: [
        'general', 'language', 'theme', 'palette', 'currency', 'numbers', 
        'calendar', 'appearance', 'font', 'productivity', 'shake', 'hourly', 'notifications',
        'عام', 'اللغة', 'السمة', 'الألوان', 'الأرقام', 'العملة', 'التقويم', 'الخط', 'الإنتاجية', 'الإشعارات'
      ],
      render: () => <GeneralSettingsCard key="general" settings={settings} updateSetting={updateSetting} />
    },
    {
      id: 'salary',
      tab: 'basic',
      keys: ['settings.salaryTitle', 'settings.salaryBasic', 'settings.salaryNet'],
      keywords: [
        'salary', 'allowances', 'deductions', 'structure', 
        'الراتب', 'هيكل الراتب', 'البدلات', 'الخصومات', 'صافي الراتب'
      ],
      render: () => <SalaryStructureCard key="salary" settings={settings} updateSetting={updateSetting} />
    },
    {
      id: 'security',
      tab: 'basic',
      keys: ['settings.sectionAccount', 'settings.appLock', 'settings.appLockPin', 'settings.disableLock', 'settings.securityTitle', 'settings.pinLocked', 'settings.security'],
      keywords: [
        {
          ar: 'أمان',
          en: 'security'
        }?.en || 'security',
        'privacy', 'lock', 'pin', 'biometric', 'encryption', 'incognito', 
        'أمان', 'خصوصية', 'قفل', 'بصمة', 'تشفير', 'تخفي'
      ],
      render: () => <SecurityCard key="security" settings={settings} updateSetting={updateSetting} refreshSettings={refresh} />
    },
    {
      id: 'cards',
      tab: 'basic',
      keys: ['cards.title', 'cards.subtitle'],
      keywords: ['cards', 'bank cards', 'credit card', 'debit card', 'البطاقات البنكية', 'فيزا', 'ماستركارد', 'مدى'],
      render: () => (
        <SectionGroup key="cards" title={isLTR ? 'Payment Methods' : 'وسائل الدفع'}>
          <SettingsCard
            icon="credit_card"
            iconColor="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
            label={isLTR ? 'Bank Cards' : 'البطاقات البنكية'}
            sublabel={isLTR ? 'Manage credit, debit, and prepaid cards' : 'إدارة البطاقات الائتمانية، الخصم، ومسبقة الدفع'}
            onClick={() => navigate('/cards')}
            isLTR={isLTR}
          />
        </SectionGroup>
      )
    },
    {
      id: 'notifications',
      tab: 'basic',
      keys: ['settings.pushNotifications'],
      keywords: ['push', 'notifications', 'web push', 'إشعارات', 'تنبيهات', 'دفع الإشعارات'],
      render: () => <PushNotificationsCard key="notifications" />
    },
    {
      id: 'support',
      tab: 'basic',
      keys: ['settings.support', 'settings.recalcDesc'],
      keywords: [
        'support', 'database', 'export', 'import', 'recalibrate', 
        'دعم', 'مساعدة', 'قاعدة البيانات', 'تصدير', 'استيراد', 'إعادة حساب الأرصدة'
      ],
      render: () => <SupportActionsCard key="support" />
    },
    
    // --- ADVANCED TAB ---
    {
      id: 'connectivity',
      tab: 'advanced',
      keys: ['settings.sectionConnectivity', 'settings.openBanking', 'settings.familySync'],
      keywords: [
        'connectivity', 'banking', 'connect', 'family', 'sync', 'open banking', 'family sync', 
        'الاتصال والتكامل', 'ربط البنوك', 'مزامنة العائلة', 'مشاركة'
      ],
      render: () => (
        <SectionGroup key="connectivity" title={t('settings.sectionConnectivity') || 'الاتصال والتكامل'}>
          {/* Open Banking */}
          <div className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-all">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
              </div>
              <div>
                <p className="text-[13px] font-bold text-on-surface dark:text-white leading-tight">
                  {t('settings.openBanking') || 'ربط البنوك'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t('settings.beta') || 'Beta'}
                </p>
              </div>
            </div>
            <button
              onClick={handleBankConnect}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
            >
              {t('action.connect') || 'ربط'}
            </button>
          </div>

          {/* Family Sync */}
          <div className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-all">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>diversity_1</span>
              </div>
              <div>
                <p className="text-[13px] font-bold text-on-surface dark:text-white leading-tight">
                  {t('settings.familySync') || 'مزامنة العائلة'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {t('settings.beta') || 'Beta'} • Mockup
                </p>
              </div>
            </div>
            <button
              onClick={() => setMockupModal({ title: t('settings.familySync'), desc: t('settings.demoMockupDesc') })}
              className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-500 dark:text-rose-400 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all"
            >
              {t('action.manage') || 'إدارة'}
            </button>
          </div>
        </SectionGroup>
      )
    },

    {
      id: 'financialYear',
      tab: 'advanced',
      keys: ['settings.financialYear'],
      keywords: ['financial year', 'سنة مالية', 'تقارير سنوية', 'أعوام', 'year'],
      render: () => <FinancialYearCard key="financialYear" />
    },
    {
      id: 'autoClassification',
      tab: 'advanced',
      keys: ['settings.autoClassification'],
      keywords: ['classification', 'auto', 'ai', 'تصنيف', 'تلقائي', 'ذكاء اصطناعي'],
      render: () => <AutoClassificationCard key="autoClassification" />
    },
    {
      id: 'advancedAPI',
      tab: 'advanced',
      keys: ['settings.advancedAPI', 'settings.keyActive', 'settings.keyNotSet'],
      keywords: ['gemini', 'key', 'api', 'ai pro', 'مفتاح', 'ذكاء اصطناعي'],
      render: () => <AdvancedAPICard key="advancedAPI" settings={settings} updateSetting={updateSetting} />
    },
    {
      id: 'backupSync',
      tab: 'advanced',
      keys: ['settings.backupSync', 'settings.localBackupDesc'],
      keywords: ['backup', 'sync', 'drive', 'cloud', 'Google Drive', 'نسخ احتياطي', 'مزامنة', 'درايف', 'سحابي'],
      render: () => <BackupSyncCard key="backupSync" />
    },
    {
      id: 'developer',
      tab: 'advanced',
      keys: ['settings.sectionDebug', 'settings.resetOnboarding', 'settings.resetOnboardingDesc'],
      keywords: ['developer', 'debug', 'reset', 'onboarding', 'مطور', 'تهيئة', 'ترحيب'],
      render: () => (
        <SectionGroup key="developer" title={t('settings.sectionDebug') || 'أدوات المطور'}>
          <button
            onClick={async () => {
              await updateSetting('hasOnboarded', false);
              window.location.reload();
            }}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] active:bg-slate-100 dark:active:bg-white/[0.05] transition-colors group text-start"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">restart_alt</span>
              </div>
              <div>
                <p className="text-[13px] font-bold text-on-surface dark:text-white leading-tight">
                  {t('settings.resetOnboarding') || 'إعادة التهيئة'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {t('settings.resetOnboardingDesc') || 'إعادة تشغيل شاشات الترحيب من البداية'}
                </p>
              </div>
            </div>
            <span className={`material-symbols-outlined text-slate-300 dark:text-slate-600 text-[18px] transition-transform ${isLTR ? 'group-hover:translate-x-0.5' : 'group-hover:-translate-x-0.5'}`}>
              {isLTR ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        </SectionGroup>
      )
    }
  ];

  const isSearching = searchQuery.trim().length > 0;

  const filteredItems = settingsItems.filter(item => {
    if (!isSearching) {
      return item.tab === activeTab;
    }

    const q = searchQuery.toLowerCase().trim();
    const transMap = translations as unknown as Record<string, Record<string, string>>;
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
      {import.meta.env.DEV && showMasterModal && (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#1c1f23] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-5">
              <span className="material-symbols-outlined text-3xl">terminal</span>
            </div>
            <h3 className="text-xl font-black text-center text-on-surface dark:text-white mb-1.5">
              {t('settings.masterTitle')}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center font-bold mb-5 leading-relaxed">
              {t('settings.masterDesc')}
            </p>
            <input
              autoFocus
              type="password"
              value={masterPass}
              onChange={(e) => setMasterPass(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleMasterPass()}
              placeholder={t('settings.masterPh')}
              className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl px-5 py-4 text-center text-sm font-bold border-none outline-none focus:ring-2 ring-blue-500/30 mb-5 dark:text-white"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowMasterModal(false)}
                className="flex-1 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-xs active:scale-95 transition-all"
              >
                {t('action.cancel')}
              </button>
              <button
                onClick={handleMasterPass}
                className="flex-[2] py-3.5 rounded-2xl bg-blue-600 text-white font-black text-xs shadow-lg shadow-blue-600/25 active:scale-95 transition-all"
              >
                {t('action.confirm')}
              </button>
            </div>
          </div>
        </div>
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
