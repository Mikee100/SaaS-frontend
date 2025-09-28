"use client";
import { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { FaExpand, FaDownload } from 'react-icons/fa';

interface InteractiveChartProps {
  data: Record<string, unknown>[];
  type: 'line' | 'bar' | 'pie';
  title: string;
  xKey: string;
  yKey: string | string[];
  colors?: string[];
  height?: number;
  onDrillDown?: (data: Record<string, unknown>) => void;
}

const DEFAULT_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];

export default function InteractiveChart({
  data,
  type,
  title,
  xKey,
  yKey,
  colors = DEFAULT_COLORS,
  height = 300,
  onDrillDown,
}: InteractiveChartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExport = () => {
    // Simple CSV export
    const headers = [xKey, ...(Array.isArray(yKey) ? yKey : [yKey])];
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => row[header] || '').join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {Array.isArray(yKey) ? (
              yKey.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6, onClick: onDrillDown }}
                />
              ))
            ) : (
              <Line
                type="monotone"
                dataKey={yKey}
                stroke={colors[0]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6, onClick: onDrillDown }}
              />
            )}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {Array.isArray(yKey) ? (
              yKey.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[index % colors.length]}
                  onClick={onDrillDown}
                />
              ))
            ) : (
              <Bar
                dataKey={yKey}
                fill={colors[0]}
                onClick={onDrillDown}
              />
            )}
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={Array.isArray(yKey) ? yKey[0] : yKey}
              onClick={onDrillDown}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        );

      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${isExpanded ? 'fixed inset-4 z-50 bg-white' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            title="Export as CSV"
          >
            <FaDownload className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            title={isExpanded ? "Minimize" : "Expand"}
          >
            <FaExpand className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div style={{ height: isExpanded ? 'calc(100vh - 120px)' : height }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {isExpanded && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setIsExpanded(false)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
