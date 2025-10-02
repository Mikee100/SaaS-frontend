"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utils/api";
import AuthGuard from '@/components/AuthGuard';
import {
  FaBuilding, FaPlus, FaEdit, FaTrash, FaSearch, FaPhone, FaEnvelope,
  FaMapMarkerAlt, FaGlobe, FaBox, FaDollarSign, FaChartLine,
  FaEye, FaTimes, FaUser, FaStickyNote
} from 'react-icons/fa';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';

interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  website?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
}

interface SupplierStats {
  id: string;
  name: string;
  totalProducts: number;
  totalValue: number;
  totalCost: number;
  totalProfit: number;
}

export default function SuppliersPage() {
  const { user } = useUser();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierStats, setSupplierStats] = useState<SupplierStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    postalCode: '',
    website: '',
    notes: '',
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const [suppliersData, statsData] = await Promise.all([
        apiGet("/suppliers"),
        apiGet("/suppliers/stats")
      ]);
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
      setSupplierStats(Array.isArray(statsData) ? statsData : []);
    } catch (error) {
      console.error("Error loading suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(search.toLowerCase()) ||
    supplier.contactName?.toLowerCase().includes(search.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        contactName: supplier.contactName || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        city: supplier.city || '',
        country: supplier.country || '',
        postalCode: supplier.postalCode || '',
        website: supplier.website || '',
        notes: supplier.notes || '',
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: '',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        postalCode: '',
        website: '',
        notes: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSupplier(null);
    setFormData({
      name: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: '',
      postalCode: '',
      website: '',
      notes: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingSupplier) {
        await apiPut(`/suppliers/${editingSupplier.id}`, formData);
      } else {
        await apiPost("/suppliers", formData);
      }
      await loadSuppliers();
      closeModal();
    } catch (error) {
      console.error("Error saving supplier:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`Are you sure you want to delete ${supplier.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiDelete(`/suppliers/${supplier.id}`);
      await loadSuppliers();
    } catch (error) {
      console.error("Error deleting supplier:", error);
      alert("Failed to delete supplier. It may have associated products.");
    }
  };

  const getSupplierStats = (supplierId: string) => {
    return supplierStats.find(stat => stat.id === supplierId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Suppliers</h1>
            <p className="text-gray-600">Manage your product suppliers and their information</p>
          </div>

          {hasPermission(user, 'create_inventory') && (
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaPlus className="w-4 h-4" />
              Add Supplier
            </button>
          )}
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search suppliers by name, contact, or email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Suppliers Grid */}
        {filteredSuppliers.length === 0 ? (
          <div className="text-center py-12">
            <FaBuilding className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No suppliers found</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first supplier</p>
            {hasPermission(user, 'create_inventory') && (
              <button
                onClick={() => openModal()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaPlus className="w-4 h-4" />
                Add Supplier
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSuppliers.map(supplier => {
              const stats = getSupplierStats(supplier.id);
              return (
                <div key={supplier.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{supplier.name}</h3>
                      {supplier.contactName && (
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <FaUser className="w-3 h-3" />
                          {supplier.contactName}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {hasPermission(user, 'view_inventory') && (
                        <Link
                          href={`/suppliers/${supplier.id}`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <FaEye className="w-4 h-4" />
                        </Link>
                      )}
                      {hasPermission(user, 'edit_inventory') && (
                        <button
                          onClick={() => openModal(supplier)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit Supplier"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                      )}
                      {hasPermission(user, 'delete_inventory') && (
                        <button
                          onClick={() => handleDelete(supplier)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Supplier"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 mb-4">
                    {supplier.email && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <FaEnvelope className="w-3 h-3 text-gray-400" />
                        {supplier.email}
                      </p>
                    )}
                    {supplier.phone && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <FaPhone className="w-3 h-3 text-gray-400" />
                        {supplier.phone}
                      </p>
                    )}
                    {(supplier.city || supplier.country) && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <FaMapMarkerAlt className="w-3 h-3 text-gray-400" />
                        {[supplier.city, supplier.country].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {supplier.website && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <FaGlobe className="w-3 h-3 text-gray-400" />
                        <a href={supplier.website} target="_blank" rel="noopener noreferrer"
                           className="text-blue-600 hover:underline">
                          Website
                        </a>
                      </p>
                    )}
                  </div>

                  {/* Stats */}
                  {stats && (
                    <div className="border-t pt-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 flex items-center gap-1">
                            <FaBox className="w-3 h-3" />
                            Products
                          </p>
                          <p className="font-semibold">{stats.totalProducts}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 flex items-center gap-1">
                            <FaDollarSign className="w-3 h-3" />
                            Value
                          </p>
                          <p className="font-semibold text-green-600">${stats.totalValue.toLocaleString()}</p>
                        </div>
                      </div>
                      {stats.totalProfit !== 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <FaChartLine className="w-3 h-3" />
                            Total Profit
                          </p>
                          <p className={`font-semibold ${stats.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            ${stats.totalProfit.toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {supplier.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-600 flex items-start gap-2">
                        <FaStickyNote className="w-3 h-3 mt-0.5 text-gray-400" />
                        <span className="line-clamp-2">{supplier.notes}</span>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={e => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={e => setFormData(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={e => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : (editingSupplier ? "Update Supplier" : "Add Supplier")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
