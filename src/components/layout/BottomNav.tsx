import { useI18n } from '../../i18n/index';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Modern Bottom Navigation for Masarifi React.
 * 5 main tabs + FAB-style Quick Add button in the center.
 */
export function BottomNav() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'home',         icon: 'dashboard',               label: t('nav.home'),         path: '/home' },
    { id: 'transactions', icon: 'receipt_long',             label: t('nav.transactions'), path: '/transactions' },
    { id: 'add',          icon: 'add_circle',               label: '',                    path: null,       big: true },
    { id: 'budgets',      icon: 'account_balance_wallet',   label: t('nav.budgets'),      path: '/budgets' },
    { id: 'settings',     icon: 'settings',                 label: t('nav.settings'),     path: '/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl border-t border-outline-variant/30 px-2 pb-safe pt-1 shadow-2xl flex justify-around items-center max-w-[500px] mx-auto rounded-t-[32px]">
      {navItems.map((item) => {
        const isActive = item.path ? location.pathname === item.path : false;

        // Center FAB-style Add button
        if (item.big) {
          return (
            <button aria-label={t('action.add') || 'Add'}
              key={item.id}
              onClick={() => navigate('/transactions/add')}
              className="flex flex-col items-center justify-center -mt-6 w-16 h-16 rounded-full bg-primary text-on-primary shadow-xl shadow-primary/30 active:scale-90 transition-all border-4 border-surface z-40"
            >
              <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                add
              </span>
            </button>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => item.path && navigate(item.path)}
            className={`flex flex-col items-center justify-center transition-all px-3 py-2 rounded-2xl active:scale-90 ${
              isActive
                ? 'text-[#002b59] dark:text-blue-300 font-bold'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <span
              className="material-symbols-outlined text-2xl"
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              {item.icon}
            </span>
            {item.label && (
              <span className={`text-[9px] mt-0.5 truncate max-w-[56px] ${isActive ? 'font-black' : 'font-medium'}`}>
                {item.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
