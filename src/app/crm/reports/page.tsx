"use client";

import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '@/utils/api';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';

interface ReportingSummary {
  totals: {
    pipelines: number;
    deals: number;
    openDealValue: number;
    tasks: number;
  };
  dealsByStage: Record<string, number>;
  tasksByStatus: {
    todo: number;
    inProgress: number;
    done: number;
  };
  usage?: Record<string, number>;
  limits?: Record<string, number | null>;
}

export default function CrmReportsPage() {
  const { user } = useUser();
  const canView = hasPermission(user, 'view_sales');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ReportingSummary | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!canView) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<ReportingSummary>('/crm/reports/summary');
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load CRM reports');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [canView]);

  const stageRows = useMemo(
    () => Object.entries(summary?.dealsByStage || {}).sort((a, b) => b[1] - a[1]),
    [summary],
  );

  if (!canView) {
    return <div className="p-4 text-sm text-slate-700">You do not have permission to view CRM reports.</div>;
  }

  if (loading) {
    return <div className="p-4 text-sm text-slate-700">Loading CRM reports...</div>;
  }

  return (
    <div className="p-4 text-[12px] text-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-base font-semibold">CRM Reports</h1>
        <div className="text-[11px] text-slate-500">Operational snapshot</div>
      </div>

      {error && <div className="mb-2 border border-red-300 bg-red-50 px-2 py-1 text-[11px] text-red-700">{error}</div>}

      <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className="border border-slate-200 bg-white p-2">
          <div className="text-[10px] uppercase text-slate-500">Pipelines</div>
          <div className="text-lg font-semibold">{summary?.totals?.pipelines ?? 0}</div>
        </div>
        <div className="border border-slate-200 bg-white p-2">
          <div className="text-[10px] uppercase text-slate-500">Deals</div>
          <div className="text-lg font-semibold">{summary?.totals?.deals ?? 0}</div>
        </div>
        <div className="border border-slate-200 bg-white p-2">
          <div className="text-[10px] uppercase text-slate-500">Open Deal Value</div>
          <div className="text-lg font-semibold">KES {(summary?.totals?.openDealValue ?? 0).toLocaleString()}</div>
        </div>
        <div className="border border-slate-200 bg-white p-2">
          <div className="text-[10px] uppercase text-slate-500">Tasks</div>
          <div className="text-lg font-semibold">{summary?.totals?.tasks ?? 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            Deals by Stage
          </div>
          <table className="min-w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-200 px-2 py-1 text-left">Stage</th>
                <th className="border border-slate-200 px-2 py-1 text-right">Deals</th>
              </tr>
            </thead>
            <tbody>
              {stageRows.map(([stage, count]) => (
                <tr key={stage}>
                  <td className="border border-slate-200 px-2 py-1">{stage}</td>
                  <td className="border border-slate-200 px-2 py-1 text-right">{count}</td>
                </tr>
              ))}
              {stageRows.length === 0 && (
                <tr>
                  <td colSpan={2} className="border border-slate-200 px-2 py-3 text-center text-slate-500">
                    No stage data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            Tasks by Status
          </div>
          <table className="min-w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-200 px-2 py-1 text-left">Status</th>
                <th className="border border-slate-200 px-2 py-1 text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-200 px-2 py-1">To Do</td>
                <td className="border border-slate-200 px-2 py-1 text-right">{summary?.tasksByStatus?.todo ?? 0}</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-2 py-1">In Progress</td>
                <td className="border border-slate-200 px-2 py-1 text-right">{summary?.tasksByStatus?.inProgress ?? 0}</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-2 py-1">Done</td>
                <td className="border border-slate-200 px-2 py-1 text-right">{summary?.tasksByStatus?.done ?? 0}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
