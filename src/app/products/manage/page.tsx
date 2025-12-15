'use client';

import React, { useState } from 'react';
import { FaBox, FaPalette, FaLayerGroup } from 'react-icons/fa';
import AuthGuard from '@/components/AuthGuard';
import ProductAttributesManager from '@/components/products/ProductAttributesManager';
import VariationManager from '@/components/products/VariationManager';

type TabType = 'products' | 'attributes' | 'variations';

export default function ProductsManagePage() {
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [selectedProductId] = useState<string | null>(null);

  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Products Management</h1>
          <p className="text-gray-600 mt-2">
            Manage products, attributes, and variations all in one place
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'products'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaBox /> Products
            </button>
            <button
              onClick={() => setActiveTab('attributes')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'attributes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaPalette /> Attributes
            </button>
            <button
              onClick={() => setActiveTab('variations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'variations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaLayerGroup /> Variations
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'products' && (
            <div>
              {/* Redirect to unified products page or embed it here */}
              <p className="text-gray-600">
                Products list - You can use the existing /products/unified page or we can embed it here
              </p>
            </div>
          )}

          {activeTab === 'attributes' && (
            <div>
              <ProductAttributesManager />
            </div>
          )}

          {activeTab === 'variations' && (
            <div>
              {selectedProductId ? (
                <VariationManager
                  productId={selectedProductId}
                  baseSku=""
                  basePrice={0}
                  baseCost={0}
                />
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">
                    Select a product to manage its variations
                  </p>
                  <p className="text-sm text-gray-500">
                    Or go to Products tab, click on a product, then come back here
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
