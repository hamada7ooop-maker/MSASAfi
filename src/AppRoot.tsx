import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, Suspense } from 'react';
import { AppShell } from './components/layout/AppShell';
import { ThemeManager } from './components/ThemeManager';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { lazyWithRetry } from './core/lazyRetry';
import { logger } from './core/logger';

// Lazy load feature components with automatic retry
const Dashboard = lazyWithRetry(() => import('./features/home/components/Dashboard'), 'Dashboard');
const Reports = lazyWithRetry(() => import('./features/reports/components/Reports'), 'Reports');
const TransactionList = lazyWithRetry(() => import('./features/transactions/components/TransactionList'), 'TransactionList');
const AddTransactionPage = lazyWithRetry(() => import('./features/transactions/components/AddTransactionPage'), 'AddTransactionPage');
const Budgets = lazyWithRetry(() => import('./features/budgets/components/Budgets'), 'Budgets');
const Goals = lazyWithRetry(() => import('./features/goals/components/Goals'), 'Goals');
const Debts = lazyWithRetry(() => import('./features/debts/components/Debts'), 'Debts');
const Bills = lazyWithRetry(() => import('./features/bills/components/Bills'), 'Bills');
const Accounts = lazyWithRetry(() => import('./features/accounts/components/Accounts'), 'Accounts');
const Investments = lazyWithRetry(() => import('./features/investments/components/Investments'), 'Investments');
const Settings = lazyWithRetry(() => import('./features/settings/components/Settings'), 'Settings');
const TravelBudget = lazyWithRetry(() => import('./features/budgets/components/TravelBudget'), 'TravelBudget');
const ChatScreen = lazyWithRetry(() => import('./features/chatbot/components/ChatScreen'), 'ChatScreen');
const Calculators = lazyWithRetry(() => import('./features/zakat/components/Calculators'), 'Calculators');
const VatCalculator = lazyWithRetry(() => import('./features/zakat/components/VatCalculator'), 'VatCalculator');
const Challenges = lazyWithRetry(() => import('./features/challenges/components/Challenges'), 'Challenges');
const Shop = lazyWithRetry(() => import('./features/shop/components/Shop'), 'Shop');
const FamilyExpenses = lazyWithRetry(() => import('./features/family/components/FamilyExpenses'), 'FamilyExpenses');
const CategoryEditor = lazyWithRetry(() => import('./features/categories/components/CategoryEditor'), 'CategoryEditor');
const RecurringTransactions = lazyWithRetry(() => import('./features/recurring/components/RecurringTransactions'), 'RecurringTransactions');
const Referrals = lazyWithRetry(() => import('./features/referrals/components/Referrals'), 'Referrals');
const Currencies = lazyWithRetry(() => import('./features/currencies/components/Currencies'), 'Currencies');
const About = lazyWithRetry(() => import('./features/about/components/About'), 'About');
const Privacy = lazyWithRetry(() => import('./features/about/components/Privacy'), 'Privacy');
const AuditLog = lazyWithRetry(() => import('./features/audit/components/AuditLog'), 'AuditLog');
const SearchPage = lazyWithRetry(() => import('./features/search/components/SearchPage'), 'SearchPage');
const OnboardingFlow = lazyWithRetry(() => import('./features/onboarding/components/OnboardingFlow'), 'OnboardingFlow');
const Notifications = lazyWithRetry(() => import('./features/notifications/components/Notifications'), 'Notifications');
const AdvisorPage = lazyWithRetry(() => import('./features/advisor/components/AdvisorPage'), 'AdvisorPage');
const Assets = lazyWithRetry(() => import('./features/assets/components/Assets'), 'Assets');
const Glossary = lazyWithRetry(() => import('./features/glossary/components/Glossary'), 'Glossary');
const BankCardsManager = lazyWithRetry(() => import('./features/cards/components/BankCardsManager'), 'BankCardsManager');
const ArcadeHub = lazyWithRetry(() => import('./features/arcade/components/ArcadeHub'), 'ArcadeHub');
import { useSettingsStore } from './store/settingsStore';
import { t } from './i18n/engine';

import { useAppInitialization } from './hooks/useAppInitialization';

/**
 * Beautiful Page Loader for Suspense
 */
function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p className="mt-4 text-xs font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">
        {t('home.treeLoading')}
      </p>
    </div>
  );
}

/**
 * Per-Route Error Isolation Boundary
 */
function RouteBoundary({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <ErrorBoundary variant="inline" featureName={name}>
      {children}
    </ErrorBoundary>
  );
}

/**
 * Main App Component with HashRouter.
 */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export function AppRoot() {
  const { isInitialized } = useAppInitialization();
  const hasOnboarded = useSettingsStore(s => s.hasOnboarded);

  useEffect(() => {
    if (isInitialized) {
      const legacyApp = document.getElementById('app');
      if (legacyApp) legacyApp.style.display = 'none';
      logger.info('React', 'App Ready');
    }
  }, [isInitialized]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#002b59] flex items-center justify-center text-white">
        <div className="text-center animate-in zoom-in duration-700">
          <div className="w-24 h-24 bg-white/10 rounded-[2rem] flex items-center justify-center mb-6 mx-auto shadow-2xl backdrop-blur-md">
            <span className="material-symbols-outlined text-5xl">account_balance_wallet</span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter">مصاريفي</h1>
          <div className="mt-4 flex justify-center gap-1">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
            <div className="w-1.5 h-1.5 bg-blue-200 rounded-full animate-bounce [animation-delay:0.4s]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeManager />
      <HashRouter>
        <ScrollToTop />
        <AppShell>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {isInitialized && !hasOnboarded ? (
                <>
                  <Route path="/onboarding" element={<RouteBoundary name="شاشة البدء"><OnboardingFlow /></RouteBoundary>} />
                  <Route path="*" element={<Navigate to="/onboarding" replace />} />
                </>
              ) : (
                <>
                  <Route path="/" element={<Navigate to="/home" replace />} />
                  <Route path="/home"         element={<RouteBoundary name="الرئيسية"><Dashboard /></RouteBoundary>} />
                  <Route path="/reports"      element={<RouteBoundary name="التقارير"><Reports /></RouteBoundary>} />
                  <Route path="/transactions" element={<RouteBoundary name="المعاملات"><TransactionList /></RouteBoundary>} />
                  <Route path="/transactions/add" element={<RouteBoundary name="إضافة معاملة"><AddTransactionPage /></RouteBoundary>} />
                  <Route path="/add-transaction" element={<Navigate to="/transactions/add" replace />} />
                  <Route path="/budgets"      element={<RouteBoundary name="الميزانيات"><Budgets /></RouteBoundary>} />
                  <Route path="/travel-budget" element={<RouteBoundary name="ميزانية السفر"><TravelBudget /></RouteBoundary>} />
                  <Route path="/goals"        element={<RouteBoundary name="أهداف الادخار"><Goals /></RouteBoundary>} />
                  <Route path="/debts"        element={<RouteBoundary name="الديون"><Debts /></RouteBoundary>} />
                  <Route path="/bills"        element={<RouteBoundary name="الفواتير والاشتراكات"><Bills /></RouteBoundary>} />
                  <Route path="/accounts"     element={<RouteBoundary name="الحسابات"><Accounts /></RouteBoundary>} />
                  <Route path="/investments"  element={<RouteBoundary name="الاستثمارات"><Investments /></RouteBoundary>} />
                  <Route path="/chatbot"      element={<RouteBoundary name="المساعد الذكي"><ChatScreen /></RouteBoundary>} />
                  <Route path="/calculators"  element={<RouteBoundary name="الحاسبات المالية"><Calculators /></RouteBoundary>} />
                  <Route path="/vat"          element={<RouteBoundary name="حاسبة الضريبة"><VatCalculator /></RouteBoundary>} />
                  <Route path="/vat-calculator" element={<Navigate to="/vat" replace />} />
                  <Route path="/challenges"   element={<RouteBoundary name="التحديات المالية"><Challenges /></RouteBoundary>} />
                  <Route path="/shop"         element={<RouteBoundary name="متجر المكافآت"><Shop /></RouteBoundary>} />
                  <Route path="/family"       element={<RouteBoundary name="المصاريف العائلية"><FamilyExpenses /></RouteBoundary>} />
                  <Route path="/categories"   element={<RouteBoundary name="محرر التصنيفات"><CategoryEditor /></RouteBoundary>} />
                  <Route path="/recurring"    element={<RouteBoundary name="العمليات المتكررة"><RecurringTransactions /></RouteBoundary>} />
                  <Route path="/referrals"    element={<RouteBoundary name="الإحالات"><Referrals /></RouteBoundary>} />
                  <Route path="/currencies"   element={<RouteBoundary name="أسعار العملات"><Currencies /></RouteBoundary>} />
                  <Route path="/settings"     element={<RouteBoundary name="الإعدادات"><Settings /></RouteBoundary>} />
                  <Route path="/about"        element={<RouteBoundary name="عن التطبيق"><About /></RouteBoundary>} />
                  <Route path="/privacy"      element={<RouteBoundary name="سياسة الخصوصية"><Privacy /></RouteBoundary>} />
                  <Route path="/audit"        element={<RouteBoundary name="سجل التدقيق"><AuditLog /></RouteBoundary>} />
                  <Route path="/search"       element={<RouteBoundary name="البحث الشامل"><SearchPage /></RouteBoundary>} />
                  <Route path="/notifications" element={<RouteBoundary name="الإشعارات"><Notifications /></RouteBoundary>} />
                  <Route path="/advisor"      element={<RouteBoundary name="المستشار المالي"><AdvisorPage /></RouteBoundary>} />
                  <Route path="/assets"       element={<RouteBoundary name="الأصول"><Assets /></RouteBoundary>} />
                  <Route path="/glossary"     element={<RouteBoundary name="القاموس المالي"><Glossary /></RouteBoundary>} />
                  <Route path="/cards"        element={<RouteBoundary name="إدارة البطاقات"><BankCardsManager /></RouteBoundary>} />
                  <Route path="/arcade"       element={<RouteBoundary name="مركز الألعاب"><ArcadeHub /></RouteBoundary>} />
                  
                  {/* Pages not yet migrated */}
                  <Route path="*" element={
                    <div className="py-20 text-center">
                      <span className="material-symbols-outlined text-6xl text-slate-200 mb-4 animate-bounce">construction</span>
                      <h2 className="text-xl font-black text-slate-400">قيد التطوير...</h2>
                      <p className="text-xs text-slate-300 mt-2">نحن نقوم بنقل هذه الصفحة إلى محرك React الجديد</p>
                    </div>
                  } />
                </>
              )}
            </Routes>
          </Suspense>
        </AppShell>
      </HashRouter>
    </ErrorBoundary>
  );
}
