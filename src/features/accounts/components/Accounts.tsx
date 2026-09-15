import React, { useState } from 'react';
import { useAccounts } from '../hooks/useAccounts';
import { ErrorState } from '../../../components/common/ErrorState';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import type { Account } from '../../../types';
import { checkMilestone } from '../../../core/loyalty';
import { AccountModal } from './AccountModal';
import { TransferModal } from './TransferModal';

const ACCOUNT_ICONS: Record<string, string> = {
  bank: 'account_balance', cash: 'payments',
  ewallet: 'account_balance_wallet', crypto: 'currency_bitcoin',
  savings: 'account_balance_wallet', credit: 'credit_card',
};
const ACCOUNT_COLORS: Record<string, string> = {
  bank: '#002b59', cash: '#059669', ewallet: '#7c3aed', crypto: '#f59e0b',
  savings: '#ec4899', credit: '#ef4444',
};

// ─── Account Card ─────────────────────────────────────────────────────────────
function AccountCard({ account, fmt, total, onEdit, onDelete, onArchive, confirmDeleteId, setConfirmDeleteId }: {
  account: Account; fmt: (n: number) => string; total: number;
  onEdit: () => void; onDelete: () => void; onArchive: () => void;
  confirmDeleteId: string | null; setConfirmDeleteId: (id: string | null) => void;
}) {
  const { t } = useI18n();
  const color = ACCOUNT_COLORS[account.type || 'bank'] || '#002b59';
  const icon  = ACCOUNT_ICONS[account.type  || 'bank'] || 'account_balance';
  const percent = total > 0 ? ((account.balance / total) * 100).toFixed(1) : '0';

  return (
    <div className="fin-card p-5 hover:shadow-xl group transition-all duration-500">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-black/5 dark:border-white/5 transition-transform group-hover:scale-110"
          style={{ background: `${color}15`, color }}>
          <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-base text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 transition-colors">{account.name}</p>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
            {t(`account.type.${account.type}`) || account.type} • {percent}%
          </p>
        </div>
        <div className="text-right">
          <p className={`font-black text-xl tabular-nums ${(account.balance || 0) < 0 ? 'text-rose-500' : 'text-slate-800 dark:text-slate-100'}`}>
            {fmt(account.balance || 0)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-5 pt-5 border-t border-slate-50 dark:border-slate-800/50">
        <button aria-label={t('action.edit') || 'Edit'} onClick={onEdit} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-container-low dark:bg-slate-800 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
          <span className="material-symbols-outlined text-sm" aria-hidden="true">edit</span>
          {t('action.edit')}
        </button>
        <button onClick={onArchive} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-container-low dark:bg-slate-800 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
          <span className="material-symbols-outlined text-sm">{account.archived ? 'unarchive' : 'archive'}</span>
          {account.archived ? (t('action.unarchive') || 'Unarchive') : (t('action.archive') || 'Archive')}
        </button>
        {confirmDeleteId === account.id ? (
          <div className="flex gap-1 animate-in fade-in slide-in-from-right-2 duration-300">
            <button onClick={async () => {
              await onDelete();
              setConfirmDeleteId(null);
            }} className="px-4 py-2 rounded-xl bg-rose-500 text-white font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">
              {t('action.confirm') || 'Confirm'}
            </button>
            <button aria-label={t('action.close') || 'Close'} onClick={() => setConfirmDeleteId(null)} className="w-11 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 active:scale-95 transition-all">
              <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
            </button>
          </div>
        ) : (
          <button aria-label={t('action.delete') || 'Delete'} onClick={() => setConfirmDeleteId(account.id)} className="w-11 h-10 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 active:scale-95 transition-all">
            <span className="material-symbols-outlined text-xl" aria-hidden="true">delete</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Accounts Page ───────────────────────────────────────────────────────
export function Accounts() {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const { active, archived, totalBalance, isLoading, error, retry, addAccount, updateAccount, deleteAccount, transferBetween } = useAccounts();
  const [showModal, setShowModal] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [editing, setEditing] = useState<Account | undefined>();
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (isLoading) return (
    <div className="flex items-center justify-center p-20 animate-pulse text-slate-400">
      {t('misc.loading')}
    </div>
  );

  // Directive 16: a failed load is not an empty list — say so, and offer a way back.
  if (error) return <ErrorState onRetry={retry} />;

  const openEdit = (a: Account) => { setEditing(a); setShowModal(true); };
  const openAdd  = () => { setEditing(undefined); setShowModal(true); };

  const handleSave = async (data: Partial<Account>) => {
    if (editing?.id) await updateAccount(editing.id, data);
    else {
      await addAccount(data);
      checkMilestone('FIRST_ACCOUNT');
    }
  };

  return (
    <div className="p-5 space-y-6 pb-32 animate-in fade-in duration-700">

      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="space-y-1">
          <h2 className="text-3xl text-premium-header text-[var(--color-primary)] dark:text-blue-100">
            {t('nav.accounts') || 'Accounts'}
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-70">
              {active.length} {t('account.activeAccounts') || 'active accounts'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {active.length >= 2 && (
            <button onClick={() => setShowTransfer(true)}
              className="w-10 h-10 rounded-2xl bg-surface-container-low dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-all active:scale-90"
              title={t('account.transfer')}
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">swap_horiz</span>
            </button>
          )}
          <button aria-label={t('action.add') || 'Add'} onClick={openAdd}
            className="w-10 h-10 rounded-2xl bg-[#002b59] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 transition-all active:scale-90">
            <span className="material-symbols-outlined text-xl" aria-hidden="true">add</span>
          </button>
        </div>
      </div>

      {/* Net Worth Card - Premium Glassmorphism */}
      <div className="relative overflow-hidden rounded-[40px] p-8 text-white bg-gradient-to-br from-[#002b59] to-[#1a4175] shadow-[0_32px_64px_-16px_rgba(0,43,89,0.4)] border border-white/20 group transition-all duration-700">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-[80px] animate-pulse"></div>
        
        <div className="relative z-10 w-full">
          <p className="text-[10px] uppercase tracking-[0.3em] opacity-60 font-black mb-3">
            {t('account.totalBalance') || 'Total Balance'}
          </p>
          <h1 className="text-4xl font-black tracking-tighter tabular-nums drop-shadow-2xl">
            {fmt(totalBalance)}
          </h1>
          <div className="flex gap-2 items-center mt-6">
             <div className="bg-white/5 hover:bg-white/10 backdrop-blur-xl px-4 py-2 rounded-2xl flex items-center gap-2 shrink-0 border border-white/5 transition-colors">
                <span className="material-symbols-outlined text-[14px] text-blue-300">account_balance</span>
                <span className="text-[10px] font-black uppercase tracking-widest">{active.length} {t('account.active')}</span>
             </div>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      {active.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-300">
          <span className="material-symbols-outlined text-5xl">account_balance</span>
          <p className="text-sm font-bold">{t('account.empty') || 'No accounts yet'}</p>
          <button onClick={openAdd} className="text-xs text-blue-400 font-bold">
            {t('account.addFirst') || '+ Add your first account'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map(a => (
            <AccountCard key={a.id} account={a} fmt={fmt} total={totalBalance}
              onEdit={() => openEdit(a)}
              onDelete={() => deleteAccount(a.id)}
              onArchive={() => updateAccount(a.id, { archived: !a.archived })}
              confirmDeleteId={confirmDeleteId}
              setConfirmDeleteId={setConfirmDeleteId} />
          ))}
        </div>
      )}

      {/* Archived Toggle */}
      {archived.length > 0 && (
        <button onClick={() => setShowArchived(v => !v)}
          className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-sm">archive</span>
          {showArchived ? (t('action.hide') || 'Hide') : (t('action.show') || 'Show')} {archived.length} {t('account.archived') || 'archived'}
        </button>
      )}
      {showArchived && archived.map(a => (
        <AccountCard key={a.id} account={a} fmt={fmt} total={totalBalance}
          onEdit={() => openEdit(a)}
          onDelete={() => deleteAccount(a.id)}
          onArchive={() => updateAccount(a.id, { archived: false })}
          confirmDeleteId={confirmDeleteId}
          setConfirmDeleteId={setConfirmDeleteId} />
      ))}

      {/* Modals */}
      {showModal && (
        <AccountModal account={editing} onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(undefined); }} />
      )}
      {showTransfer && (
        <TransferModal accounts={active} onTransfer={transferBetween}
          onClose={() => setShowTransfer(false)} />
      )}
    </div>
  );
}
