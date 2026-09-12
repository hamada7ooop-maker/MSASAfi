import React, { useState } from 'react';
import { useInvestments } from '../hooks/useInvestments';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { useAppStore } from '../../../store/appStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../core/db/core';
import type { Investment } from '../../../types';
import { checkMilestone } from '../../../core/loyalty';
import { PortfolioBreakdown } from './PortfolioBreakdown';
import { bridge } from '../../../core/AppBridge';

const INV_ICONS: Record<string, string> = {
  stocks: '📈', crypto: '₿', real_estate: '🏠',
  gold: '🪙', reit: '🏢', other: '📦'
};
const INV_COLORS: Record<string, string> = {
  stocks: '#3b82f6', crypto: '#f59e0b', real_estate: '#10b981',
  gold: '#fbbf24', reit: '#6366f1', other: '#8b5cf6'
};

// ─── Investment Modal ────────────────────────────────────────────────────────
function InvestmentModal({
  investment, onSave, onDelete, onClose
}: { investment?: Partial<Investment>; onSave: (d: Partial<Investment>) => void; onDelete?: (id: string) => void; onClose: () => void }) {
  const { t } = useI18n();
  const { fmt, parseNum, sanitizeNumericInput } = useFormat();
  const { isWorkHoursEnabled, hourlyRate, setIsWorkHoursEnabled } = useSettingsStore(
    useShallow((s) => ({
      isWorkHoursEnabled: s.isWorkHoursEnabled,
      hourlyRate: s.hourlyRate,
      setIsWorkHoursEnabled: s.setIsWorkHoursEnabled
    }))
  );
  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const [form, setForm] = useState<Partial<Investment>>(investment ?? {
    name: '', type: 'stocks', value: 0, cost: 0, icon: 'trending_up', accountId: ''
  });
  const [costStr, setCostStr] = useState(investment?.cost ? String(investment.cost) : '');
  const [valueStr, setValueStr] = useState(investment?.value ? String(investment.value) : '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof Investment>(k: K, v: Investment[K]) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-md transition-all animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-t-[3rem] p-8 shadow-2xl space-y-6 animate-in slide-in-from-bottom-10 duration-500" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2 opacity-50" />
        
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500">account_balance_wallet</span>
            {investment?.id ? t('investment.edit') : t('investment.add')}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
             <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Type selector */}
        <div className="grid grid-cols-3 gap-3">
          {(['stocks','crypto','real_estate','gold','reit','other'] as const).map(tp => (
            <button key={tp} onClick={() => { set('type', tp); set('icon', INV_ICONS[tp]); }}
              className={`flex flex-col items-center gap-2 p-4 rounded-[2rem] transition-all duration-300 ${form.type === tp ? 'bg-[#002b59] text-white shadow-lg shadow-blue-900/30 scale-105' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${form.type === tp ? 'bg-white/20' : 'bg-slate-200/50 dark:bg-slate-700/50'}`}>
                {(() => {
                  const icon = INV_ICONS[tp];
                  const isEmoji = /\p{Extended_Pictographic}/u.test(icon) || icon === '₿';
                  return (
                    <span className={isEmoji ? "text-xl" : "material-symbols-outlined text-xl"} style={isEmoji ? {} : { fontVariationSettings: "'FILL' 1" }}>
                      {icon}
                    </span>
                  );
                })()}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">{t(`investment.${tp}`) || tp}</span>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 mb-1 block">{t('investment.namePlaceholder')}</label>
            <input 
              dir="auto"
              autoComplete="off"
              value={form.name || ''} 
              onChange={e => set('name', e.target.value)}
              onCompositionEnd={e => set('name', (e.target as HTMLInputElement).value)}
              onBlur={e => set('name', e.target.value)}
              placeholder="e.g. Apple Stocks"
              className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white border border-transparent dark:border-white/5" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] px-1 mb-1 block">{t('investment.cost')}</label>
              <input 
                type="text" 
                inputMode="decimal"
                dir="ltr"
                autoComplete="off"
                value={costStr} 
                onChange={e => {
                  const val = sanitizeNumericInput(e.target.value);
                  setCostStr(val);
                  set('cost', parseNum(val) || 0);
                }}
                onCompositionEnd={e => {
                  const val = sanitizeNumericInput((e.target as HTMLInputElement).value);
                  setCostStr(val);
                  set('cost', parseNum(val) || 0);
                }}
                onBlur={e => {
                  const val = sanitizeNumericInput(e.target.value);
                  setCostStr(val);
                  set('cost', parseNum(val) || 0);
                }}
                placeholder="0.00"
                className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white border border-transparent dark:border-white/5" 
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] px-1 mb-1 block">{t('investment.value')}</label>
              <input 
                type="text" 
                inputMode="decimal"
                dir="ltr"
                autoComplete="off"
                value={valueStr} 
                onChange={e => {
                  const val = sanitizeNumericInput(e.target.value);
                  setValueStr(val);
                  set('value', parseNum(val) || 0);
                }}
                onCompositionEnd={e => {
                  const val = sanitizeNumericInput((e.target as HTMLInputElement).value);
                  setValueStr(val);
                  set('value', parseNum(val) || 0);
                }}
                onBlur={e => {
                  const val = sanitizeNumericInput(e.target.value);
                  setValueStr(val);
                  set('value', parseNum(val) || 0);
                }}
                placeholder="0.00"
                className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white border border-transparent dark:border-white/5" 
              />
            </div>
          </div>

          {/* Work Hours Metric Toggle */}
          <div className="flex flex-col items-center gap-2">
            <button 
              type="button"
              onClick={() => setIsWorkHoursEnabled(!isWorkHoursEnabled)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all duration-300 ${
                isWorkHoursEnabled 
                ? 'bg-blue-600/10 text-blue-600 border-blue-600/20 shadow-sm' 
                : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <span className={`material-symbols-outlined text-sm ${isWorkHoursEnabled ? 'animate-pulse' : ''}`}>
                hourglass_empty
              </span>
              <span className="text-[10px] font-black uppercase tracking-tight">
                {isWorkHoursEnabled ? t('common.enabled') : t('common.disabled')}
              </span>
            </button>

            {isWorkHoursEnabled && hourlyRate > 0 && parseNum(costStr) > 0 && (
              <div className="animate-in zoom-in slide-in-from-top-2 duration-500 bg-[#002b59] dark:bg-blue-600 text-white px-4 py-2 rounded-2xl shadow-xl shadow-blue-900/20 flex items-center gap-3 w-full">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold opacity-70 uppercase tracking-widest leading-tight">{t('settings.hourlyRatePh')}</span>
                  <span className="text-sm font-black leading-tight">
                    {t('txn.workHours', { hours: (parseNum(costStr) / hourlyRate).toFixed(1) })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Account Linker */}
          {!investment?.id && (
            <div>
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] px-1 mb-1 block">{t('investment.linkAccount')}</label>
              <select 
                value={form.accountId || ''} 
                onChange={e => set('accountId', e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white border border-transparent dark:border-white/5 appearance-none"
              >
                <option value="">{t('common.selectAccount') || 'Don\'t deduct from balance'}</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({fmt(acc.balance)})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-4 pt-4">
          {investment?.id && onDelete && (
            <div className="flex gap-2 items-center flex-1">
              {!confirmDelete ? (
                <button 
                  onClick={() => setConfirmDelete(true)}
                  className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 hover:bg-rose-500 hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              ) : (
                <div className="flex-1 flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                  <button onClick={async () => {
                    await onDelete(investment.id!);
                    onClose();
                  }} className="flex-1 py-4 rounded-2xl bg-rose-500 text-white font-black text-[10px] uppercase">
                    {t('action.confirm') || 'Confirm Delete'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="px-4 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-[10px] uppercase">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              )}
            </div>
          )}
          {!confirmDelete && (
            <>
              <button onClick={onClose} className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                {t('action.cancel')}
              </button>
              <button onClick={() => { 
                const c = parseNum(costStr);
                const v = valueStr.trim() ? parseNum(valueStr) : c;
                if (form.name?.trim() && c > 0) { 
                  onSave({ ...form, name: form.name.trim(), cost: c, value: v }); 
                  onClose(); 
                } 
              }}
                className="flex-2 py-4 rounded-2xl bg-[#002b59] text-white font-black text-sm shadow-xl shadow-blue-900/30 hover:scale-[1.02] active:scale-95 transition-all">
                {t('action.save')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Investments Page ───────────────────────────────────────────────────
export function Investments() {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const { investments, totalCost, totalValue, totalProfit, totalProfitPercent, isLoading, addInvestment, updateInvestment, deleteInvestment, deleteInvestments } = useInvestments();
  
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Investment | undefined>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const { pendingAction, setPendingAction } = useAppStore(
    useShallow((s) => ({
      pendingAction: s.pendingAction,
      setPendingAction: s.setPendingAction
    }))
  );

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const openEdit = (inv: Investment) => { 
    if (isSelectionMode) { toggleSelection(inv.id); return; }
    setEditing(inv); 
    setShowModal(true); 
  };
  
  const openAdd  = () => { setEditing(undefined); setShowModal(true); };

  React.useEffect(() => {
    if (pendingAction === 'ADD_INVESTMENT') {
      openAdd();
      setPendingAction(null);
    }
  }, [pendingAction, setPendingAction]);

  if (isLoading) return (
    <div className="flex items-center justify-center p-20 animate-pulse text-slate-400 font-black uppercase tracking-widest">
      {t('misc.loading') || 'Loading Intelligence...'}
    </div>
  );
  
  const handleSave = async (data: Partial<Investment>) => {
    if (editing?.id) await updateInvestment(editing.id, data);
    else {
      await addInvestment(data);
      checkMilestone('FIRST_INVESTMENT');
    }
  };

  const handleBulkDelete = () => {
    bridge.confirmSheet(
      t('investment.deleteManyConfirm', { n: String(selectedIds.length) }),
      async () => {
        await deleteInvestments(selectedIds);
        setSelectedIds([]);
        setIsSelectionMode(false);
      },
      t('action.delete') || 'حذف',
      t('action.cancel') || 'إلغاء'
    );
  };

  return (
    <div className="p-5 space-y-6 pb-40 animate-in fade-in duration-700 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-3xl font-black text-[#002b59] dark:text-blue-50 tracking-tighter">
            {t('page.investments')}
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
            {investments.length} {t('investment.assets')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {investments.length > 0 && (
            <button 
              onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isSelectionMode ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
            >
              <span className="material-symbols-outlined">{isSelectionMode ? 'close' : 'checklist'}</span>
            </button>
          )}
          <button onClick={openAdd}
            className="w-12 h-12 rounded-[1.25rem] bg-[#002b59] text-white flex items-center justify-center shadow-xl shadow-blue-900/20 active:scale-90 transition-transform">
            <span className="material-symbols-outlined text-2xl">add</span>
          </button>
        </div>
      </div>

      {/* Portfolio Summary Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#002b59] via-[#003d7e] to-[#1a4175] rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-900/30 group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl transition-transform duration-1000 group-hover:scale-110" />
        
        <div className="relative z-10">
          <p className="text-blue-200/80 text-[10px] font-black uppercase tracking-[0.3em] mb-3">
            {t('investment.totalValue')}
          </p>
          <p className="text-5xl font-black tracking-tighter tabular-nums drop-shadow-sm">{fmt(totalValue)}</p>
          
          <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10">
            <div>
              <p className="text-blue-200/60 text-[9px] font-black uppercase tracking-widest mb-1">{t('investment.totalCost')}</p>
              <p className="text-lg font-black tracking-tight">{fmt(totalCost)}</p>
            </div>
            <div className="text-right">
              <p className="text-blue-200/60 text-[9px] font-black uppercase tracking-widest mb-1">{t('investment.profit')}</p>
              <div className={`flex items-center justify-end gap-1.5 font-black ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                <span className="material-symbols-outlined text-lg">{totalProfit >= 0 ? 'trending_up' : 'trending_down'}</span>
                <span className="text-lg">{totalProfit >= 0 ? '+' : ''}{fmt(totalProfit)}</span>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${totalProfit >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                {totalProfitPercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Breakdown Chart */}
      <PortfolioBreakdown investments={investments} />

      {/* Assets List */}
      {investments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-300">
          <div className="w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center border-4 border-dashed border-slate-100 dark:border-slate-800">
            <span className="material-symbols-outlined text-5xl">monitoring</span>
          </div>
          <div className="text-center">
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{t('investment.empty')}</p>
            <button onClick={openAdd} className="mt-2 px-6 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-colors">
              {t('investment.addFirst')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {investments.map(inv => {
            const profit = inv.value - inv.cost;
            const profitPct = inv.cost > 0 ? (profit / inv.cost) * 100 : 0;
            const color = INV_COLORS[inv.type || 'other'] || '#002b59';
            const isSelected = selectedIds.includes(inv.id);

            return (
              <div 
                key={inv.id} 
                onClick={() => openEdit(inv)}
                className={`group relative overflow-hidden bg-white dark:bg-[#1e2124] rounded-[2rem] p-5 border transition-all duration-300 cursor-pointer active:scale-[0.98] ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg' : 'border-slate-100 dark:border-white/5 hover:shadow-md hover:border-blue-100 dark:hover:border-blue-900/30'}`}
              >
                <div className="flex items-center gap-4">
                  {/* Selection Overlay */}
                  {isSelectionMode && (
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300 dark:border-slate-600'}`}>
                       {isSelected && <span className="material-symbols-outlined text-white text-sm font-black">check</span>}
                    </div>
                  )}

                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner" style={{ background: `${color}15`, color }}>
                    {(() => {
                      const icon = inv.icon || INV_ICONS[inv.type || 'other'];
                      const isEmoji = /\p{Extended_Pictographic}/u.test(icon) || icon === '₿';
                      return (
                        <span className={isEmoji ? "text-2xl" : "material-symbols-outlined text-2xl"} style={isEmoji ? {} : { fontVariationSettings: "'FILL' 1" }}>
                          {icon}
                        </span>
                      );
                    })()}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 dark:text-slate-100 truncate text-base">{inv.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-100 dark:border-white/5">
                        {t(`investment.${inv.type}`) || inv.type}
                      </span>
                      {inv.accountId && (
                        <span className="material-symbols-outlined text-[10px] text-slate-300">link</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-black text-base dark:text-white tabular-nums">{fmt(inv.value)}</p>
                    <div className={`flex items-center justify-end gap-0.5 mt-0.5 font-black text-[10px] ${profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      <span className="material-symbols-outlined text-[12px]">{profit >= 0 ? 'trending_up' : 'trending_down'}</span>
                      <span>{profitPct.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                {/* Desktop/Tablet Hover Actions */}
                {!isSelectionMode && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center gap-2 bg-white/80 dark:bg-[#1e2124]/80 backdrop-blur-sm p-2 rounded-xl">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(inv); }} className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteInvestment(inv.id); }} className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk Action Bar */}
      {isSelectionMode && selectedIds.length > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-[#1e2124] dark:bg-white text-white dark:text-[#1e2124] p-4 rounded-[2rem] shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-5 duration-300 z-40">
          <div className="flex items-center gap-3 ml-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-black text-xs">
              {selectedIds.length}
            </div>
            <p className="text-xs font-black uppercase tracking-widest">{t('investment.bulkSelected')}</p>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => setSelectedIds([])} className="px-4 py-2 text-xs font-bold uppercase hover:opacity-70 transition-opacity">{t('action.cancel')}</button>
             <button 
               onClick={handleBulkDelete}
               className="bg-rose-500 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"
             >
               <span className="material-symbols-outlined text-sm">delete</span>
               {t('action.delete')}
             </button>
          </div>
        </div>
      )}

      {showModal && (
        <InvestmentModal 
          investment={editing} 
          onSave={handleSave} 
          onDelete={deleteInvestment}
          onClose={() => { setShowModal(false); setEditing(undefined); }} 
        />
      )}
    </div>
  );
}
