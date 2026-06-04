"use client";

import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost, apiPut } from '@/utils/api';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';

interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string;
}

interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
}

interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stageId: string;
  pipelineId: string;
  contactName?: string;
  status: 'open' | 'won' | 'lost';
}

interface PipelineBoardResponse {
  pipelines: Pipeline[];
  deals: Deal[];
}

export default function CrmPipelinePage() {
  const { user } = useUser();
  const canView = hasPermission(user, 'view_sales');
  const canCreate = hasPermission(user, 'create_sales');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [board, setBoard] = useState<PipelineBoardResponse>({ pipelines: [], deals: [] });

  const [newPipelineName, setNewPipelineName] = useState('');
  const [dealForm, setDealForm] = useState({
    title: '',
    value: '',
    contactName: '',
  });

  const selectedPipeline = useMemo(() => board.pipelines[0] || null, [board]);
  const selectedStages = selectedPipeline?.stages || [];

  const refreshBoard = async () => {
    const data = await apiGet<PipelineBoardResponse>('/crm/pipeline');
    setBoard({
      pipelines: Array.isArray(data?.pipelines) ? data.pipelines : [],
      deals: Array.isArray(data?.deals) ? data.deals : [],
    });
  };

  useEffect(() => {
    const load = async () => {
      if (!canView) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        await refreshBoard();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load CRM pipeline');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [canView]);

  const handleCreatePipeline = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newPipelineName.trim()) return;

    try {
      setSaving(true);
      setError(null);
      await apiPost('/crm/pipeline', { name: newPipelineName.trim() });
      setNewPipelineName('');
      setMessage('Pipeline created');
      await refreshBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pipeline');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDeal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPipeline || selectedStages.length === 0 || !dealForm.title.trim()) return;

    try {
      setSaving(true);
      setError(null);
      await apiPost('/crm/deals', {
        title: dealForm.title.trim(),
        value: Number(dealForm.value || 0),
        contactName: dealForm.contactName.trim() || undefined,
        pipelineId: selectedPipeline.id,
        stageId: selectedStages[0].id,
      });
      setDealForm({ title: '', value: '', contactName: '' });
      setMessage('Deal added');
      await refreshBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deal');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveDeal = async (dealId: string, stageId: string) => {
    try {
      await apiPut(`/crm/deals/${dealId}/stage`, { stageId });
      await refreshBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move deal');
    }
  };

  if (!canView) {
    return <div className="p-4 text-sm text-slate-700">You do not have permission to view CRM pipeline.</div>;
  }

  if (loading) {
    return <div className="p-4 text-sm text-slate-700">Loading CRM pipeline...</div>;
  }

  return (
    <div className="p-4 text-[12px] text-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-base font-semibold">CRM Pipeline</h1>
        <div className="text-[11px] text-slate-500">Pipelines: {board.pipelines.length} | Deals: {board.deals.length}</div>
      </div>

      {error && <div className="mb-2 border border-red-300 bg-red-50 px-2 py-1 text-[11px] text-red-700">{error}</div>}
      {message && <div className="mb-2 border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">{message}</div>}

      {canCreate && (
        <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <form onSubmit={handleCreatePipeline} className="border border-slate-200 bg-white p-2">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Create Pipeline</div>
            <div className="flex gap-2">
              <input
                className="h-8 flex-1 border border-slate-300 px-2"
                value={newPipelineName}
                onChange={(event) => setNewPipelineName(event.target.value)}
                placeholder="Pipeline name"
              />
              <button
                disabled={saving || !newPipelineName.trim()}
                className="h-8 border border-slate-300 bg-slate-900 px-3 text-[11px] font-semibold text-white disabled:opacity-60"
              >
                Save
              </button>
            </div>
          </form>

          <form onSubmit={handleCreateDeal} className="border border-slate-200 bg-white p-2">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Add Deal</div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <input
                className="h-8 border border-slate-300 px-2 md:col-span-2"
                value={dealForm.title}
                onChange={(event) => setDealForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Deal title"
              />
              <input
                className="h-8 border border-slate-300 px-2"
                value={dealForm.value}
                onChange={(event) => setDealForm((prev) => ({ ...prev, value: event.target.value }))}
                placeholder="Value"
                type="number"
                min="0"
              />
              <input
                className="h-8 border border-slate-300 px-2"
                value={dealForm.contactName}
                onChange={(event) => setDealForm((prev) => ({ ...prev, contactName: event.target.value }))}
                placeholder="Contact"
              />
            </div>
            <div className="mt-2">
              <button
                disabled={saving || !dealForm.title.trim() || !selectedPipeline || selectedStages.length === 0}
                className="h-8 border border-slate-300 bg-emerald-700 px-3 text-[11px] font-semibold text-white disabled:opacity-60"
              >
                Add Deal
              </button>
            </div>
          </form>
        </div>
      )}

      {!selectedPipeline ? (
        <div className="border border-slate-200 bg-white p-3 text-[11px] text-slate-600">No pipeline available yet.</div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 bg-white">
          <div className="min-w-225 p-2">
            <div className="mb-2 text-sm font-semibold">{selectedPipeline.name}</div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-5">
              {selectedStages
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((stage) => {
                  const stageDeals = board.deals.filter(
                    (deal) => deal.pipelineId === selectedPipeline.id && deal.stageId === stage.id,
                  );

                  return (
                    <div key={stage.id} className="border border-slate-200 bg-slate-50 p-2">
                      <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-1">
                        <span className="text-[11px] font-semibold" style={{ color: stage.color }}>{stage.name}</span>
                        <span className="text-[10px] text-slate-500">{stageDeals.length}</span>
                      </div>
                      <div className="space-y-2">
                        {stageDeals.map((deal) => (
                          <div key={deal.id} className="border border-slate-200 bg-white p-2">
                            <div className="truncate text-[11px] font-semibold">{deal.title}</div>
                            <div className="text-[10px] text-slate-600">
                              {(deal.currency || 'KES').toUpperCase()} {Number(deal.value || 0).toLocaleString()}
                            </div>
                            {deal.contactName && (
                              <div className="truncate text-[10px] text-slate-500">{deal.contactName}</div>
                            )}
                            {canCreate && (
                              <select
                                className="mt-1 h-7 w-full border border-slate-300 px-1 text-[10px]"
                                value={deal.stageId}
                                onChange={(event) => handleMoveDeal(deal.id, event.target.value)}
                              >
                                {selectedStages
                                  .slice()
                                  .sort((a, b) => a.order - b.order)
                                  .map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.name}
                                    </option>
                                  ))}
                              </select>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
