import React from 'react';
import { motion } from 'framer-motion';
import { FiMessageSquare } from 'react-icons/fi';

interface AISummaryPanelProps {
  summary: string;
  loading?: boolean;
}

const AISummaryPanel: React.FC<AISummaryPanelProps> = ({ summary, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-50 rounded-lg">
         
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Business Summary</h3>
          <p className="text-sm text-gray-600">Intelligent insights and recommendations</p>
        </div>
      </div>

      {!summary || summary === 'AI summary generation failed.' ? (
        <div className="text-center py-8">
          <FiMessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">AI summary not available</p>
          <p className="text-sm text-gray-400 mt-1">Summary will be generated with more data</p>
        </div>
      ) : (
        <div className="prose prose-sm max-w-none">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <FiMessageSquare className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-800 leading-relaxed">
                {summary.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-2 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AISummaryPanel;
