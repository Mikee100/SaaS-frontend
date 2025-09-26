"use client";
import { FaBrain, FaLightbulb, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

interface AIInsightsProps {
  insights: {
    recommendations?: string[];
    anomalies?: string[];
  };
}

export default function AIInsights({ insights }: AIInsightsProps) {
  const getInsightIcon = (type: 'recommendation' | 'anomaly') => {
    if (type === 'recommendation') return <FaLightbulb className="w-4 h-4 text-blue-600" />;
    return <FaExclamationTriangle className="w-4 h-4 text-orange-600" />;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <FaBrain className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-800">AI Insights</h2>
        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">AI Powered</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommendations */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FaLightbulb className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-800">Recommendations</h3>
          </div>
          <div className="space-y-3">
            {insights.recommendations?.map((recommendation, index) => (
              <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  {getInsightIcon('recommendation')}
                  <p className="text-sm text-gray-700">{recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Anomalies */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FaExclamationTriangle className="w-4 h-4 text-orange-600" />
            <h3 className="text-sm font-semibold text-gray-800">Anomalies Detected</h3>
          </div>
          <div className="space-y-3">
            {insights.anomalies?.map((anomaly, index) => (
              <div key={index} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-start gap-3">
                  {getInsightIcon('anomaly')}
                  <p className="text-sm text-gray-700">{anomaly}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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