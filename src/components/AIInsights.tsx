"use client";
import { FaBrain, FaLightbulb, FaExclamationTriangle, FaCheckCircle, FaChartLine, FaUsers, FaBox, FaBuilding, FaInfoCircle } from 'react-icons/fa';

interface AIInsightsProps {
  insights: {
    recommendations?: string[];
    anomalies?: string[];
    businessInsights?: string[];
    salesInsights?: string[];
    customerInsights?: string[];
    inventoryInsights?: string[];
    operationalInsights?: string[];
  };
  category?: string;
}

export default function AIInsights({ insights, category }: AIInsightsProps) {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'recommendation':
        return <FaLightbulb className="w-4 h-4 text-blue-600" />;
      case 'anomaly':
        return <FaExclamationTriangle className="w-4 h-4 text-orange-600" />;
      case 'business':
        return <FaBuilding className="w-4 h-4 text-purple-600" />;
      case 'sales':
        return <FaChartLine className="w-4 h-4 text-green-600" />;
      case 'customer':
        return <FaUsers className="w-4 h-4 text-indigo-600" />;
      case 'inventory':
        return <FaBox className="w-4 h-4 text-emerald-600" />;
      case 'operational':
        return <FaInfoCircle className="w-4 h-4 text-teal-600" />;
      default:
        return <FaBrain className="w-4 h-4 text-gray-600" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'recommendation':
        return 'bg-blue-50 border-blue-200';
      case 'anomaly':
        return 'bg-orange-50 border-orange-200';
      case 'business':
        return 'bg-purple-50 border-purple-200';
      case 'sales':
        return 'bg-green-50 border-green-200';
      case 'customer':
        return 'bg-indigo-50 border-indigo-200';
      case 'inventory':
        return 'bg-emerald-50 border-emerald-200';
      case 'operational':
        return 'bg-teal-50 border-teal-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const insightSections = [
    { key: 'recommendations', label: 'Recommendations', type: 'recommendation' },
    { key: 'anomalies', label: 'Anomalies Detected', type: 'anomaly' },
    { key: 'businessInsights', label: 'Business Insights', type: 'business' },
    { key: 'salesInsights', label: 'Sales Insights', type: 'sales' },
    { key: 'customerInsights', label: 'Customer Insights', type: 'customer' },
    { key: 'inventoryInsights', label: 'Inventory Insights', type: 'inventory' },
    { key: 'operationalInsights', label: 'Operational Insights', type: 'operational' }
  ];

  const hasInsights = insightSections.some(section => {
    const items = insights[section.key as keyof typeof insights];
    return Array.isArray(items) && items.length > 0;
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <FaBrain className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-800">AI Insights</h2>
        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">AI Powered</span>
        {category && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            {category}
          </span>
        )}
      </div>

      {!hasInsights ? (
        <div className="text-center py-8">
          <FaBrain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No AI insights available yet</p>
          <p className="text-sm text-gray-400 mt-1">Insights will be generated as you interact with your data</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {insightSections.map((section) => {
            const items = insights[section.key as keyof typeof insights] as string[] | undefined;
            if (!items || items.length === 0) return null;

            return (
              <div key={section.key}>
                <div className="flex items-center gap-2 mb-4">
                  {getInsightIcon(section.type)}
                  <h3 className="text-sm font-semibold text-gray-800">{section.label}</h3>
                </div>
                <div className="space-y-3">
                  {items!.map((item, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${getInsightColor(section.type)}`}>
                      <div className="flex items-start gap-3">
                        {getInsightIcon(section.type)}
                        <p className="text-sm text-gray-700">{item}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Status */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaBrain className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">AI Analysis Status</span>
          </div>
          <div className="flex items-center gap-2">
            <FaCheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-600 font-medium">Active</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          AI continuously analyzes your data to provide actionable insights and detect patterns
        </p>
      </div>
    </div>
  );
}
