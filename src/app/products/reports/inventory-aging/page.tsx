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
import { useBranch } from "@/contexts/BranchContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

type InventoryItem = {
  id: string;
  productName: string;
  stock: number;
  lastReceived: string | null;
  daysInStock: number;
  ageBucket: string;
};

export default function InventoryAgingReportPage() {
  const branchContext = useBranch();
  const selectedBranchId = branchContext?.selectedBranchId;
  const { data: tenantData } = useTenant();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | '0-30' | '31-60' | '61-90' | '90+'>('all');

  useEffect(() => {
    const headers = selectedBranchId ? { 'x-branch-id': selectedBranchId } : undefined;
    apiGet("/analytics/inventory-aging", headers)
      .then((data) => setInventoryItems(data as InventoryItem[]))
      .catch((err: unknown) => setError((err as Error).message || "An error occurred while fetching data."))
      .finally(() => setLoading(false));
  }, [selectedBranchId]);

  const filteredItems = inventoryItems.filter(item => {
    if (filterType === 'all') return true;
    return item.ageBucket === filterType;
  });

  const ageBuckets = {
    '0-30': filteredItems.filter(item => item.ageBucket === '0-30').length,
    '31-60': filteredItems.filter(item => item.ageBucket === '31-60').length,
    '61-90': filteredItems.filter(item => item.ageBucket === '61-90').length,
    '90+': filteredItems.filter(item => item.ageBucket === '90+').length,
  };

  const totalValue = filteredItems.reduce((sum, item) => sum + (item.stock * 100), 0); // Assuming average price of 100
  const slowMovingItems = filteredItems.filter(item => item.daysInStock > 90);
  const obsoleteItems = filteredItems.filter(item => item.daysInStock > 180);

  const ageData = {
    labels: ['0-30 Days', '31-60 Days', '61-90 Days', '90+ Days'],
    datasets: [{
      label: 'Number of Items',
      data: [ageBuckets['0-30'], ageBuckets['31-60'], ageBuckets['61-90'], ageBuckets['90+']],
      backgroundColor: ['#22c55e', '#eab308', '#f97316', '#ef4444'],
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
    doc.text('Inventory Aging Report', margin, yPosition + 8);
    yPosition += 18;

    doc.setFontSize(fontSize - 2);
    doc.setTextColor('666666');
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Filter: ${filterType === 'all' ? 'All' : filterType + ' Days'}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Total Items: ${filteredItems.length}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Total Value: ${currency} ${totalValue.toLocaleString()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Slow Moving (>90 days): ${slowMovingItems.length}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Potentially Obsolete (>180 days): ${obsoleteItems.length}`, margin, yPosition);
    yPosition += 14;

    doc.setFontSize(fontSize);
    doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
    doc.text('Inventory Aging Details', margin, yPosition);
    yPosition += 10;

    const rows = filteredItems.map((item, i) => [i + 1, item.productName, item.stock, item.daysInStock, item.ageBucket]);
    if (rows.length) {
      autoTable(doc, {
        head: [['#', 'Product', 'Stock', 'Days in Stock', 'Age Bucket']],
        body: rows,
        startY: yPosition,
        styles: { fontSize: fontSize - 2, cellPadding: 3 },
        headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: secondaryRgb },
        margin: { left: margin, right: margin },
      });
    }

    applyPdfFooterAndPageNumbers(doc, pdfTemplate, 'SaaS POS • Inventory Aging');
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inventory_aging_report.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    const excelData = [
      ['Inventory Aging Report'],
      [],
      ['Filter', filterType === 'all' ? 'All' : filterType + ' Days'],
      ['Total Items', filteredItems.length],
      ['Total Value', totalValue],
      ['Slow Moving (>90 days)', slowMovingItems.length],
      ['Potentially Obsolete (>180 days)', obsoleteItems.length],
      [],
      ['Product', 'Stock Level', 'Days in Stock', 'Age Bucket', 'Last Received'],
      ...filteredItems.map(item => [
        item.productName,
        item.stock,
        item.daysInStock,
        item.ageBucket,
        item.lastReceived || 'N/A'
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Aging Report');

    XLSX.writeFile(workbook, 'inventory_aging_report.xlsx');
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
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Inventory Aging Report</h1>
            <p className="mt-2 text-lg text-gray-500">Shows how long products have been in stock (age buckets: 0-30, 31-60, 61-90, 90+ days). Helps identify slow-moving or obsolete inventory.</p>
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
              <span className="text-green-600 text-sm mb-1 font-medium">Total Value</span>
              <span className="text-3xl font-bold text-green-700">Ksh {totalValue.toLocaleString()}</span>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow p-6 flex flex-col items-center border border-orange-200">
              <span className="text-orange-600 text-sm mb-1 font-medium">Slow Moving</span>
              <span className="text-3xl font-bold text-orange-700">{slowMovingItems.length}</span>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow p-6 flex flex-col items-center border border-red-200">
              <span className="text-red-600 text-sm mb-1 font-medium">Potentially Obsolete</span>
              <span className="text-3xl font-bold text-red-600">{obsoleteItems.length}</span>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Inventory Age Distribution</h2>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="h-64">
              <Bar
                data={ageData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `Items: ${context.parsed.y}`;
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
                  All
                </button>
                <button
                  onClick={() => setFilterType('0-30')}
                  className={`px-4 py-2 rounded-lg transition-colors ${filterType === '0-30' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  0-30 Days
                </button>
                <button
                  onClick={() => setFilterType('31-60')}
                  className={`px-4 py-2 rounded-lg transition-colors ${filterType === '31-60' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  31-60 Days
                </button>
                <button
                  onClick={() => setFilterType('61-90')}
                  className={`px-4 py-2 rounded-lg transition-colors ${filterType === '61-90' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  61-90 Days
                </button>
                <button
                  onClick={() => setFilterType('90+')}
                  className={`px-4 py-2 rounded-lg transition-colors ${filterType === '90+' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  90+ Days
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
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Detailed Inventory Aging ({filteredItems.length} items)</h2>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Product</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Stock Level</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Days in Stock</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Age Bucket</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Last Received</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2 px-4">{item.productName}</td>
                      <td className="py-2 px-4">{item.stock}</td>
                      <td className="py-2 px-4">{item.daysInStock}</td>
                      <td className={`py-2 px-4 font-medium ${
                        item.ageBucket === '0-30' ? 'text-green-600' :
                        item.ageBucket === '31-60' ? 'text-yellow-600' :
                        item.ageBucket === '61-90' ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {item.ageBucket} Days
                      </td>
                      <td className="py-2 px-4">{item.lastReceived ? new Date(item.lastReceived).toLocaleDateString() : 'N/A'}</td>
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
