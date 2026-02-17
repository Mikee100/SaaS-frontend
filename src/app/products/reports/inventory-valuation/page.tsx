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

type ValuationItem = {
  id: string;
  productName: string;
  stock: number;
  costPrice: number;
  sellingPrice: number;
  stockValue: number;
  potentialRevenue: number;
  profitMargin: number;
};

export default function InventoryValuationReportPage() {
  const branchContext = useBranch();
  const selectedBranchId = branchContext?.selectedBranchId;
  const { data: tenantData } = useTenant();
  const [valuationItems, setValuationItems] = useState<ValuationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'high-value' | 'low-margin' | 'high-margin'>('all');

  useEffect(() => {
    const headers = selectedBranchId ? { 'x-branch-id': selectedBranchId } : undefined;
    apiGet("/analytics/inventory-valuation", headers)
      .then((data) => setValuationItems(data as ValuationItem[]))
      .catch((err: unknown) => setError((err as Error).message || "An error occurred while fetching data."))
      .finally(() => setLoading(false));
  }, [selectedBranchId]);

  const filteredItems = valuationItems.filter(item => {
    if (filterType === 'all') return true;
    if (filterType === 'high-value') return item.stockValue > 50000; // High value items
    if (filterType === 'low-margin') return item.profitMargin < 20; // Low margin items
    if (filterType === 'high-margin') return item.profitMargin > 50; // High margin items
    return true;
  });

  const totalStockValue = filteredItems.reduce((sum, item) => sum + item.stockValue, 0);
  const totalPotentialRevenue = filteredItems.reduce((sum, item) => sum + item.potentialRevenue, 0);
  const averageProfitMargin = filteredItems.length > 0 ? filteredItems.reduce((sum, item) => sum + item.profitMargin, 0) / filteredItems.length : 0;

  const valuationData = {
    labels: filteredItems.slice(0, 10).map(item => item.productName.length > 15 ? item.productName.substring(0, 15) + '...' : item.productName),
    datasets: [{
      label: 'Stock Value (Ksh)',
      data: filteredItems.slice(0, 10).map(item => item.stockValue),
      backgroundColor: '#22c55e',
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
    doc.text('Inventory Valuation Report', margin, yPosition + 8);
    yPosition += 18;

    doc.setFontSize(fontSize - 2);
    doc.setTextColor('666666');
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Filter: ${filterType === 'all' ? 'All' : filterType.replace('-', ' ').toUpperCase()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Total Items: ${filteredItems.length}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Total Stock Value: ${currency} ${totalStockValue.toLocaleString()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Average Profit Margin: ${averageProfitMargin.toFixed(1)}%`, margin, yPosition);
    yPosition += 14;

    doc.setFontSize(fontSize);
    doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
    doc.text('Inventory Valuation Details', margin, yPosition);
    yPosition += 10;

    const rows = filteredItems.map((item, i) => [i + 1, item.productName, item.stock, `${currency} ${item.stockValue.toLocaleString()}`, `${item.profitMargin.toFixed(1)}%`]);
    if (rows.length) {
      autoTable(doc, {
        head: [['#', 'Product', 'Stock', `Value (${currency})`, 'Margin %']],
        body: rows,
        startY: yPosition,
        styles: { fontSize: fontSize - 2, cellPadding: 3 },
        headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: secondaryRgb },
        margin: { left: margin, right: margin },
      });
    }

    applyPdfFooterAndPageNumbers(doc, pdfTemplate, 'SaaS POS • Inventory Valuation');
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inventory_valuation_report.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    const excelData = [
      ['Inventory Valuation Report'],
      [],
      ['Filter', filterType === 'all' ? 'All' : filterType.replace('-', ' ').toUpperCase()],
      ['Total Items', filteredItems.length],
      ['Total Stock Value', totalStockValue],
      ['Total Potential Revenue', totalPotentialRevenue],
      ['Average Profit Margin', averageProfitMargin.toFixed(1) + '%'],
      [],
      ['Product', 'Stock', 'Cost Price', 'Selling Price', 'Stock Value', 'Potential Revenue', 'Profit Margin'],
      ...filteredItems.map(item => [
        item.productName,
        item.stock,
        item.costPrice,
        item.sellingPrice,
        item.stockValue,
        item.potentialRevenue,
        item.profitMargin.toFixed(1) + '%'
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Valuation Report');

    XLSX.writeFile(workbook, 'inventory_valuation_report.xlsx');
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
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Inventory Valuation Report</h1>
            <p className="mt-2 text-lg text-gray-500">Shows the financial value of inventory including cost, selling price, and profit margins.</p>
          </div>
        </header>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Key Metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow p-6 flex flex-col items-center border border-blue-200">
              <span className="text-blue-600 text-sm mb-1 font-medium">Total Items</span>
              <span className="text-3xl font-bold text-blue-700">{filteredItems.length}</span>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow p-6 flex flex-col items-center border border-green-200">
              <span className="text-green-600 text-sm mb-1 font-medium">Total Stock Value</span>
              <span className="text-3xl font-bold text-green-700">Ksh {totalStockValue.toLocaleString()}</span>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow p-6 flex flex-col items-center border border-purple-200">
              <span className="text-purple-600 text-sm mb-1 font-medium">Potential Revenue</span>
              <span className="text-3xl font-bold text-purple-700">Ksh {totalPotentialRevenue.toLocaleString()}</span>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow p-6 flex flex-col items-center border border-orange-200">
              <span className="text-orange-600 text-sm mb-1 font-medium">Avg Profit Margin</span>
              <span className="text-3xl font-bold text-orange-700">{averageProfitMargin.toFixed(1)}%</span>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Stock Value by Product (Top 10)</h2>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="h-64">
              <Bar
                data={valuationData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `Stock Value: Ksh ${context.parsed.y.toLocaleString()}`;
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
                  All Items
                </button>
                <button
                  onClick={() => setFilterType('high-value')}
                  className={`px-4 py-2 rounded-lg transition-colors ${filterType === 'high-value' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  High Value ({'>'}50K)
                </button>
                <button
                  onClick={() => setFilterType('low-margin')}
                  className={`px-4 py-2 rounded-lg transition-colors ${filterType === 'low-margin' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Low Margin ({'<'}20%)
                </button>
                <button
                  onClick={() => setFilterType('high-margin')}
                  className={`px-4 py-2 rounded-lg transition-colors ${filterType === 'high-margin' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  High Margin ({'>'}50%)
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
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Detailed Inventory Valuation ({filteredItems.length} items)</h2>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Product</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Stock</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Cost Price</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Selling Price</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Stock Value</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Potential Revenue</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Profit Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2 px-4">{item.productName}</td>
                      <td className="py-2 px-4">{item.stock}</td>
                      <td className="py-2 px-4">Ksh {item.costPrice.toLocaleString()}</td>
                      <td className="py-2 px-4">Ksh {item.sellingPrice.toLocaleString()}</td>
                      <td className="py-2 px-4">Ksh {item.stockValue.toLocaleString()}</td>
                      <td className="py-2 px-4">Ksh {item.potentialRevenue.toLocaleString()}</td>
                      <td className={`py-2 px-4 font-medium ${
                        item.profitMargin < 20 ? 'text-red-600' :
                        item.profitMargin > 50 ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {item.profitMargin.toFixed(1)}%
                      </td>
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
