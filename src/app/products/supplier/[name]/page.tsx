'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft, FaBox, FaPalette, FaRuler, FaStore } from 'react-icons/fa';
import { apiGet } from '@/utils/api';
import AuthGuard from '@/components/AuthGuard';
import { useBranch } from '@/contexts/BranchContext';

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
  variationsCount?: number;
  totalStock?: number;
  priceRange?: { min: number; max: number };
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

export default function SupplierProductsPage() {
  const params = useParams();
  const { selectedBranchId } = useBranch();
  const supplierName = decodeURIComponent(params?.name as string);

  const [products, setProducts] = useState<Product[]>([]);
  const [variations, setVariations] = useState<Record<string, ProductVariation[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Inline function to avoid missing dependency warning
    const fetchAll = async () => {
      try {
        setLoading(true);

        // Fetch all products for the branch
        const allProducts = await apiGet(`/products`, { 'x-branch-id': selectedBranchId || '' });

        // Filter products by supplier name
        const supplierProducts = (Array.isArray(allProducts) ? allProducts : []).filter(
          (product: Product) => product.supplier?.name === supplierName
        );

        setProducts(supplierProducts);

        // Fetch variations for each product
        const variationsData: Record<string, ProductVariation[]> = {};
        await Promise.all(
          supplierProducts.map(async (product: Product) => {
            try {
              const productVariations = await apiGet(`/products/${product.id}/variations`, { 'x-branch-id': selectedBranchId || '' });
              variationsData[product.id] = Array.isArray(productVariations) ? productVariations : [];
            } catch {
              variationsData[product.id] = [];
            }
          })
        );

        setVariations(variationsData);

      } catch (err: unknown) {
        setError((err as { message?: string })?.message || 'Failed to load supplier products');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [supplierName, selectedBranchId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <FaBox className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Products</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/products/unified"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaArrowLeft className="w-4 h-4" />
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const totalProducts = products.length;
  const totalVariations = Object.values(variations).reduce((sum, vars) => sum + vars.length, 0);
  const totalStock = Object.values(variations).reduce((sum, vars) =>
    sum + vars.reduce((varSum, v) => varSum + v.stock, 0), 0
  );

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
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FaStore className="w-8 h-8 text-blue-600" />
                {supplierName} Products
              </h1>
              <p className="text-gray-600">All products and variations from {supplierName}</p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FaBox className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <FaPalette className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Variations</p>
                <p className="text-2xl font-bold text-gray-900">{totalVariations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FaRuler className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Stock</p>
                <p className="text-2xl font-bold text-gray-900">{totalStock}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <FaStore className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Supplier</p>
                <p className="text-lg font-bold text-gray-900">{supplierName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Products List */}
        {products.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <FaBox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
            <p className="text-gray-500 mb-4">No products found for supplier {supplierName}.</p>
            <Link
              href="/products/unified"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaArrowLeft className="w-4 h-4" />
              Back to Products
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Product Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-white">{product.name}</h3>
                      <p className="text-blue-100">SKU: {product.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-blue-100">Base Selling Price</p>
                      <p className="text-lg font-bold text-white">${product.price.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Product Variations */}
                <div className="p-6">
                  {variations[product.id]?.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FaBox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium">No Variations</p>
                      <p className="text-sm">This product has no variations.</p>
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
                              Selling Price
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Buying Price
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {variations[product.id]?.map((variation) => (
                            <tr key={variation.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-wrap gap-2">
                                  {Object.entries(variation.attributes).map(([key, value]) => (
                                    <div key={key} className="flex items-center gap-1">
                                      {key === 'color' && (
                                        <div
                                          className="w-3 h-3 rounded-full border border-gray-300"
                                          style={{
                                            backgroundColor: value.toLowerCase() === 'white' ? '#f8f9fa' :
                                                             value.toLowerCase() === 'black' ? '#000000' :
                                                             value.toLowerCase()
                                          }}
                                        />
                                      )}
                                      <span className="text-xs text-gray-600">{key}:</span>
                                      <span className="text-sm font-medium text-gray-900">{value}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-mono text-gray-900">{variation.sku}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-900">{variation.stock}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-900">${(variation.price || product.price).toFixed(2)}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-900">${(variation.cost || product.cost).toFixed(2)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
