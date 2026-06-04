"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";
import { Bar } from "react-chartjs-2";
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
  preparePdfWatermark,
} from '@/utils/pdfTemplate';
import { getFullAssetUrl } from '@/utils/logoUrl';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { FaFilePdf, FaFileExcel } from "react-icons/fa";
import { useBranch } from "@/contexts/BranchContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

type StockoutItem = {
  id: string;
  productName: string;
  stockoutDate: string;
  daysOutOfStock: number;
  estimatedLostSales: number;
  lastSalePrice: number;
  reorderPoint: number;
};

export default function StockoutLostSalesReportPage() {
  const branchContext = useBranch();
  const selectedBranchId = branchContext?.selectedBranchId;
  const { data: tenantData } = useTenant();
  const [stockoutItems, setStockoutItems] = useState<StockoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'recent' | 'critical'>('all');

  useEffect(() => {
    const headers = selectedBranchId ? { 'x-branch-id': selectedBranchId } : undefined;
    apiGet("/analytics/stockout-lost-sales", headers)
      .then((data) => setStockoutItems(data as StockoutItem[]))
      .catch((err: unknown) => setError((err as Error).message || "An error occurred while fetching data."))
      .finally(() => setLoading(false));
  }, [selectedBranchId]);

  const filteredItems = stockoutItems.filter(item => {
    if (filterType === 'all') return true;
    if (filterType === 'recent') return item.daysOutOfStock <= 7;
    if (filterType === 'critical') return item.daysOutOfStock > 14;
    return true;
  });

  const totalLostSales = filteredItems.reduce((sum, item) => sum + item.estimatedLostSales, 0);
  const averageDaysOutOfStock = filteredItems.length > 0 ? filteredItems.reduce((sum, item) => sum + item.daysOutOfStock, 0) / filteredItems.length : 0;
  const criticalStockouts = filteredItems.filter(item => item.daysOutOfStock > 14);
 
  const stockoutData = {
    labels: filteredItems.slice(0, 10).map(item => item.productName.length > 15 ? item.productName.substring(0, 15) + '...' : item.productName),
    datasets: [{
      label: 'Estimated Lost Sales (Ksh)',
      data: filteredItems.slice(0, 10).map(item => item.estimatedLostSales),
      backgroundColor: '#ef4444',
      borderRadius: 4,
    }],
  };

  const exportToPDF = async () => {
    const pdfTemplate = (tenantData?.pdfTemplate || {}) as PdfTemplate;
    const currency = getPdfCurrency(tenantData, pdfTemplate);
    const margin = getPdfMargin(pdfTemplate);
    const fontSize = getPdfFontSize(pdfTemplate);
    const { primaryRgb, secondaryRgb } = getPdfTableColors(pdfTemplate);

    const doc = new jsPDF(getPdfDocOptions(pdfTemplate));
    await preparePdfWatermark(doc, getFullAssetUrl(tenantData?.watermark as string | null | undefined));
    let yPosition = applyPdfBusinessHeader(doc, tenantData, pdfTemplate, margin);

    doc.setFontSize(fontSize + 4);
    doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
    doc.text('Stockout & Lost Sales Report', margin, yPosition + 8);
    yPosition += 18;

    doc.setFontSize(fontSize - 2);
    doc.setTextColor('666666');
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Filter: ${filterType === 'all' ? 'All' : filterType === 'recent' ? 'Recent (≤7 days)' : 'Critical (>14 days)'}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Total Stockouts: ${filteredItems.length}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Total Estimated Lost Sales: ${currency} ${totalLostSales.toLocaleString()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Average Days Out of Stock: ${averageDaysOutOfStock.toFixed(1)}`, margin, yPosition);
    yPosition += 14;

    doc.setFontSize(fontSize);
    doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
    doc.text('Stockout Details', margin, yPosition);
    yPosition += 10;

    const rows = filteredItems.map((item, i) => [i + 1, item.productName, item.daysOutOfStock, `${currency} ${item.estimatedLostSales.toLocaleString()}`, `${currency} ${item.lastSalePrice.toLocaleString()}`]);
    if (rows.length) {
      autoTable(doc, {
        head: [['#', 'Product', 'Days Out', `Lost Sales (${currency})`, `Last Price (${currency})`]],
        body: rows,
        startY: yPosition,
        styles: { fontSize: fontSize - 2, cellPadding: 3 },
        headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: secondaryRgb },
        margin: { left: margin, right: margin },
      });
    }

    applyPdfFooterAndPageNumbers(doc, pdfTemplate, 'SaaS POS • Stockout');
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'stockout_lost_sales_report.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    const excelData = [
      ['Stockout & Lost Sales Report'],
      [],
      ['Filter', filterType === 'all' ? 'All' : filterType === 'recent' ? 'Recent (≤7 days)' : 'Critical (>14 days)'],
      ['Total Stockouts', filteredItems.length],
      ['Total Estimated Lost Sales', totalLostSales],
      ['Average Days Out of Stock', averageDaysOutOfStock.toFixed(1)],
      [],
      ['Product', 'Stockout Date', 'Days Out of Stock', 'Estimated Lost Sales', 'Last Sale Price', 'Reorder Point'],
      ...filteredItems.map(item => [
        item.productName,
        new Date(item.stockoutDate).toLocaleDateString(),
        item.daysOutOfStock,
        item.estimatedLostSales,
        item.lastSalePrice,
        item.reorderPoint
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stockout Report');

    XLSX.writeFile(workbook, 'stockout_lost_sales_report.xlsx');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-75">
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
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-md border border-gray-200 bg-white p-3">
          <h1 className="text-lg font-semibold text-gray-900">Stockout & Lost Sales Report</h1>
          <p className="mt-1 text-xs text-gray-600">Products that are out of stock and estimated lost sales impact.</p>
        </header>

        <section className="rounded-md border border-gray-200 bg-white p-3">
          <h2 className="mb-2 text-sm font-semibold text-gray-800">Summary</h2>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
              <p className="text-[11px] text-gray-500">Total Stockouts</p>
              <p className="font-semibold text-gray-900">{filteredItems.length}</p>
            </div>
            <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
              <p className="text-[11px] text-gray-500">Lost Sales</p>
              <p className="font-semibold text-gray-900">Ksh {totalLostSales.toLocaleString()}</p>
            </div>
            <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
              <p className="text-[11px] text-gray-500">Avg Days Out</p>
              <p className="font-semibold text-gray-900">{averageDaysOutOfStock.toFixed(1)}</p>
            </div>
            <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
              <p className="text-[11px] text-gray-500">Critical</p>
              <p className="font-semibold text-gray-900">{criticalStockouts.length}</p>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-gray-200 bg-white p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-800">Filters</h2>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilterType('all')}
                className={`rounded border px-2 py-1 text-xs transition-colors ${filterType === 'all' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('recent')}
                className={`rounded border px-2 py-1 text-xs transition-colors ${filterType === 'recent' ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Recent ({'<='}7d)
              </button>
              <button
                onClick={() => setFilterType('critical')}
                className={`rounded border px-2 py-1 text-xs transition-colors ${filterType === 'critical' ? 'border-red-600 bg-red-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Critical ({'>'}14d)
              </button>
            </div>
            <div className="ml-auto flex gap-1.5">
              <button
                onClick={exportToPDF}
                className="inline-flex items-center gap-1 rounded border border-red-600 bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
              >
                <FaFilePdf /> PDF
              </button>
              <button
                onClick={exportToExcel}
                className="inline-flex items-center gap-1 rounded border border-green-600 bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
              >
                <FaFileExcel /> Excel
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-gray-200 bg-white p-3">
          <h2 className="mb-2 text-sm font-semibold text-gray-800">Lost Sales by Product (Top 10)</h2>
          <div className="h-56">
              <Bar
                data={stockoutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `Lost Sales: Ksh ${Number(context.parsed.y ?? 0).toLocaleString()}`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: 'rgba(0, 0, 0, 0.1)' },
                      ticks: {
                        callback: function(value) {
                          return 'Ksh ' + value.toLocaleString();
                        }
                      }
                    },
                    x: {
                      grid: { color: 'rgba(0, 0, 0, 0.1)' }
                    }
                  }
                }}
              />
          </div>
        </section>

        <section className="rounded-md border border-gray-200 bg-white p-3">
          <h2 className="mb-2 text-sm font-semibold text-gray-800">Detailed Stockout Analysis ({filteredItems.length})</h2>
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold text-gray-600">Product</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-gray-600">Stockout Date</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-gray-600">Days Out</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-gray-600">Lost Sales</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-gray-600">Last Price</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-gray-600">Reorder</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-2 py-1.5">{item.productName}</td>
                      <td className="px-2 py-1.5">{new Date(item.stockoutDate).toLocaleDateString()}</td>
                      <td className={`px-2 py-1.5 font-medium ${
                        item.daysOutOfStock <= 7 ? 'text-green-600' :
                        item.daysOutOfStock <= 14 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {item.daysOutOfStock}
                      </td>
                      <td className="px-2 py-1.5">Ksh {item.estimatedLostSales.toLocaleString()}</td>
                      <td className="px-2 py-1.5">Ksh {item.lastSalePrice.toLocaleString()}</td>
                      <td className="px-2 py-1.5">{item.reorderPoint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
