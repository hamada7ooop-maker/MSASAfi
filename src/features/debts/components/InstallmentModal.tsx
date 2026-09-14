import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import type { Installment, Account } from '../../../types';
import { toast } from '../../../toast';

interface InstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  installmentToEdit: Installment | null;
  accounts: Account[];
  onSave: (data: Omit<Installment, 'id'>) => Promise<void>;
}

export function InstallmentModal({ isOpen, onClose, installmentToEdit, accounts, onSave }: InstallmentModalProps) {
  const { t, isLTR } = useI18n();
  const { fmt, parseNum, getCurrencySymbol, sanitizeNumericInput, sanitizeIntegerInput } = useFormat();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [totalPayments, setTotalPayments] = useState('12');
  const [paidPayments, setPaidPayments] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      if (installmentToEdit) {
        setName(installmentToEdit.name || '');
        setAmount(installmentToEdit.amount ? String(installmentToEdit.amount) : '');
        setTotalPayments(installmentToEdit.totalPayments ? String(installmentToEdit.totalPayments) : '12');
        setPaidPayments(installmentToEdit.paidPayments !== undefined ? String(installmentToEdit.paidPayments) : '0');
        setDueDate(installmentToEdit.dueDate || '');
        setAccountId(installmentToEdit.accountId || '');
        setNotes(installmentToEdit.notes || '');
      } else {
        setName('');
        setAmount('');
        setTotalPayments('12');
        setPaidPayments('0');
        
        // Default to today's date
        const today = new Date().toISOString().split('T')[0];
        setDueDate(today);
        
        setAccountId('');
        setNotes('');
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, installmentToEdit]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const numAmount = parseNum(amount);
    const numTotal = Math.round(parseNum(totalPayments));
    const numPaid = paidPayments.trim() ? Math.round(parseNum(paidPayments)) : 0;

    if (!name.trim()) {
      toast(t('bill.fillAll') || 'Please enter a description', 'error');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      toast(t('txn.errAmount') || 'Invalid amount', 'error');
      return;
    }
    if (!numTotal || numTotal <= 0) {
      toast(t('bill.fillAll') || 'Invalid total payments', 'error');
      return;
    }
    if (isNaN(numPaid) || numPaid < 0 || numPaid > numTotal) {
      toast(t('bill.fillAll') || 'Invalid paid payments', 'error');
      return;
    }
    if (!dueDate) {
      toast(t('bill.fillAll') || 'Please select a due date', 'error');
      return;
    }

    await onSave({
      name: name.trim(),
      amount: numAmount,
      totalPayments: numTotal,
      paidPayments: numPaid,
      dueDate,
      accountId: accountId || undefined,
      notes: notes.trim() || undefined
    });
    
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[99990] flex items-end justify-center bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-[440px] bg-gradient-to-b from-white to-slate-50 dark:from-[#1c1f23] dark:to-[#141618] rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-500"
        onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>

        <h3 className="text-xl font-black mb-6 text-slate-800 dark:text-white">
          {installmentToEdit ? (t('debt.addInstallment') || 'Edit Installment') : (t('debt.addInstallment') || 'Add Installment')}
        </h3>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          
          {/* Installment Name */}
          <div>
            <label className="text-[11px] uppercase font-black text-slate-400 mb-1 block">
              {t('debt.installmentName') || 'Installment Name'}
            </label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onCompositionEnd={(e) => setName((e.target as HTMLInputElement).value)}
              onBlur={(e) => setName(e.target.value)}
              dir="auto"
              autoComplete="off"
              className="w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30" 
              placeholder={t('debt.installmentName') || 'Installment Name'}
            />
          </div>

          {/* Amount and Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase font-black text-slate-400 mb-1 block">
                {t('debt.installmentAmount') || 'Monthly Amount'}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isLTR ? 'left-4' : 'right-4'} flex items-center pointer-events-none`}>
                  <span className="text-slate-400 font-bold">{getCurrencySymbol()}</span>
                </div>
                <input 
                  type="text" 
                  inputMode="decimal"
                  dir="auto"
                  value={amount}
                  onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
                  onCompositionEnd={(e) => setAmount(sanitizeNumericInput((e.target as HTMLInputElement).value))}
                  onBlur={(e) => setAmount(sanitizeNumericInput(e.target.value))}
                  className={`w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl border-none font-black text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 ${isLTR ? 'pl-10' : 'pr-10'}`} 
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase font-black text-slate-400 mb-1 block">
                {t('debt.nextDueDate') || 'Next Due Date'}
              </label>
              <input 
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30" 
              />
            </div>
          </div>

          {/* Payments breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase font-black text-slate-400 mb-1 block">
                {t('debt.totalPayments') || 'Total Payments'}
              </label>
              <input 
                type="text"
                inputMode="numeric"
                dir="auto"
                value={totalPayments}
                onChange={(e) => setTotalPayments(sanitizeIntegerInput(e.target.value))}
                onCompositionEnd={(e) => setTotalPayments(sanitizeIntegerInput((e.target as HTMLInputElement).value))}
                onBlur={(e) => setTotalPayments(sanitizeIntegerInput(e.target.value))}
                className="w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30" 
                placeholder="12"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase font-black text-slate-400 mb-1 block">
                {t('debt.paidPayments') || 'Paid Payments'}
              </label>
              <input 
                type="text"
                inputMode="numeric"
                dir="auto"
                value={paidPayments}
                onChange={(e) => setPaidPayments(sanitizeIntegerInput(e.target.value))}
                onCompositionEnd={(e) => setPaidPayments(sanitizeIntegerInput((e.target as HTMLInputElement).value))}
                onBlur={(e) => setPaidPayments(sanitizeIntegerInput(e.target.value))}
                className="w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30" 
                placeholder="0"
              />
            </div>
          </div>

          {/* Linked Account */}
          {accounts.length > 0 && (
            <div>
              <label className="text-[11px] uppercase font-black text-slate-400 mb-1 block">
                {t('nav.accounts')}
              </label>
              <div className="relative">
                <select 
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none"
                >
                  <option value="">{t('common.selectAccount') || '-- None --'}</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance)})</option>
                  ))}
                </select>
                <div className={`absolute inset-y-0 ${isLTR ? 'right-4' : 'left-4'} flex items-center pointer-events-none`}>
                  <span className="material-symbols-outlined text-slate-400">expand_more</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-[11px] uppercase font-black text-slate-400 mb-1 block">
              {t('common.notes') || 'Notes'}
            </label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 min-h-[80px]" 
              placeholder={t('common.notes') || 'Notes'}
            />
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-8">
          <button 
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-500 active:scale-95 transition-all"
          >
            {t('action.cancel')}
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-bold active:scale-95 transition-all shadow-lg shadow-blue-500/30"
          >
            {t('action.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
