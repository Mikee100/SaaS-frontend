"use client";
import React from "react";
import { BranchProvider } from "@/contexts/BranchContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import LayoutWrapper from "@/components/LayoutWrapper";


export default function ClientBranchProvider({ children }: { children: React.ReactNode }) {
  const [initialBranchId, setInitialBranchId] = React.useState("");
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setInitialBranchId(localStorage.getItem("selectedBranchId") || "");
    }
  }, []);

  return (
    <BranchProvider initialBranchId={initialBranchId}>
      <ThemeProvider>
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
        
      </ThemeProvider>
    </BranchProvider>
  );
}
