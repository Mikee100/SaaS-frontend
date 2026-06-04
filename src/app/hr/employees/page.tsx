"use client";

import React, { useCallback, useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { useUser } from '@/components/UserContext';
import { hasPermission } from '@/utils/permissions';
import { apiDelete, apiGet, apiPost, apiPut } from '@/utils/api';
import { FaEdit, FaPlus, FaTrash } from 'react-icons/fa';

interface EmployeeProfile {
  id: string;
  fullName: string;
  employeeNumber?: string;
  department?: string;
  roleTitle?: string;
  status?: string;
  employmentType?: string;
  email?: string;
  phone?: string;
  hireDate?: string;
  notes?: string;
}

export default function HrEmployeesPage() {
  const { user } = useUser();
  const canView = hasPermission(user, 'view_sales');
  const canCreate = hasPermission(user, 'create_sales');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: '',
    employeeNumber: '',
    department: '',
    roleTitle: '',
    status: 'active',
    employmentType: 'permanent',
    email: '',
    phone: '',
    hireDate: '',
    notes: '',
  });

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiGet('/hr/employees');
      const data = (response as { data?: unknown[] })?.data || [];
      setEmployees(Array.isArray(data) ? (data as EmployeeProfile[]) : []);
    } catch (e) {
      setError((e as { message?: string })?.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canView) return;
    loadEmployees();
  }, [canView, loadEmployees]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      fullName: '',
      employeeNumber: '',
      department: '',
      roleTitle: '',
      status: 'active',
      employmentType: 'permanent',
      email: '',
      phone: '',
      hireDate: '',
      notes: '',
    });
  };

  const saveEmployee = async () => {
    if (!form.fullName.trim()) {
      setError('Employee full name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (editingId) {
        await apiPut(`/hr/employees/${editingId}`, form);
        setSuccess('Employee profile updated');
      } else {
        await apiPost('/hr/employees', form);
        setSuccess('Employee profile created');
      }

      resetForm();
      await loadEmployees();
    } catch (e) {
      setError((e as { message?: string })?.message || 'Failed to save employee profile');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (employee: EmployeeProfile) => {
    setEditingId(employee.id);
    setForm({
      fullName: employee.fullName || '',
      employeeNumber: employee.employeeNumber || '',
      department: employee.department || '',
      roleTitle: employee.roleTitle || '',
      status: employee.status || 'active',
      employmentType: employee.employmentType || 'permanent',
      email: employee.email || '',
      phone: employee.phone || '',
      hireDate: employee.hireDate ? employee.hireDate.slice(0, 10) : '',
      notes: employee.notes || '',
    });
  };

  const deleteEmployee = async (employeeId: string) => {
    if (!confirm('Delete this employee profile?')) {
      return;
    }

    try {
      await apiDelete(`/hr/employees/${employeeId}`);
      setSuccess('Employee profile deleted');
      await loadEmployees();
    } catch (e) {
      setError((e as { message?: string })?.message || 'Failed to delete employee profile');
    }
  };

  if (!canView) {
    return (
      <AuthGuard>
        <div className="p-4 text-sm text-red-600">You do not have permission to view HR employees.</div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="p-4 space-y-3 bg-gray-50 min-h-screen text-[13px]">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">HR Employees</h1>
          <p className="text-xs text-gray-600">Employee profiles for payroll and HR records.</p>
        </div>

        {error && <div className="p-2 text-xs rounded border border-red-200 bg-red-50 text-red-700">{error}</div>}
        {success && <div className="p-2 text-xs rounded border border-green-200 bg-green-50 text-green-700">{success}</div>}

        {canCreate && (
          <div className="border rounded bg-white p-3">
            <div className="text-xs font-semibold text-gray-800 mb-2">{editingId ? 'Edit Employee' : 'New Employee'}</div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <input
                placeholder="Full name"
                value={form.fullName}
                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                className="px-2 py-1 border rounded text-xs"
              />
              <input
                placeholder="Employee number"
                value={form.employeeNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, employeeNumber: e.target.value }))}
                className="px-2 py-1 border rounded text-xs"
              />
              <input
                placeholder="Department"
                value={form.department}
                onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                className="px-2 py-1 border rounded text-xs"
              />
              <input
                placeholder="Role"
                value={form.roleTitle}
                onChange={(e) => setForm((prev) => ({ ...prev, roleTitle: e.target.value }))}
                className="px-2 py-1 border rounded text-xs"
              />
              <input
                type="date"
                value={form.hireDate}
                onChange={(e) => setForm((prev) => ({ ...prev, hireDate: e.target.value }))}
                className="px-2 py-1 border rounded text-xs"
              />
              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                className="px-2 py-1 border rounded text-xs"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
                <option value="terminated">Terminated</option>
              </select>
              <select
                value={form.employmentType}
                onChange={(e) => setForm((prev) => ({ ...prev, employmentType: e.target.value }))}
                className="px-2 py-1 border rounded text-xs"
              >
                <option value="permanent">Permanent</option>
                <option value="contract">Contract</option>
                <option value="casual">Casual</option>
                <option value="intern">Intern</option>
              </select>
              <input
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="px-2 py-1 border rounded text-xs"
              />
              <input
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="px-2 py-1 border rounded text-xs"
              />
              <input
                placeholder="Notes"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="px-2 py-1 border rounded text-xs"
              />
            </div>

            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={saveEmployee}
                disabled={saving}
                className="px-3 py-1.5 rounded border border-blue-700 bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 disabled:opacity-60 flex items-center gap-1"
              >
                <FaPlus className="w-3 h-3" />
                {saving ? 'Saving...' : editingId ? 'Update Employee' : 'Create Employee'}
              </button>
              {editingId && (
                <button
                  onClick={resetForm}
                  className="px-3 py-1.5 rounded border border-gray-300 bg-white text-xs font-medium hover:bg-gray-100"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>
        )}

        <div className="border rounded bg-white overflow-auto">
          {loading ? (
            <div className="p-4 text-center text-xs text-gray-500">Loading employee profiles...</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Number</th>
                  <th className="text-left p-2">Department</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Contact</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-t">
                    <td className="p-2 font-medium text-gray-800">{employee.fullName}</td>
                    <td className="p-2">{employee.employeeNumber || '-'}</td>
                    <td className="p-2">{employee.department || '-'}</td>
                    <td className="p-2">{employee.roleTitle || '-'}</td>
                    <td className="p-2 capitalize">{(employee.status || 'active').replace('_', ' ')}</td>
                    <td className="p-2 capitalize">{employee.employmentType || '-'}</td>
                    <td className="p-2">{employee.email || employee.phone || '-'}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {canCreate && (
                          <button
                            onClick={() => startEdit(employee)}
                            className="text-blue-700 hover:text-blue-900"
                            title="Edit employee"
                          >
                            <FaEdit className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canCreate && (
                          <button
                            onClick={() => deleteEmployee(employee.id)}
                            className="text-red-700 hover:text-red-900"
                            title="Delete employee"
                          >
                            <FaTrash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {employees.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-gray-500">
                      No employee profiles found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
