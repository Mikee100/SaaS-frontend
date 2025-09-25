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
  console.log('Rendering SalesTrendsChart with data:', data);

  // Format currency
  const formatCurrency = React.useMemo(() => {
    return (value: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
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
          borderColor: 'rgba(99, 102, 241, 1)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: 'white',
          pointBorderColor: 'rgba(99, 102, 241, 1)',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [data]);

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
        x: { grid: { display: false } },
        y: {
          grid: { display: true },
          ticks: {
            callback: (value: string | number) => formatCurrency(Number(value))
          }
        }
      }
    };
  }, [formatCurrency]);

  if (!data?.trends?.length || !chartData || !options) {
    return (
      <div className="bg-white rounded-xl p-6 text-center">
        <p className="text-gray-500">No sales data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Sales Trends</h3>
        <p className="text-sm text-gray-500">Last 30 days</p>
      </div>
      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-500">Total Sales</p>
          <p className="font-semibold text-indigo-600">
            {formatCurrency(data.summary.totalSales)}
          </p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="font-semibold text-indigo-600">
            {data.summary.totalOrders}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SalesTrendsChart;
