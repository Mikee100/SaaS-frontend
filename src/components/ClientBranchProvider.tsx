"use client";
import React from "react";
import { BranchProvider } from "@/contexts/BranchContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

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
        {children}
      </ThemeProvider>
    </BranchProvider>
  );
}
