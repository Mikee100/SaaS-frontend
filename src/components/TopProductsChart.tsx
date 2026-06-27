import React from 'react';
import { motion } from 'framer-motion';

interface TopProductsChartProps {
  products: Array<{ name: string; sales: number }>;
}

const colors = [
  'from-blue-500 to-blue-400',
  'from-purple-500 to-purple-400',
  'from-indigo-500 to-indigo-400',
  'from-cyan-500 to-cyan-400',
  'from-emerald-500 to-emerald-400',
  'from-amber-500 to-amber-400',
  'from-rose-500 to-rose-400',
  'from-fuchsia-500 to-fuchsia-400',
];

export default function TopProductsChart({ products }: TopProductsChartProps) {
  if (!products || products.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-center justify-center h-64">
        <p className="text-gray-400">No product data available</p>
      </div>
    );
  }

  // Sort products by sales in descending order and take top 8
  const topProducts = [...products]
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 8);
    
  const maxSales = Math.max(...topProducts.map(p => p.sales), 1);
  const totalSales = topProducts.reduce((sum, p) => sum + p.sales, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Top Products</h3>
          <p className="text-sm text-gray-500">By sales volume</p>
        </div>
        <div className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full">
          {topProducts.length} products
        </div>
      </div>

      <div className="space-y-4">
        {topProducts.map((product, index) => {
          const percentage = ((product.sales / maxSales) * 100).toFixed(0);
          const colorClass = colors[index % colors.length];
          const itemKey = `${product.name}-${index}-${product.sales}`;
          
          return (
            <div key={itemKey} className="relative">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700 truncate pr-2" title={product.name}>
                  {product.name}
                </span>
                <span className="font-semibold text-gray-900 whitespace-nowrap">
                  {product.sales.toLocaleString()}
                </span>
              </div>
              
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, delay: index * 0.05 }}
                  className={`h-full rounded-full bg-gradient-to-r ${colorClass}`}
                />
              </div>
              
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">
                  {((product.sales / totalSales) * 100).toFixed(1)}% of total
                </span>
                <span className="text-xs font-medium text-gray-500">
                  {percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      {products.length > topProducts.length && (
        <div className="mt-4 text-center">
          <span className="text-xs text-gray-400">
            +{products.length - topProducts.length} more products
          </span>
        </div>
      )}
      
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500">Total Sales</p>
            <p className="text-lg font-semibold text-gray-800">
              {totalSales.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Avg. per Product</p>
            <p className="text-lg font-semibold text-gray-800">
              {Math.round(totalSales / products.length).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 