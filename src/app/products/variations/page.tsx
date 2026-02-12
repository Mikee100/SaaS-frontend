"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProductVariationsLegacyPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/products/unified");
  }, [router]);

  return (
    <div className="flex justify-center items-center min-h-[300px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">
          Redirecting to the unified products & variations page...
        </p>
      </div>
    </div>
  );
}
