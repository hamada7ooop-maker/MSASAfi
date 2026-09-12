import React from 'react';
import { useAppStore } from '../../store/appStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';
import { useI18n } from '../../i18n/index';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../toast';

export interface GlobalActionItem {
  id: string;
  icon: string;
  label: string;
  color: string;
  path?: string | null;
  locked?: boolean;
}

/**
 * GlobalActionModal - A smart, premium grid for all quick actions.
 */
export function GlobalActionModal() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isGlobalActionOpen, setGlobalActionOpen, setQuickAddOpen, setPendingAction } = useAppStore(
    useShallow((s) => ({
      isGlobalActionOpen: s.isGlobalActionOpen,
      setGlobalActionOpen: s.setGlobalActionOpen,
      setQuickAddOpen: s.setQuickAddOpen,
      setPendingAction: s.setPendingAction
    }))
  );
  const unlocked = useSettingsStore((s) => s.unlockedItems) || [];

  React.useEffect(() => {
    if (!isGlobalActionOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGlobalActionOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isGlobalActionOpen, setGlobalActionOpen]);

  if (!isGlobalActionOpen) return null;

  const isTurboUnlocked = unlocked.includes('perk:turbo-scanner');

  const actions: GlobalActionItem[] = [
    { id: 'transaction', icon: '💸', label: t('nav.transactions') || 'Transaction', color: 'bg-emerald-500' },
    { id: 'scan', icon: '📷', label: t('nav.scanReceipt') || 'Scan Receipt', color: 'bg-blue-600', locked: !isTurboUnlocked },
    { id: 'bill', icon: '📄', label: t('nav.bills') || 'Bill', color: 'bg-rose-500', path: '/bills' },
    { id: 'debt', icon: '🤝', label: t('nav.debts') || 'Debt', color: 'bg-amber-500', path: '/debts' },
    { id: 'goal', icon: '🚗', label: t('nav.goals') || 'Goal', color: 'bg-blue-500', path: '/goals' },
    { id: 'challenge', icon: '🏆', label: t('nav.challenges') || 'Challenge', color: 'bg-purple-500', path: '/challenges' },
    { id: 'budget', icon: '📊', label: t('nav.budgets') || 'Budget', color: 'bg-indigo-500', path: '/budgets' },
    { id: 'family', icon: '👥', label: t('nav.family') || 'Family', color: 'bg-cyan-500', path: '/family' },
    { id: 'investment', icon: '📈', label: t('nav.investments') || 'Investment', color: 'bg-slate-700', path: '/investments' },
  ];

  const handleAction = (action: GlobalActionItem) => {
    setGlobalActionOpen(false);
    
    if (action.locked) {
      toast(t('shop.perk.turboScanner') + ' Required', 'warning');
      navigate('/shop');
      return;
    }

    if (action.id === 'transaction') {
      setQuickAddOpen(true);
    } else if (action.id === 'scan') {
      setQuickAddOpen(true);
      // We can add a timeout to trigger scan after modal opens
      setTimeout(() => {
        // Trigger scan logic in QuickAddModal would need a way to listen
        // For now, opening QuickAdd is enough as the scan button is there
      }, 500);
    } else if (action.path) {
      if (action.id !== 'family') {
        setPendingAction(`ADD_${action.id.toUpperCase()}`);
      }
      navigate(action.path);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300"
      onClick={() => setGlobalActionOpen(false)}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-action-title"
        className="bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[3rem] p-8 shadow-2xl border border-white/10 relative overflow-hidden animate-in zoom-in slide-in-from-bottom-12 duration-500"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
           <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mb-6" aria-hidden="true"></div>
           <h2 id="global-action-title" className="text-2xl font-black text-slate-800 dark:text-white text-center">
              {t('home.quickActionTitle') || 'ماذا تريد أن تفعل؟'}
           </h2>
           <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest">
              {t('home.quickActionSub') || 'اختر عملية للإضافة السريعة'}
           </p>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-3 gap-4 sm:gap-6">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              className="flex flex-col items-center group active:scale-95 transition-all"
            >
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[2rem] ${action.color} flex items-center justify-center text-3xl sm:text-4xl shadow-lg shadow-black/10 group-hover:scale-110 transition-transform duration-300 relative overflow-hidden`}>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative z-10">{action.icon}</span>
              </div>
              <span className="mt-3 text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest text-center">
                {action.label}
              </span>
            </button>
          ))}
        </div>

        {/* Close Button */}
        <button 
          onClick={() => setGlobalActionOpen(false)}
          className="mt-10 w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          {t('action.cancel')}
        </button>
      </div>
    </div>
  );
}
