import React, { useEffect, useRef } from 'react';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip
} from 'chart.js';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip
);

export interface NetWorthItem {
  label?: string;
  month?: string;
  value?: number;
  netWorth?: number;
  timestamp?: number;
}

interface NetWorthTrendProps {
  data: NetWorthItem[];
  period?: number;
  onPeriodChange?: (p: number) => void;
}

export const NetWorthTrend = React.memo(function NetWorthTrend({ data, period = 6, onPeriodChange }: NetWorthTrendProps) {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Safety: ensure no NaN values and map label/value flexibly
    const cleanData = data
      .map(d => ({
        label: d.label || d.month || '',
        value: typeof d.value === 'number' ? d.value : (typeof d.netWorth === 'number' ? d.netWorth : 0),
        timestamp: d.timestamp || 0
      }))
      .filter(d => !isNaN(d.value) && d.label);

    if (cleanData.length === 0) return;

    // Calculate Zero Line Stop for Gradient
    const values = cleanData.map(d => d.value);
    const max = Math.max(...values, 0);
    const min = Math.min(...values, 0);
    const range = max - min;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    if (range > 0) {
      const zeroPos = max / range; // 0 to 1 from top
      
      // Positive part (Green)
      gradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)'); // Light green
      gradient.addColorStop(Math.max(0, zeroPos - 0.01), 'rgba(34, 197, 94, 0.05)');
      
      // Transition at Zero
      gradient.addColorStop(zeroPos, 'rgba(255, 255, 255, 0)');
      
      // Negative part (Red)
      gradient.addColorStop(Math.min(1, zeroPos + 0.01), 'rgba(239, 68, 68, 0.05)');
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0.3)'); // Light red
    } else {
      // Fallback if all values are 0 or range is 0
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
    }

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: cleanData.map(d => d.label),
        datasets: [{
          label: t('home.networth') || t('home.netWorth') || 'Net Worth',
          data: cleanData.map(d => d.value),
          borderColor: (context) => {
             const val = context.parsed?.y ?? 0;
             return val >= 0 ? '#22c55e' : '#ef4444';
          },
          borderWidth: 3,
          fill: 'origin',
          backgroundColor: gradient,
          tension: 0.4,
          segment: {
            borderColor: (ctx) => {
              const val = ((ctx.p0.parsed.y ?? 0) + (ctx.p1.parsed.y ?? 0)) / 2;
              return val >= 0 ? '#22c55e' : '#ef4444';
            }
          },
          pointBackgroundColor: (context) => {
            const val = context.raw as number;
            return val >= 0 ? '#22c55e' : '#ef4444';
          },
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            padding: 12,
            displayColors: false,
            callbacks: {
              label: (context) => `${context.dataset.label}: ${fmt(context.parsed.y ?? 0)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'IBM Plex Sans Arabic', size: 10 },
              color: 'rgba(156, 163, 175, 0.8)',
              autoSkip: true,
              maxRotation: 0
            }
          },
          y: {
            grace: '10%',
            grid: { 
              color: (context) => context.tick.value === 0 ? 'rgba(156, 163, 175, 0.5)' : 'rgba(156, 163, 175, 0.1)',
              lineWidth: (context) => context.tick.value === 0 ? 2 : 1
            },
            ticks: {
              font: { family: 'IBM Plex Sans Arabic', size: 10 },
              color: 'rgba(156, 163, 175, 0.8)',
              callback: (value) => fmt(value as number)
            }
          }
        }
      }
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [data, t, fmt]);

  return (
    <div className="bg-white dark:bg-[#1c1f23] rounded-[2.5rem] p-6 shadow-xl border border-white/5 relative overflow-hidden group">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center">
            <span className="material-symbols-outlined">trending_up</span>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
              {t('home.wealthTrend') || 'Wealth Evolution'}
            </h3>
            <p className="text-sm font-black text-[#002b59] dark:text-blue-100">
              {t('home.netWorthHistory') || 'Net Worth Trend'}
            </p>
          </div>
        </div>
        
        <select 
          value={period}
          onChange={(e) => onPeriodChange?.(parseInt(e.target.value))}
          className="px-3 py-1 bg-blue-50 dark:bg-blue-900/10 rounded-full text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase outline-none border-none cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
        >
          <option value={3}>{t('common.3months') || '3 Months'}</option>
          <option value={6}>{t('common.6months') || '6 Months'}</option>
          <option value={12}>{t('common.12months') || '12 Months'}</option>
        </select>
      </div>

      <div className="h-48 w-full">
        <canvas ref={canvasRef}></canvas>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
         <p className="text-[10px] text-slate-400 font-bold leading-relaxed max-w-[70%]">
            {t('home.netWorthDesc') || 'Your total balance minus your debts over time.'}
         </p>
         <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
            <span className="material-symbols-outlined text-sm">info</span>
         </div>
      </div>
    </div>
  );
});
