import { redirect } from "next/navigation";

export default function ProductPerformanceReportPage() {
  redirect('/products/reports/product-sales?tab=performance');
}
