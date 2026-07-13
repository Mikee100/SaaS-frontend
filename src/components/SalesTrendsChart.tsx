import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SalesTrendData {
  date: string;
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
}

interface SalesTrendsChartProps {
  data: {
    trends: SalesTrendData[];
    summary: {
      totalSales: number;
      totalOrders: number;
      averageOrderValue: number;
    };
  };
  className?: string;
}

const SalesTrendsChart: React.FC<SalesTrendsChartProps> = ({ data }) => {
  const palette = {
    accent: 'rgba(79, 70, 229, 1)',
    accentSoft: 'rgba(79, 70, 229, 0.12)',
    textMuted: 'rgba(107, 107, 112, 1)',
    border: 'rgba(229, 229, 231, 1)',
  };

  // Format currency
  const formatCurrency = React.useMemo(() => {
    return (value: number) => {
      return `Ksh ${value.toLocaleString('en-KE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
    };
  }, []);

  // Prepare chart data
  const chartData = React.useMemo(() => {
    if (!data?.trends?.length) return null;

    return {
      labels: data.trends.map(item => item.date.split('T')[0]),
      datasets: [
        {
          label: 'Sales',
          data: data.trends.map(item => item.totalSales),
          borderColor: palette.accent,
          backgroundColor: palette.accentSoft,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: palette.accent,
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    };
  }, [data, palette.accent, palette.accentSoft]);

  const options = React.useMemo(() => {
    if (!formatCurrency) return null;

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (tooltipItem: import('chart.js').TooltipItem<'line'>) => {
              return `Sales: ${formatCurrency(tooltipItem.raw as number)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: palette.textMuted,
            font: { size: 11 },
            maxTicksLimit: 8,
          },
        },
        y: {
          grid: {
            display: true,
            color: palette.border,
            drawBorder: false,
            tickLength: 0,
            borderDash: [2, 3],
          },
          ticks: {
            color: palette.textMuted,
            font: { size: 11 },
            callback: (value: string | number) => formatCurrency(Number(value))
          }
        }
      }
    };
  }, [formatCurrency, palette.border, palette.textMuted]);

  if (!data?.trends?.length || !chartData || !options) {
    return (
      <div className="adeera-card p-6 text-center">
        <p className="text-[var(--adeera-text-muted)]">No sales data available</p>
      </div>
    );
  }

  return (
    <div className="adeera-card p-5">
      <div className="mb-4">
        <h3 className="adeera-section-title">Sales Trends</h3>
        <p className="text-sm text-[var(--adeera-text-muted)]">Last 30 days</p>
      </div>
      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-[var(--adeera-border)] bg-[var(--adeera-surface-muted)] p-3">
          <p className="text-sm text-[var(--adeera-text-muted)]">Total Sales</p>
          <p className="font-semibold text-[var(--adeera-text)]">
            {formatCurrency(data.summary.totalSales)}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--adeera-border)] bg-[var(--adeera-surface-muted)] p-3">
          <p className="text-sm text-[var(--adeera-text-muted)]">Total Orders</p>
          <p className="font-semibold text-[var(--adeera-text)]">
            {data.summary.totalOrders}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SalesTrendsChart;
