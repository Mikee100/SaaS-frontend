import React from 'react';
import { motion } from 'framer-motion';
import { FiUserX, FiUserCheck } from 'react-icons/fi';

interface ChurnPrediction {
  name: string;
  total: number;
  count: number;
  last_purchase: string;
  churn_probability: number;
  churn_risk: number;
}

interface ChurnPredictionPanelProps {
  predictions: ChurnPrediction[];
  loading?: boolean;
}

const ChurnPredictionPanel: React.FC<ChurnPredictionPanelProps> = ({
  predictions,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const highRiskCount = predictions.filter(p => p.churn_risk === 1).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-red-50 rounded-lg">
          <FiUserX className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Churn Prediction</h3>
          <p className="text-sm text-gray-600">AI-powered customer churn risk analysis</p>
        </div>
      </div>

      {predictions.length === 0 ? (
        <div className="text-center py-8">
          <FiUserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No churn risk detected</p>
          <p className="text-sm text-gray-400 mt-1">Customer retention is healthy</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">
              {highRiskCount} high-risk customer{highRiskCount !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-gray-500">
              Last 6 months
            </span>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {predictions.filter(p => p.churn_risk === 1).slice(0, 5).map((prediction, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{prediction.name}</p>
                  <p className="text-xs text-gray-600">Last purchase: {new Date(prediction.last_purchase).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-600">
                    Risk: {(prediction.churn_probability * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">Churn Probability</p>
                </div>
              </motion.div>
            ))}
          </div>

          {highRiskCount > 5 && (
            <p className="text-xs text-gray-500 mt-3 text-center">
              +{highRiskCount - 5} more high-risk customers
            </p>
          )}
        </>
      )}
    </motion.div>
  );
};

export default ChurnPredictionPanel;
