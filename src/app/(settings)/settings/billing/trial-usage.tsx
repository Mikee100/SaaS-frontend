"use client";
import { useState, useEffect } from 'react';
import { apiGet } from '@/utils/api';
import { FaUsers, FaBox, FaStore, FaShoppingCart, FaClock, FaExclamationTriangle } from 'react-icons/fa';

interface TrialUsageData {
  isTrial: boolean;
  trialStart?: string;
  trialEnd?: string;
  daysRemaining?: number;
  usage?: {
    users: {
      current: number;
      limit: number;
      percentage: number;
      approachingLimit: boolean;
    };
    products: {
      current: number;
      limit: number;
      percentage: number;
      approachingLimit: boolean;
    };
    branches: {
      current: number;
      limit: number;
      percentage: number;
      approachingLimit: boolean;
    };
    salesThisMonth: {
      current: number;
      limit: number;
      percentage: number;
      approachingLimit: boolean;
    };
  };
  planName?: string;
}

export default function TrialUsagePage() {
  const [trialData, setTrialData] = useState<TrialUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrialUsage();
  }, []);

  const fetchTrialUsage = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/usage/trial') as TrialUsageData;
      setTrialData(data);
    } catch (err) {
      setError('Failed to load trial usage data');
      console.error('Error fetching trial usage:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    if (percentage >= 70) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getUsageIcon = (type: string) => {
    switch (type) {
      case 'users': return <FaUsers className="w-5 h-5" />;
      case 'products': return <FaBox className="w-5 h-5" />;
      case 'branches': return <FaStore className="w-5 h-5" />;
      case 'salesThisMonth': return <FaShoppingCart className="w-5 h-5" />;
      default: return null;
    }
  };

  const getUsageLabel = (type: string) => {
    switch (type) {
      case 'users': return 'Users';
      case 'products': return 'Products';
      case 'branches': return 'Branches';
      case 'salesThisMonth': return 'Sales This Month';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <FaExclamationTriangle className="w-5 h-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!trialData || !trialData.isTrial) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="text-center">
          <FaClock className="mx-auto h-12 w-12 text-blue-400" />
          <h3 className="mt-2 text-sm font-medium text-blue-800">Not on Trial</h3>
          <div className="mt-2 text-sm text-blue-700">
            You are not currently on a trial subscription. Trial usage monitoring is only available during trial periods.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Trial Usage Monitor</h2>
            <p className="text-gray-600 mt-1">
              Track your usage during the trial period for {trialData.planName}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Trial Period</div>
            <div className="text-lg font-semibold text-gray-900">
              {trialData.daysRemaining} days remaining
            </div>
            {trialData.trialEnd && (
              <div className="text-sm text-gray-500">
                Ends on {formatDate(trialData.trialEnd)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Usage Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {trialData.usage && Object.entries(trialData.usage).map(([key, metric]) => (
          <div key={key} className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-lg ${
                  metric.approachingLimit ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {getUsageIcon(key)}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{getUsageLabel(key)}</h3>
                  <p className="text-xs text-gray-500">
                    {metric.current} / {metric.limit === 0 ? 'Unlimited' : metric.limit}
                  </p>
                </div>
              </div>
              {metric.approachingLimit && (
                <FaExclamationTriangle className="w-5 h-5 text-yellow-500" />
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full ${getProgressColor(metric.percentage)}`}
                style={{ width: `${Math.min(metric.percentage, 100)}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center text-xs text-gray-600">
              <span>{metric.percentage.toFixed(1)}% used</span>
              {metric.approachingLimit && (
                <span className="text-yellow-600 font-medium">Approaching limit</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Trial Status */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Trial Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{trialData.daysRemaining}</div>
            <div className="text-sm text-gray-600">Days Remaining</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {trialData.usage ? Object.values(trialData.usage).filter(m => !m.approachingLimit).length : 0}
            </div>
            <div className="text-sm text-gray-600">Metrics Within Limits</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {trialData.usage ? Object.values(trialData.usage).filter(m => m.approachingLimit).length : 0}
            </div>
            <div className="text-sm text-gray-600">Approaching Limits</div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {trialData.usage && Object.values(trialData.usage).some(m => m.approachingLimit) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <FaExclamationTriangle className="w-5 h-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Usage Warning</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>You are approaching one or more usage limits. Consider upgrading your plan to avoid service interruptions.</p>
                <ul className="mt-2 list-disc list-inside">
                  {Object.entries(trialData.usage)
                    .filter(([_, metric]) => metric.approachingLimit)
                    .map(([key, _]) => (
                      <li key={key}>{getUsageLabel(key)} usage is over 80%</li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
