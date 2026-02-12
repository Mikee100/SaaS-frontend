"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuppliersPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/inventory/suppliers");
  }, [router]);

  return (
    <div className="flex justify-center items-center min-h-[300px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">
          Redirecting to the inventory suppliers page...
        </p>
      </div>
    </div>
  );
}
