"use client";
import { FaChartLine, FaUsers, FaDollarSign, FaHeart, FaRocket } from 'react-icons/fa';


interface PerformanceMetricsProps {
  metrics: {
    customerLifetimeValue?: number;
    customerAcquisitionCost?: number;
    returnOnInvestment?: number;
    netPromoterScore?: number;
    conversionRate?: number;
    averageOrderValue?: number;
  };
}

export default function PerformanceMetrics({ metrics }: PerformanceMetricsProps) {
  const metricCards = [
    {
      icon: <FaUsers className="w-5 h-5 text-blue-600" />,
      label: "Customer Lifetime Value",
      value: `$${metrics.customerLifetimeValue?.toLocaleString() || '0'}`,
      description: "Average revenue per customer",
      color: "text-blue-600"
    },
    {
      icon: <FaDollarSign className="w-5 h-5 text-green-600" />,
      label: "Customer Acquisition Cost",
      value: `$${metrics.customerAcquisitionCost?.toLocaleString() || '0'}`,
      description: "Cost to acquire new customer",
      color: "text-green-600"
    },
    {
      icon: <FaChartLine className="w-5 h-5 text-purple-600" />,
      label: "Return on Investment",
      value: `${((metrics.returnOnInvestment || 0) * 100).toFixed(1)}%`,
      description: "Marketing ROI",
      color: "text-purple-600"
    },
    {
      icon: <FaHeart className="w-5 h-5 text-red-600" />,
      label: "Net Promoter Score",
      value: `${metrics.netPromoterScore || '0'}/10`,
      description: "Customer satisfaction",
      color: "text-red-600"
    },
    {

      label: "Conversion Rate",
      value: `${((metrics.conversionRate || 0) * 100).toFixed(1)}%`,
      description: "Visitor to customer rate",
      color: "text-orange-600"
    },
    {
      icon: <FaRocket className="w-5 h-5 text-indigo-600" />,
      label: "Average Order Value",
      value: `$${metrics.averageOrderValue?.toFixed(2) || '0'}`,
      description: "Per transaction value",
      color: "text-indigo-600"
    }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <FaChartLine className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-800">Performance Metrics</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricCards.map((metric, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              {metric.icon}
              <span className="text-sm font-medium text-gray-600">{metric.label}</span>
            </div>
            <div className="mb-1">
              <span className={`text-2xl font-bold ${metric.color}`}>{metric.value}</span>
            </div>
            <p className="text-xs text-gray-500">{metric.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}