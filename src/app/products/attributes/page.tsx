'use client';

import React from 'react';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import AuthGuard from '@/components/AuthGuard';
import ProductAttributesManager from '@/components/products/ProductAttributesManager';

export default function ProductAttributesPage() {
  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/products"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Product Attributes</h1>
            <p className="text-gray-600">
              Manage product attributes like Color, Size, Storage, etc. These are used to create product variations.
            </p>
          </div>
        </div>

        <ProductAttributesManager />
      </div>
    </AuthGuard>
  );
}















