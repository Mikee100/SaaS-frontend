export type DownloadFormat = 'pdf' | 'xlsx' | 'csv';
export type ReportDateRange = '7d' | '30d' | '90d' | '6m' | '1y' | 'custom';
export type PdfTrendGranularity = 'day' | 'week' | 'month' | 'year';

export const PDF_TREND_GRANULARITIES: PdfTrendGranularity[] = [
  'day',
  'week',
  'month',
  'year',
];

export interface ReportPreferences {
  defaultDownloadFormat: DownloadFormat;
  defaultDateRange: Exclude<ReportDateRange, 'custom'>;
  includeChartsInPdf: boolean;
  pdfTrendGranularities: PdfTrendGranularity[];
  includeComparisonSummary: boolean;
  compactPdfLayout: boolean;
}

export const DEFAULT_REPORT_PREFERENCES: ReportPreferences = {
  defaultDownloadFormat: 'pdf',
  defaultDateRange: '30d',
  includeChartsInPdf: true,
  pdfTrendGranularities: ['month'],
  includeComparisonSummary: true,
  compactPdfLayout: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function mergeReportPreferences(
  raw: unknown,
): ReportPreferences {
  if (!isRecord(raw)) {
    return { ...DEFAULT_REPORT_PREFERENCES };
  }

  const format = raw.defaultDownloadFormat;
  const dateRange = raw.defaultDateRange;
  const rawGranularities = Array.isArray(raw.pdfTrendGranularities)
    ? raw.pdfTrendGranularities
    : [];
  const parsedGranularities = rawGranularities.filter(
    (value): value is PdfTrendGranularity =>
      value === 'day' || value === 'week' || value === 'month' || value === 'year',
  );

  return {
    ...DEFAULT_REPORT_PREFERENCES,
    defaultDownloadFormat:
      format === 'pdf' || format === 'xlsx' || format === 'csv'
        ? format
        : DEFAULT_REPORT_PREFERENCES.defaultDownloadFormat,
    defaultDateRange:
      dateRange === '7d' ||
      dateRange === '30d' ||
      dateRange === '90d' ||
      dateRange === '6m' ||
      dateRange === '1y'
        ? dateRange
        : DEFAULT_REPORT_PREFERENCES.defaultDateRange,
    includeChartsInPdf:
      typeof raw.includeChartsInPdf === 'boolean'
        ? raw.includeChartsInPdf
        : DEFAULT_REPORT_PREFERENCES.includeChartsInPdf,
    pdfTrendGranularities:
      parsedGranularities.length > 0
        ? parsedGranularities
        : [...DEFAULT_REPORT_PREFERENCES.pdfTrendGranularities],
    includeComparisonSummary:
      typeof raw.includeComparisonSummary === 'boolean'
        ? raw.includeComparisonSummary
        : DEFAULT_REPORT_PREFERENCES.includeComparisonSummary,
    compactPdfLayout:
      typeof raw.compactPdfLayout === 'boolean'
        ? raw.compactPdfLayout
        : DEFAULT_REPORT_PREFERENCES.compactPdfLayout,
  };
}
