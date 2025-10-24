'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft, FaBox, FaPalette, FaRuler, FaEye, FaEdit, FaQrcode, FaTrash, FaPlus, FaSave, FaTimes, FaPrint } from 'react-icons/fa';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api';
import AuthGuard from '@/components/AuthGuard';
import { useBranch } from '@/contexts/BranchContext';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import Tooltip from '@/components/Tooltip';
import FeatureGuard from '@/components/FeatureGuard';
import Image from 'next/image';
import API_BASE_URL from '../../../config/apiConfig';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  description?: string;
  supplier?: {
    id: string;
    name: string;
  };
  category?: {
    id: string;
    name: string;
    description?: string;
  };
}

interface ProductVariation {
  id: string;
  sku: string;
  price?: number;
  cost?: number;
  stock: number;
  attributes: Record<string, string>;
  isActive: boolean;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { selectedBranchId } = useBranch();
  const { user } = useUser();
  const productId = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'variations'>('overview');
  const [qrCodeProductId, setQrCodeProductId] = useState<string | null>(null);

  // Variations management state
  const [editingVariation, setEditingVariation] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{[key: string]: {stock: number, price: number, cost: number}}>({});
  const [saving, setSaving] = useState(false);
  const [newVariation, setNewVariation] = useState<{color: string, size: string, stock: number} | null>(null);

  // Available colors and sizes
  const availableColors = [
    'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Pink', 'Gray', 'Brown', 'Navy', 'Maroon'
  ];

  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

  // Permission checks
  const canEditProducts = hasPermission(user, 'edit_products');
  const canDeleteProducts = hasPermission(user, 'delete_products');

  useEffect(() => {
    // Inline function to avoid missing dependency warning
    const fetchAll = async () => {
      try {
        setLoading(true);

        // Fetch product details
        const productData = await apiGet(`/products/${productId}`, { 'x-branch-id': selectedBranchId || '' });
        setProduct(productData as Product);

        // Fetch variations
        const variationsData = await apiGet(`/products/${productId}/variations`, { 'x-branch-id': selectedBranchId || '' });
        setVariations(variationsData as ProductVariation[] || []);
      } catch (err: unknown) {
        setError((err as { message?: string })?.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [productId, selectedBranchId]);

  const handleDelete = async () => {
    if (!confirm("Delete this product?")) return;
    try {
      await apiDelete(`/products/${productId}`, { 'x-branch-id': selectedBranchId || '' });
      router.push('/products');
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to delete product');
    }
  };

  const openEditModal = () => {
    router.push(`/products/new?edit=${productId}`);
  };

  const handleSaveVariation = async (variationId: string) => {
    try {
      setSaving(true);
      const updates = editValues[variationId];
      if (!updates) return;

      await apiPut(`/products/${productId}/variations/${variationId}`, updates, { 'x-branch-id': selectedBranchId || '' });

      // Update local state
      setVariations(prev => prev.map(v =>
        v.id === variationId ? { ...v, ...updates } : v
      ));

      setEditingVariation(null);
      setEditValues(prev => {
        const newValues = { ...prev };
        delete newValues[variationId];
        return newValues;
      });
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to update variation');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVariation = async (variationId: string) => {
    if (!confirm("Delete this variation?")) return;
    try {
      await apiDelete(`/products/${productId}/variations/${variationId}`, { 'x-branch-id': selectedBranchId || '' });

      // Update local state
      setVariations(prev => prev.filter(v => v.id !== variationId));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to delete variation');
    }
  };

  const handleAddVariation = async () => {
    if (!newVariation) return;

    try {
      setSaving(true);
      const variationData = {
        attributes: {
          color: newVariation.color,
          size: newVariation.size,
        },
        stock: newVariation.stock,
        isActive: true,
      };

      const newVar = await apiPost(`/products/${productId}/variations`, variationData, { 'x-branch-id': selectedBranchId || '' });

      // Update local state
      setVariations(prev => [...prev, newVar as ProductVariation]);
      setNewVariation(null);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to add variation');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <FaBox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-600 mb-4">The product you&apos;re looking for doesn&apos;t exist.</p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaArrowLeft className="w-4 h-4" />
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/products"
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
              <p className="text-gray-600">Product details and management</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/products/${product.id}/variations`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <FaEye className="w-4 h-4" />
              View Variations
            </Link>

            {canEditProducts ? (
              <button
                onClick={openEditModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <FaEdit className="w-4 h-4" />
                Edit
              </button>
            ) : (
              <Tooltip content="You don't have permission to edit products. Contact your administrator.">
                <button
                  disabled
                  className="px-4 py-2 border border-gray-300 text-gray-400 rounded-lg cursor-not-allowed flex items-center gap-2"
                >
                  <FaEdit className="w-4 h-4" />
                  Edit
                </button>
              </Tooltip>
            )}

            <FeatureGuard requiredFeature="api_access" showUpgradePrompt={false} fallback={
              <button disabled className="px-4 py-2 border border-gray-300 text-gray-400 rounded-lg cursor-not-allowed flex items-center gap-2">
                <FaQrcode className="w-4 h-4" />
                QR
                <FaTrash className="w-3 h-3 ml-1" />
              </button>
            }>
              <button
                onClick={() => setQrCodeProductId(product.id)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <FaQrcode className="w-4 h-4" />
                QR Code
              </button>
            </FeatureGuard>

            {canDeleteProducts ? (
              <button
                onClick={handleDelete}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <FaTrash className="w-4 h-4" />
                Delete
              </button>
            ) : (
              <Tooltip content="You don't have permission to delete products. Contact your administrator.">
                <button
                  disabled
                  className="px-4 py-2 border border-gray-300 text-gray-400 rounded-lg cursor-not-allowed flex items-center gap-2"
                >
                  <FaTrash className="w-4 h-4" />
                  Delete
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Product Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="flex">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'overview'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('variations')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'variations'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Variations ({variations.length})
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Information</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                          <p className="text-gray-900">{product.name}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                          <p className="text-gray-900 font-mono">{product.sku}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Base Price</label>
                          <p className="text-gray-900">${product.price.toFixed(2)}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Base Cost</label>
                          <p className="text-gray-900">${product.cost.toFixed(2)}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Margin</label>
                          <p className={`font-semibold ${product.price > 0 ? (product.price - product.cost) / product.price * 100 >= 20 ? 'text-green-600' : 'text-amber-600' : 'text-gray-800'}`}>
                            {product.price > 0 ? `${((product.price - product.cost) / product.price * 100).toFixed(1)}%` : 'N/A'}
                          </p>
                        </div>
                        {product.supplier?.name && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                            <Link
                              href={`/products/supplier/${encodeURIComponent(product.supplier.name)}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {product.supplier.name}
                            </Link>
                          </div>
                        )}
                        {product.category?.name && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {product.category.name}
                            </span>
                          </div>
                        )}
                      </div>
                      {product.description && (
                        <div className="mt-6">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <p className="text-gray-600">{product.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'variations' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-gray-900">Product Variations</h2>
                      {canEditProducts && (
                        <button
                          onClick={() => setNewVariation({ color: '', size: '', stock: 0 })}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <FaPlus className="w-4 h-4" />
                          Add Variation
                        </button>
                      )}
                    </div>

                    {variations.length === 0 ? (
                      <div className="text-center py-12">
                        <FaBox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Variations</h3>
                        <p className="text-gray-600 mb-4">This product doesn&apos;t have any variations yet.</p>
                        {canEditProducts && (
                          <button
                            onClick={() => setNewVariation({ color: '', size: '', stock: 0 })}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Add First Variation
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attributes</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {variations.map((variation) => (
                              <tr key={variation.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    {variation.attributes.color && (
                                      <span className="inline-flex items-center gap-1 text-sm">
                                        <FaPalette className="w-3 h-3 text-gray-400" />
                                        {variation.attributes.color}
                                      </span>
                                    )}
                                    {variation.attributes.size && (
                                      <span className="inline-flex items-center gap-1 text-sm">
                                        <FaRuler className="w-3 h-3 text-gray-400" />
                                        {variation.attributes.size}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                                  {variation.sku}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {editingVariation === variation.id ? (
                                    <input
                                      type="number"
                                      min="0"
                                      value={editValues[variation.id]?.stock ?? variation.stock}
                                      onChange={(e) => setEditValues(prev => ({
                                        ...prev,
                                        [variation.id]: { ...prev[variation.id], stock: parseInt(e.target.value) || 0 }
                                      }))}
                                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  ) : (
                                    <span className={`text-sm ${variation.stock === 0 ? 'text-red-600' : variation.stock < 10 ? 'text-amber-600' : 'text-gray-900'}`}>
                                      {variation.stock}
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {editingVariation === variation.id ? (
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={editValues[variation.id]?.price ?? variation.price ?? product.price}
                                      onChange={(e) => setEditValues(prev => ({
                                        ...prev,
                                        [variation.id]: { ...prev[variation.id], price: parseFloat(e.target.value) || 0 }
                                      }))}
                                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  ) : (
                                    <span className="text-sm text-gray-900">
                                      ${variation.price?.toFixed(2) ?? product.price.toFixed(2)}
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {editingVariation === variation.id ? (
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={editValues[variation.id]?.cost ?? variation.cost ?? product.cost}
                                      onChange={(e) => setEditValues(prev => ({
                                        ...prev,
                                        [variation.id]: { ...prev[variation.id], cost: parseFloat(e.target.value) || 0 }
                                      }))}
                                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  ) : (
                                    <span className="text-sm text-gray-900">
                                      ${variation.cost?.toFixed(2) ?? product.cost.toFixed(2)}
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    variation.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {variation.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex items-center gap-2">
                                    {editingVariation === variation.id ? (
                                      <>
                                        <button
                                          onClick={() => handleSaveVariation(variation.id)}
                                          disabled={saving}
                                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                        >
                                          <FaSave className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingVariation(null);
                                            setEditValues(prev => {
                                              const newValues = { ...prev };
                                              delete newValues[variation.id];
                                              return newValues;
                                            });
                                          }}
                                          className="text-gray-600 hover:text-gray-900"
                                        >
                                          <FaTimes className="w-4 h-4" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        {canEditProducts && (
                                          <button
                                            onClick={() => setEditingVariation(variation.id)}
                                            className="text-blue-600 hover:text-blue-900"
                                          >
                                            <FaEdit className="w-4 h-4" />
                                          </button>
                                        )}
                                        {canDeleteProducts && (
                                          <button
                                            onClick={() => handleDeleteVariation(variation.id)}
                                            className="text-red-600 hover:text-red-900"
                                          >
                                            <FaTrash className="w-4 h-4" />
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Add New Variation Modal */}
                    {newVariation && (
                      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-900">Add New Variation</h3>
                            <button
                              onClick={() => setNewVariation(null)}
                              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                            >
                              <FaTimes className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                              <select
                                value={newVariation.color}
                                onChange={(e) => setNewVariation(prev => prev ? ({ ...prev, color: e.target.value }) : null)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select Color</option>
                                {availableColors.map(color => (
                                  <option key={color} value={color}>{color}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                              <select
                                value={newVariation.size}
                                onChange={(e) => setNewVariation(prev => prev ? ({ ...prev, size: e.target.value }) : null)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select Size</option>
                                {availableSizes.map(size => (
                                  <option key={size} value={size}>{size}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Initial Stock</label>
                              <input
                                type="number"
                                min="0"
                                value={newVariation.stock}
                                onChange={(e) => setNewVariation(prev => prev ? ({ ...prev, stock: parseInt(e.target.value) || 0 }) : null)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>

                          <div className="flex gap-3 mt-6">
                            <button
                              onClick={handleAddVariation}
                              disabled={saving || !newVariation.color || !newVariation.size}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <FaPlus className="w-4 h-4" />
                              Add Variation
                            </button>
                            <button
                              onClick={() => setNewVariation(null)}
                              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Variations Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Variations</span>
                  <span className="font-semibold text-gray-900">{variations.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Stock</span>
                  <span className="font-semibold text-gray-900">{variations.reduce((sum, v) => sum + v.stock, 0)}</span>
                </div>
                {variations.length > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Price Range</span>
                    <span className="font-semibold text-gray-900">
                      ${Math.min(...variations.map(v => v.price || product.price)).toFixed(2)} - ${Math.max(...variations.map(v => v.price || product.price)).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
              <p className="text-blue-100 mb-4">Manage your product variations</p>
              <Link
                href={`/products/${product.id}/variations`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
              >
                <FaBox className="w-4 h-4" />
                Manage Variations
              </Link>
            </div>
          </div>
        </div>

        {/* QR Code Modal */}
        {qrCodeProductId && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setQrCodeProductId(null)}>
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Product QR Code</h3>
                <button
                  onClick={() => setQrCodeProductId(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>

              <div className="text-center">
                <Image
                  src={`${API_BASE_URL}/products/${qrCodeProductId}/qr`}
                  alt="Product QR Code"
                  width={256}
                  height={256}
                  className="w-64 h-64 mx-auto mb-6 border border-gray-200 rounded-lg"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const printWindow = window.open('', '', 'height=400,width=400');
                      if (printWindow) {
                        printWindow.document.write('<html><head><title>Print QR Code</title></head><body style="text-align:center;">');
                        printWindow.document.write(`<img src="${API_BASE_URL}/products/${qrCodeProductId}/qr" />`);
                        printWindow.document.write('</body></html>');
                        printWindow.document.close();
                        printWindow.focus();
                        printWindow.print();
                        printWindow.close();
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FaPrint className="w-4 h-4" />
                    Print
                  </button>

                  <button
                    onClick={() => setQrCodeProductId(null)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
