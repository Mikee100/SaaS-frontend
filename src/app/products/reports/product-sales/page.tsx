"use client";
import { useCallback, useEffect, useState, useMemo } from "react";
import { apiGet } from "@/utils/api";
import { Line, Bar, Pie, Doughnut } from "react-chartjs-2";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useTenant } from '@/hooks/useTenant';
import {
  getPdfDocOptions,
  getPdfMargin,
  getPdfFontSize,
  applyPdfBusinessHeader,
  applyPdfFooterAndPageNumbers,
  getPdfTableColors,
  getPdfCurrency,
  type PdfTemplate,
} from '@/utils/pdfTemplate';
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
import { FaDownload, FaFilePdf, FaFileExcel, FaSyncAlt, FaChartPie } from "react-icons/fa";

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

type Forecast = { forecast_months?: string[]; forecast_sales?: number[] } | null;

type Metrics = {
  totalSales: number;
  totalRevenue: number;
  avgSaleValue: number;
  topProducts: TopProduct[];
  salesByMonth: Record<string, number>;
  salesByDay?: Record<string, number>;
  salesByWeek?: Record<string, number>;
  salesByYear?: Record<string, number>;
  forecast?: Forecast;
};

type TabType = 'overview' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'performance';

function getUnitsSold(p: TopProduct & { sales?: number }): number {
  return (p as { unitsSold?: number }).unitsSold ?? p.sales ?? 0;
}

export default function ProductSalesReportPage() {
  const { data: tenantData } = useTenant();
  const pdfTemplate = (tenantData?.pdfTemplate || {}) as PdfTemplate;
  const currency = getPdfCurrency(tenantData, pdfTemplate);
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
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiGet(`/analytics/dashboard`),
      apiGet(`/analytics/sales/daily`).catch(() => ({} as Record<string, number>)),
      apiGet(`/analytics/sales/weekly`).catch(() => ({} as Record<string, number>)),
      apiGet(`/analytics/sales/yearly`).catch(() => ({} as Record<string, number>)),
    ])
      .then(([dashboardData, dailyData, weeklyData, yearlyData]) => {
        const dashboard = dashboardData as Metrics & { forecast?: Forecast };
        setMetrics({
          totalSales: dashboard.totalSales,
          totalRevenue: dashboard.totalRevenue,
          avgSaleValue: dashboard.avgSaleValue,
          topProducts: dashboard.topProducts ?? [],
          salesByMonth: dashboard.salesByMonth ?? {},
          salesByDay: dailyData as Record<string, number>,
          salesByWeek: weeklyData as Record<string, number>,
          salesByYear: yearlyData as Record<string, number>,
          forecast: dashboard.forecast ?? null,
        });
      })
      .catch((err: unknown) => setError((err as Error).message || "An error occurred while fetching data."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

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
      } else if (/^\d{1,2} [A-Za-z]{3} - \d{1,2} [A-Za-z]{3} \d{4}$/.test(label)) {
        const parts = label.split(' ');
        const day = parseInt(parts[0], 10);
        const monthNum = new Date(Date.parse(parts[1] + ' 1, 2000')).getMonth();
        const year = parseInt(parts[5], 10);
        date = new Date(year, monthNum, day);
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

  const salesTrendWithMovingAvg = useMemo(() => {
    const window = activeTab === 'daily' ? 3 : activeTab === 'weekly' ? 2 : 2;
    const values = filteredSalesData.map(f => f.value);
    const ma: number[] = [];
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - window + 1);
      const slice = values.slice(start, i + 1);
      ma.push(slice.reduce((a, b) => a + b, 0) / slice.length);
    }
    return {
      labels: filteredSalesData.map(f => f.label),
      values,
      movingAvg: ma,
    };
  }, [filteredSalesData, activeTab]);

  const salesTrendData = useMemo(() => {
    const { labels, values, movingAvg } = salesTrendWithMovingAvg;
    return {
      labels,
      datasets: [
        {
          label: 'Revenue',
          data: values,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          fill: true,
          tension: 0.4,
        },
        ...(movingAvg.some(v => !Number.isNaN(v)) ? [{
          label: 'Moving avg',
          data: movingAvg,
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          borderDash: [5, 5],
        }] : []),
      ],
    };
  }, [salesTrendWithMovingAvg]);

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
    return [...(metrics.topProducts || [])].sort((a, b) => getUnitsSold(b) - getUnitsSold(a)).slice(0, 5);
  }, [metrics]);

  const worstProducts = useMemo(() => {
    return [...(metrics.topProducts || [])].sort((a, b) => getUnitsSold(a) - getUnitsSold(b)).slice(0, 5);
  }, [metrics]);

  const { periodComparison, peakPeriod } = useMemo(() => {
    const arr = filteredSalesData;
    const total = arr.reduce((s, x) => s + x.value, 0);
    const half = Math.floor(arr.length / 2);
    const currentSum = arr.slice(-half).reduce((s, x) => s + x.value, 0);
    const previousSum = arr.slice(0, half).reduce((s, x) => s + x.value, 0);
    const change = previousSum > 0 ? ((currentSum - previousSum) / previousSum) * 100 : 0;
    const peak = arr.length ? arr.reduce((best, x) => (x.value > best.value ? x : best), arr[0]) : null;
    return {
      periodComparison: { currentSum, previousSum, change, total },
      peakPeriod: peak,
    };
  }, [filteredSalesData]);

  const exportToPDF = () => {
    const pdfTemplate = (tenantData?.pdfTemplate || {}) as PdfTemplate;
    const currency = getPdfCurrency(tenantData, pdfTemplate);
    const margin = getPdfMargin(pdfTemplate);
    const fontSize = getPdfFontSize(pdfTemplate);
    const { primaryRgb, secondaryRgb } = getPdfTableColors(pdfTemplate);

    const doc = new jsPDF(getPdfDocOptions(pdfTemplate));
    let yPosition = applyPdfBusinessHeader(doc, tenantData, pdfTemplate, margin);

    const reportTitle = `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Sales Report`;
    doc.setFontSize(fontSize + 4);
    doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
    doc.text(reportTitle, margin, yPosition + 8);
    yPosition += 18;

    doc.setFontSize(fontSize - 2);
    doc.setTextColor('666666');
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 8;
    doc.text(`Total Sales: ${metrics.totalSales}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Total Revenue: ${currency} ${(metrics.totalRevenue ?? 0).toLocaleString()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Average Sale Value: ${currency} ${(metrics.avgSaleValue ?? 0).toLocaleString()}`, margin, yPosition);
    yPosition += 14;

    if (activeTab === 'performance') {
      doc.setFontSize(fontSize);
      doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
      doc.text('Best Performing Products', margin, yPosition);
      yPosition += 10;
      const bestRows = bestProducts.map((p, i) => [i + 1, p.name, getUnitsSold(p), (p.revenue ?? 0).toLocaleString()]);
      if (bestRows.length) {
        autoTable(doc, {
          head: [['#', 'Product', 'Units Sold', `Revenue (${currency})`]],
          body: bestRows,
          startY: yPosition,
          styles: { fontSize: fontSize - 2, cellPadding: 3 },
          headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: secondaryRgb },
          margin: { left: margin, right: margin },
        });
        yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
      }
      doc.setFontSize(fontSize);
      doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
      doc.text('Worst Performing Products', margin, yPosition);
      yPosition += 10;
      const worstRows = worstProducts.map((p, i) => [i + 1, p.name, getUnitsSold(p), (p.revenue ?? 0).toLocaleString()]);
      if (worstRows.length) {
        autoTable(doc, {
          head: [['#', 'Product', 'Units Sold', `Revenue (${currency})`]],
          body: worstRows,
          startY: yPosition,
          styles: { fontSize: fontSize - 2, cellPadding: 3 },
          headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: secondaryRgb },
          margin: { left: margin, right: margin },
        });
        yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
      }
    } else {
      doc.setFontSize(fontSize);
      doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
      doc.text('Top Products', margin, yPosition);
      yPosition += 10;
      const topRows = (metrics.topProducts?.slice(0, 15) || []).map((p, i) => [i + 1, p.name, getUnitsSold(p), (p.revenue ?? 0).toLocaleString()]);
      if (topRows.length) {
        autoTable(doc, {
          head: [['#', 'Product', 'Units Sold', `Revenue (${currency})`]],
          body: topRows,
          startY: yPosition,
          styles: { fontSize: fontSize - 2, cellPadding: 3 },
          headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: secondaryRgb },
          margin: { left: margin, right: margin },
        });
      }
    }

    applyPdfFooterAndPageNumbers(doc, pdfTemplate, 'SaaS POS • Product Sales');
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
      ...(metrics.topProducts || []).map(p => {
        const u = getUnitsSold(p);
        return [
          p.name,
          u,
          p.revenue,
          u > 0 ? (p.revenue / u).toFixed(2) : '0.00',
          u > 100 ? 'High' : u > 50 ? 'Medium' : 'Low'
        ];
      })
    ];
    const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
    XLSX.utils.book_append_sheet(workbook, productsSheet, 'Top Products');

    if (activeTab === 'performance') {
      const bestData = [
        ['Best Products', 'Units Sold'],
        ...bestProducts.map(p => [p.name, getUnitsSold(p)])
      ];
      const bestSheet = XLSX.utils.aoa_to_sheet(bestData);
      XLSX.utils.book_append_sheet(workbook, bestSheet, 'Best Products');

      const worstData = [
        ['Worst Products', 'Units Sold'],
        ...worstProducts.map(p => [p.name, getUnitsSold(p)])
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
      } else if (/^\d{1,2} [A-Za-z]{3} - \d{1,2} [A-Za-z]{3} \d{4}$/.test(label)) {
        const parts = label.split(' ');
        const day = parseInt(parts[0], 10);
        const monthNum = new Date(Date.parse(parts[1] + ' 1, 2000')).getMonth();
        const year = parseInt(parts[5], 10);
        date = new Date(year, monthNum, day);
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
      ['Total Revenue', `${currency} ${metrics.totalRevenue?.toLocaleString()}`],
      ['Avg. Sale Value', `${currency} ${metrics.avgSaleValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
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
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Product Sales Report</h1>
              <p className="mt-1 text-sm text-gray-500">Comprehensive sales analytics with multiple time periods and performance insights.</p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={() => setRefreshKey(k => k + 1)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2 text-xs"
                title="Refresh data"
              >
                <FaSyncAlt className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                onClick={exportToPDF}
                className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2 text-xs"
              >
                <FaFilePdf />
                Export PDF
              </button>
              <button
                onClick={exportToExcel}
                className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 text-xs"
              >
                <FaFileExcel />
                Export Excel
              </button>
            </div>
          </div>
        </header>

        {/* Tabs & Filters */}
        <div className="mb-4 flex flex-col gap-2">
          <nav className="flex space-x-1 bg-white p-1 rounded-md shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          {activeTab !== 'performance' && (
            <div className="bg-white rounded-md shadow-sm p-3 flex flex-wrap gap-3 items-end">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-medium text-gray-600">Quick range:</span>
                {[
                  { label: 'Last 7 days', from: () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); }, to: () => new Date().toISOString().slice(0, 10) },
                  { label: 'Last 30 days', from: () => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); }, to: () => new Date().toISOString().slice(0, 10) },
                  { label: 'This month', from: () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; }, to: () => new Date().toISOString().slice(0, 10) },
                  { label: 'Last month', from: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; }, to: () => { const d = new Date(); d.setDate(0); return d.toISOString().slice(0, 10); } },
                  { label: 'YTD', from: () => `${new Date().getFullYear()}-01-01`, to: () => new Date().toISOString().slice(0, 10) },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => { setDateFrom(preset.from()); setDateTo(preset.to()); }}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-indigo-100 hover:text-indigo-800 transition-colors text-xs"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 items-end border-l border-gray-200 pl-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border-gray-300 rounded focus:border-indigo-500 focus:ring-indigo-500 text-xs px-2 py-1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border-gray-300 rounded focus:border-indigo-500 focus:ring-indigo-500 text-xs px-2 py-1" />
                </div>
                <button className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-xs" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</button>
              </div>
            </div>
          )}
        </div>

        {/* Metrics Section */}
        <section className="mb-4">
          <div className="bg-white rounded-md shadow-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-gray-800">Key Metrics</h2>
              <button
                onClick={exportMetrics}
                className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1 text-xs"
                aria-label="Download Key Metrics as Excel"
                title="Download Key Metrics"
              >
                <FaDownload />
                Download
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-blue-50 rounded shadow-sm p-3 flex flex-col items-center border border-blue-100 hover:bg-blue-100 transition-colors">
                <span className="text-blue-600 text-xs mb-1 font-medium">Total Sales</span>
                <span className="text-xl font-bold text-blue-700">{metrics.totalSales}</span>
              </div>
              <div className="bg-green-50 rounded shadow-sm p-3 flex flex-col items-center border border-green-100 hover:bg-green-100 transition-colors">
                <span className="text-green-600 text-xs mb-1 font-medium">Total Revenue</span>
                <span className="text-xl font-bold text-green-700">{currency} {(metrics.totalRevenue ?? 0).toLocaleString()}</span>
              </div>
              <div className="bg-purple-50 rounded shadow-sm p-3 flex flex-col items-center border border-purple-100 hover:bg-purple-100 transition-colors">
                <span className="text-purple-600 text-xs mb-1 font-medium">Avg. Sale Value</span>
                <span className="text-xl font-bold text-purple-700">{currency} {(metrics.avgSaleValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="bg-red-50 rounded shadow-sm p-3 flex flex-col items-center border border-red-100 hover:bg-red-100 transition-colors">
                <span className="text-red-600 text-xs mb-1 font-medium">Top Products</span>
                <span className="text-xl font-bold text-red-600">{(metrics.topProducts || []).length}</span>
              </div>
            </div>
            {activeTab !== 'performance' && filteredSalesData.length >= 2 && (
              <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Period vs previous:</span>
                  <span className={periodComparison.change >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {periodComparison.change >= 0 ? '+' : ''}{periodComparison.change.toFixed(1)}%
                  </span>
                  <span className="text-gray-500 text-xs">({currency} {periodComparison.currentSum.toLocaleString()} vs {currency} {periodComparison.previousSum.toLocaleString()})</span>
                </div>
                {peakPeriod && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Peak period:</span>
                    <span className="font-semibold text-indigo-600">{peakPeriod.label}</span>
                    <span className="text-gray-700">{currency} {peakPeriod.value.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Dashboard Charts Row */}
        {activeTab === 'overview' && (
          <section className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sales Trends Chart */}
              <div className="bg-white rounded-md shadow p-3 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-bold text-gray-800">Sales Trends</h2>
                  <button
                    onClick={exportTrendData}
                    className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1 text-xs"
                    aria-label="Download Sales Trends as Excel"
                    title="Download Sales Trends"
                  >
                    <FaDownload />
                    Download
                  </button>
                </div>
                <div className="h-56 bg-gray-50 rounded p-2">
                  {salesTrendData.labels.length > 0 ? (
                    <Line
                      data={salesTrendData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: '#2563eb',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            borderColor: '#fff',
                            borderWidth: 1,
                            callbacks: {
                              label: function(context) {
                                return `Revenue: ${currency} ${context.parsed.y.toLocaleString()}`;
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(37,99,235,0.07)' },
                            ticks: { color: '#2563eb', font: { size: 11 } }
                          },
                          x: {
                            grid: { color: 'rgba(37,99,235,0.07)' },
                            ticks: { color: '#2563eb', font: { size: 11 } }
                          }
                        },
                          interaction: {
                            intersect: false,
                            mode: 'index'
                          }
                        }
                      }
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <p>No sales data available</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Revenue Breakdown Chart */}
              <div className="bg-white rounded-md shadow p-3 flex flex-col">
                <h2 className="text-base font-bold text-gray-800 mb-2">Revenue by Product</h2>
                <div className="h-56 bg-gray-50 rounded p-2">
                  <Bar
                    data={revenueBreakdownData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: 'y',
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: '#a855f7',
                          titleColor: '#fff',
                          bodyColor: '#fff',
                          borderColor: '#fff',
                          borderWidth: 1,
                          callbacks: {
                            label: function(context) {
                              return `Revenue: ${currency} ${(context.parsed.x ?? context.parsed.y ?? 0).toLocaleString()}`;
                            }
                          }
                        }
                      },
                      scales: {
                        x: {
                          grid: { color: 'rgba(168,85,247,0.07)' },
                          ticks: { color: '#a855f7', font: { size: 11 } }
                        },
                        y: {
                          grid: { color: 'rgba(168,85,247,0.07)' },
                          ticks: { color: '#a855f7', font: { size: 11 } }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Top Products Pie + Revenue Share Donut */}
        {activeTab === 'overview' && (
          <section className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-md shadow p-3 flex flex-col">
                <h2 className="text-base font-bold text-gray-800 mb-2">Units Sold by Product</h2>
                <div className="h-56 bg-gray-50 rounded p-2">
                  <Pie
                    data={{
                      labels: (metrics.topProducts || []).map(p => p.name),
                      datasets: [{
                        label: 'Units Sold',
                        data: (metrics.topProducts || []).map(p => getUnitsSold(p)),
                        backgroundColor: ['#6366f1', '#a855f7', '#ec4899', '#22c55e', '#f59e0b', '#06b6d4'],
                        borderRadius: 4,
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: { font: { size: 11 }, color: '#374151' }
                        },
                        tooltip: {
                          backgroundColor: '#22c55e',
                          titleColor: '#fff',
                          bodyColor: '#fff',
                          borderColor: '#fff',
                          borderWidth: 1,
                          callbacks: {
                            label: function(context) {
                              return `${context.label}: ${context.parsed}`;
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
              <div className="bg-white rounded-md shadow p-3 flex flex-col">
                <h2 className="text-base font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <FaChartPie /> Revenue Share (Donut)
                </h2>
                <div className="h-56 bg-gray-50 rounded p-2">
                  <Doughnut
                    data={revenueBreakdownData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '55%',
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: { font: { size: 11 }, color: '#374151' }
                        },
                        tooltip: {
                          backgroundColor: '#6366f1',
                          titleColor: '#fff',
                          bodyColor: '#fff',
                          callbacks: {
                            label: function(context) {
                              const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                              const pct = total > 0 ? ((context.parsed as number) / total * 100).toFixed(1) : '0';
                              return `${context.label}: ${currency} ${(context.parsed as number).toLocaleString()} (${pct}%)`;
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Sales Forecast (Overview) */}
        {activeTab === 'overview' && metrics.forecast?.forecast_months?.length && metrics.forecast?.forecast_sales?.length && (
          <section className="mb-4">
            <div className="bg-white rounded-md shadow p-3 flex flex-col">
              <h2 className="text-base font-bold text-gray-800 mb-2">Sales Forecast (Next 6 Months)</h2>
              <p className="text-xs text-gray-500 mb-2">Predicted transaction count based on recent trend.</p>
              <div className="h-48 bg-gray-50 rounded p-2">
                <Line
                  data={{
                    labels: metrics.forecast.forecast_months,
                    datasets: [{
                      label: 'Forecast (transactions)',
                      data: metrics.forecast.forecast_sales,
                      borderColor: '#059669',
                      backgroundColor: 'rgba(5, 150, 105, 0.1)',
                      fill: true,
                      tension: 0.4,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => `Forecast: ${ctx.parsed.y} transactions`,
                        }
                      }
                    },
                    scales: {
                      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
                      x: { grid: { color: 'rgba(0,0,0,0.06)' } },
                    },
                  }}
                />
              </div>
            </div>
          </section>
        )}

        {/* Product Performance Table */}
        {activeTab === 'overview' && (
          <section className="mb-4">
            <div className="bg-white rounded-md shadow p-3">
              <h2 className="text-base font-bold text-gray-800 mb-2">Detailed Product Performance</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-2 px-4 text-left font-semibold text-gray-600">Product</th>
                      <th className="py-2 px-4 text-left font-semibold text-gray-600">Units Sold</th>
                      <th className="py-2 px-4 text-left font-semibold text-gray-600">Revenue</th>
                      <th className="py-2 px-4 text-left font-semibold text-gray-600">Share %</th>
                      <th className="py-2 px-4 text-left font-semibold text-gray-600">Avg. Price</th>
                      <th className="py-2 px-4 text-left font-semibold text-gray-600">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(metrics.topProducts || []).map((product) => {
                      const units = getUnitsSold(product);
                      const avgPrice = units > 0 ? product.revenue / units : 0;
                      const sharePct = (metrics.totalRevenue ?? 0) > 0 ? (product.revenue / (metrics.totalRevenue ?? 1)) * 100 : 0;
                      const performance = units > 100 ? 'High' : units > 50 ? 'Medium' : 'Low';
                      const className = units > 100 ? 'bg-green-100 text-green-800' : units > 50 ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800';
                      return (
                        <tr key={product.id} className="border-b">
                          <td className="py-2 px-4">{product.name}</td>
                          <td className="py-2 px-4">{units}</td>
                          <td className="py-2 px-4">{currency} {product.revenue.toLocaleString()}</td>
                          <td className="py-2 px-4 font-medium text-indigo-600">{sharePct.toFixed(1)}%</td>
                          <td className="py-2 px-4">{currency} {avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
        )}

        {/* Time Period Trends & Table */}
        {(activeTab === 'daily' || activeTab === 'weekly' || activeTab === 'monthly' || activeTab === 'yearly') && (
          <section className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-md shadow p-3">
              <h2 className="text-base font-bold text-gray-800 mb-2">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Sales Trends</h2>
              <div className="h-56 bg-gray-50 rounded p-2">
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
                              return `Revenue: ${currency} ${context.parsed.y.toLocaleString()}`;
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
            <div className="bg-white rounded-md shadow p-3">
              <h2 className="text-base font-bold text-gray-800 mb-2">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Sales Details</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-2 px-4 text-left font-semibold text-gray-600">Period</th>
                      <th className="py-2 px-4 text-left font-semibold text-gray-600">Revenue ({currency})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSalesData.length > 0 ? (
                      filteredSalesData.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-2 px-4">{item.label}</td>
                          <td className="py-2 px-4 font-medium">{currency} {item.value.toLocaleString()}</td>
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
        )}

        {/* Performance Tab: Best/Worst Products */}
        {activeTab === 'performance' && (
          <section className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-md shadow p-3">
              <h2 className="text-base font-bold text-gray-800 mb-2">Best Performing Products</h2>
              <div className="h-56 bg-gray-50 rounded p-2">
                <Bar
                  data={{
                    labels: bestProducts.map(p => p.name),
                    datasets: [{
                      label: 'Units Sold',
                      data: bestProducts.map(p => getUnitsSold(p)),
                      backgroundColor: '#22c55e',
                      borderRadius: 4,
                    }],
                  }}
                  options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y' }}
                />
              </div>
              <div className="mt-2 overflow-x-auto">
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
                        <td className="py-2 px-4">{getUnitsSold(product)}</td>
                        <td className="py-2 px-4">{currency} {product.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white rounded-md shadow p-3">
              <h2 className="text-base font-bold text-gray-800 mb-2">Worst Performing Products</h2>
              <div className="h-56 bg-gray-50 rounded p-2">
                <Bar
                  data={{
                    labels: worstProducts.map(p => p.name),
                    datasets: [{
                      label: 'Units Sold',
                      data: worstProducts.map(p => getUnitsSold(p)),
                      backgroundColor: '#ef4444',
                      borderRadius: 4,
                    }],
                  }}
                  options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y' }}
                />
              </div>
              <div className="mt-2 overflow-x-auto">
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
                        <td className="py-2 px-4">{getUnitsSold(product)}</td>
                        <td className="py-2 px-4">{currency} {product.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Sales Summary */}
        <section>
          <div className="bg-white rounded-md shadow p-3">
            <h2 className="text-base font-bold text-gray-800 mb-2">Sales Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <h3 className="text-base font-semibold text-gray-800 mb-2">Best Selling Product</h3>
                <p className="text-xl font-bold text-blue-600">
                  {(metrics.topProducts || []).length > 0 ? (metrics.topProducts || [])[0].name : 'N/A'}
                </p>
                <p className="text-sm text-gray-600">
                  {(metrics.topProducts || []).length > 0 ? `${getUnitsSold((metrics.topProducts || [])[0])} units` : ''}
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold text-gray-800 mb-2">Highest Revenue Product</h3>
                <p className="text-xl font-bold text-green-600">
                  {(metrics.topProducts || []).length > 0 ? (metrics.topProducts || []).sort((a, b) => b.revenue - a.revenue)[0].name : 'N/A'}
                </p>
                <p className="text-sm text-gray-600">
                  {(metrics.topProducts || []).length > 0 ? `${currency} ${(metrics.topProducts || []).sort((a, b) => b.revenue - a.revenue)[0].revenue.toLocaleString()}` : ''}
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold text-gray-800 mb-2">Total Products Tracked</h3>
                <p className="text-xl font-bold text-purple-600">{(metrics.topProducts || []).length}</p>
                <p className="text-sm text-gray-600">Active products</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
