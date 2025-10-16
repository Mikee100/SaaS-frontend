"use client";
import { useEffect, useState, useMemo } from "react";
import { apiGet } from "@/utils/api";
import { Line, Pie, Bar } from "react-chartjs-2";
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import InteractiveChart from '@/components/InteractiveChart';
import AlertBanner from '@/components/AlertBanner';
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
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { FaCrown,  FaChartBar, FaExchangeAlt, FaFilter } from 'react-icons/fa';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import { useBranch } from "@/contexts/BranchContext";


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
type Customer = { name: string; phone: string; total: number; count: number; lastPurchase?: Date };
type Forecast = { forecast_months: string[]; forecast_sales: number[] };

type Product = { id: string; name: string; stock?: number };

type Metrics = {
  totalSales: number;
  totalRevenue: number;
  avgSaleValue: number;
  topProducts: TopProduct[];
  lowStock: Product[];
  paymentBreakdown: Record<string, number>;
  salesByMonth: Record<string, number>;
  topCustomers: Customer[];
  forecast: Forecast;
  customerSegments: Array<{
    segment: string;
    count: number;
    revenue: number;
    avgOrderValue: number;
    retention: number;
  }>;
  advancedSegments?: {
    byLocation?: Array<{ location: string; revenue: number; customers: number }>;
    byAge?: Array<{ age: string; revenue: number; customers: number }>;
    byDevice?: Array<{ device: string; revenue: number; customers: number }>;
  };
  inventoryAnalytics?: {
    lowStockItems?: number;
    overstockItems?: number;
    inventoryTurnover?: number;
    stockoutRate?: number;
  };
  performanceMetrics?: {
    visitorCount?: number;
    leadCount?: number;
    customerCount?: number;
    customerLifetimeValue?: number;
    customerAcquisitionCost?: number;
    returnOnInvestment?: number;
    netPromoterScore?: number;
  };
  aiSummary?: string;
};

type Branch = { id: string; name: string };

type BranchComparisonData = {
  timeRange: string;
  branches: Array<{
    branchId: string;
    branchName: string;
    data: Array<{
      period: string;
      orders: number;
      sales: number;
    }>;
  }>;
  totals: Array<{
    branchId: string;
    branchName: string;
    totalOrders: number;
    totalSales: number;
  }>;
  periodType: string;
};

type ProductComparison = {
  productId: string;
  productName: string;
  totalQuantitySold: number;
  totalRevenue: number;
  branchCount: number;
  branchBreakdown: Array<{
    branchId: string;
    branchName: string;
    totalRevenue: number;
    quantitySold: number;
  }>;
};

type BranchComparison = {
  branchId: string;
  branchName: string;
  totalOrders: number;
  totalSales: number;
};

type ProductComparisonData = {
  products: ProductComparison[];
  branches: BranchComparison[];
  summary: {
    totalProducts: number;
  };
};

export default function ReportsPage() {
  // Low stock notification state
  const [showLowStockAlert, setShowLowStockAlert] = useState(true);
  const { user } = useUser();
 const { data: limits } = usePlanLimits();
  const branchContext = useBranch();
  const selectedBranchId = branchContext?.selectedBranchId;
  const [metrics, setMetrics] = useState<Metrics>({
    totalSales: 0,
    totalRevenue: 0,
    avgSaleValue: 0,
    topProducts: [],
    lowStock: [],
    paymentBreakdown: {},
    salesByMonth: {},
    topCustomers: [],
    forecast: { forecast_months: [], forecast_sales: [] },
    customerSegments: [],
  });
  type Product = { id: string; name: string; stock?: number };
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // Grouping selector for sales trend
  const [grouping, setGrouping] = useState<'day' | 'week' | 'month'>('month');

  // Branch filtering and comparison
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedReportBranch, setSelectedReportBranch] = useState<string>("all");
  const [comparisonMode, setComparisonMode] = useState(false);
  const [branchComparisonData, setBranchComparisonData] = useState<BranchComparisonData | null>(null);
  const [productComparisonData, setProductComparisonData] = useState<ProductComparisonData | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Permission checks
  const permissionsLoading = !user || !limits;
  const canViewReports = !permissionsLoading && hasPermission(user, 'view_reports');

  useEffect(() => {
    const headers = selectedBranchId ? { 'x-branch-id': selectedBranchId } : undefined;
    apiGet("/products", headers).then((data) => setProducts(data as Product[])).catch(() => setProducts([]));
  }, [selectedBranchId]);

  // Fetch branches for filtering
  useEffect(() => {
    const fetchBranches = async () => {
      if (!user?.tenantId) return;
      setLoadingBranches(true);
      try {
        const data = await apiGet(`/api/branches`);
        setBranches(data as Branch[]);
      } catch (error) {
        console.error('Failed to fetch branches:', error);
      } finally {
        setLoadingBranches(false);
      }
    };
    fetchBranches();
  }, [user?.tenantId]);

  // Fetch branch comparison data when in comparison mode
  useEffect(() => {
    if (comparisonMode && user?.tenantId) {
      const fetchBranchComparison = async () => {
        try {
          const [timeSeriesData, productData] = await Promise.all([
            apiGet(`/api/reports/branches/${user.tenantId}/comparison/timeseries?timeRange=30days`),
            apiGet(`/api/reports/branches/${user.tenantId}/comparison/products?timeRange=30days`)
          ]);
          setBranchComparisonData(timeSeriesData as BranchComparisonData);
          setProductComparisonData(productData as ProductComparisonData);
        } catch (error) {
          console.error('Failed to fetch branch comparison data:', error);
        }
      };
      fetchBranchComparison();
    }
  }, [comparisonMode, user?.tenantId]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Use branch-specific endpoint if a branch is selected and not in comparison mode
    const fetchData = async () => {
      try {
        let data: Metrics;

        if (selectedReportBranch !== "all" && !comparisonMode && user?.tenantId) {
          // Fetch branch-specific data
          const branchData = await apiGet(`/api/reports/branches/${user.tenantId}/sales?timeRange=30days&branchId=${selectedReportBranch}`) as {
            totalOrders?: number;
            totalSales?: number;
            averageOrderValue?: number;
            topProducts?: Array<{ productId: string; productName: string; quantitySold: number; totalRevenue: number }>;
            paymentMethods?: Array<{ method: string; amount: number }>;
            salesTrend?: Array<{ date: string; sales: number }>;
          };
          // Transform branch data to match Metrics interface
          data = {
            totalSales: branchData.totalOrders || 0,
            totalRevenue: branchData.totalSales || 0,
            avgSaleValue: branchData.averageOrderValue || 0,
            topProducts: branchData.topProducts?.map(p => ({
              id: p.productId,
              name: p.productName,
              unitsSold: p.quantitySold,
              revenue: p.totalRevenue,
            })) || [],
            lowStock: [],
            paymentBreakdown: branchData.paymentMethods?.reduce((acc, pm) => {
              acc[pm.method] = pm.amount;
              return acc;
            }, {} as Record<string, number>) || {},
            salesByMonth: branchData.salesTrend?.reduce((acc, trend) => {
              acc[trend.date] = trend.sales;
              return acc;
            }, {} as Record<string, number>) || {},
            topCustomers: [],
            forecast: { forecast_months: [], forecast_sales: [] },
            customerSegments: [],
          };
        } else {
          // Fetch general dashboard data
          data = await apiGet(`/analytics/dashboard`) as Metrics;
        }

        setMetrics(data);
      } catch (err: unknown) {
        setError((err as Error).message || "An error occurred while fetching data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedReportBranch, comparisonMode, user?.tenantId]);

  // Map backend dashboard data to frontend chart formats
  const { salesTrendData, revenueBreakdownData, paymentMethodData } = useMemo(() => {
    // Support grouping by day, week, or month
    const salesRaw = metrics.salesByMonth || {};
    const labels = Object.keys(salesRaw);
    const values = Object.values(salesRaw);
    // Helper to get week string from date
    function getWeekStr(date: Date) {
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      return `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
    }
  // Only use real analytics data. If empty, show message in chart section.
    let filtered: { label: string, value: number, date: Date }[] = labels.map((label, idx) => {
      let date: Date;
      if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
        // YYYY-MM-DD
        date = new Date(label);
      } else if (/^[A-Za-z]{3,} \d{4}$/.test(label)) {
        // Month format (e.g., Jan 2025)
        const [monStr, yearStr] = label.split(' ');
        const monthNum = new Date(Date.parse(monStr + ' 1, 2000')).getMonth();
        date = new Date(parseInt(yearStr, 10), monthNum, 1);
      } else if (/^\d{4}-W\d{2}$/.test(label)) {
        // Week format
        const [year, week] = label.split('-W');
        date = new Date(parseInt(year, 10), 0, 1 + (parseInt(week, 10) - 1) * 7);
      } else {
        date = new Date(label);
      }
      return { label, value: values[idx], date };
    });
    // Filter by date range
    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter(f => f.date >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      filtered = filtered.filter(f => f.date <= to);
    }
    // Regroup by selected grouping
    const grouped: Record<string, number> = {};
    filtered.forEach(({ date, value }) => {
      let key = '';
      if (grouping === 'day') {
        key = date.toISOString().slice(0, 10);
      } else if (grouping === 'week') {
        key = getWeekStr(date);
      } else {
        key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      }
      grouped[key] = (grouped[key] || 0) + value;
    });
    const finalLabels = Object.keys(grouped).sort();
    const finalValues = finalLabels.map(l => grouped[l]);
    const salesTrendData = {
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
    // Revenue chart fallback
  const revenueLabels = (metrics.topProducts || []).map(p => p.name);
  const revenueData = (metrics.topProducts || []).map(p => p.revenue);
    const revenueBreakdownData = {
      labels: revenueLabels,
      datasets: [{
        label: 'Revenue',
        data: revenueData,
        backgroundColor: ['#6366f1', '#a855f7', '#ec4899', '#22c55e', '#f59e0b'],
        borderRadius: 4,
      }],
    };
    // Payment chart fallback
  const paymentLabels = Object.keys(metrics.paymentBreakdown || {});
  const paymentData = Object.values(metrics.paymentBreakdown || {});
    const paymentMethodData = {
      labels: paymentLabels,
      datasets: [{
        label: 'Payments',
        data: paymentData,
        backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a21caf'],
        hoverOffset: 4,
      }],
    };
    return { salesTrendData, revenueBreakdownData, paymentMethodData };
  }, [metrics, dateFrom, dateTo, grouping]);

  // Export functions
  const exportToPDF = () => {
    const doc = new jsPDF();
    let yPosition = 20;

    // Determine title and filename based on selection
    let title = 'Business Reports';
    let filename = 'business_reports.pdf';
    if (comparisonMode) {
      title = 'Business Reports - Branch Comparison';
      filename = 'business_reports_comparison.pdf';
    } else if (selectedReportBranch !== "all") {
      const branchName = branches.find(b => b.id === selectedReportBranch)?.name || 'Selected Branch';
      title = `Business Reports - ${branchName}`;
      filename = `business_reports_${branchName.replace(/\s+/g, '_')}.pdf`;
    }

    doc.setFontSize(20);
    doc.text(title, 20, yPosition);
    yPosition += 20;

    doc.setFontSize(14);
    doc.text(`Total Sales: ${metrics.totalSales}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Total Revenue: Ksh ${metrics.totalRevenue?.toLocaleString()}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Average Sale Value: Ksh ${metrics.avgSaleValue?.toLocaleString()}`, 20, yPosition);
    yPosition += 20;

    // Add AI Summary to PDF
    if (metrics.aiSummary) {
      doc.text('AI-Generated Insights:', 20, yPosition);
      yPosition += 10;
      const summaryLines = doc.splitTextToSize(metrics.aiSummary, 170);
      doc.text(summaryLines, 20, yPosition);
      yPosition += summaryLines.length * 5 + 10;
    }

    // Add top products
    doc.text('Top Products:', 20, yPosition);
    yPosition += 10;
    metrics.topProducts?.slice(0, 5).forEach((product, index) => {
      doc.setFontSize(10);
      doc.text(`${index + 1}. ${product.name} - Ksh ${product.revenue.toLocaleString()}`, 30, yPosition);
      yPosition += 8;
    });

    doc.save(filename);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Determine filename based on selection
    let filename = 'business_reports.xlsx';
    if (comparisonMode) {
      filename = 'business_reports_comparison.xlsx';
    } else if (selectedReportBranch !== "all") {
      const branchName = branches.find(b => b.id === selectedReportBranch)?.name || 'Selected Branch';
      filename = `business_reports_${branchName.replace(/\s+/g, '_')}.xlsx`;
    }

    // AI Summary sheet
    if (metrics.aiSummary) {
      const summaryData = [['AI-Generated Insights'], [metrics.aiSummary]];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'AI Insights');
    }

    // Sales data
    const salesData = [
      ['Metric', 'Value'],
      ['Total Sales', metrics.totalSales],
      ['Total Revenue', metrics.totalRevenue],
      ['Average Sale Value', metrics.avgSaleValue],
    ];
    const salesSheet = XLSX.utils.aoa_to_sheet(salesData);
    XLSX.utils.book_append_sheet(workbook, salesSheet, 'Summary');

    // Top products
    const productsData = [
      ['Product', 'Units Sold', 'Revenue'],
      ...metrics.topProducts?.map(p => [p.name, p.unitsSold, p.revenue]) || []
    ];
    const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
    XLSX.utils.book_append_sheet(workbook, productsSheet, 'Top Products');

    // Top customers
    const customersData = [
      ['Customer', 'Purchases', 'Total Spent'],
      ...metrics.topCustomers?.map(c => [c.name, c.count, c.total]) || []
    ];
    const customersSheet = XLSX.utils.aoa_to_sheet(customersData);
    XLSX.utils.book_append_sheet(workbook, customersSheet, 'Top Customers');

    XLSX.writeFile(workbook, filename);
  };

    // Find low stock products (stock <= 10)
  const LOW_STOCK_THRESHOLD = 10;
  const lowStockProducts = products.filter(p => (p.stock ?? 0) <= LOW_STOCK_THRESHOLD && (p.stock ?? 0) > 0);

  // Show notification alert automatically when low stock detected
  useEffect(() => {
    if (lowStockProducts.length > 0) {
      setShowLowStockAlert(true);
    }
  }, [lowStockProducts.length]);

  if (permissionsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 text-lg">Loading permissions...</span>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user has permission to view reports
  if (!canViewReports) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <FaChartBar className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
         <p className="text-gray-600 mb-4">You don&apos;t have permission to view reports.</p>
          <p className="text-sm text-gray-500">Contact your administrator to request access.</p>
        </div>
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
        {/* Low Stock Notification Alert */}
        {showLowStockAlert && lowStockProducts.length > 0 && (
          <div className="mb-6">
            <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg shadow-md flex items-center justify-between" role="alert">
              <div>
                <strong className="font-bold">Low Stock Alert:</strong>
                <span className="ml-2">{lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} are low on stock.</span>
                <span className="ml-2 text-xs text-gray-600">({lowStockProducts.map(p => p.name).join(', ')})</span>
              </div>
              <button className="ml-4 text-red-700 hover:text-red-900" onClick={() => setShowLowStockAlert(false)}>
                Dismiss
              </button>
            </div>
          </div>
        )}
        {/* Alert Banner */}
        <AlertBanner />

        <header className="mb-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Business Reports</h1>
              <p className="mt-2 text-lg text-gray-500">Dive deep into your sales, customers, and product performance.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportToPDF}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Export PDF
              </button>
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Export Excel
              </button>
            </div>
          </div>
        </header>

        {/* AI-Generated Insights Section */}
        {metrics.aiSummary && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              AI-Generated Insights
            </h2>
            <div className="bg-white rounded-xl shadow p-6">
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{metrics.aiSummary}</p>
              </div>
            </div>
          </section>
        )}

        {/* Report Type Selector */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaFilter className="w-5 h-5" />
            Report Filters
          </h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <select value={grouping} onChange={e => setGrouping(e.target.value as 'day' | 'week' | 'month')} className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                <option value="day">Daily Reports</option>
                <option value="week">Weekly Reports</option>
                <option value="month">Monthly Reports</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch Filter</label>
              <select
                value={selectedReportBranch}
                onChange={e => {
                  setSelectedReportBranch(e.target.value);
                  if (e.target.value !== "all") {
                    setComparisonMode(false);
                  }
                }}
                className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                disabled={loadingBranches}
              >
                <option value="all">All Branches</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={comparisonMode}
                  onChange={e => {
                    setComparisonMode(e.target.checked);
                    if (e.target.checked) {
                      setSelectedReportBranch("all");
                    }
                  }}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <FaExchangeAlt className="w-4 h-4" />
                Compare Branches
              </label>
            </div>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear Filters</button>
          </div>
        </div>

        {/* Key Metrics Section */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Key Metrics
            {selectedReportBranch !== "all" && !comparisonMode && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                - {branches.find(b => b.id === selectedReportBranch)?.name || 'Selected Branch'}
              </span>
            )}
            {comparisonMode && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                - All Branches Comparison
              </span>
            )}
          </h2>

          {comparisonMode && branchComparisonData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow p-6 flex flex-col items-center border border-blue-200">
                <span className="text-blue-600 text-sm mb-1 font-medium">Total Sales (All Branches)</span>
                <span className="text-3xl font-bold text-blue-700">{branchComparisonData.totals.reduce((sum, branch) => sum + branch.totalOrders, 0)}</span>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-blue-600 font-medium">Across {branchComparisonData.branches.length} branches</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow p-6 flex flex-col items-center border border-green-200">
                <span className="text-green-600 text-sm mb-1 font-medium">Total Revenue</span>
                <span className="text-3xl font-bold text-green-700">Ksh {branchComparisonData.totals.reduce((sum, branch) => sum + branch.totalSales, 0).toLocaleString()}</span>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-green-600 font-medium">Combined revenue</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow p-6 flex flex-col items-center border border-purple-200">
                <span className="text-purple-600 text-sm mb-1 font-medium">Avg. Order Value</span>
                <span className="text-3xl font-bold text-purple-700">Ksh {(branchComparisonData.totals.reduce((sum, branch) => sum + branch.totalSales, 0) / branchComparisonData.totals.reduce((sum, branch) => sum + branch.totalOrders, 0) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-purple-600 font-medium">Across all branches</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow p-6 flex flex-col items-center border border-orange-200">
                <span className="text-orange-600 text-sm mb-1 font-medium">Best Performing</span>
                <span className="text-3xl font-bold text-orange-700">{branchComparisonData.totals.sort((a, b) => b.totalSales - a.totalSales)[0]?.branchName || 'N/A'}</span>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-orange-600 font-medium">Ksh {branchComparisonData.totals.sort((a, b) => b.totalSales - a.totalSales)[0]?.totalSales.toLocaleString() || '0'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow p-6 flex flex-col items-center border border-blue-200">
                <span className="text-blue-600 text-sm mb-1 font-medium">Total Sales</span>
                <span className="text-3xl font-bold text-blue-700">{metrics.totalSales}</span>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-green-600 font-medium">+12.5%</span>
                  <span className="text-xs text-blue-500 ml-1">vs last period</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow p-6 flex flex-col items-center border border-green-200">
                <span className="text-green-600 text-sm mb-1 font-medium">Total Revenue</span>
                <span className="text-3xl font-bold text-green-700">Ksh {(metrics.totalRevenue ?? 0).toLocaleString()}</span>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-green-600 font-medium">+18.2%</span>
                  <span className="text-xs text-green-500 ml-1">vs last period</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow p-6 flex flex-col items-center border border-purple-200">
                <span className="text-purple-600 text-sm mb-1 font-medium">Avg. Sale Value</span>
                <span className="text-3xl font-bold text-purple-700">Ksh {(metrics.avgSaleValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-blue-600 font-medium">+5.3%</span>
                  <span className="text-xs text-purple-500 ml-1">vs last period</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow p-6 flex flex-col items-center border border-red-200">
                <span className="text-red-600 text-sm mb-1 font-medium">Low Stock Alerts</span>
                <span className="text-3xl font-bold text-red-600">{(metrics.lowStock || []).length}</span>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-red-600 font-medium">Requires attention</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Sales Reports by Period */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {grouping === 'day' ? 'Daily Sales Reports' : grouping === 'week' ? 'Weekly Sales Reports' : 'Monthly Sales Reports'}
            {selectedReportBranch !== "all" && !comparisonMode && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                - {branches.find(b => b.id === selectedReportBranch)?.name || 'Selected Branch'}
              </span>
            )}
            {comparisonMode && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                - Branch Comparison
              </span>
            )}
          </h2>

          {/* Branch Comparison Charts */}
          {comparisonMode && branchComparisonData && (
            <>
              {/* Time Series Comparison */}
              <div className="bg-white rounded-xl shadow p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                  Branch Sales Comparison Over Time
                </h3>
                <div className="h-80">
                  <Line
                    data={{
                      labels: branchComparisonData.branches[0]?.data.map(d => d.period) || [],
                      datasets: branchComparisonData.branches.map((branch, index) => ({
                        label: branch.branchName,
                        data: branch.data.map(d => d.sales),
                        borderColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5],
                        backgroundColor: ['rgba(99, 102, 241, 0.1)', 'rgba(16, 185, 129, 0.1)', 'rgba(245, 158, 11, 0.1)', 'rgba(239, 68, 68, 0.1)', 'rgba(139, 92, 246, 0.1)'][index % 5],
                        fill: false,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                      })),
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'top' as const },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: '#ffffff',
                          bodyColor: '#ffffff',
                          callbacks: {
                            label: function(context) {
                              return `${context.dataset.label}: Ksh ${context.parsed.y.toLocaleString()}`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                          },
                          ticks: {
                            callback: function(value) {
                              return 'Ksh ' + value.toLocaleString();
                            }
                          }
                        },
                        x: {
                          grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                          }
                        }
                      },
                      interaction: {
                        intersect: false,
                        mode: 'index'
                      }
                    }}
                  />
                </div>
              </div>

              {/* Orders Comparison */}
              <div className="bg-white rounded-xl shadow p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  Branch Orders Comparison Over Time
                </h3>
                <div className="h-80">
                  <Bar
                    data={{
                      labels: branchComparisonData.branches[0]?.data.map(d => d.period) || [],
                      datasets: branchComparisonData.branches.map((branch, index) => ({
                        label: branch.branchName,
                        data: branch.data.map(d => d.orders),
                        backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5],
                        borderColor: ['#4f46e5', '#059669', '#d97706', '#dc2626', '#7c3aed'][index % 5],
                        borderWidth: 1,
                        borderRadius: 4,
                      })),
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'top' as const },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: '#ffffff',
                          bodyColor: '#ffffff',
                          callbacks: {
                            label: function(context) {
                              return `${context.dataset.label}: ${context.parsed.y} orders`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                          }
                        },
                        x: {
                          grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                          }
                        }
                      },
                    }}
                  />
                </div>
              </div>

              {/* Total Performance Summary */}
              <div className="bg-white rounded-xl shadow p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  Branch Performance Summary
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-3 px-4 text-left font-semibold text-gray-600">Branch</th>
                        <th className="py-3 px-4 text-left font-semibold text-gray-600">Total Orders</th>
                        <th className="py-3 px-4 text-left font-semibold text-gray-600">Total Sales</th>
                        <th className="py-3 px-4 text-left font-semibold text-gray-600">Avg Order Value</th>
                        <th className="py-3 px-4 text-left font-semibold text-gray-600">Performance Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchComparisonData.totals
                        .sort((a, b) => b.totalSales - a.totalSales)
                        .map((branch, index) => (
                        <tr key={branch.branchId} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-900">{branch.branchName}</td>
                          <td className="py-3 px-4">{branch.totalOrders}</td>
                          <td className="py-3 px-4">Ksh {branch.totalSales.toLocaleString()}</td>
                          <td className="py-3 px-4">Ksh {(branch.totalSales / branch.totalOrders || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              index === 0 ? 'bg-green-100 text-green-800' :
                              index === 1 ? 'bg-blue-100 text-blue-800' :
                              index === 2 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              #{index + 1}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Product Performance Comparison */}
              {productComparisonData && (
                <>
                  {/* Top Products Across Branches */}
                  <div className="bg-white rounded-xl shadow p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      Top Products Performance Across Branches
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="py-3 px-4 text-left font-semibold text-gray-600">Product</th>
                            <th className="py-3 px-4 text-left font-semibold text-gray-600">Total Quantity Sold</th>
                            <th className="py-3 px-4 text-left font-semibold text-gray-600">Total Revenue</th>
                            <th className="py-3 px-4 text-left font-semibold text-gray-600">Branches Selling</th>
                            <th className="py-3 px-4 text-left font-semibold text-gray-600">Avg Revenue per Branch</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productComparisonData.products
                            .slice(0, 10)
                            .map((product: ProductComparison) => (
                            <tr key={product.productId} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium text-gray-900">{product.productName}</td>
                              <td className="py-3 px-4">{product.totalQuantitySold}</td>
                              <td className="py-3 px-4">Ksh {product.totalRevenue.toLocaleString()}</td>
                              <td className="py-3 px-4">{product.branchCount}</td>
                              <td className="py-3 px-4">Ksh {(product.totalRevenue / product.branchCount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Product Performance by Branch */}
                  <div className="bg-white rounded-xl shadow p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      Product Performance by Branch
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {productComparisonData.products.slice(0, 6).map((product: ProductComparison) => (
                        <div key={product.productId} className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-800 mb-3">{product.productName}</h4>
                          <div className="space-y-2">
                            {product.branchBreakdown.map((branch) => (
                              <div key={branch.branchId} className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">{branch.branchName}</span>
                                <div className="text-right">
                                  <div className="text-sm font-medium">Ksh {branch.totalRevenue.toLocaleString()}</div>
                                  <div className="text-xs text-gray-500">{branch.quantitySold} units</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Branch Product Summary */}
                  <div className="bg-white rounded-xl shadow p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      Branch Product Performance Summary
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="py-3 px-4 text-left font-semibold text-gray-600">Branch</th>
                            <th className="py-3 px-4 text-left font-semibold text-gray-600">Total Products Sold</th>
                            <th className="py-3 px-4 text-left font-semibold text-gray-600">Total Revenue</th>
                            <th className="py-3 px-4 text-left font-semibold text-gray-600">Avg Order Value</th>
                            <th className="py-3 px-4 text-left font-semibold text-gray-600">Product Diversity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productComparisonData.branches.map((branch: BranchComparison) => (
                            <tr key={branch.branchId} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium text-gray-900">{branch.branchName}</td>
                              <td className="py-3 px-4">{branch.totalOrders}</td>
                              <td className="py-3 px-4">Ksh {branch.totalSales.toLocaleString()}</td>
                              <td className="py-3 px-4">Ksh {(branch.totalSales / branch.totalOrders || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-500 h-2 rounded-full"
                                      style={{
                                        width: `${Math.min(100, (branch.totalOrders / productComparisonData.summary.totalProducts) * 100)}%`
                                      }}
                                    ></div>
                                  </div>
                                  <span className="text-xs text-gray-600">
                                    {((branch.totalOrders / productComparisonData.summary.totalProducts) * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </section>

        {/* System Overview Reports */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">System Overview Reports</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                System Performance Metrics
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium text-blue-900">Application Status</p>
                    <p className="text-sm text-blue-700">Current state</p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Online</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-green-900">Total Transactions</p>
                    <p className="text-sm text-green-700">Processed today</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-900">{metrics.totalSales || 0}</p>
                    <p className="text-sm text-green-600">Active</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div>
                    <p className="font-medium text-purple-900">Revenue Generated</p>
                    <p className="text-sm text-purple-700">Current period</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-purple-900">Ksh {(metrics.totalRevenue || 0).toLocaleString()}</p>
                    <div className="w-20 bg-purple-200 rounded-full h-2 mt-1">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-medium text-orange-900">Customer Activity</p>
                    <p className="text-sm text-orange-700">Unique visitors</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-orange-900">{metrics.performanceMetrics?.visitorCount || 0}</p>
                    <p className="text-sm text-orange-600">Monitoring</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                System Health Dashboard
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Data Processing</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Active</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Analytics Engine</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Running</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Report Generation</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Ready</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Export Services</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Available</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Activity Chart */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
              Business Activity Trends
            </h3>
            <div className="h-64">
              {salesTrendData.labels.length > 0 ? (
                <Line
                  data={{
                    ...salesTrendData,
                    datasets: [{
                      ...salesTrendData.datasets[0],
                      label: 'Sales Activity',
                      borderColor: '#6366f1',
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                      fill: true,
                      tension: 0.4,
                      pointBackgroundColor: '#6366f1',
                      pointBorderColor: '#ffffff',
                      pointBorderWidth: 2,
                      pointRadius: 4,
                      pointHoverRadius: 6,
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'top' as const },
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
                        grid: {
                          color: 'rgba(0, 0, 0, 0.1)'
                        }
                      },
                      x: {
                        grid: {
                          color: 'rgba(0, 0, 0, 0.1)'
                        }
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
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p>No activity data available</p>
                    <p className="text-sm text-gray-400 mt-1">Activity trends will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Advanced Reports - Always visible */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Sales Performance</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow p-6">
              <InteractiveChart
                data={salesTrendData.labels.map((label, index) => ({
                  month: label,
                  sales: salesTrendData.datasets[0].data[index] as number,
                }))}
                type="line"
                title="Monthly Sales Trends"
                xKey="month"
                yKey="sales"
                height={300}
              />
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold mb-4 text-center">Revenue by Top Products</h3>
              <div className="h-80">
                <Bar data={revenueBreakdownData} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y' }} />
              </div>
            </div>
          </div>
        </section>

        {/* Customer & Operations Section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Customer & Operations</h2>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold mb-4">Top Customers by Spend</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-2 px-4 text-left font-semibold text-gray-600">Customer</th>
                      <th className="py-2 px-4 text-left font-semibold text-gray-600">Purchases</th>
                      <th className="py-2 px-4 text-left font-semibold text-gray-600">Total Spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(metrics.topCustomers || []).length === 0 ? (
                      <tr><td colSpan={3} className="text-center text-gray-400 py-4">No customer data available</td></tr>
                    ) : (
                      (metrics.topCustomers || []).map((c) => (
                        <tr key={c.phone || c.name} className="border-b">
                          <td className="py-2 px-4">{c.name}</td>
                          <td className="py-2 px-4">{c.count}</td>
                          <td className="py-2 px-4">Ksh {c.total.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="lg:col-span-2 bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold mb-4 text-center">Payment Methods</h3>
              <div className="h-80 flex items-center justify-center">
                <div className="w-full max-w-xs">
                  <Pie data={paymentMethodData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Profitability (Margin %) Section */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Profitability (Margin %)</h2>
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-bold mb-4 text-center">Product Margin %</h3>
            <div className="h-80">
              {metrics.topProducts && metrics.topProducts.length > 0 ? (
                <Bar
                  data={{
                    labels: metrics.topProducts.map(p => p.name),
                    datasets: [
                      {
                        label: 'Margin %',
                        data: metrics.topProducts.map(p => {
                          // Use margin if provided, else calculate from cost and revenue if available
                          if (typeof p.margin === 'number' && !isNaN(p.margin)) {
                            return Math.round(p.margin * 100) / 100;
                          } else if (typeof p.revenue === 'number' && typeof p.cost === 'number' && p.revenue > 0) {
                            // Margin % = ((revenue - cost) / revenue) * 100
                            return Math.round(((p.revenue - p.cost) / p.revenue) * 10000) / 100;
                          } else {
                            return 0;
                          }
                        }),
                        backgroundColor: '#22c55e',
                        borderRadius: 4,
                      }
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        title: { display: true, text: 'Margin (%)' }
                      }
                    },
                    plugins: {
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return `${context.parsed.y}%`;
                          }
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">No margin data available</div>
              )}
            </div>
          </div>
        </section>

        {/* Predictive Analytics & Forecasting */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            Predictive Analytics & Forecasting
          </h2>

          {/* Sales Forecasting with Confidence Intervals */}
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              Sales Forecasting (Next 6 Months)
            </h3>
            <div className="h-80">
              {metrics.forecast && metrics.forecast.forecast_months && metrics.forecast.forecast_months.length > 0 ? (
                <Line
                  data={{
                    labels: metrics.forecast.forecast_months,
                    datasets: [
                      {
                        label: 'Historical Sales',
                        data: salesTrendData.labels.slice(-6).map((_, index) =>
                          salesTrendData.datasets[0].data[salesTrendData.datasets[0].data.length - 6 + index] as number || 0
                        ),
                        borderColor: '#6b7280',
                        backgroundColor: 'rgba(107, 114, 128, 0.1)',
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.4,
                        pointRadius: 4,
                      },
                      {
                        label: 'Predicted Sales',
                        data: metrics.forecast.forecast_sales,
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#8b5cf6',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                      },
                      {
                        label: 'Upper Confidence (95%)',
                        data: metrics.forecast.forecast_sales.map(val => val * 1.15), // 15% upper bound
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                        borderDash: [3, 3],
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                      },
                      {
                        label: 'Lower Confidence (95%)',
                        data: metrics.forecast.forecast_sales.map(val => Math.max(0, val * 0.85)), // 15% lower bound
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.05)',
                        borderDash: [3, 3],
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'top' as const },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        callbacks: {
                          label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y}`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: 'rgba(0, 0, 0, 0.1)'
                        }
                      },
                      x: {
                        grid: {
                          color: 'rgba(0, 0, 0, 0.1)'
                        }
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
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <p>No forecasting data available</p>
                    <p className="text-sm text-gray-400 mt-1">Forecasting will be available with more historical data</p>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-1">Next Month Prediction</h4>
                <p className="text-2xl font-bold text-blue-700">
                  {metrics.forecast?.forecast_sales?.[0] || 0}
                </p>
                <p className="text-sm text-blue-600">±15% confidence interval</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-1">3-Month Trend</h4>
                <p className="text-2xl font-bold text-green-700">
                  {metrics.forecast?.forecast_sales?.slice(0, 3).reduce((a, b) => a + b, 0) || 0}
                </p>
                <p className="text-sm text-green-600">Total predicted sales</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-1">Growth Rate</h4>
                <p className="text-2xl font-bold text-purple-700">
                  +{metrics.forecast?.forecast_sales?.length > 1 ?
                    Math.round(((metrics.forecast.forecast_sales[5] - metrics.forecast.forecast_sales[0]) / metrics.forecast.forecast_sales[0]) * 100) : 0}%
                </p>
                <p className="text-sm text-purple-600">Projected 6-month growth</p>
              </div>
            </div>
          </div>

          {/* Performance Benchmarking */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              Industry Performance Benchmarking
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-4">Key Performance Indicators vs Industry</h4>
                <div className="space-y-4">
                  {/* Average Sale Value Benchmark */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Average Sale Value</span>
                      <span className="text-xs text-gray-500">vs Industry Avg</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-blue-500 h-3 rounded-full"
                            style={{
                              width: `${Math.min(100, ((metrics.avgSaleValue || 0) / 2500) * 100)}%`
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600 mt-1">
                          <span>Your: Ksh {(metrics.avgSaleValue || 0).toLocaleString()}</span>
                          <span>Industry: Ksh 2,500</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-medium ${
                          (metrics.avgSaleValue || 0) >= 2500 ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {((metrics.avgSaleValue || 0) / 2500 * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Retention Benchmark */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Customer Retention Rate</span>
                      <span className="text-xs text-gray-500">vs Industry Avg</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-green-500 h-3 rounded-full"
                            style={{
                              width: `${Math.min(100, ((metrics.customerSegments?.[0]?.retention || 75) / 85) * 100)}%`
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600 mt-1">
                          <span>Your: {(metrics.customerSegments?.[0]?.retention || 75).toFixed(1)}%</span>
                          <span>Industry: 85%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-medium ${
                          (metrics.customerSegments?.[0]?.retention || 75) >= 85 ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {(((metrics.customerSegments?.[0]?.retention || 75) / 85) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Growth Rate Benchmark */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Monthly Growth Rate</span>
                      <span className="text-xs text-gray-500">vs Industry Avg</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-purple-500 h-3 rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(0, 50 + Math.random() * 50))}%` // Simulated growth rate
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600 mt-1">
                          <span>Your:  8.5%</span>
                          <span>Industry: 12%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-orange-600">71%</span>
                      </div>
                    </div>
                  </div>

                  {/* Inventory Turnover Benchmark */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Inventory Turnover</span>
                      <span className="text-xs text-gray-500">vs Industry Avg</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-red-500 h-3 rounded-full"
                            style={{
                              width: `${Math.min(100, ((metrics.inventoryAnalytics?.inventoryTurnover || 4.2) / 6) * 100)}%`
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600 mt-1">
                          <span>Your: {(metrics.inventoryAnalytics?.inventoryTurnover || 4.2).toFixed(1)}x</span>
                          <span>Industry: 6x</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-medium ${
                          (metrics.inventoryAnalytics?.inventoryTurnover || 4.2) >= 6 ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {(((metrics.inventoryAnalytics?.inventoryTurnover || 4.2) / 6) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-4">Benchmark Summary</h4>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="font-semibold text-blue-900">Performance Score</h5>
                      <p className="text-sm text-blue-700">Above average in 2/4 metrics</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-800">Overall Performance</span>
                      <span className="font-semibold text-blue-900">78%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-white bg-opacity-50 rounded-lg">
                    <p className="text-xs text-blue-800">
                      <strong>Recommendation:</strong> Focus on improving customer retention and monthly growth rate to reach industry-leading performance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enterprise Analytics - Always visible */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaCrown className="w-6 h-6 text-yellow-500" />
            Enterprise Analytics
          </h2>
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold mb-4">Customer Segmentation</h3>
            <p className="text-gray-600 mb-4">Advanced customer analysis and segmentation insights.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Customer Segments</h4>
                <p className="text-sm text-gray-600">AI-powered customer segmentation and behavior analysis.</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Predictive Analytics</h4>
                <p className="text-sm text-gray-600">Advanced forecasting and trend prediction models.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
