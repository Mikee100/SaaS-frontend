"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiGet } from '@/utils/api';
import SalesTargetComponent from '@/components/SalesTarget';
import { useTenant } from '@/hooks/useTenant';
import { getPdfCurrency } from '@/utils/pdfTemplate';
import type { PdfTemplate } from '@/utils/pdfTemplate';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js';
import {
  TagIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  TrophyIcon,
  FireIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
);

interface SaleItem {
  date: string;
  total?: number;
}

interface Targets {
  daily: number;
  weekly: number;
  monthly: number;
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
  label?: string;
}

export default function SalesTargetsPage() {
  const { data: tenantData } = useTenant();
  const pdfTemplate = (tenantData?.pdfTemplate || {}) as PdfTemplate;
  const currency = getPdfCurrency(tenantData, pdfTemplate);

  const [targets, setTargets] = useState<Targets>({ daily: 0, weekly: 0, monthly: 0 });
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SaleItem[]>([]);
  const [activePeriod, setActivePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [salesByDay, setSalesByDay] = useState<Record<string, number>>({});
  const [salesByWeek, setSalesByWeek] = useState<Record<string, number>>({});
  const [salesByMonth, setSalesByMonth] = useState<Record<string, number>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [targetsRes, dashboardRes, dailyRes, weeklyRes, monthlyRes] = await Promise.all([
        apiGet<Targets>('/sales-targets'),
        apiGet<{ recentActivity?: { sales?: SaleItem[] } }>('/analytics/dashboard'),
        apiGet<Record<string, number>>('/analytics/sales/daily').catch(() => ({})),
        apiGet<Record<string, number>>('/analytics/sales/weekly').catch(() => ({})),
        apiGet<Record<string, number>>('/analytics/sales/monthly').catch(() => ({})),
      ]);

      setTargets(targetsRes);
      setSalesByDay(dailyRes);
      setSalesByWeek(weeklyRes);
      setSalesByMonth(monthlyRes);
      setSalesData(dashboardRes.recentActivity?.sales || []);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calculatePerformance = useMemo(() => {
    const now = new Date();
    const perf: TargetPerformance[] = [];
    const t = targets;

    const todayStr = now.toISOString().slice(0, 10);
    const dailyRevenue = salesByDay[todayStr] ?? 0;
    const dailyProgress = t.daily > 0 ? (dailyRevenue / t.daily) * 100 : 0;

    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    let weeklyRevenue = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const k = d.toISOString().slice(0, 10);
      weeklyRevenue += salesByDay[k] ?? 0;
    }
    const weeklyProgress = t.weekly > 0 ? (weeklyRevenue / t.weekly) * 100 : 0;

    const monthKey = now.toISOString().slice(0, 7);
    const monthlyActual = salesByMonth[monthKey] ?? 0;
    const monthlyProgress = t.monthly > 0 ? (monthlyActual / t.monthly) * 100 : 0;

    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    const daysRemainingMonth = Math.max(0, daysInMonth - now.getDate());

    perf.push({
      period: 'daily',
      target: t.daily,
      current: dailyRevenue,
      progress: dailyProgress,
      status: dailyProgress >= 100 ? 'ahead' : dailyProgress >= 75 ? 'on-track' : 'behind',
      streak: 0,
      bestStreak: 0,
      lastHit: null,
    });
    perf.push({
      period: 'weekly',
      target: t.weekly,
      current: weeklyRevenue,
      progress: weeklyProgress,
      status: weeklyProgress >= 100 ? 'ahead' : weeklyProgress >= 75 ? 'on-track' : 'behind',
      daysRemaining: 7 - dayOfWeek,
      streak: 0,
      bestStreak: 0,
      lastHit: null,
    });
    perf.push({
      period: 'monthly',
      target: t.monthly,
      current: monthlyActual,
      progress: monthlyProgress,
      status: monthlyProgress >= 100 ? 'ahead' : monthlyProgress >= 75 ? 'on-track' : 'behind',
      daysRemaining: daysRemainingMonth,
      streak: 0,
      bestStreak: 0,
      lastHit: null,
    });
    return perf;
  }, [targets, salesByDay, salesByWeek, salesByMonth]);

  const history = useMemo(() => {
    const hist: TargetHistory[] = [];
    const now = new Date();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const achieved = salesByDay[dateStr] ?? 0;
      hist.push({
        date: dateStr,
        period: 'daily',
        target: targets.daily,
        achieved,
        hit: targets.daily > 0 && achieved >= targets.daily,
        label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      });
    }

    const weekLabels = Object.keys(salesByWeek).sort();
    weekLabels.slice(-6).forEach(period => {
      const achieved = salesByWeek[period] ?? 0;
      hist.push({
        date: period,
        period: 'weekly',
        target: targets.weekly,
        achieved,
        hit: targets.weekly > 0 && achieved >= targets.weekly,
        label: period,
      });
    });

    const monthLabels = Object.keys(salesByMonth).sort();
    monthLabels.slice(-4).forEach(period => {
      const achieved = salesByMonth[period] ?? 0;
      hist.push({
        date: period,
        period: 'monthly',
        target: targets.monthly,
        achieved,
        hit: targets.monthly > 0 && achieved >= targets.monthly,
        label: period,
      });
    });

    hist.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return hist;
  }, [targets, salesByDay, salesByWeek, salesByMonth]);

  const dailyChartData = useMemo(() => {
    const days = 14;
    const labels: string[] = [];
    const actuals: number[] = [];
    const targetArr: number[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      labels.push(d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }));
      actuals.push(salesByDay[k] ?? 0);
      targetArr.push(targets.daily);
    }
    return { labels, actuals, targetArr };
  }, [salesByDay, targets.daily]);

  const progressPctData = useMemo(() => {
    const days = 14;
    const labels: string[] = [];
    const pcts: number[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      const actual = salesByDay[k] ?? 0;
      const pct = targets.daily > 0 ? Math.min(150, (actual / targets.daily) * 100) : 0;
      labels.push(d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }));
      pcts.push(Math.round(pct * 10) / 10);
    }
    return { labels, pcts };
  }, [salesByDay, targets.daily]);

  const hitRateStats = useMemo(() => {
    const dailyHistory = history.filter(h => h.period === 'daily');
    const hit = dailyHistory.filter(h => h.hit).length;
    const total = dailyHistory.length;
    const hitRate = total > 0 ? (hit / total) * 100 : 0;
    // Current streak: count consecutive hits from most recent (first in list after sort desc)
    let streak = 0;
    for (const h of dailyHistory) {
      if (h.hit) streak++;
      else break;
    }
    // Best streak: scan chronologically (reverse for asc order by date)
    const byDate = [...dailyHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let bestStreak = 0;
    let cur = 0;
    for (const h of byDate) {
      if (h.hit) cur++;
      else {
        bestStreak = Math.max(bestStreak, cur);
        cur = 0;
      }
    }
    bestStreak = Math.max(bestStreak, cur);
    return { hitRate, streak, bestStreak, hit, total };
  }, [history]);

  const targetVsActualChart = useMemo(() => ({
    labels: dailyChartData.labels,
    datasets: [
      {
        label: 'Target',
        data: dailyChartData.targetArr,
        backgroundColor: 'rgba(148, 163, 184, 0.3)',
        borderColor: 'rgb(148, 163, 184)',
        borderWidth: 1,
        borderDash: [4, 4],
        fill: false,
      },
      {
        label: 'Actual',
        data: dailyChartData.actuals,
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  }), [dailyChartData]);

  const progressTrendChart = useMemo(() => ({
    labels: progressPctData.labels,
    datasets: [{
      label: '% of target',
      data: progressPctData.pcts,
      borderColor: 'rgb(34, 197, 94)',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      fill: true,
      tension: 0.3,
    }],
  }), [progressPctData]);

  const hitRateDoughnut = useMemo(() => ({
    labels: ['Hit target', 'Missed'],
    datasets: [{
      data: [hitRateStats.hit, hitRateStats.total - hitRateStats.hit],
      backgroundColor: ['rgb(34, 197, 94)', 'rgb(239, 68, 68)'],
      borderWidth: 0,
    }],
  }), [hitRateStats]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Sales Targets & Performance</h1>
            <p className="text-gray-600 mt-1">Track progress, hit targets, and see trends at a glance</p>
          </div>
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </header>

        {/* Hero summary cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {calculatePerformance.map((p) => {
            const statusColor = p.status === 'ahead' ? 'green' : p.status === 'on-track' ? 'blue' : 'amber';
            const Icon = p.period === 'daily' ? CalendarDaysIcon : p.period === 'weekly' ? ChartBarIcon : TagIcon;
            return (
              <div
                key={p.period}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500 capitalize flex items-center gap-2">
                    <Icon className="w-4 h-4" /> {p.period}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    p.status === 'ahead' ? 'bg-green-100 text-green-800' :
                    p.status === 'on-track' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {p.status === 'ahead' ? 'Ahead' : p.status === 'on-track' ? 'On track' : 'Behind'}
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {currency} {(p.current ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-sm text-gray-500 mt-0.5">
                  of {currency} {(p.target ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} target
                </div>
                <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      p.status === 'ahead' ? 'bg-green-500' : p.status === 'on-track' ? 'bg-blue-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(p.progress, 100)}%` }}
                  />
                </div>
                <div className="text-xs font-medium text-gray-500 mt-1">{p.progress.toFixed(0)}%</div>
                {p.daysRemaining != null && p.daysRemaining > 0 && (
                  <div className="text-xs text-gray-400 mt-1">{p.daysRemaining} days left in period</div>
                )}
              </div>
            );
          })}
        </section>

        {/* Charts row */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5 text-indigo-600" />
              Target vs Actual (last 14 days)
            </h2>
            <div className="h-64">
              <Bar
                data={targetVsActualChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${currency} ${(ctx.raw as number).toLocaleString()}`,
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: 'rgba(0,0,0,0.06)' },
                      ticks: { callback: (v) => currency + ' ' + (typeof v === 'number' ? v.toLocaleString() : v) },
                    },
                    x: { grid: { display: false }, ticks: { maxRotation: 45 } },
                  },
                }}
              />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />
              Daily progress (% of target)
            </h2>
            <div className="h-64">
              <Line
                data={progressTrendChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => `${(ctx.raw as number).toFixed(1)}% of daily target`,
                      },
                    },
                  },
                  scales: {
                    y: {
                      min: 0,
                      max: 150,
                      grid: { color: 'rgba(0,0,0,0.06)' },
                      ticks: { callback: (v) => (typeof v === 'number' ? v : 0) + '%' },
                    },
                    x: { grid: { display: false }, ticks: { maxRotation: 45 } },
                  },
                }}
              />
            </div>
          </div>
        </section>

        {/* Hit rate & streaks */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col items-center justify-center">
            <h2 className="text-sm font-medium text-gray-500 mb-2">Hit rate (last 14 days)</h2>
            <div className="relative w-32 h-32">
              <Doughnut
                data={hitRateDoughnut}
                options={{
                  cutout: '60%',
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} days` } },
                  },
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{hitRateStats.hitRate.toFixed(0)}%</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{hitRateStats.hit} of {hitRateStats.total} days hit target</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col justify-center">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Streaks</h2>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <FireIcon className="w-8 h-8 text-amber-500" />
                <div>
                  <div className="text-xl font-bold text-gray-900">{hitRateStats.streak}</div>
                  <div className="text-xs text-gray-500">Current streak (days)</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrophyIcon className="w-8 h-8 text-indigo-500" />
                <div>
                  <div className="text-xl font-bold text-gray-900">{hitRateStats.bestStreak}</div>
                  <div className="text-xs text-gray-500">Best streak (days)</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Target settings (full width) */}
        <section className="mb-6">
          <SalesTargetComponent
            currentRevenue={calculatePerformance.reduce((s, p) => s + p.current, 0)}
            totalSales={salesData.length}
            filteredSales={salesData}
          />
        </section>

        {/* Performance history table (compact) */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Performance history</h2>
            <div className="flex rounded-lg bg-gray-100 p-0.5">
              {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setActivePeriod(period)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
                    activePeriod === period ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target ({currency})</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Achieved ({currency})</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history
                  .filter((r) => r.period === activePeriod)
                  .slice(0, 15)
                  .map((record, index) => (
                    <tr key={`${record.date}-${record.period}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {record.label ?? new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {(record.target ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {(record.achieved ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            record.hit ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {record.hit ? (
                            <><CheckCircleIcon className="w-3.5 h-3.5" /> Hit</>
                          ) : (
                            <><XCircleIcon className="w-3.5 h-3.5" /> Missed</>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {history.filter((r) => r.period === activePeriod).length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <ChartBarIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p>No {activePeriod} history yet. Set targets and make sales to see progress here.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
