import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n/index';
import { APP_VERSION } from '../../core/constants';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NavigationDrawer({ isOpen, onClose }: NavigationDrawerProps) {
  const { t, isRTL } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const menuGroups = [
    {
      title: t('nav.core') || 'Core',
      items: [
        { id: 'home', icon: 'dashboard', label: t('nav.home'), path: '/home' },
        { id: 'advisor', icon: 'auto_awesome', label: t('nav.advisor'), path: '/advisor' },
        { id: 'transactions', icon: 'receipt_long', label: t('nav.transactions'), path: '/transactions' },
        { id: 'budgets', icon: 'account_balance_wallet', label: t('nav.budgets'), path: '/budgets' },
        { id: 'reports', icon: 'monitoring', label: t('nav.reports'), path: '/reports' },
      ]
    },
    {
      title: t('nav.wealth') || 'Wealth & Planning',
      items: [
        { id: 'investments', icon: 'trending_up', label: t('nav.investments'), path: '/investments' },
        { id: 'goals', icon: 'target', label: t('nav.goals'), path: '/goals' },
        { id: 'debts', icon: 'money_off', label: t('nav.debts'), path: '/debts' },
        { id: 'bills', icon: 'payments', label: t('nav.bills'), path: '/bills' },
        { id: 'cards', icon: 'credit_card', label: t('nav.cards'), path: '/cards' },
        { id: 'recurring', icon: 'autorenew', label: t('nav.recurring'), path: '/recurring' },
      ]
    },
    {
      title: t('nav.social') || 'Social & Rewards',
      items: [
        { id: 'family', icon: 'groups', label: t('nav.family'), path: '/family' },
        { id: 'challenges', icon: 'military_tech', label: t('nav.challenges'), path: '/challenges' },
        { id: 'referrals', icon: 'card_giftcard', label: t('nav.referrals'), path: '/referrals' },
        { id: 'shop', icon: 'redeem', label: t('nav.shop'), path: '/shop' },
      ]
    },
    {
      title: t('nav.tools') || 'Tools & Settings',
      items: [
        { id: 'zakat', icon: 'calculate', label: t('nav.calculators') || 'الحاسبات المالية', path: '/calculators' },
        { id: 'vat', icon: 'receipt_long', label: t('vat.title') || 'حاسبة الضريبة', path: '/vat' },
        { id: 'currencies', icon: 'currency_exchange', label: t('nav.currencies'), path: '/currencies' },
        { id: 'glossary', icon: 'menu_book', label: t('nav.glossary'), path: '/glossary' },
        { id: 'settings', icon: 'settings', label: t('nav.settings'), path: '/settings' },
        { id: 'about', icon: 'info', label: t('nav.about'), path: '/about' },
      ]
    }
  ];

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div 
        className={`fixed top-0 bottom-0 z-[101] w-[280px] bg-surface shadow-2xl transition-transform duration-500 ease-out flex flex-col ${isOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'} ${isRTL ? 'right-0' : 'left-0'}`}
      >
        {/* Header */}
        <div className="p-6 pb-4 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] border-b border-outline-variant/30 bg-gradient-to-br from-primary to-primary-container text-on-primary">
          <div className="flex items-center justify-between mb-4">
             <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
               <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
             </div>
             <button aria-label={t('action.close') || 'Close'} onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
               <span className="material-symbols-outlined text-sm" aria-hidden="true">close</span>
             </button>
          </div>
          <h2 className="text-xl font-black tracking-tighter">{t('app.name')}</h2>
          <p className="text-[10px] font-bold text-on-primary/60 uppercase tracking-[0.2em]">{t('app.subtitle')}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="mb-6">
              <h3 className="px-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">{group.title}</h3>
              <div className="space-y-1">
                {group.items.map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      aria-label={item.label}
                      key={item.id}
                      onClick={() => handleNav(item.path)}
                      className={`w-full flex items-center gap-4 px-6 py-3 transition-all ${isActive ? 'bg-primary/10 text-primary border-r-4 border-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
                    >
                      <span className={`material-symbols-outlined text-[22px] ${isActive ? 'fill-1' : ''}`} aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className={`text-sm ${isActive ? 'font-black' : 'font-bold'}`}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-outline-variant/30 text-center">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Version {APP_VERSION}</p>
          <div className="mt-2 flex justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">System Stable</span>
          </div>
        </div>
      </div>
    </>
  );
}
