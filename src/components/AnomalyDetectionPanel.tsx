import React from 'react';
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';

interface Anomaly {
  date: string;
  value: number;
  anomaly: boolean;
}

interface AnomalyDetectionPanelProps {
  anomalies: Anomaly[];
  loading?: boolean;
}

const AnomalyDetectionPanel: React.FC<AnomalyDetectionPanelProps> = ({
  anomalies,
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

  const anomalyCount = anomalies.filter(a => a.anomaly).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-red-50 rounded-lg">
          <FiAlertTriangle className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Anomaly Detection</h3>
          <p className="text-sm text-gray-600">AI-powered sales anomaly detection</p>
        </div>
      </div>

      {anomalies.length === 0 ? (
        <div className="text-center py-8">
          <FiTrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No anomalies detected</p>
          <p className="text-sm text-gray-400 mt-1">Sales patterns are within normal ranges</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">
              {anomalyCount} anomal{anomalyCount !== 1 ? 'ies' : 'y'} detected
            </span>
            <span className="text-xs text-gray-500">
              Last 6 months
            </span>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {anomalies.filter(a => a.anomaly).slice(0, 5).map((anomaly, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1 bg-red-100 rounded">
                    <FiTrendingDown className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(anomaly.date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-600">Unusual sales activity</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-600">
                    ${anomaly.value.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">Revenue</p>
                </div>
              </motion.div>
            ))}
          </div>

          {anomalyCount > 5 && (
            <p className="text-xs text-gray-500 mt-3 text-center">
              +{anomalyCount - 5} more anomalies detected
            </p>
          )}
        </>
      )}
    </motion.div>
  );
};

export default AnomalyDetectionPanel;
