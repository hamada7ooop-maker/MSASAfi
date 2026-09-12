import React, { useRef, useEffect } from 'react';
import { useI18n } from '../../../i18n/index';
import { getChart } from '../../../core/charts';
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
      
      const COLORS: Record<string, string> = {
        stocks: '#3b82f6', crypto: '#f59e0b', real_estate: '#10b981',
        gold: '#fbbf24', reit: '#6366f1', other: '#8b5cf6'
      };
      const backgroundColor = Object.keys(groups).map(k => COLORS[k] || COLORS.other);

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
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: {
                font: { family: "'Inter', sans-serif", size: 10, weight: 'bold' },
                padding: 20,
                usePointStyle: true,
                pointStyle: 'circle',
                color: '#64748b'
              }
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              cornerRadius: 12,
              padding: 12
            }
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
