"use client";
import { FaBox, FaExclamationTriangle, FaChartBar, FaArrowUp, FaArrowDown, FaCheckCircle } from 'react-icons/fa';

interface InventoryAnalyticsProps {
  analytics: {
    lowStockItems?: number;
    overstockItems?: number;
    inventoryTurnover?: number;
    stockoutRate?: number;
  };
}

export default function InventoryAnalytics({ analytics }: InventoryAnalyticsProps) {
  const inventoryCards = [
    {
      icon: <FaExclamationTriangle className="w-5 h-5 text-red-600" />,
      label: "Low Stock Items",
      value: analytics.lowStockItems || 0,
      description: "Items below threshold",
      color: "text-red-600",
      bgColor: "bg-red-50",
      status: "warning"
    },
    {
      icon: <FaBox className="w-5 h-5 text-orange-600" />,
      label: "Overstock Items",
      value: analytics.overstockItems || 0,
      description: "Excess inventory",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      status: "warning"
    },
    {
      icon: <FaChartBar className="w-5 h-5 text-blue-600" />,
      label: "Inventory Turnover",
      value: analytics.inventoryTurnover || 0,
      description: "Times per year",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      status: "good"
    },
    {
      icon: <FaCheckCircle className="w-5 h-5 text-green-600" />,
      label: "Stockout Rate",
      value: `${((analytics.stockoutRate || 0) * 100).toFixed(1)}%`,
      description: "Out of stock frequency",
      color: "text-green-600",
      bgColor: "bg-green-50",
      status: "good"
    }
  ];

  const getStatusIcon = (status: string) => {
    if (status === 'warning') return <FaArrowUp className="w-4 h-4 text-red-600" />;
    if (status === 'good') return <FaArrowDown className="w-4 h-4 text-green-600" />;
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <FaBox className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-800">Inventory Analytics</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {inventoryCards.map((card, index) => (
          <div key={index} className={`p-4 ${card.bgColor} rounded-lg border`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {card.icon}
                <span className="text-sm font-medium text-gray-700">{card.label}</span>
              </div>
              {getStatusIcon(card.status)}
            </div>
            <div className="mb-1">
              <span className={`text-2xl font-bold ${card.color}`}>{card.value}</span>
            </div>
            <p className="text-xs text-gray-600">{card.description}</p>
          </div>
        ))}
      </div>
      
      {/* Recommendations */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Recommendations</h3>
        <div className="space-y-2 text-sm text-gray-600">
          {analytics.lowStockItems && analytics.lowStockItems > 5 && (
            <p>• Consider restocking {analytics.lowStockItems} items to prevent stockouts</p>
          )}
          {analytics.overstockItems && analytics.overstockItems > 3 && (
            <p>• Review pricing strategy for {analytics.overstockItems} overstocked items</p>
          )}
          {analytics.inventoryTurnover && analytics.inventoryTurnover < 4 && (
            <p>• Inventory turnover is below industry average - consider promotions</p>
          )}
          {analytics.stockoutRate && analytics.stockoutRate > 0.05 && (
            <p>• Stockout rate is high - improve demand forecasting</p>
          )}
        </div>
      </div>
    </div>
  );
} 