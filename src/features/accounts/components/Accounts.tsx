import React, { useState } from 'react';
import { useAccounts } from '../hooks/useAccounts';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import type { Account } from '../../../types';
import { checkMilestone } from '../../../core/loyalty';

const ACCOUNT_ICONS: Record<string, string> = {
  bank: 'account_balance', cash: 'payments',
  ewallet: 'account_balance_wallet', crypto: 'currency_bitcoin',
  savings: 'account_balance_wallet', credit: 'credit_card',
};
const ACCOUNT_COLORS: Record<string, string> = {
  bank: '#002b59', cash: '#059669', ewallet: '#7c3aed', crypto: '#f59e0b',
  savings: '#ec4899', credit: '#ef4444',
};

// ─── Account Modal ────────────────────────────────────────────────────────────
function AccountModal({ account, onSave, onClose }: {
  account?: Partial<Account>; onSave: (d: Partial<Account>) => void; onClose: () => void;
}) {
  const { t } = useI18n();
  const { parseNum, sanitizeNumericInput } = useFormat();
  const [type, setType] = useState<Account['type']>(account?.type || 'bank');
  const [name, setName] = useState(account?.name || '');
  const [balance, setBalance] = useState(account?.balance !== undefined ? String(account.balance) : '');
  const [initialBalance, setInitialBalance] = useState(account?.initialBalance !== undefined ? String(account.initialBalance) : '');

  const handleSave = () => {
    if (!name.trim()) return;
    const numBalance = parseNum(balance);
    const numInitial = initialBalance.trim() ? parseNum(initialBalance) : numBalance;
    onSave({
      ...account,
      name: name.trim(),
      type,
      balance: numBalance,
      initialBalance: numInitial,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 pb-12 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2" />
        <h3 className="text-lg font-black dark:text-white">{account?.id ? t('account.edit') : t('account.add')}</h3>

        {/* Type selector */}
        <div className="grid grid-cols-3 gap-2">
          {(['bank','cash','ewallet','crypto', 'savings', 'credit'] as const).map(tp => (
            <button key={tp} onClick={() => setType(tp)}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${type === tp ? 'bg-[#002b59] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                {ACCOUNT_ICONS[tp]}
              </span>
              <span className="text-[9px] font-bold capitalize">{t(`account.type.${tp}`) || tp}</span>
            </button>
          ))}
        </div>

        <input 
          value={name} 
          onChange={e => setName(e.target.value)}
          onCompositionEnd={e => setName((e.target as HTMLInputElement).value)}
          onBlur={e => setName(e.target.value)}
          dir="auto"
          autoComplete="off"
          placeholder={t('account.namePlaceholder') || 'Account name'}
          className="w-full bg-slate-50 dark:bg-[#2a2d30] p-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white" 
        />

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-slate-400 font-bold px-1">{t('account.balance') || 'Current Balance'}</label>
            <input 
              type="text" 
              inputMode="decimal"
              dir="auto"
              value={balance} 
              onChange={e => setBalance(sanitizeNumericInput(e.target.value, true, true))}
              onCompositionEnd={e => setBalance(sanitizeNumericInput(e.currentTarget.value, true, true))}
              placeholder="0.00"
              className="w-full bg-slate-50 dark:bg-[#2a2d30] p-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white mt-1" 
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-slate-400 font-bold px-1">{t('account.initialBalance') || 'Initial Balance'}</label>
            <input 
              type="text" 
              inputMode="decimal"
              dir="auto"
              value={initialBalance} 
              onChange={e => setInitialBalance(sanitizeNumericInput(e.target.value, true, true))}
              onCompositionEnd={e => setInitialBalance(sanitizeNumericInput(e.currentTarget.value, true, true))}
              placeholder="0.00"
              className="w-full bg-slate-50 dark:bg-[#2a2d30] p-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white mt-1" 
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm">
            {t('action.cancel')}
          </button>
          <button 
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 py-3 rounded-2xl bg-[#002b59] text-white font-black text-sm shadow-lg shadow-blue-900/20 disabled:opacity-50"
          >
            {t('action.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Transfer Modal ───────────────────────────────────────────────────────────
function TransferModal({ accounts, onTransfer, onClose }: {
  accounts: Account[]; onTransfer: (from: string, to: string, amt: number) => void; onClose: () => void;
}) {
  const { t } = useI18n();
  const { parseNum, getCurrencySymbol, sanitizeNumericInput } = useFormat();
  const [fromId, setFromId] = useState(accounts[0]?.id || '');
  const [toId, setToId]     = useState(() => accounts.find(a => a.id !== accounts[0]?.id)?.id || '');
  const [amount, setAmount] = useState('');

  const handleFromChange = (newFromId: string) => {
    setFromId(newFromId);
    if (newFromId === toId) {
      const other = accounts.find(a => a.id !== newFromId);
      if (other) setToId(other.id);
    }
  };

  const fromAcc = accounts.find(a => a.id === fromId);
  const toAcc = accounts.find(a => a.id === toId);

  const handleTransferSubmit = () => {
    const numAmount = parseNum(amount);
    if (!fromAcc) return;
    if (!toAcc || fromId === toId) {
      alert(t('account.errSameAccount') || 'لا يمكن التحويل لنفس الحساب');
      return;
    }
    if (numAmount <= 0) {
      alert(t('txn.errAmount') || 'المبلغ غير صالح');
      return;
    }
    if (numAmount > (fromAcc.balance || 0)) {
      alert(t('account.errInsufficientBalance') || 'رصيد الحساب المصدر غير كافٍ');
      return;
    }
    onTransfer(fromId, toId, numAmount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 pb-12 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2" />
        <h3 className="text-lg font-black dark:text-white">{t('account.transfer') || 'Transfer'}</h3>

        {/* Source Account */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
            {t('account.fromSource') || 'من حساب (المصدر)'}
          </label>
          <select 
            value={fromId} 
            onChange={e => handleFromChange(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#2a2d30] p-3 rounded-2xl text-sm font-bold focus:outline-none dark:text-white"
          >
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.balance || 0})</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-center py-1">
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <span className="material-symbols-outlined text-lg">arrow_downward</span>
          </div>
        </div>

        {/* Destination Account */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
            {t('account.toDestination') || 'إلى حساب (الوجهة)'}
          </label>
          <select 
            value={toId} 
            onChange={e => setToId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#2a2d30] p-3 rounded-2xl text-sm font-bold focus:outline-none dark:text-white"
          >
            {accounts.filter(a => a.id !== fromId).map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.balance || 0})</option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
            {t('txn.amount') || 'Amount'}
          </label>
          <div className="relative">
            <input 
              type="text" 
              inputMode="decimal"
              dir="auto"
              value={amount} 
              onChange={e => setAmount(sanitizeNumericInput(e.target.value))}
              onCompositionEnd={e => setAmount(sanitizeNumericInput(e.currentTarget.value))}
              placeholder="0.00"
              className="w-full bg-slate-50 dark:bg-[#2a2d30] p-3 rounded-2xl text-sm font-bold focus:outline-none dark:text-white" 
            />
            <div className="absolute inset-y-0 right-3 rtl:right-auto rtl:left-3 flex items-center pointer-events-none text-xs font-bold text-slate-400">
              {getCurrencySymbol()}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 font-bold text-sm active:scale-95 transition-all">
            {t('action.cancel')}
          </button>
          <button 
            onClick={handleTransferSubmit}
            disabled={!fromId || !toId || fromId === toId || parseNum(amount) <= 0}
            className="flex-1 py-3 rounded-2xl bg-[#002b59] text-white font-black text-sm active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {t('account.transfer') || 'Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
}

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
        <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-container-low dark:bg-slate-800 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
          <span className="material-symbols-outlined text-sm">edit</span>
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
            <button onClick={() => setConfirmDeleteId(null)} className="w-11 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 active:scale-95 transition-all">
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDeleteId(account.id)} className="w-11 h-10 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 active:scale-95 transition-all">
            <span className="material-symbols-outlined text-xl">delete</span>
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
  const { active, archived, totalBalance, isLoading, addAccount, updateAccount, deleteAccount, transferBetween } = useAccounts();
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
              <span className="material-symbols-outlined text-xl">swap_horiz</span>
            </button>
          )}
          <button onClick={openAdd}
            className="w-10 h-10 rounded-2xl bg-[#002b59] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 transition-all active:scale-90">
            <span className="material-symbols-outlined text-xl">add</span>
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
