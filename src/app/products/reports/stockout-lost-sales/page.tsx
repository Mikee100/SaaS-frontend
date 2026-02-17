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
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Stockout & Lost Sales Report</h1>
            <p className="mt-2 text-lg text-gray-500">Shows products that went out of stock and estimates potential lost sales.</p>
          </div>
        </header>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Key Metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow p-6 flex flex-col items-center border border-red-200">
              <span className="text-red-600 text-sm mb-1 font-medium">Total Stockouts</span>
              <span className="text-3xl font-bold text-red-700">{filteredItems.length}</span>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow p-6 flex flex-col items-center border border-orange-200">
              <span className="text-orange-600 text-sm mb-1 font-medium">Total Lost Sales</span>
              <span className="text-3xl font-bold text-orange-700">Ksh {totalLostSales.toLocaleString()}</span>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow p-6 flex flex-col items-center border border-yellow-200">
              <span className="text-yellow-600 text-sm mb-1 font-medium">Avg Days Out</span>
              <span className="text-3xl font-bold text-yellow-700">{averageDaysOutOfStock.toFixed(1)}</span>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow p-6 flex flex-col items-center border border-purple-200">
              <span className="text-purple-600 text-sm mb-1 font-medium">Critical Stockouts</span>
              <span className="text-3xl font-bold text-purple-700">{criticalStockouts.length}</span>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Lost Sales by Product (Top 10)</h2>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="h-64">
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
                          return `Lost Sales: Ksh ${context.parsed.y.toLocaleString()}`;
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
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Filters</h2>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-2 rounded-lg transition-colors ${filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  All Stockouts
                </button>
                <button
                  onClick={() => setFilterType('recent')}
                  className={`px-4 py-2 rounded-lg transition-colors ${filterType === 'recent' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Recent (≤7 days)
                </button>
                <button
                  onClick={() => setFilterType('critical')}
                  className={`px-4 py-2 rounded-lg transition-colors ${filterType === 'critical' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Critical ({'>'}14 days)
                </button>
              </div>
              <div className="flex gap-2 ml-auto">
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
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Detailed Stockout Analysis ({filteredItems.length} items)</h2>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Product</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Stockout Date</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Days Out of Stock</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Estimated Lost Sales</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Last Sale Price</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Reorder Point</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2 px-4">{item.productName}</td>
                      <td className="py-2 px-4">{new Date(item.stockoutDate).toLocaleDateString()}</td>
                      <td className={`py-2 px-4 font-medium ${
                        item.daysOutOfStock <= 7 ? 'text-green-600' :
                        item.daysOutOfStock <= 14 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {item.daysOutOfStock}
                      </td>
                      <td className="py-2 px-4">Ksh {item.estimatedLostSales.toLocaleString()}</td>
                      <td className="py-2 px-4">Ksh {item.lastSalePrice.toLocaleString()}</td>
                      <td className="py-2 px-4">{item.reorderPoint}</td>
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
