"use client";
import React from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";

export default function ClientBranchProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}
