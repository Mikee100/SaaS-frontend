"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

export interface BranchContextType {
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  canChangeBranch: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider = ({ children, initialBranchId, canChangeBranch = false }: { children: ReactNode; initialBranchId?: string; canChangeBranch?: boolean }) => {
  const [selectedBranchId, setSelectedBranchIdState] = useState<string>(initialBranchId || "");

  const setSelectedBranchId = (id: string) => {
    setSelectedBranchIdState(id);
  };

  return (
    <BranchContext.Provider value={{ selectedBranchId, setSelectedBranchId, canChangeBranch }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = (): BranchContextType => {
  const context = useContext(BranchContext);

  // Fallback to a safe no-op context instead of throwing,
  // so pages that accidentally render outside BranchProvider
  // don't crash the entire app.
  if (!context) {
    return {
      selectedBranchId: "",
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      setSelectedBranchId: () => {},
      canChangeBranch: false,
    };
  }

  return context;
};