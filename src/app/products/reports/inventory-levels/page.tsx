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
import { FaFilePdf, FaFileExcel, FaBox, FaExclamationTriangle, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
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

export default function InventoryLevelsReportPage() {
  const branchContext = useBranch();
  const selectedBranchId = branchContext?.selectedBranchId;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');

  useEffect(() => {
    const headers = selectedBranchId ? { 'x-branch-id': selectedBranchId } : undefined;
    apiGet("/products", headers)
      .then((data) => setProducts(data as Product[]))
      .catch((err: unknown) => setError((err as Error).message || "An error occurred while fetching data."))
      .finally(() => setLoading(false));
  }, [selectedBranchId]);

  const filteredProducts = products.filter(product => {
    const stock = product.stock || 0;
    const minStock = product.minStock || 10;
    switch (filterType) {
      case 'in-stock':
        return stock > minStock;
      case 'low-stock':
        return stock > 0 && stock <= minStock;
      case 'out-of-stock':
        return stock === 0;
      default:
        return true;
    }
  });

  const totalStockValue = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0);
  const lowStockProducts = products.filter(p => (p.stock || 0) <= (p.minStock || 10));
  const outOfStockProducts = products.filter(p => (p.stock || 0) === 0);

  const stockData = {
    labels: products.map(p => p.name),
    datasets: [{
      label: 'Stock Level',
      data: products.map(p => p.stock || 0),
      backgroundColor: products.map(p => (p.stock || 0) <= (p.minStock || 10) ? '#ef4444' : '#22c55e'),
      borderRadius: 4,
    }],
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    let yPosition = 20;

    doc.setFontSize(20);
    doc.text('Inventory Stock Levels Report', 20, yPosition);
    yPosition += 20;

    doc.setFontSize(14);
    doc.text(`Filter: ${filterType.replace('-', ' ').toUpperCase()}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Total Products: ${filteredProducts.length}`, 20, yPosition);
    yPosition += 10;
    const filteredStockValue = filteredProducts.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0);
    doc.text(`Total Stock Value: Ksh ${filteredStockValue.toLocaleString()}`, 20, yPosition);
    yPosition += 20;

    doc.text('Inventory Details:', 20, yPosition);
    yPosition += 10;

    filteredProducts.forEach((product, index) => {
      if (yPosition > 270) { // Check if we need a new page
        doc.addPage();
        yPosition = 20;
      }

      const stock = product.stock || 0;
      const minStock = product.minStock || 10;
      const price = product.price || 0;
      const stockValue = stock * price;
      const status = stock === 0 ? 'Out of Stock' : stock <= minStock ? 'Low Stock' : 'In Stock';

      doc.setFontSize(10);
      doc.text(`${index + 1}. ${product.name}`, 20, yPosition);
      doc.text(`Stock: ${stock} | Min: ${minStock} | Price: Ksh ${price.toLocaleString()} | Value: Ksh ${stockValue.toLocaleString()} | Status: ${status}`, 30, yPosition + 5);
      yPosition += 15;
    });

    // Create blob and download link for reliable download
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inventory_levels_report.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Create a single sheet with summary and inventory details
    const excelData = [
      ['Inventory Stock Levels Report'],
      [],
      ['Filter', filterType.replace('-', ' ').toUpperCase()],
      ['Total Products', filteredProducts.length],
      ['Total Stock Value', filteredProducts.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0)],
      [],
      ['Product', 'Stock Level', 'Min Stock', 'Price', 'Stock Value', 'Status'],
      ...filteredProducts.map(p => {
        const stock = p.stock || 0;
        const minStock = p.minStock || 10;
        const status = stock === 0 ? 'Out of Stock' : stock <= minStock ? 'Low Stock' : 'In Stock';
        return [p.name, stock, minStock, p.price || 0, (stock * (p.price || 0)), status];
      })
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Report');

    // Use XLSX.writeFile for direct download
    XLSX.writeFile(workbook, 'inventory_levels_report.xlsx');
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

  // Modern metric card
  function MetricCard({ icon, label, value, color, bg }: { icon: React.ReactNode; label: string; value: string | number; color: string; bg: string }) {
    return (
      <div className={`flex items-center gap-3 ${bg} rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow transition-shadow`}>
        <div className={`flex items-center justify-center w-8 h-8 rounded ${color} bg-opacity-10`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500">{label}</p>
          <p className={`text-base font-bold ${color}`}>{value}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Inventory Stock Levels Report</h1>
          <p className="mt-1 text-sm text-gray-500">Current stock levels for all products with reorder points and stock value.</p>
        </header>

        {/* Metrics Row */}
        <section className="mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MetricCard
              icon={<FaBox className="w-4 h-4" />}
              label="Total Products"
              value={products.length}
              color="text-blue-600"
              bg="bg-blue-50"
            />
            <MetricCard
              icon={<FaCheckCircle className="w-4 h-4" />}
              label="Total Stock Value"
              value={`Ksh ${totalStockValue.toLocaleString()}`}
              color="text-green-600"
              bg="bg-green-50"
            />
            <MetricCard
              icon={<FaExclamationTriangle className="w-4 h-4" />}
              label="Low Stock Items"
              value={lowStockProducts.length}
              color="text-orange-600"
              bg="bg-orange-50"
            />
            <MetricCard
              icon={<FaTimesCircle className="w-4 h-4" />}
              label="Out of Stock"
              value={outOfStockProducts.length}
              color="text-red-600"
              bg="bg-red-50"
            />
          </div>
        </section>

        {/* Chart + Filters Row */}
        <section className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Chart Card */}
          <div className="bg-white rounded-lg shadow p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-gray-800">Stock Levels Overview</h2>
              <div className="flex gap-2">
                <button
                  onClick={exportToPDF}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-1 text-xs"
                >
                  <FaFilePdf />
                  PDF
                </button>
                <button
                  onClick={exportToExcel}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1 text-xs"
                >
                  <FaFileExcel />
                  Excel
                </button>
              </div>
            </div>
            <div className="h-56 bg-gray-50 rounded p-2">
              <Bar
                data={stockData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: '#2563eb',
                      titleColor: '#fff',
                      bodyColor: '#fff',
                      borderColor: '#fff',
                      borderWidth: 1,
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
                      grid: { color: 'rgba(37,99,235,0.07)' },
                      ticks: { color: '#2563eb', font: { size: 11 } }
                    },
                    x: {
                      grid: { color: 'rgba(37,99,235,0.07)' },
                      ticks: { color: '#2563eb', font: { size: 11 } }
                    }
                  }
                }}
              />
            </div>
          </div>
          {/* Filters Card */}
          <div className="bg-white rounded-lg shadow p-4 flex flex-col">
            <h2 className="text-base font-bold text-gray-800 mb-2">Filters</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded transition-colors text-xs font-semibold ${filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('in-stock')}
                className={`px-3 py-1 rounded transition-colors text-xs font-semibold ${filterType === 'in-stock' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                In Stock
              </button>
              <button
                onClick={() => setFilterType('low-stock')}
                className={`px-3 py-1 rounded transition-colors text-xs font-semibold ${filterType === 'low-stock' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Low Stock
              </button>
              <button
                onClick={() => setFilterType('out-of-stock')}
                className={`px-3 py-1 rounded transition-colors text-xs font-semibold ${filterType === 'out-of-stock' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Out of Stock
              </button>
            </div>
          </div>
        </section>

        {/* Inventory Table */}
        <section>
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-base font-bold text-gray-800 mb-2">Detailed Inventory <span className="text-xs text-gray-500">({filteredProducts.length} items)</span></h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Product</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Stock Level</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Min Stock</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Price</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Stock Value</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const stock = product.stock || 0;
                    const minStock = product.minStock || 10;
                    const status = stock === 0 ? 'Out of Stock' : stock <= minStock ? 'Low Stock' : 'In Stock';
                    const statusColor = stock === 0 ? 'text-red-600' : stock <= minStock ? 'text-orange-600' : 'text-green-600';
                    const statusIcon = stock === 0
                      ? <FaTimesCircle className="inline mr-1 text-red-500" />
                      : stock <= minStock
                        ? <FaExclamationTriangle className="inline mr-1 text-orange-500" />
                        : <FaCheckCircle className="inline mr-1 text-green-500" />;
                    return (
                      <tr key={product.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-2 px-4">{product.name}</td>
                        <td className="py-2 px-4">{stock}</td>
                        <td className="py-2 px-4">{minStock}</td>
                        <td className="py-2 px-4">Ksh {(product.price || 0).toLocaleString()}</td>
                        <td className="py-2 px-4">Ksh {(stock * (product.price || 0)).toLocaleString()}</td>
                        <td className={`py-2 px-4 font-medium ${statusColor}`}>
                          {statusIcon}
                          {status}
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
