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

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Inventory Stock Levels Report</h1>
            <p className="mt-2 text-lg text-gray-500">Current stock levels for all products with reorder points and stock value.</p>
          </div>
        </header>

        {/* Key Metrics */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Key Metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow p-6 flex flex-col items-center border border-blue-200">
              <span className="text-blue-600 text-sm mb-1 font-medium">Total Products</span>
              <span className="text-3xl font-bold text-blue-700">{products.length}</span>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow p-6 flex flex-col items-center border border-green-200">
              <span className="text-green-600 text-sm mb-1 font-medium">Total Stock Value</span>
              <span className="text-3xl font-bold text-green-700">Ksh {totalStockValue.toLocaleString()}</span>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow p-6 flex flex-col items-center border border-orange-200">
              <span className="text-orange-600 text-sm mb-1 font-medium">Low Stock Items</span>
              <span className="text-3xl font-bold text-orange-700">{lowStockProducts.length}</span>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow p-6 flex flex-col items-center border border-red-200">
              <span className="text-red-600 text-sm mb-1 font-medium">Out of Stock</span>
              <span className="text-3xl font-bold text-red-600">{outOfStockProducts.length}</span>
            </div>
          </div>
        </section>

        {/* Stock Levels Chart */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Stock Levels Overview</h2>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="h-64">
              <Bar
                data={stockData}
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

        {/* Filters */}
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
                  onClick={() => setFilterType('in-stock')}
                  className={`px-4 py-2 rounded-lg transition-colors ${filterType === 'in-stock' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  In Stock
                </button>
                <button
                  onClick={() => setFilterType('low-stock')}
                  className={`px-4 py-2 rounded-lg transition-colors ${filterType === 'low-stock' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Low Stock
                </button>
                <button
                  onClick={() => setFilterType('out-of-stock')}
                  className={`px-4 py-2 rounded-lg transition-colors ${filterType === 'out-of-stock' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Out of Stock
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

        {/* Inventory Table */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Detailed Inventory ({filteredProducts.length} items)</h2>
          <div className="bg-white rounded-xl shadow p-6">
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
                    return (
                      <tr key={product.id} className="border-b">
                        <td className="py-2 px-4">{product.name}</td>
                        <td className="py-2 px-4">{stock}</td>
                        <td className="py-2 px-4">{minStock}</td>
                        <td className="py-2 px-4">Ksh {(product.price || 0).toLocaleString()}</td>
                        <td className="py-2 px-4">Ksh {(stock * (product.price || 0)).toLocaleString()}</td>
                        <td className={`py-2 px-4 font-medium ${statusColor}`}>{status}</td>
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
