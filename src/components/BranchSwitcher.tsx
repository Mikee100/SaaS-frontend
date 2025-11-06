"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPut } from "@/utils/api";
import { useBranch } from "@/contexts/BranchContext";
import { useUser } from "@/components/UserContext";

type Branch = { id: string; name: string };

export default function BranchSwitcher() {
  const { selectedBranchId, setSelectedBranchId } = useBranch();
  const { refreshUser } = useUser();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBranches() {
      setLoading(true);
      try {
        const data = await apiGet("/branches");
        const branchData = data as Branch[];
        setBranches(branchData);
        // Try to restore last selected branch from localStorage
        const last = localStorage.getItem("selectedBranchId");
        if (last && branchData.find((b) => b.id === last)) {
          setSelectedBranchId(last);
        } else if (branchData.length > 0 && !selectedBranchId) {
          setSelectedBranchId(branchData[0].id);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const branchId = e.target.value;
    console.log('[BranchSwitcher] User selected branchId:', branchId);
    setSelectedBranchId(branchId);
    localStorage.setItem("selectedBranchId", branchId);
    // Persist branchId to backend for user
    try {
      await apiPut("/user/me/preferences", { branchId });
      console.log('[BranchSwitcher] branchId persisted to backend:', branchId);
      // Refresh user context so backend branchId is reflected
      await refreshUser();
      console.log('[BranchSwitcher] User context refreshed after branch change');
    } catch (err) {
      // Optionally show a toast or log error
      console.error("Failed to persist branchId to backend", err);
    }
  };

  if (loading) return <div className="text-sm text-gray-400">Loading branches...</div>;
  if (branches.length === 0) return <div className="text-sm text-gray-400">No branches found</div>;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">Branch:</span>
      <select value={selectedBranchId || ""} onChange={handleChange} className="px-2 py-1 border rounded-lg text-sm">
        {branches.map(branch => (
          <option key={branch.id} value={branch.id}>{branch.name}</option>
        ))}
      </select>
    </div>
  );
}