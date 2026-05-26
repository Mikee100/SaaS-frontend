"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPut, isAccessRestrictedError } from "@/utils/api";
import { useBranch } from "@/contexts/BranchContext";
import { useUser } from "@/components/UserContext";
import { useBillingAccessStatus } from "@/hooks/useBillingAccessStatus";

type Branch = { id: string; name: string };

export default function BranchSwitcher() {
  const { selectedBranchId, setSelectedBranchId } = useBranch();
  const { refreshUser } = useUser();
  const { data: accessStatus, isLoading: accessStatusLoading } = useBillingAccessStatus();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [restrictedMessage, setRestrictedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (accessStatusLoading) {
      setLoading(true);
      return;
    }

    if (accessStatus.restricted) {
      setBranches([]);
      setRestrictedMessage(
        accessStatus.reason ||
          "Subscription access is restricted. Renew in Billing to enable branch access.",
      );
      setLoading(false);
      return;
    }

    async function fetchBranches() {
      setLoading(true);
      try {
        const data = await apiGet("/branches");
        const branchData = data as Branch[];
        setBranches(branchData);
        setRestrictedMessage(null);
        // Try to restore last selected branch from localStorage
        const last = localStorage.getItem("selectedBranchId");
        if (last && branchData.find((b) => b.id === last)) {
          setSelectedBranchId(last);
        } else if (branchData.length > 0 && !selectedBranchId) {
          setSelectedBranchId(branchData[0].id);
        }
      } catch (err) {
        if (isAccessRestrictedError(err)) {
          setBranches([]);
          setRestrictedMessage(
            "Subscription access is restricted. Renew in Billing to enable branch access.",
          );
        } else {
          setBranches([]);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessStatus.restricted, accessStatus.reason, accessStatusLoading]);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const branchId = e.target.value;
    setSelectedBranchId(branchId);
    localStorage.setItem("selectedBranchId", branchId);
    // Persist branchId to backend for user
    try {
      await apiPut("/user/me/preferences", { branchId });
      // Refresh user context so backend branchId is reflected
      await refreshUser();
    } catch (err) {
      // Optionally show a toast or log error
      console.error("Failed to persist branchId to backend", err);
    }
  };

  if (loading) return <div className="text-sm text-gray-400">Loading branches...</div>;
  if (restrictedMessage) {
    return <div className="text-sm text-amber-600">{restrictedMessage}</div>;
  }
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