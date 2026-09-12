import React, { useEffect, useRef } from 'react';
import { getChart } from '../../../core/charts';
import { useI18n } from '../../../i18n/index';
import { getMonthName, silentFail } from '../../../core/utils';
import { getCategoryColor } from '../../../core/categoryUtils';
import { formatCategoryLabel } from '../../../i18n/engine';

import type { MonthlySummary } from '@/core/services/StatisticsService';

interface DashboardChartsProps {
  categoryBreakdown: Record<string, number>;
  monthlyStats?: { income: number; expense: number; count: number } | MonthlySummary;
}

/**
 * DashboardCharts Component - Renders Spend Breakdown and Trends.
 */
export const DashboardCharts = React.memo(function DashboardCharts({ categoryBreakdown }: DashboardChartsProps) {
  const { t } = useI18n();
  const pieRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    let active = true;

    async function initChart() {
      const ChartJS = await getChart();
      if (!active || !ChartJS || !pieRef.current) return;

      // 1. Thoroughly destroy any existing chart on this canvas
      const existingChart = ChartJS.getChart(pieRef.current);
      if (existingChart) {
        existingChart.destroy();
      }
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }

      const safeBreakdown = categoryBreakdown || {};
      const rawLabels = Object.keys(safeBreakdown);
      const data = Object.values(safeBreakdown);
      
      if (rawLabels.length === 0) return;

      const bg = rawLabels.map((l) => getCategoryColor(l));
      const labels = rawLabels.map((l) => formatCategoryLabel(l));

      if (!active) return;

      try {
        chartInstance.current = new ChartJS(pieRef.current, {
          type: 'doughnut',
          data: {
            labels,
            datasets: [{
              data,
              backgroundColor: bg,
              borderWidth: 0,
              hoverOffset: 10
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 750
            },
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: { size: 14, weight: 'bold' },
                bodyFont: { size: 13 },
                cornerRadius: 12,
                displayColors: true
              }
            },
            cutout: '72%'
          }
        });
      } catch (err) {
        silentFail('[DashboardCharts] Chart.js creation failed')(err);
      }
    }

    // Small delay to ensure DOM is ready and previous effects have cleaned up
    const timer = setTimeout(initChart, 50);

    return () => {
      active = false;
      clearTimeout(timer);
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [categoryBreakdown]);

  const rawLabels = Object.keys(categoryBreakdown);
  const bg = rawLabels.map((l) => getCategoryColor(l));
  const labels = rawLabels.map((l) => formatCategoryLabel(l));
  const categoryCount = rawLabels.length;

  return (
    <div className="fin-card p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-black text-sm uppercase tracking-tighter flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-500">pie_chart</span>
          {t('home.chart.breakdown')}
        </h3>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {getMonthName(new Date().getMonth())}
        </span>
      </div>

      <div className="flex items-center h-[200px] w-full gap-4">
        {/* Left: Chart Container with perfectly centered text */}
        <div className="relative h-full aspect-square flex-shrink-0">
          {/* Center label (Text layer) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-[5]">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
              {t('home.expense')}
            </span>
            <span className="text-2xl font-black text-slate-700 dark:text-white leading-tight mt-0.5 tabular-nums">
              {categoryCount}
            </span>
            <span className="text-[9px] font-bold text-slate-400 leading-none mt-0.5">
              {t('report.spendingByCategory') || 'فئات'}
            </span>
          </div>
          
          {/* Chart Canvas */}
          <canvas 
            ref={pieRef} 
            className="relative w-full h-full z-[10]" 
          ></canvas>
        </div>

        {/* Right: Custom Legend */}
        <div className={`flex-1 overflow-y-auto max-h-full pr-2 ${categoryCount > 5 ? 'grid grid-cols-2' : 'flex flex-col'} gap-y-2 gap-x-4`}>
          {rawLabels.map((key, i) => (
            <div key={key} className="flex items-center gap-2 min-w-0">
              <div 
                className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                style={{ backgroundColor: bg[i] }}
              />
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                {labels[i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
