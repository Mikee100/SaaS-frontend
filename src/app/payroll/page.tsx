"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Spinner from '@/components/Spinner';
import { useUser } from '@/components/UserContext';
import { hasPermission } from '@/utils/permissions';
import { ApiError, apiGet, apiPost, apiPut } from '@/utils/api';
import { FaCalculator, FaCheckCircle, FaHistory, FaMoneyBillWave, FaPlay, FaPlus } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTenant } from '@/hooks/useTenant';
import { getFullAssetUrl } from '@/utils/logoUrl';
import {
  getPdfDocOptions,
  getPdfMargin,
  getPdfBodyFontSize,
  getPdfTitleFontSize,
  getPdfCurrency,
  applyPdfBusinessHeader,
  applyPdfFooterAndPageNumbers,
  getPdfTableColors,
  preparePdfWatermark,
  type PdfTemplate,
} from '@/utils/pdfTemplate';

interface SalaryScheme {
  id: string;
  employeeName: string;
  salaryAmount: number;
  frequency: 'monthly' | 'yearly';
}

interface PayrollItem {
  salarySchemeId: string;
  employeeName: string;
  baseSalary: number;
  bonus: number;
  commission: number;
  deduction: number;
  nonTaxDeduction: number;
  statutory: {
    paye: number;
    nssfEmployee: number;
    healthInsuranceEmployee: number;
    housingLevyEmployee: number;
    totalEmployeeStatutory: number;
  };
  grossPay: number;
  netPay: number;
  paidAmount: number;
  variance: number;
}

interface PayrollSettings {
  countryCode: string;
  enabled: boolean;
  personalRelief: number;
  nssfEnabled: boolean;
  nssfUpperLimit: number;
  nssfRateEmployee: number;
  healthInsuranceEnabled: boolean;
  healthInsuranceLabel: string;
  healthInsuranceRateEmployee: number;
  housingLevyEnabled: boolean;
  housingLevyRateEmployee: number;
}

interface PayrollPreview {
  monthName: string;
  payrollItems: PayrollItem[];
  reconciliation: {
    status: 'balanced' | 'variance_detected';
    totals: {
      baseSalary: number;
      bonus: number;
      commission: number;
      deduction: number;
      nonTaxDeduction: number;
      statutoryDeductions: number;
      employerStatutoryContributions: number;
      grossPay: number;
      netPay: number;
      paidAmount: number;
      variance: number;
    };
  };
}

interface SalaryForm {
  employeeName: string;
  salaryAmount: number;
  frequency: 'monthly' | 'yearly';
  startDate: string;
  notes: string;
}

interface PayrollTemplate {
  id: string;
  name: string;
  type: 'bonus' | 'commission' | 'deduction';
  mode: 'fixed' | 'percentage';
  value: number;
  applyScope: 'all' | 'department' | 'employee';
  isActive: boolean;
}

interface PayrollRun {
  id: string;
  monthName: string;
  processedAt: string;
  approvedAt?: string;
  postedAt?: string;
  processedCount: number;
  status?: 'draft' | 'approved' | 'posted' | 'reversed' | 'cancelled';
  reversedAt?: string;
  reversalReason?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  auditTrail?: Array<{
    action: string;
    by?: string;
    at: string;
    note?: string;
  }>;
  reconciliationStatus: 'balanced' | 'variance_detected';
  totals: {
    netPay: number;
    variance: number;
  };
}

interface PayrollPeriodLock {
  month: number;
  year: number;
  branchId?: string;
  reason?: string;
  lockedBy: string;
  lockedAt: string;
}

interface TaxPreset {
  id: string;
  name: string;
  effectiveFrom: string;
}

export default function PayrollPage() {
  const { user } = useUser();
  const { data: tenantData } = useTenant();
  const canView = hasPermission(user, 'view_sales');
  const canCreate = hasPermission(user, 'create_sales');

  const [loading, setLoading] = useState(true);
  const [runningPayroll, setRunningPayroll] = useState(false);
  const [savingScheme, setSavingScheme] = useState(false);
  const [showCreateScheme, setShowCreateScheme] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const now = new Date();
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());

  const [salarySchemes, setSalarySchemes] = useState<SalaryScheme[]>([]);
  const [preview, setPreview] = useState<PayrollPreview | null>(null);
  const [templates, setTemplates] = useState<PayrollTemplate[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [payrollSettings, setPayrollSettings] = useState<PayrollSettings | null>(null);
  const [taxPresets, setTaxPresets] = useState<TaxPreset[]>([]);
  const [periodLocks, setPeriodLocks] = useState<PayrollPeriodLock[]>([]);
  const [runScope, setRunScope] = useState<'all' | 'mine'>(user?.branchId ? 'mine' : 'all');
  const [runStatusFilter, setRunStatusFilter] = useState<'all' | 'draft' | 'approved' | 'posted' | 'reversed' | 'cancelled'>('all');
  const [runMonthFilter, setRunMonthFilter] = useState<number | 'all'>('all');
  const [runYearFilter, setRunYearFilter] = useState<number | 'all'>('all');
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [adjustments, setAdjustments] = useState<
    Record<string, { bonus: number; commission: number; deduction: number; paidAmount?: number }>
  >({});
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);

  const [templateForm, setTemplateForm] = useState({
    name: '',
    type: 'deduction' as 'bonus' | 'commission' | 'deduction',
    mode: 'fixed' as 'fixed' | 'percentage',
    value: 0,
    applyScope: 'all' as 'all' | 'department' | 'employee',
  });

  const [salaryForm, setSalaryForm] = useState<SalaryForm>({
    employeeName: '',
    salaryAmount: 0,
    frequency: 'monthly',
    startDate: '',
    notes: '',
  });

  const monthOptions = useMemo(
    () => [
      { value: 1, label: 'Jan' },
      { value: 2, label: 'Feb' },
      { value: 3, label: 'Mar' },
      { value: 4, label: 'Apr' },
      { value: 5, label: 'May' },
      { value: 6, label: 'Jun' },
      { value: 7, label: 'Jul' },
      { value: 8, label: 'Aug' },
      { value: 9, label: 'Sep' },
      { value: 10, label: 'Oct' },
      { value: 11, label: 'Nov' },
      { value: 12, label: 'Dec' },
    ],
    [],
  );

  const numberCell = 'px-2 py-1 border border-slate-300 rounded bg-white text-[11px]';
  const numberCellDark = 'w-20 px-1 py-0.5 border border-slate-300 rounded text-right bg-white';

  const formatMoney = (value?: number) => `Ksh ${(value || 0).toFixed(2)}`;

  const fetchSalarySchemes = useCallback(async () => {
    const response = await apiGet('/salary-schemes');
    const data = (response as { data?: unknown[] })?.data || [];
    setSalarySchemes(Array.isArray(data) ? (data as SalaryScheme[]) : []);
  }, []);

  const fetchTemplates = useCallback(async () => {
    const response = await apiGet('/hr/payroll-templates');
    const data = (response as { data?: unknown[] })?.data || [];
    setTemplates(Array.isArray(data) ? (data as PayrollTemplate[]) : []);
  }, []);

  const fetchRuns = useCallback(async () => {
    const params = new URLSearchParams();
    if (runScope === 'mine' && user?.branchId) {
      params.set('branchId', user.branchId);
    }
    if (runMonthFilter !== 'all') {
      params.set('month', String(runMonthFilter));
    }
    if (runYearFilter !== 'all') {
      params.set('year', String(runYearFilter));
    }
    if (runStatusFilter !== 'all') {
      params.set('status', runStatusFilter);
    }

    const query = params.toString();
    const response = await apiGet(`/hr/payroll-runs${query ? `?${query}` : ''}`);
    const data = (response as { data?: unknown[] })?.data || [];
    setRuns(Array.isArray(data) ? (data as PayrollRun[]) : []);
  }, [runMonthFilter, runScope, runStatusFilter, runYearFilter, user?.branchId]);

  const fetchPayrollSettings = useCallback(async () => {
    const response = await apiGet('/hr/payroll-settings');
    const data = (response as { data?: PayrollSettings })?.data;
    if (data) {
      setPayrollSettings(data);
    }
  }, []);

  const fetchTaxPresets = useCallback(async () => {
    const response = await apiGet('/hr/payroll-tax-presets');
    const data = (response as { data?: TaxPreset[] })?.data || [];
    setTaxPresets(Array.isArray(data) ? data : []);
    if (!selectedPresetId && Array.isArray(data) && data[0]?.id) {
      setSelectedPresetId(data[0].id);
    }
  }, [selectedPresetId]);

  const fetchPeriodLocks = useCallback(async () => {
    const response = await apiGet('/hr/payroll-period-locks');
    const data = (response as { data?: PayrollPeriodLock[] })?.data || [];
    setPeriodLocks(Array.isArray(data) ? data : []);
  }, []);

  const buildAdjustmentsPayload = useCallback(() => {
    return Object.entries(adjustments).map(([salarySchemeId, value]) => ({
      salarySchemeId,
      bonus: Number(value.bonus || 0),
      commission: Number(value.commission || 0),
      deduction: Number(value.deduction || 0),
      ...(value.paidAmount !== undefined ? { paidAmount: Number(value.paidAmount) } : {}),
    }));
  }, [adjustments]);

  const requestPayrollPreview = useCallback(async (adjustmentsPayload: Array<{
    salarySchemeId: string;
    bonus?: number;
    commission?: number;
    deduction?: number;
    paidAmount?: number;
  }> = []) => {
    const response = await apiPost('/salary-schemes/payroll-preview', {
      month,
      year,
      applyTemplates: true,
      adjustments: adjustmentsPayload,
    });

    const data = (response as { data?: PayrollPreview })?.data;
    if (data) {
      setPreview(data);
    }
  }, [month, year]);

  const previewPayroll = useCallback(async () => {
    await requestPayrollPreview(buildAdjustmentsPayload());
  }, [buildAdjustmentsPayload, requestPayrollPreview]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        fetchSalarySchemes(),
        fetchTemplates(),
        fetchRuns(),
        fetchPayrollSettings(),
        fetchTaxPresets(),
        fetchPeriodLocks(),
      ]);
    } catch (e) {
      setError((e as { message?: string })?.message || 'Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  }, [fetchSalarySchemes, fetchTemplates, fetchRuns, fetchPayrollSettings, fetchTaxPresets, fetchPeriodLocks]);

  const currentPeriodLocked = periodLocks.some((lock) => lock.month === month && lock.year === year);

  useEffect(() => {
    if (!canView) return;
    loadData();
  }, [canView, loadData]);

  useEffect(() => {
    if (!canView) return;
    requestPayrollPreview();
  }, [canView, requestPayrollPreview]);

  useEffect(() => {
    if (!canView) return;

    const timerId = window.setTimeout(() => {
      void requestPayrollPreview(buildAdjustmentsPayload());
    }, 300);

    return () => window.clearTimeout(timerId);
  }, [adjustments, buildAdjustmentsPayload, canView, requestPayrollPreview]);

  const updateAdjustment = (
    schemeId: string,
    field: 'bonus' | 'commission' | 'deduction' | 'paidAmount',
    value: string,
  ) => {
    const numeric = Number(value || 0);
    const currentItem = preview?.payrollItems?.find(
      (item) => item.salarySchemeId === schemeId,
    );

    setAdjustments((prev) => {
      const existing = prev[schemeId];
      const next = {
        bonus: existing?.bonus ?? Number(currentItem?.bonus || 0),
        commission: existing?.commission ?? Number(currentItem?.commission || 0),
        deduction: existing?.deduction ?? Number(currentItem?.deduction || 0),
        paidAmount: existing?.paidAmount,
      };

      if (field === 'paidAmount') {
        next.paidAmount = Number.isFinite(numeric) ? numeric : 0;
      } else {
        next[field] = Number.isFinite(numeric) ? numeric : 0;
      }

      return { ...prev, [schemeId]: next };
    });
  };

  const savePayrollSettings = async () => {
    if (!payrollSettings) return;

    try {
      setSavingSettings(true);
      setError(null);
      await apiPut('/hr/payroll-settings', payrollSettings);
      setSuccess('Payroll tax settings updated');
      await previewPayroll();
    } catch (e) {
      setError((e as { message?: string })?.message || 'Failed to update payroll settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const applyTaxPreset = async () => {
    if (!selectedPresetId) {
      setError('Select a tax preset first');
      return;
    }

    try {
      setError(null);
      await apiPost('/hr/payroll-tax-presets/apply', { presetId: selectedPresetId });
      setSuccess('Tax preset applied');
      await Promise.all([fetchPayrollSettings(), previewPayroll()]);
    } catch (e) {
      setError((e as { message?: string })?.message || 'Failed to apply tax preset');
    }
  };

  const exportCsv = (fileName: string, headers: string[], rows: Array<Array<string | number>>) => {
    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportP10 = async () => {
    try {
      const response = await apiGet(`/hr/reports/p10?month=${month}&year=${year}`);
      const data = (response as { data?: any })?.data;
      const lineItems = Array.isArray(data?.lineItems) ? data.lineItems : [];
      exportCsv(
        `p10-${year}-${String(month).padStart(2, '0')}.csv`,
        ['Employee', 'Gross Pay', 'PAYE', 'NSSF', 'Health', 'Housing Levy', 'Net Pay'],
        lineItems.map((item: any) => [
          item.employeeName,
          item.grossPay,
          item.paye,
          item.nssf,
          item.health,
          item.housing,
          item.netPay,
        ]),
      );
    } catch (e) {
      setError((e as { message?: string })?.message || 'Failed to export P10 report');
    }
  };

  const exportP9 = async () => {
    try {
      const response = await apiGet(`/hr/reports/p9?year=${year}`);
      const data = (response as { data?: any })?.data;
      const lineItems = Array.isArray(data?.lineItems) ? data.lineItems : [];
      exportCsv(
        `p9-${year}.csv`,
        ['Employee', 'Gross Pay', 'PAYE', 'NSSF', 'Health', 'Housing Levy', 'Net Pay'],
        lineItems.map((item: any) => [
          item.employeeName,
          item.grossPay,
          item.paye,
          item.nssf,
          item.health,
          item.housing,
          item.netPay,
        ]),
      );
    } catch (e) {
      setError((e as { message?: string })?.message || 'Failed to export P9 report');
    }
  };

  const renderPayslipPdf = async (payslip: any) => {
    const pdfTemplate = (tenantData?.pdfTemplate || {}) as PdfTemplate;
    const margin = getPdfMargin(pdfTemplate);
    const titleFontSize = getPdfTitleFontSize(pdfTemplate);
    const bodyFontSize = getPdfBodyFontSize(pdfTemplate);
    const currency = getPdfCurrency(tenantData, pdfTemplate);
    const { primaryRgb } = getPdfTableColors(pdfTemplate);
    const money = (value?: number) => `${currency} ${(Number(value) || 0).toFixed(2)}`;

    const doc = new jsPDF(getPdfDocOptions(pdfTemplate));
    await preparePdfWatermark(
      doc,
      getFullAssetUrl(tenantData?.watermark as string | null | undefined),
    );

    let y = applyPdfBusinessHeader(doc, tenantData, pdfTemplate, margin);

    doc.setFontSize(titleFontSize);
    doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
    doc.text('Payslip', margin, y + 6);
    y += 12;

    doc.setFontSize(bodyFontSize);
    doc.setTextColor('333333');
    doc.text(`Employee: ${payslip.employeeName}`, margin, y);
    y += 6;
    doc.text(`Pay Period: ${payslip.monthName}`, margin, y);
    y += 6;
    doc.text(`Generated: ${new Date(payslip.processedAt).toLocaleString()}`, margin, y);
    y += 4;

    autoTable(doc, {
      startY: y + 4,
      head: [['Earnings', `Amount (${currency})`]],
      body: [
        ['Base Salary', money(payslip.earnings.baseSalary)],
        ['Bonus', money(payslip.earnings.bonus)],
        ['Commission', money(payslip.earnings.commission)],
        ['Gross Pay', money(payslip.earnings.grossPay)],
      ],
      styles: { fontSize: Math.max(8, bodyFontSize - 2), cellPadding: 3 },
      headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255] },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: margin, right: margin },
    });

    let nextY =
      ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY || y) + 6;

    autoTable(doc, {
      startY: nextY,
      head: [['Deductions', `Amount (${currency})`]],
      body: [
        ['Other Deductions', money(payslip.deductions.nonTaxDeduction)],
        ['PAYE', money(payslip.deductions.paye)],
        ['NSSF', money(payslip.deductions.nssf)],
        ['Health', money(payslip.deductions.health)],
        ['Housing Levy', money(payslip.deductions.housingLevy)],
      ],
      styles: { fontSize: Math.max(8, bodyFontSize - 2), cellPadding: 3 },
      headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255] },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: margin, right: margin },
    });

    nextY =
      ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY || nextY) + 8;

    doc.setFontSize(Math.max(11, bodyFontSize + 1));
    doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
    doc.text(`Net Pay: ${money(payslip.netPay)}`, margin, nextY);
    nextY += 6;

    doc.setFontSize(bodyFontSize);
    doc.setTextColor('333333');
    doc.text(`Paid Amount: ${money(payslip.paidAmount)}`, margin, nextY);

    applyPdfFooterAndPageNumbers(doc, pdfTemplate, tenantData?.name || 'Payslip');

    doc.save(`payslip-${payslip.employeeName}-${year}-${String(month).padStart(2, '0')}.pdf`);
  };

  const downloadPayslip = async (item: PayrollItem) => {
    try {
      const response = await apiGet(
        `/hr/payslip?salarySchemeId=${encodeURIComponent(item.salarySchemeId)}&month=${month}&year=${year}`,
        { 'x-suppress-error-log': 'true' },
      );
      const payslip = (response as { data?: any })?.data;
      if (!payslip) {
        throw new Error('No payslip data found');
      }

      await renderPayslipPdf(payslip);
      return;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        const fallbackPayslip = {
          employeeName: item.employeeName,
          monthName:
            preview?.monthName ||
            new Date(year, month - 1, 1).toLocaleString('default', {
              month: 'long',
              year: 'numeric',
            }),
          processedAt: new Date().toISOString(),
          earnings: {
            baseSalary: Number(item.baseSalary || 0),
            bonus: Number(item.bonus || 0),
            commission: Number(item.commission || 0),
            grossPay: Number(item.grossPay || 0),
          },
          deductions: {
            nonTaxDeduction: Number(item.nonTaxDeduction || item.deduction || 0),
            paye: Number(item.statutory?.paye || 0),
            nssf: Number(item.statutory?.nssfEmployee || 0),
            health: Number(item.statutory?.healthInsuranceEmployee || 0),
            housingLevy: Number(item.statutory?.housingLevyEmployee || 0),
          },
          netPay: Number(item.netPay || 0),
          paidAmount: Number(item.paidAmount || 0),
        };

        await renderPayslipPdf(fallbackPayslip);
        setSuccess('Generated payslip from payroll preview (no saved run found yet for this period).');
        return;
      }

      setError((e as { message?: string })?.message || 'Failed to generate payslip');
    }
  };

  const handleRunPayroll = async () => {
    try {
      setRunningPayroll(true);
      setError(null);
      setSuccess(null);

      const response = await apiPost('/salary-schemes/process-payroll', {
        month,
        year,
        applyTemplates: true,
        adjustments: buildAdjustmentsPayload(),
      });

      const message =
        (response as { message?: string })?.message ||
        'Draft payroll created. Approve and post to book expenses.';
      setSuccess(message);
      await loadData();
    } catch (e) {
      setError((e as { message?: string })?.message || 'Failed to process payroll');
    } finally {
      setRunningPayroll(false);
    }
  };

  const lockCurrentPeriod = async () => {
    const monthLabel = monthOptions.find((option) => option.value === month)?.label;
    const confirmed = window.confirm(
      `Lock payroll for ${monthLabel} ${year}? No one will be able to process or edit payroll for this period until it is unlocked.`,
    );
    if (!confirmed) return;

    try {
      await apiPost('/hr/payroll-period-locks', { month, year, reason: 'Closed by payroll admin' });
      setSuccess('Payroll period locked');
      await fetchPeriodLocks();
    } catch (e) {
      setError((e as { message?: string })?.message || 'Failed to lock payroll period');
    }
  };

  const unlockCurrentPeriod = async () => {
    try {
      await apiPost('/hr/payroll-period-locks/unlock', { month, year });
      await fetchPeriodLocks();
      setSuccess('Payroll period unlocked');
    } catch (e) {
      setError((e as { message?: string })?.message || 'Failed to unlock payroll period');
    }
  };

  const approveRun = async (runId: string) => {
    try {
      await apiPost(`/hr/payroll-runs/${runId}/approve`, {});
      setSuccess('Payroll run approved');
      await fetchRuns();
    } catch (e) {
      setError((e as { message?: string })?.message || 'Failed to approve payroll run');
    }
  };

  const reverseRun = async (runId: string) => {
    const confirmed = window.confirm(
      'Reverse this posted payroll run? This will unbook the associated expense entries. This cannot be undone.',
    );
    if (!confirmed) return;

    try {
      await apiPost(`/salary-schemes/payroll-runs/${runId}/reverse`, {
        reason: 'Manual reversal by admin',
      });
      setSuccess('Payroll run reversed');
      await fetchRuns();
    } catch (e) {
      setError((e as { message?: string })?.message || 'Failed to reverse payroll run');
    }
  };

  const cancelDraftRun = async (runId: string) => {
    const confirmed = window.confirm(
      'Cancel this payroll draft? All calculated amounts and adjustments for this draft will be discarded.',
    );
    if (!confirmed) return;

    try {
      await apiPost(`/hr/payroll-runs/${runId}/cancel`, { reason: 'Draft cancelled by admin' });
      setSuccess('Payroll draft cancelled');
      await fetchRuns();
    } catch (e) {
      setError((e as { message?: string })?.message || 'Failed to cancel payroll draft');
    }
  };

  const postRun = async (runId: string) => {
    const confirmed = window.confirm(
      'Post this payroll run? This will book the expense entries to the ledger. This cannot be undone except by reversing the run.',
    );
    if (!confirmed) return;

    try {
      await apiPost(`/salary-schemes/payroll-runs/${runId}/post`, {});
      setSuccess('Payroll run posted and expenses booked');
      await fetchRuns();
    } catch (e) {
      setError((e as { message?: string })?.message || 'Failed to post payroll run');
    }
  };

  const handleCreateScheme = async () => {
    if (!salaryForm.employeeName || !salaryForm.salaryAmount || !salaryForm.startDate) {
      setError('Employee name, amount and start date are required');
      return;
    }

    try {
      setSavingScheme(true);
      setError(null);
      await apiPost('/salary-schemes', {
        employeeName: salaryForm.employeeName,
        salaryAmount: Number(salaryForm.salaryAmount),
        frequency: salaryForm.frequency,
        startDate: salaryForm.startDate,
        notes: salaryForm.notes || undefined,
      });

      setSuccess('Salary scheme created successfully');
      setShowCreateScheme(false);
      setSalaryForm({
        employeeName: '',
        salaryAmount: 0,
        frequency: 'monthly',
        startDate: '',
        notes: '',
      });
      await loadData();
    } catch (e) {
      setError((e as { message?: string })?.message || 'Failed to create salary scheme');
    } finally {
      setSavingScheme(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateForm.name || templateForm.value <= 0) {
      setError('Template name and value are required');
      return;
    }

    try {
      setSavingTemplate(true);
      setError(null);
      await apiPost('/hr/payroll-templates', {
        name: templateForm.name,
        type: templateForm.type,
        mode: templateForm.mode,
        value: Number(templateForm.value),
        applyScope: templateForm.applyScope,
        isActive: true,
      });

      setSuccess('Payroll template created');
      setTemplateForm({
        name: '',
        type: 'deduction',
        mode: 'fixed',
        value: 0,
        applyScope: 'all',
      });
      setShowCreateTemplate(false);
      await fetchTemplates();
      await previewPayroll();
    } catch (e) {
      setError((e as { message?: string })?.message || 'Failed to create template');
    } finally {
      setSavingTemplate(false);
    }
  };

  if (!canView) {
    return (
      <AuthGuard>
        <div className="p-4 text-sm text-red-600">You do not have permission to view payroll.</div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div
        className="min-h-screen text-[12px] text-slate-800"
        style={{
          fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
          background:
            'radial-gradient(circle at 15% -10%, rgba(14,116,144,0.15) 0%, rgba(14,116,144,0) 36%), radial-gradient(circle at 85% -5%, rgba(15,23,42,0.12) 0%, rgba(15,23,42,0) 30%), linear-gradient(180deg, #f6f8fb 0%, #eef2f7 100%)',
        }}
      >
        <div className="max-w-425 mx-auto p-3 md:p-4 space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white/95 shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-200 bg-linear-to-r from-slate-900 via-slate-800 to-cyan-900 text-slate-50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-[16px] font-semibold tracking-wide">Payroll Command Center</h1>
                  <p className="text-[11px] text-slate-200">Premium Kenya payroll, reconciliation, compliance reports and payslips.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportP10}
                    className="px-2.5 py-1 rounded-lg border border-cyan-200/40 bg-cyan-100/20 text-cyan-100 text-[11px] hover:bg-cyan-100/30"
                  >
                    Export P10
                  </button>
                  <button
                    onClick={exportP9}
                    className="px-2.5 py-1 rounded-lg border border-cyan-200/40 bg-cyan-100/20 text-cyan-100 text-[11px] hover:bg-cyan-100/30"
                  >
                    Export P9
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/80">
              <div className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white p-1">
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="px-2 py-1 border border-slate-300 rounded text-[11px]"
                >
                  {monthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-20 px-2 py-1 border border-slate-300 rounded text-[11px]"
                />
              </div>
              <button
                onClick={previewPayroll}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-[11px] font-semibold hover:bg-slate-100 flex items-center gap-1"
              >
                <FaCalculator className="w-3 h-3" />
                Recalculate
              </button>
              {canCreate && (
                <button
                  onClick={handleRunPayroll}
                  disabled={runningPayroll}
                  className="px-2.5 py-1 rounded-lg border border-emerald-600 bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-1"
                >
                  <FaPlay className="w-3 h-3" />
                  {runningPayroll ? 'Creating Draft...' : 'Create Draft'}
                </button>
              )}
              {canCreate && (
                <button
                  onClick={currentPeriodLocked ? unlockCurrentPeriod : lockCurrentPeriod}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${
                    currentPeriodLocked
                      ? 'border-amber-600 bg-amber-600 text-white hover:bg-amber-700'
                      : 'border-slate-300 bg-white hover:bg-slate-100'
                  }`}
                >
                  {currentPeriodLocked ? 'Unlock Period' : 'Lock Period'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 p-2.5 bg-white">
              <div className="rounded-lg border border-slate-200 p-2 bg-slate-50/80">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">Active Schemes</div>
                <div className="text-[16px] font-semibold mt-1">{salarySchemes.length}</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-2 bg-slate-50/80">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">Net Payroll</div>
                <div className="text-[13px] font-semibold mt-1">{formatMoney(preview?.reconciliation.totals.netPay)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-2 bg-slate-50/80">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">Gross Payroll</div>
                <div className="text-[13px] font-semibold mt-1">{formatMoney(preview?.reconciliation.totals.grossPay)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-2 bg-slate-50/80">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">Statutory Deductions</div>
                <div className="text-[13px] font-semibold mt-1">{formatMoney(preview?.reconciliation.totals.statutoryDeductions)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-2 bg-slate-50/80">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">Employer Statutory</div>
                <div className="text-[13px] font-semibold mt-1">{formatMoney(preview?.reconciliation.totals.employerStatutoryContributions)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-2 bg-slate-50/80">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">Reconciliation</div>
                <div className="mt-1 text-[11px] font-semibold flex items-center gap-1">
                  {preview?.reconciliation.status === 'balanced' ? (
                    <>
                      <FaCheckCircle className="text-emerald-600" />
                      <span className="text-emerald-700">Balanced</span>
                    </>
                  ) : (
                    <span className="text-amber-700">Variance detected</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">{formatMoney(preview?.reconciliation.totals.variance)}</div>
              </div>
            </div>
          </div>

          {error && <div className="p-2 text-[11px] rounded-lg border border-rose-200 bg-rose-50 text-rose-700">{error}</div>}
          {success && <div className="p-2 text-[11px] rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">{success}</div>}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
            {canCreate && (
              <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm xl:col-span-2 space-y-2">
                <div className="text-[11px] uppercase tracking-wide text-slate-600">Kenya Statutory Settings</div>
                {payrollSettings ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={selectedPresetId}
                        onChange={(e) => setSelectedPresetId(e.target.value)}
                        className="px-2 py-1 border border-slate-300 rounded-lg text-[11px] min-w-56"
                      >
                        {taxPresets.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.name} ({preset.effectiveFrom})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={applyTaxPreset}
                        className="px-2 py-1 rounded-lg border border-slate-700 bg-slate-700 text-white text-[11px] hover:bg-slate-800"
                      >
                        Apply KRA Preset
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                      <label className="text-[11px] text-slate-700 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={payrollSettings.enabled}
                          onChange={(e) =>
                            setPayrollSettings((prev) => (prev ? { ...prev, enabled: e.target.checked } : prev))
                          }
                        />
                        Enable Statutory
                      </label>
                      <input
                        type="number"
                        placeholder="Personal relief"
                        value={payrollSettings.personalRelief}
                        onChange={(e) =>
                          setPayrollSettings((prev) =>
                            prev ? { ...prev, personalRelief: Number(e.target.value) || 0 } : prev,
                          )
                        }
                        className={numberCell}
                      />
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="NSSF rate"
                        value={payrollSettings.nssfRateEmployee}
                        onChange={(e) =>
                          setPayrollSettings((prev) =>
                            prev ? { ...prev, nssfRateEmployee: Number(e.target.value) || 0 } : prev,
                          )
                        }
                        className={numberCell}
                      />
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="Health rate"
                        value={payrollSettings.healthInsuranceRateEmployee}
                        onChange={(e) =>
                          setPayrollSettings((prev) =>
                            prev
                              ? { ...prev, healthInsuranceRateEmployee: Number(e.target.value) || 0 }
                              : prev,
                          )
                        }
                        className={numberCell}
                      />
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="Housing rate"
                        value={payrollSettings.housingLevyRateEmployee}
                        onChange={(e) =>
                          setPayrollSettings((prev) =>
                            prev ? { ...prev, housingLevyRateEmployee: Number(e.target.value) || 0 } : prev,
                          )
                        }
                        className={numberCell}
                      />
                    </div>

                    <div>
                      <button
                        onClick={savePayrollSettings}
                        disabled={savingSettings}
                        className="px-2.5 py-1 rounded-lg border border-indigo-700 bg-indigo-700 text-white text-[11px] hover:bg-indigo-800 disabled:opacity-60"
                      >
                        {savingSettings ? 'Saving...' : 'Save Tax Settings'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-[11px] text-slate-500">Loading settings...</div>
                )}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
              <div className="text-[11px] uppercase tracking-wide text-slate-600 mb-2">Compliance Reports</div>
              <div className="space-y-2">
                <button
                  onClick={exportP10}
                  className="w-full px-2 py-1 rounded-lg border border-slate-300 bg-white text-[11px] hover:bg-slate-100"
                >
                  Export P10 ({monthOptions.find((item) => item.value === month)?.label} {year})
                </button>
                <button
                  onClick={exportP9}
                  className="w-full px-2 py-1 rounded-lg border border-slate-300 bg-white text-[11px] hover:bg-slate-100"
                >
                  Export P9 ({year})
                </button>
                <div className="text-[10px] text-slate-500">
                  Includes employee totals for gross pay, PAYE, NSSF, health and housing levy.
                </div>
              </div>
            </div>
          </div>

          {canCreate && (
            <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wide text-slate-600">Salary Schemes</div>
                <button
                  onClick={() => setShowCreateScheme((prev) => !prev)}
                  className="px-2 py-1 rounded-lg border border-slate-300 text-[11px] hover:bg-slate-100 flex items-center gap-1"
                >
                  <FaPlus className="w-3 h-3" />
                  {showCreateScheme ? 'Close' : 'Add Scheme'}
                </button>
              </div>

              {showCreateScheme && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-5 gap-2">
                  <input
                    placeholder="Employee"
                    value={salaryForm.employeeName}
                    onChange={(e) => setSalaryForm((prev) => ({ ...prev, employeeName: e.target.value }))}
                    className={numberCell}
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={salaryForm.salaryAmount || ''}
                    onChange={(e) => setSalaryForm((prev) => ({ ...prev, salaryAmount: Number(e.target.value) || 0 }))}
                    className={numberCell}
                  />
                  <select
                    value={salaryForm.frequency}
                    onChange={(e) => setSalaryForm((prev) => ({ ...prev, frequency: e.target.value as 'monthly' | 'yearly' }))}
                    className={numberCell}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  <input
                    type="date"
                    value={salaryForm.startDate}
                    onChange={(e) => setSalaryForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    className={numberCell}
                  />
                  <button
                    onClick={handleCreateScheme}
                    disabled={savingScheme}
                    className="px-2 py-1 rounded-lg border border-blue-700 bg-blue-700 text-white text-[11px] hover:bg-blue-800 disabled:opacity-60"
                  >
                    {savingScheme ? 'Saving...' : 'Save Scheme'}
                  </button>
                </div>
              )}
            </div>
          )}

          {canCreate && (
            <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wide text-slate-600">Bonus / Deduction Templates</div>
                <button
                  onClick={() => setShowCreateTemplate((prev) => !prev)}
                  className="px-2 py-1 rounded-lg border border-slate-300 text-[11px] hover:bg-slate-100"
                >
                  {showCreateTemplate ? 'Close' : 'Add Template'}
                </button>
              </div>

              {showCreateTemplate && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-6 gap-2">
                  <input
                    placeholder="Template name"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
                    className={numberCell}
                  />
                  <select
                    value={templateForm.type}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        type: e.target.value as 'bonus' | 'commission' | 'deduction',
                      }))
                    }
                    className={numberCell}
                  >
                    <option value="bonus">Bonus</option>
                    <option value="commission">Commission</option>
                    <option value="deduction">Deduction</option>
                  </select>
                  <select
                    value={templateForm.mode}
                    onChange={(e) => setTemplateForm((prev) => ({ ...prev, mode: e.target.value as 'fixed' | 'percentage' }))}
                    className={numberCell}
                  >
                    <option value="fixed">Fixed</option>
                    <option value="percentage">Percentage</option>
                  </select>
                  <input
                    type="number"
                    placeholder={templateForm.mode === 'percentage' ? 'Value %' : 'Amount'}
                    value={templateForm.value || ''}
                    onChange={(e) => setTemplateForm((prev) => ({ ...prev, value: Number(e.target.value) || 0 }))}
                    className={numberCell}
                  />
                  <select
                    value={templateForm.applyScope}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        applyScope: e.target.value as 'all' | 'department' | 'employee',
                      }))
                    }
                    className={numberCell}
                  >
                    <option value="all">All employees</option>
                    <option value="department">Department</option>
                    <option value="employee">Specific employee</option>
                  </select>
                  <button
                    onClick={handleCreateTemplate}
                    disabled={savingTemplate}
                    className="px-2 py-1 rounded-lg border border-teal-700 bg-teal-700 text-white text-[11px] hover:bg-teal-800 disabled:opacity-60"
                  >
                    {savingTemplate ? 'Saving...' : 'Save Template'}
                  </button>
                </div>
              )}

              <div className="mt-2 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Mode</th>
                      <th className="text-right p-2">Value</th>
                      <th className="text-left p-2">Scope</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((template) => (
                      <tr key={template.id} className="border-t even:bg-slate-50/70">
                        <td className="p-2">{template.name}</td>
                        <td className="p-2 capitalize">{template.type}</td>
                        <td className="p-2 capitalize">{template.mode}</td>
                        <td className="p-2 text-right">
                          {template.mode === 'percentage'
                            ? `${template.value.toFixed(2)}%`
                            : `Ksh ${template.value.toFixed(2)}`}
                        </td>
                        <td className="p-2 capitalize">{template.applyScope.replace('_', ' ')}</td>
                      </tr>
                    ))}
                    {templates.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-3 text-center text-slate-500">
                          No templates configured yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-4 flex items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <div className="max-h-135 overflow-auto">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-900 text-slate-100 sticky top-0 z-10">
                    <tr>
                      <th className="text-left p-2 font-semibold">Employee</th>
                      <th className="text-right p-2 font-semibold">Base</th>
                      <th className="text-right p-2 font-semibold">Bonus</th>
                      <th className="text-right p-2 font-semibold">Commission</th>
                      <th className="text-right p-2 font-semibold">Other Deduction</th>
                      <th className="text-right p-2 font-semibold">PAYE</th>
                      <th className="text-right p-2 font-semibold">NSSF</th>
                      <th className="text-right p-2 font-semibold">Health</th>
                      <th className="text-right p-2 font-semibold">Housing</th>
                      <th className="text-right p-2 font-semibold">Net</th>
                      <th className="text-right p-2 font-semibold">Paid</th>
                      <th className="text-right p-2 font-semibold">Variance</th>
                      <th className="text-left p-2 font-semibold">Payslip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(preview?.payrollItems || []).map((item) => (
                      <tr key={item.salarySchemeId} className="border-t even:bg-slate-50/70 hover:bg-cyan-50/50">
                        <td className="p-2">
                          <div className="font-medium text-slate-800">{item.employeeName}</div>
                        </td>
                        <td className="p-2 text-right">{item.baseSalary.toFixed(2)}</td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={adjustments[item.salarySchemeId]?.bonus ?? item.bonus}
                            onChange={(e) => updateAdjustment(item.salarySchemeId, 'bonus', e.target.value)}
                            className={numberCellDark}
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={adjustments[item.salarySchemeId]?.commission ?? item.commission}
                            onChange={(e) => updateAdjustment(item.salarySchemeId, 'commission', e.target.value)}
                            className={numberCellDark}
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={adjustments[item.salarySchemeId]?.deduction ?? item.deduction}
                            onChange={(e) => updateAdjustment(item.salarySchemeId, 'deduction', e.target.value)}
                            className={numberCellDark}
                          />
                        </td>
                        <td className="p-2 text-right">{item.statutory.paye.toFixed(2)}</td>
                        <td className="p-2 text-right">{item.statutory.nssfEmployee.toFixed(2)}</td>
                        <td className="p-2 text-right">{item.statutory.healthInsuranceEmployee.toFixed(2)}</td>
                        <td className="p-2 text-right">{item.statutory.housingLevyEmployee.toFixed(2)}</td>
                        <td className="p-2 text-right font-semibold text-slate-900">{item.netPay.toFixed(2)}</td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={adjustments[item.salarySchemeId]?.paidAmount ?? item.paidAmount}
                            onChange={(e) => updateAdjustment(item.salarySchemeId, 'paidAmount', e.target.value)}
                            className={numberCellDark}
                          />
                        </td>
                        <td className={`p-2 text-right font-medium ${item.variance === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {item.variance.toFixed(2)}
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() => downloadPayslip(item)}
                            className="px-2 py-1 rounded-lg border border-slate-300 text-[10px] hover:bg-slate-100"
                          >
                            Payslip PDF
                          </button>
                        </td>
                      </tr>
                    ))}

                    {(!preview?.payrollItems || preview.payrollItems.length === 0) && (
                      <tr>
                        <td colSpan={13} className="p-4 text-center text-slate-500">
                          <div className="flex items-center justify-center gap-2">
                            <FaMoneyBillWave className="text-slate-400" />
                            No payroll items available for the selected month.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-auto shadow-sm">
            <div className="px-3 py-2 border-b bg-slate-50 flex items-center gap-2 text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
              <FaHistory className="w-3 h-3" />
              Payroll Run History
            </div>
            <div className="px-3 py-2 border-b bg-white flex flex-wrap items-center gap-2">
              <select
                value={runScope}
                onChange={(e) => setRunScope(e.target.value as 'all' | 'mine')}
                className="px-2 py-1 rounded border border-slate-300 text-[11px] bg-white"
              >
                <option value="all">All Branches</option>
                {user?.branchId && <option value="mine">My Branch</option>}
              </select>
              <select
                value={runStatusFilter}
                onChange={(e) =>
                  setRunStatusFilter(
                    e.target.value as 'all' | 'draft' | 'approved' | 'posted' | 'reversed' | 'cancelled',
                  )
                }
                className="px-2 py-1 rounded border border-slate-300 text-[11px] bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="posted">Posted</option>
                <option value="reversed">Reversed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={runMonthFilter}
                onChange={(e) =>
                  setRunMonthFilter(
                    e.target.value === 'all' ? 'all' : Number(e.target.value),
                  )
                }
                className="px-2 py-1 rounded border border-slate-300 text-[11px] bg-white"
              >
                <option value="all">All Months</option>
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={runYearFilter}
                onChange={(e) =>
                  setRunYearFilter(
                    e.target.value === 'all' ? 'all' : Number(e.target.value),
                  )
                }
                className="px-2 py-1 rounded border border-slate-300 text-[11px] bg-white"
              >
                <option value="all">All Years</option>
                {Array.from({ length: 6 }, (_, idx) => now.getFullYear() - idx).map(
                  (yearOption) => (
                    <option key={yearOption} value={yearOption}>
                      {yearOption}
                    </option>
                  ),
                )}
              </select>
              <button
                onClick={fetchRuns}
                className="px-2 py-1 rounded border border-slate-300 text-[11px] hover:bg-slate-100"
              >
                Refresh History
              </button>
            </div>
            <table className="w-full text-[11px]">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left p-2">Period</th>
                  <th className="text-left p-2">Processed</th>
                  <th className="text-right p-2">Employees</th>
                  <th className="text-right p-2">Net Pay</th>
                  <th className="text-right p-2">Variance</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-t even:bg-slate-50/70">
                    <td className="p-2">{run.monthName}</td>
                    <td className="p-2">{new Date(run.processedAt).toLocaleString()}</td>
                    <td className="p-2 text-right">{run.processedCount}</td>
                    <td className="p-2 text-right">Ksh {run.totals.netPay.toFixed(2)}</td>
                    <td className="p-2 text-right">Ksh {run.totals.variance.toFixed(2)}</td>
                    <td className="p-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          (run.status || 'posted') === 'reversed'
                            ? 'bg-rose-100 text-rose-700'
                            : (run.status || 'posted') === 'cancelled'
                            ? 'bg-slate-200 text-slate-700'
                            : (run.status || 'posted') === 'draft'
                            ? 'bg-slate-100 text-slate-700'
                            : (run.status || 'posted') === 'approved'
                            ? 'bg-cyan-100 text-cyan-700'
                            : run.reconciliationStatus === 'balanced'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {(run.status || 'posted') === 'reversed'
                          ? 'Reversed'
                          : (run.status || 'posted') === 'cancelled'
                          ? 'Cancelled'
                          : (run.status || 'posted') === 'draft'
                          ? 'Draft'
                          : (run.status || 'posted') === 'approved'
                          ? 'Approved'
                          : (run.status || 'posted') === 'posted'
                          ? 'Posted'
                          : run.reconciliationStatus === 'balanced'
                          ? 'Balanced'
                          : 'Variance detected'}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        {(run.status || 'posted') === 'draft' && (
                          <button
                            onClick={() => approveRun(run.id)}
                            className="px-2 py-0.5 rounded border border-slate-300 text-[10px] hover:bg-slate-100"
                          >
                            Approve
                          </button>
                        )}
                        {(run.status || 'posted') === 'draft' && (
                          <button
                            onClick={() => cancelDraftRun(run.id)}
                            className="px-2 py-0.5 rounded border border-slate-300 text-[10px] hover:bg-slate-100"
                          >
                            Cancel Draft
                          </button>
                        )}
                        {(run.status || 'posted') === 'approved' && (
                          <button
                            onClick={() => postRun(run.id)}
                            className="px-2 py-0.5 rounded border border-emerald-300 text-emerald-700 text-[10px] hover:bg-emerald-50"
                          >
                            Post
                          </button>
                        )}
                        {(run.status || 'posted') === 'posted' && (
                          <button
                            onClick={() => reverseRun(run.id)}
                            className="px-2 py-0.5 rounded border border-rose-300 text-rose-700 text-[10px] hover:bg-rose-50"
                          >
                            Reverse
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedRunId((prev) => (prev === run.id ? '' : run.id))}
                          className="px-2 py-0.5 rounded border border-slate-300 text-[10px] hover:bg-slate-100"
                        >
                          {selectedRunId === run.id ? 'Hide Audit' : 'View Audit'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {runs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-3 text-center text-slate-500">
                      No payroll runs have been recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {selectedRunId && (
              <div className="border-t bg-slate-50 p-3">
                <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-2">
                  Run Audit Trail
                </div>
                {(() => {
                  const selectedRun = runs.find((item) => item.id === selectedRunId);
                  const trail = Array.isArray(selectedRun?.auditTrail) ? selectedRun!.auditTrail : [];
                  if (!selectedRun) {
                    return <div className="text-[11px] text-slate-500">Run not found.</div>;
                  }

                  if (trail.length === 0) {
                    return <div className="text-[11px] text-slate-500">No audit events recorded for this run yet.</div>;
                  }

                  return (
                    <div className="space-y-1.5">
                      {trail.map((event, index) => (
                        <div key={`${event.action}-${event.at}-${index}`} className="text-[11px] text-slate-700">
                          <span className="font-semibold capitalize">{event.action.replace('_', ' ')}</span>
                          <span className="text-slate-500"> at {new Date(event.at).toLocaleString()}</span>
                          {event.by ? <span className="text-slate-500"> by {event.by}</span> : null}
                          {event.note ? <span className="text-slate-500"> ({event.note})</span> : null}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
