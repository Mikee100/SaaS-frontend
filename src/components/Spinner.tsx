"use client";

import React from "react";

const Spinner = () => (
  <div className="flex justify-center items-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
    <span className="sr-only">Loading...</span>
  </div>
);

export default Spinner;