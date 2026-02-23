"use client";

import { useUser } from "@/components/UserContext";
import { FiX } from "react-icons/fi";

export default function ImpersonationBanner() {
  const { user, endImpersonation } = useUser();

  if (!user?.impersonating || !user.impersonatingAsTenantName) return null;

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between text-sm font-medium shadow-sm">
      <span>
        Viewing as <strong>{user.impersonatingAsTenantName}</strong> (support impersonation)
      </span>
      <button
        onClick={endImpersonation}
        className="inline-flex items-center gap-1.5 rounded-md bg-amber-700/30 hover:bg-amber-700/50 px-3 py-1.5 transition-colors"
      >
        <FiX className="w-4 h-4" />
        Exit
      </button>
    </div>
  );
}
