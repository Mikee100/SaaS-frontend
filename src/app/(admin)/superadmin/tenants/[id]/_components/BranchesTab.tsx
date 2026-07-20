import React from "react";
import type { Branch } from "../types";
import Pagination, { usePagination } from "./Pagination";
import StatusBadge from "./StatusBadge";

function branchStatusTone(branch: Branch): "success" | "danger" | "neutral" {
  if (branch.deletedAt) return "danger";
  if ((branch.status || "").toLowerCase() === "active") return "success";
  return "neutral";
}

function branchStatusLabel(branch: Branch): string {
  if (branch.deletedAt) return "Deleted";
  return branch.status || "Unknown";
}

export default function BranchesTab({
  branches,
  formatDate,
}: {
  branches: Branch[];
  formatDate: (dateString: string) => string;
}) {
  const { page, setPage, totalPages, pageItems } = usePagination(branches);

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900">Tenant Branches ({branches.length})</h3>
      </div>
      {branches.length === 0 ? (
        <p className="p-4 text-sm text-gray-500">No branches yet.</p>
      ) : (
        <>
          <div className="divide-y divide-gray-100">
            {pageItems.map((branch) => (
              <div key={branch.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-900">{branch.name}</span>
                  {branch.isMainBranch && <StatusBadge tone="info">MAIN</StatusBadge>}
                  <StatusBadge tone={branchStatusTone(branch)}>{branchStatusLabel(branch)}</StatusBadge>
                </div>
                {branch.address && <p className="mt-1 text-xs text-gray-500">{branch.address}</p>}
                <p className="mt-0.5 text-xs text-gray-500">
                  {[branch.city, branch.state, branch.country].filter(Boolean).join(", ")}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {[branch.manager, branch.phone, branch.email].filter(Boolean).join(" • ")}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">Created {formatDate(branch.createdAt)}</p>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
