import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';
import { useIsMounted } from '../../hooks/useIsMounted';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/index';
import { useFormat } from '../../core/hooks/useFormat';
import { TransactionRepository } from '../../core/db/repositories/transactions';
import { AccountRepository } from '../../core/db/repositories/accounts';
import { db as DB } from '@/core/db/core';
import type { Category, Account } from '../../types';
import { toast } from '../../toast';
import { OCRScanner } from '../../features/transactions/components/OCRScanner';
import { parseSMS } from '../../services/smsService';
import { checkMilestone } from '../../core/loyalty';
import { silentFail } from '../../core/utils';
import { useFocusTrap } from '../../core/hooks/useFocusTrap';
import { useSheetDrag } from '../../core/hooks/useSheetDrag';
import { touch } from '../../core/haptics';

/**
 * QuickAddModal Component - React port of the legacy Quick Add feature.
 */
export function QuickAddModal() {
  const { t, isLTR } = useI18n();
  const navigate = useNavigate();
  const isMounted = useIsMounted();
  const { parseNum, getCurrencySymbol, sanitizeNumericInput } = useFormat();
  const { isQuickAddOpen, setQuickAddOpen, editingTransactionId, setEditingTransactionId } = useAppStore(
    useShallow((s) => ({
      isQuickAddOpen: s.isQuickAddOpen,
      setQuickAddOpen: s.setQuickAddOpen,
      editingTransactionId: s.editingTransactionId,
      setEditingTransactionId: s.setEditingTransactionId
    }))
  );
  const containerRef = useFocusTrap<HTMLDivElement>(isQuickAddOpen);
  // Directive 19 Batch 2 — the thumb-first sheet: grab the handle, pull down.
  const closeModalRef = useRef<() => void>(() => {});
  const { dragY, transition, handlers: dragHandlers } = useSheetDrag({
    onDismiss: () => closeModalRef.current(),
  });
  const { unlockedItems } = useSettingsStore(
    useShallow((s) => ({ unlockedItems: s.unlockedItems }))
  );
  const isTurboUnlocked = unlockedItems.includes('perk:turbo-scanner');
  
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);
  const [showSMSInput, setShowSMSInput] = useState(false);
  const [smsText, setSmsText] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [datetime, setDatetime] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Mirrors `type` so loadData can read the latest value without taking it as
  // a dependency (see the note in loadData).
  const typeRef = useRef(type);
  useEffect(() => {
    typeRef.current = type;
  }, [type]);

  const loadData = useCallback(async () => {
    try {
      const [cats, accs] = await Promise.all([
        DB.getCategories(),
        AccountRepository.getAll()
      ]);
      if (!isMounted.current) return;
      setCategories(cats);
      setAccounts(accs);
      
      if (editingTransactionId) {
        const tx = await TransactionRepository.getById(editingTransactionId);
        if (tx && isMounted.current) {
          setType(tx.type as 'income' | 'expense');
          setAmount(tx.amount.toString());
          setSelectedCategory(tx.category || '');
          
          if (tx.date || tx.createdAt) {
            const d = new Date(tx.date || tx.createdAt || Date.now());
            // Adjust to local time format for datetime-local input
            setDatetime(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
          }
        }
      } else {
        // Set default category for the current type.
        // `type` is read through a ref rather than listed as a dependency on
        // purpose: this picks a sensible DEFAULT when the sheet opens. Making
        // loadData depend on `type` would re-run the whole load — and reset
        // the category the user just chose — every time they toggle
        // income/expense mid-entry.
        const defaultCat = cats.find(
          (c: Category) => c.type === typeRef.current || c.type === 'both'
        );
        if (defaultCat && isMounted.current) setSelectedCategory(defaultCat.name);
      }
    } catch (err) {
      silentFail('[QuickAdd] Load data error')(err);
    }
    // `editingTransactionId` IS a real dependency: without it, opening the
    // sheet for a second transaction could populate it from the first.
  }, [editingTransactionId, isMounted]);

  useEffect(() => {
    if (isQuickAddOpen) {
      loadData();
      // Auto-focus amount input
      const timer = setTimeout(() => amountInputRef.current?.focus(), 400);
      return () => clearTimeout(timer);
    }
  }, [isQuickAddOpen, loadData]);


  useEffect(() => {
    // Update default category when type changes, but ONLY if not editing
    if (!editingTransactionId && categories.length > 0) {
      const defaultCat = categories.find(c => c.type === type || c.type === 'both');
      if (defaultCat) setSelectedCategory(defaultCat.name);
    }
  }, [type, categories, editingTransactionId]);

  if (!isQuickAddOpen) return null;

  const handleSave = async () => {
    const numAmount = parseNum(amount);
    if (!numAmount || numAmount <= 0) {
      touch.error();
      toast(t('txn.errAmount'), 'error');
      return;
    }

    if (!selectedCategory) {
      touch.error();
      toast(t('txn.errCategory'), 'error');
      return;
    }

    if (accounts.length === 0) {
      touch.error();
      toast(t('account.noAccounts'), 'error');
      return;
    }

    const txnYear = new Date(datetime).getFullYear();
    const { lockedYears = [] } = useSettingsStore.getState();
    if (lockedYears.includes(txnYear)) {
      touch.error();
      toast(t('settings.yearLockedError', { year: String(txnYear) }) || `السنة المالية ${txnYear} مغلقة ومؤرشفة! لا يمكن تعديل أو إضافة معاملات بها.`, 'error');
      return;
    }

    try {
      const defaultAccount = accounts[0];
      const txnDate = new Date(datetime).toISOString();
      
      if (editingTransactionId) {
        await TransactionRepository.update(editingTransactionId, {
          amount: numAmount,
          type,
          category: selectedCategory,
          date: txnDate,
          // Don't overwrite account if editing unless we build an account selector
        });
        touch.confirm();
        toast(t('txn.updated') || 'تم التحديث', 'success');
      } else {
        await TransactionRepository.add({
          amount: numAmount,
          type,
          category: selectedCategory,
          description: t(selectedCategory) || selectedCategory,
          date: txnDate,
          accountId: defaultAccount?.id,
          account: defaultAccount?.name,
        });
        touch.confirm();
        toast(t('txn.saved'), 'success');
        checkMilestone('FIRST_TRANSACTION');
      }

      closeModal();
    } catch (err) {
      silentFail('[QuickAdd] Save error')(err);
      toast(t('common.error'), 'error');
    }
  };

  const handleDelete = async () => {
    if (!editingTransactionId) return;
    try {
      const tx = await TransactionRepository.getById(editingTransactionId);
      if (tx) {
        const txYear = new Date(tx.date || tx.createdAt || Date.now()).getFullYear();
        const { lockedYears = [] } = useSettingsStore.getState();
        if (lockedYears.includes(txYear)) {
          toast(t('settings.yearLockedError', { year: String(txYear) }) || `السنة المالية ${txYear} مغلقة ومؤرشفة! لا يمكن تعديل أو حذف المعاملات بها.`, 'error');
          return;
        }
      }
      if (confirm(t('txn.deleteOne') || 'هل أنت متأكد من الحذف؟')) {
        touch.destruct();
        await TransactionRepository.delete(editingTransactionId);
        toast(t('txn.deleted') || 'تم الحذف', 'error');
        closeModal();
      }
    } catch (err) {
      silentFail('[QuickAdd] Delete error')(err);
    }
  };

  const closeModal = () => {
    setQuickAddOpen(false);
    setTimeout(() => {
      // Guard: if the sheet was re-opened while the close animation timer was
      // still pending, this cleanup must NOT wipe the fresh session's state
      // (found by the Batch 2 haptics suite: a leaked timer from a previous
      // close raced an immediate edit-open and nulled editingTransactionId).
      if (useAppStore.getState().isQuickAddOpen) return;
      setEditingTransactionId(null);
      setAmount('');
      setShowScanner(false);
    }, 300); // Wait for transition
  };
  // The drag hook lives above (with the other hooks) but dismisses through
  // this stable callback — kept in sync so hook order never moves.
  closeModalRef.current = closeModal;


  const handleScanClick = () => {
    if (!isTurboUnlocked) {
      toast(t('shop.perk.turboScanner') + ' Required', 'warning');
      setQuickAddOpen(false);
      navigate('/shop');
      return;
    }
    setShowScanner(true);
  };

  const handleOcrResult = async (result: { amount: string | number; date?: string; merchant?: string; text?: string }) => {
    const parsedAmount = typeof result.amount === 'string' ? parseFloat(result.amount) : result.amount;
    if (parsedAmount > 0) {
      setAmount(parsedAmount.toString());
    }
    if (result.date) {
      const d = new Date(result.date);
      if (!isNaN(d.getTime())) {
        setDatetime(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
      }
    }
    
    if (result.text && result.text.length > 5) {
      const { classifyTransactionSmart } = await import('../../ai');
      const cat = await classifyTransactionSmart(result.text);
      if (cat) {
        setSelectedCategory(cat);
      }
    }
    
    setShowScanner(false);
    checkMilestone('VISIONARY');
  };

  const handleSMSParse = async () => {
    if (!smsText) return;
    const result = parseSMS(smsText);
    if (result) {
      if (result.amount > 0) setAmount(result.amount.toString());
      setType(result.type);
      
      const { classifyTransactionSmart } = await import('../../ai');
      const cat = await classifyTransactionSmart(result.description || smsText);
      if (cat) setSelectedCategory(cat);
      
      touch.light();
      toast(t('txn.smsParsed') || 'تم تحليل الرسالة', 'success');
      setShowSMSInput(false);
      setSmsText('');
    } else {
      toast(t('txn.smsFail') || 'فشل تحليل الرسالة', 'error');
    }
  };

  const filteredCategories = categories.filter(c => c.type === type || c.type === 'both').slice(0, 10);

  return (
    <div 
      className="bottom-sheet-overlay z-[99990] animate-in fade-in duration-300"
      style={{ opacity: 1 }}
      role="presentation"
    >
      <div className="absolute inset-0" onClick={closeModal} aria-hidden="true" />
      <div 
        ref={containerRef}
        id="quick-add-sheet" 
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-add-title"
        className="bottom-sheet-content relative bg-gradient-to-b from-white to-slate-50 dark:from-[#1c1f23] dark:to-[#141618] animate-in slide-in-from-bottom-full duration-500"
        style={{ transform: dragY > 0 ? `translateY(${dragY}px)` : undefined, transition }}
      >
        <div
          data-testid="sheet-handle"
          className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6 cursor-grab touch-none"
          aria-hidden="true"
          {...dragHandlers}
        ></div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">{editingTransactionId ? 'edit' : 'bolt'}</span>
            </div>
            <h2 id="quick-add-title" className="text-2xl font-black text-[#002b59] dark:text-blue-100">
              {editingTransactionId ? (t('txn.editTitle') || 'تعديل المعاملة') : t('home.quickAdd')}
            </h2>
          </div>
          <button 
            onClick={closeModal}
            aria-label={t('action.close') || 'Close'}
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 active:scale-90 transition-all"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        {/* Type Toggle */}
        <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl mb-6" role="group" aria-label={t('txn.type') || 'Transaction Type'}>
          <button 
            onClick={() => { setType('expense'); touch.select(); }}
            aria-pressed={type === 'expense'}
            className={`flex-1 py-3 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${type === 'expense' ? 'bg-white dark:bg-[#2a2d31] shadow-md text-red-600' : 'text-slate-500'}`}
          >
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: type === 'expense' ? "'FILL' 1" : "'FILL' 0" }} aria-hidden="true">trending_down</span>
            {t('txn.expense')}
          </button>
          <button 
            onClick={() => { setType('income'); touch.select(); }}
            aria-pressed={type === 'income'}
            className={`flex-1 py-3 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${type === 'income' ? 'bg-white dark:bg-[#2a2d31] shadow-md text-green-600' : 'text-slate-500'}`}
          >
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: type === 'income' ? "'FILL' 1" : "'FILL' 0" }} aria-hidden="true">trending_up</span>
            {t('home.income')}
          </button>
        </div>

        {/* Amount Input */}
        <div className="relative mb-6">
          <div className={`absolute inset-y-0 ${isLTR ? 'left-4' : 'right-4'} flex items-center pointer-events-none`}>
            <span className="text-slate-400 font-bold text-lg" aria-hidden="true">{getCurrencySymbol()}</span>
          </div>
          <input 
            ref={amountInputRef}
            type="text" 
            inputMode="decimal"
            aria-label={t('txn.amount') || 'Amount'}
            value={amount}
            onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
            onCompositionEnd={(e) => setAmount(sanitizeNumericInput(e.currentTarget.value))}
            className={`w-full bg-slate-50 dark:bg-[#25282d] border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-2xl py-4 ${isLTR ? 'pl-12 pr-28 text-left' : 'pr-12 pl-28 text-right'} text-4xl font-black text-[#002b59] dark:text-blue-100 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600`} 
            placeholder="0"
          />
          <div className={`absolute inset-y-2 ${isLTR ? 'right-2' : 'left-2'} flex gap-1`}>
            <button 
              onClick={() => { setShowSMSInput(!showSMSInput); if(!showSMSInput) setTimeout(() => document.getElementById('sms-input')?.focus(), 100); }}
              aria-label={t('txn.readSMS') || 'Read SMS'}
              className={`w-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center transition-all active:scale-90 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 ${showSMSInput ? 'ring-2 ring-indigo-500' : ''}`}
              title={t('txn.readSMS')}
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">sms</span>
            </button>
            <button 
              onClick={handleScanClick}
              aria-label={t('txn.scanOCR') || 'Scan Receipt OCR'}
              className={`w-12 rounded-xl flex items-center justify-center transition-all active:scale-90 ${isTurboUnlocked ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/40' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
              title={t('txn.scanOCR')}
            >
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                {isTurboUnlocked ? 'document_scanner' : 'lock'}
              </span>
            </button>
          </div>
        </div>

        {/* SMS Input Overlay */}
        {showSMSInput && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
            <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-3 space-y-3">
              <textarea 
                id="sms-input"
                dir="auto"
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                onCompositionEnd={(e) => setSmsText(e.currentTarget.value)}
                placeholder={t('txn.smsPrompt') || 'أدخل نص الرسالة البنكية هنا...'}
                className="w-full bg-white dark:bg-[#1a1c1e] border border-indigo-200 dark:border-indigo-800 rounded-xl p-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500/20 h-20 resize-none"
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowSMSInput(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest"
                >
                  {t('action.cancel')}
                </button>
                <button 
                  onClick={handleSMSParse}
                  className="flex-[2] py-2 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-md shadow-indigo-600/20"
                >
                  {t('action.parse') || 'تحليل الرسالة'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category Chips */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{t('settings.categories')}</label>
          </div>
          <div className="flex flex-nowrap gap-3 pb-2 overflow-x-auto scrollbar-hide">
            {filteredCategories.map(c => (
              <button 
                key={c.id}
                onClick={() => { setSelectedCategory(c.name); touch.light(); }}
                className="flex flex-col items-center gap-1.5 min-w-[72px] group"
              >
                <div 
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${selectedCategory === c.name ? 'ring-4 ring-blue-500/30 scale-110' : 'hover:scale-105'}`}
                  style={{ 
                    backgroundColor: c.color === 'transparent' ? 'transparent' : `${c.color}15`, 
                    color: c.color === 'transparent' ? 'var(--color-primary)' : (c.color === 'white' ? '#64748b' : c.color), 
                    border: c.color === 'transparent' ? '2px dashed rgba(0,0,0,0.1)' : `2px solid ${c.color}${selectedCategory === c.name ? '80' : '30'}` 
                  }}
                >
                  {(() => {
                    const icon = c.icon || 'category';
                    const isEmoji = /\p{Extended_Pictographic}/u.test(icon);
                    return (
                      <span className={isEmoji ? "text-3xl" : "material-symbols-outlined text-2xl"} style={isEmoji ? {} : { fontVariationSettings: "'FILL' 1" }}>
                        {icon}
                      </span>
                    );
                  })()}
                </div>
                <span className={`text-[11px] font-bold truncate w-full text-center px-1 transition-colors ${selectedCategory === c.name ? 'text-blue-500' : 'text-slate-500'}`}>
                  {t(c.name)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Date Picker */}
        <div className="mb-8">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">{t('txn.date')}</label>
          <div className="relative">
            <span className={`absolute inset-y-0 ${isLTR ? 'left-4' : 'right-4'} flex items-center pointer-events-none text-slate-400`}>
              <span className="material-symbols-outlined text-lg">calendar_today</span>
            </span>
            <input 
              type="datetime-local" 
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              className={`w-full bg-slate-50 dark:bg-[#25282d] border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-2xl ${isLTR ? 'pl-12 pr-4' : 'pr-12 pl-4'} py-3 text-sm font-bold text-[#002b59] dark:text-blue-100 outline-none transition-all`}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {editingTransactionId ? (
            <button aria-label={t('action.delete') || 'Delete'} 
              onClick={handleDelete}
              className="flex-1 py-4 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-black flex flex-col items-center justify-center gap-1 active:scale-95 transition-all border border-rose-100 dark:border-rose-900/50"
            >
              <span className="material-symbols-outlined" aria-hidden="true">delete</span>
              <span className="text-sm">{t('action.delete') || 'حذف'}</span>
            </button>
          ) : (
            <button 
              className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
              onClick={() => {
                closeModal();
                navigate('/transactions/add');
              }}
            >
              <span className="material-symbols-outlined">tune</span>
              <span className="text-xs">{t('txn.moreDetails') || 'More'}</span>
            </button>
          )}

          <button aria-label={t('action.confirm') || 'Confirm'} 
            onClick={handleSave}
            className="flex-[2] py-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black flex flex-col items-center justify-center gap-1 shadow-lg shadow-blue-500/40 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">check_circle</span>
            <span className="text-sm">{editingTransactionId ? (t('action.save') || 'حفظ') : t('action.save')}</span>
          </button>
        </div>
      </div>
      {showScanner && (
        <OCRScanner 
          onScan={handleOcrResult} 
          onClose={() => setShowScanner(false)} 
        />
      )}
    </div>
  );
}
