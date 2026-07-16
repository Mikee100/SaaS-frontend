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

type CategoryItem = {
  categoryId: string;
  categoryName: string;
  revenue: number;
  unitsSold: number;
  marginPct: number;
  stockValue: number;
};

export default function ProductCategoryAnalysisReportPage() {
  const branchContext = useBranch();
  const selectedBranchId = branchContext?.selectedBranchId;
  const { data: tenantData } = useTenant();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const headers = selectedBranchId ? { 'x-branch-id': selectedBranchId } : undefined;
    apiGet("/analytics/product-category-analysis", headers)
      .then((data) => setCategories(data as CategoryItem[]))
      .catch((err: unknown) => setError((err as Error).message || "An error occurred while fetching data."))
      .finally(() => setLoading(false));
  }, [selectedBranchId]);

  const totalRevenue = categories.reduce((sum, c) => sum + c.revenue, 0);
  const totalUnitsSold = categories.reduce((sum, c) => sum + c.unitsSold, 0);
  const totalStockValue = categories.reduce((sum, c) => sum + c.stockValue, 0);
  const averageMargin = categories.length > 0
    ? categories.reduce((sum, c) => sum + c.marginPct, 0) / categories.length
    : 0;

  const revenueChartData = {
    labels: categories.slice(0, 10).map(c => c.categoryName.length > 15 ? c.categoryName.substring(0, 15) + '...' : c.categoryName),
    datasets: [{
      label: 'Revenue (Ksh)',
      data: categories.slice(0, 10).map(c => c.revenue),
      backgroundColor: '#3b82f6',
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
    doc.text('Product Category Analysis Report', margin, yPosition + 8);
    yPosition += 18;

    doc.setFontSize(fontSize - 2);
    doc.setTextColor('666666');
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Total Categories: ${categories.length}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Total Revenue: ${currency} ${totalRevenue.toLocaleString()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Average Margin: ${averageMargin.toFixed(1)}%`, margin, yPosition);
    yPosition += 14;

    doc.setFontSize(fontSize);
    doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
    doc.text('Category Details', margin, yPosition);
    yPosition += 10;

    const rows = categories.map((c, i) => [
      i + 1,
      c.categoryName,
      c.unitsSold,
      `${currency} ${c.revenue.toLocaleString()}`,
      `${c.marginPct.toFixed(1)}%`,
    ]);
    if (rows.length) {
      autoTable(doc, {
        head: [['#', 'Category', 'Units Sold', `Revenue (${currency})`, 'Margin %']],
        body: rows,
        startY: yPosition,
        styles: { fontSize: fontSize - 2, cellPadding: 3 },
        headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: secondaryRgb },
        margin: { left: margin, right: margin },
      });
    }

    applyPdfFooterAndPageNumbers(doc, pdfTemplate, 'SaaS POS • Product Category Analysis');
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'product_category_analysis_report.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    const excelData = [
      ['Product Category Analysis Report'],
      [],
      ['Total Categories', categories.length],
      ['Total Revenue', totalRevenue],
      ['Total Units Sold', totalUnitsSold],
      ['Total Stock Value', totalStockValue],
      ['Average Margin', averageMargin.toFixed(1) + '%'],
      [],
      ['Category', 'Units Sold', 'Revenue', 'Margin %', 'Stock Value'],
      ...categories.map(c => [
        c.categoryName,
        c.unitsSold,
        c.revenue,
        c.marginPct.toFixed(1) + '%',
        c.stockValue,
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Category Analysis');

    XLSX.writeFile(workbook, 'product_category_analysis_report.xlsx');
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Product Category Analysis</h1>
              <p className="mt-2 text-lg text-gray-500">Revenue, units sold, and margin performance broken down by product category.</p>
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

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Key Metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow p-6 flex flex-col items-center border border-blue-200">
              <span className="text-blue-600 text-sm mb-1 font-medium">Categories</span>
              <span className="text-3xl font-bold text-blue-700">{categories.length}</span>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow p-6 flex flex-col items-center border border-green-200">
              <span className="text-green-600 text-sm mb-1 font-medium">Total Revenue</span>
              <span className="text-3xl font-bold text-green-700">Ksh {totalRevenue.toLocaleString()}</span>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow p-6 flex flex-col items-center border border-purple-200">
              <span className="text-purple-600 text-sm mb-1 font-medium">Units Sold</span>
              <span className="text-3xl font-bold text-purple-700">{totalUnitsSold.toLocaleString()}</span>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow p-6 flex flex-col items-center border border-orange-200">
              <span className="text-orange-600 text-sm mb-1 font-medium">Avg Margin</span>
              <span className="text-3xl font-bold text-orange-700">{averageMargin.toFixed(1)}%</span>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Revenue by Category (Top 10)</h2>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="h-64">
              <Bar
                data={revenueChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `Revenue: Ksh ${Number(context.parsed.y ?? 0).toLocaleString()}`;
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

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Category Details ({categories.length})</h2>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Category</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Units Sold</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Revenue</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Margin</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Stock Value</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.categoryId} className="border-b">
                      <td className="py-2 px-4">{c.categoryName}</td>
                      <td className="py-2 px-4">{c.unitsSold}</td>
                      <td className="py-2 px-4">Ksh {c.revenue.toLocaleString()}</td>
                      <td className={`py-2 px-4 font-medium ${
                        c.marginPct < 20 ? 'text-red-600' :
                        c.marginPct > 50 ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {c.marginPct.toFixed(1)}%
                      </td>
                      <td className="py-2 px-4">Ksh {c.stockValue.toLocaleString()}</td>
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
