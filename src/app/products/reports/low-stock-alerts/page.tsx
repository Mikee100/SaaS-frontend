"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";
import { Bar } from "react-chartjs-2";
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {  FaFilePdf, FaFileExcel, FaExclamationTriangle } from "react-icons/fa";
import { useBranch } from "@/contexts/BranchContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

type Product = { id: string; name: string; stock: number; minStock?: number; price?: number };

export default function LowStockAlertsReportPage() {
  const branchContext = useBranch();
  const selectedBranchId = branchContext?.selectedBranchId;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const headers = selectedBranchId ? { 'x-branch-id': selectedBranchId } : undefined;
    apiGet("/products", headers)
      .then((data) => setProducts(data as Product[]))
      .catch((err: unknown) => setError((err as Error).message || "An error occurred while fetching data."))
      .finally(() => setLoading(false));
  }, [selectedBranchId]);

  const LOW_STOCK_THRESHOLD = 10;
  const lowStockProducts = products.filter(p => (p.stock || 0) <= LOW_STOCK_THRESHOLD && (p.stock || 0) > 0);
  const outOfStockProducts = products.filter(p => (p.stock || 0) === 0);

  const lowStockData = {
    labels: lowStockProducts.map(p => p.name),
    datasets: [{
      label: 'Current Stock',
      data: lowStockProducts.map(p => p.stock || 0),
      backgroundColor: '#f59e0b',
      borderRadius: 4,
    }],
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    let yPosition = 20;

    doc.setFontSize(20);
    doc.text('Low Stock Alerts Report', 20, yPosition);
    yPosition += 20;

    doc.setFontSize(14);
    doc.text(`Low Stock Items: ${lowStockProducts.length}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Out of Stock Items: ${outOfStockProducts.length}`, 20, yPosition);
    yPosition += 20;

    doc.text('Low Stock Products:', 20, yPosition);
    yPosition += 10;
    lowStockProducts.forEach((product, index) => {
      doc.setFontSize(10);
      doc.text(`${index + 1}. ${product.name} - Stock: ${product.stock}`, 30, yPosition);
      yPosition += 8;
    });

    yPosition += 10;
    doc.text('Out of Stock Products:', 20, yPosition);
    yPosition += 10;
    outOfStockProducts.forEach((product, index) => {
      doc.setFontSize(10);
      doc.text(`${index + 1}. ${product.name} - Stock: 0`, 30, yPosition);
      yPosition += 8;
    });

    doc.save('low_stock_alerts_report.pdf');
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    const summaryData = [
      ['Metric', 'Value'],
      ['Low Stock Items', lowStockProducts.length],
      ['Out of Stock Items', outOfStockProducts.length],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    const lowStockData = [
      ['Product', 'Current Stock', 'Min Stock'],
      ...lowStockProducts.map(p => [p.name, p.stock || 0, p.minStock || LOW_STOCK_THRESHOLD])
    ];
    const lowStockSheet = XLSX.utils.aoa_to_sheet(lowStockData);
    XLSX.utils.book_append_sheet(workbook, lowStockSheet, 'Low Stock Items');

    const outOfStockData = [
      ['Product'],
      ...outOfStockProducts.map(p => [p.name])
    ];
    const outOfStockSheet = XLSX.utils.aoa_to_sheet(outOfStockData);
    XLSX.utils.book_append_sheet(workbook, outOfStockSheet, 'Out of Stock Items');

    XLSX.writeFile(workbook, 'low_stock_alerts_report.xlsx');
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
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Low Stock Alerts Report</h1>
              <p className="mt-2 text-lg text-gray-500">Products that are below minimum stock levels and require immediate attention.</p>
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

        {/* Alert Summary */}
        <div className="mb-8">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <FaExclamationTriangle className="w-8 h-8 text-orange-600" />
              <div>
                <h3 className="text-lg font-semibold text-orange-900">Stock Alert Summary</h3>
                <p className="text-orange-700">
                  {lowStockProducts.length} products are low on stock, {outOfStockProducts.length} are out of stock.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Key Metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow p-6 flex flex-col items-center border border-orange-200">
              <span className="text-orange-600 text-sm mb-1 font-medium">Low Stock Items</span>
              <span className="text-3xl font-bold text-orange-700">{lowStockProducts.length}</span>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow p-6 flex flex-col items-center border border-red-200">
              <span className="text-red-600 text-sm mb-1 font-medium">Out of Stock Items</span>
              <span className="text-3xl font-bold text-red-700">{outOfStockProducts.length}</span>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow p-6 flex flex-col items-center border border-blue-200">
              <span className="text-blue-600 text-sm mb-1 font-medium">Total Alert Items</span>
              <span className="text-3xl font-bold text-blue-700">{lowStockProducts.length + outOfStockProducts.length}</span>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow p-6 flex flex-col items-center border border-green-200">
              <span className="text-green-600 text-sm mb-1 font-medium">Healthy Stock Items</span>
              <span className="text-3xl font-bold text-green-700">{products.length - lowStockProducts.length - outOfStockProducts.length}</span>
            </div>
          </div>
        </section>

        {/* Low Stock Chart */}
        {lowStockProducts.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Low Stock Levels</h2>
            <div className="bg-white rounded-xl shadow p-6">
              <div className="h-64">
                <Bar
                  data={lowStockData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return `Stock: ${context.parsed.y}`;
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
        )}

        {/* Low Stock Table */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Low Stock Products</h2>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Product</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Current Stock</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Min Stock</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map((product) => (
                    <tr key={product.id} className="border-b">
                      <td className="py-2 px-4">{product.name}</td>
                      <td className="py-2 px-4">{product.stock || 0}</td>
                      <td className="py-2 px-4">{product.minStock || LOW_STOCK_THRESHOLD}</td>
                      <td className="py-2 px-4">
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                          Low Stock
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Out of Stock Table */}
        {outOfStockProducts.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Out of Stock Products</h2>
            <div className="bg-white rounded-xl shadow p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-2 px-4 text-left font-semibold text-gray-600">Product</th>
                      <th className="py-2 px-4 text-left font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outOfStockProducts.map((product) => (
                      <tr key={product.id} className="border-b">
                        <td className="py-2 px-4">{product.name}</td>
                        <td className="py-2 px-4">
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                            Out of Stock
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
