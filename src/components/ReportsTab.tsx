"use client";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/utils/api';
import { 
  FaChartLine, 
  FaChartBar, 
  FaDownload, 
  FaShoppingCart, 
  FaUser, 
  FaWarehouse, 
  FaMoneyBillWave, 
  FaCalendarAlt, 
  FaFilter,
  FaFileExcel,
  FaFilePdf,
  FaFileCsv
} from 'react-icons/fa';
import { useBranches } from '@/hooks/useBranches';
import { useTenant } from '@/hooks/useTenant';
import {
  getPdfDocOptions,
  getPdfMargin,
  getPdfFontSize,
  applyPdfBusinessHeader,
  applyPdfFooterAndPageNumbers,
  getPdfTableColors,
  type PdfTemplate,
  preparePdfWatermark,
} from '@/utils/pdfTemplate';
import { getFullAssetUrl } from '@/utils/logoUrl';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ReportsTabProps {
  basicData?: any;
  advancedData?: any;
  user?: any;
}

type ReportType = 'sales' | 'products' | 'customers' | 'inventory' | 'financial';
type DateRange = '7d' | '30d' | '90d' | '6m' | '1y' | 'custom';

export default function ReportsTab({ basicData, advancedData, user }: ReportsTabProps) {
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('sales');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const { data: branches = [] } = useBranches();
  const { data: tenantData } = useTenant();

  // Calculate date range
  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (dateRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '6m':
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            startDate: new Date(customStartDate),
            endDate: new Date(customEndDate),
          };
        }
        break;
    }
    
    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  // Fetch sales report data
  const { data: salesReportData, isLoading: salesLoading } = useQuery({
    queryKey: ['reports', 'sales', selectedBranchId, dateRange, customStartDate, customEndDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('timeRange', dateRange === 'custom' ? 'custom' : dateRange);
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        params.append('startDate', customStartDate);
        params.append('endDate', customEndDate);
      }
      if (selectedBranchId !== 'all') {
        params.append('branchId', selectedBranchId);
      }
      
      const url = user?.tenantId 
        ? `/api/reports/branches/${user.tenantId}/sales?${params.toString()}`
        : `/analytics/basic`;
      return apiGet(url);
    },
    enabled: selectedReportType === 'sales',
    staleTime: 2 * 60 * 1000,
  });

  // Fetch products report data
  const { data: productsReportData, isLoading: productsLoading } = useQuery({
    queryKey: ['reports', 'products', selectedBranchId, dateRange],
    queryFn: async () => {
      // Use top products from basic analytics
      return {
        topProducts: basicData?.topProducts || [],
        totalProducts: basicData?.totalProducts || 0,
      };
    },
    enabled: selectedReportType === 'products',
    staleTime: 2 * 60 * 1000,
  });

  // Fetch customers report data
  const { data: customersReportData, isLoading: customersLoading } = useQuery({
    queryKey: ['reports', 'customers', dateRange],
    queryFn: async () => {
      return {
        totalCustomers: basicData?.totalCustomers || 0,
        customerRetention: basicData?.customerRetention || 0,
        averageOrderValue: basicData?.averageOrderValue || 0,
      };
    },
    enabled: selectedReportType === 'customers',
    staleTime: 2 * 60 * 1000,
  });

  // Fetch inventory report data
  const { data: inventoryReportData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['reports', 'inventory', selectedBranchId],
    queryFn: async () => {
      return advancedData?.inventoryAnalytics || {
        lowStockItems: 0,
        overstockItems: 0,
        inventoryTurnover: 0,
        stockoutRate: 0,
        totalStockValue: 0,
      };
    },
    enabled: selectedReportType === 'inventory',
    staleTime: 2 * 60 * 1000,
  });

  // Fetch financial report data
  const { data: financialReportData, isLoading: financialLoading } = useQuery({
    queryKey: ['reports', 'financial', selectedBranchId, dateRange],
    queryFn: async () => {
      return {
        totalRevenue: basicData?.totalRevenue || 0,
        totalSales: basicData?.totalSales || 0,
        revenueGrowth: basicData?.revenueGrowth || 0,
        salesGrowth: basicData?.salesGrowth || 0,
        averageOrderValue: basicData?.averageOrderValue || 0,
        performanceMetrics: advancedData?.performanceMetrics || {},
      };
    },
    enabled: selectedReportType === 'financial',
    staleTime: 2 * 60 * 1000,
  });

  const isLoading = salesLoading || productsLoading || customersLoading || inventoryLoading || financialLoading;

  // Export functions — use tenant PDF template
  const exportToPDF = async () => {
    const pdfTemplate = (tenantData?.pdfTemplate || {}) as PdfTemplate;
    const margin = getPdfMargin(pdfTemplate);
    const fontSize = getPdfFontSize(pdfTemplate);
    const { primaryRgb, secondaryRgb } = getPdfTableColors(pdfTemplate);

    const doc = new jsPDF(getPdfDocOptions(pdfTemplate));
    await preparePdfWatermark(doc, getFullAssetUrl(tenantData?.watermark as string | null | undefined));
    let yPosition = applyPdfBusinessHeader(doc, tenantData, pdfTemplate, margin);

    const reportTitle = `${selectedReportType.charAt(0).toUpperCase() + selectedReportType.slice(1)} Report`;
    doc.setFontSize(fontSize + 4);
    doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
    doc.text(reportTitle, margin, yPosition + 8);
    yPosition += 16;

    doc.setFontSize(fontSize - 2);
    doc.setTextColor('666666');
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Date Range: ${dateRange}`, margin, yPosition);
    yPosition += 6;
    if (selectedBranchId !== 'all') {
      const branch = branches.find((b: { id: string; name: string }) => b.id === selectedBranchId);
      doc.text(`Branch: ${branch?.name || 'N/A'}`, margin, yPosition);
      yPosition += 6;
    }
    yPosition += 10;

    const reportData = getCurrentReportData();
    if (reportData && typeof reportData === 'object' && !Array.isArray(reportData)) {
      const rows = Object.entries(reportData).map(([key, value]) => [
        key,
        typeof value === 'object' ? JSON.stringify(value) : String(value),
      ]);
      autoTable(doc, {
        head: [['Metric', 'Value']],
        body: rows,
        startY: yPosition,
        styles: { fontSize: fontSize - 2, cellPadding: 3 },
        headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: secondaryRgb },
        margin: { left: margin, right: margin },
      });
      yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    } else if (reportData) {
      doc.setFontSize(fontSize - 2);
      doc.setTextColor('333333');
      doc.text(String(reportData), margin, yPosition);
    }

    applyPdfFooterAndPageNumbers(doc, pdfTemplate, 'SaaS POS • Reports');
    doc.save(`${selectedReportType}-report-${Date.now()}.pdf`);
  };

  const exportToExcel = () => {
    const reportData = getCurrentReportData();
    if (!reportData) return;

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet([reportData]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report Data');
    XLSX.writeFile(workbook, `${selectedReportType}-report-${Date.now()}.xlsx`);
  };

  const exportToCSV = () => {
    const reportData = getCurrentReportData();
    if (!reportData) return;

    const csv = Object.entries(reportData)
      .map(([key, value]) => `${key},${typeof value === 'object' ? JSON.stringify(value) : value}`)
      .join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedReportType}-report-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getCurrentReportData = () => {
    switch (selectedReportType) {
      case 'sales':
        return salesReportData;
      case 'products':
        return productsReportData;
      case 'customers':
        return customersReportData;
      case 'inventory':
        return inventoryReportData;
      case 'financial':
        return financialReportData;
      default:
        return null;
    }
  };

  const renderSalesReport = () => {
    const data = salesReportData as any;
    if (!data) return null;

    return (
      <div className="space-y-3">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-white rounded border border-gray-200 p-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-600">Total Orders</h3>
              <FaShoppingCart className="w-3 h-3 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-900">{data.totalOrders || 0}</p>
          </div>
          <div className="bg-white rounded border border-gray-200 p-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-600">Total Sales</h3>
              <FaMoneyBillWave className="w-3 h-3 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Ksh {(data.totalSales || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded border border-gray-200 p-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-600">Avg Order Value</h3>
              <FaChartLine className="w-3 h-3 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Ksh {(data.averageOrderValue || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded border border-gray-200 p-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-600">Top Products</h3>
              <FaChartBar className="w-3 h-3 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-900">{data.topProducts?.length || 0}</p>
          </div>
        </div>

        {/* Sales Trend Chart */}
        {data.salesTrend && data.salesTrend.length > 0 && (
          <div className="bg-white rounded border border-gray-200 p-3">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Sales Trend</h3>
            <div className="h-64 flex items-end justify-between gap-1">
              {data.salesTrend.map((item: any, index: number) => {
                const maxSales = Math.max(...data.salesTrend.map((i: any) => i.sales || 0), 1);
                const height = ((item.sales || 0) / maxSales) * 240;
                return (
                  <div key={index} className="flex flex-col items-center flex-1 group">
                    <div
                      className="w-full bg-slate-500 rounded-t mb-2 transition-all hover:bg-slate-600 cursor-pointer relative"
                      style={{ height: `${height}px` }}
                      title={`${item.date}: Ksh ${(item.sales || 0).toLocaleString()}`}
                    >
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        Ksh {(item.sales || 0).toLocaleString()}
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-gray-600 text-center">{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Products */}
        {data.topProducts && data.topProducts.length > 0 && (
          <div className="bg-white rounded border border-gray-200 p-3">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Top Products</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-700">Product</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-700">Quantity Sold</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-700">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProducts.map((product: any, index: number) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-xs text-gray-900">{product.productName || 'Unknown'}</td>
                      <td className="py-2 px-3 text-xs text-gray-600 text-right">{product.quantitySold || 0}</td>
                      <td className="py-2 px-3 text-xs font-medium text-gray-900 text-right">Ksh {(product.totalRevenue || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payment Methods */}
        {data.paymentMethods && data.paymentMethods.length > 0 && (
          <div className="bg-white rounded border border-gray-200 p-3">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Payment Methods</h3>
            <div className="space-y-3">
              {data.paymentMethods.map((method: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="text-xs font-medium text-gray-900">{method.method || 'Unknown'}</p>
                    <p className="text-[11px] text-gray-600">{method.count || 0} transactions</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">Ksh {(method.amount || 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderProductsReport = () => {
    const data = productsReportData as any;
    if (!data) return null;

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="bg-white rounded border border-gray-200 p-2">
            <h3 className="text-xs font-medium text-gray-600 mb-1">Total Products</h3>
            <p className="text-sm font-semibold text-gray-900">{data.totalProducts || 0}</p>
          </div>
          <div className="bg-white rounded border border-gray-200 p-2">
            <h3 className="text-xs font-medium text-gray-600 mb-1">Top Selling Products</h3>
            <p className="text-sm font-semibold text-gray-900">{data.topProducts?.length || 0}</p>
          </div>
          <div className="bg-white rounded border border-gray-200 p-2">
            <h3 className="text-xs font-medium text-gray-600 mb-1">Total Revenue</h3>
            <p className="text-sm font-semibold text-gray-900">
              Ksh {data.topProducts?.reduce((sum: number, p: any) => sum + (p.revenue || 0), 0).toLocaleString() || '0'}
            </p>
          </div>
        </div>

        {data.topProducts && data.topProducts.length > 0 && (
          <div className="bg-white rounded border border-gray-200 p-3">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Top Products Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-700">Product</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-700">Sales</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-700">Revenue</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-700">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProducts.map((product: any, index: number) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-xs text-gray-900">{product.name || 'Unknown'}</td>
                      <td className="py-2 px-3 text-xs text-gray-600 text-right">{product.sales || 0}</td>
                      <td className="py-2 px-3 text-xs font-medium text-gray-900 text-right">Ksh {(product.revenue || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 text-xs text-gray-600 text-right">{((product.margin || 0) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCustomersReport = () => {
    const data = customersReportData as any;
    if (!data) return null;

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="bg-white rounded border border-gray-200 p-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-600">Total Customers</h3>
              <FaUser className="w-3 h-3 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-900">{(data.totalCustomers || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded border border-gray-200 p-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-600">Customer Retention</h3>
              <FaChartLine className="w-3 h-3 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-900">{(data.customerRetention || 0).toFixed(1)}%</p>
          </div>
          <div className="bg-white rounded border border-gray-200 p-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-600">Avg Order Value</h3>
              <FaMoneyBillWave className="w-3 h-3 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Ksh {(data.averageOrderValue || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderInventoryReport = () => {
    const data = inventoryReportData as any;
    if (!data) return null;

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div className="bg-white rounded border border-gray-200 p-2">
            <h3 className="text-xs font-medium text-gray-600 mb-1">Low Stock Items</h3>
            <p className="text-sm font-semibold text-gray-900">{data.lowStockItems || 0}</p>
          </div>
          <div className="bg-white rounded border border-gray-200 p-2">
            <h3 className="text-xs font-medium text-gray-600 mb-1">Overstock Items</h3>
            <p className="text-sm font-semibold text-gray-900">{data.overstockItems || 0}</p>
          </div>
          <div className="bg-white rounded border border-gray-200 p-2">
            <h3 className="text-xs font-medium text-gray-600 mb-1">Inventory Turnover</h3>
            <p className="text-sm font-semibold text-gray-900">{(data.inventoryTurnover || 0).toFixed(2)}</p>
          </div>
          <div className="bg-white rounded border border-gray-200 p-2">
            <h3 className="text-xs font-medium text-gray-600 mb-1">Stockout Rate</h3>
            <p className="text-sm font-semibold text-gray-900">{((data.stockoutRate || 0) * 100).toFixed(1)}%</p>
          </div>
          <div className="bg-white rounded border border-gray-200 p-2">
            <h3 className="text-xs font-medium text-gray-600 mb-1">Total Stock Value</h3>
            <p className="text-sm font-semibold text-gray-900">Ksh {(data.totalStockValue || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderFinancialReport = () => {
    const data = financialReportData as any;
    if (!data) return null;

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-white rounded border border-gray-200 p-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-600">Total Revenue</h3>
              <FaMoneyBillWave className="w-3 h-3 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Ksh {(data.totalRevenue || 0).toLocaleString()}</p>
            {data.revenueGrowth !== undefined && (
              <p className={`text-xs mt-1 ${data.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.revenueGrowth >= 0 ? '+' : ''}{data.revenueGrowth.toFixed(1)}%
              </p>
            )}
          </div>
          <div className="bg-white rounded border border-gray-200 p-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-600">Total Sales</h3>
              <FaShoppingCart className="w-3 h-3 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-900">{(data.totalSales || 0).toLocaleString()}</p>
            {data.salesGrowth !== undefined && (
              <p className={`text-xs mt-1 ${data.salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.salesGrowth >= 0 ? '+' : ''}{data.salesGrowth.toFixed(1)}%
              </p>
            )}
          </div>
          <div className="bg-white rounded border border-gray-200 p-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-600">Avg Order Value</h3>
              <FaChartLine className="w-3 h-3 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Ksh {(data.averageOrderValue || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded border border-gray-200 p-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-600">ROI</h3>
              <FaChartBar className="w-3 h-3 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {data.performanceMetrics?.returnOnInvestment 
                ? `${(data.performanceMetrics.returnOnInvestment * 100).toFixed(1)}%`
                : 'N/A'}
            </p>
          </div>
        </div>

        {data.performanceMetrics && (
          <div className="bg-white rounded border border-gray-200 p-3">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Performance Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="p-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-600 mb-1">Customer Lifetime Value</p>
                <p className="text-sm font-semibold text-gray-900">Ksh {(data.performanceMetrics.customerLifetimeValue || 0).toLocaleString()}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-600 mb-1">Customer Acquisition Cost</p>
                <p className="text-sm font-semibold text-gray-900">Ksh {(data.performanceMetrics.customerAcquisitionCost || 0).toLocaleString()}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-600 mb-1">Return on Investment</p>
                <p className="text-sm font-semibold text-gray-900">{(data.performanceMetrics.returnOnInvestment || 0).toFixed(2)}x</p>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-600 mb-1">Net Promoter Score</p>
                <p className="text-sm font-semibold text-gray-900">{data.performanceMetrics.netPromoterScore || 0}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReportContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    switch (selectedReportType) {
      case 'sales':
        return renderSalesReport();
      case 'products':
        return renderProductsReport();
      case 'customers':
        return renderCustomersReport();
      case 'inventory':
        return renderInventoryReport();
      case 'financial':
        return renderFinancialReport();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Reports</h2>
          <p className="text-[11px] text-gray-500 mt-1">Generate and export business reports</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToPDF}
            className="px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-800 flex items-center gap-1.5 text-xs"
          >
            <FaFilePdf className="w-3 h-3" />
            PDF
          </button>
          <button
            onClick={exportToExcel}
            className="px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-800 flex items-center gap-1.5 text-xs"
          >
            <FaFileExcel className="w-3 h-3" />
            Excel
          </button>
          <button
            onClick={exportToCSV}
            className="px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-800 flex items-center gap-1.5 text-xs"
          >
            <FaFileCsv className="w-3 h-3" />
            CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded border border-gray-200 p-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Report Type Selector */}
          <div className="flex items-center gap-2">
            <FaFilter className="w-3 h-3 text-gray-500" />
            <select
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value as ReportType)}
              className="px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 text-xs"
            >
              <option value="sales">Sales Report</option>
              <option value="products">Products Report</option>
              <option value="customers">Customers Report</option>
              <option value="inventory">Inventory Report</option>
              <option value="financial">Financial Report</option>
            </select>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="w-3 h-3 text-gray-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 text-xs"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="6m">Last 6 Months</option>
              <option value="1y">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {dateRange === 'custom' && (
            <>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 text-xs"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 text-xs"
              />
            </>
          )}

          {/* Branch Selector */}
          {branches.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 text-xs"
              >
                <option value="all">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white rounded border border-gray-200 p-2">
        {renderReportContent()}
      </div>
    </div>
  );
}
