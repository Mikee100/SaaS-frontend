"use client";

import React from "react";
import GeneralLedgerExplorer from "./GeneralLedgerExplorer";

export default function LedgersPage() {
  return (
    <div className="min-h-screen bg-white p-3 md:p-4">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-3 border-b border-gray-200 pb-2">
          <h1 className="text-lg font-semibold text-gray-900">General Ledger</h1>
          <p className="text-xs text-gray-500">Simple transaction view by account</p>
        </div>

        <GeneralLedgerExplorer />
      </div>
    </div>
  );
}
