import React from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiStar, FiTrendingUp, FiAlertTriangle } from 'react-icons/fi';

interface CustomerSegment {
  name: string;
  total: number;
  count: number;
  last_purchase: string;
  segment_label: string;
  clv: number;
  churn_risk: number;
}

interface CustomerSegmentationPanelProps {
  segments: CustomerSegment[];
  loading?: boolean;
}

const CustomerSegmentationPanel: React.FC<CustomerSegmentationPanelProps> = ({
  segments,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Group customers by segment
  const segmentGroups = segments.reduce((acc, customer) => {
    const segment = customer.segment_label || 'Other';
    if (!acc[segment]) {
      acc[segment] = [];
    }
    acc[segment].push(customer);
    return acc;
  }, {} as Record<string, CustomerSegment[]>);

  const getSegmentIcon = (segment: string) => {
    switch (segment.toLowerCase()) {
      case 'vip':
        return <FiStar className="w-5 h-5 text-yellow-600" />;
      case 'at-risk':
        return <FiAlertTriangle className="w-5 h-5 text-red-600" />;
      case 'frequent':
        return <FiTrendingUp className="w-5 h-5 text-green-600" />;
      default:
        return <FiUsers className="w-5 h-5 text-blue-600" />;
    }
  };

  const getSegmentColor = (segment: string) => {
    switch (segment.toLowerCase()) {
      case 'vip':
        return 'bg-yellow-50 border-yellow-200';
      case 'at-risk':
        return 'bg-red-50 border-red-200';
      case 'frequent':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-50 rounded-lg">
          <FiUsers className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Customer Segmentation</h3>
          <p className="text-sm text-gray-600">AI-powered customer behavior analysis</p>
        </div>
      </div>

      {Object.keys(segmentGroups).length === 0 ? (
        <div className="text-center py-8">
          <FiUsers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No customer segments available</p>
          <p className="text-sm text-gray-400 mt-1">More customer data needed for segmentation</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(segmentGroups).map(([segment, customers], index) => {
            const totalRevenue = customers.reduce((sum, c) => sum + c.total, 0);
            const avgCLV = customers.reduce((sum, c) => sum + c.clv, 0) / customers.length;
            const churnRisk = customers.reduce((sum, c) => sum + c.churn_risk, 0) / customers.length;

            return (
              <motion.div
                key={segment}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border ${getSegmentColor(segment)}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  {getSegmentIcon(segment)}
                  <h4 className="font-semibold text-gray-900">{segment}</h4>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Customers</span>
                    <span className="font-medium text-gray-900">{customers.length}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Revenue</span>
                    <span className="font-medium text-gray-900">
                      ${totalRevenue.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg CLV</span>
                    <span className="font-medium text-gray-900">
                      ${Math.round(avgCLV).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Churn Risk</span>
                    <span className={`font-medium ${churnRisk > 0.5 ? 'text-red-600' : 'text-green-600'}`}>
                      {Math.round(churnRisk * 100)}%
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {segments.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{segments.length}</p>
              <p className="text-xs text-gray-600">Total Customers</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                ${segments.reduce((sum, c) => sum + c.total, 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-600">Total Revenue</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(segments.reduce((sum, c) => sum + c.clv, 0) / segments.length).toLocaleString()}
              </p>
              <p className="text-xs text-gray-600">Avg CLV</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {Math.round((segments.filter(c => c.churn_risk > 0.5).length / segments.length) * 100)}%
              </p>
              <p className="text-xs text-gray-600">High Churn Risk</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default CustomerSegmentationPanel;
