"use client";
import { useEffect, useState } from "react";

import { Line, Bar } from "react-chartjs-2";
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
} from "chart.js";
import {  FaFilePdf, FaFileExcel } from "react-icons/fa";
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

type MovementData = {
  date: string;
  receipts: number;
  issues: number;
  adjustments: number;
  netMovement: number;
};

export default function InventoryMovementReportPage() {
  const branchContext = useBranch();
  const selectedBranchId = branchContext?.selectedBranchId;
  const [movements, setMovements] = useState<MovementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  useEffect(() => {

    // Simulate movement data
    const mockMovements: MovementData[] = [
      { date: '2024-01-01', receipts: 150, issues: 120, adjustments: 5, netMovement: 35 },
      { date: '2024-01-02', receipts: 200, issues: 180, adjustments: -3, netMovement: 17 },
      { date: '2024-01-03', receipts: 180, issues: 160, adjustments: 2, netMovement: 22 },
      { date: '2024-01-04', receipts: 220, issues: 200, adjustments: 1, netMovement: 21 },
      { date: '2024-01-05', receipts: 190, issues: 170, adjustments: -2, netMovement: 18 },
      { date: '2024-01-06', receipts: 210, issues: 190, adjustments: 3, netMovement: 23 },
      { date: '2024-01-07', receipts: 170, issues: 150, adjustments: 0, netMovement: 20 },
    ];
    setMovements(mockMovements);
    setLoading(false);
  }, [selectedBranchId]);

  const movementChartData = {
    labels: movements.map(m => new Date(m.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Receipts',
        data: movements.map(m => m.receipts),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: false,
        tension: 0.4,
      },
      {
        label: 'Issues',
        data: movements.map(m => m.issues),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: false,
        tension: 0.4,
      },
      {
        label: 'Net Movement',
        data: movements.map(m => m.netMovement),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: false,
        tension: 0.4,
      },
    ],
  };

  const adjustmentsChartData = {
    labels: movements.map(m => new Date(m.date).toLocaleDateString()),
    datasets: [{
      label: 'Adjustments',
      data: movements.map(m => m.adjustments),
      backgroundColor: '#f59e0b',
      borderRadius: 4,
    }],
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    let yPosition = 20;

    doc.setFontSize(20);
    doc.text('Inventory Movement Report', 20, yPosition);
    yPosition += 20;

    doc.setFontSize(14);
    doc.text(`Total Days: ${movements.length}`, 20, yPosition);
    yPosition += 20;

    doc.text('Movement Details:', 20, yPosition);
    yPosition += 10;
    movements.forEach((movement) => {
      doc.setFontSize(10);
      doc.text(`${new Date(movement.date).toLocaleDateString()}: Receipts: ${movement.receipts}, Issues: ${movement.issues}, Adjustments: ${movement.adjustments}, Net: ${movement.netMovement}`, 30, yPosition);
      yPosition += 8;
    });

    doc.save('inventory_movement_report.pdf');
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    const movementDataSheet = [
      ['Date', 'Receipts', 'Issues', 'Adjustments', 'Net Movement'],
      ...movements.map(m => [m.date, m.receipts, m.issues, m.adjustments, m.netMovement])
    ];
    const sheet = XLSX.utils.aoa_to_sheet(movementDataSheet);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Inventory Movement');

    XLSX.writeFile(workbook, 'inventory_movement_report.xlsx');
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
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Inventory Movement Report</h1>
              <p className="mt-2 text-lg text-gray-500">Track inventory movements including receipts, issues, and adjustments.</p>
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
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Movement Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow p-6 flex flex-col items-center border border-blue-200">
              <span className="text-blue-600 text-sm mb-1 font-medium">Total Receipts</span>
              <span className="text-3xl font-bold text-blue-700">{movements.reduce((sum, m) => sum + m.receipts, 0)}</span>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow p-6 flex flex-col items-center border border-red-200">
              <span className="text-red-600 text-sm mb-1 font-medium">Total Issues</span>
              <span className="text-3xl font-bold text-red-700">{movements.reduce((sum, m) => sum + m.issues, 0)}</span>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow p-6 flex flex-col items-center border border-yellow-200">
              <span className="text-yellow-600 text-sm mb-1 font-medium">Total Adjustments</span>
              <span className="text-3xl font-bold text-yellow-700">{movements.reduce((sum, m) => sum + m.adjustments, 0)}</span>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow p-6 flex flex-col items-center border border-green-200">
              <span className="text-green-600 text-sm mb-1 font-medium">Net Movement</span>
              <span className="text-3xl font-bold text-green-700">{movements.reduce((sum, m) => sum + m.netMovement, 0)}</span>
            </div>
          </div>
        </section>

        {/* Charts */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Movement Trends</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Movements</h3>
              <div className="h-64">
                <Line
                  data={movementChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'top' } },
                    scales: { y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.1)' } }, x: { grid: { color: 'rgba(0, 0, 0, 0.1)' } } }
                  }}
                />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Adjustments</h3>
              <div className="h-64">
                <Bar
                  data={adjustmentsChartData}
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

        {/* Movement Table */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Detailed Movement Data</h2>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Date</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Receipts</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Issues</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Adjustments</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-600">Net Movement</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 px-4">{new Date(movement.date).toLocaleDateString()}</td>
                      <td className="py-2 px-4">{movement.receipts}</td>
                      <td className="py-2 px-4">{movement.issues}</td>
                      <td className="py-2 px-4">{movement.adjustments}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                          movement.netMovement > 0 ? 'bg-green-100 text-green-800' :
                          movement.netMovement < 0 ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {movement.netMovement > 0 ? '+' : ''}{movement.netMovement}
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
