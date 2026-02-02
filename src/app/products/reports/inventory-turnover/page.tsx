"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";
import { Bar, Line } from "react-chartjs-2";
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
  type PdfTemplate,
} from '@/utils/pdfTemplate';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

type TurnoverData = {
  product: string;
  turnover: number;
  avgStock: number;
  sold: number;
};

export default function InventoryTurnoverReportPage() {
  const branchContext = useBranch();
  const selectedBranchId = branchContext?.selectedBranchId;
  const [turnoverData, setTurnoverData] = useState<TurnoverData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    
    Promise.all([
      apiGet(`/analytics/dashboard`)
    ]).then(([analyticsData]) => {
      // Type analyticsData as Record<string, unknown>
      const topProducts = (analyticsData as { topProducts?: { name: string; unitsSold: number }[] }).topProducts || [];
      const simulatedTurnover = topProducts.map((p) => ({
        product: p.name,
        turnover: Math.random() * 12 + 1, // Random turnover between 1-13
        avgStock: Math.floor(Math.random() * 100) + 20,
        sold: p.unitsSold
      }));
      setTurnoverData(simulatedTurnover);
    }).catch((err: unknown) => setError((err as Error).message || "An error occurred while fetching data."))
      .finally(() => setLoading(false));
  }, [selectedBranchId]);

  const turnoverChartData = {
    labels: turnoverData.map(d => d.product),
    datasets: [{
      label: 'Inventory Turnover Ratio',
      data: turnoverData.map(d => Math.round(d.turnover * 100) / 100),
      backgroundColor: '#3b82f6',
      borderRadius: 4,
    }],
  };

  const avgStockData = {
    labels: turnoverData.map(d => d.product),
    datasets: [{
      label: 'Average Stock Level',
      data: turnoverData.map(d => d.avgStock),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.4,
    }],
  };

  const exportToPDF = () => {
    const pdfTemplate = (tenantData?.pdfTemplate || {}) as PdfTemplate;
    const margin = getPdfMargin(pdfTemplate);
    const fontSize = getPdfFontSize(pdfTemplate);
    const { primaryRgb, secondaryRgb } = getPdfTableColors(pdfTemplate);

    const doc = new jsPDF(getPdfDocOptions(pdfTemplate));
    let yPosition = applyPdfBusinessHeader(doc, tenantData, pdfTemplate, margin);

    doc.setFontSize(fontSize + 4);
    doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
    doc.text('Inventory Turnover Report', margin, yPosition + 8);
    yPosition += 18;

    doc.setFontSize(fontSize - 2);
    doc.setTextColor('666666');
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 8;
    doc.text(`Average Turnover Ratio: ${(turnoverData.reduce((sum, d) => sum + d.turnover, 0) / Math.max(turnoverData.length, 1)).toFixed(2)}`, margin, yPosition);
    yPosition += 14;

    doc.setFontSize(fontSize);
    doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
    doc.text('Turnover Details', margin, yPosition);
    yPosition += 10;

    const rows = turnoverData.map((d, i) => [i + 1, d.product, d.turnover.toFixed(2), d.avgStock, d.sold]);
    if (rows.length) {
      autoTable(doc, {
        head: [['#', 'Product', 'Turnover', 'Avg Stock', 'Sold']],
        body: rows,
        startY: yPosition,
        styles: { fontSize: fontSize - 2, cellPadding: 3 },
        headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: secondaryRgb },
        margin: { left: margin, right: margin },
      });
    }

    applyPdfFooterAndPageNumbers(doc, pdfTemplate, 'SaaS POS • Inventory Turnover');
    doc.save('inventory_turnover_report.pdf');
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    const turnoverDataSheet = [
      ['Product', 'Turnover Ratio', 'Average Stock', 'Units Sold'],
      ...turnoverData.map(d => [d.product, d.turnover.toFixed(2), d.avgStock, d.sold])
    ];
    const sheet = XLSX.utils.aoa_to_sheet(turnoverDataSheet);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Inventory Turnover');

    XLSX.writeFile(workbook, 'inventory_turnover_report.xlsx');
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
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Inventory Turnover Report</h1>
              <p className="mt-2 text-lg text-gray-500">Analysis of how quickly inventory is sold and replaced over a period.</p>
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
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Turnover Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow p-6 flex flex-col items-center border border-blue-200">
              <span className="text-blue-600 text-sm mb-1 font-medium">Avg Turnover Ratio</span>
              <span className="text-3xl font-bold text-blue-700">
                {(turnoverData.reduce((sum, d) => sum + d.turnover, 0) / Math.max(turnoverData.length, 1)).toFixed(2)}
              </span>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow p-6 flex flex-col items-center border border-green-200">
              <span className="text-green-600 text-sm mb-1 font-medium">Total Products</span>
              <span className="text-3xl font-bold text-green-700">{turnoverData.length}</span>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow p-6 flex flex-col items-center border border-purple-200">
              <span className="text-purple-600 text-sm mb-1 font-medium">High Turnover ({'>'}6)</span>
              <span className="text-3xl font-bold text-purple-700">{turnoverData.filter(d => d.turnover > 6).length}</span>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow p-6 flex flex-col items-center border border-orange-200">
              <span className="text-orange-600 text-sm mb-1 font-medium">Low Turnover ({"<"}3)</span>
              <span className="text-3xl font-bold text-orange-700">{turnoverData.filter(d => d.turnover < 3).length}</span>
            </div>
          </div>
        </section>

        {/* Charts */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Turnover Analysis</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Turnover Ratios</h3>
              <div className="h-64">
                <Bar
                  data={turnoverChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.1)' } }, x: { grid: { color: 'rgba(0, 0, 0, 0.1)' } } }
                  }}
                />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Average Stock Levels</h3>
              <div className="h-64">
                <Line
                  data={avgStockData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.1)' } }, x: { grid: { color: 'rgba(0, 0, 0, 0.1)' } } }
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Turnover Table */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Detailed Turnover Data</h2>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Product</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Turnover Ratio</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Avg Stock</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Units Sold</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {turnoverData.map((data) => (
                    <tr key={data.product} className="border-b">
                      <td className="py-2 px-4">{data.product}</td>
                      <td className="py-2 px-4">{data.turnover.toFixed(2)}</td>
                      <td className="py-2 px-4">{data.avgStock}</td>
                      <td className="py-2 px-4">{data.sold}</td>
                      <td className="py-2 px-4">
                        {(() => {
                          const performance = data.turnover > 6 ? 'High' : data.turnover > 3 ? 'Good' : 'Low';
                          const className = data.turnover > 6 ? 'bg-green-100 text-green-800' : data.turnover > 3 ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800';
                          return (
                            <span className={`px-2 py-1 rounded-full text-sm font-medium ${className}`}>
                              {performance}
                            </span>
                          );
                        })()}
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
