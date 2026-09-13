import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { useAppStore } from '../../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { toast } from '../../../toast';
import type { Transaction, Account } from '@/types';
import type { FamilyMember } from '../hooks/useFamily';

export interface SharedWalletTabProps {
  members: FamilyMember[];
  accounts: Account[];
  sharedTransactions: Transaction[];
  /** Sum of every shared transaction — the headline figure on the banner. */
  totalSharedExpenseAmount: number;
  /** Persists an expense. Returns false when validation fails downstream, in
   *  which case the form is deliberately NOT reset so the user keeps input. */
  saveSharedExpense: (
    desc: string,
    amount: number,
    splitMode: 'equal' | 'custom',
    splitBy: number,
    accountId: string,
    icon: string,
    chips: { id: string; name: string }[],
    customSplits: Record<string, number>,
    editId?: string
  ) => Promise<boolean> | boolean;
  deleteSharedExpense: (id: string) => void;
  bulkDelete: (ids: string[]) => void;
  /** Opens the parent-owned member modals. */
  onAddMember: () => void;
  onEditMember: (m: FamilyMember) => void;
  deleteMember: (id: string) => void;
}

/**
 * The "shared wallet" tab: members banner, the add/edit expense form with its
 * split calculator, and the shared transaction log.
 *
 * Extracted from FamilyExpenses.tsx as part of L-1. As with
 * ChildrenAccountsTab, the expense-form state (description, amount, split
 * mode, member chips, the quick calculator) lives here rather than in the
 * parent: nothing outside this tab reads it, and hoisting it was what made the
 * original component unmanageable.
 *
 * Selection state is read straight from the app store rather than passed down,
 * because it is genuinely global — the bulk-selection bar is shared with other
 * screens, so threading it through props would fake a local ownership that
 * does not exist.
 */
export function SharedWalletTab({
  members,
  accounts,
  sharedTransactions,
  totalSharedExpenseAmount,
  saveSharedExpense,
  deleteSharedExpense,
  bulkDelete,
  onAddMember,
  onEditMember,
  deleteMember,
}: SharedWalletTabProps) {
  const { t } = useI18n();
  const { fmt, parseNum, sanitizeNumericInput, sanitizeIntegerInput } = useFormat();

  const { selectedItems, toggleSelection, clearSelection, setAllSelection } = useAppStore(
    useShallow((s) => ({
      selectedItems: s.selectedItems,
      toggleSelection: s.toggleSelection,
      clearSelection: s.clearSelection,
      setAllSelection: s.setAllSelection,
    }))
  );
  const isSelecting = selectedItems.length > 0;

  // Expense form — local by design, see the note above.
  const [editId, setEditId] = useState<string | undefined>();
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [icon, setIcon] = useState('group');
  const [selectedChips, setSelectedChips] = useState([{ id: 'me', name: t('family.me') || 'Me' }]);
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});

  // Quick split calculator.
  const [calcTotal, setCalcTotal] = useState('');
  const [calcPpl, setCalcPpl] = useState('2');

  /**
   * Keep chip labels in step with renamed members.
   *
   * A chip caches the member's name at the time it was selected, so renaming
   * someone in the parent's edit-member modal would otherwise leave a stale
   * label on the form until the chip was toggled off and on. Deriving the fix
   * from the `members` prop keeps the parent from having to reach into this
   * component's state: the rename flows down as data, which is the only
   * direction that survives extraction.
   */
  React.useEffect(() => {
    setSelectedChips((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        const m = members.find((mm) => mm.id === c.id);
        if (m && m.name !== c.name) {
          changed = true;
          return { ...c, name: m.name };
        }
        return c;
      });
      return changed ? next : prev;
    });
  }, [members]);

  const handleToggleChip = (memberId: string, memberName: string) => {
    if (selectedChips.find(c => c.id === memberId)) {
      setSelectedChips(selectedChips.filter(c => c.id !== memberId));
    } else {
      setSelectedChips([...selectedChips, { id: memberId, name: memberName }]);
    }
  };

  const handleCustomSplitChange = (memberId: string, value: string) => {
    const clean = sanitizeNumericInput(value);
    setCustomSplits(prev => ({ ...prev, [memberId]: parseNum(clean) || 0 }));
  };

  const handleSaveExpense = async () => {
    const numAmount = parseNum(amount);
    if (!desc.trim() || numAmount <= 0) {
      toast(t('txn.invalidAmount') || 'Invalid amount', 'error');
      return;
    }

    const success = await saveSharedExpense(
      desc.trim(),
      numAmount,
      splitMode,
      selectedChips.length || 1,
      accountId || accounts[0]?.id || '',
      icon,
      selectedChips,
      customSplits,
      editId
    );

    if (success) {
      // Reset form
      setEditId(undefined);
      setDesc('');
      setAmount('');
      setIcon('group');
      setSelectedChips([{ id: 'me', name: t('family.me') || 'Me' }]);
      setCustomSplits({});
      setSplitMode('equal');
    }
  };

  const handleEdit = (tx: Transaction) => {
    setEditId(tx.id);
    setDesc(tx.description || '');
    setAmount(tx.amount?.toString() || '');
    setAccountId(tx.accountId || accounts[0]?.id || '');
    setIcon(tx.icon || 'group');

    // Reconstruct chips based on includedMembers
    if (tx.includedMembers && Array.isArray(tx.includedMembers)) {
      const inc = tx.includedMembers;
      const chips = [];
      if (inc.includes(t('family.me') || 'Me')) {
        chips.push({ id: 'me', name: t('family.me') || 'Me' });
      }
      members.forEach(m => {
        if (inc.includes(m.name)) {
          chips.push({ id: m.id, name: m.name });
        }
      });
      setSelectedChips(chips);
    }

    if (tx.customSplits) {
      setSplitMode('custom');
      setCustomSplits(tx.customSplits);
    } else {
      setSplitMode('equal');
      setCustomSplits({});
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast(t('family.readyEdit'));
  };

  const handleBulkDelete = () => {
    bulkDelete(selectedItems);
    clearSelection();
  };

  const getSplitHint = () => {
    const count = selectedChips.length;
    if (count <= 1) return t('family.splitHintDefault');
    if (count === 2 && t('family.splitArTwo')) return t('family.splitArTwo');
    return t('family.splitHintN', { n: String(count) });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* Top Banner (Members & Summary) */}
      <div className="bg-gradient-to-br from-[#d97706] to-[#b45309] text-white p-6 rounded-[2rem] relative overflow-hidden shadow-lg shadow-amber-900/20 space-y-4">
        <div className="flex justify-between items-start gap-3">
          <div>
            <h2 className="text-2xl font-black mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-200 text-2xl">account_balance_wallet</span>
              {t('family.title')}
            </h2>
            <p className="text-sm opacity-80">{t('family.subtitle')}</p>
          </div>
          <div className="text-left bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 shrink-0">
            <span className="text-[10px] font-bold block opacity-75">{t('family.sharedLog') || 'المصاريف المشتركة'}</span>
            <span className="text-sm font-black">{fmt(totalSharedExpenseAmount)} ر.س</span>
          </div>
        </div>
        
        <div className="pt-2 border-t border-white/10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-black opacity-90">{t('family.includedMembers')} ({members.length + 1})</span>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="group relative flex flex-col items-center cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-white/30 text-white ring-2 ring-white/50 flex items-center justify-center text-sm font-black transition-all hover:scale-110 shadow-sm">
                <span className="material-symbols-outlined text-sm">person</span>
              </div>
              <p className="text-[9px] mt-1.5 opacity-90 font-bold">{t('family.me')}</p>
            </div>

            {members.map(m => (
              <div key={m.id} className="group relative flex flex-col items-center">
                <div 
                  onClick={() => onEditMember(m)}
                  className="w-10 h-10 rounded-full bg-white/20 text-white ring-1 ring-white/30 flex items-center justify-center text-sm font-black transition-all hover:scale-110 cursor-pointer"
                  title={t('family.editMember')}
                >
                  {m.name[0]}
                </div>
                <p className="text-[9px] mt-1.5 opacity-90 font-bold max-w-[54px] truncate text-center">{m.name}</p>
                {m.relation && <p className="text-[8px] opacity-60 leading-none mt-0.5">{t(`family.rel.${m.relation}`) || m.relation}</p>}
                <div className="absolute -top-1.5 -right-1.5 flex gap-0.5 items-center">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEditMember(m); }} 
                    className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center transition-transform shadow-md active:scale-95 hover:bg-amber-300"
                    title={t('family.editMember')}
                  >
                    <span className="material-symbols-outlined text-[10px]">edit</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteMember(m.id); }} 
                    className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center transition-transform shadow-md active:scale-95 hover:bg-red-600"
                    title={t('action.delete') || 'Delete'}
                  >
                    <span className="material-symbols-outlined text-[10px]">close</span>
                  </button>
                </div>
              </div>
            ))}
            <button 
              onClick={onAddMember} 
              className="w-10 h-10 rounded-full border border-dashed border-white/50 flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95"
              title={t('action.add') || 'Add Member'}
            >
              <span className="material-symbols-outlined text-lg">add</span>
            </button>
          </div>
        </div>
      </div>

  {/* Add Expense Form Card */}
  <div className="bg-white dark:bg-[#1c1f23] p-5 rounded-3xl space-y-4 shadow-sm border border-slate-100 dark:border-slate-800">
    <h3 className="font-black flex items-center gap-2 text-slate-800 dark:text-white text-lg">
      <span className="material-symbols-outlined text-[#d97706]">add_circle</span>
      {editId ? t('action.edit') : t('family.addExpense')}
    </h3>
    
    <div className="space-y-3">
      <input 
        value={desc} 
        onChange={e => setDesc(e.target.value)}
        onCompositionEnd={e => setDesc((e.target as HTMLInputElement).value)}
        onBlur={e => setDesc(e.target.value)}
        dir="auto"
        autoComplete="off"
        className="w-full bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-transparent focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 dark:text-white font-bold text-sm outline-none transition-all" 
        placeholder={t('family.expenseDescPh')}
      />
      
      <div className="grid grid-cols-2 gap-3">
        <input 
          type="text" 
          inputMode="decimal"
          value={amount} 
          onChange={e => setAmount(sanitizeNumericInput(e.target.value))}
          onCompositionEnd={e => setAmount(sanitizeNumericInput((e.target as HTMLInputElement).value))}
          onBlur={e => setAmount(sanitizeNumericInput(e.target.value))}
          dir="auto"
          autoComplete="off"
          className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-transparent focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 dark:text-white font-black text-sm outline-none transition-all" 
          placeholder={t('txn.amount')}
        />
        <select 
          value={accountId} onChange={e => setAccountId(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-transparent focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 dark:text-white font-bold text-xs outline-none transition-all appearance-none"
        >
          {accounts.length === 0 && <option value="">{t('txn.selectAccountMsg')}</option>}
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
    </div>

    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50 space-y-3">
      <p className="text-xs font-black text-slate-500 dark:text-slate-400 mb-1">{t('family.includedMembers')}</p>
      
      <div className="flex gap-2 flex-wrap">
        <div 
          onClick={() => handleToggleChip('me', t('family.me') || 'Me')}
          className={`px-4 py-2 rounded-full text-xs font-black cursor-pointer transition-all flex items-center gap-1 active:scale-95 ${
            selectedChips.find(c => c.id === 'me') 
              ? 'bg-[#002b59] text-white shadow-md' 
              : 'bg-white dark:bg-[#121214] text-slate-500 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">person</span> {t('family.me')}
        </div>
        {members.map(m => {
          const isSel = selectedChips.find(c => c.id === m.id);
          return (
            <div 
              key={m.id}
              onClick={() => handleToggleChip(m.id, m.name)}
              className={`px-4 py-2 rounded-full text-xs font-black cursor-pointer transition-all flex items-center gap-1 active:scale-95 ${
                isSel
                  ? 'bg-[#002b59] text-white shadow-md' 
                  : 'bg-white dark:bg-[#121214] text-slate-500 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {m.name}
            </div>
          );
        })}
      </div>

      {selectedChips.length > 1 && (
        <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('family.splitMethod')}</p>
          <div className="flex gap-2">
            <button 
              onClick={() => setSplitMode('equal')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                splitMode === 'equal' ? 'bg-[#002b59] text-white shadow-md' : 'bg-white dark:bg-[#121214] text-slate-500 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {t('family.splitEqual')}
            </button>
            <button 
              onClick={() => setSplitMode('custom')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                splitMode === 'custom' ? 'bg-[#002b59] text-white shadow-md' : 'bg-white dark:bg-[#121214] text-slate-500 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {t('family.splitCustom')}
            </button>
          </div>

          {splitMode === 'custom' && (
            <div className="space-y-2 mt-3 p-3 bg-white dark:bg-[#121214] rounded-xl border border-slate-100 dark:border-slate-800">
              {selectedChips.map(c => (
                <div key={c.id} className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex-1 truncate">{c.name}</span>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    dir="ltr"
                    autoComplete="off"
                    value={customSplits[c.id] || ''}
                    onChange={e => handleCustomSplitChange(c.id, sanitizeNumericInput(e.target.value))}
                    onCompositionEnd={e => handleCustomSplitChange(c.id, sanitizeNumericInput((e.target as HTMLInputElement).value))}
                    onBlur={e => handleCustomSplitChange(c.id, sanitizeNumericInput(e.target.value))}
                    className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-right text-xs font-black outline-none focus:border-amber-500" 
                    placeholder={t('txn.amount')}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/30">
            <p className="text-[10px] text-blue-700 dark:text-blue-300 font-bold flex items-start gap-1.5 leading-snug">
              <span className="material-symbols-outlined text-[14px]">info</span>
              {t('family.splitNotice')}
            </p>
          </div>
        </div>
      )}
      
      <p className="text-[10px] text-slate-400 font-bold mt-2">{getSplitHint()}</p>
    </div>

    <div className="pt-2">
      <label className="text-[10px] font-bold text-slate-500 uppercase px-1 mb-2 block">{t('category.icon')}</label>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['group', 'shopping_cart', 'restaurant', 'home', 'directions_car', 'flight', 'school', 'medical_services', 'celebration', 'pets'].map(ic => (
          <button 
            key={ic}
            onClick={() => setIcon(ic)}
            className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center transition-all ${
              icon === ic 
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shadow-sm border-2 border-amber-400' 
                : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-2 border-transparent'
            }`}
          >
            <span className="material-symbols-outlined">{ic}</span>
          </button>
        ))}
      </div>
    </div>

    <button 
      onClick={handleSaveExpense}
      className="w-full bg-[#d97706] hover:bg-amber-600 text-white py-3.5 rounded-2xl font-black text-sm active:scale-95 shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2"
    >
      <span className="material-symbols-outlined text-lg">{editId ? 'save' : 'add'}</span>
      {t('action.save')}
    </button>
  </div>

  {/* Shared Log */}
  <div>
    <div className="flex justify-between items-center mb-4 px-1">
      <h3 className="font-black text-lg text-slate-800 dark:text-white">{t('family.sharedLog')}</h3>
      {isSelecting && (
        <div className="flex gap-2">
          <button 
            onClick={() => setAllSelection(sharedTransactions.map(tx => tx.id!))}
            className="text-[#d97706] text-xs font-black flex items-center gap-1 active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">done_all</span>{t('txn.all')}
          </button>
          <button 
            onClick={handleBulkDelete}
            className="bg-red-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1 shadow-md active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">delete</span>{t('action.delete')}
          </button>
          <button 
            onClick={clearSelection}
            className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-xl text-[10px] font-black active:scale-95"
          >
            {t('action.cancel')}
          </button>
        </div>
      )}
    </div>

    {isSelecting && (
      <p className="mx-1 mb-3 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl flex items-center gap-2 animate-pulse border border-amber-200/50 dark:border-amber-800/30">
        <span className="material-symbols-outlined text-base">info</span> 
        {t('family.bulkSelected', { n: String(selectedItems.length) })} 
        ({fmt(sharedTransactions.filter(tx => selectedItems.includes(tx.id!)).reduce((s, tx) => s + (tx.amount || 0), 0))})
      </p>
    )}

    <div className="space-y-3">
      {sharedTransactions.length === 0 ? (
        <div className="bg-white dark:bg-[#1c1f23] rounded-3xl p-10 text-center border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">group</span>
          </div>
          <h4 className="font-black text-slate-700 dark:text-slate-200 mb-1">{t('family.noShared')}</h4>
          <p className="text-xs font-bold text-slate-400 leading-relaxed max-w-[250px] mx-auto">
            {t('family.noSharedSub')}
          </p>
        </div>
      ) : (
        sharedTransactions.map(tx => {
          const share = (tx.splitBy || 1) > 1 ? ` (${fmt((tx.amount || 0) / (tx.splitBy || 1))} ${t('family.perPerson')})` : '';
          const isSelected = selectedItems.includes(tx.id!);
          return (
            <div key={tx.id} className="flex items-center gap-2">
              {(isSelecting || isSelected) && (
                <div 
                  onClick={() => toggleSelection(tx.id!)}
                  className="w-10 flex items-center justify-center cursor-pointer shrink-0 animate-in fade-in slide-in-from-left-2"
                >
                  <span className={`material-symbols-outlined text-2xl transition-colors ${isSelected ? 'text-[#d97706] font-variation-fill' : 'text-slate-300 dark:text-slate-600'}`}>
                    {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                </div>
              )}
              
              <div 
                onClick={() => { if (isSelecting) toggleSelection(tx.id!); }}
                className={`flex-1 bg-white dark:bg-[#1c1f23] rounded-2xl p-4 flex items-center justify-between transition-all ${
                  isSelected ? 'border border-[#d97706] ring-2 ring-[#d97706]/10' : 'border border-slate-100 dark:border-slate-800 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#d97706] text-xl font-variation-fill">{tx.icon || 'group'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-sm text-slate-800 dark:text-white truncate">{tx.description}</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5 truncate">
                      {new Intl.DateTimeFormat(t('lang') === 'ar' ? 'ar-SA' : t('lang') === 'fa' ? 'fa-IR' : 'en-US', { dateStyle: 'medium' }).format(new Date(tx.date || tx.createdAt || Date.now()))}
                      {share}
                    </p>
                    {tx.includedMembers && tx.includedMembers.length > 0 && (
                      <p className="text-[9px] text-slate-400 font-bold mt-1 truncate flex items-center gap-1">
                        <span className="material-symbols-outlined text-[10px]">groups</span> 
                        {tx.includedMembers.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <p className="font-black text-sm text-[#d97706]">{fmt(tx.amount || 0)}</p>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEdit(tx); }}
                      className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteSharedExpense(tx.id!); }}
                      className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  </div>

  {/* Split Calculator */}
  <div className="bg-white dark:bg-[#1c1f23] p-5 rounded-3xl space-y-4 shadow-sm border border-slate-100 dark:border-slate-800">
    <h3 className="font-black flex items-center gap-2 text-slate-800 dark:text-white">
      <span className="material-symbols-outlined text-[#d97706]">calculate</span>
      {t('family.splitCalc')}
    </h3>
    
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase px-1 mb-1.5 block">{t('family.calcTotal')}</label>
        <input 
          type="text" 
          inputMode="decimal"
          value={calcTotal} 
          onChange={e => setCalcTotal(sanitizeNumericInput(e.target.value))}
          onCompositionEnd={e => setCalcTotal(sanitizeNumericInput((e.target as HTMLInputElement).value))}
          onBlur={e => setCalcTotal(sanitizeNumericInput(e.target.value))}
          dir="auto"
          autoComplete="off"
          className="w-full bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-transparent focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 dark:text-white font-black text-sm outline-none transition-all" 
          placeholder="0.00"
        />
      </div>
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase px-1 mb-1.5 block">{t('family.calcPeople')}</label>
        <input 
          type="text" 
          inputMode="numeric"
          value={calcPpl} 
          onChange={e => setCalcPpl(sanitizeIntegerInput(e.target.value))}
          onCompositionEnd={e => setCalcPpl(sanitizeIntegerInput((e.target as HTMLInputElement).value))}
          onBlur={e => setCalcPpl(sanitizeIntegerInput(e.target.value))}
          dir="auto"
          autoComplete="off"
          className="w-full bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-transparent focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 dark:text-white font-black text-sm outline-none transition-all" 
        />
      </div>
    </div>

    {parseNum(calcTotal) > 0 && Math.floor(parseNum(calcPpl)) > 1 && (
      <div className="text-center py-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/30 animate-in zoom-in-95">
        <p className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-widest mb-1">{t('family.perPerson')}</p>
        <p className="text-3xl font-black text-[#d97706]">
          {fmt(parseNum(calcTotal) / Math.floor(parseNum(calcPpl)))}
        </p>
      </div>
    )}
  </div>
    </div>
  );
}
