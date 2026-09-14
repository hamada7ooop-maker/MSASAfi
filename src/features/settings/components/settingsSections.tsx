import React from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { SettingsCard, SectionGroup } from './SettingsPrimitives';
import { GeneralSettingsCard } from './cards/GeneralSettingsCard';
import { SalaryStructureCard } from './cards/SalaryStructureCard';
import { SecurityCard } from './cards/SecurityCard';
import { BackupSyncCard } from './cards/BackupSyncCard';
import { AdvancedAPICard } from './cards/AdvancedAPICard';
import { SupportActionsCard } from './cards/SupportActionsCard';
import { PushNotificationsCard } from './cards/PushNotificationsCard';
import { AutoClassificationCard } from './cards/AutoClassificationCard';
import { FinancialYearCard } from './cards/FinancialYearCard';

export interface SettingsSection {
  id: string;
  /** Which tab the section belongs to when the user is NOT searching. */
  tab: 'basic' | 'advanced';
  /** Translation keys whose VALUES are searched, in the active language plus
   *  English and Arabic, so a user can find a setting by the label they saw. */
  keys: string[];
  /** Extra search terms that appear in no translation — brand names, common
   *  synonyms and misspellings. */
  keywords: string[];
  render: () => React.ReactNode;
}

/**
 * Everything the section renderers need from the page.
 *
 * Passed as one object rather than eight positional arguments: the list grows
 * whenever a card is added, and a named context makes it obvious at the call
 * site what a new section is allowed to reach for.
 */
export interface SettingsSectionContext {
  t: (key: string, vars?: Record<string, string>) => string;
  isLTR: boolean;
  navigate: NavigateFunction;
  settings: Record<string, unknown>;
  updateSetting: (key: string, value: unknown) => void | Promise<void>;
  refresh: () => void;
  setMockupModal: (m: { title: string; desc: string } | null) => void;
  /** Opens the bank-selector modal, which the page owns. */
  handleBankConnect: () => void;
}

/**
 * The settings search index.
 *
 * Extracted from Settings.tsx (669 lines) as part of L-1: at 205 lines this
 * was two thirds of the component, and it is data — twelve section descriptors
 * — rather than logic. The filtering that consumes it stays in the page.
 *
 * Built as a function rather than a constant because each descriptor's
 * `render` closes over the page's translation function, router and settings
 * state.
 */
export function buildSettingsSections(ctx: SettingsSectionContext): SettingsSection[] {
  const { t, isLTR, navigate, settings, updateSetting, refresh, setMockupModal, handleBankConnect } = ctx;

  return [
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
      render: () => <AdvancedAPICard key="advancedAPI" settings={settings} />
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
}
