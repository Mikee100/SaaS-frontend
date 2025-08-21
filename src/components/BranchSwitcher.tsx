"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";

export default function BranchSwitcher({ onChange }: { onChange?: (branchId: string) => void }) {
  const [branches, setBranches] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBranches() {
      setLoading(true);
      try {
        const data = await apiGet("/branches");
        setBranches(data);
        // Try to restore last selected branch
        const last = localStorage.getItem("selectedBranchId");
        if (last && data.find((b: any) => b.id === last)) {
          setSelected(last);
          if (onChange) onChange(last);
        } else if (data.length > 0) {
          setSelected(data[0].id);
          if (onChange) onChange(data[0].id);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchBranches();
  }, []);

  const handleChange = (e: any) => {
    setSelected(e.target.value);
    localStorage.setItem("selectedBranchId", e.target.value);
    if (onChange) onChange(e.target.value);
  };

  if (loading) return <div className="text-sm text-gray-400">Loading branches...</div>;
  if (branches.length === 0) return <div className="text-sm text-gray-400">No branches found</div>;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">Branch:</span>
      <select value={selected} onChange={handleChange} className="px-2 py-1 border rounded-lg text-sm">
        {branches.map(branch => (
          <option key={branch.id} value={branch.id}>{branch.name}</option>
        ))}
      </select>
    </div>
  );
}
