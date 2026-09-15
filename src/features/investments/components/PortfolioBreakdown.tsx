import React, { useRef, useEffect } from 'react';
import { useI18n } from '../../../i18n/index';
import { getChart } from '../../../core/charts';
import { INVESTMENT_COLORS, glassTooltip, chartAnimation, CHART_FONT } from '../../../core/chartTheme';
import type { Investment } from '@/types';

interface PortfolioBreakdownProps {
  investments: Investment[];
}

export function PortfolioBreakdown({ investments }: PortfolioBreakdownProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    async function initChart() {
      const ChartJS = await getChart();
      if (!ChartJS || !canvasRef.current || investments.length === 0) return;

      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Group by type
      const groups = investments.reduce((acc, inv) => {
        const type = inv.type || 'other';
        acc[type] = (acc[type] || 0) + (inv.value || 0);
        return acc;
      }, {} as Record<string, number>);

      const labels = Object.keys(groups).map(k => t(`investment.${k}`) || k);
      const data = Object.values(groups);
      
      // The allocation palette moved to the unified chart theme. The legend
      // font was 'Inter' — a family REMOVED from the bundle in Batch 1, so it
      // silently fell back; it now asks for the app font by name.
      const backgroundColor = Object.keys(groups).map(k => INVESTMENT_COLORS[k] || INVESTMENT_COLORS.other);

      chartInstance.current = new ChartJS(canvasRef.current, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor,
            borderWidth: 0,
            hoverOffset: 15
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: chartAnimation(),
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: {
                font: { family: CHART_FONT, size: 10, weight: 'bold' },
                padding: 20,
                usePointStyle: true,
                pointStyle: 'circle',
                color: '#64748b'
              }
            },
            tooltip: glassTooltip()
          },
          cutout: '70%'
        }
      });
    }

    initChart();

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [investments, t]);

  if (investments.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#1e2124] rounded-[2.5rem] p-6 border border-slate-100 dark:border-white/5 shadow-sm">
      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-blue-500">pie_chart</span>
        {t('report.categoryBreakdown') || 'Allocation'}
      </h3>
      <div className="relative h-[250px]">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}
