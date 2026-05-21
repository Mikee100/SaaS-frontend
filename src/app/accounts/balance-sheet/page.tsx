"use client";

import React from "react";
import BalanceSheetStatement from "./BalanceSheetStatement";

export default function BalanceSheetPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Financial Accounting</h1>
          <p className="text-gray-500 font-medium text-lg">Balance Sheet & Statement of Financial Position</p>
        </div>
        
        <BalanceSheetStatement />
      </div>
    </div>
  );
}
