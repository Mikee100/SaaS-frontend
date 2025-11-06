"use client";
import { useState, useEffect } from 'react';
import { apiGet } from '@/utils/api';
import SalesTargetComponent from '@/components/SalesTarget';
import {
  TagIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

// Define a minimal type for sales items
interface SaleItem {
  date: string;
  total?: number;
}

interface TargetPerformance {
  period: 'daily' | 'weekly' | 'monthly';
  target: number;
  current: number;
  progress: number;
  status: 'ahead' | 'behind' | 'on-track';
  daysRemaining?: number;
  streak: number;
  bestStreak: number;
  lastHit: string | null;
}

interface TargetHistory {
  date: string;
  period: 'daily' | 'weekly' | 'monthly';
  target: number;
  achieved: number;
  hit: boolean;
}

export default function SalesTargetsPage() {
  const [performance, setPerformance] = useState<TargetPerformance[]>([]);
  const [history, setHistory] = useState<TargetHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SaleItem[]>([]);
  const [activePeriod, setActivePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Load data on mount
  useEffect(() => {
    // Inline the function to avoid dependency warning
    const loadTargetsAndPerformance = async () => {
      setLoading(true);
      try {
        // Load analytics data for performance calculation
        const analyticsData: { recentActivity?: { sales?: SaleItem[] } } = await apiGet('/analytics/dashboard');
        const sales = analyticsData.recentActivity?.sales || [];
        setSalesData(sales);

        // Calculate performance for each period (mock targets for now)
        const mockTargets = { daily: 5000, weekly: 25000, monthly: 100000 };
        const performanceData = calculatePerformance(mockTargets, sales);
        setPerformance(performanceData);

        // Load target history (mock data for now - you can implement actual history tracking)
        const historyData = generateTargetHistory(mockTargets, sales);
        setHistory(historyData);

      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTargetsAndPerformance();
  }, []);

  const calculatePerformance = (targets: { daily: number; weekly: number; monthly: number }, sales: SaleItem[]): TargetPerformance[] => {
    const now = new Date();
    const performance: TargetPerformance[] = [];

    // Daily performance
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todaySales = sales.filter(sale => new Date(sale.date) >= today);
    const dailyRevenue = todaySales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const dailyProgress = targets.daily > 0 ? (dailyRevenue / targets.daily) * 100 : 0;

    performance.push({
      period: 'daily',
      target: targets.daily,
      current: dailyRevenue,
      progress: dailyProgress,
      status: dailyProgress >= 100 ? 'ahead' : dailyProgress >= 75 ? 'on-track' : 'behind',
      streak: 5, // Mock streak data
      bestStreak: 12,
      lastHit: '2024-01-15'
    });

    // Weekly performance
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const weekSales = sales.filter(sale => new Date(sale.date) >= weekStart);
    const weeklyRevenue = weekSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const weeklyProgress = targets.weekly > 0 ? (weeklyRevenue / targets.weekly) * 100 : 0;

    performance.push({
      period: 'weekly',
      target: targets.weekly,
      current: weeklyRevenue,
      progress: weeklyProgress,
      status: weeklyProgress >= 100 ? 'ahead' : weeklyProgress >= 75 ? 'on-track' : 'behind',
      daysRemaining: 7 - now.getDay(),
      streak: 3,
      bestStreak: 8,
      lastHit: '2024-01-12'
    });

    // Monthly performance
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthSales = sales.filter(sale => new Date(sale.date) >= monthStart);
    const monthlyRevenue = monthSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const monthlyProgress = targets.monthly > 0 ? (monthlyRevenue / targets.monthly) * 100 : 0;

    // Calculate days remaining in month
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysRemaining = Math.ceil((lastDayOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    performance.push({
      period: 'monthly',
      target: targets.monthly,
      current: monthlyRevenue,
      progress: monthlyProgress,
      status: monthlyProgress >= 100 ? 'ahead' : monthlyProgress >= 75 ? 'on-track' : 'behind',
      daysRemaining,
      streak: 2,
      bestStreak: 6,
      lastHit: '2024-01-10'
    });

    return performance;
  };

  const generateTargetHistory = (targets: { daily: number; weekly: number; monthly: number }, sales: SaleItem[]): TargetHistory[] => {
    const history: TargetHistory[] = [];
    const now = new Date();

    // Generate daily history for the last 21 days
    for (let i = 20; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      const daySales = sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startOfDay && saleDate < endOfDay;
      });
      const achieved = daySales.reduce((sum, sale) => sum + (sale.total || 0), 0);

      history.push({
        date: date.toISOString().split('T')[0],
        period: 'daily',
        target: targets.daily,
        achieved,
        hit: achieved >= targets.daily
      });
    }

    // Generate weekly history for the last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - (i * 7));
      const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7);

      const weekSales = sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= weekStart && saleDate < weekEnd;
      });
      const achieved = weekSales.reduce((sum, sale) => sum + (sale.total || 0), 0);

      history.push({
        date: weekStart.toISOString().split('T')[0],
        period: 'weekly',
        target: targets.weekly,
        achieved,
        hit: achieved >= targets.weekly
      });
    }

    // Generate monthly history for the last 3 months
    for (let i = 2; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const monthSales = sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= monthStart && saleDate < monthEnd;
      });
      const achieved = monthSales.reduce((sum, sale) => sum + (sale.total || 0), 0);

      history.push({
        date: monthStart.toISOString().split('T')[0],
        period: 'monthly',
        target: targets.monthly,
        achieved,
        hit: achieved >= targets.monthly
      });
    }

    // Sort history by date descending
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return history;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Targets & Performance</h1>
        <p className="text-gray-600">Track your progress towards hitting daily, weekly, and monthly sales targets</p>
      </div>

    
      {/* Sales Target Component */}
      <SalesTargetComponent
        currentRevenue={performance.reduce((sum, perf) => sum + perf.current, 0)}
        totalSales={salesData.length}
        filteredSales={salesData}
      />

      {/* Performance History */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <ChartBarIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Performance History</h2>
        </div>

        {/* Period Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          {(['daily', 'weekly', 'monthly'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setActivePeriod(period)}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md capitalize transition-colors ${
                activePeriod === period
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {period}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Achieved</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {history
                .filter(record => record.period === activePeriod)
                .slice(0, 20)
                .map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {record.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${record.target.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${record.achieved.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        record.hit
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {record.hit ? (
                          <>
                            <CheckCircleIcon className="w-4 h-4 mr-1" />
                            Hit Target
                          </>
                        ) : (
                          <>
                            <XCircleIcon className="w-4 h-4 mr-1" />
                            Missed
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {history.filter(record => record.period === activePeriod).length === 0 && (
          <div className="text-center py-8">
            <TagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No {activePeriod} target history available yet.</p>
            <p className="text-sm text-gray-400">Start setting {activePeriod} targets to track your performance!</p>
          </div>
        )}
      </div>
    </div>
  );
}


