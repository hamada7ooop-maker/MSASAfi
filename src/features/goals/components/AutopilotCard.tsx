import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { toast } from '../../../toast';

interface AutopilotCardProps {
  suggestedAuto: number;
  onRunAutopilot: () => Promise<number | undefined>;
}

export function AutopilotCard({ suggestedAuto, onRunAutopilot }: AutopilotCardProps) {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const count = await onRunAutopilot();
      if (count && count > 0) {
        toast(t('goal.autopilotDone', { n: String(count) }) || `Auto-saved to ${count} goals!`, 'success');
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm animate-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
            {t('goal.autopilot')}
          </p>
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {t('goal.autopilotHint')}: <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{fmt(suggestedAuto)}</span>
          </p>
        </div>
        
        <button 
          onClick={handleRun}
          disabled={isRunning || suggestedAuto <= 0}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white px-5 py-3 rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
        >
          {isRunning ? (
            <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
          ) : (
            <span className="material-symbols-outlined text-sm">flight_takeoff</span>
          )}
          {t('goal.autopilotRun')}
        </button>
      </div>
    </div>
  );
}
