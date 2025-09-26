"use client";

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  ScriptableContext,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

interface MiniChartProps {
  data: number[];
  labels?: string[];
  color?: string;
  height?: number;
  showPoints?: boolean;
  fill?: boolean;
}

export default function MiniChart({
  data,
  labels,
  color = '#4F46E5',
  height = 40,
  showPoints = false,
  fill = true,
}: MiniChartProps) {
  const chartData = {
    labels: labels || data.map((_, i) => (i + 1).toString()),
    datasets: [
      {
        data,
        borderColor: color,
        borderWidth: 2,
        tension: 0.4,
        pointRadius: showPoints ? 3 : 0,
        pointHoverRadius: 4,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 1,
        fill: fill,
        backgroundColor: fill
          ? (context: ScriptableContext<"line">) => {
              const { ctx, chartArea } = context.chart;
              if (!chartArea) return undefined;
              const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
              gradient.addColorStop(0, `${color}00`);
              gradient.addColorStop(1, `${color}33`);
              return gradient;
            }
          : undefined,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
      },
    },
    elements: {
      line: {
        borderJoinStyle: 'round' as const,
      },
    },
  };

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <Line data={chartData} options={options} />
    </div>
  );
}
