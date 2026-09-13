import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { useIsMounted } from '../../../hooks/useIsMounted';
import { useI18n } from '../../../i18n/index';
import { ExportService } from '../services/exportService';
import { db as DB } from '@/core/db/core';
import { formatCategoryLabel } from '../../../i18n/engine';
import { getCategoryIcon } from '../../../core/categoryUtils';
import { toast } from '../../../toast';
import { silentFail } from '../../../core/utils';
import type { Category } from '@/types';

type ReportFormat = 'pdf' | 'xlsx' | 'csv' | 'json';
type DatePreset = 'all' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';
type TxType = 'all' | 'income' | 'expense';

/**
 * ReportBuilderModal - A premium UI for customizing and generating financial reports.
 */
export function ReportBuilderModal() {
  const isMounted = useIsMounted();
  const { 
    isReportBuilderOpen, 
    setReportBuilderOpen 
  } = useAppStore(
    useShallow((s) => ({
      isReportBuilderOpen: s.isReportBuilderOpen,
      setReportBuilderOpen: s.setReportBuilderOpen
    }))
  );
  
  const { t } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Builder State
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [type, setType] = useState<TxType>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });

  const loadCategories = useCallback(async () => {
    try {
      const cats = await DB.categories.toArray();
      if (isMounted.current) {
        setCategories(cats.sort((a, b) => (a.order || 0) - (b.order || 0)));
      }
    } catch (err) {
      silentFail('[ReportBuilder] Failed to load categories')(err);
    }
  }, [isMounted]);

  useEffect(() => {
    if (isReportBuilderOpen) {
      loadCategories();
    }
  }, [isReportBuilderOpen, loadCategories]);


  if (!isReportBuilderOpen) return null;

  const handleToggleCategory = (catId: string) => {
    setSelectedCategories(prev => 
      prev.includes(catId) 
        ? prev.filter(id => id !== catId) 
        : [...prev, catId]
    );
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    let startDate: string | undefined;
    let endDate: string | undefined;

    const now = new Date();
    if (datePreset === 'thisMonth') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    } else if (datePreset === 'lastMonth') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    } else if (datePreset === 'thisYear') {
      startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
    } else if (datePreset === 'custom') {
      startDate = customRange.from;
      endDate = customRange.to;
    }

    try {
      await ExportService.exportData(format, {
        startDate,
        endDate,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        type: type === 'all' ? undefined : type
      });
      setReportBuilderOpen(false);
      toast(t('report.success'));
    } catch (err) {
      silentFail('[ReportBuilderModal] Export error')(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300"
      onClick={() => !isGenerating && setReportBuilderOpen(false)}
    >
      <div 
        className="bg-white dark:bg-[#1e2124] w-full max-w-xl max-h-[90vh] rounded-[2.5rem] flex flex-col shadow-2xl border border-white/10 relative overflow-hidden animate-in zoom-in slide-in-from-bottom-12 duration-500"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-8 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">
              {t('report.builderTitle')}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
              {t('report.builderSub')}
            </p>
          </div>
          <button 
            disabled={isGenerating}
            onClick={() => setReportBuilderOpen(false)}
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 active:scale-90 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-8 custom-scrollbar">
          
          {/* Format Selection */}
          <section>
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 block">
              {t('report.fileFormat')}
            </label>
            <div className="grid grid-cols-4 gap-3">
              {[
                { id: 'pdf' as const, icon: 'picture_as_pdf', color: 'rose' },
                { id: 'xlsx' as const, icon: 'description', color: 'emerald' },
                { id: 'csv' as const, icon: 'table_chart', color: 'blue' },
                { id: 'json' as const, icon: 'data_object', color: 'slate' }
              ].map(f => (
                <button
                  key={f.id}
                  disabled={isGenerating}
                  onClick={() => setFormat(f.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-3xl border-2 transition-all active:scale-95 ${
                    format === f.id 
                    ? `border-${f.color}-500 bg-${f.color}-50 dark:bg-${f.color}-500/10 text-${f.color}-600 dark:text-${f.color}-400` 
                    : 'border-transparent bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl">{f.icon}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">{f.id}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Date Range Selection */}
          <section>
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 block">
              {t('report.dateRange')}
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all' as const, label: t('report.range.all') },
                { id: 'thisMonth' as const, label: t('report.range.thisMonth') },
                { id: 'lastMonth' as const, label: t('report.range.lastMonth') },
                { id: 'thisYear' as const, label: t('report.range.thisYear') },
                { id: 'custom' as const, label: t('report.range.custom') },
              ].map(p => (
                <button
                  key={p.id}
                  disabled={isGenerating}
                  onClick={() => setDatePreset(p.id)}
                  className={`px-4 py-2 rounded-full text-xs font-black transition-all ${
                    datePreset === p.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {datePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-4 mt-4 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase px-2">{t('report.dateFrom')}</span>
                  <input 
                    type="date" 
                    disabled={isGenerating}
                    value={customRange.from}
                    onChange={e => setCustomRange(prev => ({ ...prev, from: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-3 text-sm font-bold text-slate-700 dark:text-white" 
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase px-2">{t('report.dateTo')}</span>
                  <input 
                    type="date" 
                    disabled={isGenerating}
                    value={customRange.to}
                    onChange={e => setCustomRange(prev => ({ ...prev, to: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-3 text-sm font-bold text-slate-700 dark:text-white" 
                  />
                </div>
              </div>
            )}
          </section>

          {/* Transaction Type Selection */}
          <section>
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 block">
              {t('report.txnType')}
            </label>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[2rem]">
              {[
                { id: 'all' as const, label: t('report.allTypes') },
                { id: 'income' as const, label: t('txn.income') },
                { id: 'expense' as const, label: t('txn.expense') },
              ].map(tType => (
                <button
                  key={tType.id}
                  disabled={isGenerating}
                  onClick={() => setType(tType.id)}
                  className={`flex-1 py-3 rounded-[1.5rem] text-xs font-black transition-all ${
                    type === tType.id 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {tType.label}
                </button>
              ))}
            </div>
          </section>

          {/* Categories Selection */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                {t('report.categories')} ({t('report.allCategories')})
              </label>
              {selectedCategories.length > 0 && (
                <button 
                  disabled={isGenerating}
                  onClick={() => setSelectedCategories([])}
                  className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase"
                >
                  {t('action.reset')}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.filter(c => type === 'all' || c.type === type || c.type === 'both').map(cat => (
                <button
                  key={cat.id}
                  disabled={isGenerating}
                  onClick={() => handleToggleCategory(cat.name)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 transition-all active:scale-95 ${
                    selectedCategories.includes(cat.name)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'border-transparent bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <span className="text-lg">
                    {(() => {
                      let icon = cat.icon || '🏷️';
                      if (icon === 'folder_open' || icon === 'payments') {
                        const smartIcon = getCategoryIcon(cat.name);
                        if (smartIcon !== '🏷️') icon = smartIcon;
                      }
                      const isEmoji = /\p{Extended_Pictographic}/u.test(icon);
                      if (isEmoji) return icon;
                      return <span className="material-symbols-outlined text-lg">{icon}</span>;
                    })()}
                  </span>
                  <span className="text-xs font-bold">{formatCategoryLabel(cat.name)}</span>
                </button>
              ))}
            </div>
          </section>

        </div>

        {/* Footer Actions */}
        <div className="p-8 pt-4 bg-white/80 dark:bg-[#1e2124]/80 backdrop-blur-md border-t border-slate-100 dark:border-white/5 flex gap-4">
          <button 
            disabled={isGenerating}
            onClick={() => setReportBuilderOpen(false)}
            className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
          >
            {t('action.cancel')}
          </button>
          <button 
            disabled={isGenerating}
            onClick={handleGenerate}
            className="flex-[2] py-4 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <span className="material-symbols-outlined animate-spin">sync</span>
                {t('report.generating')}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">magic_button</span>
                {t('report.generateReport')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
