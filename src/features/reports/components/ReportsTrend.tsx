import React, { useRef, useEffect } from 'react';
import { useI18n } from '../../../i18n/index';
import { getChart } from '../../../core/charts';
import { SEMANTIC, glassTooltip, axisTicks, softFill, chartAnimation, CHART_FONT } from '../../../core/chartTheme';
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
              borderColor: SEMANTIC.income,
              backgroundColor: (context) =>
                softFill(context.chart.ctx, context.chart.chartArea, SEMANTIC.income),
              fill: true,
              tension: 0.4,
              borderWidth: 3,
              pointRadius: 4,
              pointBackgroundColor: SEMANTIC.income,
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
            },
            {
              label: t('home.expense'),
              data: expenseData,
              borderColor: SEMANTIC.expense,
              backgroundColor: (context) =>
                softFill(context.chart.ctx, context.chart.chartArea, SEMANTIC.expense, 0.16),
              fill: true,
              tension: 0.4,
              borderWidth: 3,
              pointRadius: 4,
              pointBackgroundColor: SEMANTIC.expense,
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: chartAnimation(),
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                usePointStyle: true,
                padding: 20,
                font: {
                  family: CHART_FONT,
                  size: 11,
                  weight: 'bold'
                },
                color: '#94a3b8'
              }
            },
            tooltip: glassTooltip()
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: axisTicks()
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
