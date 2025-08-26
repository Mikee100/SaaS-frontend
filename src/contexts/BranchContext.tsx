"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

export interface BranchContextType {
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider = ({ children, initialBranchId }: { children: ReactNode; initialBranchId?: string }) => {
  const [selectedBranchId, setSelectedBranchIdState] = useState<string>(initialBranchId || "");

  // Wrap setSelectedBranchId to add logging
  const setSelectedBranchId = (id: string) => {
    console.log('[BranchContext] setSelectedBranchId called with:', id);
    setSelectedBranchIdState(id);
  };

  return (
    <BranchContext.Provider value={{ selectedBranchId, setSelectedBranchId }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error("useBranch must be used within a BranchProvider");
  }
  return context;
};
