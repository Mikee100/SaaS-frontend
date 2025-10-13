"use client";
import { useCallback, useEffect, useState, useMemo } from "react";
import { apiGet } from "@/utils/api";
import { Line, Bar, Pie } from "react-chartjs-2";
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler,
} from "chart.js";
import { FaDownload, FaFilePdf, FaFileExcel } from "react-icons/fa";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler,
);

type TopProduct = { id: string; name: string; unitsSold: number; revenue: number; margin?: number; cost?: number };

type Metrics = {
  totalSales: number;
  totalRevenue: number;
  avgSaleValue: number;
  topProducts: TopProduct[];
  salesByMonth: Record<string, number>;
  salesByDay?: Record<string, number>;
  salesByWeek?: Record<string, number>;
  salesByYear?: Record<string, number>;
};

type TabType = 'overview' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'performance';

export default function ProductSalesReportPage() {
 
  const [metrics, setMetrics] = useState<Metrics>({
    totalSales: 0,
    totalRevenue: 0,
    avgSaleValue: 0,
    topProducts: [],
    salesByMonth: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiGet(`/analytics/dashboard`),
      apiGet(`/analytics/sales/daily`).catch(() => ({} as Record<string, number>)), // Fallback to empty object if endpoint doesn't exist
      apiGet(`/analytics/sales/weekly`).catch(() => ({} as Record<string, number>)), // Fallback to empty object if endpoint doesn't exist
      apiGet(`/analytics/sales/yearly`).catch(() => ({} as Record<string, number>)), // Fallback to empty object if endpoint doesn't exist
    ])
      .then(([dashboardData, dailyData, weeklyData, yearlyData]) => {
        const dashboard = dashboardData as Metrics;
        const metrics: Metrics = {
          totalSales: dashboard.totalSales,
          totalRevenue: dashboard.totalRevenue,
          avgSaleValue: dashboard.avgSaleValue,
          topProducts: dashboard.topProducts,
          salesByMonth: dashboard.salesByMonth,
          salesByDay: dailyData as Record<string, number>,
          salesByWeek: weeklyData as Record<string, number>,
          salesByYear: yearlyData as Record<string, number>,
        };
        setMetrics(metrics);
      })
      .catch((err: unknown) => setError((err as Error).message || "An error occurred while fetching data."))
      .finally(() => setLoading(false));
  }, []);

  const getCurrentSalesData = useCallback(() => {
    switch (activeTab) {
      case 'daily': return metrics.salesByDay || {};
      case 'weekly': return metrics.salesByWeek || {};
      case 'monthly': return metrics.salesByMonth || {};
      case 'yearly': return metrics.salesByYear || {};
      default: return metrics.salesByMonth || {};
    }
  }, [activeTab, metrics]);

  const filteredSalesData = useMemo(() => {
    const salesRaw = getCurrentSalesData();
    const labels = Object.keys(salesRaw);
    const values = Object.values(salesRaw);
    let filtered: { label: string, value: number, date: Date }[] = labels.map((label, idx) => {
      let date: Date;
      if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
        date = new Date(label);
      } else if (/^[A-Za-z]{3,} \d{4}$/.test(label)) {
        const [monStr, yearStr] = label.split(' ');
        const monthNum = new Date(Date.parse(monStr + ' 1, 2000')).getMonth();
        date = new Date(parseInt(yearStr, 10), monthNum, 1);
      } else {
        date = new Date(label);
      }
      return { label, value: values[idx], date };
    });
    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter(f => f.date >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      filtered = filtered.filter(f => f.date <= to);
    }
    return filtered;
  }, [dateFrom, dateTo, getCurrentSalesData]);

  const salesTrendData = useMemo(() => {
    const finalLabels = filteredSalesData.map(f => f.label);
    const finalValues = filteredSalesData.map(f => f.value);
    return {
      labels: finalLabels,
      datasets: [
        {
          label: 'Sales',
          data: finalValues,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          fill: true,
          tension: 0.4,
        }
      ],
    };
  }, [filteredSalesData]);

  const revenueBreakdownData = useMemo(() => {
    const revenueLabels = (metrics.topProducts || []).map(p => p.name);
    const revenueData = (metrics.topProducts || []).map(p => p.revenue);
    return {
      labels: revenueLabels,
      datasets: [{
        label: 'Revenue',
        data: revenueData,
        backgroundColor: ['#6366f1', '#a855f7', '#ec4899', '#22c55e', '#f59e0b'],
        borderRadius: 4,
      }],
    };
  }, [metrics]);

  const bestProducts = useMemo(() => {
    return (metrics.topProducts || []).sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 5);
  }, [metrics]);

  const worstProducts = useMemo(() => {
    return (metrics.topProducts || []).sort((a, b) => a.unitsSold - b.unitsSold).slice(0, 5);
  }, [metrics]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    let yPosition = 20;

    doc.setFontSize(20);
    doc.text(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Sales Report`, 20, yPosition);
    yPosition += 20;

    doc.setFontSize(14);
    doc.text(`Total Sales: ${metrics.totalSales}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Total Revenue: Ksh ${metrics.totalRevenue?.toLocaleString()}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Average Sale Value: Ksh ${metrics.avgSaleValue?.toLocaleString()}`, 20, yPosition);
    yPosition += 20;

    if (activeTab === 'performance') {
      doc.text('Best Performing Products:', 20, yPosition);
      yPosition += 10;
      bestProducts.forEach((product, index) => {
        doc.setFontSize(10);
        doc.text(`${index + 1}. ${product.name} - ${product.unitsSold} units`, 30, yPosition);
        yPosition += 8;
      });
      yPosition += 10;
      doc.text('Worst Performing Products:', 20, yPosition);
      yPosition += 10;
      worstProducts.forEach((product, index) => {
        doc.setFontSize(10);
        doc.text(`${index + 1}. ${product.name} - ${product.unitsSold} units`, 30, yPosition);
        yPosition += 8;
      });
    } else {
      doc.text('Top Products:', 20, yPosition);
      yPosition += 10;
      metrics.topProducts?.slice(0, 5).forEach((product, index) => {
        doc.setFontSize(10);
        doc.text(`${index + 1}. ${product.name} - Ksh ${product.revenue.toLocaleString()}`, 30, yPosition);
        yPosition += 8;
      });
    }

    doc.save(`${activeTab}_sales_report.pdf`);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    const salesData = [
      ['Metric', 'Value'],
      ['Total Sales', metrics.totalSales],
      ['Total Revenue', metrics.totalRevenue],
      ['Average Sale Value', metrics.avgSaleValue],
    ];
    const salesSheet = XLSX.utils.aoa_to_sheet(salesData);
    XLSX.utils.book_append_sheet(workbook, salesSheet, 'Summary');

    const productsData = [
      ['Product', 'Units Sold', 'Revenue', 'Avg Price', 'Performance'],
      ...(metrics.topProducts || []).map(p => [
        p.name,
        p.unitsSold,
        p.revenue,
        p.unitsSold > 0 ? (p.revenue / p.unitsSold).toFixed(2) : '0.00',
        p.unitsSold > 100 ? 'High' : p.unitsSold > 50 ? 'Medium' : 'Low'
      ])
    ];
    const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
    XLSX.utils.book_append_sheet(workbook, productsSheet, 'Top Products');

    if (activeTab === 'performance') {
      const bestData = [
        ['Best Products', 'Units Sold'],
        ...bestProducts.map(p => [p.name, p.unitsSold])
      ];
      const bestSheet = XLSX.utils.aoa_to_sheet(bestData);
      XLSX.utils.book_append_sheet(workbook, bestSheet, 'Best Products');

      const worstData = [
        ['Worst Products', 'Units Sold'],
        ...worstProducts.map(p => [p.name, p.unitsSold])
      ];
      const worstSheet = XLSX.utils.aoa_to_sheet(worstData);
      XLSX.utils.book_append_sheet(workbook, worstSheet, 'Worst Products');
    }

    // Filter sales data based on date filters, matching the chart logic
    const salesRaw = getCurrentSalesData();
    const labels = Object.keys(salesRaw);
    const values = Object.values(salesRaw);
    let filtered: { label: string, value: number, date: Date }[] = labels.map((label, idx) => {
      let date: Date;
      if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
        date = new Date(label);
      } else if (/^[A-Za-z]{3,} \d{4}$/.test(label)) {
        const [monStr, yearStr] = label.split(' ');
        const monthNum = new Date(Date.parse(monStr + ' 1, 2000')).getMonth();
        date = new Date(parseInt(yearStr, 10), monthNum, 1);
      } else {
        date = new Date(label);
      }
      return { label, value: values[idx], date };
    });
    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter(f => f.date >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      filtered = filtered.filter(f => f.date <= to);
    }

    const salesPeriodData = [
      ['Period', 'Sales'],
      ...filtered.map(f => [f.label, f.value])
    ];
    const periodSheet = XLSX.utils.aoa_to_sheet(salesPeriodData);
    XLSX.utils.book_append_sheet(workbook, periodSheet, `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Sales`);

    XLSX.writeFile(workbook, `${activeTab}_sales_report.xlsx`);
  };

  const exportMetrics = () => {
    const workbook = XLSX.utils.book_new();
    const data = [
      ['Metric', 'Value'],
      ['Total Sales', metrics.totalSales],
      ['Total Revenue', `Ksh ${metrics.totalRevenue?.toLocaleString()}`],
      ['Avg. Sale Value', `Ksh ${metrics.avgSaleValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Top Products Count', (metrics.topProducts || []).length],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Key Metrics');
    XLSX.writeFile(workbook, 'key_metrics.xlsx');
  };

  const exportTrendData = () => {
    const workbook = XLSX.utils.book_new();
    const data = [
      ['Period', 'Sales'],
      ...filteredSalesData.map(f => [f.label, f.value]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sales Trends');
    XLSX.writeFile(workbook, `${activeTab}_sales_trends.xlsx`);
  };



  const tabs: { key: TabType; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'daily', label: 'Daily Sales' },
    { key: 'weekly', label: 'Weekly Sales' },
    { key: 'monthly', label: 'Monthly Sales' },
    { key: 'yearly', label: 'Yearly Sales' },
    { key: 'performance', label: 'Best/Worst Products' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg shadow-md" role="alert">
          <strong className="font-bold">Failed to load data:</strong>
          <span className="block sm:inline ml-2">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Product Sales Report</h1>
              <p className="mt-2 text-lg text-gray-500">Comprehensive sales analytics with multiple time periods and performance insights.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportToPDF}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <FaFilePdf />
                Export PDF
              </button>
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <FaFileExcel />
                Export Excel
              </button>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-white p-1 rounded-lg shadow">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Filters */}
        {activeTab !== 'performance' && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Report Filters</h2>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear Filters</button>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Key Metrics</h2>
            <button
              onClick={exportMetrics}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
              aria-label="Download Key Metrics as Excel"
              title="Download Key Metrics"
            >
              <FaDownload />
              Download
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow p-6 flex flex-col items-center border border-blue-200 hover:bg-gray-50 transition-colors">
              <span className="text-blue-600 text-sm mb-1 font-medium">Total Sales</span>
              <span className="text-3xl font-bold text-blue-700">{metrics.totalSales}</span>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow p-6 flex flex-col items-center border border-green-200 hover:bg-gray-50 transition-colors">
              <span className="text-green-600 text-sm mb-1 font-medium">Total Revenue</span>
              <span className="text-3xl font-bold text-green-700">Ksh {(metrics.totalRevenue ?? 0).toLocaleString()}</span>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow p-6 flex flex-col items-center border border-purple-200 hover:bg-gray-50 transition-colors">
              <span className="text-purple-600 text-sm mb-1 font-medium">Avg. Sale Value</span>
              <span className="text-3xl font-bold text-purple-700">Ksh {(metrics.avgSaleValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow p-6 flex flex-col items-center border border-red-200 hover:bg-gray-50 transition-colors">
              <span className="text-red-600 text-sm mb-1 font-medium">Top Products</span>
              <span className="text-3xl font-bold text-red-600">{(metrics.topProducts || []).length}</span>
            </div>
          </div>
        </section>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Sales Trends */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Sales Trends</h2>
                <button
                  onClick={exportTrendData}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                  aria-label="Download Sales Trends as Excel"
                  title="Download Sales Trends"
                >
                  <FaDownload />
                  Download
                </button>
              </div>
              <div className="bg-white rounded-xl shadow p-6 hover:bg-gray-50 transition-colors">
                <div className="h-64">
                  {salesTrendData.labels.length > 0 ? (
                    <Line
                      data={salesTrendData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            callbacks: {
                              label: function(context) {
                                return `Sales: ${context.parsed.y}`;
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0, 0, 0, 0.1)' }
                          },
                          x: {
                            grid: { color: 'rgba(0, 0, 0, 0.1)' }
                          }
                        },
                        interaction: {
                          intersect: false,
                          mode: 'index'
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <p>No sales data available</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Top Products */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Top Products</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue by Product</h3>
                  <div className="h-80">
                    <Bar data={revenueBreakdownData} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y' }} />
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Units Sold by Product</h3>
                  <div className="h-80">
                    <Pie
                      data={{
                        labels: (metrics.topProducts || []).map(p => p.name),
                        datasets: [{
                          label: 'Units Sold',
                          data: (metrics.topProducts || []).map(p => p.unitsSold),
                          backgroundColor: ['#6366f1', '#a855f7', '#ec4899', '#22c55e', '#f59e0b', '#06b6d4'],
                          borderRadius: 4,
                        }],
                      }}
                      options={{ responsive: true, maintainAspectRatio: false }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Detailed Product Table */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Detailed Product Performance</h2>
              <div className="bg-white rounded-xl shadow p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-2 px-4 text-left font-semibold text-gray-600">Product</th>
                        <th className="py-2 px-4 text-left font-semibold text-gray-600">Units Sold</th>
                        <th className="py-2 px-4 text-left font-semibold text-gray-600">Revenue</th>
                        <th className="py-2 px-4 text-left font-semibold text-gray-600">Avg. Price</th>
                        <th className="py-2 px-4 text-left font-semibold text-gray-600">Performance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(metrics.topProducts || []).map((product) => {
                        const avgPrice = product.unitsSold > 0 ? product.revenue / product.unitsSold : 0;
                        const performance = product.unitsSold > 100 ? 'High' : product.unitsSold > 50 ? 'Medium' : 'Low';
                        const className = product.unitsSold > 100 ? 'bg-green-100 text-green-800' : product.unitsSold > 50 ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800';
                        return (
                          <tr key={product.id} className="border-b">
                            <td className="py-2 px-4">{product.name}</td>
                            <td className="py-2 px-4">{product.unitsSold}</td>
                            <td className="py-2 px-4">Ksh {product.revenue.toLocaleString()}</td>
                            <td className="py-2 px-4">Ksh {avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="py-2 px-4">
                              <span className={`px-2 py-1 rounded-full text-sm font-medium ${className}`}>
                                {performance}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}

        {(activeTab === 'daily' || activeTab === 'weekly' || activeTab === 'monthly' || activeTab === 'yearly') && (
          <>
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Sales Trends</h2>
              <div className="bg-white rounded-xl shadow p-6">
                <div className="h-64">
                  {salesTrendData.labels.length > 0 ? (
                    <Line
                      data={salesTrendData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            callbacks: {
                              label: function(context) {
                                return `Sales: Ksh ${context.parsed.y.toLocaleString()}`;
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0, 0, 0, 0.1)' }
                          },
                          x: {
                            grid: { color: 'rgba(0, 0, 0, 0.1)' }
                          }
                        },
                        interaction: {
                          intersect: false,
                          mode: 'index'
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <p>No {activeTab} sales data available</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Sales Details</h2>
              <div className="bg-white rounded-xl shadow p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-2 px-4 text-left font-semibold text-gray-600">Period</th>
                        <th className="py-2 px-4 text-left font-semibold text-gray-600">Sales (Ksh)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSalesData.length > 0 ? (
                        filteredSalesData.map((item, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-2 px-4">{item.label}</td>
                            <td className="py-2 px-4 font-medium">Ksh {item.value.toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="py-4 px-4 text-center text-gray-500">
                            No {activeTab} sales data available for the selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'performance' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Best Performing Products */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Best Performing Products</h2>
              <div className="bg-white rounded-xl shadow p-6">
                <div className="h-80">
                  <Bar
                    data={{
                      labels: bestProducts.map(p => p.name),
                      datasets: [{
                        label: 'Units Sold',
                        data: bestProducts.map(p => p.unitsSold),
                        backgroundColor: '#22c55e',
                        borderRadius: 4,
                      }],
                    }}
                    options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y' }}
                  />
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-2 px-4 text-left font-semibold text-gray-600">Product</th>
                        <th className="py-2 px-4 text-left font-semibold text-gray-600">Units Sold</th>
                        <th className="py-2 px-4 text-left font-semibold text-gray-600">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bestProducts.map((product) => (
                        <tr key={product.id} className="border-b">
                          <td className="py-2 px-4">{product.name}</td>
                          <td className="py-2 px-4">{product.unitsSold}</td>
                          <td className="py-2 px-4">Ksh {product.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Worst Performing Products */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Worst Performing Products</h2>
              <div className="bg-white rounded-xl shadow p-6">
                <div className="h-80">
                  <Bar
                    data={{
                      labels: worstProducts.map(p => p.name),
                      datasets: [{
                        label: 'Units Sold',
                        data: worstProducts.map(p => p.unitsSold),
                        backgroundColor: '#ef4444',
                        borderRadius: 4,
                      }],
                    }}
                    options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y' }}
                  />
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-2 px-4 text-left font-semibold text-gray-600">Product</th>
                        <th className="py-2 px-4 text-left font-semibold text-gray-600">Units Sold</th>
                        <th className="py-2 px-4 text-left font-semibold text-gray-600">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {worstProducts.map((product) => (
                        <tr key={product.id} className="border-b">
                          <td className="py-2 px-4">{product.name}</td>
                          <td className="py-2 px-4">{product.unitsSold}</td>
                          <td className="py-2 px-4">Ksh {product.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Sales Summary */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Sales Summary</h2>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Best Selling Product</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {(metrics.topProducts || []).length > 0 ? (metrics.topProducts || [])[0].name : 'N/A'}
                </p>
                <p className="text-sm text-gray-600">
                  {(metrics.topProducts || []).length > 0 ? `${(metrics.topProducts || [])[0].unitsSold} units` : ''}
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Highest Revenue Product</h3>
                <p className="text-2xl font-bold text-green-600">
                  {(metrics.topProducts || []).length > 0 ? (metrics.topProducts || []).sort((a, b) => b.revenue - a.revenue)[0].name : 'N/A'}
                </p>
                <p className="text-sm text-gray-600">
                  {(metrics.topProducts || []).length > 0 ? `Ksh ${(metrics.topProducts || []).sort((a, b) => b.revenue - a.revenue)[0].revenue.toLocaleString()}` : ''}
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Products Tracked</h3>
                <p className="text-2xl font-bold text-purple-600">{(metrics.topProducts || []).length}</p>
                <p className="text-sm text-gray-600">Active products</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
