"use client";
import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utils/api";
import AuthGuard from '@/components/AuthGuard';
import { FaCalendarAlt, /* FaBuilding, */ FaSave, FaTimesCircle, FaExclamationTriangle, FaPlus, FaEye, FaEdit, FaTrash, /* FaCheckCircle, FaClock, */ FaRedo, FaFileDownload, FaChartBar, FaHistory, FaSync } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import { useTenant } from '@/hooks/useTenant';
import { useAppPreferences } from '@/hooks/useAppPreferences';
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
import Spinner from '@/components/Spinner';
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface Expense {
  id: string;
  amount: number;
  description: string;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    color?: string;
  };
  expenseType: 'one_time' | 'recurring';
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDueDate?: string;
  branchId?: string;
  receiptUrl?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
  };
  branch?: {
    id: string;
    name: string;
  };
}

interface ExpenseFormData {
  amount: number;
  description: string;
  category: string;
  expenseType: 'one_time' | 'recurring';
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDueDate?: string;
  branchId?: string;
  receiptUrl?: string;
  notes?: string;
}

interface SalarySchemeFormData {
  employeeName: string;
  salaryAmount: number;
  frequency: 'monthly' | 'yearly';
  startDate: string;
  userId: string;
  branchId?: string;
  notes?: string;
}

interface SalaryScheme {
  id: string;
  employeeName: string;
  salaryAmount: number;
  frequency: 'monthly' | 'yearly';
  startDate: string;
  nextDueDate?: string;
  lastPaidDate?: string;
  userId: string;
  branchId?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
  };
  branch?: {
    id: string;
    name: string;
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface PDFTemplate {
  businessName: boolean;
  businessAddress: boolean;
  businessPhone: boolean;
  businessEmail: boolean;
  branchInfo: boolean;
  logo: boolean;
  primaryColor: string;
  secondaryColor: string;
  fontSize: string;
  showVat: boolean;
  showSubtotal: boolean;
  footerText: string;
  paperSize: string;
  orientation: string;
  margins: string;
}


// Add interfaces for branch comparison and past months data
interface BranchComparisonData {
  branches?: {
    branchId?: string;
    branchName: string;
    totalAmount: number;
    expenseCount: number;
  }[];
  dateRange?: {
    start: string;
    end: string;
  };
}

interface PastMonthsData {
  records?: {
    month: string;
    monthName: string;
    totalAmount: number;
    expenseCount: number;
  }[];
}

const getCategoryName = (expense: Expense): string => expense.category?.name || 'other';

export default function ExpensesPage() {
  console.log('ExpensesPage component rendered');
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'current' | 'comparison' | 'past' | 'salaries' | 'records'>('current');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setSuccess] = useState<string | null>(null); // Used for showing success messages
  const [drawerType, setDrawerType] = useState<'create' | 'details' | null>(null);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [expenseTypeFilter, setExpenseTypeFilter] = useState<'all' | 'one_time' | 'recurring'>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page] = useState(1);
  const [limit] = useState(10);
  const [branchComparison, setBranchComparison] = useState<BranchComparisonData | null>(null);
  const [pastMonthsData, setPastMonthsData] = useState<PastMonthsData | null>(null);
  const [resetting, setResetting] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [salaryForm, setSalaryForm] = useState<SalarySchemeFormData>({
    employeeName: '',
    salaryAmount: 0,
    frequency: 'monthly',
    startDate: '',
    userId: '',
    branchId: '',
    notes: '',
  });
  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: 0,
    description: '',
    category: 'other',
    expenseType: 'one_time',
  });
  const { preferences: appPrefs } = useAppPreferences();
  const [exportType, setExportType] = useState<'csv' | 'pdf'>('csv');
  const hasAppliedExportPref = React.useRef(false);

  // Apply saved default export format once when preferences load
  useEffect(() => {
    if (hasAppliedExportPref.current) return;
    hasAppliedExportPref.current = true;
    setExportType(appPrefs.reportingDefaultExportFormat);
  }, [appPrefs.reportingDefaultExportFormat]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [salaryAssigning, setSalaryAssigning] = useState(false);
  const [salarySchemes, setSalarySchemes] = useState<SalaryScheme[]>([]);
  const [loadingSchemes, setLoadingSchemes] = useState(false);
  const [selectedSalaryScheme, setSelectedSalaryScheme] = useState<SalaryScheme | null>(null);
  const [salaryDrawerType, setSalaryDrawerType] = useState<'details' | 'create' | null>(null);
  const [isEditingSalary, setIsEditingSalary] = useState(false);
  const [selectedSalarySchemeForEdit, setSelectedSalarySchemeForEdit] = useState<SalaryScheme | null>(null);
  const [currentMonthSalaryTotal, setCurrentMonthSalaryTotal] = useState<{ monthName: string; totalAmount: number; salarySchemeCount: number } | null>(null);
  const [salarySummaryLoading, setSalarySummaryLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [salaryTotalForMonth, setSalaryTotalForMonth] = useState<{ monthName: string; totalAmount: number; salarySchemeCount: number } | null>(null);
  const [fetchingMonthlyTotal, setFetchingMonthlyTotal] = useState(false);

  const [fetchingCurrentMonthExpenses, setFetchingCurrentMonthExpenses] = useState(false);
  const [currentMonthExpensesTotal, setCurrentMonthExpensesTotal] = useState<{ monthName: string; totalAmount: number; expenseCount: number } | null>(null);
  const [expenseSelectedMonth, setExpenseSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [expenseSelectedYear, setExpenseSelectedYear] = useState<number>(new Date().getFullYear());
  const [fetchingExpenseMonthlyTotal, setFetchingExpenseMonthlyTotal] = useState(false);
  const [expenseTotalForSelectedMonth, setExpenseTotalForSelectedMonth] = useState<{ monthName: string; totalAmount: number; expenseCount: number } | null>(null);

  const normalizedRoles = Array.isArray(user?.roles)
    ? user.roles.map((role) => String(role).toLowerCase())
    : [];
  const isBranchScopedUser = normalizedRoles.includes('manager') || normalizedRoles.includes('cashier');
  const assignedBranchId = user?.branchId || null;
  const effectiveBranchFilter = isBranchScopedUser ? assignedBranchId : branchFilter;
  const assignedBranchNameFromList = assignedBranchId
    ? branches.find((branch) => branch.id === assignedBranchId)?.name
    : undefined;
  const assignedBranchNameFromExpenses = assignedBranchId
    ? expenses.find((expense) => expense.branch?.id === assignedBranchId)?.branch?.name
    : undefined;
  const assignedBranchName =
    assignedBranchNameFromList || assignedBranchNameFromExpenses || 'Assigned Branch';

  useEffect(() => {
    if (!isBranchScopedUser || !assignedBranchId) return;

    if (branchFilter !== assignedBranchId) {
      setBranchFilter(assignedBranchId);
    }

    setFormData((prev) =>
      prev.branchId === assignedBranchId ? prev : { ...prev, branchId: assignedBranchId },
    );
    setSalaryForm((prev) =>
      prev.branchId === assignedBranchId ? prev : { ...prev, branchId: assignedBranchId },
    );
  }, [isBranchScopedUser, assignedBranchId, branchFilter]);

  const fetchBranchComparison = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (effectiveBranchFilter) {
        params.append('branchId', effectiveBranchFilter);
      }
      const endpoint = `/expenses/comparison/branches${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiGet(endpoint);
      setBranchComparison(response as BranchComparisonData);
    } catch (error) {
      console.error('Failed to fetch branch comparison:', error);
      setBranchComparison(null);
    }
  }, [effectiveBranchFilter]);

  const fetchPastMonths = useCallback(async () => {
    try {
      const params = new URLSearchParams({ months: '12' });
      if (effectiveBranchFilter) {
        params.append('branchId', effectiveBranchFilter);
      }
      const response = await apiGet(`/expenses/past-months?${params.toString()}`);
      const payload = response as PastMonthsData;
      const records = [...(payload.records || [])].sort((a, b) => b.month.localeCompare(a.month));
      setPastMonthsData({ records });
    } catch (error) {
      console.error('Failed to fetch past months records:', error);
      setPastMonthsData(null);
    }
  }, [effectiveBranchFilter]);

  const fetchCurrentMonthExpenseTotal = useCallback(async () => {
    try {
      setFetchingCurrentMonthExpenses(true);
      const params = new URLSearchParams();
      if (effectiveBranchFilter) {
        params.append('branchId', effectiveBranchFilter);
      }
      const endpoint = `/expenses/current-month-total${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiGet(endpoint);
      const payload = (response as { data?: { monthName: string; totalAmount: number; expenseCount: number } }).data;
      setCurrentMonthExpensesTotal(payload || null);
    } catch (error) {
      console.error('Failed to fetch current month expense total:', error);
      setCurrentMonthExpensesTotal(null);
    } finally {
      setFetchingCurrentMonthExpenses(false);
    }
  }, [effectiveBranchFilter]);

  const fetchExpenseTotalForMonth = useCallback(async () => {
    try {
      setFetchingExpenseMonthlyTotal(true);
      const params = new URLSearchParams({
        month: String(expenseSelectedMonth),
        year: String(expenseSelectedYear),
      });
      if (effectiveBranchFilter) {
        params.append('branchId', effectiveBranchFilter);
      }
      const response = await apiGet(`/expenses/total-expense?${params.toString()}`);
      const payload = (response as { data?: { monthName: string; totalAmount: number; expenseCount: number } }).data;
      setExpenseTotalForSelectedMonth(payload || null);
    } catch (error) {
      console.error('Failed to fetch selected month expense total:', error);
      setExpenseTotalForSelectedMonth(null);
    } finally {
      setFetchingExpenseMonthlyTotal(false);
    }
  }, [effectiveBranchFilter, expenseSelectedMonth, expenseSelectedYear]);

  const fetchCurrentMonthSalaryTotal = useCallback(async () => {
    try {
      setSalarySummaryLoading(true);
      console.log('Fetching current month salary total');
      const response = await apiGet('/salary-schemes/current-month-total');
      console.log('Current month salary total API response:', response);
      setCurrentMonthSalaryTotal((response as { data: { monthName: string; totalAmount: number; salarySchemeCount: number } }).data);
    } catch (error) {
      console.error('Failed to fetch current month salary total:', error);
      setError('Failed to load current month salary total');
      setCurrentMonthSalaryTotal(null);
    } finally {
      setSalarySummaryLoading(false);
    }
  }, []);

  const fetchSalaryTotalForMonth = useCallback(async () => {
    try {
      setFetchingMonthlyTotal(true);
      console.log(`Fetching salary total for month: ${selectedMonth}, year: ${selectedYear}`);
      const response = await apiGet(`/salary-schemes/total-expense?month=${selectedMonth}&year=${selectedYear}`);
      console.log('Salary total API response:', response);
      setSalaryTotalForMonth((response as { data: { monthName: string; totalAmount: number; salarySchemeCount: number } }).data);
    } catch (error) {
      console.error('Failed to fetch monthly salary total:', error);
      setError('Failed to load monthly salary total');
    } finally {
      setFetchingMonthlyTotal(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchCurrentMonthSalaryTotal();
    fetchSalaryTotalForMonth();
  }, [fetchCurrentMonthSalaryTotal, fetchSalaryTotalForMonth]);

  useEffect(() => {
    fetchCurrentMonthExpenseTotal();
    fetchExpenseTotalForMonth();
  }, [fetchCurrentMonthExpenseTotal, fetchExpenseTotalForMonth]);

  // Use React Query hook for tenant data (cached and shared across components)
  const { data: tenantData } = useTenant();
  
  // Log tenant data when available (for debugging)
  useEffect(() => {
    if (tenantData) {
      console.log('Tenant data loaded:', tenantData);
      console.log('Tenant data keys:', Object.keys(tenantData || {}));
      console.log('PDF Template:', tenantData?.pdfTemplate);
      console.log('PDF Template details:', JSON.stringify(tenantData?.pdfTemplate, null, 2));
    }
  }, [tenantData]);

  

  const fetchSalarySchemes = useCallback(async () => {
    try {
      setLoadingSchemes(true);
      let url = '/salary-schemes';
      const params = new URLSearchParams();
      if (effectiveBranchFilter) {
        params.append('branchId', effectiveBranchFilter);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await apiGet(url);
      const data = (response as { data?: unknown })?.data || response || [];
      setSalarySchemes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch salary schemes:', error);
      setError('Failed to load salary schemes');
    } finally {
      setLoadingSchemes(false);
    }
  }, [effectiveBranchFilter]);

  // Permission checks
  const canViewExpenses = hasPermission(user, 'view_sales');
  const canCreateExpenses = hasPermission(user, 'create_sales');

 

  
  const handleMonthlyReset = async () => {
    if (!confirm('Are you sure you want to reset monthly expenses? This will archive all current month expenses.')) return;
    setResetting(true);
    try {
      await apiPost('/expenses/reset-monthly', {});
      setSuccess('Monthly expenses reset successfully!');
      await fetchExpenses();
      await fetchBranchComparison();
      await fetchPastMonths();
      await fetchCurrentMonthExpenseTotal();
      await fetchExpenseTotalForMonth();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: unknown) {
      setError((error as { message?: string })?.message || 'Failed to reset monthly expenses');
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'comparison') {
      void fetchBranchComparison();
    }
    if (activeTab === 'past') {
      void fetchPastMonths();
    }
  }, [activeTab, fetchBranchComparison, fetchPastMonths]);

  const handleDownloadReport = async () => {
    if (filteredExpenses.length === 0) {
      setError('No expenses to export');
      return;
    }

    const reportDate = new Date().toLocaleDateString();
    const reportTime = new Date().toLocaleTimeString();

    if (exportType === 'csv') {
      // Enhanced CSV with metadata
      const metadata = [
        'SaaS Platform - Expenses Report',
        `Generated on: ${reportDate} at ${reportTime}`,
        `Total Expenses: ${filteredExpenses.length}`,
        `Total Amount: Ksh ${totalAmount.toFixed(2)}`,
        `Filters Applied: ${branchFilter ? `Branch: ${branches.find(b => b.id === branchFilter)?.name || 'Unknown'}` : 'All Branches'}, Type: ${expenseTypeFilter === 'all' ? 'All Types' : expenseTypeFilter === 'one_time' ? 'One-time' : 'Recurring'}${search ? `, Search: "${search}"` : ''}`,
        '', // Empty line
      ];

      const headers = ['ID', 'Amount', 'Description', 'Category', 'Type', 'Frequency', 'Next Due Date', 'Created At', 'Branch', 'Status', 'Created By'];
      const csvContent = [
        ...metadata,
        headers.join(','),
        ...filteredExpenses.map(expense => [
          expense.id,
          expense.amount.toFixed(2),
          `"${expense.description.replace(/"/g, '""')}"`,
          getCategoryName(expense).replace('_', ' '),
          expense.expenseType === 'recurring' ? 'Recurring' : 'One-time',
          expense.frequency || '',
          expense.nextDueDate ? new Date(expense.nextDueDate).toLocaleDateString() : '',
          new Date(expense.createdAt).toLocaleDateString(),
          expense.branch?.name || '',
          expense.isActive ? 'Active' : 'Inactive',
          expense.user.name
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `expenses-report-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (exportType === 'pdf') {
      const pdfTemplate = (tenantData?.pdfTemplate || {}) as PdfTemplate;
      const currency = getPdfCurrency(tenantData, pdfTemplate);
      const margin = getPdfMargin(pdfTemplate);
      const fontSize = getPdfFontSize(pdfTemplate);
      const { primaryRgb, secondaryRgb } = getPdfTableColors(pdfTemplate);

      const doc = new jsPDF(getPdfDocOptions(pdfTemplate));
      await preparePdfWatermark(doc, getFullAssetUrl(tenantData?.watermark as string | null | undefined));
      let yPos = applyPdfBusinessHeader(doc, tenantData, pdfTemplate, margin);

      doc.setFontSize(fontSize + 4);
      doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
      doc.text('Expenses Report', margin, yPos + 8);
      yPos += 16;

      doc.setFontSize(fontSize - 2);
      doc.setTextColor('666666');
      doc.text(`Generated: ${reportDate} at ${reportTime}`, margin, yPos);
      yPos += 6;
      doc.text(`Total Expenses: ${filteredExpenses.length}`, margin, yPos);
      yPos += 6;
      doc.text(`Total Amount: ${currency} ${totalAmount.toFixed(2)}`, margin, yPos);
      yPos += 10;

      const filtersText = `Filters: ${branchFilter ? `Branch: ${branches.find(b => b.id === branchFilter)?.name || 'Unknown'}` : 'All Branches'}, Type: ${expenseTypeFilter === 'all' ? 'All Types' : expenseTypeFilter === 'one_time' ? 'One-time' : 'Recurring'}${search ? `, Search: "${search}"` : ''}`;
      const splitFilters = doc.splitTextToSize(filtersText, doc.internal.pageSize.width - margin * 2);
      doc.text(splitFilters, margin, yPos);
      yPos += splitFilters.length * 6 + 10;

      doc.setFontSize(fontSize);
      doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
      doc.text('Summary', margin, yPos);
      yPos += 10;

      doc.setFontSize(fontSize - 2);
      doc.setTextColor('333333');
      doc.text(`Categories: ${Object.keys(categoryTotals).length}`, margin + 10, yPos);
      doc.text(`Branches: ${Object.keys(branchTotals).length}`, margin + 80, yPos);
      yPos += 8;
      doc.text(`Average Expense: ${currency} ${expenses.length > 0 ? (totalAmount / expenses.length).toFixed(2) : '0.00'}`, margin + 10, yPos);
      yPos += 20;

      const headers = [['ID', 'Amount', 'Description', 'Category', 'Type', 'Created Date', 'Branch', 'Status']];
      const data = filteredExpenses.map(expense => [
        expense.id.substring(0, 8) + '...',
        `${currency} ${expense.amount.toFixed(2)}`,
        expense.description.length > 30 ? expense.description.substring(0, 27) + '...' : expense.description,
        getCategoryName(expense).replace('_', ' '),
        expense.expenseType === 'recurring' ? 'Recurring' : 'One-time',
        new Date(expense.createdAt).toLocaleDateString(),
        expense.branch?.name || '',
        expense.isActive ? 'Active' : 'Inactive'
      ]);

      autoTable(doc, {
        head: headers,
        body: data,
        startY: yPos,
        styles: { fontSize: fontSize - 2, cellPadding: 3 },
        headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: secondaryRgb },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 22, halign: 'right' },
          2: { cellWidth: 40 },
          3: { cellWidth: 25 },
          4: { cellWidth: 20 },
          5: { cellWidth: 25 },
          6: { cellWidth: 25 },
          7: { cellWidth: 20 }
        }
      });

      applyPdfFooterAndPageNumbers(doc, pdfTemplate, 'SaaS POS • Accounting');
      doc.save(`expenses-report-${new Date().toISOString().split('T')[0]}.pdf`);
    }

    setSuccess('Professional report downloaded successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  // Wrap fetchExpenses in useCallback to avoid changing reference on every render
  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/expenses';
      const params = new URLSearchParams();
      if (effectiveBranchFilter) params.append('branchId', effectiveBranchFilter);
      if (expenseTypeFilter !== 'all') params.append('expenseType', expenseTypeFilter);
      if (params.toString()) url += `?${params.toString()}`;
      const response = await apiGet(url);
      const data = (response as { data?: unknown })?.data || response || [];
      const expenseData = Array.isArray(data) ? data : [];
      setExpenses(expenseData);
    } catch {
      setError('Failed to load expenses');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveBranchFilter, expenseTypeFilter]);

  useEffect(() => {
    const fetchAll = async () => {
      await fetchExpenses();
      await fetchBranchComparison();
      await fetchPastMonths();
      await fetchCurrentMonthExpenseTotal();
      await fetchExpenseTotalForMonth();
      await fetchBranches();
      await fetchUsers();
    };
    fetchAll();
  }, [
    effectiveBranchFilter,
    fetchExpenses,
    fetchBranchComparison,
    fetchPastMonths,
    fetchCurrentMonthExpenseTotal,
    fetchExpenseTotalForMonth,
  ]);

  // Filter and sort expenses
  useEffect(() => {
    let filtered = [...expenses];

    // Apply search filter
    if (search) {
      filtered = filtered.filter(expense =>
        expense.description.toLowerCase().includes(search.toLowerCase()) ||
        getCategoryName(expense).toLowerCase().includes(search.toLowerCase()) ||
        (expense.branch?.name.toLowerCase().includes(search.toLowerCase()))
      );
    }

    // Apply sorting
    const compare = (a: string | number, b: string | number): number => {
      if (typeof a === 'string' && typeof b === 'string') {
        return a.localeCompare(b);
      } else {
        return (a as number) - (b as number);
      }
    };

    filtered.sort((a, b) => {
      let aValue: string | number, bValue: string | number;

      switch (sortBy) {
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'category':
          aValue = getCategoryName(a);
          bValue = getCategoryName(b);
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return compare(aValue, bValue);
      } else {
        return compare(bValue, aValue);
      }
    });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginated = filtered.slice(startIndex, endIndex);

    setFilteredExpenses(paginated);
  }, [expenses, search, sortBy, sortOrder, page, limit]);

  const fetchBranches = async () => {
    try {
      const data = await apiGet('/branches');
      const branchList = Array.isArray(data) ? (data as { id: string; name: string }[]) : [];

      if (isBranchScopedUser && assignedBranchId) {
        const ownBranch = branchList.find((branch) => branch.id === assignedBranchId);
        setBranches(ownBranch ? [ownBranch] : []);
        return;
      }

      setBranches(branchList);
    } catch {
      // ignore branch fetch error for now
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await apiGet('/user');
      // Handle both array response and wrapped response
      const usersData = Array.isArray(data) ? data : (data as { data?: unknown[] })?.data || [];
      setUsers((usersData as { id: string; name: string }[]).map(user => ({
        id: user.id,
        name: user.name
      })));
    } catch (error) {
      console.error('Failed to fetch users:', error);
      // ignore user fetch error for now
    }
  };

  const handleInputChange = (field: keyof ExpenseFormData, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateExpense = async () => {
    if (!formData.amount || !formData.description) {
      setError('Amount and description are required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const expenseData = {
        ...formData,
        ...(formData.expenseType === 'one_time' && { frequency: undefined, nextDueDate: undefined }),
      };

      await apiPost('/expenses', expenseData);

      setSuccess('Expense created successfully!');
      setDrawerType(null);
      setFormData({
        amount: 0,
        description: '',
        category: 'other',
        expenseType: 'one_time',
      });

      // Refresh expenses list
      await fetchExpenses();
      await fetchBranchComparison();
      await fetchPastMonths();
      await fetchCurrentMonthExpenseTotal();
      await fetchExpenseTotalForMonth();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: unknown) {
      setError((error as { message?: string })?.message || 'Failed to create expense');
    } finally {
      setCreating(false);
    }
  };

  // Delete Expense
  const handleDeleteExpense = async () => {
    if (!selectedExpense) return;
    setCreating(true);
    setError(null);
    try {
      await apiDelete(`/expenses/${selectedExpense.id}`);
      setSuccess('Expense deleted successfully!');
      setDrawerType(null);
      setSelectedExpense(null);
      await fetchExpenses();
      await fetchBranchComparison();
      await fetchPastMonths();
      await fetchCurrentMonthExpenseTotal();
      await fetchExpenseTotalForMonth();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: unknown) {
      setError((error as { message?: string })?.message || 'Failed to delete expense');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSalaryScheme = async (scheme: SalaryScheme) => {
    setCreating(true);
    setError(null);
    try {
      await apiDelete(`/salary-schemes/${scheme.id}`);
      setSuccess('Salary scheme deleted successfully!');
      setSalaryDrawerType(null);
      setSelectedSalaryScheme(null);
      await fetchSalarySchemes();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: unknown) {
      setError((error as { message?: string })?.message || 'Failed to delete salary scheme');
    } finally {
      setCreating(false);
    }
  };

  // Accept category argument for compatibility with usages
  // Remove unused parameter to fix lint error
  const getCategoryColor = () => {
    // No color classes, just plain text
    return '';
  };

  const getExpenseTypeIcon = (type: string) => {
    return type === 'recurring' ? <FaRedo className="w-4 h-4" /> : <FaCalendarAlt className="w-4 h-4" />;
  };

  // Calculate summary totals
  const totalAmount = Array.isArray(expenses) ? expenses.reduce((sum, exp) => sum + exp.amount, 0) : 0;
  const categoryTotals = Array.isArray(expenses) ? expenses.reduce((acc, exp) => {
    acc[getCategoryName(exp)] = (acc[getCategoryName(exp)] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>) : {};
  const branchTotals = Array.isArray(expenses) ? expenses.reduce((acc, exp) => {
    if (exp.branch?.name) {
      acc[exp.branch.name] = (acc[exp.branch.name] || 0) + exp.amount;
    }
    return acc;
  }, {} as Record<string, number>) : {};

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (!canViewExpenses) {
    return (
      <AuthGuard>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <FaExclamationTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied!</h2>
            <p className="text-gray-600 mb-4">You don&apos;t have permission to view expenses.</p>
            <p className="text-sm text-gray-500">Contact your administrator to request access.</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const handleSalaryFormChange = (field: keyof SalarySchemeFormData, value: unknown) => {
    setSalaryForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAssignSalary = async () => {
    if (!salaryForm.employeeName || !salaryForm.salaryAmount || !salaryForm.startDate) {
      setError('Please fill all required fields');
      return;
    }
    setSalaryAssigning(true);
    setError(null);
    try {
      if (isEditingSalary && selectedSalarySchemeForEdit) {
        // Edit existing salary scheme
        await apiPut(`/salary-schemes/${selectedSalarySchemeForEdit.id}`, {
          ...salaryForm,
        });
        setSuccess('Salary scheme updated successfully!');
      } else {
        // Create new salary scheme
        await apiPost('/salary-schemes', {
          ...salaryForm,
        });
        setSuccess('Salary assigned successfully!');
      }
      setSalaryForm({
        employeeName: '',
        salaryAmount: 0,
        frequency: 'monthly',
        startDate: '',
        userId: '',
        branchId: '',
        notes: '',
      });
      setIsEditingSalary(false);
      setSelectedSalarySchemeForEdit(null);
      setSalaryDrawerType(null);
      await fetchExpenses();
      await fetchSalarySchemes();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: unknown) {
      setError((error as { message?: string })?.message || `Failed to ${isEditingSalary ? 'update' : 'assign'} salary`);
    } finally {
      setSalaryAssigning(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 py-3">
          {/* Header */}
          <div className="mb-3">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
              <div>
                <h1 className="text-lg font-semibold flex items-center gap-2">
                  <FaChartBar className="w-4 h-4 text-primary" />
                  Expenses
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value as 'csv' | 'pdf')}
                  className="px-2.5 py-1.5 bg-card border border-border rounded text-xs focus:ring-1 focus:ring-ring focus:border-transparent"
                >
                  <option value="csv">CSV Export</option>
                  <option value="pdf">PDF Export</option>
                </select>
                <button
                  onClick={handleDownloadReport}
                  className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded border border-border hover:bg-muted text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <FaFileDownload className="w-3.5 h-3.5" />
                  Export
                </button>
                {canCreateExpenses && (
                  <button
                    onClick={() => setDrawerType('create')}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded border border-primary hover:bg-primary/90 text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <FaPlus className="w-3.5 h-3.5" />
                    Add Expense
                  </button>
                )}
              </div>
            </div>
          </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1 mb-3 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-3 py-1.5 rounded-t text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'current'
                ? 'bg-slate-700 text-white border-b-2 border-slate-700'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900'
            }`}
          >
            <FaHistory className="w-3 h-3" />
            Current
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-3 py-1.5 rounded-t text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'comparison'
                ? 'bg-slate-700 text-white border-b-2 border-slate-700'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900'
            }`}
          >
            <FaChartBar className="w-3 h-3" />
            Comparison
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-3 py-1.5 rounded-t text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'past'
                ? 'bg-slate-700 text-white border-b-2 border-slate-700'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900'
            }`}
          >
            <FaCalendarAlt className="w-3 h-3" />
            Past Months
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`px-3 py-1.5 rounded-t text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'records'
                ? 'bg-slate-700 text-white border-b-2 border-slate-700'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900'
            }`}
          >
            <FaEye className="w-3 h-3" />
            Records
          </button>
        </div>

        {/* Filters - Only show in Current tab */}
        {activeTab === 'current' && (
          <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 p-3 mb-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[180px] flex-1">
                <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search expenses..."
                  className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-xs focus:ring-1 focus:ring-slate-500 focus:border-transparent dark:text-gray-200"
                />
              </div>
              <div className="w-[130px]">
                <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">Sort</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-xs focus:ring-1 focus:ring-slate-500 focus:border-transparent dark:text-gray-200"
                >
                  <option value="createdAt">Date</option>
                  <option value="amount">Amount</option>
                  <option value="category">Category</option>
                </select>
              </div>
              <div className="w-[120px]">
                <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-xs focus:ring-1 focus:ring-slate-500 focus:border-transparent dark:text-gray-200"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
              <div className="w-[160px]">
                <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">Branch</label>
                <select
                  value={effectiveBranchFilter || ''}
                  onChange={e => setBranchFilter(e.target.value || null)}
                  disabled={isBranchScopedUser}
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-xs focus:ring-1 focus:ring-slate-500 focus:border-transparent dark:text-gray-200"
                >
                  {!isBranchScopedUser && <option value="">All Branches</option>}
                  {isBranchScopedUser && assignedBranchId && (
                    <option value={assignedBranchId}>{assignedBranchName}</option>
                  )}
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">Type</span>
                <button
                  onClick={() => setExpenseTypeFilter('all')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                    expenseTypeFilter === 'all'
                      ? 'bg-slate-700 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setExpenseTypeFilter('one_time')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                    expenseTypeFilter === 'one_time'
                      ? 'bg-slate-700 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  One-time
                </button>
                <button
                  onClick={() => setExpenseTypeFilter('recurring')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                    expenseTypeFilter === 'recurring'
                      ? 'bg-slate-700 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Recurring
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'current' && (
          <>
            {/* Compact Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
              <div className="border border-gray-200 dark:border-gray-800 rounded p-2 bg-white dark:bg-gray-900">
                <div className="text-[11px] text-gray-500 dark:text-gray-400">Total Expenses</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Ksh {totalAmount.toFixed(2)}</div>
              </div>
              <div className="border border-gray-200 dark:border-gray-800 rounded p-2 bg-white dark:bg-gray-900">
                <div className="text-[11px] text-gray-500 dark:text-gray-400">Expense Records</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{expenses.length}</div>
              </div>
              <div className="border border-gray-200 dark:border-gray-800 rounded p-2 bg-white dark:bg-gray-900">
                <div className="text-[11px] text-gray-500 dark:text-gray-400">This Month</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {fetchingCurrentMonthExpenses
                    ? 'Loading...'
                    : `Ksh ${(currentMonthExpensesTotal?.totalAmount || 0).toFixed(2)}`}
                </div>
              </div>
              <div className="border border-gray-200 dark:border-gray-800 rounded p-2 bg-white dark:bg-gray-900">
                <div className="text-[11px] text-gray-500 dark:text-gray-400">Avg Expense</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  Ksh {expenses.length > 0 ? (totalAmount / expenses.length).toFixed(2) : '0.00'}
                </div>
              </div>
            </div>

            {/* Expenses Table */}
            <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">All Expenses</h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Showing {filteredExpenses.length} of {expenses.length} expenses
                    </p>
                  </div>
                  {canCreateExpenses && (
                    <button
                      onClick={() => setDrawerType('create')}
                      className="px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-800 font-medium flex items-center gap-1.5 text-xs transition"
                    >
                      <FaPlus className="w-3 h-3" />
                      Add Expense
                    </button>
                  )}
                </div>
              </div>

              {filteredExpenses.length === 0 ? (
                <div className="text-center py-8">
                  <FaHistory className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No expenses found</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-3">Add an expense or adjust filters.</p>
                  {canCreateExpenses && (
                    <button
                      onClick={() => setDrawerType('create')}
                      className="px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-800 font-medium flex items-center gap-1.5 text-xs mx-auto"
                    >
                      <FaPlus className="w-3 h-3" />
                      Add Expense
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Amount</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Description</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Category</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Type</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Date</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Branch</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Status</th>
                        <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                      {filteredExpenses.map(expense => (
                        <tr
                          key={expense.id}
                          className="hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedExpense(expense);
                            setDrawerType('details');
                          }}
                        >
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="text-xs font-semibold text-gray-900 dark:text-white">Ksh {expense.amount.toFixed(2)}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="text-xs text-gray-900 dark:text-gray-100 font-medium">{expense.description}</div>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 text-[11px] font-medium rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize">
                              {getCategoryName(expense).replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {expense.expenseType === 'recurring' ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                                <FaRedo className="w-2.5 h-2.5 mr-1" />
                                Recurring
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                One-time
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                            {new Date(expense.createdAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                            {expense.branch?.name || <span className="text-gray-400 dark:text-gray-600">—</span>}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${
                              expense.isActive 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                              <span className={`w-1 h-1 rounded-full mr-1 ${
                                expense.isActive ? 'bg-green-500' : 'bg-red-500'
                              }`} />
                              {expense.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-right text-xs font-medium">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedExpense(expense);
                                setDrawerType('details');
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 inline-flex items-center gap-1"
                            >
                              <FaEye className="w-3 h-3" />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'salaries' && (
          <>
            {/* Compact Salary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
              {/* Current Month Total */}
              <div className="border border-gray-200 dark:border-gray-800 rounded p-2 bg-white dark:bg-gray-900">
                <div className="text-[11px] text-gray-500 dark:text-gray-400">This Month</div>
                {salarySummaryLoading ? (
                  <Spinner />
                ) : currentMonthSalaryTotal ? (
                  <>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Ksh {currentMonthSalaryTotal.totalAmount.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{currentMonthSalaryTotal.salarySchemeCount} active {currentMonthSalaryTotal.salarySchemeCount === 1 ? 'scheme' : 'schemes'}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Ksh 0.00</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">No data</p>
                  </>
                )}
              </div>

              {/* Selected Month Total */}
              <div className="border border-gray-200 dark:border-gray-800 rounded p-2 bg-white dark:bg-gray-900">
                <div className="text-[11px] text-gray-500 dark:text-gray-400">Selected Month</div>
                {fetchingMonthlyTotal ? (
                  <Spinner />
                ) : salaryTotalForMonth ? (
                  <>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Ksh {salaryTotalForMonth.totalAmount.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{salaryTotalForMonth.salarySchemeCount} active {salaryTotalForMonth.salarySchemeCount === 1 ? 'scheme' : 'schemes'}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Ksh 0.00</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">No data</p>
                  </>
                )}
              </div>

              {/* Total Schemes */}
              <div className="border border-gray-200 dark:border-gray-800 rounded p-2 bg-white dark:bg-gray-900">
                <div className="text-[11px] text-gray-500 dark:text-gray-400">Total Schemes</div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {salarySchemes.length}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {salarySchemes.filter(s => s.isActive).length} active
                </p>
              </div>

              {/* Average Salary */}
              <div className="border border-gray-200 dark:border-gray-800 rounded p-2 bg-white dark:bg-gray-900">
                <div className="text-[11px] text-gray-500 dark:text-gray-400">Avg Salary</div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Ksh {salarySchemes.length > 0 
                    ? (salarySchemes.reduce((sum, s) => sum + s.salaryAmount, 0) / salarySchemes.length).toFixed(2)
                    : '0.00'}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Per employee</p>
              </div>
            </div>

            {/* Month/Year Selector */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 p-3 mb-3">
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">Month & Year</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:text-gray-200"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(0, i).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:text-gray-200"
                    >
                      {Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - 2 + i;
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => setSalaryDrawerType('create')}
                  className="px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <FaPlus className="w-3 h-3" />
                  Add Salary Scheme
                </button>
              </div>
            </div>

            {/* Salary Schemes Table */}
            <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Salary Schemes</h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {loadingSchemes ? 'Loading...' : `${salarySchemes.length} ${salarySchemes.length === 1 ? 'scheme' : 'schemes'} total`}
                    </p>
                  </div>
                </div>
              </div>

              {loadingSchemes ? (
                <div className="flex justify-center items-center min-h-[120px]">
                  <Spinner />
                </div>
              ) : salarySchemes.length === 0 ? (
                <div className="text-center py-8">
                  <FaRedo className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No salary schemes found</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-3">Create your first salary scheme.</p>
                  <button
                    onClick={() => setSalaryDrawerType('create')}
                    className="px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-800 font-medium flex items-center gap-1.5 text-xs mx-auto"
                  >
                    <FaPlus className="w-3 h-3" />
                    Add Salary Scheme
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Employee</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Amount</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Frequency</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Start Date</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Next Due</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Last Paid</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Branch</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Status</th>
                        <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                      {salarySchemes.map(scheme => (
                        <tr
                          key={scheme.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedSalaryScheme(scheme);
                            setSalaryDrawerType('details');
                          }}
                        >
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="text-xs font-medium text-gray-900 dark:text-white">
                              {scheme.user?.name || scheme.employeeName}
                            </div>
                            {scheme.notes && (
                              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[160px]" title={scheme.notes}>
                                {scheme.notes}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="text-xs font-semibold text-gray-900 dark:text-white">Ksh {scheme.salaryAmount.toFixed(2)}</span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize">
                              <FaRedo className="w-2.5 h-2.5 mr-1" />
                              {scheme.frequency}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                            {new Date(scheme.startDate).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                            {scheme.nextDueDate ? (
                              new Date(scheme.nextDueDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                            {scheme.lastPaidDate ? (
                              new Date(scheme.lastPaidDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600">Never</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                            {scheme.branch?.name || <span className="text-gray-400 dark:text-gray-600">—</span>}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${
                              scheme.isActive 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                              <span className={`w-1 h-1 rounded-full mr-1 ${
                                scheme.isActive ? 'bg-green-500' : 'bg-red-500'
                              }`} />
                              {scheme.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-right text-xs font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedSalaryScheme(scheme);
                                  setSalaryDrawerType('details');
                                }}
                                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 inline-flex items-center gap-1"
                                title="View"
                              >
                                <FaEye className="w-3 h-3" />
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedSalarySchemeForEdit(scheme);
                                  setSalaryForm({
                                    employeeName: scheme.employeeName,
                                    salaryAmount: scheme.salaryAmount,
                                    frequency: scheme.frequency,
                                    startDate: scheme.startDate.split('T')[0],
                                    userId: scheme.userId,
                                    branchId: scheme.branchId || '',
                                    notes: scheme.notes || '',
                                  });
                                  setIsEditingSalary(true);
                                  setSalaryDrawerType('create');
                                }}
                                className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300 inline-flex items-center gap-1"
                                title="Edit"
                              >
                                <FaEdit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  if (confirm('Are you sure you want to delete this salary scheme?')) {
                                    handleDeleteSalaryScheme(scheme);
                                  }
                                }}
                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 inline-flex items-center gap-1"
                                title="Delete"
                              >
                                <FaTrash className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'comparison' && (
          <div className="space-y-3">
            <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 p-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Branch Comparison</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
                Compare total expense amount and count across your branches.
              </p>
              {!branchComparison || !branchComparison.branches || branchComparison.branches.length === 0 ? (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-xs">
                  No branch expense data available yet. Add expenses with branches to see comparisons here.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Branch</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Total</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Count</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Avg</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                        {branchComparison.branches.map((branch: { branchName: string; totalAmount: number; expenseCount: number }) => (
                          <tr key={branch.branchName}>
                            <td className="px-3 py-2 text-xs font-medium text-gray-900 dark:text-white">{branch.branchName}</td>
                            <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">Ksh {branch.totalAmount?.toFixed(2)}</td>
                            <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{branch.expenseCount}</td>
                            <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                              Ksh {branch.expenseCount ? (branch.totalAmount / branch.expenseCount).toFixed(2) : '0.00'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-800 rounded p-2">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-2">Expense Distribution by Branch</h4>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={branchComparison.branches} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 2" stroke="#4b5563" opacity={0.35} />
                        <XAxis dataKey="branchName" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '6px', fontSize: '12px' }}
                          itemStyle={{ color: '#f3f4f6' }}
                          formatter={(value) => [`Ksh ${Number(value ?? 0)}`, 'Amount']}
                        />
                        <Bar dataKey="totalAmount" fill="#64748b" radius={[4, 4, 0, 0]} name="Total Amount" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'past' && (
          <div className="space-y-3">
            <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Past Months Records</h3>
                {canCreateExpenses && (
                  <button
                    onClick={handleMonthlyReset}
                    disabled={resetting}
                    className="px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-800 font-medium flex items-center gap-1.5 text-xs disabled:opacity-50 transition"
                  >
                    {resetting ? <Spinner /> : <FaSync className="w-3 h-3" />}
                    Reset Monthly Expenses
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                <div className="border border-gray-200 dark:border-gray-800 rounded p-2 bg-gray-50 dark:bg-gray-800/40">
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">Current Month Total</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {fetchingCurrentMonthExpenses
                      ? 'Loading...'
                      : `Ksh ${(currentMonthExpensesTotal?.totalAmount || 0).toFixed(2)}`}
                  </div>
                </div>
                <div className="border border-gray-200 dark:border-gray-800 rounded p-2 bg-gray-50 dark:bg-gray-800/40">
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">Selected Month Total</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {fetchingExpenseMonthlyTotal
                      ? 'Loading...'
                      : `Ksh ${(expenseTotalForSelectedMonth?.totalAmount || 0).toFixed(2)}`}
                  </div>
                </div>
                <div className="border border-gray-200 dark:border-gray-800 rounded p-2 bg-gray-50 dark:bg-gray-800/40">
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">Select Month</div>
                  <div className="flex gap-2">
                    <select
                      value={expenseSelectedMonth}
                      onChange={(e) => setExpenseSelectedMonth(parseInt(e.target.value, 10))}
                      className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-xs focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:text-gray-200"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(0, i).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                    <select
                      value={expenseSelectedYear}
                      onChange={(e) => setExpenseSelectedYear(parseInt(e.target.value, 10))}
                      className="w-24 px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-xs focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:text-gray-200"
                    >
                      {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {!pastMonthsData || !pastMonthsData.records || pastMonthsData.records.length === 0 ? (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-xs">
                  <FaCalendarAlt className="w-7 h-7 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
                  <p>No past months expense data available yet.</p>
                  <p className="text-[11px] mt-1">Expenses will be grouped by month as you add them.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Month</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Total</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Count</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Avg</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                        {pastMonthsData.records.map((record: { month: string; monthName: string; totalAmount: number; expenseCount: number }) => (
                          <tr key={record.month}>
                            <td className="px-3 py-2 text-xs font-medium text-gray-900 dark:text-white">{record.monthName}</td>
                            <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">Ksh {record.totalAmount?.toFixed(2)}</td>
                            <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{record.expenseCount}</td>
                            <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                              Ksh {record.expenseCount ? (record.totalAmount / record.expenseCount).toFixed(2) : '0.00'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-800 rounded p-2">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-2">Monthly Expense Trend</h4>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={pastMonthsData.records} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 2" stroke="#4b5563" opacity={0.35} />
                        <XAxis dataKey="monthName" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '6px', fontSize: '12px' }}
                          itemStyle={{ color: '#f3f4f6' }}
                          formatter={(value) => [`Ksh ${Number(value ?? 0)}`, 'Amount']}
                        />
                        <Line type="monotone" dataKey="totalAmount" stroke="#64748b" strokeWidth={2} dot={{ r: 2 }} name="Total Amount" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'records' && (
          <>
            {/* All Expenses Records Summary */}
            <div className="mb-3">
              <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 p-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">All Expense Records</h3>
                {(() => {
                  const recordsExpenses = expenses.filter(exp => !exp.id.startsWith('salary-'));
                  const totalAmount = recordsExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                  const totalCount = recordsExpenses.length;
                  const avgAmount = totalCount > 0 ? totalAmount / totalCount : 0;
                  return (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                      <div className="border border-gray-200 dark:border-gray-800 rounded p-2 bg-white dark:bg-gray-900">
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">Count</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{totalCount}</div>
                      </div>
                      <div className="border border-gray-200 dark:border-gray-800 rounded p-2 bg-white dark:bg-gray-900">
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">Total Amount</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">Ksh {totalAmount.toFixed(2)}</div>
                      </div>
                      <div className="border border-gray-200 dark:border-gray-800 rounded p-2 bg-white dark:bg-gray-900">
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">Average</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">Ksh {avgAmount.toFixed(2)}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Expenses Records Table */}
            {(() => {
              const recordsExpenses = expenses.filter(exp => !exp.id.startsWith('salary-'));
              const filteredRecords = recordsExpenses.filter(expense =>
                expense.description.toLowerCase().includes(search.toLowerCase()) ||
                getCategoryName(expense).toLowerCase().includes(search.toLowerCase()) ||
                (expense.branch?.name.toLowerCase().includes(search.toLowerCase()))
              ).sort((a, b) => {
                let aValue: string | number, bValue: string | number;

                switch (sortBy) {
                  case 'amount':
                    aValue = a.amount;
                    bValue = b.amount;
                    break;
                  case 'category':
                    aValue = getCategoryName(a);
                    bValue = getCategoryName(b);
                    break;
                  case 'createdAt':
                  default:
                    aValue = new Date(a.createdAt).getTime();
                    bValue = new Date(b.createdAt).getTime();
                    break;
                }

                if (sortOrder === 'asc') {
                  return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                } else {
                  return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                }
              });

              return filteredRecords.length === 0 ? (
                <div className="text-center py-6">
                  <FaHistory className="w-7 h-7 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No expense records found</h3>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mb-2">Start by adding your first expense.</p>
                  {canCreateExpenses && (
                    <button
                      onClick={() => setDrawerType('create')}
                      className="px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-800 font-medium flex items-center gap-1 text-xs mx-auto"
                    >
                      <FaPlus className="w-3 h-3" />
                      Add Expense
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr className="border-b border-gray-200 dark:border-gray-800">
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Amount</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Description</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Category</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Type</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Date</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Branch</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Status</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {filteredRecords.map(expense => (
                        <tr
                          key={expense.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedExpense(expense);
                            setDrawerType('details');
                          }}
                        >
                          <td className="px-3 py-2.5 text-xs font-semibold text-gray-900 dark:text-white">Ksh {expense.amount.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-700 dark:text-gray-300">{expense.description}</td>
                          <td className="px-3 py-2.5 text-xs capitalize text-gray-700 dark:text-gray-300">{getCategoryName(expense).replace('_', ' ')}</td>
                          <td className="px-3 py-2.5 text-xs">
                            {expense.expenseType === 'recurring' ? (
                              <span className="text-orange-700 dark:text-orange-400">Recurring</span>
                            ) : (
                              <span className="text-gray-700 dark:text-gray-400">One-time</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">{new Date(expense.createdAt).toLocaleDateString()}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">{expense.branch?.name || '—'}</td>
                          <td className="px-3 py-2.5 text-xs">
                            <span className={expense.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                              {expense.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedExpense(expense);
                                setDrawerType('details');
                              }}
                              className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                            >
                              <FaEye className="w-3 h-3" />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </>
        )}

        {/* Drawer Backdrop */}
        <AnimatePresence>
          {(drawerType || salaryDrawerType) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gradient-to-br from-blue-100/60 via-white/60 to-purple-100/60 dark:from-slate-900/80 dark:via-slate-950/80 dark:to-slate-900/80 backdrop-blur-lg z-40"
              onClick={() => {
                setDrawerType(null);
                setSelectedExpense(null);
                setSalaryDrawerType(null);
                setSelectedSalaryScheme(null);
                setFormData({
                  amount: 0,
                  description: '',
                  category: 'other',
                  expenseType: 'one_time',
                });
                setError(null);
              }}
           
            />
          ) }
        </AnimatePresence>

        {/* Drawer Panel */}
        <AnimatePresence>
          {drawerType === 'create' && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white/90 dark:bg-slate-950 z-50 shadow-2xl border-l border-gray-100 dark:border-slate-800 flex flex-col rounded-l-xl"
              style={{ maxHeight: '100vh' }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md z-10 rounded-t-xl">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add New Expense</h3>
                <button
                  onClick={() => {
                    setDrawerType(null);
                    setFormData({
                      amount: 0,
                      description: '',
                      category: 'other',
                      expenseType: 'one_time',
                    });
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <FaTimesCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-6 flex-1 space-y-6">
                {/* Expense Info Section */}
                <div className="bg-gradient-to-r from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-800">
                  <h4 className="text-base font-semibold text-gray-800 dark:text-slate-100 mb-2">Expense Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Amount *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 dark:text-blue-400 text-sm font-bold">Ksh</span>
                        <input
                          type="number"
                          value={formData.amount}
                          onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                          className="w-full pl-12 pr-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white/80 dark:bg-slate-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 transition-all font-medium"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    {/* Category */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white/80 dark:bg-slate-800 dark:text-white transition-all font-medium"
                      >
                        <option value="salary">Salary</option>
                        <option value="office_supplies">Office Supplies</option>
                        <option value="utilities">Utilities</option>
                        <option value="rent">Rent</option>
                        <option value="marketing">Marketing</option>
                        <option value="travel">Travel</option>
                        <option value="equipment">Equipment</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  {/* Description */}
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Description *</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white/80 dark:bg-slate-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 transition-all font-medium"
                      placeholder="Enter expense description"
                    />
                  </div>
                </div>
                {/* Recurring Section */}
                <div className="bg-gradient-to-r from-purple-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-800">
                  <h4 className="text-base font-semibold text-gray-800 dark:text-slate-100 mb-2">Recurring Options</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="recurring"
                      checked={formData.expenseType === 'recurring'}
                      onChange={(e) => handleInputChange('expenseType', e.target.checked ? 'recurring' : 'one_time')}
                      className="w-4 h-4 text-blue-600 border-gray-300 dark:border-slate-600 rounded focus:ring-blue-500 dark:bg-slate-800"
                    />
                    <label htmlFor="recurring" className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                      This is a recurring expense
                    </label>
                  </div>
                  {formData.expenseType === 'recurring' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Frequency */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Frequency</label>
                        <select
                          value={formData.frequency || ''}
                          onChange={(e) => handleInputChange('frequency', e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white/80 dark:bg-slate-800 dark:text-white font-medium"
                        >
                          <option value="">Select frequency</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                      {/* Next Due Date */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Next Due Date</label>
                        <input
                          type="date"
                          value={formData.nextDueDate || ''}
                          onChange={(e) => handleInputChange('nextDueDate', e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white/80 dark:bg-slate-800 dark:text-white font-medium"
                        />
                      </div>
                    </div>
                  )}
                </div>
                {/* Branch Selection */}
                <div className="bg-gradient-to-r from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-800">
                  <h4 className="text-base font-semibold text-gray-800 dark:text-slate-100 mb-2">Branch</h4>
                  <select
                    value={formData.branchId || ''}
                    onChange={e => handleInputChange('branchId', e.target.value)}
                    disabled={isBranchScopedUser}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white/80 dark:bg-slate-800 dark:text-white transition-all font-medium"
                  >
                    {!isBranchScopedUser && <option value="">Select branch</option>}
                    {isBranchScopedUser && assignedBranchId && (
                      <option value={assignedBranchId}>{assignedBranchName}</option>
                    )}
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
                {/* Notes Section */}
                <div className="bg-gradient-to-r from-blue-50 via-white to-purple-50 rounded-xl p-4 shadow-sm border border-gray-100 dark:bg-slate-900 dark:border-slate-800">
                  <h4 className="text-base font-semibold text-gray-800 mb-2 dark:text-slate-100">Notes</h4>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white/80 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 placeholder-gray-400 dark:placeholder-slate-500 font-medium"
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>
                {/* Error */}
                {error && (
                  <div className="p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm shadow">
                    {error}
                  </div>
                )}
                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-2 sticky bottom-0 bg-white/90 dark:bg-gray-900/90 py-2 rounded-b-xl">
                  <button
                    onClick={() => {
                      setDrawerType(null);
                      setFormData({
                        amount: 0,
                        description: '',
                        category: 'other',
                        expenseType: 'one_time',
                      });
                      setError(null);
                    }}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold text-sm"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateExpense}
                    disabled={creating || !formData.amount || !formData.description}
                    className="px-3 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:scale-105 hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-150 text-sm"
                  >
                    {creating ? (
                      <>
                        <Spinner />
                        Creating...
                      </>
                    ) : (
                      <>
                        <FaSave className="w-5 h-5" />
                        Create Expense
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {drawerType === 'details' && selectedExpense && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white/95 dark:bg-slate-950 z-50 shadow-2xl border-l border-gray-100 dark:border-slate-800 flex flex-col rounded-l-xl backdrop-blur-md"
              style={{ maxHeight: '100vh' }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/90 dark:bg-gray-900/90 z-10 rounded-t-xl">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Expense Details</h3>
                <button
                  onClick={() => {
                    setDrawerType(null);
                    setSelectedExpense(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <FaTimesCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-6 flex-1 space-y-6">
                {/* Amount and Type Section */}
                <div className="bg-gradient-to-r from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-slate-50">Ksh {selectedExpense.amount.toFixed(2)}</div>
                    <div className="text-sm text-gray-600 dark:text-slate-400 font-medium">{selectedExpense.description}</div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300`}>
                      {getCategoryName(selectedExpense).replace('_', ' ')}
                    </span>
                    <div className="mt-2 flex items-center gap-1">
                      {getExpenseTypeIcon(selectedExpense.expenseType)}
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedExpense.expenseType === 'recurring' ? `Recurring (${selectedExpense.frequency})` : 'One-time'}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Details Grid Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Basic Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Created:</span>
                        <span className="text-gray-900 dark:text-gray-200">{new Date(selectedExpense.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Last Updated:</span>
                        <span className="text-gray-900 dark:text-gray-200">{new Date(selectedExpense.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Created By:</span>
                        <span className="text-gray-900 dark:text-gray-200">{selectedExpense.user.name}</span>
                      </div>
                      {selectedExpense.branch && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Branch:</span>
                          <span className="text-gray-900 dark:text-gray-200">{selectedExpense.branch.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Expense Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Status:</span>
                        <span className={selectedExpense.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {selectedExpense.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {selectedExpense.expenseType === 'recurring' && selectedExpense.nextDueDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Next Due:</span>
                          <span className="text-gray-900 dark:text-gray-200">{new Date(selectedExpense.nextDueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {selectedExpense.receiptUrl && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Receipt:</span>
                          <a
                            href={selectedExpense.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          >
                            View Receipt
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Notes Section */}
                {selectedExpense.notes && (
                  <div className="bg-gradient-to-r from-blue-50 via-white to-purple-50 dark:from-gray-800 dark:via-gray-850 dark:to-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Notes</h4>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {selectedExpense.notes}
                    </div>
                  </div>
                )}
                {/* Edit/Delete Buttons */}
                <div className="flex justify-end gap-3 mt-2">
                  <button
                    onClick={() => {
                      setFormData({
                        amount: selectedExpense.amount,
                        description: selectedExpense.description,
                        category: getCategoryName(selectedExpense),
                        expenseType: selectedExpense.expenseType,
                        frequency: selectedExpense.frequency,
                        nextDueDate: selectedExpense.nextDueDate,
                        branchId: selectedExpense.branchId,
                        receiptUrl: selectedExpense.receiptUrl,
                        notes: selectedExpense.notes,
                      });
                      setDrawerType('create');
                    }}
                    className="px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold flex items-center gap-2 text-sm"
                  >
                    <FaEdit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteExpense}
                    className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold flex items-center gap-2 text-sm"
                    disabled={creating}
                  >
                    <FaTrash className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Salary Create/Edit Drawer */}
        <AnimatePresence>
          {salaryDrawerType === 'create' && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white dark:bg-slate-950 z-50 shadow-2xl border-l border-gray-100 dark:border-slate-800 flex flex-col rounded-l-xl"
              style={{ maxHeight: '100vh' }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md z-10 rounded-t-xl">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{isEditingSalary ? 'Edit Salary Scheme' : 'Add New Salary Scheme'}</h3>
                <button
                  onClick={() => {
                    setSalaryDrawerType(null);
                    setSalaryForm({
                      employeeName: '',
                      salaryAmount: 0,
                      frequency: 'monthly',
                      startDate: '',
                      userId: '',
                      branchId: '',
                      notes: '',
                    });
                    setIsEditingSalary(false);
                    setSelectedSalarySchemeForEdit(null);
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <FaTimesCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-6 flex-1 space-y-6">
                {/* Salary Info Section */}
                <div className="bg-gradient-to-r from-emerald-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-800">
                  <h4 className="text-base font-semibold text-gray-800 dark:text-slate-100 mb-2">Salary Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Select Employee */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-1">Select Employee *</label>
                      <select
                        value={salaryForm.userId}
                        onChange={(e) => {
                          const selectedUserId = e.target.value;
                          const selectedUser = users.find(user => user.id === selectedUserId);
                          handleSalaryFormChange('userId', selectedUserId);
                          handleSalaryFormChange('employeeName', selectedUser ? selectedUser.name : '');
                        }}
                        className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base bg-white/80 dark:bg-slate-800 dark:text-white transition-all font-medium"
                      >
                        <option value="">Select an employee</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                      </select>
                    </div>
                    {/* Salary Amount */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-1">Salary Amount *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-500 dark:text-emerald-400 text-sm font-bold">Ksh</span>
                        <input
                          type="number"
                          value={salaryForm.salaryAmount}
                          onChange={(e) => handleSalaryFormChange('salaryAmount', parseFloat(e.target.value) || 0)}
                          className="w-full pl-12 pr-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base bg-white/80 dark:bg-slate-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 transition-all font-medium"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                  {/* Frequency */}
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-1">Frequency</label>
                    <select
                      value={salaryForm.frequency}
                      onChange={(e) => handleSalaryFormChange('frequency', e.target.value as 'monthly' | 'yearly')}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base bg-white/80 dark:bg-slate-800 dark:text-white transition-all font-medium"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  {/* Start Date */}
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-1">Start Date *</label>
                    <input
                      type="date"
                      value={salaryForm.startDate}
                      onChange={(e) => handleSalaryFormChange('startDate', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base bg-white/80 dark:bg-slate-800 dark:text-white transition-all font-medium"
                    />
                  </div>
                </div>
                {/* Branch Selection */}
                <div className="bg-gradient-to-r from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-800">
                  <h4 className="text-base font-semibold text-gray-800 dark:text-slate-100 mb-2">Branch</h4>
                  <select
                    value={salaryForm.branchId || ''}
                    onChange={(e) => handleSalaryFormChange('branchId', e.target.value)}
                    disabled={isBranchScopedUser}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white/80 dark:bg-slate-800 dark:text-white transition-all font-medium"
                  >
                    {!isBranchScopedUser && <option value="">Select branch</option>}
                    {isBranchScopedUser && assignedBranchId && (
                      <option value={assignedBranchId}>{assignedBranchName}</option>
                    )}
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
                {/* Notes Section */}
                <div className="bg-gradient-to-r from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-800">
                  <h4 className="text-base font-semibold text-gray-800 dark:text-slate-100 mb-2">Notes</h4>
                  <textarea
                    value={salaryForm.notes || ''}
                    onChange={(e) => handleSalaryFormChange('notes', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white/80 dark:bg-slate-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 font-medium"
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>
                {/* Error */}
                {error && (
                  <div className="p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm shadow">
                    {error}
                  </div>
                )}
                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-2 sticky bottom-0 bg-white/90 dark:bg-gray-900/90 py-2 rounded-b-xl">
                  <button
                    onClick={() => {
                      setSalaryDrawerType(null);
                      setSalaryForm({
                        employeeName: '',
                        salaryAmount: 0,
                        frequency: 'monthly',
                        startDate: '',
                        userId: '',
                        branchId: '',
                        notes: '',
                      });
                      setIsEditingSalary(false);
                      setSelectedSalarySchemeForEdit(null);
                      setError(null);
                    }}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold text-sm"
                    disabled={salaryAssigning}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignSalary}
                    disabled={salaryAssigning || !salaryForm.employeeName || !salaryForm.salaryAmount || !salaryForm.startDate}
                    className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:scale-105 hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-150 text-sm"
                  >
                    {salaryAssigning ? (
                      <>
                        <Spinner />
                        {isEditingSalary ? 'Updating...' : 'Assigning...'}
                      </>
                    ) : (
                      <>
                        <FaSave className="w-5 h-5" />
                        {isEditingSalary ? 'Update Salary' : 'Assign Salary'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Salary Details Drawer */}
        <AnimatePresence>
          {salaryDrawerType === 'details' && selectedSalaryScheme && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white dark:bg-slate-950 z-50 shadow-2xl border-l border-gray-100 dark:border-slate-800 flex flex-col rounded-l-xl"
              style={{ maxHeight: '100vh' }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/95 dark:bg-gray-900/95 z-10 rounded-t-xl backdrop-blur-md">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Salary Scheme Details</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Overview of this employee&apos;s recurring salary arrangement
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSalaryDrawerType(null);
                    setSelectedSalaryScheme(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <FaTimesCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-6 flex-1 space-y-6">
                {/* Amount and Employee Section */}
                <div className="bg-gradient-to-r from-emerald-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 rounded-2xl p-5 shadow-sm border border-emerald-100 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-1">
                        Monthly salary
                      </p>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        Ksh {selectedSalaryScheme.salaryAmount.toFixed(2)}
                      </div>
                      <div className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {selectedSalaryScheme.user?.name || selectedSalaryScheme.employeeName}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">
                        Salary scheme
                      </span>
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/80 dark:bg-gray-800/80 border border-emerald-100 dark:border-emerald-900/30">
                        <FaRedo className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs text-gray-700 dark:text-gray-300 capitalize">
                          {selectedSalaryScheme.frequency}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Details Grid Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-white/90 dark:bg-gray-800/90 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Basic Information</h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                          Employee ID
                        </p>
                        <p className="font-medium text-gray-800 dark:text-gray-200 break-all">
                          {selectedSalaryScheme.userId}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                          Employee Name
                        </p>
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          {selectedSalaryScheme.user?.name || selectedSalaryScheme.employeeName}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                            Start Date
                          </p>
                          <p className="font-medium text-gray-800 dark:text-gray-200">
                            {new Date(selectedSalaryScheme.startDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                            Created
                          </p>
                          <p className="font-medium text-gray-800 dark:text-gray-200">
                            {new Date(selectedSalaryScheme.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {selectedSalaryScheme.branch && (
                        <div>
                          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                            Branch
                          </p>
                          <p className="font-medium text-gray-800 dark:text-gray-200">
                            {selectedSalaryScheme.branch.name}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-white/90 dark:bg-gray-800/90 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Payment Details</h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                          Status
                        </p>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            selectedSalaryScheme.isActive
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                              : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              selectedSalaryScheme.isActive ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          />
                          {selectedSalaryScheme.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                            Next Due Date
                          </p>
                          <p className="font-medium text-gray-800 dark:text-gray-200">
                            {selectedSalaryScheme.nextDueDate
                              ? new Date(selectedSalaryScheme.nextDueDate).toLocaleDateString()
                              : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                            Last Paid Date
                          </p>
                          <p className="font-medium text-gray-800 dark:text-gray-200">
                            {selectedSalaryScheme.lastPaidDate
                              ? new Date(selectedSalaryScheme.lastPaidDate).toLocaleDateString()
                              : '-'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                          Frequency
                        </p>
                        <p className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-medium capitalize">
                          {selectedSalaryScheme.frequency}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Notes Section */}
                {selectedSalaryScheme.notes && (
                  <div className="bg-gradient-to-r from-emerald-50 via-white to-blue-50 dark:from-gray-800 dark:via-gray-850 dark:to-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Notes</h4>
                    <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {selectedSalaryScheme.notes}
                    </div>
                  </div>
                )}
                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-1">
                  <button
                    onClick={() => {
                      setSalaryDrawerType(null);
                      setSelectedSalaryScheme(null);
                    }}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold text-sm transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </AuthGuard>
  );
}
