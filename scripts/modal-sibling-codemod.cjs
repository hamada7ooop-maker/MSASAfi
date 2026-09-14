#!/usr/bin/env node
/**
 * Directive 15 Option B (bonus) — Modal backdrop/dialog sibling codemod.
 *
 * Converts the nested click-eater pattern:
 *   <div className="fixed inset-0 ... bg-black/XX backdrop-blur-Y" onClick={close}>
 *     <div className="... max-w-..." onClick={e => e.stopPropagation()}>
 *
 * into clean siblings:
 *   <div className="fixed inset-0 ...">                       (layout only, no onClick)
 *     <div className="absolute inset-0 bg-black/XX backdrop-blur-Y" onClick={close} aria-hidden="true" />
 *     <div className="relative ... max-w-...">                (no stopPropagation)
 *
 * Strictly behavior-preserving:
 *  - bg/blur paints move to the backdrop sibling; enter/animate/transition classes
 *    STAY on the outer (they animate the whole layer, children included).
 *  - TripFormModal has no backdrop-click close today -> its backdrop sibling gets
 *    NO onClick (behavior preserved: clicking outside does not close).
 *  - QuickAddModal: bg comes from the .bottom-sheet-overlay CSS class which stays
 *    on the outer -> backdrop sibling is a transparent click-catcher.
 *  - AddCardModal: inline styles variant; background/backdropFilter move to the
 *    backdrop sibling; outer keeps animate-in + keyboard activation (role=button).
 *
 * Every entry must match EXACTLY ONCE or the script aborts with exit 1.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/** @type {{file: string, from: string, to: string}[]} */
const EDITS = [
  // ───────────────────────── Group A: one-line outer + one-line dialog ─────────────────────────
  {
    file: 'src/features/accounts/components/Accounts.tsx',
    from: `    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 pb-12 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>`,
    to: `    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 pb-12 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">`,
  },
  {
    file: 'src/features/accounts/components/Accounts.tsx',
    from: `    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 pb-12 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>`,
    to: `    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 pb-12 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">`,
  },
  {
    file: 'src/features/bills/components/BillModal.tsx',
    from: `    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 pb-12 shadow-2xl space-y-4 animate-in slide-in-from-bottom-8 duration-300 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>`,
    to: `    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 pb-12 shadow-2xl space-y-4 animate-in slide-in-from-bottom-8 duration-300 max-h-[90vh] overflow-y-auto">`,
  },
  {
    file: 'src/features/bills/components/SubModal.tsx',
    from: `    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 pb-12 shadow-2xl space-y-4 animate-in slide-in-from-bottom-8 duration-300 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>`,
    to: `    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 pb-12 shadow-2xl space-y-4 animate-in slide-in-from-bottom-8 duration-300 max-h-[90vh] overflow-y-auto">`,
  },
  {
    file: 'src/features/categories/components/CategoryEditor.tsx',
    from: `    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 pb-12 shadow-2xl space-y-4 animate-in slide-in-from-bottom-8 duration-300 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>`,
    to: `    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 pb-12 shadow-2xl space-y-4 animate-in slide-in-from-bottom-8 duration-300 max-h-[90vh] overflow-y-auto">`,
  },
  {
    file: 'src/features/challenges/components/ChallengeModal.tsx',
    from: `    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>`,
    to: `    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-300">`,
  },
  {
    file: 'src/features/investments/components/Investments.tsx',
    from: `    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-md transition-all animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-t-[3rem] p-8 shadow-2xl space-y-6 animate-in slide-in-from-bottom-10 duration-500" onClick={e => e.stopPropagation()}>`,
    to: `    <div className="fixed inset-0 z-[200] flex items-end justify-center transition-all animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-t-[3rem] p-8 shadow-2xl space-y-6 animate-in slide-in-from-bottom-10 duration-500">`,
  },
  {
    file: 'src/features/challenges/components/Challenges.tsx',
    from: `        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setConfirmWeekSave(null)}>
          <div className="bg-white dark:bg-[#1e2124] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>`,
    to: `        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setConfirmWeekSave(null)} aria-hidden="true" />
          <div className="relative bg-white dark:bg-[#1e2124] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">`,
  },

  // ───────────────────────── Group B: multiline outer/dialog ─────────────────────────
  {
    // GlobalActionModal — outer
    file: 'src/components/modals/GlobalActionModal.tsx',
    from: `      className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300"
      onClick={() => setGlobalActionOpen(false)}
    >
      <div `,
    to: `      className="fixed inset-0 z-[10000] flex items-center justify-center p-6 animate-in fade-in duration-300"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xl"
        onClick={() => setGlobalActionOpen(false)}
        aria-hidden="true"
      />
      <div `,
  },
  {
    // GlobalActionModal — dialog (already has `relative`; just drop the click-eater)
    file: 'src/components/modals/GlobalActionModal.tsx',
    from: `        className="bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[3rem] p-8 shadow-2xl border border-white/10 relative overflow-hidden animate-in zoom-in slide-in-from-bottom-12 duration-500"
        onClick={e => e.stopPropagation()}
      >`,
    to: `        className="bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[3rem] p-8 shadow-2xl border border-white/10 relative overflow-hidden animate-in zoom-in slide-in-from-bottom-12 duration-500"
      >`,
  },
  {
    // SearchOverlay — outer keeps enter/transition animations; bg moves to sibling
    file: 'src/components/modals/SearchOverlay.tsx',
    from: `      className="fixed inset-0 z-[99990] flex flex-col bg-[#f8f9fa] dark:bg-[#121214] transition-opacity duration-300 animate-in slide-in-from-bottom-full"
      onClick={() => setSearchOpen(false)}
    >
      <div `,
    to: `      className="fixed inset-0 z-[99990] flex flex-col transition-opacity duration-300 animate-in slide-in-from-bottom-full"
    >
      <div
        className="absolute inset-0 bg-[#f8f9fa] dark:bg-[#121214]"
        onClick={() => setSearchOpen(false)}
        aria-hidden="true"
      />
      <div `,
  },
  {
    // SearchOverlay — dialog gains relative
    file: 'src/components/modals/SearchOverlay.tsx',
    from: `        className="flex-1 w-full max-w-4xl mx-auto bg-[#f8f9fa] dark:bg-[#121214] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}>`,
    to: `        className="relative flex-1 w-full max-w-4xl mx-auto bg-[#f8f9fa] dark:bg-[#121214] shadow-2xl flex flex-col">`,
  },
  {
    // QuickAddModal — bg lives in .bottom-sheet-overlay CSS (stays on outer); sibling is a transparent click-catcher
    file: 'src/components/modals/QuickAddModal.tsx',
    from: `      className="bottom-sheet-overlay z-[99990] animate-in fade-in duration-300"
      style={{ opacity: 1 }}
      onClick={closeModal}
      role="presentation"
    >
      <div `,
    to: `      className="bottom-sheet-overlay z-[99990] animate-in fade-in duration-300"
      style={{ opacity: 1 }}
      role="presentation"
    >
      <div className="absolute inset-0" onClick={closeModal} aria-hidden="true" />
      <div `,
  },
  {
    // QuickAddModal — sheet gains relative
    file: 'src/components/modals/QuickAddModal.tsx',
    from: `        className="bottom-sheet-content bg-gradient-to-b from-white to-slate-50 dark:from-[#1c1f23] dark:to-[#141618] animate-in slide-in-from-bottom-full duration-500"
        onClick={(e) => e.stopPropagation()}
      >`,
    to: `        className="bottom-sheet-content relative bg-gradient-to-b from-white to-slate-50 dark:from-[#1c1f23] dark:to-[#141618] animate-in slide-in-from-bottom-full duration-500"
      >`,
  },
  {
    // AssetDetailModal — outer keeps role/aria; loses onClick + bg/blur
    file: 'src/features/assets/components/AssetDetailModal.tsx',
    from: `      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" 
      onClick={onClose}
      role="dialog"`,
    to: `      className="fixed inset-0 z-[200] flex items-center justify-center p-4" 
      role="dialog"`,
  },
  {
    // AssetDetailModal — insert backdrop as first child
    file: 'src/features/assets/components/AssetDetailModal.tsx',
    from: `      aria-labelledby="asset-detail-title"
    >
      <div `,
    to: `      aria-labelledby="asset-detail-title"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
      <div `,
  },
  {
    // AssetDetailModal — dialog gains relative, drops click-eater
    file: 'src/features/assets/components/AssetDetailModal.tsx',
    from: `        className="bg-white dark:bg-[#1e2124] w-full max-w-2xl rounded-[2.5rem] p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh] scrollbar-hide text-right" 
        dir="rtl" 
        onClick={e => e.stopPropagation()}>`,
    to: `        className="relative bg-white dark:bg-[#1e2124] w-full max-w-2xl rounded-[2.5rem] p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh] scrollbar-hide text-right" 
        dir="rtl">`,
  },
  {
    // AssetFormModal — outer
    file: 'src/features/assets/components/AssetFormModal.tsx',
    from: `      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-form-title"
    >
      <div `,
    to: `      className="fixed inset-0 z-[200] flex items-center justify-center p-4" 
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-form-title"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
      <div `,
  },
  {
    // AssetFormModal — dialog
    file: 'src/features/assets/components/AssetFormModal.tsx',
    from: `        className="bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh] scrollbar-hide" 
        onClick={e => e.stopPropagation()}>`,
    to: `        className="relative bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh] scrollbar-hide">`,
  },
  {
    // BudgetModal — bottom sheet family
    file: 'src/features/budgets/components/BudgetModal.tsx',
    from: `      className="fixed inset-0 z-[99990] flex items-end justify-center bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div `,
    to: `      className="fixed inset-0 z-[99990] flex items-end justify-center transition-opacity duration-300 animate-in fade-in"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div `,
  },
  {
    file: 'src/features/budgets/components/BudgetModal.tsx',
    from: `        className="w-full max-w-[440px] bg-gradient-to-b from-white to-slate-50 dark:from-[#1c1f23] dark:to-[#141618] rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-500"
        onClick={(e) => e.stopPropagation()}
      >`,
    to: `        className="relative w-full max-w-[440px] bg-gradient-to-b from-white to-slate-50 dark:from-[#1c1f23] dark:to-[#141618] rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-500"
      >`,
  },
  {
    // TripFormModal — no backdrop-click close today: sibling carries the paint, NO onClick
    file: 'src/features/budgets/components/TripFormModal.tsx',
    from: `      <div className="fixed inset-0 z-[100000] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
        <div 
          className="w-full max-w-md bg-white dark:bg-[#181a1d] rounded-t-[3rem] rounded-b-[2rem] p-6 space-y-6 shadow-2xl border border-slate-100 dark:border-white/5 animate-in slide-in-from-bottom-24 duration-300 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}>`,
    to: `      <div className="fixed inset-0 z-[100000] flex items-end justify-center animate-in fade-in duration-300 p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
        <div 
          className="relative w-full max-w-md bg-white dark:bg-[#181a1d] rounded-t-[3rem] rounded-b-[2rem] p-6 space-y-6 shadow-2xl border border-slate-100 dark:border-white/5 animate-in slide-in-from-bottom-24 duration-300 max-h-[90vh] overflow-y-auto">`,
  },
  {
    // AmortizationModal
    file: 'src/features/debts/components/AmortizationModal.tsx',
    from: `      className="fixed inset-0 z-[99990] flex items-center justify-center bg-black/40 backdrop-blur-[4px] p-4 transition-opacity duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div `,
    to: `      className="fixed inset-0 z-[99990] flex items-center justify-center p-4 transition-opacity duration-300 animate-in fade-in"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px]" onClick={onClose} aria-hidden="true" />
      <div `,
  },
  {
    file: 'src/features/debts/components/AmortizationModal.tsx',
    from: `        className="w-full max-w-[600px] bg-gradient-to-b from-white/90 to-slate-50/90 dark:from-[#1c1f23]/95 dark:to-[#141618]/95 border border-white/20 dark:border-white/5 rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}>`,
    to: `        className="relative w-full max-w-[600px] bg-gradient-to-b from-white/90 to-slate-50/90 dark:from-[#1c1f23]/95 dark:to-[#141618]/95 border border-white/20 dark:border-white/5 rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">`,
  },
  {
    // DebtModal
    file: 'src/features/debts/components/DebtModal.tsx',
    from: `      className="fixed inset-0 z-[99990] flex items-end justify-center bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div `,
    to: `      className="fixed inset-0 z-[99990] flex items-end justify-center transition-opacity duration-300 animate-in fade-in"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div `,
  },
  {
    file: 'src/features/debts/components/DebtModal.tsx',
    from: `        className="w-full max-w-[440px] bg-gradient-to-b from-white to-slate-50 dark:from-[#1c1f23] dark:to-[#141618] rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-500"
        onClick={(e) => e.stopPropagation()}
      >`,
    to: `        className="relative w-full max-w-[440px] bg-gradient-to-b from-white to-slate-50 dark:from-[#1c1f23] dark:to-[#141618] rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-500"
      >`,
  },
  {
    // InstallmentModal
    file: 'src/features/debts/components/InstallmentModal.tsx',
    from: `      className="fixed inset-0 z-[99990] flex items-end justify-center bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div `,
    to: `      className="fixed inset-0 z-[99990] flex items-end justify-center transition-opacity duration-300 animate-in fade-in"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div `,
  },
  {
    file: 'src/features/debts/components/InstallmentModal.tsx',
    from: `        className="w-full max-w-[440px] bg-gradient-to-b from-white to-slate-50 dark:from-[#1c1f23] dark:to-[#141618] rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-500"
        onClick={(e) => e.stopPropagation()}>`,
    to: `        className="relative w-full max-w-[440px] bg-gradient-to-b from-white to-slate-50 dark:from-[#1c1f23] dark:to-[#141618] rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-500">`,
  },
  {
    // PayDebtAccountModal
    file: 'src/features/debts/components/PayDebtAccountModal.tsx',
    from: `      className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in"
      onClick={onClose}
    >
      <div `,
    to: `      className="fixed inset-0 z-[99999] flex items-end justify-center transition-opacity animate-in fade-in"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div `,
  },
  {
    file: 'src/features/debts/components/PayDebtAccountModal.tsx',
    from: `        className="w-full max-w-[440px] bg-white dark:bg-[#1a1d21] rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300"
        onClick={(e) => e.stopPropagation()}>`,
    to: `        className="relative w-full max-w-[440px] bg-white dark:bg-[#1a1d21] rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300">`,
  },
  {
    // DepositAccountModal — identical text to PayDebtAccountModal
    file: 'src/features/goals/components/DepositAccountModal.tsx',
    from: `      className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in"
      onClick={onClose}
    >
      <div `,
    to: `      className="fixed inset-0 z-[99999] flex items-end justify-center transition-opacity animate-in fade-in"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div `,
  },
  {
    file: 'src/features/goals/components/DepositAccountModal.tsx',
    from: `        className="w-full max-w-[440px] bg-white dark:bg-[#1a1d21] rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300"
        onClick={(e) => e.stopPropagation()}>`,
    to: `        className="relative w-full max-w-[440px] bg-white dark:bg-[#1a1d21] rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300">`,
  },
  {
    // GoalModal
    file: 'src/features/goals/components/GoalModal.tsx',
    from: `      className="fixed inset-0 z-[99990] flex items-end justify-center bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div `,
    to: `      className="fixed inset-0 z-[99990] flex items-end justify-center transition-opacity duration-300 animate-in fade-in"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div `,
  },
  {
    file: 'src/features/goals/components/GoalModal.tsx',
    from: `        className="w-full max-w-[440px] bg-gradient-to-b from-white to-slate-50 dark:from-[#1c1f23] dark:to-[#141618] rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-500"
        onClick={(e) => e.stopPropagation()}
      >`,
    to: `        className="relative w-full max-w-[440px] bg-gradient-to-b from-white to-slate-50 dark:from-[#1c1f23] dark:to-[#141618] rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-500"
      >`,
  },
  {
    // NotifPanel — role/aria stay on outer
    file: 'src/features/notifications/components/NotifPanel.tsx',
    from: `      className="fixed inset-0 z-[9998] flex items-start justify-center p-3 sm:p-4 pt-[calc(4.5rem+env(safe-area-inset-top,0px))] sm:pt-20 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setNotifPanelOpen(false)}
      role="dialog"`,
    to: `      className="fixed inset-0 z-[9998] flex items-start justify-center p-3 sm:p-4 pt-[calc(4.5rem+env(safe-area-inset-top,0px))] sm:pt-20 animate-in fade-in duration-200"
      role="dialog"`,
  },
  {
    file: 'src/features/notifications/components/NotifPanel.tsx',
    from: `      aria-labelledby="notif-panel-title"
    >
      <div
        className="w-full max-w-md bg-surface dark:bg-slate-900 rounded-3xl shadow-2xl border border-outline-variant/30 overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}>`,
    to: `      aria-labelledby="notif-panel-title"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setNotifPanelOpen(false)} aria-hidden="true" />
      <div
        className="relative w-full max-w-md bg-surface dark:bg-slate-900 rounded-3xl shadow-2xl border border-outline-variant/30 overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-200">`,
  },
  {
    // ReportBuilderModal — guard `!isGenerating` moves to the backdrop
    file: 'src/features/reports/components/ReportBuilderModal.tsx',
    from: `      className="fixed inset-0 z-[10001] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300"
      onClick={() => !isGenerating && setReportBuilderOpen(false)}
    >
      <div `,
    to: `      className="fixed inset-0 z-[10001] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xl"
        onClick={() => !isGenerating && setReportBuilderOpen(false)}
        aria-hidden="true"
      />
      <div `,
  },
  {
    // ReportBuilderModal — dialog already has `relative`; drop click-eater
    file: 'src/features/reports/components/ReportBuilderModal.tsx',
    from: `        className="bg-white dark:bg-[#1e2124] w-full max-w-xl max-h-[90vh] rounded-[2.5rem] flex flex-col shadow-2xl border border-white/10 relative overflow-hidden animate-in zoom-in slide-in-from-bottom-12 duration-500"
        onClick={e => e.stopPropagation()}>`,
    to: `        className="bg-white dark:bg-[#1e2124] w-full max-w-xl max-h-[90vh] rounded-[2.5rem] flex flex-col shadow-2xl border border-white/10 relative overflow-hidden animate-in zoom-in slide-in-from-bottom-12 duration-500">`,
  },
  {
    // Settings — mockup modal
    file: 'src/features/settings/components/Settings.tsx',
    from: `          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setMockupModal(null)}
        >
          <div
            className="bg-white dark:bg-[#1c1f23] w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
            onClick={e => e.stopPropagation()}>`,
    to: `          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMockupModal(null)} aria-hidden="true" />
          <div
            className="relative bg-white dark:bg-[#1c1f23] w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">`,
  },
  {
    // SupportActionsCard — confirmation modal
    file: 'src/features/settings/components/cards/SupportActionsCard.tsx',
    from: `          className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white/90 dark:bg-[#1c1f23]/90 backdrop-blur-xl w-full max-w-sm rounded-[2rem] p-7 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-white/20 dark:border-white/[0.05]"
            onClick={(e) => e.stopPropagation()}>`,
    to: `          className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setModal(null)} aria-hidden="true" />
          <div
            className="relative bg-white/90 dark:bg-[#1c1f23]/90 backdrop-blur-xl w-full max-w-sm rounded-[2rem] p-7 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-white/20 dark:border-white/[0.05]">`,
  },

  // ───────────────────────── Group C: AddCardModal (inline styles) ─────────────────────────
  {
    // AddCardModal — outer: bg/blur + onClick move to backdrop; keyboard activation stays on outer
    file: 'src/features/cards/components/AddCardModal.tsx',
    from: `        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'flex', alignItems: 'flex-end',
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(8px)',
          }}
          className="animate-in fade-in duration-300"
          onClick={() => onClose()}
  role="button" tabIndex={0} onKeyDown={onActivate(() => onClose())}>
          <div
            role="dialog"`,
    to: `        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'flex', alignItems: 'flex-end',
          }}
          className="animate-in fade-in duration-300"
  role="button" tabIndex={0} onKeyDown={onActivate(() => onClose())}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
            onClick={() => onClose()}
            aria-hidden="true"
          />
          <div
            role="dialog"`,
  },
  {
    // AddCardModal — dialog: gain position relative, drop click-eater
    file: 'src/features/cards/components/AddCardModal.tsx',
    from: `            style={{
              width: '100%', maxWidth: 640,
              margin: '0 auto',
              borderRadius: '28px 28px 0 0',
              maxHeight: '95vh', overflowY: 'auto',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none',
            }}
            className="bg-white dark:bg-[#1a1d21] animate-in slide-in-from-bottom-6 duration-400 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >`,
    to: `            style={{
              position: 'relative',
              width: '100%', maxWidth: 640,
              margin: '0 auto',
              borderRadius: '28px 28px 0 0',
              maxHeight: '95vh', overflowY: 'auto',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none',
            }}
            className="bg-white dark:bg-[#1a1d21] animate-in slide-in-from-bottom-6 duration-400 shadow-2xl"
          >`,
  },
];

// ───────────────────────── run ─────────────────────────
let failures = 0;
const byFile = new Map();
for (const e of EDITS) {
  if (!byFile.has(e.file)) byFile.set(e.file, []);
  byFile.get(e.file).push(e);
}

for (const [file, edits] of byFile) {
  const abs = path.join(ROOT, file);
  let src;
  try {
    src = fs.readFileSync(abs, 'utf8');
  } catch (err) {
    console.error(`✗ ${file}: cannot read (${err.message})`);
    failures++;
    continue;
  }
  for (const e of edits) {
    const count = src.split(e.from).length - 1;
    if (count !== 1) {
      console.error(`✗ ${file}: anchor matched ${count}x (expected 1):\n---\n${e.from.slice(0, 160)}\n---`);
      failures++;
      continue;
    }
    src = src.replace(e.from, e.to);
  }
  if (failures === 0) {
    fs.writeFileSync(abs, src);
    console.log(`✓ ${file} (${edits.length} edit${edits.length > 1 ? 's' : ''})`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} anchor failure(s) — no files written.`);
  process.exit(1);
}
console.log(`\nAll ${EDITS.length} edits across ${byFile.size} files applied.`);
