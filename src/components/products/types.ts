import React from 'react';

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  description?: string;
  category?: string;
  customFields?: Record<string, string | number | boolean>;
  supplier?: {
    id: string;
    name: string;
  };
}

export interface Branch {
  id: string;
  name: string;
}

export interface ProductsPageProps {
  // Form related
  showAddForm: boolean;
  editProduct: Product | null;
  saving: boolean;
  error: string;
  setShowAddForm: (show: boolean) => void;
  setEditProduct: (product: Product | null) => void;
  handleAddProduct: (e: React.FormEvent) => void;
  handleEditProduct: (e: React.FormEvent) => void;

  // Pagination related
  totalPages: number;
  currentPage: number;
  startIndex: number;
  endIndex: number;
  filteredProducts: Product[];
  setCurrentPage: (page: number) => void;

  // Search and filter related
  search: string;
  showFilters: boolean;
  priceMin: string;
  priceMax: string;
  stockMin: string;
  stockMax: string;
  categoryFilter: string;
  products: Product[];
  setSearch: (search: string) => void;
  setShowFilters: (show: boolean) => void;
  setPriceMin: (min: string) => void;
  setPriceMax: (max: string) => void;
  setStockMin: (min: string) => void;
  setStockMax: (max: string) => void;
  setCategoryFilter: (category: string) => void;
  clearMsg: string;
  downloadTemplate: () => void;
  handleClearAll: () => void;

  // Branch related
  selectedBranchId: string | null;
  branches: Branch[];
  branchesLoading: boolean;
  canChangeBranch: boolean;
  handleBranchChange: (branchId: string) => void;

  // View mode related
  viewMode: 'grid' | 'table';
  setViewMode: (mode: 'grid' | 'table') => void;

  // Column visibility related
  showColumnSelector: boolean;
  visibleColumns: string[];
  allColumns: string[];
  setShowColumnSelector: (show: boolean) => void;
  toggleColumnVisibility: (column: string) => void;

  // Product display related
  currentProducts: Product[];
  canEditProducts: boolean;
  canDeleteProducts: boolean;
  canCreateProducts: boolean;
  canCreate: () => boolean;
  openEditModal: (product: Product) => void;
  handleDelete: (productId: string) => void;
  handleSort: (field: string) => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';

  // QR Code related
  qrCodeProductId: string | null;
  setQrCodeProductId: (id: string | null) => void;
}
