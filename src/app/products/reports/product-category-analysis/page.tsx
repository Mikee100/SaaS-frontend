"use client";
import { useEffect, useState } from "react";

import { Pie, Bar } from "react-chartjs-2";
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
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
  ArcElement,
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
  ArcElement,
);

type CategoryData = {
  category: string;
  sales: number;
  revenue: number;
  profit: number;
  products: number;
};

export default function ProductCategoryAnalysisPage() {
  const branchContext = useBranch();
  const selectedBranchId = branchContext?.selectedBranchId;
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  useEffect(() => {
  
    const mockCategories: CategoryData[] = [
      { category: 'Electronics', sales: 1500, revenue: 75000, profit: 15000, products: 25 },
      { category: 'Clothing', sales: 1200, revenue: 45000, profit: 9000, products: 40 },
      { category: 'Home & Garden', sales: 800, revenue: 32000, profit: 6400, products: 30 },
      { category: 'Sports', sales: 600, revenue: 24000, profit: 4800, products: 20 },
      { category: 'Books', sales: 400, revenue: 12000, profit: 2400, products: 15 },
    ];
    setCategories(mockCategories);
    setLoading(false);
  }, [selectedBranchId]);

  const revenueChartData = {
    labels: categories.map(c => c.category),
    datasets: [{
      label: 'Revenue ($)',
      data: categories.map(c => c.revenue),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      borderRadius: 4,
    }],
  };

  const salesChartData = {
    labels: categories.map(c => c.category),
    datasets: [{
      label: 'Sales Volume',
      data: categories.map(c => c.sales),
      backgroundColor: '#3b82f6',
      borderRadius: 4,
    }],
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    let yPosition = 20;

    doc.setFontSize(20);
    doc.text('Product Category Analysis', 20, yPosition);
    yPosition += 20;

    doc.setFontSize(14);
    doc.text(`Total Categories: ${categories.length}`, 20, yPosition);
    yPosition += 20;

    doc.text('Category Analysis Details:', 20, yPosition);
    yPosition += 10;
    categories.forEach((category, index) => {
      doc.setFontSize(10);
      doc.text(`${index + 1}. ${category.category} - Sales: ${category.sales}, Revenue: $${category.revenue}, Profit: $${category.profit}`, 30, yPosition);
      yPosition += 8;
    });

    doc.save('product_category_analysis.pdf');
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    const categoryDataSheet = [
      ['Category', 'Sales Volume', 'Revenue ($)', 'Profit ($)', 'Products Count'],
      ...categories.map(c => [c.category, c.sales, c.revenue, c.profit, c.products])
    ];
    const sheet = XLSX.utils.aoa_to_sheet(categoryDataSheet);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Category Analysis');

    XLSX.writeFile(workbook, 'product_category_analysis.xlsx');
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
              <p className="mt-2 text-lg text-gray-500">Sales and performance breakdown by product categories and subcategories.</p>
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
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Category Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow p-6 flex flex-col items-center border border-blue-200">
              <span className="text-blue-600 text-sm mb-1 font-medium">Total Revenue</span>
              <span className="text-3xl font-bold text-blue-700">
                ${categories.reduce((sum, c) => sum + c.revenue, 0).toLocaleString()}
              </span>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow p-6 flex flex-col items-center border border-green-200">
              <span className="text-green-600 text-sm mb-1 font-medium">Total Sales</span>
              <span className="text-3xl font-bold text-green-700">{categories.reduce((sum, c) => sum + c.sales, 0)}</span>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow p-6 flex flex-col items-center border border-purple-200">
              <span className="text-purple-600 text-sm mb-1 font-medium">Total Profit</span>
              <span className="text-3xl font-bold text-purple-700">
                ${categories.reduce((sum, c) => sum + c.profit, 0).toLocaleString()}
              </span>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow p-6 flex flex-col items-center border border-orange-200">
              <span className="text-orange-600 text-sm mb-1 font-medium">Categories</span>
              <span className="text-3xl font-bold text-orange-700">{categories.length}</span>
            </div>
          </div>
        </section>

        {/* Charts */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Category Performance</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue by Category</h3>
              <div className="h-64">
                <Pie
                  data={revenueChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                  }}
                />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Sales Volume by Category</h3>
              <div className="h-64">
                <Bar
                  data={salesChartData}
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

        {/* Category Table */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Detailed Category Analysis</h2>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Category</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Sales Volume</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Revenue ($)</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Profit ($)</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Products</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Profit Margin (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.category} className="border-b">
                      <td className="py-2 px-4">{category.category}</td>
                      <td className="py-2 px-4">{category.sales}</td>
                      <td className="py-2 px-4">${category.revenue.toLocaleString()}</td>
                      <td className="py-2 px-4">${category.profit.toLocaleString()}</td>
                      <td className="py-2 px-4">{category.products}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                          (category.profit / category.revenue * 100) >= 25 ? 'bg-green-100 text-green-800' :
                          (category.profit / category.revenue * 100) >= 15 ? 'bg-blue-100 text-blue-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {(category.profit / category.revenue * 100).toFixed(1)}%
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
