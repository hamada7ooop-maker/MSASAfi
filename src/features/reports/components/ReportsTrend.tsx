import React, { useRef, useEffect } from 'react';
import { useI18n } from '../../../i18n/index';
import { getChart } from '../../../core/charts';
import type { MonthTrendStats } from '../hooks/useReportsData';

interface ReportsTrendProps {
  data: MonthTrendStats[];
}

export function ReportsTrend({ data }: ReportsTrendProps) {
  const { t, getMonthName } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    const initChart = async () => {
      if (!canvasRef.current || data.length === 0) return;

      const ChartJS = await getChart();
      if (!ChartJS || !canvasRef.current) return;
      
      // Cleanup existing chart
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const labels = data.map(d => getMonthName(d.month));
      const incomeData = data.map(d => d.income);
      const expenseData = data.map(d => d.expense);

      chartRef.current = new ChartJS(canvasRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: t('home.income'),
              data: incomeData,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              fill: true,
              tension: 0.4,
              borderWidth: 3,
              pointRadius: 4,
              pointBackgroundColor: '#10b981',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
            },
            {
              label: t('home.expense'),
              data: expenseData,
              borderColor: '#f43f5e',
              backgroundColor: 'rgba(244, 63, 94, 0.05)',
              fill: true,
              tension: 0.4,
              borderWidth: 3,
              pointRadius: 4,
              pointBackgroundColor: '#f43f5e',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                usePointStyle: true,
                padding: 20,
                font: {
                  family: "'IBM Plex Sans Arabic', sans-serif",
                  size: 11,
                  weight: 'bold'
                },
                color: '#94a3b8'
              }
            },
            tooltip: {
              backgroundColor: '#1e293b',
              padding: 12,
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 13 },
              cornerRadius: 12,
              displayColors: true
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                color: '#94a3b8',
                font: { size: 10, weight: 'bold' }
              }
            },
            y: {
              display: false,
              beginAtZero: true
            }
          }
        }
      });
    };

    initChart();

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, t, getMonthName]);

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-black/5 dark:border-white/5">
      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-blue-600 text-lg">trending_up</span>
        {t('report.trend')}
      </h3>
      
      <div className="h-64 w-full">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}
