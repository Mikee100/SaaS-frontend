"use client";
import { useEffect, useState } from "react";

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
  preparePdfWatermark,
} from '@/utils/pdfTemplate';
import { getFullAssetUrl } from '@/utils/logoUrl';
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

type Supplier = {
  id: string;
  name: string;
  deliveryTime: number;
  qualityScore: number;
  onTimeDelivery: number;
  totalOrders: number;
};

export default function SupplierPerformanceReportPage() {
  const branchContext = useBranch();
  const selectedBranchId = branchContext?.selectedBranchId;
  const { data: tenantData } = useTenant();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
const [error] = useState<string | null>(null);

  useEffect(() => {

    const mockSuppliers: Supplier[] = [
      { id: '1', name: 'Supplier A', deliveryTime: 5, qualityScore: 95, onTimeDelivery: 98, totalOrders: 150 },
      { id: '2', name: 'Supplier B', deliveryTime: 7, qualityScore: 88, onTimeDelivery: 92, totalOrders: 120 },
      { id: '3', name: 'Supplier C', deliveryTime: 3, qualityScore: 97, onTimeDelivery: 99, totalOrders: 200 },
      { id: '4', name: 'Supplier D', deliveryTime: 8, qualityScore: 85, onTimeDelivery: 85, totalOrders: 80 },
      { id: '5', name: 'Supplier E', deliveryTime: 4, qualityScore: 92, onTimeDelivery: 96, totalOrders: 180 },
    ];
    setSuppliers(mockSuppliers);
    setLoading(false);
  }, [selectedBranchId]);

  const deliveryTimeChartData = {
    labels: suppliers.map(s => s.name),
    datasets: [{
      label: 'Average Delivery Time (days)',
      data: suppliers.map(s => s.deliveryTime),
      backgroundColor: '#3b82f6',
      borderRadius: 4,
    }],
  };

  const qualityScoreData = {
    labels: suppliers.map(s => s.name),
    datasets: [{
      label: 'Quality Score (%)',
      data: suppliers.map(s => s.qualityScore),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.4,
    }],
  };

  const exportToPDF = async () => {
    const pdfTemplate = (tenantData?.pdfTemplate || {}) as PdfTemplate;
    const margin = getPdfMargin(pdfTemplate);
    const fontSize = getPdfFontSize(pdfTemplate);
    const { primaryRgb, secondaryRgb } = getPdfTableColors(pdfTemplate);

    const doc = new jsPDF(getPdfDocOptions(pdfTemplate));
    await preparePdfWatermark(doc, getFullAssetUrl(tenantData?.watermark as string | null | undefined));
    let yPosition = applyPdfBusinessHeader(doc, tenantData, pdfTemplate, margin);

    doc.setFontSize(fontSize + 4);
    doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
    doc.text('Supplier Performance Report', margin, yPosition + 8);
    yPosition += 18;

    doc.setFontSize(fontSize - 2);
    doc.setTextColor('666666');
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 8;
    doc.text(`Total Suppliers: ${suppliers.length}`, margin, yPosition);
    yPosition += 14;

    doc.setFontSize(fontSize);
    doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
    doc.text('Supplier Performance Details', margin, yPosition);
    yPosition += 10;

    const rows = suppliers.map((s, i) => [i + 1, s.name, `${s.deliveryTime} days`, `${s.qualityScore}%`, `${s.onTimeDelivery}%`, s.totalOrders]);
    if (rows.length) {
      autoTable(doc, {
        head: [['#', 'Supplier', 'Delivery', 'Quality', 'On-Time %', 'Orders']],
        body: rows,
        startY: yPosition,
        styles: { fontSize: fontSize - 2, cellPadding: 3 },
        headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: secondaryRgb },
        margin: { left: margin, right: margin },
      });
    }

    applyPdfFooterAndPageNumbers(doc, pdfTemplate, 'SaaS POS • Suppliers');
    doc.save('supplier_performance_report.pdf');
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    const supplierDataSheet = [
      ['Supplier', 'Delivery Time (days)', 'Quality Score (%)', 'On-Time Delivery (%)', 'Total Orders'],
      ...suppliers.map(s => [s.name, s.deliveryTime, s.qualityScore, s.onTimeDelivery, s.totalOrders])
    ];
    const sheet = XLSX.utils.aoa_to_sheet(supplierDataSheet);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Supplier Performance');

    XLSX.writeFile(workbook, 'supplier_performance_report.xlsx');
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
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Supplier Performance Report</h1>
              <p className="mt-2 text-lg text-gray-500">Analysis of supplier delivery times, quality scores, and reliability metrics.</p>
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
              <span className="text-blue-600 text-sm mb-1 font-medium">Avg Delivery Time</span>
              <span className="text-3xl font-bold text-blue-700">
                {(suppliers.reduce((sum, s) => sum + s.deliveryTime, 0) / suppliers.length).toFixed(1)} days
              </span>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow p-6 flex flex-col items-center border border-green-200">
              <span className="text-green-600 text-sm mb-1 font-medium">Avg Quality Score</span>
              <span className="text-3xl font-bold text-green-700">
                {(suppliers.reduce((sum, s) => sum + s.qualityScore, 0) / suppliers.length).toFixed(1)}%
              </span>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow p-6 flex flex-col items-center border border-purple-200">
              <span className="text-purple-600 text-sm mb-1 font-medium">Avg On-Time Delivery</span>
              <span className="text-3xl font-bold text-purple-700">
                {(suppliers.reduce((sum, s) => sum + s.onTimeDelivery, 0) / suppliers.length).toFixed(1)}%
              </span>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow p-6 flex flex-col items-center border border-orange-200">
              <span className="text-orange-600 text-sm mb-1 font-medium">Total Suppliers</span>
              <span className="text-3xl font-bold text-orange-700">{suppliers.length}</span>
            </div>
          </div>
        </section>

        {/* Charts */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Performance Analysis</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Delivery Times</h3>
              <div className="h-64">
                <Bar
                  data={deliveryTimeChartData}
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
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Quality Scores</h3>
              <div className="h-64">
                <Line
                  data={qualityScoreData}
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

        {/* Supplier Table */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Detailed Supplier Performance</h2>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Supplier</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Delivery Time (days)</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Quality Score (%)</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">On-Time Delivery (%)</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Total Orders</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id} className="border-b">
                      <td className="py-2 px-4">{supplier.name}</td>
                      <td className="py-2 px-4">{supplier.deliveryTime}</td>
                      <td className="py-2 px-4">{supplier.qualityScore}%</td>
                      <td className="py-2 px-4">{supplier.onTimeDelivery}%</td>
                      <td className="py-2 px-4">{supplier.totalOrders}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                          supplier.qualityScore >= 95 && supplier.onTimeDelivery >= 95 ? 'bg-green-100 text-green-800' :
                          supplier.qualityScore >= 90 && supplier.onTimeDelivery >= 90 ? 'bg-blue-100 text-blue-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {supplier.qualityScore >= 95 && supplier.onTimeDelivery >= 95 ? 'Excellent' :
                           supplier.qualityScore >= 90 && supplier.onTimeDelivery >= 90 ? 'Good' : 'Needs Improvement'}
                        </span>
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
