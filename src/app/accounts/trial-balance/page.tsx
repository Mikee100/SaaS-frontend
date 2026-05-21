"use client";

import React from "react";
import TrialBalanceStatement from "./TrialBalanceStatement";

export default function TrialBalancePage() {
  return (
    <div className="min-h-screen bg-slate-50 px-2 py-3 md:px-4 md:py-4">
      <div className="mx-auto w-full max-w-[1600px]">
        <TrialBalanceStatement />
      </div>
    </div>
  );
}
