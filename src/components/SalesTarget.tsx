"use client";

import React, { useState, useEffect } from 'react';
import { TagIcon, PencilIcon, CheckIcon, XMarkIcon, ChartBarIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { apiGet, apiPut } from '@/utils/api';

interface SalesTarget {
  daily: number;
  weekly: number;
  monthly: number;
}

// Define a minimal type for sales items
interface SaleItem {
  date: string;
  total?: number;
}

interface SalesTargetProps {
  currentRevenue: number;
  totalSales: number;
  filteredSales: SaleItem[];
}

export default function SalesTargetComponent({ currentRevenue, totalSales, filteredSales }: SalesTargetProps) {
  const [targets, setTargets] = useState<SalesTarget>({ daily: 0, weekly: 0, monthly: 0 });
  const [editing, setEditing] = useState<string | null>(null);
  const [tempTargets, setTempTargets] = useState<SalesTarget>({ daily: 0, weekly: 0, monthly: 0 });

  // Load targets from API on mount
  useEffect(() => {
    const loadTargets = async () => {
      try {
        const data = await apiGet<SalesTarget>('/sales-targets');
        setTargets(data);
        setTempTargets(data);
      } catch (error) {
        console.error('Error loading sales targets:', error);
        // Fallback to localStorage if API fails
        const savedTargets = localStorage.getItem('salesTargets');
        if (savedTargets) {
          try {
            const parsed = JSON.parse(savedTargets);
            setTargets(parsed);
            setTempTargets(parsed);
          } catch (localError) {
            console.error('Error parsing localStorage targets:', localError);
          }
        }
      }
    };

    loadTargets();
  }, []);

  // Save targets to API whenever they change
  const saveTargets = async (newTargets: SalesTarget) => {
    try {
      await apiPut('/sales-targets', newTargets);
      setTargets(newTargets);
      // Also save to localStorage as backup
      localStorage.setItem('salesTargets', JSON.stringify(newTargets));
    } catch (error) {
      console.error('Error saving sales targets:', error);
      // Fallback to localStorage
      localStorage.setItem('salesTargets', JSON.stringify(newTargets));
      setTargets(newTargets);
    }
  };

  // Calculate current period values
  const getCurrentPeriodRevenue = (period: 'daily' | 'weekly' | 'monthly') => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    return filteredSales
      .filter(sale => new Date(sale.date) >= startDate)
      .reduce((sum, sale) => sum + (sale.total || 0), 0);
  };

  const getCurrentPeriodSales = (period: 'daily' | 'weekly' | 'monthly') => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    return filteredSales.filter(sale => new Date(sale.date) >= startDate).length;
  };

  const handleEdit = (period: string) => {
    setEditing(period);
    setTempTargets({ ...targets });
  };

  const handleSave = async () => {
    await saveTargets(tempTargets);
    setEditing(null);
  };

  const handleCancel = () => {
    setTempTargets({ ...targets });
    setEditing(null);
  };

  const handleInputChange = (period: keyof SalesTarget, value: string) => {
    const numValue = parseFloat(value) || 0;
    setTempTargets(prev => ({ ...prev, [period]: numValue }));
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getProgressTextColor = (progress: number) => {
    if (progress >= 100) return 'text-green-600';
    if (progress >= 75) return 'text-blue-600';
    if (progress >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const periods = [
    { key: 'daily' as const, label: 'Daily', icon: CalendarDaysIcon },
    { key: 'weekly' as const, label: 'Weekly', icon: ChartBarIcon },
    { key: 'monthly' as const, label: 'Monthly', icon: TagIcon }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-6">
        <TagIcon className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">Sales Targets</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {periods.map(({ key, label, icon: Icon }) => {
          const currentRevenue = getCurrentPeriodRevenue(key);
          const currentSales = getCurrentPeriodSales(key);
          const target = targets[key];
          const revenueProgress = target > 0 ? (currentRevenue / target) * 100 : 0;

          return (
            <div key={key} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-800">{label}</h3>
                </div>
                {editing === key ? (
                  <div className="flex gap-1">
                    <button
                      onClick={handleSave}
                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                      title="Save"
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                      title="Cancel"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEdit(key)}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    title="Edit target"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* Target Input/Edit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Revenue (Ksh)
                  </label>
                  {editing === key ? (
                    <input
                      type="number"
                      value={tempTargets[key]}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Enter target amount"
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <div className="text-lg font-bold text-gray-900">
                      Ksh {target.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  )}
                </div>

                {/* Current Progress */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Current: ${currentRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className={`text-sm font-semibold ${getProgressTextColor(revenueProgress)}`}>
                      {revenueProgress.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(revenueProgress)}`}
                      style={{ width: `${Math.min(revenueProgress, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Sales Count */}
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{currentSales}</span> sales this {label.toLowerCase()}
                </div>

                {/* Status Message */}
                <div className={`text-xs font-medium ${revenueProgress >= 100 ? 'text-green-600' : revenueProgress >= 75 ? 'text-blue-600' : 'text-gray-600'}`}>
                  {revenueProgress >= 100
                    ? `🎉 Target exceeded by $${(currentRevenue - target).toFixed(2)}!`
                    : revenueProgress >= 75
                    ? `Almost there! $${(target - currentRevenue).toFixed(2)} to go.`
                    : target > 0
                    ? `$${target - currentRevenue > 0 ? (target - currentRevenue).toFixed(2) : '0.00'} remaining to reach target.`
                    : 'Set a target to start tracking progress.'
                  }
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall Summary */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900"> Ksh {currentRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-sm text-gray-600">Total Revenue</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{totalSales}</div>
            <div className="text-sm text-gray-600">Total Sales</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              Ksh {totalSales > 0 ? (currentRevenue / totalSales).toFixed(2) : '0.00'}
            </div>
            <div className="text-sm text-gray-600">Average Sale</div>
          </div>
        </div>
      </div>
    </div>
  );
}
