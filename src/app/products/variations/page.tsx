"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FaArrowLeft, FaPlus, FaBox, FaPalette, FaRuler, FaEdit, FaTrash, FaTimes, FaLayerGroup } from 'react-icons/fa';
import { apiGet, apiPost, apiDelete } from '@/utils/api';
import AuthGuard from '@/components/AuthGuard';
import { useBranch } from '@/contexts/BranchContext';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  description?: string;
  category?: {
    id: string;
    name: string;
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

export default function ProductVariationsPage() {
  const { selectedBranchId } = useBranch();
  const { user } = useUser();
  const [products, setProducts] = useState<Product[]>([]);
  const [variations, setVariations] = useState<Record<string, ProductVariation[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showVariationForm, setShowVariationForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Variation form state
  const [variationColor, setVariationColor] = useState('');
  const [variationSize, setVariationSize] = useState('');
  const [variationStock, setVariationStock] = useState('');
  const [variationPrice, setVariationPrice] = useState('');
  const [variationCost, setVariationCost] = useState('');

  // Available colors and sizes
  const availableColors = [
    'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Pink', 'Gray', 'Brown', 'Navy', 'Maroon'
  ];

  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

  // Permission checks
  const canEditProducts = hasPermission(user, 'edit_products');
  const canDeleteProducts = hasPermission(user, 'delete_products');

  useEffect(() => {
    // Inline to avoid dependency warning
    const loadProductsAndVariations = async () => {
      try {
        setLoading(true);
        setError('');

        // Load products
        const productsData = await apiGet<Product[]>('/products', { 'x-branch-id': selectedBranchId || '' });
        setProducts(productsData || []);

        // Load variations for each product
        const variationsMap: Record<string, ProductVariation[]> = {};
        for (const product of productsData || []) {
          try {
            const productVariations = await apiGet<ProductVariation[]>(`/products/${product.id}/variations`, { 'x-branch-id': selectedBranchId || '' });
            variationsMap[product.id] = productVariations || [];
          } catch (err) {
            console.error(`Failed to load variations for product ${product.id}:`, err);
            variationsMap[product.id] = [];
          }
        }
        setVariations(variationsMap);
      } catch (err: unknown) {
        setError((err as { message?: string })?.message || 'Failed to load products and variations');
      } finally {
        setLoading(false);
      }
    };
    loadProductsAndVariations();
  }, [selectedBranchId]);

  const resetVariationForm = () => {
    setVariationColor('');
    setVariationSize('');
    setVariationStock('');
    setVariationPrice('');
    setVariationCost('');
    setSelectedProduct(null);
    setShowVariationForm(false);
  };

  const handleAddVariation = (product: Product) => {
    setSelectedProduct(product);
    setShowVariationForm(true);
  };

  const handleSaveVariation = async () => {
    if (!selectedProduct || !variationStock || isNaN(Number(variationStock))) {
      setError('Please fill in all required fields.');
      return;
    }

    const attributes: Record<string, string> = {};
    if (variationColor) attributes.color = variationColor;
    if (variationSize) attributes.size = variationSize;

    if (Object.keys(attributes).length === 0) {
      setError('Please select at least a color or size.');
      return;
    }

    // Check if this combination already exists
    const existingVariations = variations[selectedProduct.id] || [];
    const exists = existingVariations.some(v =>
      JSON.stringify(v.attributes) === JSON.stringify(attributes)
    );

    if (exists) {
      setError('This color/size combination already exists for this product.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      // Generate SKU
      const skuSuffix = Object.values(attributes).join('-').toLowerCase().replace(/\s+/g, '-');
      const variationSku = `${selectedProduct.sku}-${skuSuffix}`;

      const variationData = {
        productId: selectedProduct.id,
        sku: variationSku,
        price: variationPrice ? Number(variationPrice) : undefined,
        cost: variationCost ? Number(variationCost) : undefined,
        stock: Number(variationStock),
        attributes,
        isActive: true,
      };

      const newVariation = await apiPost<ProductVariation>(`/products/${selectedProduct.id}/variations`, variationData, { 'x-branch-id': selectedBranchId || '' });

      // Update local state
      setVariations(prev => ({
        ...prev,
        [selectedProduct.id]: [...(prev[selectedProduct.id] || []), newVariation]
      }));

      resetVariationForm();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to add variation');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVariation = async (productId: string, variationId: string) => {
    if (!confirm('Are you sure you want to delete this variation?')) return;

    try {
      await apiDelete(`/products/${productId}/variations/${variationId}`, { 'x-branch-id': selectedBranchId || '' });

      // Update local state
      setVariations(prev => ({
        ...prev,
        [productId]: prev[productId].filter(v => v.id !== variationId)
      }));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to delete variation');
    }
  };

  const getTotalVariations = (productId: string) => {
    return variations[productId]?.length || 0;
  };

  const getTotalStock = (productId: string) => {
    return variations[productId]?.reduce((sum, v) => sum + v.stock, 0) || 0;
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/products/unified"
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Product Variations</h1>
              <p className="text-gray-600">Manage variations for all your products</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Products List */}
        <div className="space-y-6">
          {products.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
              <FaBox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
              <p className="text-gray-600 mb-4">Create some products first to add variations.</p>
              <Link
                href="/products/add"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaPlus className="w-4 h-4" />
                Add Product
              </Link>
            </div>
          ) : (
            products.map((product) => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Product Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <FaBox className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{product.name}</h3>
                        <p className="text-gray-600">SKU: {product.sku}</p>
                        {product.category && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                            {product.category.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{getTotalVariations(product.id)}</p>
                        <p className="text-sm text-gray-600">Variations</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{getTotalStock(product.id)}</p>
                        <p className="text-sm text-gray-600">Total Stock</p>
                      </div>

                      {canEditProducts && (
                        <button
                          onClick={() => handleAddVariation(product)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <FaPlus className="w-4 h-4" />
                          Add Variation
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Variations List */}
                <div className="p-6">
                  {variations[product.id]?.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FaLayerGroup className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No variations added yet</p>
                      <p className="text-sm">Click &quot;Add Variation&quot; to create product variations</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Attributes
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              SKU
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Stock
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Price
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Cost
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {variations[product.id]?.map((variation) => (
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
                                <span className={`text-sm ${variation.stock === 0 ? 'text-red-600' : variation.stock < 10 ? 'text-amber-600' : 'text-gray-900'}`}>
                                  {variation.stock}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ${variation.price?.toFixed(2) ?? product.price.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ${variation.cost?.toFixed(2) ?? product.cost.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  variation.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {variation.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {canEditProducts && (
                                    <Link
                                      href={`/products/${product.id}/variations`}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Edit variation"
                                    >
                                      <FaEdit className="w-4 h-4" />
                                    </Link>
                                  )}
                                  {canDeleteProducts && (
                                    <button
                                      onClick={() => handleDeleteVariation(product.id, variation.id)}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Delete variation"
                                    >
                                      <FaTrash className="w-4 h-4" />
                                    </button>
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
            ))
          )}
        </div>

        {/* Add Variation Modal */}
        {showVariationForm && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
              
                <h3 className="text-xl font-bold text-gray-900">Add Variation</h3>
                <button
                  onClick={resetVariationForm}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">{selectedProduct.name}</p>
                <p className="text-xs text-gray-600">SKU: {selectedProduct.sku}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <select
                    value={variationColor}
                    onChange={(e) => setVariationColor(e.target.value)}
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
                    value={variationSize}
                    onChange={(e) => setVariationSize(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    value={variationStock}
                    onChange={(e) => setVariationStock(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={variationPrice}
                    onChange={(e) => setVariationPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`Base: $${selectedProduct.price.toFixed(2)}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buying Price (optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={variationCost}
                    onChange={(e) => setVariationCost(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`Base: $${selectedProduct.cost.toFixed(2)}`}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveVariation}
                  disabled={saving || !variationStock}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaPlus className="w-4 h-4" />
                  Add Variation
                </button>
                <button
                  onClick={resetVariationForm}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
        )}
      </div>
    </AuthGuard>
  );
}
