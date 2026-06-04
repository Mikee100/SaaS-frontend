"use client";

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut } from '@/utils/api';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';

interface TaskItem {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  dealId?: string;
  assignedTo?: string;
  createdAt: string;
}

interface DealOption {
  id: string;
  title: string;
}

interface PipelineResponse {
  deals: DealOption[];
}

export default function CrmTasksPage() {
  const { user } = useUser();
  const canView = hasPermission(user, 'view_sales');
  const canCreate = hasPermission(user, 'create_sales');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [deals, setDeals] = useState<DealOption[]>([]);

  const [form, setForm] = useState({
    title: '',
    priority: 'medium' as TaskItem['priority'],
    dueDate: '',
    dealId: '',
    assignedTo: '',
  });

  const refresh = async () => {
    const [taskData, pipelineData] = await Promise.all([
      apiGet<TaskItem[]>('/crm/tasks'),
      apiGet<PipelineResponse>('/crm/pipeline'),
    ]);

    setTasks(Array.isArray(taskData) ? taskData : []);
    setDeals(Array.isArray(pipelineData?.deals) ? pipelineData.deals : []);
  };

  useEffect(() => {
    const load = async () => {
      if (!canView) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load CRM tasks');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [canView]);

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;

    try {
      setSaving(true);
      setError(null);
      await apiPost('/crm/tasks', {
        title: form.title.trim(),
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        dealId: form.dealId || undefined,
        assignedTo: form.assignedTo.trim() || undefined,
      });
      setForm({ title: '', priority: 'medium', dueDate: '', dealId: '', assignedTo: '' });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  const updateTaskStatus = async (taskId: string, status: TaskItem['status']) => {
    try {
      setError(null);
      await apiPut(`/crm/tasks/${taskId}/status`, { status });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  if (!canView) {
    return <div className="p-4 text-sm text-slate-700">You do not have permission to view CRM tasks.</div>;
  }

  if (loading) {
    return <div className="p-4 text-sm text-slate-700">Loading CRM tasks...</div>;
  }

  return (
    <div className="p-4 text-[12px] text-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-base font-semibold">CRM Tasks</h1>
        <div className="text-[11px] text-slate-500">Total tasks: {tasks.length}</div>
      </div>

      {error && <div className="mb-2 border border-red-300 bg-red-50 px-2 py-1 text-[11px] text-red-700">{error}</div>}

      {canCreate && (
        <form onSubmit={createTask} className="mb-3 border border-slate-200 bg-white p-2">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Create Task</div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
            <input
              className="h-8 border border-slate-300 px-2 md:col-span-2"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Task title"
            />
            <select
              className="h-8 border border-slate-300 px-1"
              value={form.priority}
              onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value as TaskItem['priority'] }))}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input
              className="h-8 border border-slate-300 px-2"
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
            />
            <select
              className="h-8 border border-slate-300 px-1"
              value={form.dealId}
              onChange={(event) => setForm((prev) => ({ ...prev, dealId: event.target.value }))}
            >
              <option value="">No deal</option>
              {deals.map((deal) => (
                <option key={deal.id} value={deal.id}>{deal.title}</option>
              ))}
            </select>
            <input
              className="h-8 border border-slate-300 px-2"
              value={form.assignedTo}
              onChange={(event) => setForm((prev) => ({ ...prev, assignedTo: event.target.value }))}
              placeholder="Assigned to"
            />
          </div>
          <button
            disabled={saving || !form.title.trim()}
            className="mt-2 h-8 border border-slate-300 bg-slate-900 px-3 text-[11px] font-semibold text-white disabled:opacity-60"
          >
            Add Task
          </button>
        </form>
      )}

      <div className="overflow-x-auto border border-slate-200 bg-white">
        <table className="min-w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="border border-slate-200 px-2 py-1">Task</th>
              <th className="border border-slate-200 px-2 py-1">Priority</th>
              <th className="border border-slate-200 px-2 py-1">Due</th>
              <th className="border border-slate-200 px-2 py-1">Assigned</th>
              <th className="border border-slate-200 px-2 py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td className="border border-slate-200 px-2 py-1">
                  <div className="font-semibold text-slate-800">{task.title}</div>
                  {task.dealId && <div className="text-[10px] text-slate-500">Deal: {task.dealId}</div>}
                </td>
                <td className="border border-slate-200 px-2 py-1 uppercase">{task.priority}</td>
                <td className="border border-slate-200 px-2 py-1">{task.dueDate ? task.dueDate.slice(0, 10) : '-'}</td>
                <td className="border border-slate-200 px-2 py-1">{task.assignedTo || '-'}</td>
                <td className="border border-slate-200 px-2 py-1">
                  <select
                    className="h-7 w-full border border-slate-300 px-1"
                    value={task.status}
                    disabled={!canCreate}
                    onChange={(event) => updateTaskStatus(task.id, event.target.value as TaskItem['status'])}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={5} className="border border-slate-200 px-2 py-3 text-center text-slate-500">
                  No tasks found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
