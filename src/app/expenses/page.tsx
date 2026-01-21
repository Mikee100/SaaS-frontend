"use client";
import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utils/api";
import AuthGuard from '@/components/AuthGuard';
import { FaDollarSign, FaCalendarAlt, /* FaBuilding, */ FaSave, FaTimesCircle, FaExclamationTriangle, FaPlus, FaEye, FaEdit, FaTrash, /* FaCheckCircle, FaClock, */ FaRedo, FaFileDownload, FaChartBar, FaHistory, FaSync } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import { useTenant } from '@/hooks/useTenant';
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
    branchName: string;
    totalAmount: number;
    expenseCount: number;
  }[];
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
  const [branchComparison] = useState<BranchComparisonData | null>(null);
  const [pastMonthsData] = useState<PastMonthsData | null>(null);
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
  const [exportType, setExportType] = useState<'csv' | 'pdf'>('csv');
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

  const [fetchingCurrentMonthExpenses, /* setFetchingCurrentMonthExpenses */] = useState(false);
  const [currentMonthExpensesTotal, /* setCurrentMonthExpensesTotal */] = useState<{ monthName: string; totalAmount: number; expenseCount: number } | null>(null);
  const [expenseSelectedMonth, setExpenseSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [expenseSelectedYear, setExpenseSelectedYear] = useState<number>(new Date().getFullYear());
  const [fetchingExpenseMonthlyTotal, /* setFetchingExpenseMonthlyTotal */] = useState(false);
  const [expenseTotalForSelectedMonth, /* setExpenseTotalForSelectedMonth */] = useState<{ monthName: string; totalAmount: number; expenseCount: number } | null>(null);


  
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
      const response = await apiGet('/salary-schemes');
      const data = (response as { data?: unknown })?.data || response || [];
      setSalarySchemes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch salary schemes:', error);
      setError('Failed to load salary schemes');
    } finally {
      setLoadingSchemes(false);
    }
  }, []);

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
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: unknown) {
      setError((error as { message?: string })?.message || 'Failed to reset monthly expenses');
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'records') {
      
      
    }
  }, [activeTab, search, branchFilter, expenseTypeFilter]);

  const handleDownloadReport = () => {
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
      const doc = new jsPDF();

      // Company Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('SaaS Platform', 20, 25);
      doc.setFontSize(16);
      doc.text('Expenses Report', 20, 35);

      // Report metadata
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${reportDate} at ${reportTime}`, 20, 50);
      doc.text(`Total Expenses: ${filteredExpenses.length}`, 20, 58);
      doc.text(`Total Amount: Ksh ${totalAmount.toFixed(2)}`, 20, 66);

      // Filters applied
      let yPos = 74;
      const filtersText = `Filters: ${branchFilter ? `Branch: ${branches.find(b => b.id === branchFilter)?.name || 'Unknown'}` : 'All Branches'}, Type: ${expenseTypeFilter === 'all' ? 'All Types' : expenseTypeFilter === 'one_time' ? 'One-time' : 'Recurring'}${search ? `, Search: "${search}"` : ''}`;
      const splitFilters = doc.splitTextToSize(filtersText, 170);
      doc.text(splitFilters, 20, yPos);

      // Summary section
      yPos += splitFilters.length * 6 + 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Categories: ${Object.keys(categoryTotals).length}`, 30, yPos);
      doc.text(`Branches: ${Object.keys(branchTotals).length}`, 100, yPos);
      yPos += 8;
      doc.text(`Average Expense: Ksh ${expenses.length > 0 ? (totalAmount / expenses.length).toFixed(2) : '0.00'}`, 30, yPos);

      // Table
      yPos += 20;
      const headers = [['ID', 'Amount', 'Description', 'Category', 'Type', 'Created Date', 'Branch', 'Status']];
      const data = filteredExpenses.map(expense => [
        expense.id.substring(0, 8) + '...', // Truncate ID for PDF
        `Ksh ${expense.amount.toFixed(2)}`,
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
        styles: {
          fontSize: 8,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [59, 130, 246], // Blue header
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // Light gray alternate rows
        },
        margin: { top: 20, left: 20, right: 20 },
        columnStyles: {
          0: { cellWidth: 25 }, // ID
          1: { cellWidth: 20, halign: 'right' }, // Amount
          2: { cellWidth: 40 }, // Description
          3: { cellWidth: 25 }, // Category
          4: { cellWidth: 20 }, // Type
          5: { cellWidth: 25 }, // Date
          6: { cellWidth: 25 }, // Branch
          7: { cellWidth: 20 } // Status
        }
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
        doc.text('SaaS Platform - Confidential', 20, doc.internal.pageSize.height - 10);
      }

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
      if (branchFilter) params.append('branchId', branchFilter);
      if (expenseTypeFilter !== 'all') params.append('expenseType', expenseTypeFilter);
      if (params.toString()) url += `?${params.toString()}`;
      const response = await apiGet(url);
      const data = (response as { data?: unknown })?.data || response || [];
      const expenseData = Array.isArray(data) ? data : [];
      try {
        const salaryResponse = await apiGet('/salary-schemes');
        const salaryData = (salaryResponse as { data?: unknown })?.data || salaryResponse || [];
        const salaryExpenses: Expense[] = Array.isArray(salaryData)
          ? salaryData.map((scheme: unknown) => {
              const s = scheme as {
                id: string;
                salaryAmount: number;
                employeeName: string;
                frequency: string;
                nextDueDate?: string;
                branchId?: string;
                notes?: string;
                isActive: boolean;
                startDate: string;
                updatedAt: string;
                user: { id: string; name: string };
                branch?: { id: string; name: string };
              };
              // Cast frequency to the correct union type
            const allowedFrequencies = ['daily', 'weekly', 'monthly', 'yearly'] as const;
type AllowedFrequency = typeof allowedFrequencies[number];
const frequency = allowedFrequencies.includes(s.frequency as AllowedFrequency)
  ? (s.frequency as AllowedFrequency)
  : undefined;
              return {
                id: 'salary-' + s.id,
                amount: s.salaryAmount,
                description: 'Salary for ' + s.employeeName,
                categoryId: 'salary',
                category: { id: 'salary', name: 'salary' },
                expenseType: 'recurring' as const,
                frequency,
                nextDueDate: s.nextDueDate,
                branchId: s.branchId,
                notes: s.notes,
                isActive: s.isActive,
                createdAt: s.startDate,
                updatedAt: s.updatedAt,
                user: s.user,
                branch: s.branch,
              };
            })
          : [];
        setExpenses([...expenseData, ...salaryExpenses]);
      } catch {
        setExpenses(expenseData);
      }
    } catch {
      setError('Failed to load expenses');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [branchFilter, expenseTypeFilter]);

  useEffect(() => {
    const fetchAll = async () => {
      await fetchExpenses();
      await fetchBranches();
      await fetchUsers();
    };
    fetchAll();
  }, [branchFilter, fetchExpenses]);

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
      setBranches(data as { id: string; name: string }[]);
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
    return type === 'recurring' ? <FaRedo className="w-4 h-4" /> : <FaDollarSign className="w-4 h-4" />;
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
  const salaryTotal = currentMonthSalaryTotal?.totalAmount || 0;

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
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4">
          {/* Compact Header */}
          <div className="mb-4">
            <div className="bg-white border border-gray-100 rounded-lg shadow p-3">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FaDollarSign className="w-5 h-5 text-blue-500" />
                  <h1 className="text-xl font-bold text-gray-900">Expenses</h1>
                  <span className="text-xs text-gray-500 font-medium">Track and manage your business expenses</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={exportType}
                    onChange={(e) => setExportType(e.target.value as 'csv' | 'pdf')}
                    className="px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                  >
                    <option value="csv">CSV Export</option>
                    <option value="pdf">PDF Export</option>
                  </select>
                  <button
                    onClick={handleDownloadReport}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs flex items-center gap-1"
                  >
                    <FaFileDownload className="w-3 h-3" />
                    Export
                  </button>
                  {canCreateExpenses && (
                    <button
                      onClick={() => setDrawerType('create')}
                      className="px-3 py-1.5 bg-emerald-500 text-white rounded hover:bg-emerald-600 text-xs flex items-center gap-1"
                    >
                      <FaPlus className="w-3 h-3" />
                      Add
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

        {/* Filters Row - compact */}
        <div className="flex flex-wrap items-center gap-2 mb-2 px-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="flex-1 min-w-[100px] px-2 py-1 border border-gray-200 rounded bg-white text-xs"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2 py-1 border border-gray-200 rounded bg-white text-xs"
          >
            <option value="createdAt">Date</option>
            <option value="amount">Amount</option>
            <option value="category">Category</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="px-2 py-1 border border-gray-200 rounded bg-white text-xs"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
          <select
            value={branchFilter || ''}
            onChange={e => setBranchFilter(e.target.value || null)}
            className="px-2 py-1 border border-gray-200 rounded bg-white text-xs"
          >
            <option value="">All Branches</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
          <select
            value={expenseTypeFilter}
            onChange={e => setExpenseTypeFilter(e.target.value as 'all' | 'one_time' | 'recurring')}
            className="px-2 py-1 border border-gray-200 rounded bg-white text-xs"
          >
            <option value="all">All Types</option>
            <option value="one_time">One-time</option>
            <option value="recurring">Recurring</option>
          </select>
        </div>

        {/* Tabs - smaller */}
        <div className="flex items-center gap-1 mb-3 border-b border-gray-100 pb-1">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-2 py-1 rounded text-xs font-medium ${
              activeTab === 'current'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FaHistory className="w-3 h-3 inline mr-1" />
            Current
          </button>
          <button
            onClick={() => setActiveTab('salaries')}
            className={`px-2 py-1 rounded text-xs font-medium ${
              activeTab === 'salaries'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FaDollarSign className="w-3 h-3 inline mr-1" />
            Salaries
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-2 py-1 rounded text-xs font-medium ${
              activeTab === 'comparison'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FaChartBar className="w-3 h-3 inline mr-1" />
            Branch Comparison
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-2 py-1 rounded text-xs font-medium ${
              activeTab === 'past'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FaCalendarAlt className="w-3 h-3 inline mr-1" />
            Past Months
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`px-2 py-1 rounded text-xs font-medium ${
              activeTab === 'records'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FaEye className="w-3 h-3 inline mr-1" />
            Records
          </button>
        </div>

   
        {/* Salary Summary - compact */}
        <div className="mb-4">
          <div className="bg-white rounded p-2 shadow-sm flex items-center justify-between border border-gray-100">
            <div>
              <h1 className="text-xs font-semibold text-gray-700 mb-0.5">Total Salary Expenses</h1>
              <p className="text-[11px] text-gray-500">Employee salaries as business expenses</p>
            </div>
            <div className="flex items-center gap-1">
              <FaDollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-base font-bold">Ksh {salaryTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 my-3" />

        {/* Tab Content */}
        {activeTab === 'current' && (
          <>
            {/* Current Month Expenses Summary */}
            <div className="mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Month Expenses Summary</h3>
                {fetchingCurrentMonthExpenses ? (
                  <div className="flex justify-center items-center py-4">
                    <Spinner />
                  </div>
                ) : currentMonthExpensesTotal ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                      <h4 className="font-semibold text-red-900 mb-2">{currentMonthExpensesTotal.monthName}</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-red-700">Total Expenses:</span>
                          <span className="font-bold">Ksh {currentMonthExpensesTotal.totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-700">Expense Count:</span>
                          <span className="font-bold">{currentMonthExpensesTotal.expenseCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No expense data available for current month.
                  </div>
                )}
              </div>
            </div>
            {/* Monthly Expenses Total Section */}
            <div className="mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Expenses Total</h3>
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                    <select
                      value={expenseSelectedMonth}
                      onChange={(e) => setExpenseSelectedMonth(parseInt(e.target.value))}
                      className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm bg-white"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(0, i).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <select
                      value={expenseSelectedYear}
                      onChange={(e) => setExpenseSelectedYear(parseInt(e.target.value))}
                      className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm bg-white"
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
                {fetchingExpenseMonthlyTotal ? (
                  <div className="flex justify-center items-center py-4">
                    <Spinner />
                  </div>
                ) : expenseTotalForSelectedMonth ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                      <h4 className="font-semibold text-red-900 mb-2">{expenseTotalForSelectedMonth.monthName}</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-red-700">Total Expenses:</span>
                          <span className="font-bold">Ksh {expenseTotalForSelectedMonth.totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-700">Expense Count:</span>
                          <span className="font-bold">{expenseTotalForSelectedMonth.expenseCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No expense data available for the selected month.
                  </div>
                )}
              </div>
            </div>

            {/* Expenses Table (desktop) / Cards (mobile) */}
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-10">
                <FaDollarSign className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <h3 className="text-base font-semibold text-gray-900 mb-1">No expenses found</h3>
                <p className="text-gray-400 text-xs mb-2">Start by adding your first expense or adjust your filters</p>
                {canCreateExpenses && (
                  <button
                    onClick={() => setDrawerType('create')}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded shadow hover:bg-blue-700 font-semibold flex items-center gap-1 text-xs"
                  >
                    <FaPlus className="w-3 h-3" />
                    Add Expense
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg shadow-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b">
                      <th className="py-2 px-3 text-left">Amount</th>
                      <th className="py-2 px-3 text-left">Description</th>
                      <th className="py-2 px-3 text-left">Category</th>
                      <th className="py-2 px-3 text-left">Type</th>
                      <th className="py-2 px-3 text-left">Date</th>
                      <th className="py-2 px-3 text-left">Branch</th>
                      <th className="py-2 px-3 text-left">Status</th>
                      <th className="py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map(expense => (
                      <tr
                        key={expense.id}
                        className="border-b hover:bg-blue-50 cursor-pointer"
                        onClick={() => {
                          setSelectedExpense(expense);
                          setDrawerType('details');
                        }}
                      >
                        <td className="py-2 px-3 font-bold text-gray-900">Ksh {expense.amount.toFixed(2)}</td>
                        <td className="py-2 px-3 text-xs">{expense.description}</td>
                        <td className="py-2 px-3 text-xs capitalize">{getCategoryName(expense).replace('_', ' ')}</td>
                        <td className="py-2 px-3 text-xs">
                          {expense.expenseType === 'recurring' ? (
                            <span className="text-orange-700">Recurring</span>
                          ) : (
                            <span className="text-gray-700">One-time</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-xs">{new Date(expense.createdAt).toLocaleDateString()}</td>
                        <td className="py-2 px-3 text-xs">{expense.branch?.name || ''}</td>
                        <td className="py-2 px-3 text-xs">
                          <span className={expense.isActive ? 'text-green-600' : 'text-red-600'}>
                            {expense.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
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
            )}
          </>
        )}

        {activeTab === 'salaries' && (
          <>
            {/* Current Month Salary Summary */}
            <div className="mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Month Salary Summary</h3>
                {salarySummaryLoading ? (
                  <div className="flex justify-center items-center py-4">
                    <Spinner />
                  </div>
                ) : currentMonthSalaryTotal ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200">
                      <h4 className="font-semibold text-emerald-900 mb-2">{currentMonthSalaryTotal.monthName}</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-emerald-700">Total Salary:</span>
                          <span className="font-bold">Ksh {currentMonthSalaryTotal.totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-700">Active Schemes:</span>
                          <span className="font-bold">{currentMonthSalaryTotal.salarySchemeCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No salary data available for current month.
                  </div>
                )}
              </div>
            </div>
            {/* Monthly Salary Total Section */}
            <div className="mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Salary Total</h3>
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(0, i).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
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
                {fetchingMonthlyTotal ? (
                  <div className="flex justify-center items-center py-4">
                    <Spinner />
                  </div>
                ) : salaryTotalForMonth ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200">
                      <h4 className="font-semibold text-emerald-900 mb-2">{salaryTotalForMonth.monthName}</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-emerald-700">Total Salary:</span>
                          <span className="font-bold">Ksh {salaryTotalForMonth.totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-700">Active Schemes:</span>
                          <span className="font-bold">{salaryTotalForMonth.salarySchemeCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No salary data available for the selected month.
                  </div>
                )}
              </div>
            </div>

            {/* Add New Salary Scheme Button */}
            <div className="mb-8">
              <button
                onClick={() => setSalaryDrawerType('create')}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 font-semibold text-sm flex items-center gap-2"
              >
                <FaPlus className="w-4 h-4" />
                Add New Salary Scheme
              </button>
            </div>
            {/* Salary Schemes Table */}
            {loadingSchemes ? (
              <div className="flex justify-center items-center min-h-[200px]">
                <Spinner />
              </div>
            ) : salarySchemes.length === 0 ? (
              <div className="text-center py-10">
                <FaDollarSign className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <h3 className="text-base font-semibold text-gray-900 mb-1">No salary schemes found</h3>
                <p className="text-gray-400 text-xs mb-2">Assign a salary to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg shadow-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b">
                      <th className="py-2 px-3 text-left">Amount</th>
                      <th className="py-2 px-3 text-left">Employee</th>
                      <th className="py-2 px-3 text-left">Frequency</th>
                      <th className="py-2 px-3 text-left">Start Date</th>
                      <th className="py-2 px-3 text-left">Next Due Date</th>
                      <th className="py-2 px-3 text-left">Last Paid Date</th>
                      <th className="py-2 px-3 text-left">Branch</th>
                      <th className="py-2 px-3 text-left">Notes</th>
                      <th className="py-2 px-3 text-left">Status</th>
                      <th className="py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {salarySchemes.map(scheme => (
                      <tr
                        key={scheme.id}
                        className="border-b hover:bg-blue-50 cursor-pointer"
                        onClick={() => {
                          setSelectedSalaryScheme(scheme);
                          setSalaryDrawerType('details');
                        }}
                      >
                        <td className="py-2 px-3 font-bold text-gray-900">Ksh {scheme.salaryAmount.toFixed(2)}</td>
                        <td className="py-2 px-3 text-xs">{scheme.user?.name || scheme.employeeName}</td>
                        <td className="py-2 px-3 text-xs capitalize">{scheme.frequency}</td>
                        <td className="py-2 px-3 text-xs">{new Date(scheme.startDate).toLocaleDateString()}</td>
                        <td className="py-2 px-3 text-xs">{scheme.nextDueDate ? new Date(scheme.nextDueDate).toLocaleDateString() : '-'}</td>
                        <td className="py-2 px-3 text-xs">{scheme.lastPaidDate ? new Date(scheme.lastPaidDate).toLocaleDateString() : '-'}</td>
                        <td className="py-2 px-3 text-xs">{scheme.branch?.name || ''}</td>
                        <td className="py-2 px-3 text-xs max-w-[120px] truncate" title={scheme.notes || ''}>{scheme.notes || '-'}</td>
                        <td className="py-2 px-3 text-xs">
                          <span className={scheme.isActive ? 'text-green-600' : 'text-red-600'}>
                            {scheme.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-2 px-3 flex gap-1">
                          <button
                            onClick={() => {
                              setSelectedSalaryScheme(scheme);
                              setSalaryDrawerType('details');
                            }}
                            className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                          >
                            <FaEye className="w-3 h-3" />
                            View
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSalarySchemeForEdit(scheme);
                              setSalaryForm({
                                employeeName: scheme.employeeName,
                                salaryAmount: scheme.salaryAmount,
                                frequency: scheme.frequency,
                                startDate: scheme.startDate.split('T')[0], // Format for date input
                                userId: scheme.userId,
                                branchId: scheme.branchId || '',
                                notes: scheme.notes || '',
                              });
                              setIsEditingSalary(true);
                              setSalaryDrawerType('create'); // Reuse the form drawer
                            }}
                            className="text-yellow-600 hover:text-yellow-800 text-xs flex items-center gap-1"
                          >
                            <FaEdit className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('Delete button clicked for scheme', scheme.id);
                              if (confirm('Are you sure you want to delete this salary scheme?')) {
                                console.log('Confirmed delete');
                                handleDeleteSalaryScheme(scheme);
                              } else {
                                console.log('Delete cancelled');
                              }
                            }}
                            className="text-red-600 hover:text-red-800 text-xs flex items-center gap-1"
                          >
                            <FaTrash className="w-3 h-3" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'comparison' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Branch Comparison</h3>
              {branchComparison && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {branchComparison.branches?.map((branch: { branchName: string; totalAmount: number; expenseCount: number }) => (
                      <div key={branch.branchName} className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-2">{branch.branchName}</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-blue-700">Total Expenses:</span>
                            <span className="font-bold">Ksh {branch.totalAmount?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">Count:</span>
                            <span className="font-bold">{branch.expenseCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">Avg per Expense:</span>
                            <span className="font-bold">Ksh {(branch.totalAmount / branch.expenseCount).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Expense Distribution by Category</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={branchComparison.branches}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="branchName" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => [`Ksh ${value}`, 'Amount']} />
                        <Legend />
                        <Bar dataKey="totalAmount" fill="#3b82f6" name="Total Amount" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'past' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Past Months Records</h3>
                {canCreateExpenses && (
                  <button
                    onClick={handleMonthlyReset}
                    disabled={resetting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold flex items-center gap-2 text-sm disabled:opacity-50"
                  >
                    {resetting ? <Spinner /> : <FaSync className="w-4 h-4" />}
                    Reset Monthly Expenses
                  </button>
                )}
              </div>
              {pastMonthsData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pastMonthsData.records?.map((record: { month: string; monthName: string; totalAmount: number; expenseCount: number }) => (
                      <div key={record.month} className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                        <h4 className="font-semibold text-green-900 mb-2">{record.monthName}</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-green-700">Total Expenses:</span>
                            <span className="font-bold">Ksh {record.totalAmount?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-700">Count:</span>
                            <span className="font-bold">{record.expenseCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-700">Avg per Expense:</span>
                            <span className="font-bold">Ksh {(record.totalAmount / record.expenseCount).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Monthly Expense Trends</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={pastMonthsData.records}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="monthName" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => [`Ksh ${value}`, 'Amount']} />
                        <Legend />
                        <Line type="monotone" dataKey="totalAmount" stroke="#10b981" strokeWidth={2} name="Total Amount" />
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
            <div className="mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">All Expenses Records Summary</h3>
                {(() => {
                  const recordsExpenses = expenses.filter(exp => !exp.id.startsWith('salary-'));
                  const totalAmount = recordsExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                  const totalCount = recordsExpenses.length;
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-2">Total Records</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-blue-700">Count:</span>
                            <span className="font-bold">{totalCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">Total Amount:</span>
                            <span className="font-bold">Ksh {totalAmount.toFixed(2)}</span>
                          </div>
                        </div>
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
                <div className="text-center py-10">
                  <FaDollarSign className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <h3 className="text-base font-semibold text-gray-900 mb-1">No expense records found</h3>
                  <p className="text-gray-400 text-xs mb-2">Start by adding your first expense</p>
                  {canCreateExpenses && (
                    <button
                      onClick={() => setDrawerType('create')}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded shadow hover:bg-blue-700 font-semibold flex items-center gap-1 text-xs"
                    >
                      <FaPlus className="w-3 h-3" />
                      Add Expense
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white rounded-lg shadow-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b">
                        <th className="py-2 px-3 text-left">Amount</th>
                        <th className="py-2 px-3 text-left">Description</th>
                        <th className="py-2 px-3 text-left">Category</th>
                        <th className="py-2 px-3 text-left">Type</th>
                        <th className="py-2 px-3 text-left">Date</th>
                        <th className="py-2 px-3 text-left">Branch</th>
                        <th className="py-2 px-3 text-left">Status</th>
                        <th className="py-2 px-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map(expense => (
                        <tr
                          key={expense.id}
                          className="border-b hover:bg-blue-50 cursor-pointer"
                          onClick={() => {
                            setSelectedExpense(expense);
                            setDrawerType('details');
                          }}
                        >
                          <td className="py-2 px-3 font-bold text-gray-900">Ksh {expense.amount.toFixed(2)}</td>
                          <td className="py-2 px-3 text-xs">{expense.description}</td>
                          <td className="py-2 px-3 text-xs capitalize">{getCategoryName(expense).replace('_', ' ')}</td>
                          <td className="py-2 px-3 text-xs">
                            {expense.expenseType === 'recurring' ? (
                              <span className="text-orange-700">Recurring</span>
                            ) : (
                              <span className="text-gray-700">One-time</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-xs">{new Date(expense.createdAt).toLocaleDateString()}</td>
                          <td className="py-2 px-3 text-xs">{expense.branch?.name || ''}</td>
                          <td className="py-2 px-3 text-xs">
                            <span className={expense.isActive ? 'text-green-600' : 'text-red-600'}>
                              {expense.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-2 px-3">
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
              className="fixed inset-0 bg-gradient-to-br from-blue-100/60 via-white/60 to-purple-100/60 backdrop-blur-lg z-40"
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
              className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white/90 z-50 shadow-2xl border-l border-gray-100 flex flex-col rounded-l-xl"
              style={{ maxHeight: '100vh' }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white/90 z-10 rounded-t-xl">
                <h3 className="text-lg font-bold text-gray-900">Add New Expense</h3>
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
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
                >
                  <FaTimesCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-6 flex-1 space-y-6">
                {/* Expense Info Section */}
                <div className="bg-gradient-to-r from-blue-50 via-white to-purple-50 rounded-xl p-4 shadow-sm border border-gray-100">
                  <h4 className="text-base font-semibold text-gray-800 mb-2">Expense Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Amount *</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-blue-400 text-sm font-medium">Ksh</span>
                        <input
                          type="number"
                          value={formData.amount}
                          onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                          className="w-full pl-12 pr-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white/80"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    {/* Category */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className="w-full px-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white/80"
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
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white/80"
                      placeholder="Enter expense description"
                    />
                  </div>
                </div>
                {/* Recurring Section */}
                <div className="bg-gradient-to-r from-purple-50 via-white to-blue-50 rounded-xl p-4 shadow-sm border border-gray-100">
                  <h4 className="text-base font-semibold text-gray-800 mb-2">Recurring Options</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="recurring"
                      checked={formData.expenseType === 'recurring'}
                      onChange={(e) => handleInputChange('expenseType', e.target.checked ? 'recurring' : 'one_time')}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="recurring" className="text-sm font-semibold text-gray-700">
                      This is a recurring expense
                    </label>
                  </div>
                  {formData.expenseType === 'recurring' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Frequency */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Frequency</label>
                        <select
                          value={formData.frequency || ''}
                          onChange={(e) => handleInputChange('frequency', e.target.value)}
                          className="w-full px-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white/80"
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
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Next Due Date</label>
                        <input
                          type="date"
                          value={formData.nextDueDate || ''}
                          onChange={(e) => handleInputChange('nextDueDate', e.target.value)}
                          className="w-full px-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white/80"
                        />
                      </div>
                    </div>
                  )}
                </div>
                {/* Branch Selection */}
                <div className="bg-gradient-to-r from-blue-50 via-white to-purple-50 rounded-xl p-4 shadow-sm border border-gray-100">
                  <h4 className="text-base font-semibold text-gray-800 mb-2">Branch</h4>
                  <select
                    value={formData.branchId || ''}
                    onChange={e => handleInputChange('branchId', e.target.value)}
                    className="w-full px-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white/80"
                  >
                    <option value="">Select branch</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
                {/* Notes Section */}
                <div className="bg-gradient-to-r from-blue-50 via-white to-purple-50 rounded-xl p-4 shadow-sm border border-gray-100">
                  <h4 className="text-base font-semibold text-gray-800 mb-2">Notes</h4>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="w-full px-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white/80"
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>
                {/* Error */}
                {error && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm shadow">
                    {error}
                  </div>
                )}
                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-2 sticky bottom-0 bg-white/90 py-2 rounded-b-xl">
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
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold text-sm"
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
              className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white/90 z-50 shadow-2xl border-l border-gray-100 flex flex-col rounded-l-xl"
              style={{ maxHeight: '100vh' }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white/90 z-10 rounded-t-xl">
                <h3 className="text-lg font-bold text-gray-900">Expense Details</h3>
                <button
                  onClick={() => {
                    setDrawerType(null);
                    setSelectedExpense(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
                >
                  <FaTimesCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-6 flex-1 space-y-6">
                {/* Amount and Type Section */}
                <div className="bg-gradient-to-r from-blue-50 via-white to-purple-50 rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">Ksh {selectedExpense.amount.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">{selectedExpense.description}</div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor()}`}>
                      {getCategoryName(selectedExpense).replace('_', ' ')}
                    </span>
                    <div className="mt-2 flex items-center gap-1">
                      {getExpenseTypeIcon(selectedExpense.expenseType)}
                      <span className="text-sm text-gray-600">
                        {selectedExpense.expenseType === 'recurring' ? `Recurring (${selectedExpense.frequency})` : 'One-time'}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Details Grid Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/80 rounded-xl p-5 border border-gray-100 shadow-sm">
                    <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span>{new Date(selectedExpense.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Updated:</span>
                        <span>{new Date(selectedExpense.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created By:</span>
                        <span>{selectedExpense.user.name}</span>
                      </div>
                      {selectedExpense.branch && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Branch:</span>
                          <span>{selectedExpense.branch.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-white/80 rounded-xl p-5 border border-gray-100 shadow-sm">
                    <h4 className="font-medium text-gray-900 mb-3">Expense Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={selectedExpense.isActive ? 'text-green-600' : 'text-red-600'}>
                          {selectedExpense.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {selectedExpense.expenseType === 'recurring' && selectedExpense.nextDueDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Next Due:</span>
                          <span>{new Date(selectedExpense.nextDueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {selectedExpense.receiptUrl && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Receipt:</span>
                          <a
                            href={selectedExpense.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
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
                  <div className="bg-gradient-to-r from-blue-50 via-white to-purple-50 rounded-2xl p-4 shadow-sm border border-gray-100">
                    <h4 className="font-medium text-gray-900 mb-3">Notes</h4>
                    <div className="text-sm text-gray-700">
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
              className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white/90 z-50 shadow-2xl border-l border-gray-100 flex flex-col rounded-l-xl"
              style={{ maxHeight: '100vh' }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white/90 z-10 rounded-t-xl">
                <h3 className="text-lg font-bold text-gray-900">{isEditingSalary ? 'Edit Salary Scheme' : 'Add New Salary Scheme'}</h3>
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
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
                >
                  <FaTimesCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-6 flex-1 space-y-6">
                {/* Salary Info Section */}
                <div className="bg-gradient-to-r from-emerald-50 via-white to-blue-50 rounded-xl p-4 shadow-sm border border-gray-100">
                  <h4 className="text-base font-semibold text-gray-800 mb-2">Salary Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Select Employee */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Select Employee *</label>
                      <select
                        value={salaryForm.userId}
                        onChange={(e) => {
                          const selectedUserId = e.target.value;
                          const selectedUser = users.find(user => user.id === selectedUserId);
                          handleSalaryFormChange('userId', selectedUserId);
                          handleSalaryFormChange('employeeName', selectedUser ? selectedUser.name : '');
                        }}
                        className="w-full px-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base bg-white/80"
                      >
                        <option value="">Select an employee</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                      </select>
                    </div>
                    {/* Salary Amount */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Salary Amount *</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-emerald-400 text-sm font-medium">Ksh</span>
                        <input
                          type="number"
                          value={salaryForm.salaryAmount}
                          onChange={(e) => handleSalaryFormChange('salaryAmount', parseFloat(e.target.value) || 0)}
                          className="w-full pl-12 pr-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base bg-white/80"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                  {/* Frequency */}
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Frequency</label>
                    <select
                      value={salaryForm.frequency}
                      onChange={(e) => handleSalaryFormChange('frequency', e.target.value as 'monthly' | 'yearly')}
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base bg-white/80"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  {/* Start Date */}
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date *</label>
                    <input
                      type="date"
                      value={salaryForm.startDate}
                      onChange={(e) => handleSalaryFormChange('startDate', e.target.value)}
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base bg-white/80"
                    />
                  </div>
                </div>
                {/* Branch Selection */}
                <div className="bg-gradient-to-r from-blue-50 via-white to-purple-50 rounded-xl p-4 shadow-sm border border-gray-100">
                  <h4 className="text-base font-semibold text-gray-800 mb-2">Branch</h4>
                  <select
                    value={salaryForm.branchId || ''}
                    onChange={(e) => handleSalaryFormChange('branchId', e.target.value)}
                    className="w-full px-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white/80"
                  >
                    <option value="">Select branch</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
                {/* Notes Section */}
                <div className="bg-gradient-to-r from-blue-50 via-white to-purple-50 rounded-xl p-4 shadow-sm border border-gray-100">
                  <h4 className="text-base font-semibold text-gray-800 mb-2">Notes</h4>
                  <textarea
                    value={salaryForm.notes || ''}
                    onChange={(e) => handleSalaryFormChange('notes', e.target.value)}
                    className="w-full px-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white/80"
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>
                {/* Error */}
                {error && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm shadow">
                    {error}
                  </div>
                )}
                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-2 sticky bottom-0 bg-white/90 py-2 rounded-b-xl">
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
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold text-sm"
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
              className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white/90 z-50 shadow-2xl border-l border-gray-100 flex flex-col rounded-l-xl"
              style={{ maxHeight: '100vh' }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white/90 z-10 rounded-t-xl">
                <h3 className="text-lg font-bold text-gray-900">Salary Scheme Details</h3>
                <button
                  onClick={() => {
                    setSalaryDrawerType(null);
                    setSelectedSalaryScheme(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
                >
                  <FaTimesCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-6 flex-1 space-y-6">
                {/* Amount and Employee Section */}
                <div className="bg-gradient-to-r from-emerald-50 via-white to-blue-50 rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">Ksh {selectedSalaryScheme.salaryAmount.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">{selectedSalaryScheme.user?.name || selectedSalaryScheme.employeeName}</div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                      Salary
                    </span>
                    <div className="mt-2 flex items-center gap-1">
                      <FaRedo className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-gray-600 capitalize">
                        {selectedSalaryScheme.frequency}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Details Grid Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/80 rounded-xl p-5 border border-gray-100 shadow-sm">
                    <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Employee ID:</span>
                        <span>{selectedSalaryScheme.userId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Employee Name:</span>
                        <span>{selectedSalaryScheme.user?.name || selectedSalaryScheme.employeeName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Start Date:</span>
                        <span>{new Date(selectedSalaryScheme.startDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span>{new Date(selectedSalaryScheme.createdAt).toLocaleDateString()}</span>
                      </div>
                      {selectedSalaryScheme.branch && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Branch:</span>
                          <span>{selectedSalaryScheme.branch.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-white/80 rounded-xl p-5 border border-gray-100 shadow-sm">
                    <h4 className="font-medium text-gray-900 mb-3">Payment Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={selectedSalaryScheme.isActive ? 'text-green-600' : 'text-red-600'}>
                          {selectedSalaryScheme.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Next Due Date:</span>
                        <span>{selectedSalaryScheme.nextDueDate ? new Date(selectedSalaryScheme.nextDueDate).toLocaleDateString() : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Paid Date:</span>
                        <span>{selectedSalaryScheme.lastPaidDate ? new Date(selectedSalaryScheme.lastPaidDate).toLocaleDateString() : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Frequency:</span>
                        <span className="capitalize">{selectedSalaryScheme.frequency}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Notes Section */}
                {selectedSalaryScheme.notes && (
                  <div className="bg-gradient-to-r from-emerald-50 via-white to-blue-50 rounded-2xl p-4 shadow-sm border border-gray-100">
                    <h4 className="font-medium text-gray-900 mb-3">Notes</h4>
                    <div className="text-sm text-gray-700">
                      {selectedSalaryScheme.notes}
                    </div>
                  </div>
                )}
                {/* Action Buttons - For now, just close; add edit/delete if needed later */}
                <div className="flex justify-end gap-3 mt-2">
                  <button
                    onClick={() => {
                      setSalaryDrawerType(null);
                      setSelectedSalaryScheme(null);
                    }}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold text-sm"
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
