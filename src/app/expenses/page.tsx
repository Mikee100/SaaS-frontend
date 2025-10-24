"use client";
import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiDelete } from "@/utils/api";
import AuthGuard from '@/components/AuthGuard';
import { FaDollarSign, FaCalendarAlt, FaBuilding, FaSave, FaTimesCircle, FaExclamationTriangle, FaPlus, FaEye, FaEdit, FaTrash, FaCheckCircle, FaClock, FaRedo } from 'react-icons/fa';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import Spinner from '@/components/Spinner';
import { motion, AnimatePresence } from "framer-motion";

interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
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

export default function ExpensesPage() {
  const { user } = useUser();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [drawerType, setDrawerType] = useState<'create' | 'details' | null>(null);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchFilter, setBranchFilter] = useState<string | null>(null);

  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: 0,
    description: '',
    category: 'other',
    expenseType: 'one_time',
  });

  // Permission checks
  const canViewExpenses = hasPermission(user, 'view_sales');
  const canCreateExpenses = hasPermission(user, 'create_sales');

  // Wrap fetchExpenses in useCallback to avoid changing reference on every render
  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/expenses';
      if (branchFilter) url += `?branchId=${branchFilter}`;
      const data = await apiGet(url);
      setExpenses(data as Expense[]);
    } catch {
      setError('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [branchFilter]);

  useEffect(() => {
    const fetchAll = async () => {
      await fetchExpenses();
      await fetchBranches();
    };
    fetchAll();
  }, [branchFilter, fetchExpenses]);

  const fetchBranches = async () => {
    try {
      const data = await apiGet('/branches');
      setBranches(data as { id: string; name: string }[]);
    } catch {
      // ignore branch fetch error for now
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

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      office_supplies: 'bg-blue-100 text-blue-800',
      utilities: 'bg-green-100 text-green-800',
      rent: 'bg-purple-100 text-purple-800',
      marketing: 'bg-orange-100 text-orange-800',
      travel: 'bg-indigo-100 text-indigo-800',
      equipment: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors.other;
  };

  const getExpenseTypeIcon = (type: string) => {
    return type === 'recurring' ? <FaRedo className="w-4 h-4" /> : <FaDollarSign className="w-4 h-4" />;
  };

  // Calculate summary totals
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const categoryTotals = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);
  const branchTotals = expenses.reduce((acc, exp) => {
    if (exp.branch?.name) {
      acc[exp.branch.name] = (acc[exp.branch.name] || 0) + exp.amount;
    }
    return acc;
  }, {} as Record<string, number>);

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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don&apos;t have permission to view expenses.</p>
            <p className="text-sm text-gray-500">Contact your administrator to request access.</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-blue-50 via-white to-purple-50 backdrop-blur-lg flex items-center justify-between mb-4 py-3 px-2 rounded-lg shadow border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">Expenses</h1>
            <p className="text-sm text-gray-500">Track and manage your business expenses with a modern, intuitive interface.</p>
          </div>
          {canCreateExpenses && (
            <button
              onClick={() => setDrawerType('create')}
              className="hidden md:inline-flex px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow hover:scale-105 hover:shadow-lg font-semibold items-center gap-2 transition-all duration-150 text-sm"
            >
              <FaPlus className="w-4 h-4" />
              Add Expense
            </button>
          )}
        </div>

        {/* Floating Add Button (mobile) */}
        {canCreateExpenses && (
          <button
            onClick={() => setDrawerType('create')}
            className="fixed bottom-8 right-8 z-30 md:hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-xl p-5 flex items-center justify-center hover:scale-110 transition-all duration-150"
            aria-label="Add Expense"
          >
            <FaPlus className="w-6 h-6" />
          </button>
        )}

        {/* Success/Error Messages */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-base flex items-center gap-3 shadow"
            >
              <FaCheckCircle className="w-5 h-5" />
              <span>{success}</span>
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-base flex items-center gap-3 shadow"
            >
              <FaExclamationTriangle className="w-5 h-5" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Branch Filter */}
        <div className="mb-6 flex items-center gap-4">
          <label className="font-semibold text-gray-700">Filter by Branch:</label>
          <select
            value={branchFilter || ''}
            onChange={e => setBranchFilter(e.target.value || null)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">All Branches</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>

        {/* Expenses Summary Table */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow border border-gray-100 p-4">
            <h4 className="text-base font-semibold text-gray-800 mb-2">Expenses Summary</h4>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-semibold text-gray-700">Type</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-700">Name</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-700">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-2 text-gray-600">All</td>
                  <td className="py-2 px-2 text-gray-600">All Expenses</td>
                  <td className="py-2 px-2 text-right font-bold text-blue-700">${totalAmount.toFixed(2)}</td>
                </tr>
                {/* By Category */}
                {Object.entries(categoryTotals).map(([cat, amt]) => (
                  <tr key={cat} className="border-b">
                    <td className="py-2 px-2 text-gray-600">Category</td>
                    <td className="py-2 px-2 text-gray-600">{cat.replace('_', ' ')}</td>
                    <td className="py-2 px-2 text-right text-gray-800">${amt.toFixed(2)}</td>
                  </tr>
                ))}
                {/* By Branch */}
                {Object.entries(branchTotals).map(([branch, amt]) => (
                  <tr key={branch} className="border-b">
                    <td className="py-2 px-2 text-gray-600">Branch</td>
                    <td className="py-2 px-2 text-gray-600">{branch}</td>
                    <td className="py-2 px-2 text-right text-gray-800">${amt.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expenses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {expenses.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <FaDollarSign className="w-20 h-20 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No expenses found</h3>
              <p className="text-gray-500 mb-6">Start by adding your first expense</p>
              {canCreateExpenses && (
                <button
                  onClick={() => setDrawerType('create')}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 font-semibold flex items-center gap-2"
                >
                  <FaPlus className="w-5 h-5" />
                  Add Expense
                </button>
              )}
            </div>
          ) : (
            expenses.map((expense) => (
              <div
                key={expense.id}
                className="bg-white rounded-lg shadow border border-gray-100 p-4 hover:shadow-lg transition-shadow cursor-pointer flex flex-col justify-between"
                onClick={() => {
                  setSelectedExpense(expense);
                  setDrawerType('details');
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 rounded-lg shadow">
                      {getExpenseTypeIcon(expense.expenseType)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-base">${expense.amount.toFixed(2)}</h3>
                      <p className="text-xs text-gray-600">{expense.description}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getCategoryColor(expense.category)}`}>
                    {expense.category.replace('_', ' ')}
                  </span>
                </div>
                <div className="space-y-1 mb-2">
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <FaCalendarAlt className="w-3 h-3" />
                    <span>{new Date(expense.createdAt).toLocaleDateString()}</span>
                  </div>
                  {expense.expenseType === 'recurring' && expense.nextDueDate && (
                    <div className="flex items-center gap-1 text-xs text-orange-600">
                      <FaClock className="w-3 h-3" />
                      <span>Next due: {new Date(expense.nextDueDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {expense.branch && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <FaBuilding className="w-3 h-3" />
                      <span>{expense.branch.name}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-auto pt-1">
                  <div className="flex items-center gap-1">
                    {expense.expenseType === 'recurring' ? (
                      <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded text-xs font-medium">
                        Recurring ({expense.frequency})
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                        One-time
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedExpense(expense);
                      setDrawerType('details');
                    }}
                    className="px-2 py-0.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded text-xs font-medium flex items-center gap-1"
                  >
                    <FaEye className="w-3 h-3" />
                    View
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Backdrop */}
        <AnimatePresence>
          {drawerType && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gradient-to-br from-blue-100/60 via-white/60 to-purple-100/60 backdrop-blur-lg z-40"
              onClick={() => {
                setDrawerType(null);
                setSelectedExpense(null);
                setFormData({
                  amount: 0,
                  description: '',
                  category: 'other',
                  expenseType: 'one_time',
                });
                setError(null);
              }}
            />
          )}
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
                        <FaDollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 text-blue-400 w-4 h-4" />
                        <input
                          type="number"
                          value={formData.amount}
                          onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                          className="w-full pl-8 pr-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white/80"
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
                    <div className="text-2xl font-bold text-gray-900">${selectedExpense.amount.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">{selectedExpense.description}</div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(selectedExpense.category)}`}>
                      {selectedExpense.category.replace('_', ' ')}
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
                        category: selectedExpense.category,
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
      </div>
    </AuthGuard>
  );
}
