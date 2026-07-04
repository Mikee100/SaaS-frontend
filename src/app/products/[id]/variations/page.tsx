'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft, FaPlus, FaTrash, FaSave, FaBox, FaPalette, FaRuler } from 'react-icons/fa';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api';
import AuthGuard from '@/components/AuthGuard';
import { useBranch } from '@/contexts/BranchContext';
import Image from 'next/image';

interface ProductVariation {
  id: string;
  sku: string;
  price?: number;
  cost?: number;
  stock: number;
  attributes: Record<string, string>;
  isActive: boolean;
  barcode?: string;
  images?: string[];
  barcodes?: Array<{
    id: string;
    code: string;
    isPrimary: boolean;
    type: string;
  }>;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  description?: string;
}

export default function ProductVariationsPage() {
  const params = useParams();
  const { selectedBranchId } = useBranch();
  const productId = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingVariation, setEditingVariation] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{[key: string]: {stock: number, price: number, cost: number}}>({});

  // Form state for new variation
  const [newVariation, setNewVariation] = useState({
    color: '',
    size: '',
    stock: 0,
  });

  // Available colors and sizes
  const availableColors = [
    'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Pink', 'Gray', 'Brown', 'Navy', 'Maroon'
  ];

  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

  const getPrimaryBarcode = (variation: ProductVariation): string => {
    const primary = variation.barcodes?.find((item) => item.isPrimary)?.code;
    return primary || variation.barcode || '—';
  };

  const getAlternateBarcodes = (variation: ProductVariation): string[] => {
    const primary = getPrimaryBarcode(variation);
    return (variation.barcodes || [])
      .filter((item) => !item.isPrimary && item.code !== primary)
      .map((item) => item.code);
  };

  const getAttributeValue = (
    variation: ProductVariation,
    keys: string[],
  ): string => {
    for (const key of keys) {
      const value = variation.attributes?.[key];
      if (value) return value;
    }
    return '—';
  };

  const toImageSrc = (imagePath?: string): string | null => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/')) return `http://localhost:7050${imagePath}`;
    return `http://localhost:7050/${imagePath}`;
  };

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
        setError((err as { message?: string })?.message || 'Failed to load product variations');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [productId, selectedBranchId]);

  const handleAddVariation = async () => {
    if (!newVariation.color && !newVariation.size) {
      setError('Please select at least a color or size');
      return;
    }

    // Check if this combination already exists
    const attributes: Record<string, string> = {};
    if (newVariation.color) attributes.color = newVariation.color;
    if (newVariation.size) attributes.size = newVariation.size;

    const exists = variations.some(v =>
      JSON.stringify(v.attributes) === JSON.stringify(attributes)
    );

    if (exists) {
      setError('This color/size combination already exists');
      return;
    }

    try {
      setSaving(true);
      setError('');

      // Generate SKU from attributes
      const skuSuffix = Object.values(attributes).join('-').toLowerCase().replace(/\s+/g, '-');
      const variationData = {
        productId,
        sku: `${product?.sku}-${skuSuffix}`,
        price: product?.price || 0,
        cost: product?.cost || 0,
        stock: newVariation.stock,
        attributes,
        tenantId: 'current-tenant', // This should come from context
        branchId: selectedBranchId,
      };

      const createdVariation = await apiPost(`/products/${productId}/variations`, variationData, { 'x-branch-id': selectedBranchId || '' });

      setVariations(prev => [...prev, createdVariation as ProductVariation]);
      setNewVariation({
        color: '',
        size: '',
        stock: 0,
      });

    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to add variation');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateVariation = async (variationId: string, updates: Partial<ProductVariation>) => {
    try {
      await apiPut(`/products/variations/${variationId}`, updates, { 'x-branch-id': selectedBranchId || '' });

      setVariations(prev => prev.map(v =>
        v.id === variationId ? { ...v, ...updates } : v
      ));

    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to update variation');
    }
  };

  const startEditing = (variation: ProductVariation) => {
    setEditingVariation(variation.id);
    setEditValues({
      ...editValues,
      [variation.id]: {
        stock: variation.stock,
        price: variation.price || 0,
        cost: variation.cost || 0,
      }
    });
  };

  const cancelEditing = () => {
    setEditingVariation(null);
    setEditValues({});
  };

  const saveEditing = async (variationId: string) => {
    const values = editValues[variationId];
    if (!values) return;

    try {
      await handleUpdateVariation(variationId, {
        stock: values.stock,
        price: values.price,
        cost: values.cost,
      });
      setEditingVariation(null);
      setEditValues({});
    } catch {
      // Error is already handled in handleUpdateVariation
    }
  };

  const updateEditValue = (variationId: string, field: 'stock' | 'price' | 'cost', value: number) => {
    setEditValues(prev => ({
      ...prev,
      [variationId]: {
        ...prev[variationId],
        [field]: value,
      }
    }));
  };

  const handleDeleteVariation = async (variationId: string) => {
    if (!confirm('Are you sure you want to delete this variation?')) return;

    try {
      await apiDelete(`/products/${productId}/variations/${variationId}`, { 'x-branch-id': selectedBranchId || '' });

      setVariations(prev => prev.filter(v => v.id !== variationId));

    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to delete variation');
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
              <p className="text-gray-600">Manage product variations and stock levels</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">SKU: {product.sku}</p>
            <p className="text-sm text-gray-500">Base Price: ${product.price.toFixed(2)}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Add New Variation Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaPlus className="w-5 h-5" />
            Add New Variation
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <select
                value={newVariation.color}
                onChange={(e) => setNewVariation(prev => ({ ...prev, color: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                onChange={(e) => setNewVariation(prev => ({ ...prev, size: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Size</option>
                {availableSizes.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
              <input
                type="number"
                min="0"
                value={newVariation.stock}
                onChange={(e) => setNewVariation(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>



            <div className="flex items-end">
              <button
                onClick={handleAddVariation}
                disabled={saving || (!newVariation.color && !newVariation.size)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <FaPlus className="w-4 h-4" />
                    Add Variation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Variations List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <FaBox className="w-6 h-6" />
              Product Variations ({variations.length})
            </h2>
          </div>

          <div className="p-6">
            {variations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FaBox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium">No variations yet</p>
                <p className="text-sm">Add your first variation using the form above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Image
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Color
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Barcodes
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {variations.map((variation) => (
                      <tr key={variation.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap">
                          {toImageSrc(variation.images?.[0]) ? (
                            <Image
                              src={toImageSrc(variation.images?.[0]) || ''}
                              alt={`${variation.sku} cover`}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded object-cover border border-gray-200"
                              unoptimized
                            />
                          ) : (
                            <div className="h-10 w-10 rounded border border-dashed border-gray-300 bg-gray-50" />
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="text-xs font-mono text-gray-900">{variation.sku}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {getAttributeValue(variation, ['color', 'Color'])}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {getAttributeValue(variation, ['size', 'Size'])}
                        </td>
                        <td className="px-3 py-2">
                          <div className="max-w-60 space-y-1">
                            <div className="text-[11px] font-mono text-gray-900 break-all">
                              {getPrimaryBarcode(variation)}
                            </div>
                            {getAlternateBarcodes(variation).length > 0 && (
                              <div className="text-[11px] text-gray-500 break-all">
                                {getAlternateBarcodes(variation).join(', ')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {editingVariation === variation.id ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editValues[variation.id]?.price || variation.price || ''}
                              onChange={(e) => updateEditValue(variation.id, 'price', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder={product.price.toString()}
                            />
                          ) : (
                            <span className="text-sm text-gray-900">Ksh {(variation.price || product.price).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {editingVariation === variation.id ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editValues[variation.id]?.cost || variation.cost || ''}
                              onChange={(e) => updateEditValue(variation.id, 'cost', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder={product.cost.toString()}
                            />
                          ) : (
                            <span className="text-sm text-gray-900">Ksh {(variation.cost || product.cost).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {editingVariation === variation.id ? (
                            <input
                              type="number"
                              min="0"
                              value={editValues[variation.id]?.stock || variation.stock}
                              onChange={(e) => updateEditValue(variation.id, 'stock', parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ) : (
                            <span className="text-sm text-gray-900">{variation.stock}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right">
                          <div className="flex items-center gap-2">
                            {editingVariation === variation.id ? (
                              <>
                                <button
                                  onClick={() => saveEditing(variation.id)}
                                  className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Save changes"
                                >
                                  <FaSave className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                                  title="Cancel editing"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditing(variation)}
                                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit variation"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteVariation(variation.id)}
                                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete variation"
                                >
                                  <FaTrash className="w-4 h-4" />
                                </button>
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
          </div>
        </div>

        {/* Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FaBox className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Variations</p>
                <p className="text-2xl font-bold text-gray-900">{variations.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <FaPalette className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Unique Colors</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(variations.map(v => v.attributes.color)).size}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FaRuler className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Unique Sizes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(variations.map(v => v.attributes.size)).size}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
