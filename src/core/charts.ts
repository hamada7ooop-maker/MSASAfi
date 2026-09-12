import type { Chart as ChartType } from 'chart.js';
import { silentFail } from './utils';

let ChartInstance: typeof ChartType | null = null;

export async function getChart(): Promise<typeof ChartType | null> {
  if (!ChartInstance) {
    try {
      const {
        Chart,
        LineController,
        DoughnutController,
        LineElement,
        PointElement,
        ArcElement,
        LinearScale,
        CategoryScale,
        Filler,
        Legend,
        Tooltip
      } = await import('chart.js');

      Chart.register(
        LineController,
        DoughnutController,
        LineElement,
        PointElement,
        ArcElement,
        LinearScale,
        CategoryScale,
        Filler,
        Legend,
        Tooltip
      );
      ChartInstance = Chart;
    } catch (err) {
      silentFail('[Charts] Failed to lazy-load Chart.js')(err);
      return null;
    }
  }
  return ChartInstance;
}
