import React from 'react';
import { motion } from 'framer-motion';

interface SalesBreakdownChartProps {
  salesData: Array<{ label: string; value: number }>;
}

const COLORS = [
  { bg: 'bg-blue-500', text: 'text-blue-500', from: 'from-blue-500', to: 'to-blue-400' },
  { bg: 'bg-purple-500', text: 'text-purple-500', from: 'from-purple-500', to: 'to-purple-400' },
  { bg: 'bg-indigo-500', text: 'text-indigo-500', from: 'from-indigo-500', to: 'to-indigo-400' },
  { bg: 'bg-cyan-500', text: 'text-cyan-500', from: 'from-cyan-500', to: 'to-cyan-400' },
  { bg: 'bg-emerald-500', text: 'text-emerald-500', from: 'from-emerald-500', to: 'to-emerald-400' },
  { bg: 'bg-amber-500', text: 'text-amber-500', from: 'from-amber-500', to: 'to-amber-400' },
];

const getPercentage = (value: number, total: number) => {
  return Math.round((value / total) * 100);
};

export default function SalesBreakdownChart({ salesData }: SalesBreakdownChartProps) {
  if (!salesData || salesData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-center justify-center h-64">
        <p className="text-gray-400">No sales breakdown data available</p>
      </div>
    );
  }

  // Sort data by value in descending order
  const sortedData = [...salesData].sort((a, b) => b.value - a.value);
  const totalSales = sortedData.reduce((sum, item) => sum + item.value, 0);
  const maxValue = Math.max(...sortedData.map(item => item.value), 1);
  
  // Take top 5 and group the rest as "Other"
  const topItems = sortedData.slice(0, 5);
  const otherItems = sortedData.slice(5);
  const otherTotal = otherItems.reduce((sum, item) => sum + item.value, 0);
  
  const chartData = otherTotal > 0 ? [...topItems, { label: 'Other', value: otherTotal }] : topItems;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Sales Breakdown</h3>
          <p className="text-sm text-gray-500">By category</p>
        </div>
        <div className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full">
          {chartData.length} categories
        </div>
      </div>

      <div className="space-y-4">
        {chartData.map((item, index) => {
          const percentage = getPercentage(item.value, totalSales);
          const colorIndex = index % COLORS.length;
          const color = COLORS[colorIndex];
          const widthPercentage = (item.value / maxValue) * 100;
          
          return (
            <div key={item.label} className="relative group">
              <div className="flex justify-between text-sm mb-1">
                <div className="flex items-center">
                  <span className={`w-2 h-2 rounded-full ${color.bg} mr-2`} />
                  <span className="font-medium text-gray-700 truncate pr-2" title={item.label}>
                    {item.label}
                  </span>
                </div>
                <span className="font-semibold text-gray-900 whitespace-nowrap">
                  ${item.value.toLocaleString()}
                </span>
              </div>
              
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPercentage}%` }}
                  transition={{ duration: 0.8, delay: index * 0.05 }}
                  className={`h-full rounded-full bg-gradient-to-r ${color.from} ${color.to}`}
                />
              </div>
              
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">
                  {percentage}% of total
                </span>
                <span className="text-xs font-medium text-gray-500">
                  {((item.value / totalSales) * 100).toFixed(1)}%
                </span>
              </div>
              
              {item.label === 'Other' && otherItems.length > 0 && (
                <div className="mt-2 pl-4 border-l-2 border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Includes:</p>
                  <div className="flex flex-wrap gap-1">
                    {otherItems.map((otherItem, i) => (
                      <span key={i} className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">
                        {otherItem.label} (${otherItem.value.toLocaleString()})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500">Total Sales</p>
            <p className="text-lg font-semibold text-gray-800">
              ${totalSales.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Categories</p>
            <p className="text-lg font-semibold text-gray-800">
              {salesData.length}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 