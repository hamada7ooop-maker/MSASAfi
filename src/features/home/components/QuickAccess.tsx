import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../../store/appStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';
import { toast } from '../../../toast';
import { ProfessionalCalculator } from '../../../components/ui/ProfessionalCalculator';

export function QuickAccess() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isQAEditing, setQAEditing } = useAppStore(
    useShallow((s) => ({
      isQAEditing: s.isQAEditing,
      setQAEditing: s.setQAEditing
    }))
  );
  const { qaOrder, setQAOrder, qaVisibility, setQAVisibility, qaColumns = 4, setQAColumns } = useSettingsStore(
    useShallow((s) => ({
      qaOrder: s.qaOrder,
      setQAOrder: s.setQAOrder,
      qaVisibility: s.qaVisibility,
      setQAVisibility: s.setQAVisibility,
      qaColumns: s.qaColumns,
      setQAColumns: s.setQAColumns
    }))
  );
  const [showCalculator, setShowCalculator] = useState(false);

  const allQA = [
    { id: 'transactions', icon: 'receipt_long',     labelKey: 'nav.transactions', color: '#3b82f6', gradient: 'from-blue-600 to-blue-400' },
    { id: 'accounts',     icon: 'account_balance',   labelKey: 'nav.accounts',     color: '#0ea5e9', gradient: 'from-sky-600 to-sky-400' },
    { id: 'assets',       icon: 'inventory_2',       labelKey: 'nav.assets',       color: '#0d9488', gradient: 'from-teal-600 to-teal-400' },
    { id: 'investments',  icon: 'trending_up',       labelKey: 'nav.investments',  color: '#22c55e', gradient: 'from-emerald-600 to-emerald-400' },
    { id: 'goals',        icon: 'target',            labelKey: 'nav.goals',        color: '#f43f5e', gradient: 'from-rose-600 to-rose-400' },
    { id: 'reports',      icon: 'bar_chart',         labelKey: 'nav.reports',      color: '#8b5cf6', gradient: 'from-violet-600 to-violet-400' },
    { id: 'debts',        icon: 'handshake',         labelKey: 'nav.debts',        color: '#f59e0b', gradient: 'from-amber-600 to-amber-400' },
    { id: 'advisor',      icon: 'auto_awesome',      labelKey: 'nav.advisor',       color: '#8b5cf6', gradient: 'from-purple-700 to-indigo-500' },
    { id: 'chatbot',      icon: 'smart_toy',         labelKey: 'ai.assistant',      color: '#8b5cf6', gradient: 'from-purple-600 to-purple-400' },
    { id: 'calculators',  icon: 'calculate',         labelKey: 'nav.calculators',  color: '#f59e0b', gradient: 'from-amber-600 to-amber-400' },
    { id: 'calculator',   icon: 'calculate',         labelKey: 'misc.calculator',   color: '#6366f1', gradient: 'from-indigo-600 to-indigo-400' },
    { id: 'challenges',   icon: 'emoji_events',      labelKey: 'nav.challenges',    color: '#f43f5e', gradient: 'from-rose-600 to-rose-400' },
    { id: 'glossary',     icon: 'menu_book',         labelKey: 'nav.glossary',      color: '#0ea5e9', gradient: 'from-sky-600 to-sky-400' },
    { id: 'shop',         icon: 'storefront',        labelKey: 'nav.shop',          color: '#ec4899', gradient: 'from-pink-600 to-pink-400' },
    { id: 'family',       icon: 'diversity_1',       labelKey: 'nav.family',        color: '#06b6d4', gradient: 'from-cyan-600 to-cyan-400' },
    { id: 'recurring',    icon: 'autorenew',         labelKey: 'nav.recurring',     color: '#6366f1', gradient: 'from-indigo-600 to-indigo-400' },
    { id: 'currencies',   icon: 'currency_exchange', labelKey: 'nav.currencies',    color: '#f59e0b', gradient: 'from-orange-600 to-orange-400' },
    { id: 'categories',   icon: 'category',          labelKey: 'nav.categories',    color: '#94a3b8', gradient: 'from-slate-600 to-slate-400' },
    { id: 'referrals',    icon: 'card_giftcard',     labelKey: 'nav.referrals',     color: '#f59e0b', gradient: 'from-yellow-600 to-yellow-400' },
    { id: 'bills',        icon: 'calendar_month',    labelKey: 'nav.bills',         color: '#f43f5e', gradient: 'from-red-600 to-red-400' },
    { id: 'travel-budget', icon: 'flight_takeoff',   labelKey: 'travel.title',      color: '#6366f1', gradient: 'from-indigo-600 to-indigo-400' },
    { id: 'settings',     icon: 'settings',          labelKey: 'nav.settings',      color: '#64748b', gradient: 'from-slate-600 to-slate-400' },
    { id: 'arcade',       icon: 'sports_esports',    labelKey: 'nav.arcade',        color: '#a855f7', gradient: 'from-purple-600 to-indigo-500' },
  ];

  const items = qaOrder.map(id => allQA.find(item => item.id === id)).filter(Boolean) as typeof allQA;

  const toggleVisibility = (id: string) => {
    const next = { ...qaVisibility };
    next[id] = !(next[id] ?? true);
    setQAVisibility(next);
  };

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleItemClick = (id: string) => {
    if (!isQAEditing) {
      if (id === 'calculator') {
        setShowCalculator(true);
      } else {
        navigate(`/${id}`);
      }
      return;
    }

    if (!selectedId) {
      setSelectedId(id);
      toast(t('qa.selectSecond'), 'info');
    } else if (selectedId === id) {
      setSelectedId(null);
    } else {
      const nextOrder = [...qaOrder];
      const o1 = nextOrder.indexOf(selectedId);
      const o2 = nextOrder.indexOf(id);
      [nextOrder[o1], nextOrder[o2]] = [nextOrder[o2], nextOrder[o1]];
      setQAOrder(nextOrder);
      setSelectedId(null);
      toast(t('qa.swapped'), 'success');
    }
  };

  return (
    <div className="bg-white dark:bg-[#1e2124] rounded-[2.5rem] p-7 shadow-sm border border-black/5 dark:border-white/5">
      <div className="flex items-center justify-between mb-8 px-1">
        <h3 className="text-premium-header text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black">
          {t('home.section.quickAccess')}
        </h3>
        <div className="flex items-center gap-3">
          {isQAEditing && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-xl animate-in slide-in-from-right-4 duration-500">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{t('settings.columns') || 'Columns'}</span>
              <div className="flex gap-1">
                {[3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    onClick={() => setQAColumns(n)}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black transition-all ${qaColumns === n ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-400'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button 
            onClick={() => { setQAEditing(!isQAEditing); setSelectedId(null); }}
            className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isQAEditing ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30 scale-105' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
          >
            {isQAEditing ? t('action.done') : t('action.edit')}
          </button>
        </div>
      </div>

      <div className="grid gap-x-4 gap-y-7" style={{ gridTemplateColumns: `repeat(${qaColumns || 4}, minmax(0, 1fr))` }}>
        {items.filter(it => isQAEditing || qaVisibility[it.id] !== false).map((it) => {
          const isSelected = selectedId === it.id;
          const isVisible = qaVisibility[it.id] !== false;
          
          return (
            <button 
              key={it.id} 
              onClick={() => handleItemClick(it.id)}
              className={`relative flex flex-col items-center gap-3 transition-all ${isQAEditing ? 'animate-jiggle' : 'hover:-translate-y-1 active:scale-90 group'}`}
            >
              <div className={`${qaColumns >= 5 ? 'w-12 h-12 rounded-2xl' : 'w-16 h-16 rounded-[1.8rem]'} flex items-center justify-center transition-all shadow-xl border relative overflow-hidden ${
                isSelected 
                  ? 'ring-4 ring-blue-500/40 scale-110 z-10' 
                  : !isVisible && isQAEditing ? 'opacity-30 grayscale' : 'group-hover:shadow-2xl group-hover:scale-110'
              } ${isSelected ? 'bg-blue-600' : `bg-gradient-to-br ${it.gradient}`} border-white/20`}>
                
                {/* Dynamic Gloss Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                
                <span className={`material-symbols-outlined text-white ${qaColumns >= 6 ? 'text-xl' : qaColumns >= 5 ? 'text-2xl' : 'text-3xl'} drop-shadow-md transition-transform group-hover:scale-110`} style={{ fontVariationSettings: "'FILL' 1" }}>
                  {it.icon}
                </span>
                
              </div>

              {isQAEditing && (
                <div 
                  onClick={(e) => { e.stopPropagation(); toggleVisibility(it.id); }}
                  className={`absolute top-0 right-0 ${qaColumns >= 5 ? 'w-5 h-5' : 'w-7 h-7'} flex items-center justify-center transition-all z-30 cursor-pointer hover:scale-125 rounded-full border border-white/30 bg-black/10 backdrop-blur-[2px] ${!isVisible ? 'grayscale opacity-40' : 'drop-shadow-lg'}`}
                >
                  <span className={`${qaColumns >= 5 ? 'text-[12px]' : 'text-[16px]'} select-none leading-none`}>
                    {isVisible ? '👁️' : '🕶️'}
                  </span>
                </div>
              )}
              
              <span className={`text-[10px] font-black text-center truncate w-full px-1 transition-colors ${!isVisible && isQAEditing ? 'opacity-30' : 'text-slate-600 dark:text-slate-200 group-hover:text-blue-600'}`}>
                {t(it.labelKey)}
              </span>
            </button>
          );
        })}
      </div>

      {showCalculator && (
        <ProfessionalCalculator onClose={() => setShowCalculator(false)} />
      )}
    </div>
  );
}
