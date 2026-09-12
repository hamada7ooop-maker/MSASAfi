import { useI18n } from '../../i18n/index';
import { useAppStore } from '../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { useNavigate } from 'react-router-dom';

/**
 * Premium Header Component for Masarifi React.
 */
export function Header() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { incognito, setIncognito, setMenuOpen, userPoints, loginStreak, notifCount, toggleNotifPanel } = useAppStore(
    useShallow((s) => ({
      incognito: s.incognito,
      setIncognito: s.setIncognito,
      setMenuOpen: s.setMenuOpen,
      userPoints: s.userPoints,
      loginStreak: s.loginStreak,
      notifCount: s.notifCount,
      toggleNotifPanel: s.toggleNotifPanel
    }))
  );
  

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-surface/70 border-b border-outline-variant/30 shadow-sm flex flex-col justify-center pt-[env(safe-area-inset-top,0px)]">
      <div className="flex justify-between items-center w-full px-4 max-w-4xl mx-auto h-16">
        
        {/* Logo / Menu Section */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMenuOpen(true)}
            aria-label={t('nav.menu') || 'Open Navigation Menu'}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-surface-container text-slate-500 hover:bg-surface-container-high transition-all active:scale-90"
          >
            <span className="material-symbols-outlined" aria-hidden="true">menu</span>
          </button>
          <h1 
            onClick={() => navigate('/')}
            className="text-xl font-black text-primary dark:text-blue-200 tracking-tight cursor-pointer active:scale-95 transition-all"
          >
            {t('app.name')}
          </h1>
        </div>

        {/* Action Icons Section */}
        <div className="flex items-center gap-1 shrink-0">
          
          {/* Loyalty Stats */}
          <button 
            onClick={() => navigate('/shop')}
            aria-label={`${t('rewards.streak') || 'Streak'}: ${loginStreak}, ${t('rewards.points') || 'Points'}: ${userPoints}`}
            className="flex items-center gap-1 sm:gap-1.5 h-9 bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/30 rounded-full px-1.5 shadow-sm backdrop-blur-md active:scale-95 transition-all max-w-[120px] sm:max-w-[160px]"
          >
            <div className="flex items-center gap-1 px-1 sm:px-1.5 border-r border-amber-200/30 dark:border-amber-800/20 flex-shrink-0">
              <span className="text-[10px]" aria-hidden="true">🔥</span>
              <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 tabular-nums">{loginStreak}</span>
            </div>
            <div className="flex items-center gap-1 px-1 sm:px-1.5 min-w-0 overflow-hidden">
              <span className="text-xs shrink-0" aria-hidden="true">🪙</span>
              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 tabular-nums truncate">{userPoints}</span>
            </div>
          </button>

          {/* Incognito Toggle */}
          <button 
            onClick={() => setIncognito(!incognito)}
            aria-label={incognito ? (t('a11y.disableIncognito') || 'Disable Incognito Mode') : (t('a11y.enableIncognito') || 'Enable Incognito Mode')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90 shrink-0"
            title={t('a11y.incognitoTitle')}
          >
            <span className={`material-symbols-outlined ${incognito ? 'text-primary fill-1' : 'text-slate-500'}`} aria-hidden="true">
              {incognito ? 'visibility_off' : 'visibility'}
            </span>
          </button>

          {/* Notifications */}
          <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
            <button 
              onClick={toggleNotifPanel}
              aria-label={`${t('nav.notifications') || 'Notifications'}${notifCount > 0 ? ` (${notifCount})` : ''}`}
              className="w-full h-full flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90"
              title={t('nav.notifications') || 'Notifications'}
            >
              <span className="material-symbols-outlined text-slate-500" aria-hidden="true">notifications</span>
            </button>
            {notifCount > 0 && (
              <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse">
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
