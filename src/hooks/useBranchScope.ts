import { useCallback, useEffect, useState } from "react";

type BranchOption = {
  id: string;
  name: string;
};

type BranchScopedUser = {
  roles?: Array<string | { name?: string | null } | null>;
  role?: string | null;
  branchId?: string | null;
  isSuperadmin?: boolean | null;
};

type UseBranchScopeOptions = {
  user?: BranchScopedUser | null;
  branches?: BranchOption[];
  storageKey?: string;
};

export function useBranchScope({
  user,
  branches = [],
  storageKey = "selectedBranchId",
}: UseBranchScopeOptions) {
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");

  const normalizedRoles = Array.isArray(user?.roles)
    ? user.roles
        .map((role) =>
          typeof role === "string"
            ? role.toLowerCase()
            : String(role?.name || "").toLowerCase(),
        )
        .filter(Boolean)
    : [];

  const primaryRole = String(user?.role || "").toLowerCase();
  const isBranchScopedUser =
    normalizedRoles.includes("manager") ||
    normalizedRoles.includes("cashier") ||
    primaryRole === "manager" ||
    primaryRole === "cashier";

  const assignedBranchId = user?.branchId || "";
  const canTenantSelectBranch =
    !isBranchScopedUser &&
    (normalizedRoles.includes("owner") ||
      normalizedRoles.includes("admin") ||
      Boolean(user?.isSuperadmin));

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isBranchScopedUser && assignedBranchId) {
      setSelectedBranchId(assignedBranchId);
      localStorage.setItem(storageKey, assignedBranchId);
      return;
    }

    if (canTenantSelectBranch) {
      const storedBranch = localStorage.getItem(storageKey) || "all";
      const existsInBranches =
        storedBranch === "all" ||
        branches.some((branch) => branch.id === storedBranch);
      const nextBranch = existsInBranches ? storedBranch : "all";
      setSelectedBranchId(nextBranch);
      localStorage.setItem(storageKey, nextBranch);
      return;
    }

    setSelectedBranchId(assignedBranchId || "all");
  }, [assignedBranchId, branches, canTenantSelectBranch, isBranchScopedUser, storageKey]);

  const setSelectedBranchIdPersisted = useCallback(
    (nextBranchId: string) => {
      setSelectedBranchId(nextBranchId);
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, nextBranchId);
      }
    },
    [storageKey],
  );

  const activeBranchName =
    selectedBranchId === "all"
      ? "All Branches"
      : branches.find((branch) => branch.id === selectedBranchId)?.name ||
        "Assigned Branch";

  return {
    selectedBranchId,
    setSelectedBranchIdPersisted,
    canTenantSelectBranch,
    isBranchScopedUser,
    activeBranchName,
  };
}
