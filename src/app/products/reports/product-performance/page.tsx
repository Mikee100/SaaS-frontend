"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";
import { Bar } from "react-chartjs-2";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useTenant } from '@/hooks/useTenant';
import {
  getPdfDocOptions,
  getPdfMargin,
  getPdfFontSize,
  applyPdfBusinessHeader,
  applyPdfFooterAndPageNumbers,
  getPdfTableColors,
  getPdfCurrency,
  type PdfTemplate,
  preparePdfWatermark,
} from '@/utils/pdfTemplate';
import { getFullAssetUrl } from '@/utils/logoUrl';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { FaFilePdf, FaFileExcel } from "react-icons/fa";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

type TopProduct = { id: string; name: string; unitsSold: number; revenue: number; margin?: number; cost?: number };

type Metrics = {
  topProducts: TopProduct[];
};

export default function ProductPerformanceReportPage() {
  const { data: tenantData } = useTenant();
  const [metrics, setMetrics] = useState<Metrics>({ topProducts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet(`/analytics/dashboard`)
      .then((data) => setMetrics(data as Metrics))
      .catch((err: unknown) => setError((err as Error).message || "An error occurred while fetching data."))
      .finally(() => setLoading(false));
  }, []);

  const marginData = {
    labels: (metrics.topProducts || []).map(p => p.name),
    datasets: [{
      import { redirect } from "next/navigation";

      export default function ProductPerformanceReportPage() {
        redirect('/products/reports/product-sales?tab=performance');
      }
          return Math.round(((p.revenue - p.cost) / p.revenue) * 10000) / 100;
