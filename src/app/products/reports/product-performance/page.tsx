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
} from '@/utils/pdfTemplate';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

type TopProduct = { id: string; name: string; unitsSold: number; revenue: number; margin?: number; cost?: number };

type Metrics = {
  topProducts: TopProduct[];
};

export default function ProductPerformanceReportPage() {

  const [metrics, setMetrics] = useState<Metrics>({ topProducts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet(`/analytics/dashboard`)
      .then((data) => setMetrics(data as Metrics))
      .catch((err: unknown) => setError((err as Error).message || "An error occurred while fetching data."))
      .finally(() => setLoading(false));
  }, []);

  const marginData = {
    labels: (metrics.topProducts || []).map(p => p.name),
    datasets: [{
      label: 'Margin %',
      data: (metrics.topProducts || []).map(p => {
        if (typeof p.margin === 'number' && !isNaN(p.margin)) {
          return Math.round(p.margin * 100) / 100;
        } else if (typeof p.revenue === 'number' && typeof p.cost === 'number' && p.revenue > 0) {
          return Math.round(((p.revenue - p.cost) / p.revenue) * 10000) / 100;
        } else {
          return 0;
        }
      }),
      backgroundColor: '#22c55e',
      borderRadius: 4,
    }],
  };

  const exportToPDF = () => {
    const pdfTemplate = (tenantData?.pdfTemplate || {}) as PdfTemplate;
    const currency = getPdfCurrency(tenantData, pdfTemplate);
    const margin = getPdfMargin(pdfTemplate);
    const fontSize = getPdfFontSize(pdfTemplate);
    const { primaryRgb, secondaryRgb } = getPdfTableColors(pdfTemplate);

    const doc = new jsPDF(getPdfDocOptions(pdfTemplate));
    let yPosition = applyPdfBusinessHeader(doc, tenantData, pdfTemplate, margin);

    doc.setFontSize(fontSize + 4);
    doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
    doc.text('Product Performance Analysis Report', margin, yPosition + 8);
    yPosition += 18;

    doc.setFontSize(fontSize - 2);
    doc.setTextColor('666666');
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 8;
    doc.text(`Total Products Analyzed: ${(metrics.topProducts || []).length}`, margin, yPosition);
    yPosition += 14;

    doc.setFontSize(fontSize);
    doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
    doc.text('Product Performance Details', margin, yPosition);
    yPosition += 10;

    const rows = (metrics.topProducts || []).slice(0, 15).map((p, i) => {
      const marginPct = typeof p.margin === 'number' && !isNaN(p.margin) ? p.margin : (typeof p.revenue === 'number' && typeof p.cost === 'number' && p.revenue > 0) ? (p.revenue - p.cost) / p.revenue : 0;
      return [i + 1, p.name, p.unitsSold, `${currency} ${(p.revenue ?? 0).toLocaleString()}`, `${(marginPct * 100).toFixed(2)}%`];
    });
    if (rows.length) {
      autoTable(doc, {
        head: [['#', 'Product', 'Units Sold', `Revenue (${currency})`, 'Margin %']],
        body: rows,
        startY: yPosition,
        styles: { fontSize: fontSize - 2, cellPadding: 3 },
        headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: secondaryRgb },
        margin: { left: margin, right: margin },
      });
    }

    applyPdfFooterAndPageNumbers(doc, pdfTemplate, 'SaaS POS • Product Performance');
    doc.save('product_performance_report.pdf');
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    const performanceData = [
      ['Product', 'Units Sold', 'Revenue', 'Cost', 'Margin %'],
      ...(metrics.topProducts || []).map(p => [
        p.name,
        p.unitsSold,
        p.revenue,
        p.cost || 0,
        typeof p.margin === 'number' && !isNaN(p.margin) ? (p.margin * 100).toFixed(2) :
        (typeof p.revenue === 'number' && typeof p.cost === 'number' && p.revenue > 0) ?
        (((p.revenue - p.cost) / p.revenue) * 100).toFixed(2) : '0.00'
      ])
    ];
    const performanceSheet = XLSX.utils.aoa_to_sheet(performanceData);
    XLSX.utils.book_append_sheet(workbook, performanceSheet, 'Product Performance');

    XLSX.writeFile(workbook, 'product_performance_report.xlsx');
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
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Product Performance Analysis</h1>
              <p className="mt-2 text-lg text-gray-500">Comprehensive analysis of product profitability, margins, and performance metrics.</p>
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

        {/* Key Metrics */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Performance Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow p-6 flex flex-col items-center border border-blue-200">
              <span className="text-blue-600 text-sm mb-1 font-medium">Total Products</span>
              <span className="text-3xl font-bold text-blue-700">{(metrics.topProducts || []).length}</span>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow p-6 flex flex-col items-center border border-green-200">
              <span className="text-green-600 text-sm mb-1 font-medium">Total Revenue</span>
              <span className="text-3xl font-bold text-green-700">Ksh {(metrics.topProducts || []).reduce((sum, p) => sum + p.revenue, 0).toLocaleString()}</span>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow p-6 flex flex-col items-center border border-purple-200">
              <span className="text-purple-600 text-sm mb-1 font-medium">Total Units Sold</span>
              <span className="text-3xl font-bold text-purple-700">{(metrics.topProducts || []).reduce((sum, p) => sum + p.unitsSold, 0)}</span>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow p-6 flex flex-col items-center border border-orange-200">
              <span className="text-orange-600 text-sm mb-1 font-medium">Avg Margin</span>
              <span className="text-3xl font-bold text-orange-700">
                {((metrics.topProducts || []).reduce((sum, p) => {
                  const margin = typeof p.margin === 'number' && !isNaN(p.margin) ? p.margin :
                                 (typeof p.revenue === 'number' && typeof p.cost === 'number' && p.revenue > 0) ?
                                 ((p.revenue - p.cost) / p.revenue) : 0;
                  return sum + margin;
                }, 0) / Math.max((metrics.topProducts || []).length, 1) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </section>

        {/* Margin Chart */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Product Margin Analysis</h2>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="h-64">
              <Bar
                data={marginData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `${context.parsed.y}%`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      title: { display: true, text: 'Margin (%)' },
                      grid: { color: 'rgba(0, 0, 0, 0.1)' }
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

        {/* Performance Table */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Detailed Product Performance</h2>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Product</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Units Sold</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Revenue</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Cost</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {(metrics.topProducts || []).map((product) => {
                    const margin = typeof product.margin === 'number' && !isNaN(product.margin) ? product.margin :
                                   (typeof product.revenue === 'number' && typeof product.cost === 'number' && product.revenue > 0) ?
                                   ((product.revenue - product.cost) / product.revenue) : 0;
                    return (
                      <tr key={product.id} className="border-b">
                        <td className="py-2 px-4">{product.name}</td>
                        <td className="py-2 px-4">{product.unitsSold}</td>
                        <td className="py-2 px-4">Ksh {product.revenue.toLocaleString()}</td>
                        <td className="py-2 px-4">Ksh {(product.cost || 0).toLocaleString()}</td>
                        <td className={`py-2 px-4 font-medium ${margin >= 0.2 ? 'text-green-600' : margin >= 0.1 ? 'text-orange-600' : 'text-red-600'}`}>
                          {(margin * 100).toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
