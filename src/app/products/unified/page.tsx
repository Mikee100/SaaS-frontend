"use client";
/**
 * Unified Products & Inventory Management Page
 * Combines: Products List, Basic Inventory, and Advanced Inventory
 */
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useVirtualizer } from "@tanstack/react-virtual";
import { apiGet, apiPost, apiDelete, apiPut } from "@/utils/api";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useBranches } from '@/hooks/useBranches';
import { getEffectiveTenantManifest } from '@/utils/manifest/manifestClient';
import FeatureGuard from '@/components/FeatureGuard';
import AuthGuard from '@/components/AuthGuard';
import { 
  FaBox, FaSearch, FaTrash, FaTrashRestore, FaEdit, FaQrcode, FaPlus, FaExclamationTriangle, 
  FaCheckCircle, FaTimesCircle, FaArrowUp, FaArrowDown, FaHistory, FaBell, 
  FaChartLine, FaMapMarkerAlt, FaCalculator, FaCog, FaDownload, FaWarehouse,
  FaStore, FaClipboardList, FaSortAmountDown, FaPrint, FaTimes, FaChevronRight,
  FaLayerGroup, FaSync, FaPalette
} from 'react-icons/fa';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import { useTenant } from '@/hooks/useTenant';
import {
  createPlatformEntity,
  getPlatformEntityWorkflow,
  PlatformEntityType,
} from '@/utils/platform/entitiesClient';
import { useBranch } from "@/contexts/BranchContext";
import Image from 'next/image';
import API_BASE_URL from '../../../config/apiConfig';

// Lazy-load heavier product management modules used only in specific tabs
const ProductAttributesManager = dynamic(
  () => import('@/components/products/ProductAttributesManager'),
  { ssr: false }
);

const VariationManager = dynamic(
  () => import('@/components/products/VariationManager'),
  { ssr: false }
);

// Types
interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  hasVariations?: boolean;
  variations?: ProductVariation[];
  description?: string;
  category?: string;
  unitAbbreviation?: string;
  customFields?: Record<string, string | number | boolean>;
  supplier?: {
    id: string;
    name: string;
  };
  images?: string[];
}

interface ProductVariation {
  id: string;
  sku: string;
  price?: number;
  cost?: number;
  stock: number;
  images?: string[];
  attributes?: Record<string, string>;
}

interface ProductListRow {
  id: string;
  sourceType: 'product' | 'variation';
  productId: string;
  variationId?: string;
  name: string;
  parentName?: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  category?: string;
  description?: string;
  attributeSummary?: string;
  imageUrl?: string;
  imageUrls?: string[];
}

interface InventoryItem {
  id: string;
  productId?: string;
  product: { id: string; name: string; sku?: string; price?: number; cost?: number; category?: string };
  quantity: number;
  minStock?: number;
  maxStock?: number;
  reorderPoint?: number;
  location?: string;
  lastUpdated?: string;
  updatedAt?: string;
  branchId?: string;
}

interface ProductVariationStock {
  id: string;
  stock: number;
}

interface StockMovement {
  id: string;
  productId: string;
  product: Product;
  type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  location: string;
  createdAt: string;
  createdBy: string;
  branchId: string;
}

interface InventoryAlert {
  id: string;
  productId: string;
  product: Product;
  type: 'low_stock' | 'out_of_stock' | 'over_stock' | 'reorder';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  createdAt: string;
  branchId: string;
}

interface Location {
  id: string;
  name: string;
  type: 'warehouse' | 'store' | 'showroom';
  address?: string;
  branchId: string;
}

interface ForecastData {
  productId: string;
  product: Product;
  currentStock: number;
  averageDailySales: number;
  daysUntilStockout: number;
  recommendedOrder: number;
  confidence: number;
}

interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

const RESTAURANT_MENU_CATEGORIES = [
  'Meals',
  'Desserts',
  'Beer',
  'Wines',
  'Spirits',
  'Cocktails',
  'Sodas',
  'Water & Juices',
  'Hot Drinks',
  'Bar Snacks',
];

type TabType = 'products' | 'inventory' | 'advanced' | 'attributes' | 'variations';
type AdvancedSubTab = 'overview' | 'movements' | 'alerts' | 'forecasting' | 'locations';
type ProductBusinessFlow = 'restaurant' | 'fashion' | 'spa';

interface UnifiedProductsDisplayConfig {
  version: 'v1';
  global: {
    showWorkflowPanel: boolean;
    showDescription: boolean;
    showImages: boolean;
    showCategory: boolean;
  };
  restaurant: {
    showAllergens: boolean;
    showPrepStation: boolean;
    showTaxClass: boolean;
  };
  fashion: {
    showBrand: boolean;
    showSeason: boolean;
    showSupplier: boolean;
    enableVariationTypeSelector: boolean;
  };
  spa: {
    showDurationMinutes: boolean;
    showStaffSkillLevel: boolean;
    showCommissionProfile: boolean;
    showConsumables: boolean;
  };
}

interface TenantUnifiedProductsDisplayResponse {
  key: string;
  businessType: 'fashion' | 'restaurant' | 'spa_barber';
  config: UnifiedProductsDisplayConfig;
}

const DEFAULT_UNIFIED_PRODUCTS_DISPLAY_CONFIG: UnifiedProductsDisplayConfig = {
  version: 'v1',
  global: {
    showWorkflowPanel: true,
    showDescription: true,
    showImages: true,
    showCategory: true,
  },
  restaurant: {
    showAllergens: true,
    showPrepStation: true,
    showTaxClass: true,
  },
  fashion: {
    showBrand: true,
    showSeason: true,
    showSupplier: true,
    enableVariationTypeSelector: true,
  },
  spa: {
    showDurationMinutes: true,
    showStaffSkillLevel: true,
    showCommissionProfile: true,
    showConsumables: true,
  },
};

export default function UnifiedProductsInventoryPage() {
  // Fetch tenant info (includes classificationId)
  const { data: tenant, isLoading: tenantLoading } = useTenant();
  // State for classification units
  const [classificationUnits, setClassificationUnits] = useState<any[]>([]);
  const [classificationMeta, setClassificationMeta] = useState<{ slug?: string; name?: string } | null>(null);

  // Fetch classification units when tenant changes
  useEffect(() => {
    async function fetchUnits() {
      if (tenant?.classificationId) {
        try {
          const classification = (await apiGet(`/admin/classifications/${tenant.classificationId}`)) as {
            units?: any[];
            slug?: string;
            name?: string;
          };
          setClassificationUnits(classification.units || []);
          setClassificationMeta({ slug: classification.slug, name: classification.name });
        } catch (e) {
          setClassificationUnits([]);
          setClassificationMeta(null);
        }
      } else {
        setClassificationUnits([]);
        setClassificationMeta(null);
      }
    }
    fetchUnits();
  }, [tenant?.classificationId]);
  const { user } = useUser();
  const { selectedBranchId, setSelectedBranchId } = useBranch();
  const queryClient = useQueryClient();
  const { data: limits } = usePlanLimits();
  
  // Use React Query hooks for data fetching
  const { data: branchesData = [], isLoading: branchesLoading } = useBranches();
  const branches = (Array.isArray(branchesData) ? branchesData : []).map((b: { id: string; name: string }) => ({ id: b.id, name: b.name }));

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [advancedSubTab, setAdvancedSubTab] = useState<AdvancedSubTab>('overview');

  // Common states
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Products tab states
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [qrCodeProductId, setQrCodeProductId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showUsageBanner, setShowUsageBanner] = useState(true);
  const [showDeletedProducts, setShowDeletedProducts] = useState(false);
  const [productType, setProductType] = useState<'simple' | 'withVariations'>('simple');
  const [redirectToVariations, setRedirectToVariations] = useState(false);
  const [productCategoryInput, setProductCategoryInput] = useState('');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [productImageFiles, setProductImageFiles] = useState<File[]>([]);
  const [productImagePreviewUrls, setProductImagePreviewUrls] = useState<string[]>([]);
  const [existingProductImages, setExistingProductImages] = useState<string[]>([]);
  const [imageActionLoading, setImageActionLoading] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Inventory tab states
  const [stockFilter, setStockFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showStockModal, setShowStockModal] = useState(false);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [modalQuantity, setModalQuantity] = useState(0);
  const [modalProductFields, setModalProductFields] = useState<Record<string, any>>({});
  const [modalError, setModalError] = useState("");

  // Advanced tab states
  const [locationFilter, setLocationFilter] = useState("all");
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  
  // Restore selected product from localStorage on mount
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedProductId');
    }
    return null;
  });
  
  // Restore active tab from localStorage (only on mount)
  const hasRestoredTab = useRef(false);
  useEffect(() => {
    if (hasRestoredTab.current || typeof window === 'undefined') return;
    hasRestoredTab.current = true;
    
    const savedTab = localStorage.getItem('productsActiveTab') as TabType;
    if (savedTab && ['products', 'inventory', 'advanced', 'attributes', 'variations'].includes(savedTab)) {
      setActiveTab(savedTab);
    }
  }, [setActiveTab]);
  
  // Save active tab to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('productsActiveTab', activeTab);
    }
  }, [activeTab]);
  
  // Fetch selected product if not in current products list
  const { data: selectedProductData } = useQuery({
    queryKey: ['product', selectedProductId, selectedBranchId],
    queryFn: async () => {
      if (!selectedProductId || !selectedBranchId) return null;
      try {
        const product = await apiGet(`/products/${selectedProductId}`, { 'x-branch-id': selectedBranchId });
        return product as Product;
      } catch (err) {
        console.error('Failed to fetch selected product:', err);
        // Clear invalid product ID from storage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedProductId');
        }
        setSelectedProductId(null);
        return null;
      }
    },
    enabled: !!selectedProductId && !!selectedBranchId && !selectedProduct,
    staleTime: 5 * 60 * 1000,
  });

  // Restore selected product when products are loaded or when fetched
  useEffect(() => {
    if (!selectedProductId || selectedProduct) return;
    
    // First try to find in current products list
    const product = products.find(p => p.id === selectedProductId);
    if (product) {
      setSelectedProduct(product);
      return;
    }
    
    // If not found in list and we have fetched data, use it
    if (selectedProductData) {
      setSelectedProduct(selectedProductData);
    }
  }, [selectedProductId, products, selectedProduct, selectedProductData]);
  
  // Update localStorage when selectedProduct changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (selectedProduct) {
      const productId = selectedProduct.id;
      localStorage.setItem('selectedProductId', productId);
      // Only update selectedProductId if it's different to avoid loops
      if (selectedProductId !== productId) {
        setSelectedProductId(productId);
      }
    } else {
      localStorage.removeItem('selectedProductId');
      if (selectedProductId !== null) {
        setSelectedProductId(null);
      }
    }
  }, [selectedProduct, selectedProductId]);
  const [movementForm, setMovementForm] = useState({
    type: 'in' as 'in' | 'out' | 'adjustment' | 'transfer',
    quantity: 0,
    reason: '',
    location: '',
    destinationLocation: ''
  });
  const [locationForm, setLocationForm] = useState({
    name: '',
    type: 'warehouse' as 'warehouse' | 'store' | 'showroom',
    address: ''
  });
  const [alertSettings, setAlertSettings] = useState({
    lowStockThreshold: 10,
    criticalStockThreshold: 5,
    enableEmailAlerts: true,
    enablePushAlerts: true
  });

  const { data: deletedProducts = [], refetch: refetchDeleted } = useQuery({
    queryKey: ['products', 'deleted', selectedBranchId],
    queryFn: () => apiGet(
      `/products/deleted${selectedBranchId ? `?branchId=${selectedBranchId}` : ''}`,
      selectedBranchId ? { 'x-branch-id': selectedBranchId } : undefined
    ) as Promise<Array<{ id: string; name: string; sku: string; price: number; deletedAt: string }>>,
    enabled: showDeletedProducts && !!selectedBranchId,
  });

  async function handleRestoreProduct(id: string) {
    try {
      await apiPost(`/products/${id}/restore`, {}, { 'x-branch-id': selectedBranchId || '' });
      queryClient.invalidateQueries({ queryKey: ['products', selectedBranchId] });
      refetchDeleted();
    } catch (err) {
      console.error('Restore failed:', err);
      alert('Failed to restore product');
    }
  }

  // Permission checks
  const canViewProducts = hasPermission(user, 'view_products');
  const canCreateProducts = hasPermission(user, 'create_products');
  const canEditProducts = hasPermission(user, 'edit_products');
  const canDeleteProducts = hasPermission(user, 'delete_products');
  const canViewInventory = hasPermission(user, 'view_inventory');
  const canEditInventory = hasPermission(user, 'edit_inventory');

  useEffect(() => {
    return () => {
      productImagePreviewUrls.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [productImagePreviewUrls]);

  const resolveProductImageUrl = useCallback((imagePath?: string | null) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
    const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `${API_BASE_URL}${normalizedPath}`;
  }, []);

  const getPrimaryProductImage = useCallback((product?: Product | null) => {
    const firstImagePath = Array.isArray(product?.images) ? product?.images?.[0] : undefined;
    return resolveProductImageUrl(firstImagePath || null);
  }, [resolveProductImageUrl]);

  const uploadProductImages = useCallback(async (productId: string, files: File[]) => {
    if (files.length === 0) return;

    const payload = new FormData();
    files.forEach((file) => payload.append('images', file));

    const response = await fetch(`${API_BASE_URL}/products/upload-images/${productId}`, {
      method: 'POST',
      credentials: 'include',
      headers: selectedBranchId ? { 'x-branch-id': selectedBranchId } : undefined,
      body: payload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let message = 'Failed to upload product images';
      try {
        const parsed = JSON.parse(errorText) as { message?: string | string[] };
        if (Array.isArray(parsed.message)) {
          message = parsed.message.join(', ');
        } else if (parsed.message) {
          message = parsed.message;
        }
      } catch {
        if (errorText) {
          message = errorText;
        }
      }
      throw new Error(message);
    }
  }, [selectedBranchId]);

  const deleteProductImage = useCallback(async (productId: string, imageUrl: string) => {
    const response = await fetch(`${API_BASE_URL}/products/delete-image/${productId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(selectedBranchId ? { 'x-branch-id': selectedBranchId } : {}),
      },
      body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to delete product image');
    }
  }, [selectedBranchId]);

  const reorderProductImageAsPrimary = useCallback(async (productId: string, imageUrl: string, currentImages: string[]) => {
    const reordered = [imageUrl, ...currentImages.filter((item) => item !== imageUrl)];
    await apiPut(`/products/${productId}`, { images: reordered }, { 'x-branch-id': selectedBranchId || '' });
    return reordered;
  }, [selectedBranchId]);

  const openImageLightbox = useCallback((images: string[], startIndex = 0) => {
    if (!images.length) return;
    setLightboxImages(images);
    setLightboxIndex(startIndex);
  }, []);

  // Helper: can create product
  const canCreate = () => {
    if (!limits || !limits.usage?.products) return false;
    return limits.usage.products.current < limits.usage.products.limit;
  };

  // Helper: get usage percentage
  const getUsagePercentage = () => {
    if (!limits || !limits.usage?.products) return 0;
    return Math.round((limits.usage.products.current / limits.usage.products.limit) * 100);
  };

  // Auto-select first branch
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      if (user?.branchId) {
        setSelectedBranchId(user.branchId);
      } else {
        setSelectedBranchId(branches[0].id);
      }
    }
  }, [branches, selectedBranchId, setSelectedBranchId, user?.branchId]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch products
  const { data: productsData, isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ['products', selectedBranchId, currentPage, itemsPerPage, debouncedSearch],
    queryFn: async () => {
      if (!selectedBranchId) return { products: [], pagination: null };
      const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : '';
      const data = await apiGet(`/products?page=${currentPage}&limit=${itemsPerPage}&branchId=${selectedBranchId}&includeVariations=true${searchParam}`, { 'x-branch-id': selectedBranchId }) as { products: Product[]; pagination: { total: number; page: number; limit: number; pageCount: number } };
      return data;
    },
    enabled: !!selectedBranchId && activeTab === 'products',
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  // Fetch inventory (for inventory and advanced tabs)
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const headers = { 'x-branch-id': selectedBranchId };
      const data = await apiGet("/inventory", headers);
      return Array.isArray(data) ? data as InventoryItem[] : [];
    },
    enabled: !!selectedBranchId && (activeTab === 'inventory' || activeTab === 'advanced'),
    staleTime: 1 * 60 * 1000,
    gcTime: 3 * 60 * 1000,
  });

  // Fetch advanced inventory data
  const { data: advancedInventoryData = [], isLoading: advancedInventoryLoading } = useQuery({
    queryKey: ['inventory', 'advanced', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const headers = { 'x-branch-id': selectedBranchId };
      const data = await apiGet('/inventory/advanced', headers);
      return Array.isArray(data) ? data as InventoryItem[] : [];
    },
    enabled: !!selectedBranchId && activeTab === 'advanced',
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: stockMovements = [] } = useQuery({
    queryKey: ['inventory', 'movements', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const headers = { 'x-branch-id': selectedBranchId };
      const data = await apiGet('/inventory/movements', headers);
      return Array.isArray(data) ? data as StockMovement[] : [];
    },
    enabled: !!selectedBranchId && activeTab === 'advanced' && advancedSubTab === 'movements',
    staleTime: 1 * 60 * 1000,
    gcTime: 3 * 60 * 1000,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['inventory', 'alerts', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const headers = { 'x-branch-id': selectedBranchId };
      const data = await apiGet('/inventory/alerts', headers);
      return Array.isArray(data) ? data as InventoryAlert[] : [];
    },
    enabled: !!selectedBranchId && activeTab === 'advanced' && advancedSubTab === 'alerts',
    staleTime: 1 * 60 * 1000,
    gcTime: 3 * 60 * 1000,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['inventory', 'locations', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const headers = { 'x-branch-id': selectedBranchId };
      const data = await apiGet('/inventory/locations', headers);
      return Array.isArray(data) ? data as Location[] : [];
    },
    enabled: !!selectedBranchId && activeTab === 'advanced',
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: forecastData = [] } = useQuery({
    queryKey: ['inventory', 'forecast', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const headers = { 'x-branch-id': selectedBranchId };
      const data = await apiGet('/inventory/forecast', headers);
      return Array.isArray(data) ? data as ForecastData[] : [];
    },
    enabled: !!selectedBranchId && activeTab === 'advanced' && advancedSubTab === 'forecasting',
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Lightweight setup progress: check whether attributes exist.
  const { data: attributesSetupData = [] } = useQuery({
    queryKey: ['product-attributes', 'setup-progress'],
    queryFn: async () => {
      const data = await apiGet('/product-attributes?includeValues=true');
      return Array.isArray(data) ? data : [];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Fetch products for variations tab (simplified, all products)
  const { data: variationsProductsData } = useQuery({
    queryKey: ['products', 'variations', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const data = await apiGet(`/products?page=1&limit=1000&branchId=${selectedBranchId}`, { 'x-branch-id': selectedBranchId }) as { products: Product[]; pagination: unknown };
      return Array.isArray(data?.products) ? data.products : [];
    },
    enabled: !!selectedBranchId && (activeTab === 'variations'),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Fetch all products for inventory tab
  const { data: inventoryProductsData } = useQuery({
    queryKey: ['products', 'inventory', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const data = await apiGet(`/products?page=1&limit=1000&branchId=${selectedBranchId}`, { 'x-branch-id': selectedBranchId }) as { products: Product[]; pagination: unknown };
      return Array.isArray(data?.products) ? data.products : [];
    },
    enabled: !!selectedBranchId && (activeTab === 'inventory'),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Fetch all products for advanced tab
  const { data: advancedProductsData } = useQuery({
    queryKey: ['products', 'advanced', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const data = await apiGet(`/products?page=1&limit=1000&branchId=${selectedBranchId}`, { 'x-branch-id': selectedBranchId }) as { products: Product[]; pagination: unknown };
      return Array.isArray(data?.products) ? data.products : [];
    },
    enabled: !!selectedBranchId && (activeTab === 'advanced'),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Aggregate variation stock for products that look out-of-stock at parent level.
  const { data: variationStockMap = {} } = useQuery({
    queryKey: ['products', 'variation-stock-map', selectedBranchId, activeTab, (inventoryProductsData?.length || 0), (advancedProductsData?.length || 0), (inventoryData?.length || 0), (advancedInventoryData?.length || 0)],
    queryFn: async () => {
      const productsForTab = activeTab === 'advanced'
        ? (advancedProductsData || [])
        : (inventoryProductsData || []);

      if (!selectedBranchId || productsForTab.length === 0) return {} as Record<string, number>;

      const baseInventory = activeTab === 'advanced' ? (advancedInventoryData || []) : (inventoryData || []);
      const invMap = new Map(baseInventory.map(item => [item.productId || item.product?.id, item]));

      const candidateProductIds = productsForTab
        .filter((product) => {
          const item = invMap.get(product.id);
          const baseQty = item?.quantity ?? product.stock ?? 0;
          return baseQty === 0;
        })
        .map((product) => product.id);

      if (candidateProductIds.length === 0) return {} as Record<string, number>;

      const variationResults = await Promise.allSettled(
        candidateProductIds.map(async (productId) => {
          const vars = await apiGet(`/products/${productId}/variations`, { 'x-branch-id': selectedBranchId }) as ProductVariationStock[];
          const totalStock = Array.isArray(vars)
            ? vars.reduce((sum, variation) => sum + (Number(variation?.stock) || 0), 0)
            : 0;
          return { productId, totalStock };
        })
      );

      const map: Record<string, number> = {};
      variationResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          map[result.value.productId] = result.value.totalStock;
        }
      });

      return map;
    },
    enabled: !!selectedBranchId && (activeTab === 'inventory' || activeTab === 'advanced'),
    staleTime: 60 * 1000,
    gcTime: 3 * 60 * 1000,
  });

  // Update products state
  useEffect(() => {
    if (productsData && activeTab === 'products') {
      setProducts(productsData.products || []);
      const pagination = productsData.pagination;
      if (pagination) {
        setHasMore(pagination.page < pagination.pageCount);
      } else {
        setHasMore((productsData.products || []).length === itemsPerPage);
      }
    }
  }, [productsData, itemsPerPage, activeTab]);

  // Reset to page 1 when branch or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBranchId, debouncedSearch]);

  // Update loading and error states
  useEffect(() => {
    if (productsError) {
      const error = productsError instanceof Error ? productsError : new Error('Failed to fetch products');
      setError(error.message);
    } else if (!productsError && productsData) {
      setError('');
    }
  }, [productsLoading, productsError, productsData]);

  // Get inventory for a product
  const getInv = useCallback((productId: string) => {
    const inventory = activeTab === 'advanced' ? (advancedInventoryData || []) : (inventoryData || []);
    return inventory.find(i => (i.productId || i.product?.id) === productId);
  }, [activeTab, inventoryData, advancedInventoryData]);

  // Get unique categories
  const categories = useMemo(() => {
    if (activeTab === 'products') {
      return [...new Set(products.map(p => p.category).filter(Boolean))];
    }
    const inv = activeTab === 'advanced' ? (advancedInventoryData || []) : (inventoryData || []);
    return [...new Set(inv.map(i => i.product?.category).filter(Boolean))];
  }, [activeTab, products, inventoryData, advancedInventoryData]);

  // Filtered products for inventory tab - merge products with inventory entries
  const filteredInventoryProducts = useMemo(() => {
    if (activeTab !== 'inventory') return [];
    
    // Use products from inventoryProductsData when on inventory tab, otherwise fallback to products state
    const productsForInventory = (activeTab === 'inventory' && inventoryProductsData) 
      ? inventoryProductsData 
      : products;
    
    // Get all inventory items with products
    const inv = inventoryData || [];
    const inventoryMap = new Map(inv.map(item => [item.productId || item.product?.id, item]));
    
    // Merge products with their inventory entries (or create synthetic entries for products without inventory)
    const allInventoryItems = productsForInventory.map(product => {
      const existingInv = inventoryMap.get(product.id);
      const variationQty = variationStockMap[product.id] || 0;
      const effectiveQty = variationQty > 0
        ? variationQty
        : (existingInv?.quantity ?? product.stock ?? 0);
      if (existingInv) {
        return { ...existingInv, quantity: effectiveQty };
      }
      // Create synthetic inventory item for product without inventory entry
      return {
        id: `synth_${product.id}`,
        productId: product.id,
        quantity: effectiveQty,
        product: product,
        location: "Main Warehouse",
        minStock: 0,
        maxStock: 1000,
        reorderPoint: 10,
      } as any;
    });
    
    return allInventoryItems.filter(item => {
      const product = item.product;
      if (!product) return false;
      
      const matchesSearch = product.name?.toLowerCase().includes(search.toLowerCase()) || 
                           product.sku?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
      
      const qty = item.quantity || 0;
      if (stockFilter === "in") return matchesSearch && matchesCategory && qty > 0;
      if (stockFilter === "out") return matchesSearch && matchesCategory && qty === 0;
      if (stockFilter === "low") return matchesSearch && matchesCategory && qty > 0 && qty <= 5;
      return matchesSearch && matchesCategory;
    });
  }, [activeTab, inventoryData, inventoryProductsData, products, search, stockFilter, categoryFilter, variationStockMap]);

  // Calculate statistics for inventory tab - use all merged products
  const inventoryStats = useMemo(() => {
    if (activeTab !== 'inventory' && activeTab !== 'advanced') return null;
    
    // For inventory tab, use all products (with or without inventory entries)
    let inv: any[] = [];
    if (activeTab === 'inventory') {
      const productsForInventory = inventoryProductsData || products;
      const invMap = new Map((inventoryData || []).map(item => [item.productId || item.product?.id, item]));
      inv = productsForInventory.map(product => {
        const existingInv = invMap.get(product.id);
        const variationQty = variationStockMap[product.id] || 0;
        const effectiveQty = variationQty > 0
          ? variationQty
          : (existingInv?.quantity ?? product.stock ?? 0);
        if (existingInv) return { ...existingInv, quantity: effectiveQty };
        return {
          id: `synth_${product.id}`,
          productId: product.id,
          quantity: effectiveQty,
          product: product,
        };
      });
    } else {
      inv = advancedInventoryData || [];
    }
    
    return {
      totalProducts: inv.length,
      inStock: inv.filter(i => (i.quantity || 0) > 0).length,
      outOfStock: inv.filter(i => (i.quantity || 0) === 0).length,
      lowStock: inv.filter(i => (i.quantity || 0) > 0 && (i.quantity || 0) <= 5).length,
      totalValue: inv.reduce((sum, i) => sum + ((i.quantity || 0) * (i.product?.price || 0)), 0),
      totalCostValue: inv.reduce((sum, i) => sum + ((i.quantity || 0) * (i.product?.cost || 0)), 0),
      totalProfit: inv.reduce((sum, i) => {
        const qty = i.quantity || 0;
        const price = i.product?.price || 0;
        const cost = i.product?.cost || 0;
        return sum + (qty * (price - cost));
      }, 0),
    };
  }, [activeTab, inventoryData, advancedInventoryData, inventoryProductsData, products, variationStockMap]);

  // Advanced inventory stats
  const advancedStats = useMemo(() => {
    if (activeTab !== 'advanced') return null;
    return {
      totalProducts: advancedInventoryData.length,
      totalStock: advancedInventoryData.reduce((sum, item) => sum + item.quantity, 0),
      totalValue: advancedInventoryData.reduce((sum, item) => sum + (item.quantity * (item.product?.price || 0)), 0),
      lowStockItems: advancedInventoryData.filter(item => item.quantity <= (item.reorderPoint || 0)).length,
      outOfStockItems: advancedInventoryData.filter(item => item.quantity === 0).length,
      overStockItems: advancedInventoryData.filter(item => item.quantity > (item.maxStock || 0)).length,
      activeAlerts: alerts.filter(alert => !alert.isRead).length,
      totalLocations: locations.length
    };
  }, [activeTab, advancedInventoryData, alerts, locations]);

  // Filtered advanced inventory - merge products with advanced inventory entries
  const filteredAdvancedInventory = useMemo(() => {
    if (activeTab !== 'advanced') return [];
    
    // Use products from advancedProductsData when on advanced tab, otherwise fallback to products state
    const productsForAdvanced = (activeTab === 'advanced' && advancedProductsData) 
      ? advancedProductsData 
      : products;
    
    // Get all advanced inventory items
    const adv = advancedInventoryData || [];
    const advancedMap = new Map(adv.map(item => [item.productId || item.product?.id, item]));
    
    // Merge products with their advanced inventory entries (or create synthetic entries)
    const allAdvancedItems = productsForAdvanced.map(product => {
      const existingAdv = advancedMap.get(product.id);
      const variationQty = variationStockMap[product.id] || 0;
      const effectiveQty = variationQty > 0
        ? variationQty
        : (existingAdv?.quantity ?? product.stock ?? 0);
      if (existingAdv) {
        return { ...existingAdv, quantity: effectiveQty };
      }
      // Create synthetic advanced inventory item for product without advanced entry
      return {
        id: `synth_adv_${product.id}`,
        productId: product.id,
        quantity: effectiveQty,
        product: product,
        location: "Main Warehouse",
        minStock: 0,
        maxStock: 1000,
        reorderPoint: 10,
      } as any;
    });
    
    return allAdvancedItems.filter(item => {
      const product = item.product;
      if (!product) return false;
      
      const matchesSearch = product.name?.toLowerCase().includes(search.toLowerCase()) ||
                           product.sku?.toLowerCase().includes(search.toLowerCase());
      const matchesLocation = locationFilter === 'all' || (item.location || 'Main Warehouse') === locationFilter;

      const qty = item.quantity || 0;
      let matchesStock = true;
      if (stockFilter === 'low') matchesStock = qty <= (item.reorderPoint || 0) && qty > 0;
      if (stockFilter === 'out') matchesStock = qty === 0;
      if (stockFilter === 'over') matchesStock = qty > (item.maxStock || 1000);

      return matchesSearch && matchesLocation && matchesStock;
    });
  }, [activeTab, advancedInventoryData, advancedProductsData, products, search, locationFilter, stockFilter, variationStockMap]);

  const formatVariationAttributes = useCallback((attributes?: Record<string, string>) => {
    if (!attributes) return '';
    const entries = Object.entries(attributes).filter(([, value]) => value != null && String(value).trim() !== '');
    if (entries.length === 0) return '';
    return entries.map(([key, value]) => `${key}: ${value}`).join(' • ');
  }, []);

  // Variation-first list: physical variations are listed directly, non-variation products remain as single rows.
  const displayProducts = useMemo<ProductListRow[]>(() => {
    const rows: ProductListRow[] = [];

    products.forEach((product) => {
      const productVariations = Array.isArray(product.variations) ? product.variations : [];
      if (productVariations.length === 0) {
        rows.push({
          id: product.id,
          sourceType: 'product',
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: Number(product.price) || 0,
          cost: Number(product.cost) || 0,
          stock: Number(product.stock) || 0,
          category: product.category,
          description: product.description,
          imageUrl: product.images?.[0],
          imageUrls: product.images || [],
        });
        return;
      }

      productVariations.forEach((variation) => {
        rows.push({
          id: `variation-${variation.id}`,
          sourceType: 'variation',
          productId: product.id,
          variationId: variation.id,
          name: product.name,
          parentName: product.name,
          sku: variation.sku || product.sku,
          price: Number(variation.price ?? product.price) || 0,
          cost: Number(variation.cost ?? product.cost) || 0,
          stock: Number(variation.stock) || 0,
          category: product.category,
          description: product.description,
          attributeSummary: formatVariationAttributes(variation.attributes),
          imageUrl: variation.images?.[0] || product.images?.[0],
          imageUrls: variation.images?.length ? variation.images : (product.images || []),
        });
      });
    });

    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return rows;

    return rows.filter((row) => {
      return (
        row.name.toLowerCase().includes(normalizedSearch) ||
        row.sku.toLowerCase().includes(normalizedSearch) ||
        (row.attributeSummary || '').toLowerCase().includes(normalizedSearch)
      );
    });
  }, [products, formatVariationAttributes, search]);

  // Sort products
  const sortedProducts = useMemo(() => {
    return [...displayProducts].sort((a, b) => {
      if (sortField === 'margin') {
        const aMargin = a.price > 0 ? ((a.price - a.cost) / a.price) * 100 : -1;
        const bMargin = b.price > 0 ? ((b.price - b.cost) / b.price) * 100 : -1;
        return sortDirection === 'asc' ? aMargin - bMargin : bMargin - aMargin;
      }

      const aValue = a[sortField as keyof ProductListRow] || '';
      const bValue = b[sortField as keyof ProductListRow] || '';

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [displayProducts, sortField, sortDirection]);

  const productsById = useMemo(() => {
    return new Map(products.map((product) => [product.id, product]));
  }, [products]);

  // Virtualization for table view of products
  const tableParentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: sortedProducts.length,
    getScrollElement: () => tableParentRef.current,
    estimateSize: () => 56, // approximate row height in px
    overscan: 10,
  });

  const loading = productsLoading || inventoryLoading || branchesLoading || advancedInventoryLoading;
  const isSearching = search !== debouncedSearch;
  const hasCreatedProduct = (products.length > 0) || ((inventoryProductsData?.length || 0) > 0);
  const hasAttributes = (attributesSetupData?.length || 0) > 0;
  const hasPickedVariationProduct = !!selectedProductId;
  const { data: effectiveManifest } = useQuery({
    queryKey: ['tenant', 'effective-manifest'],
    queryFn: getEffectiveTenantManifest,
    enabled: !!user?.tenantId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: unifiedDisplayConfigResponse } = useQuery({
    queryKey: ['tenant', 'unified-products-display'],
    queryFn: () =>
      apiGet<TenantUnifiedProductsDisplayResponse>(
        '/tenant/configurations/unified-products-display/effective',
      ),
    enabled: !!user?.tenantId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const displayConfig =
    unifiedDisplayConfigResponse?.config || DEFAULT_UNIFIED_PRODUCTS_DISPLAY_CONFIG;

  const businessFlow = useMemo<ProductBusinessFlow>(() => {
    const tenantData = (tenant || {}) as Record<string, unknown>;
    const manifestBusinessType = String(
      effectiveManifest?.manifest?.businessType ||
      effectiveManifest?.source?.businessType ||
      '',
    ).toLowerCase();
    const tenantBusinessType = String(tenantData.businessType || '').toLowerCase();
    const classificationSlug = String(classificationMeta?.slug || '').toLowerCase();
    const classificationName = String(classificationMeta?.name || '').toLowerCase();

    if (manifestBusinessType.includes('restaurant') || manifestBusinessType.includes('hospitality')) {
      return 'restaurant';
    }
    if (manifestBusinessType.includes('spa') || manifestBusinessType.includes('barber')) {
      return 'spa';
    }
    if (Boolean(tenantData.restaurantFeaturesEnabled)) {
      return 'restaurant';
    }
    if (
      tenantBusinessType.includes('restaurant') ||
      tenantBusinessType.includes('hospitality') ||
      classificationSlug.includes('restaurant') ||
      classificationSlug.includes('hospitality') ||
      classificationName.includes('restaurant') ||
      classificationName.includes('hospitality')
    ) {
      return 'restaurant';
    }
    if (
      tenantBusinessType.includes('spa') ||
      tenantBusinessType.includes('barber') ||
      tenantBusinessType.includes('salon') ||
      classificationSlug.includes('spa') ||
      classificationSlug.includes('barber') ||
      classificationName.includes('spa') ||
      classificationName.includes('barber')
    ) {
      return 'spa';
    }
    return 'fashion';
  }, [tenant, classificationMeta, effectiveManifest]);

  const isRestaurantTenant = businessFlow === 'restaurant';
  const isSpaTenant = businessFlow === 'spa';
  const isFashionTenant = businessFlow === 'fashion';

  const platformEntityType = useMemo<PlatformEntityType>(() => {
    if (businessFlow === 'restaurant') return 'MENU_ITEM';
    if (businessFlow === 'spa') return 'SERVICE';
    return productType === 'withVariations' ? 'PRODUCT_STYLE' : 'RETAIL_PRODUCT';
  }, [businessFlow, productType]);

  const { data: platformWorkflow } = useQuery({
    queryKey: ['platform', 'workflow', platformEntityType, selectedBranchId],
    queryFn: () => getPlatformEntityWorkflow(platformEntityType, selectedBranchId || undefined),
    enabled: showAddForm && !editProduct && !!selectedBranchId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (
      isFashionTenant &&
      !displayConfig.fashion.enableVariationTypeSelector &&
      productType !== 'simple'
    ) {
      setProductType('simple');
    }
  }, [displayConfig.fashion.enableVariationTypeSelector, isFashionTenant, productType]);

  const {
    data: managedCategories = [],
    refetch: refetchManagedCategories,
  } = useQuery({
    queryKey: ['products', 'categories', user?.tenantId],
    queryFn: async () => {
      const response = (await apiGet('/products/categories')) as ProductCategory[];
      return Array.isArray(response) ? response : [];
    },
    enabled: !!user?.tenantId,
    staleTime: 60 * 1000,
  });

  const managedCategoryNames = useMemo(
    () => managedCategories.map((item) => item.name).filter(Boolean),
    [managedCategories],
  );

  const quickCategoryChips = useMemo(
    () => (managedCategoryNames.length > 0 ? managedCategoryNames : RESTAURANT_MENU_CATEGORIES),
    [managedCategoryNames],
  );

  const categoryOptions = useMemo(() => {
    const fromCatalog = categories.filter((cat): cat is string => Boolean(cat && String(cat).trim()));
    if (!isRestaurantTenant) return Array.from(new Set([...managedCategoryNames, ...fromCatalog]));
    return Array.from(new Set([...(managedCategoryNames.length ? managedCategoryNames : RESTAURANT_MENU_CATEGORIES), ...fromCatalog]));
  }, [categories, isRestaurantTenant, managedCategoryNames]);

  useEffect(() => {
    if (!showAddForm || editProduct) return;
    if (isRestaurantTenant && !productCategoryInput.trim()) {
      setProductCategoryInput((managedCategoryNames[0] || 'Meals'));
    }
  }, [showAddForm, editProduct, isRestaurantTenant, productCategoryInput, managedCategoryNames]);

  useEffect(() => {
    if (categoryFilter !== 'all' && !categoryOptions.includes(categoryFilter)) {
      setCategoryFilter('all');
    }
  }, [categoryFilter, categoryOptions]);

  // Product handlers
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    if (!canCreate()) {
      alert('Product limit reached. Please upgrade your plan.');
      return;
    }

    if (!selectedBranchId || typeof selectedBranchId !== 'string' || selectedBranchId.trim() === '') {
      setError('Please select a valid branch before creating a product.');
      return;
    }

    const wantsVariations = productType === "withVariations";
    const name = String(formData.get('name') || '').trim();
    const sku = String(formData.get('sku') || '').trim();
    const category = String(formData.get('category') || '').trim() || undefined;
    const description = String(formData.get('description') || '').trim() || undefined;
    const supplier = String(formData.get('supplier') || '').trim() || undefined;
    const price = parseFloat(String(formData.get('price') || '0'));
    const cost = parseFloat(String(formData.get('cost') || '0')) || 0;
    const durationMinutes = Math.max(1, Number.parseInt(String(formData.get('durationMinutes') || '0'), 10) || 0);
    const allergens = String(formData.get('allergens') || '').trim() || undefined;
    const prepStation = String(formData.get('prepStation') || '').trim() || undefined;
    const taxClass = String(formData.get('taxClass') || '').trim() || undefined;
    const brand = String(formData.get('brand') || '').trim() || undefined;
    const season = String(formData.get('season') || '').trim() || undefined;
    const staffSkillLevel = String(formData.get('staffSkillLevel') || '').trim() || undefined;
    const commissionProfile = String(formData.get('commissionProfile') || '').trim() || undefined;
    const consumables = String(formData.get('consumables') || '').trim() || undefined;

    setSaving(true);
    setError("");
    try {
      try {
        await createPlatformEntity(
          {
            entityType: platformEntityType,
            name,
            category,
            sku: sku || undefined,
            basePrice: Number.isFinite(price) ? price : 0,
            quantity: 0,
            durationMinutes:
              isSpaTenant && displayConfig.spa.showDurationMinutes
                ? durationMinutes
                : isSpaTenant
                  ? 60
                  : undefined,
            attributes: {
              description,
              cost,
              supplier,
              branchId: selectedBranchId,
              productType,
              businessFlow,
              ...(displayConfig.restaurant.showAllergens
                ? { allergens }
                : {}),
              ...(displayConfig.restaurant.showPrepStation
                ? { prepStation }
                : {}),
              ...(displayConfig.restaurant.showTaxClass ? { taxClass } : {}),
              ...(displayConfig.fashion.showBrand ? { brand } : {}),
              ...(displayConfig.fashion.showSeason ? { season } : {}),
              ...(displayConfig.spa.showStaffSkillLevel
                ? { staffSkillLevel }
                : {}),
              ...(displayConfig.spa.showCommissionProfile
                ? { commissionProfile }
                : {}),
              ...(displayConfig.spa.showConsumables ? { consumables } : {}),
            },
            variantAttributes: wantsVariations ? [] : undefined,
          },
          selectedBranchId,
        );
      } catch (platformErr) {
        console.warn('Platform create failed, falling back to /products only:', platformErr);
      }

      const created = await apiPost("/products", {
        name,
        sku,
        price,
        cost,
        stock: productType === 'withVariations' ? 0 : 0, // Stock managed per variation or set to 0 for simple products
        description,
        category,
        supplier,
        branchId: selectedBranchId,
      }, { 'x-branch-id': selectedBranchId || '' }) as Product;

      if (created?.id && productImageFiles.length > 0) {
        await uploadProductImages(created.id, productImageFiles);
      }
      
      queryClient.invalidateQueries({ queryKey: ['products', selectedBranchId] });
      setShowAddForm(false);
      resetForm();
      if (wantsVariations && created?.id) {
        setSelectedProduct(created);
        setSelectedProductId(created.id);
        setRedirectToVariations(true);
        setActiveTab('variations');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to create/update product");
    } finally {
      setSaving(false);
    }
  };

  async function handleEditProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      if (editProduct) {
        await apiPut(`/products/${editProduct.id}`, {
          name: formData.get("name"),
          sku: formData.get("sku"),
          price: parseFloat(formData.get("price") as string),
          cost: parseFloat(formData.get("cost") as string) || 0,
          stock: editProduct.stock || 0, // Preserve existing stock (managed per variation for variation products)
          description: formData.get("description"),
          category: String(formData.get('category') || '').trim() || undefined,
          supplier: formData.get("supplier"),
        }, { 'x-branch-id': selectedBranchId || '' });

        if (productImageFiles.length > 0) {
          await uploadProductImages(editProduct.id, productImageFiles);
        }
        setEditProduct(null);
      }
      setShowAddForm(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['products', selectedBranchId] });
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  }

  const resetForm = () => {
    setEditProduct(null);
    setProductCategoryInput('');
    productImagePreviewUrls.forEach((url) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    setProductImageFiles([]);
    setProductImagePreviewUrls([]);
    setExistingProductImages([]);
    setShowAddForm(false);
  };

  function openEditModal(product: Product) {
    setEditProduct(product);
    setProductCategoryInput(product.category || '');
    setProductImageFiles([]);
    setProductImagePreviewUrls([]);
    setExistingProductImages(product.images || []);
    setShowAddForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    await apiDelete(`/products/${id}`, { 'x-branch-id': selectedBranchId || '' });
    queryClient.invalidateQueries({ queryKey: ['products', selectedBranchId] });
  }

  async function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) return;

    setCategorySaving(true);
    setCategoryError('');
    try {
      await apiPost('/products/categories', { name });
      setNewCategoryName('');
      await refetchManagedCategories();
    } catch (err: any) {
      setCategoryError(err?.message || 'Failed to create category');
    } finally {
      setCategorySaving(false);
    }
  }

  async function handleUpdateCategory() {
    if (!editingCategoryId) return;
    const name = editingCategoryName.trim();
    if (!name) return;

    setCategorySaving(true);
    setCategoryError('');
    try {
      await apiPut(`/products/categories/${editingCategoryId}`, { name });
      setEditingCategoryId(null);
      setEditingCategoryName('');
      await refetchManagedCategories();
    } catch (err: any) {
      setCategoryError(err?.message || 'Failed to update category');
    } finally {
      setCategorySaving(false);
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    if (!confirm('Delete this category?')) return;

    setCategorySaving(true);
    setCategoryError('');
    try {
      await apiDelete(`/products/categories/${categoryId}`);
      if (editingCategoryId === categoryId) {
        setEditingCategoryId(null);
        setEditingCategoryName('');
      }
      await refetchManagedCategories();
    } catch (err: any) {
      setCategoryError(err?.message || 'Failed to delete category');
    } finally {
      setCategorySaving(false);
    }
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Load more products
  const loadMoreProducts = useCallback(async () => {
    if (!selectedBranchId || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const nextPage = Math.floor(products.length / itemsPerPage) + 1;
      const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : '';
      const data = await apiGet(`/products?page=${nextPage}&limit=${itemsPerPage}&branchId=${selectedBranchId}&includeVariations=true${searchParam}`) as { products: Product[]; pagination: unknown };

      if (data.products && data.products.length > 0) {
        setProducts(prev => [...prev, ...data.products]);
        setHasMore(data.products.length === itemsPerPage);
      } else {
        setHasMore(false);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to load more products");
    } finally {
      setLoadingMore(false);
    }
  }, [selectedBranchId, loadingMore, hasMore, products.length, itemsPerPage, debouncedSearch]);

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    localStorage.setItem('productsItemsPerPage', newItemsPerPage.toString());
    setProducts([]);
    setHasMore(true);
    setCurrentPage(1);
  };

  // Inventory handlers
  function openStockModal(product: Product) {
    setModalProduct(product);
    const inv = getInv(product.id);
    setModalQuantity(inv?.quantity || 0);
    setModalError("");
    setModalProductFields({
      name: product.name,
      sku: product.sku || "",
      price: product.price ?? undefined,
      cost: product.cost ?? undefined,
      category: product.category || "",
    });
    setShowStockModal(true);
  }

  async function handleStockSave(e: React.FormEvent) {
    e.preventDefault();
    if (!modalProduct) return;
    setSaving(true);
    setModalError("");
    try {
      await apiPut(`/products/${modalProduct.id}`, {
        ...modalProductFields,
      }, { 'x-branch-id': selectedBranchId || '' });
      await apiPost("/inventory", { productId: modalProduct.id, quantity: Number(modalQuantity) }, { 'x-branch-id': selectedBranchId || '' });
      setShowStockModal(false);
      setModalProduct(null);
      setModalQuantity(0);
      setModalProductFields({});
      queryClient.invalidateQueries({ queryKey: ['products', 'inventory', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', selectedBranchId] });
    } catch (err: unknown) {
      const error = err as Error;
      setModalError(error.message || "Failed to update stock");
    } finally {
      setSaving(false);
    }
  }

  function getStockStatus(quantity: number) {
    if (quantity === 0) return { status: "out", color: "text-red-600", bg: "bg-red-50", icon: <FaTimesCircle />, text: "Out of Stock" };
    if (quantity <= 5) return { status: "low", color: "text-orange-600", bg: "bg-orange-50", icon: <FaExclamationTriangle />, text: "Low Stock" };
    return { status: "in", color: "text-green-600", bg: "bg-green-50", icon: <FaCheckCircle />, text: "In Stock" };
  }

  // Advanced inventory handlers
  const stockMovementMutation = useMutation({
    mutationFn: async (data: {
      productId: string;
      type: 'in' | 'out' | 'adjustment' | 'transfer';
      quantity: number;
      reason: string;
      location: string;
      destinationLocation?: string | null;
    }) => {
      return apiPost('/inventory/movements', data, { 'x-branch-id': selectedBranchId || '' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'advanced', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'movements', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'alerts', selectedBranchId] });
      setShowMovementModal(false);
      setMovementForm({
        type: 'in',
        quantity: 0,
        reason: '',
        location: '',
        destinationLocation: ''
      });
      setSelectedProduct(null);
    },
  });

  const handleStockMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !selectedBranchId) return;
    stockMovementMutation.mutate({
      productId: selectedProduct.id,
      ...movementForm,
    });
  };

  const createLocationMutation = useMutation({
    mutationFn: async (data: typeof locationForm & { branchId: string }) => {
      return apiPost('/inventory/locations', data, { 'x-branch-id': selectedBranchId || '' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'locations', selectedBranchId] });
      setShowLocationModal(false);
      setLocationForm({
        name: '',
        type: 'warehouse',
        address: ''
      });
    },
  });

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;
    createLocationMutation.mutate({
      ...locationForm,
      branchId: selectedBranchId
    });
  };

  const markAlertAsReadMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return apiPut(`/inventory/alerts/${alertId}/read`, {}, { 'x-branch-id': selectedBranchId || '' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'alerts', selectedBranchId] });
    },
  });

  const markAlertAsRead = (alertId: string) => {
    markAlertAsReadMutation.mutate(alertId);
  };

  const updateAlertSettingsMutation = useMutation({
    mutationFn: async (data: typeof alertSettings & { branchId: string }) => {
      return apiPut('/inventory/alert-settings', data, { 'x-branch-id': selectedBranchId || '' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'alerts', selectedBranchId] });
      setShowAlertSettings(false);
    },
  });

  const handleUpdateAlertSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;
    updateAlertSettingsMutation.mutate({
      ...alertSettings,
      branchId: selectedBranchId
    });
  };

  const exportInventory = async () => {
    const inv = activeTab === 'advanced' ? filteredAdvancedInventory : filteredInventoryProducts;
    const exportData = inv.map(item => {
      const product = item.product;
      const quantity = item.quantity;
      const cost = product?.cost || 0;
      const price = product?.price || 0;
      const profitPerUnit = price - cost;
      const totalValue = quantity * price;
      const totalProfit = quantity * profitPerUnit;
      const marginPercent = price > 0 ? ((profitPerUnit / price) * 100) : 0;

      return {
        'Product Name': product?.name || '',
        'SKU': product?.sku || '',
        'Category': product?.category || '',
        'Stock': quantity,
        'Buying Price': cost,
        'Selling Price': price,
        'Margin %': marginPercent.toFixed(1),
        'Total Value': totalValue.toFixed(2),
        'Total Profit': totalProfit.toFixed(2),
        'Status': quantity === 0 ? 'Out of Stock' : quantity <= 5 ? 'Low Stock' : 'In Stock',
        ...(activeTab === 'advanced' && {
          'Location': item.location || '',
          'Min Stock': item.minStock || '',
          'Max Stock': item.maxStock || '',
          'Reorder Point': item.reorderPoint || ''
        })
      };
    });

    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, `inventory-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getAdvancedStockStatus = (item: InventoryItem) => {
    if (item.quantity === 0) return { status: 'out', color: 'text-red-600', bg: 'bg-red-50', icon: <FaTimesCircle className="w-4 h-4" />, text: 'Out of Stock' };
    if (item.quantity <= (item.reorderPoint || 0)) return { status: 'low', color: 'text-orange-600', bg: 'bg-orange-50', icon: <FaExclamationTriangle className="w-4 h-4" />, text: 'Low Stock' };
    if (item.quantity > (item.maxStock || 0)) return { status: 'over', color: 'text-blue-600', bg: 'bg-blue-50', icon: <FaArrowUp className="w-4 h-4" />, text: 'Over Stock' };
    return { status: 'good', color: 'text-green-600', bg: 'bg-green-50', icon: <FaCheckCircle className="w-4 h-4" />, text: 'Good Stock' };
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  // Check permissions
  if (!canViewProducts && activeTab === 'products') {
    return (
      <AuthGuard>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <FaExclamationTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don&apos;t have permission to view products.</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!canViewInventory && (activeTab === 'inventory' || activeTab === 'advanced')) {
    return (
      <AuthGuard>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <FaExclamationTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don&apos;t have permission to view inventory.</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const usagePercentage = getUsagePercentage();
  const isNearLimit = usagePercentage >= 80;
  const topTitle = isRestaurantTenant ? 'Menu & Inventory' : isSpaTenant ? 'Services & Inventory' : 'Products & Inventory';
  const productsTabLabel = isRestaurantTenant ? 'Menu' : isSpaTenant ? 'Services' : 'Products';
  const productsCountLabel = isRestaurantTenant ? 'Menu Item' : isSpaTenant ? 'Service' : 'Physical Item';
  const addPrimaryLabel = isRestaurantTenant ? 'Add Menu Item' : isSpaTenant ? 'Add Service' : 'Add Product';
  const createPrimaryLabel = isRestaurantTenant ? 'Create Menu Item' : isSpaTenant ? 'Create Service' : 'Create Product';
  const noItemsTitle = isRestaurantTenant ? 'No menu items found' : isSpaTenant ? 'No services found' : 'No products found';
  const noItemsDescription = search
    ? 'Try adjusting your search criteria'
    : isRestaurantTenant
      ? 'Get started by adding your first menu item'
      : isSpaTenant
        ? 'Get started by adding your first service'
        : 'Get started by adding your first product';

  // Pagination for inventory
  const inventoryItemsPerPage = 12;
  const inventoryTotalPages = Math.ceil(filteredInventoryProducts.length / inventoryItemsPerPage);
  const inventoryStartIndex = (currentPage - 1) * inventoryItemsPerPage;
  const inventoryEndIndex = inventoryStartIndex + inventoryItemsPerPage;
  const currentInventoryProducts = filteredInventoryProducts.slice(inventoryStartIndex, inventoryEndIndex);

  // Pagination for advanced inventory
  const advancedItemsPerPage = 15;
  const advancedTotalPages = Math.ceil(filteredAdvancedInventory.length / advancedItemsPerPage);
  const advancedStartIndex = (currentPage - 1) * advancedItemsPerPage;
  const advancedEndIndex = advancedStartIndex + advancedItemsPerPage;
  const currentAdvancedInventory = filteredAdvancedInventory.slice(advancedStartIndex, advancedEndIndex);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-screen-2xl px-2 py-3 sm:px-3 lg:px-4">
          {/* Usage Warning Banner */}
          {isNearLimit && showUsageBanner && activeTab === 'products' && (
            <div className="fixed left-1/2 top-3 z-50 w-full max-w-md -translate-x-1/2 animate-in slide-in-from-top-5">
              <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5">
                <div className="flex-shrink-0">
                  <FaExclamationTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-900">
                    {isRestaurantTenant ? 'Approaching Menu Item Limit' : 'Approaching Physical Item Limit'}
                  </p>
                  <p className="mt-0.5 text-xs text-amber-700">
                    {limits?.usage.products.current} of {limits?.usage.products.limit} {isRestaurantTenant ? 'menu items' : 'physical items'} used
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href="/settings/billing"
                    className="rounded bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
                  >
                    Upgrade
                  </a>
                  <button
                    onClick={() => setShowUsageBanner(false)}
                    className="rounded p-1 text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-900"
                    title="Dismiss"
                    aria-label="Dismiss banner"
                  >
                    <FaTimes className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header Section */}
          <div className="mb-4">
            <div className="rounded-md border border-gray-200 bg-white p-2.5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="flex-shrink-0 rounded bg-blue-600 p-1.5">
                    <FaBox className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-sm font-semibold text-gray-900">{topTitle}</h1>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-2 py-1">
                    <FaStore className="w-3.5 h-3.5 text-gray-500" />
                    <label className="whitespace-nowrap text-[11px] font-medium text-gray-700">Branch:</label>
                    {branchesLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                        <span className="text-sm text-gray-400">Loading...</span>
                      </div>
                    ) : (
                      <select
                        value={selectedBranchId || ''}
                        onChange={e => setSelectedBranchId(e.target.value)}
                        className="min-w-[110px] cursor-pointer rounded bg-white text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500"
                        aria-label="Select branch"
                      >
                        <option value="" disabled>Select Branch</option>
                        {branches.map(branch => (
                          <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="mb-3 overflow-hidden rounded-md border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50/50">
              <nav className="flex overflow-x-auto scrollbar-hide -mb-px" role="tablist">
                {[
                  { id: 'products', label: productsTabLabel, icon: FaBox, count: sortedProducts.length },
                  { id: 'inventory', label: 'Inventory', icon: FaWarehouse, count: filteredInventoryProducts.length },
                  { id: 'advanced', label: 'Advanced', icon: FaChartLine },
                  { id: 'attributes', label: 'Attributes', icon: FaPalette },
                  { id: 'variations', label: 'Variations', icon: FaLayerGroup },
                ].map(({ id, label, icon: Icon, count }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as TabType)}
                    role="tab"
                    aria-selected={activeTab === id}
                    className={`group relative flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                      activeTab === id
                        ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                    {count !== undefined && count > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        activeTab === id
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-200 text-gray-600 group-hover:bg-gray-300'
                      }`}>
                        {count}
                      </span>
                    )}
                    {activeTab === id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-3">
              {/* PRODUCTS TAB */}
              {activeTab === 'products' && (
                <div className="space-y-3">
                  {/* Products Header Actions */}
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2">
                        <div className="rounded border border-blue-200 bg-blue-50 px-2 py-1">
                          <span className="text-xs font-semibold text-blue-700">
                            {loading || isSearching ? (
                              <span className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent"></div>
                                Loading...
                              </span>
                            ) : (
                              `${sortedProducts.length} ${productsCountLabel}${sortedProducts.length !== 1 ? 's' : ''}`
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-2 py-1">
                        <label className="whitespace-nowrap text-xs font-medium text-gray-700">Per page:</label>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value, 10))}
                          className="cursor-pointer rounded bg-white text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500"
                          disabled={loading || isSearching}
                          aria-label="Items per page"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative min-w-[220px] max-w-md flex-1">
                        <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          placeholder={isRestaurantTenant ? 'Search menu item, SKU, or attributes...' : 'Search by product, variation SKU, or attributes...'}
                          className="w-full rounded border border-gray-300 bg-white py-2 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          aria-label="Search products"
                        />
                        {isSearching && (
                          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                          </div>
                        )}
                        {search && !isSearching && (
                          <button
                            onClick={() => setSearch('')}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            aria-label="Clear search"
                          >
                            <FaTimes className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => setShowDeletedProducts(!showDeletedProducts)}
                        className={`flex items-center gap-1.5 rounded border px-3 py-2 text-xs font-medium transition-colors ${
                          showDeletedProducts ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <FaTrashRestore className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{showDeletedProducts ? 'Active' : 'Deleted'}</span>
                      </button>
                      <button
                        onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                        className="flex items-center gap-1.5 rounded border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        aria-label={`Switch to ${viewMode === 'grid' ? 'table' : 'grid'} view`}
                      >
                        {viewMode === 'grid' ? <FaSortAmountDown className="h-3.5 w-3.5" /> : <FaLayerGroup className="h-3.5 w-3.5" />}
                        <span className="hidden sm:inline">{viewMode === 'grid' ? 'Table' : 'Grid'}</span>
                      </button>
                      {isRestaurantTenant && canEditProducts && (
                        <button
                          onClick={() => setShowCategoryManager(true)}
                          className="flex items-center gap-1.5 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
                        >
                          <FaCog className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Manage Categories</span>
                          <span className="sm:hidden">Categories</span>
                        </button>
                      )}
                      {canCreateProducts && (
                        <button
                          onClick={() => setShowAddForm(true)}
                          className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                          aria-label="Add new product"
                        >
                          <FaPlus className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{addPrimaryLabel}</span>
                          <span className="sm:hidden">Add</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Setup Guide */}
                  <div className="rounded border border-blue-200 bg-blue-50 px-2.5 py-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold text-blue-800">New here? Follow this order:</p>
                        <p className="text-[11px] text-blue-700">
                          {isRestaurantTenant
                            ? '1. Add Menu Item, 2. Set Category, 3. Add Variations (optional), 4. Update stock for tracked items'
                            : isSpaTenant
                              ? '1. Create Service, 2. Set Duration, 3. Add optional details, 4. Publish and start booking'
                              : '1. Create Product, 2. Add Attributes (optional), 3. Add Variations, 4. Update Variation Stock'}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${hasCreatedProduct ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-gray-600 border border-blue-200'}`}>
                            {hasCreatedProduct ? 'Step 1 complete' : 'Step 1 pending'}
                          </span>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${hasAttributes ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-gray-600 border border-blue-200'}`}>
                            {hasAttributes ? 'Step 2 complete' : 'Step 2 pending'}
                          </span>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${hasPickedVariationProduct ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-gray-600 border border-blue-200'}`}>
                            {hasPickedVariationProduct ? 'Step 3 in progress' : 'Step 3 pending'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setShowAddForm(true)}
                          className="rounded border border-blue-300 bg-white px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                        >
                          {createPrimaryLabel}
                        </button>
                        <button
                          onClick={() => setActiveTab('attributes')}
                          className="rounded border border-blue-300 bg-white px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                        >
                          Attributes
                        </button>
                        <button
                          onClick={() => {
                            if (!selectedProduct && products.length > 0) {
                              setSelectedProduct(products[0]);
                              setSelectedProductId(products[0].id);
                            }
                            setActiveTab('variations');
                          }}
                          className="rounded border border-blue-300 bg-white px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                        >
                          Variations
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Add/Edit Product Form */}
                  {showAddForm && (
                    <div className="mb-3 animate-in slide-in-from-top-5 rounded-md border border-gray-200 bg-white p-4">
                      <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-2">
                        <div className="flex items-center gap-3">
                          <div className="rounded bg-blue-600 p-1.5">
                            <FaBox className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h2 className="text-base font-semibold text-gray-900">
                              {editProduct
                                ? (isRestaurantTenant ? 'Edit Menu Item' : isSpaTenant ? 'Edit Service' : 'Edit Product')
                                : (isRestaurantTenant ? 'Add New Menu Item' : isSpaTenant ? 'Add New Service' : 'Add New Product')}
                            </h2>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {editProduct
                                ? isRestaurantTenant
                                  ? 'Update menu item information'
                                  : isSpaTenant
                                    ? 'Update service information'
                                    : 'Update product information'
                                : isFashionTenant && productType === 'withVariations'
                                  ? isRestaurantTenant
                                    ? 'Step 1 of 2 — basic menu item details. We will help you add variations next.'
                                    : 'Step 1 of 2 — basic details. We will help you add variations next.'
                                  : isRestaurantTenant
                                    ? 'Create a new menu item in your catalog'
                                    : isSpaTenant
                                      ? 'Create a new service with pricing and duration'
                                    : 'Create a new product in your catalog'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setShowAddForm(false);
                            resetForm();
                          }}
                          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                          aria-label="Close form"
                        >
                          <FaTimes className="h-4 w-4" />
                        </button>
                      </div>

                      {error && (
                        <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-start gap-3">
                          <FaExclamationTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-red-900 mb-1">Error</p>
                            <p className="text-sm text-red-800">{error}</p>
                          </div>
                        </div>
                      )}

                      {!editProduct && displayConfig.global.showWorkflowPanel && platformWorkflow?.workflow?.length ? (
                        <div className="mb-4 rounded border border-indigo-200 bg-indigo-50 px-3 py-2">
                          <p className="text-xs font-semibold text-indigo-900">
                            Workflow for {platformEntityType.replace('_', ' ')}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {platformWorkflow.workflow.map((step) => (
                              <span
                                key={step.key}
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  step.required
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : 'bg-white text-indigo-700 border border-indigo-200'
                                }`}
                              >
                                {step.label}
                                {step.required ? ' *' : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <form onSubmit={editProduct ? handleEditProduct : handleAddProduct} className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              {isRestaurantTenant ? 'Menu Item Name' : isSpaTenant ? 'Service Name' : 'Product Name'} <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              name="name"
                              defaultValue={editProduct?.name || ''}
                              required
                              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                              placeholder={isRestaurantTenant ? 'Enter menu item name' : isSpaTenant ? 'Enter service name' : 'Enter product name'}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              SKU <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              name="sku"
                              defaultValue={editProduct?.sku || ''}
                              required
                              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter SKU"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              {isSpaTenant ? 'Service Price' : 'Selling Price'} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-gray-500">$</span>
                              <input
                                type="number"
                                name="price"
                                step="0.01"
                                min="0"
                                defaultValue={editProduct?.price || ''}
                                required
                                className="w-full rounded border border-gray-300 bg-white py-2 pl-7 pr-3 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{isSpaTenant ? 'Service Cost (Optional)' : 'Buying Price'}</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-gray-500">$</span>
                              <input
                                type="number"
                                name="cost"
                                step="0.01"
                                min="0"
                                defaultValue={editProduct?.cost || ''}
                                className="w-full rounded border border-gray-300 bg-white py-2 pl-7 pr-3 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          {isSpaTenant && displayConfig.spa.showDurationMinutes && (
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Duration (minutes) <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                name="durationMinutes"
                                min="1"
                                step="1"
                                defaultValue="60"
                                required
                                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                placeholder="60"
                              />
                            </div>
                          )}
                          {isFashionTenant && displayConfig.fashion.enableVariationTypeSelector && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Product type
                            </label>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={() => setProductType('simple')}
                                className={`w-full rounded border px-3 py-2 text-left text-xs transition-colors ${
                                  productType === 'simple'
                                    ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                <span className="block font-semibold mb-1">Single product</span>
                                <span className="block text-xs text-gray-500">
                                  One SKU, one price. Stock can be managed separately.
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setProductType('withVariations')}
                                className={`w-full rounded border px-3 py-2 text-left text-xs transition-colors ${
                                  productType === 'withVariations'
                                    ? 'border-purple-500 bg-purple-50 text-purple-900 shadow-sm'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                <span className="block font-semibold mb-1">Product with variations</span>
                                <span className="block text-xs text-gray-500">
                                  Different sizes, colors, or options. After saving we&rsquo;ll guide you to set up variations.
                                </span>
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              {productType === 'simple'
                                ? 'Use this for products that do not vary by size, color, or other options.'
                                : 'Use this when the same product is sold in multiple options (for example T-shirts with different sizes and colors).'}
                            </p>
                          </div>
                          )}
                        </div>
                        {displayConfig.global.showDescription && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                          <textarea
                            name="description"
                            defaultValue={editProduct?.description || ''}
                            rows={4}
                            className="w-full resize-none rounded border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter product description (optional)"
                          />
                        </div>
                        )}

                        {isRestaurantTenant && (
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            {displayConfig.restaurant.showAllergens && (
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Allergens</label>
                              <input
                                type="text"
                                name="allergens"
                                defaultValue={String(editProduct?.customFields?.allergens || '')}
                                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. Gluten, Dairy, Nuts"
                              />
                            </div>
                            )}
                            {displayConfig.restaurant.showPrepStation && (
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Prep Station</label>
                              <input
                                type="text"
                                name="prepStation"
                                defaultValue={String(editProduct?.customFields?.prepStation || '')}
                                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. Grill, Bar, Cold Kitchen"
                              />
                            </div>
                            )}
                            {displayConfig.restaurant.showTaxClass && (
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Tax Class</label>
                              <input
                                type="text"
                                name="taxClass"
                                defaultValue={String(editProduct?.customFields?.taxClass || '')}
                                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. VAT16, Zero-Rated"
                              />
                            </div>
                            )}
                          </div>
                        )}

                        {isFashionTenant && (
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            {displayConfig.fashion.showBrand && (
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Brand</label>
                              <input
                                type="text"
                                name="brand"
                                defaultValue={String(editProduct?.customFields?.brand || '')}
                                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. Zara, Levi's"
                              />
                            </div>
                            )}
                            {displayConfig.fashion.showSeason && (
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Season</label>
                              <input
                                type="text"
                                name="season"
                                defaultValue={String(editProduct?.customFields?.season || '')}
                                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. Summer 2026"
                              />
                            </div>
                            )}
                            {displayConfig.fashion.showSupplier && (
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Supplier</label>
                              <input
                                type="text"
                                name="supplier"
                                defaultValue={String(editProduct?.supplier?.name || '')}
                                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. Global Apparel Ltd"
                              />
                            </div>
                            )}
                          </div>
                        )}

                        {isSpaTenant && (
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            {displayConfig.spa.showStaffSkillLevel && (
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Staff Skill Level</label>
                              <input
                                type="text"
                                name="staffSkillLevel"
                                defaultValue={String(editProduct?.customFields?.staffSkillLevel || '')}
                                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. Senior Therapist"
                              />
                            </div>
                            )}
                            {displayConfig.spa.showCommissionProfile && (
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Commission Profile</label>
                              <input
                                type="text"
                                name="commissionProfile"
                                defaultValue={String(editProduct?.customFields?.commissionProfile || '')}
                                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. 20% or Tier A"
                              />
                            </div>
                            )}
                            {displayConfig.spa.showConsumables && (
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Consumables</label>
                              <input
                                type="text"
                                name="consumables"
                                defaultValue={String(editProduct?.customFields?.consumables || '')}
                                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. Oils, Towels, Serums"
                              />
                            </div>
                            )}
                          </div>
                        )}

                        {displayConfig.global.showImages && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Product Images
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(event) => {
                              const files = Array.from(event.target.files || []);
                              if (!files.length) return;
                              const newPreviewUrls = files.map((file) => URL.createObjectURL(file));
                              setProductImageFiles((prev) => [...prev, ...files]);
                              setProductImagePreviewUrls((prev) => [...prev, ...newPreviewUrls]);
                              event.currentTarget.value = '';
                            }}
                            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                          />
                          <p className="mt-1 text-[11px] text-gray-500">
                            Upload one or more product photos. Max size per image is 5MB.
                          </p>
                          {editProduct && existingProductImages.length > 0 && (
                            <div className="mt-2">
                              <p className="mb-1 text-[11px] font-semibold text-gray-600">Saved images</p>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {existingProductImages.map((imagePath, index) => {
                                  const imageUrl = resolveProductImageUrl(imagePath);
                                  if (!imageUrl) return null;

                                  return (
                                    <div key={`${imagePath}-${index}`} className="rounded border border-gray-200 p-1">
                                      <button
                                        type="button"
                                        onClick={() => openImageLightbox(existingProductImages.map((path) => resolveProductImageUrl(path)).filter((url): url is string => Boolean(url)), index)}
                                        className="relative block h-20 w-full overflow-hidden rounded border border-gray-200"
                                      >
                                        <Image
                                          src={imageUrl}
                                          alt={`Saved product image ${index + 1}`}
                                          fill
                                          sizes="120px"
                                          className="object-cover"
                                          unoptimized
                                        />
                                      </button>
                                      <div className="mt-1 flex gap-1">
                                        <button
                                          type="button"
                                          disabled={imageActionLoading || index === 0}
                                          onClick={async () => {
                                            if (!editProduct) return;
                                            setImageActionLoading(true);
                                            try {
                                              const reordered = await reorderProductImageAsPrimary(editProduct.id, imagePath, existingProductImages);
                                              setExistingProductImages(reordered);
                                              queryClient.invalidateQueries({ queryKey: ['products', selectedBranchId] });
                                            } catch (err) {
                                              const errMsg = err instanceof Error ? err.message : 'Failed to set primary image';
                                              setError(errMsg);
                                            } finally {
                                              setImageActionLoading(false);
                                            }
                                          }}
                                          className="flex-1 rounded border border-blue-200 bg-blue-50 px-1 py-0.5 text-[10px] font-medium text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          {index === 0 ? 'Cover' : 'Set cover'}
                                        </button>
                                        <button
                                          type="button"
                                          disabled={imageActionLoading}
                                          onClick={async () => {
                                            if (!editProduct) return;
                                            setImageActionLoading(true);
                                            try {
                                              await deleteProductImage(editProduct.id, imagePath);
                                              setExistingProductImages((prev) => prev.filter((img) => img !== imagePath));
                                              queryClient.invalidateQueries({ queryKey: ['products', selectedBranchId] });
                                            } catch (err) {
                                              const errMsg = err instanceof Error ? err.message : 'Failed to remove image';
                                              setError(errMsg);
                                            } finally {
                                              setImageActionLoading(false);
                                            }
                                          }}
                                          className="flex-1 rounded border border-red-200 bg-red-50 px-1 py-0.5 text-[10px] font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {productImagePreviewUrls.length > 0 && (
                            <div className="mt-2">
                              <p className="mb-1 text-[11px] font-semibold text-gray-600">New uploads</p>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {productImagePreviewUrls.map((url, index) => (
                                <div key={`${url}-${index}`} className="rounded border border-gray-200 p-1">
                                  <button
                                    type="button"
                                    onClick={() => openImageLightbox(productImagePreviewUrls, index)}
                                    className="relative block h-20 w-full overflow-hidden rounded border border-gray-200"
                                  >
                                    <Image
                                      src={url}
                                      alt={`Product preview ${index + 1}`}
                                      fill
                                      sizes="120px"
                                      className="object-cover"
                                      unoptimized
                                    />
                                  </button>
                                  <div className="mt-1 flex gap-1">
                                    <button
                                      type="button"
                                      disabled={index === 0}
                                      onClick={() => {
                                        if (index === 0) return;
                                        setProductImageFiles((prev) => {
                                          const next = [...prev];
                                          const [picked] = next.splice(index, 1);
                                          next.unshift(picked);
                                          return next;
                                        });
                                        setProductImagePreviewUrls((prev) => {
                                          const next = [...prev];
                                          const [picked] = next.splice(index, 1);
                                          next.unshift(picked);
                                          return next;
                                        });
                                      }}
                                      className="flex-1 rounded border border-blue-200 bg-blue-50 px-1 py-0.5 text-[10px] font-medium text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {index === 0 ? 'Cover' : 'Set cover'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setProductImageFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
                                        setProductImagePreviewUrls((prev) => {
                                          const next = prev.filter((_, previewIndex) => previewIndex !== index);
                                          if (url.startsWith('blob:')) {
                                            URL.revokeObjectURL(url);
                                          }
                                          return next;
                                        });
                                      }}
                                      className="flex-1 rounded border border-red-200 bg-red-50 px-1 py-0.5 text-[10px] font-medium text-red-700"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ))}
                              </div>
                            </div>
                          )}
                        </div>
                        )}
                        {displayConfig.global.showCategory && (
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <label className="block text-sm font-semibold text-gray-700">Category</label>
                            {isRestaurantTenant && (
                              <span className="text-[11px] font-medium text-emerald-700">Restaurant menu groups</span>
                            )}
                          </div>
                          <input
                            type="text"
                            name="category"
                            value={productCategoryInput}
                            onChange={(e) => setProductCategoryInput(e.target.value)}
                            list="product-category-options"
                            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            placeholder={isRestaurantTenant ? 'Meals, Desserts, Beer, Cocktails...' : 'Enter category'}
                          />
                          <datalist id="product-category-options">
                            {categoryOptions.map((cat) => (
                              <option key={cat} value={cat} />
                            ))}
                          </datalist>

                          {isRestaurantTenant && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {quickCategoryChips.map((cat) => (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => setProductCategoryInput(cat)}
                                  className={`rounded-full border px-2 py-1 text-[11px] font-semibold transition-colors ${
                                    productCategoryInput === cat
                                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        )}
                        <div className="flex items-center gap-2 border-t border-gray-200 pt-2.5">
                          <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {saving ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                {editProduct ? (
                                  <>
                                    <FaCheckCircle className="w-4 h-4" />
                                    <span>{isRestaurantTenant ? 'Update Menu Item' : isSpaTenant ? 'Update Service' : 'Update Product'}</span>
                                  </>
                                ) : (
                                  <>
                                    <FaPlus className="w-4 h-4" />
                                    <span>{createPrimaryLabel}</span>
                                  </>
                                )}
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddForm(false);
                              resetForm();
                            }}
                            className="rounded border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Products Content */}
                  {showDeletedProducts ? (
                    <div className="rounded-md border border-gray-200 bg-white p-3">
                      <p className="text-sm text-gray-500 mb-4">Deleted products can be restored.</p>
                      {deletedProducts.length === 0 ? (
                        <p className="text-sm text-gray-500">No deleted products.</p>
                      ) : (
                        <div className="grid gap-3">
                          {deletedProducts.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between gap-2 rounded border border-amber-200 bg-amber-50/50 p-2.5"
                            >
                              <div>
                                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                                <p className="text-sm text-gray-600">{p.sku} • ${p.price?.toFixed(2)}</p>
                                <p className="text-xs text-gray-500">Deleted {new Date(p.deletedAt).toLocaleDateString()}</p>
                              </div>
                              {canEditProducts && (
                                <button
                                  onClick={() => handleRestoreProduct(p.id)}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                                >
                                  <FaTrashRestore /> Restore
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : loading || isSearching ? (
                    <div className="rounded-md border border-gray-200 bg-white p-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {Array.from({ length: 8 }).map((_, index) => (
                          <div key={`skeleton-${index}`} className="animate-pulse rounded border border-gray-200 bg-gray-50 p-3">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="w-10 h-10 bg-gray-300 rounded-lg"></div>
                                <div className="flex-1 space-y-2">
                                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                                </div>
                              </div>
                              <div className="w-16 h-6 bg-gray-300 rounded-full"></div>
                            </div>
                            <div className="space-y-2 mb-4">
                              <div className="h-3 bg-gray-300 rounded w-full"></div>
                              <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                            </div>
                            <div className="flex gap-2">
                              <div className="h-8 bg-gray-300 rounded-lg flex-1"></div>
                              <div className="h-8 bg-gray-300 rounded-lg w-8"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : sortedProducts.length === 0 ? (
                    <div className="rounded-md border border-dashed border-gray-300 bg-white p-6">
                      <div className="text-center">
                        <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                          <FaBox className="h-5 w-5 text-gray-400" />
                        </div>
                        <h3 className="mb-1 text-sm font-semibold text-gray-900">{noItemsTitle}</h3>
                        <p className="mb-3 text-xs text-gray-600">
                          {noItemsDescription}
                        </p>
                        {canCreateProducts && !search && (
                          <button
                            onClick={() => setShowAddForm(true)}
                            className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                          >
                            <FaPlus className="w-4 h-4" />
                            {isRestaurantTenant ? 'Add Your First Menu Item' : isSpaTenant ? 'Add Your First Service' : 'Add Your First Product'}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                  <>
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {sortedProducts.map((productRow) => {
                          const parentProduct = productsById.get(productRow.productId);
                          const margin = productRow.price > 0 ? ((productRow.price - (productRow.cost || 0)) / productRow.price * 100) : 0;
                          const stockStatus = productRow.stock > 10 ? 'good' : productRow.stock > 0 ? 'low' : 'out';
                          const productImage = resolveProductImageUrl(productRow.imageUrl || null) || getPrimaryProductImage(parentProduct);
                          const lightboxTargets =
                            (productRow.imageUrls || [])
                              .map((imagePath) => resolveProductImageUrl(imagePath))
                              .filter((imageUrl): imageUrl is string => Boolean(imageUrl));
                          return (
                            <div 
                              key={productRow.id} 
                              className="group rounded-md border border-gray-200 bg-white p-3 transition-colors hover:border-blue-300"
                            >
                              {/* Header */}
                              <div className="mb-2.5 flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  {productImage ? (
                                    <button
                                      type="button"
                                      onClick={() => openImageLightbox(lightboxTargets, 0)}
                                      className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded border border-gray-200"
                                    >
                                      <Image
                                        src={productImage}
                                        alt={`${productRow.name} image`}
                                        fill
                                        sizes="44px"
                                        className="object-cover"
                                        unoptimized
                                      />
                                    </button>
                                  ) : (
                                    <div className="flex-shrink-0 rounded bg-blue-100 p-1.5">
                                      <FaBox className="h-4 w-4 text-blue-600" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <h3 className="mb-0.5 line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-blue-600">
                                      {productRow.name}
                                    </h3>
                                    {productRow.attributeSummary && (
                                      <p className="mb-1 line-clamp-1 text-[11px] text-blue-700">
                                        {productRow.attributeSummary}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                                        {productRow.sku}
                                      </span>
                                      {productRow.sourceType === 'variation' && (
                                        <span className="text-[10px] font-semibold text-blue-600">VARIATION</span>
                                      )}
                                      {productRow.category && (
                                        <span className="text-xs text-gray-400 truncate">{productRow.category}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  stockStatus === 'good' ? 'bg-green-100 text-green-700 border border-green-200' :
                                  stockStatus === 'low' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                  'bg-red-100 text-red-700 border border-red-200'
                                }`}>
                                  {productRow.stock} units
                                </div>
                              </div>

                              {/* Metrics */}
                              <div className="mb-2.5 grid grid-cols-2 gap-2 rounded border border-gray-200 bg-gray-50 p-2">
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-1">Selling Price</p>
                                  <p className="text-sm font-semibold text-gray-900">Ksh {productRow.price.toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-1">Buying Price</p>
                                  <p className="text-sm font-semibold text-gray-700">Ksh {(productRow.cost || 0).toFixed(2)}</p>
                                </div>
                                <div className="col-span-2 pt-2 border-t border-gray-200">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-medium text-gray-500">Profit Margin</p>
                                    <p className={`text-sm font-semibold ${
                                      margin >= 30 ? 'text-green-600' : 
                                      margin >= 20 ? 'text-amber-600' : 
                                      margin >= 0 ? 'text-orange-600' : 'text-red-600'
                                    }`}>
                                      {margin.toFixed(1)}%
                                    </p>
                                  </div>
                                  <div className="mt-1.5 h-1 w-full rounded-full bg-gray-200">
                                    <div 
                                      className={`h-1 rounded-full transition-all ${
                                        margin >= 30 ? 'bg-green-500' : 
                                        margin >= 20 ? 'bg-amber-500' : 
                                        margin >= 0 ? 'bg-orange-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min(100, Math.max(0, margin))}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-1.5 border-t border-gray-200 pt-2">
                                {canEditProducts && parentProduct && (
                                  <button
                                    onClick={() => openEditModal(parentProduct)}
                                    className="flex flex-1 items-center justify-center gap-1 px-2.5 py-1.5 rounded border border-gray-200 bg-gray-100 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
                                    aria-label={`Edit ${productRow.name}`}
                                  >
                                    <FaEdit className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">{productRow.sourceType === 'variation' ? 'Parent' : 'Edit'}</span>
                                  </button>
                                )}
                                <FeatureGuard requiredFeature="api_access" showUpgradePrompt={false} fallback={
                                  <button 
                                    disabled 
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-300 text-sm font-medium cursor-not-allowed"
                                    aria-label="QR code (upgrade required)"
                                  >
                                    <FaQrcode className="w-3.5 h-3.5" />
                                  </button>
                                }>
                                  <button
                                    onClick={() => setQrCodeProductId(productRow.productId)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-green-200 bg-green-50 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                                    aria-label={`Generate QR code for ${productRow.name}`}
                                  >
                                    <FaQrcode className="w-3.5 h-3.5" />
                                  </button>
                                </FeatureGuard>
                                <button
                                  onClick={() => {
                                    if (parentProduct) {
                                      setSelectedProduct(parentProduct);
                                      setSelectedProductId(parentProduct.id);
                                    }
                                    setActiveTab('variations');
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-blue-200 bg-blue-50 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                                  title="Manage Variations"
                                  aria-label={`Manage variations for ${productRow.name}`}
                                >
                                  <FaLayerGroup className="w-3.5 h-3.5" />
                                </button>
                                {canDeleteProducts && productRow.sourceType === 'product' && (
                                  <button
                                    onClick={() => handleDelete(productRow.productId)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-red-200 bg-red-50 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                                    aria-label={`Delete ${productRow.name}`}
                                  >
                                    <FaTrash className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
                        <div
                          ref={tableParentRef}
                          className="overflow-x-auto"
                        >
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                                  Image
                                </th>
                                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                                  <button
                                    onClick={() => handleSort('name')}
                                    className="flex items-center gap-2 hover:text-gray-900"
                                  >
                                    Product Name
                                    {sortField === 'name' && (
                                      <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                  </button>
                                </th>
                                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                                  <button
                                    onClick={() => handleSort('sku')}
                                    className="flex items-center gap-2 hover:text-gray-900"
                                  >
                                    SKU
                                    {sortField === 'sku' && (
                                      <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                  </button>
                                </th>
                                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                                  <button
                                    onClick={() => handleSort('price')}
                                    className="flex items-center justify-end gap-2 hover:text-gray-900 ml-auto"
                                  >
                                    Selling Price
                                    {sortField === 'price' && (
                                      <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                  </button>
                                </th>
                                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                                  <button
                                    onClick={() => handleSort('cost')}
                                    className="flex items-center justify-end gap-2 hover:text-gray-900 ml-auto"
                                  >
                                    Buying Price
                                    {sortField === 'cost' && (
                                      <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                  </button>
                                </th>
                                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                                  <button
                                    onClick={() => handleSort('stock')}
                                    className="flex items-center justify-end gap-2 hover:text-gray-900 ml-auto"
                                  >
                                    Stock
                                    {sortField === 'stock' && (
                                      <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                  </button>
                                </th>
                                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                                  <button
                                    onClick={() => handleSort('margin')}
                                    className="flex items-center justify-end gap-2 hover:text-gray-900 ml-auto"
                                  >
                                    Margin
                                    {sortField === 'margin' && (
                                      <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                  </button>
                                </th>
                                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {sortedProducts.length === 0 ? (
                                <tr>
                                  <td colSpan={8} className="px-3 py-7 text-center">
                                    <div className="flex flex-col items-center">
                                      <FaBox className="w-12 h-12 text-gray-300 mb-3" />
                                      <p className="text-sm font-medium text-gray-900 mb-1">
                                        {isRestaurantTenant ? 'No menu items found' : 'No physical items found'}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {search
                                          ? 'Try adjusting your search'
                                          : isRestaurantTenant
                                            ? 'Add your first menu item to get started'
                                            : 'Add your first product to get started'}
                                      </p>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                sortedProducts.map((productRow) => {
                                  const parentProduct = productsById.get(productRow.productId);
                                  const price = typeof productRow.price === 'number' ? productRow.price : 0;
                                  const cost = typeof productRow.cost === 'number' ? productRow.cost : 0;
                                  const stock = typeof productRow.stock === 'number' ? productRow.stock : 0;
                                  const margin = price > 0 ? ((price - cost) / price) * 100 : null;
                                  const productImage = resolveProductImageUrl(productRow.imageUrl || null) || getPrimaryProductImage(parentProduct);
                                  const lightboxTargets =
                                    (productRow.imageUrls || [])
                                      .map((imagePath) => resolveProductImageUrl(imagePath))
                                      .filter((imageUrl): imageUrl is string => Boolean(imageUrl));

                                  return (
                                    <tr
                                      key={productRow.id}
                                      className="hover:bg-gray-50 transition-colors"
                                    >
                                      <td className="whitespace-nowrap px-3 py-2.5">
                                        {productImage ? (
                                          <button
                                            type="button"
                                            onClick={() => openImageLightbox(lightboxTargets, 0)}
                                            className="relative h-9 w-9 overflow-hidden rounded border border-gray-200"
                                          >
                                            <Image
                                              src={productImage}
                                              alt={`${productRow.name} image`}
                                              fill
                                              sizes="36px"
                                              className="object-cover"
                                              unoptimized
                                            />
                                          </button>
                                        ) : (
                                          <div className="flex h-9 w-9 items-center justify-center rounded bg-gray-100 text-gray-400">
                                            <FaBox className="h-3.5 w-3.5" />
                                          </div>
                                        )}
                                      </td>

                                      {/* Product Name */}
                                      <td className="whitespace-nowrap px-3 py-2.5">
                                        <div className="font-medium text-gray-900">{productRow.name || '-'}</div>
                                        {productRow.attributeSummary && (
                                          <div className="text-[11px] text-blue-700">{productRow.attributeSummary}</div>
                                        )}
                                      </td>

                                      {/* SKU */}
                                      <td className="whitespace-nowrap px-3 py-2.5">
                                        <div className="text-sm font-mono text-gray-600">{productRow.sku || '-'}</div>
                                      </td>

                                      {/* Selling Price */}
                                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                                        <div className="text-sm font-medium text-gray-900">
                                          {price > 0 ? `Ksh ${price.toFixed(2)}` : '-'}
                                        </div>
                                      </td>

                                      {/* Buying Price */}
                                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                                        <div className="text-sm text-gray-700">
                                          {cost > 0 ? `Ksh ${cost.toFixed(2)}` : '-'}
                                        </div>
                                      </td>

                                      {/* Stock */}
                                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                                        <div className={`text-sm font-medium ${stock > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                                          {stock}
                                        </div>
                                      </td>

                                      {/* Margin */}
                                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                                        {margin !== null ? (
                                          <div className={`text-sm font-semibold ${
                                            margin >= 30 ? 'text-green-600' 
                                              : margin >= 20 ? 'text-amber-600' 
                                              : margin >= 0 ? 'text-orange-600' 
                                              : 'text-red-600'
                                          }`}>
                                            {margin.toFixed(1)}%
                                          </div>
                                        ) : (
                                          <div className="text-sm text-gray-400">-</div>
                                        )}
                                      </td>

                                      {/* Actions */}
                                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          {canEditProducts && parentProduct && (
                                            <button
                                              onClick={() => openEditModal(parentProduct)}
                                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                              title={productRow.sourceType === 'variation' ? 'Edit Parent Product' : 'Edit'}
                                            >
                                              <FaEdit className="w-4 h-4" />
                                            </button>
                                          )}
                                          <button
                                            onClick={() => {
                                              if (parentProduct) {
                                                setSelectedProduct(parentProduct);
                                                setSelectedProductId(parentProduct.id);
                                              }
                                              setActiveTab('variations');
                                            }}
                                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                            title="Variations"
                                          >
                                            <FaLayerGroup className="w-4 h-4" />
                                          </button>
                                          <FeatureGuard requiredFeature="api_access" showUpgradePrompt={false} fallback={
                                            <button disabled className="p-2 text-gray-300 rounded-lg cursor-not-allowed" title="QR Code">
                                              <FaQrcode className="w-4 h-4" />
                                            </button>
                                          }>
                                            <button
                                              onClick={() => setQrCodeProductId(productRow.productId)}
                                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                              title="QR Code"
                                            >
                                              <FaQrcode className="w-4 h-4" />
                                            </button>
                                          </FeatureGuard>
                                          {canDeleteProducts && productRow.sourceType === 'product' && (
                                            <button
                                              onClick={() => handleDelete(productRow.productId)}
                                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                              title="Delete"
                                            >
                                              <FaTrash className="w-4 h-4" />
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Load More */}
                {hasMore && !loading && !isSearching && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={loadMoreProducts}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-1.5 rounded border border-blue-700 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                          {isRestaurantTenant ? 'Loading Menu Items...' : 'Loading Products...'}
                        </>
                      ) : (
                        <>
                          {isRestaurantTenant ? 'Load More Menu Items' : 'Load More Products'}
                          <FaChevronRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Empty State */}
                {products.length === 0 && !loading && !isSearching && (
                  <div className="text-center py-8 bg-white rounded border border-gray-200">
                    <FaBox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <h3 className="text-base font-medium text-gray-900 mb-1">
                      {isRestaurantTenant ? 'No menu items yet' : 'No products yet'}
                    </h3>
                    <p className="text-xs text-gray-500 mb-2">
                      {isRestaurantTenant
                        ? 'Get started by adding your first menu item.'
                        : 'Get started by adding your first product.'}
                    </p>
                    {canCreateProducts && (
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                      >
                        {isRestaurantTenant ? 'Add Your First Menu Item' : 'Add Your First Product'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* INVENTORY TAB */}
            {activeTab === 'inventory' && (
              <div>
                {inventoryLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading inventory...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Statistics */}
                    {inventoryStats && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                        <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                          <p className="text-[11px] font-semibold text-gray-500">{isRestaurantTenant ? 'Total Menu Items' : 'Total Products'}</p>
                          <p className="text-base font-bold text-blue-600">{inventoryStats.totalProducts}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2 border border-green-100">
                          <p className="text-[11px] font-semibold text-gray-500">Inventory Value</p>
                          <p className="text-base font-bold text-green-600">Ksh {inventoryStats.totalValue.toLocaleString()}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2 border border-green-100">
                          <p className="text-[11px] font-semibold text-gray-500">In Stock</p>
                          <p className="text-base font-bold text-green-600">{inventoryStats.inStock}</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-2 border border-red-100">
                          <p className="text-[11px] font-semibold text-gray-500">Out of Stock</p>
                          <p className="text-base font-bold text-red-600">{inventoryStats.outOfStock}</p>
                        </div>
                      </div>
                    )}

                    {/* Filters */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                      <div className="flex-1 flex gap-1">
                        <div className="relative w-full max-w-xs">
                          <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                          <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={isRestaurantTenant ? 'Search menu items...' : 'Search products...'}
                            className="w-full pl-7 pr-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 text-xs"
                          />
                        </div>
                        <select
                          value={stockFilter}
                          onChange={e => setStockFilter(e.target.value)}
                          className="px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 text-xs font-semibold"
                        >
                          <option value="all">All Stock</option>
                          <option value="in">In Stock</option>
                          <option value="out">Out of Stock</option>
                          <option value="low">Low Stock</option>
                        </select>
                        {categoryOptions.length > 0 && (
                          <select
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                            className="px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 text-xs font-semibold"
                          >
                            <option value="all">All Categories</option>
                            {categoryOptions.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {isRestaurantTenant && (
                          <div className="hidden xl:flex items-center gap-1 mr-1">
                            {quickCategoryChips.slice(0, 6).map((cat) => (
                              <button
                                key={`filter-${cat}`}
                                type="button"
                                onClick={() => setCategoryFilter(cat)}
                                className={`rounded px-2 py-1 text-[11px] font-semibold border ${
                                  categoryFilter === cat
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={exportInventory}
                          className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold shadow"
                        >
                          <FaDownload className="w-3 h-3" />
                          Export
                        </button>
                      </div>
                    </div>

                    {/* Inventory Grid */}
                    {currentInventoryProducts.length === 0 ? (
                      <div className="text-center py-8">
                        <FaBox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <h3 className="text-base font-semibold text-gray-900 mb-1">
                          {isRestaurantTenant ? 'No menu items found' : 'No products found'}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {inventoryData && inventoryData.length === 0
                            ? isRestaurantTenant
                              ? 'No tracked inventory found yet. Menu items appear here when inventory is enabled for them.'
                              : 'No inventory items found. Products need to have inventory entries to appear here.'
                            : "Try adjusting your search or filters"}
                        </p>
                      </div>
                    ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mb-3">
                    {currentInventoryProducts.map(item => {
                      const product = item.product;
                      const quantity = item.quantity;
                      const cost = product?.cost || 0;
                      const price = product?.price || 0;
                      const profitPerUnit = price - cost;
                      const totalValue = quantity * price;
                      const totalProfit = quantity * profitPerUnit;
                      const marginPercent = price > 0 ? ((profitPerUnit / price) * 100) : 0;
                      const stockStatus = getStockStatus(quantity);

                      return (
                        <div key={item.id} className="rounded border border-gray-200 bg-white p-2 transition-colors hover:border-gray-300">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <h3 className="font-semibold text-gray-900 text-sm">{product?.name}</h3>
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-gray-500">{product?.category || 'Uncategorized'}</span>
                                {product?.sku && (
                                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded">{product.sku}</span>
                                )}
                              </div>
                            </div>
                            <div className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${stockStatus.color} ${stockStatus.bg}`}>
                              {stockStatus.text}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[11px] mb-1">
                            <div>
                              <span className="text-gray-400">Stock</span>
                              <div className="font-bold">{quantity}</div>
                            </div>
                            <div>
                              <span className="text-gray-400">Selling Price</span>
                              <div className="font-bold">Ksh {price.toFixed(2)}</div>
                            </div>
                            <div>
                              <span className="text-gray-400">Buying Price</span>
                              <div className="font-bold">Ksh {cost.toFixed(2)}</div>
                            </div>
                            <div>
                              <span className="text-gray-400">Margin</span>
                              <div className={`font-bold ${marginPercent >= 30 ? 'text-green-600' : marginPercent >= 20 ? 'text-yellow-600' : 'text-orange-600'}`}>
                                {marginPercent.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-[11px] border-t pt-1 mb-1">
                            <span className="text-gray-400">Total Value</span>
                            <span className="font-bold text-green-600">Ksh {totalValue.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] mb-1">
                            <span className="text-gray-400">Total Profit</span>
                            <span className={`font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Ksh {totalProfit.toFixed(2)}</span>
                          </div>
                          {canEditInventory && (
                            <button
                              onClick={() => {
                                const prod = products.find(p => p.id === product?.id);
                                if (prod) openStockModal(prod);
                              }}
                              className="w-full px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-[11px] font-semibold mt-1"
                            >
                              <FaEdit className="w-3 h-3 inline mr-1" />
                              Update Stock
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination */}
                {inventoryTotalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-3">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2 py-1 border border-gray-200 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="mx-2 text-xs text-gray-600">
                      Page {currentPage} of {inventoryTotalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(inventoryTotalPages, p + 1))}
                      disabled={currentPage === inventoryTotalPages}
                      className="px-2 py-1 border border-gray-200 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                )}
                  </>
                )}
              </div>
            )}

            {/* ADVANCED TAB */}
            {activeTab === 'advanced' && (
              <div>
                {advancedInventoryLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading advanced inventory...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Statistics */}
                    {advancedStats && (
                      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                        <div className="rounded border border-gray-200 bg-white p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">{isRestaurantTenant ? 'Total Menu Items' : 'Total Products'}</p>
                              <p className="text-lg font-semibold text-gray-900">{advancedStats.totalProducts}</p>
                            </div>
                            <div className="rounded bg-blue-50 p-2">
                              <FaBox className="h-4 w-4 text-blue-600" />
                            </div>
                          </div>
                        </div>
                        <div className="rounded border border-gray-200 bg-white p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Total Stock</p>
                              <p className="text-lg font-semibold text-gray-900">{advancedStats.totalStock.toLocaleString()}</p>
                            </div>
                            <div className="rounded bg-green-50 p-2">
                              <FaWarehouse className="h-4 w-4 text-green-600" />
                            </div>
                          </div>
                        </div>
                        <div className="rounded border border-gray-200 bg-white p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Inventory Value</p>
                              <p className="text-lg font-semibold text-gray-900">Ksh {advancedStats.totalValue.toLocaleString()}</p>
                            </div>
                            <div className="rounded bg-purple-50 p-2">
                              <FaCalculator className="h-4 w-4 text-purple-600" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                {/* Simplified Advanced Inventory View */}
                <div className="rounded border border-gray-200 bg-white">
                  <div className="border-b border-gray-200 p-3">
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Inventory Overview</h3>
                      <div className="flex flex-1 sm:flex-initial gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-initial sm:min-w-[200px]">
                          <FaSearch className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={isRestaurantTenant ? 'Search menu items...' : 'Search products...'}
                            className="w-full rounded border border-gray-300 py-1.5 pl-8 pr-2 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <select
                          value={stockFilter}
                          onChange={e => setStockFilter(e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1.5 text-xs font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">All Stock</option>
                          <option value="low">Low Stock</option>
                          <option value="out">Out of Stock</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">{isRestaurantTenant ? 'Menu Item' : 'Product'}</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">Stock</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">Status</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentAdvancedInventory.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-12 text-center">
                              <div className="flex flex-col items-center">
                                <FaBox className="w-12 h-12 text-gray-300 mb-3" />
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                  {isRestaurantTenant ? 'No menu items found' : 'No products found'}
                                </p>
                                <p className="text-xs text-gray-500">Try adjusting your search or filters</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          currentAdvancedInventory.map((item) => {
                            const status = getAdvancedStockStatus(item);
                            return (
                              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="whitespace-nowrap px-3 py-2">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{item.product?.name}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{item.product?.sku}</div>
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-2">
                                  <span className={`text-sm font-semibold ${status.color}`}>{item.quantity || 0}</span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-2">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                                    {status.icon}
                                    {status.text}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-xs font-medium">
                                  {canEditInventory && (
                                    <button
                                      onClick={() => {
                                        const prod = products.find(p => p.id === item.product?.id) || 
                                                   (advancedProductsData || []).find((p: Product) => p.id === item.product?.id);
                                        if (prod) {
                                          setModalProduct(prod);
                                          setModalQuantity(item.quantity || 0);
                                          setShowStockModal(true);
                                        }
                                      }}
                                      className="text-blue-600 hover:text-blue-900 font-medium"
                                      title="Update Stock"
                                    >
                                      <FaEdit className="w-4 h-4" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {advancedTotalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-3 py-2">
                      <div className="text-xs text-gray-600">
                        Showing {advancedStartIndex + 1} to {Math.min(advancedEndIndex, filteredAdvancedInventory.length)} of {filteredAdvancedInventory.length} products
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="rounded border border-gray-300 px-2 py-1 text-xs font-medium transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="px-2 py-1 text-xs font-medium text-gray-700">
                          Page {currentPage} of {advancedTotalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(advancedTotalPages, p + 1))}
                          disabled={currentPage === advancedTotalPages}
                          className="rounded border border-gray-300 px-2 py-1 text-xs font-medium transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                  </>
                )}
              </div>
            )}

            {/* ATTRIBUTES TAB */}
            {activeTab === 'attributes' && (
              <div className="space-y-2.5">
                {/* Header Section */}
                <div className="rounded border border-gray-200 bg-gray-50 p-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gray-100 rounded-lg">
                      <FaPalette className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">Product Attributes</h2>
                    </div>
                  </div>
                </div>

                {/* Attributes Content */}
                <div className="overflow-hidden rounded border border-gray-200 bg-white">
                  <ProductAttributesManager />
                </div>
              </div>
            )}

            {/* VARIATIONS TAB */}
            {activeTab === 'variations' && (
              <div className="space-y-2.5">
                {/* Header Section */}
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Variations</h2>
                    <p className="mt-0.5 text-xs text-gray-500">Create and manage product variants</p>
                  </div>
                  {selectedProduct && (
                    <button
                      onClick={() => {
                        setSelectedProduct(null);
                        setSelectedProductId(null);
                      }}
                      className="rounded px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                    >
                      Change Product
                    </button>
                  )}
                </div>

                {/* Product Selector */}
                {!selectedProduct && (
                  <div className="rounded border border-gray-200 bg-white p-3">
                    <label className="mb-2 block text-xs font-medium text-gray-700">
                      Select a product
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedProductId || ''}
                        onChange={(e) => {
                          const productId = e.target.value;
                          if (productId) {
                            const allProducts = activeTab === 'variations' && variationsProductsData 
                              ? variationsProductsData 
                              : products;
                            const product = allProducts.find(p => p.id === productId);
                            if (product) {
                              setSelectedProduct(product);
                              setSelectedProductId(product.id);
                            }
                          }
                        }}
                        className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Choose a product...</option>
                        {(activeTab === 'variations' && variationsProductsData ? variationsProductsData : products).map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setActiveTab('products')}
                        className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        <FaPlus className="h-3.5 w-3.5" />
                        New Product
                      </button>
                    </div>
                    {((activeTab === 'variations' && variationsProductsData ? variationsProductsData : products).length === 0) && (
                      <p className="mt-3 text-sm text-gray-500">
                        No products available. Create a product first.
                      </p>
                    )}
                  </div>
                )}

                {/* Selected Product Info */}
                {selectedProduct && (
                  <div className="rounded border border-gray-200 bg-white p-2.5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{selectedProduct.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{selectedProduct.sku}</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('products')}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Details →
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <div>
                        <span className="text-gray-500">Price:</span>
                        <span className="ml-1 font-medium text-gray-900">Ksh {selectedProduct.price.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Cost:</span>
                        <span className="ml-1 font-medium text-gray-700">Ksh {(selectedProduct.cost || 0).toFixed(2)}</span>
                      </div>
                      {selectedProduct.price > 0 && selectedProduct.cost && (
                        <div>
                          <span className="text-gray-500">Margin:</span>
                          <span className={`ml-1 font-medium ${
                            ((selectedProduct.price - selectedProduct.cost) / selectedProduct.price * 100) >= 30 
                              ? 'text-green-600' 
                              : ((selectedProduct.price - selectedProduct.cost) / selectedProduct.price * 100) >= 20 
                                ? 'text-amber-600' 
                                : 'text-orange-600'
                          }`}>
                            {((selectedProduct.price - selectedProduct.cost) / selectedProduct.price * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Variations Content */}
                {selectedProduct ? (
                  <VariationManager
                    productId={selectedProduct.id}
                    baseSku={selectedProduct.sku}
                    basePrice={selectedProduct.price}
                    baseCost={selectedProduct.cost}
                    branchId={selectedBranchId}
                  />
                ) : (
                  <div className="rounded border border-gray-200 bg-white p-5">
                    <div className="text-center max-w-md mx-auto">
                      <FaLayerGroup className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                      <h3 className="mb-1 text-sm font-medium text-gray-900">Select a product to manage variations</h3>
                      <p className="text-xs text-gray-500">
                        Choose a product from the dropdown above to create and manage its variations.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {showCategoryManager && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3">
            <div className="w-full max-w-lg rounded-md border border-gray-200 bg-white p-4 shadow-lg">
              <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Manage Menu Categories</h3>
                  <p className="text-xs text-gray-500">Create categories that staff will use in menu management.</p>
                </div>
                <button
                  onClick={() => {
                    setShowCategoryManager(false);
                    setCategoryError('');
                    setEditingCategoryId(null);
                    setEditingCategoryName('');
                  }}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <FaTimes className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-3 flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name"
                  className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={categorySaving || !newCategoryName.trim()}
                  className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  Add
                </button>
              </div>

              {categoryError && (
                <div className="mb-3 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">
                  {categoryError}
                </div>
              )}

              <div className="max-h-64 space-y-2 overflow-y-auto">
                {managedCategories.length === 0 ? (
                  <p className="text-xs text-gray-500">No categories yet. Add your first one above.</p>
                ) : (
                  managedCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center gap-2 rounded border border-gray-200 bg-gray-50 p-2"
                    >
                      {editingCategoryId === cat.id ? (
                        <input
                          type="text"
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
                        />
                      ) : (
                        <div className="flex-1 text-xs font-medium text-gray-800">{cat.name}</div>
                      )}

                      {editingCategoryId === cat.id ? (
                        <>
                          <button
                            type="button"
                            onClick={handleUpdateCategory}
                            disabled={categorySaving || !editingCategoryName.trim()}
                            className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategoryId(null);
                              setEditingCategoryName('');
                            }}
                            className="rounded border border-gray-300 px-2 py-1 text-[11px] font-semibold text-gray-700"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategoryId(cat.id);
                              setEditingCategoryName(cat.name);
                            }}
                            className="rounded border border-gray-300 px-2 py-1 text-[11px] font-semibold text-gray-700"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.id)}
                            disabled={categorySaving}
                            className="rounded border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stock Update Modal (Inventory Tab) */}
        {showStockModal && modalProduct && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="relative mx-2 w-full max-w-xs rounded-md border border-gray-200 bg-white p-3 shadow-lg">
              <button
                onClick={() => setShowStockModal(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              >
                <FaTimesCircle className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                {getInv(modalProduct.id) ? 'Edit Product & Stock' : 'Add Product & Stock'}
              </h2>
              <form onSubmit={handleStockSave}>
                <div className="mb-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    value={modalProductFields.name ?? ""}
                    onChange={e => setModalProductFields(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-2 py-1 border border-gray-200 rounded bg-white text-gray-900 font-semibold text-xs"
                    required
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    value={modalProductFields.sku ?? ""}
                    onChange={e => setModalProductFields(f => ({ ...f, sku: e.target.value }))}
                    className="w-full px-2 py-1 border border-gray-200 rounded bg-white text-gray-900 font-semibold text-xs"
                  />
                </div>
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Selling Price</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={modalProductFields.price ?? ""}
                      onChange={e => setModalProductFields(f => ({ ...f, price: e.target.value === "" ? undefined : Number(e.target.value) }))}
                      className="w-full px-2 py-1 border border-gray-200 rounded bg-white text-gray-900 font-semibold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Buying Price</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={modalProductFields.cost ?? ""}
                      onChange={e => setModalProductFields(f => ({ ...f, cost: e.target.value === "" ? undefined : Number(e.target.value) }))}
                      className="w-full px-2 py-1 border border-gray-200 rounded bg-white text-gray-900 font-semibold text-xs"
                    />
                  </div>
                </div>
                <div className="mb-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={modalProductFields.category ?? ""}
                    onChange={e => setModalProductFields(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-2 py-1 border border-gray-200 rounded bg-white text-gray-900 font-semibold text-xs"
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Measurement Unit</label>
                  <select
                    value={modalProductFields.unitAbbreviation ?? ""}
                    onChange={e => setModalProductFields(f => ({ ...f, unitAbbreviation: e.target.value }))}
                    className="w-full px-2 py-1 border border-gray-200 rounded bg-white text-gray-900 font-semibold text-xs"
                    required
                  >
                    <option value="">Select unit</option>
                    {classificationUnits.map((unit: any) => (
                      <option key={unit.id} value={unit.abbreviation}>{unit.name} ({unit.abbreviation})</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={0}
                    value={modalQuantity}
                    onChange={e => setModalQuantity(Number(e.target.value))}
                    className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 font-semibold text-xs"
                    required
                  />
                </div>
                {modalError && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-xs font-semibold">
                    {modalError}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button 
                    type="button" 
                    className="px-3 py-1 border border-gray-200 rounded text-gray-700 hover:bg-gray-50 font-semibold text-xs" 
                    onClick={() => setShowStockModal(false)} 
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold text-xs" 
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Stock Movement Modal (Advanced Tab) */}
        {showMovementModal && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-xs mx-2">
              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900">Record Stock Movement</h2>
                <button
                  onClick={() => setShowMovementModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimesCircle className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleStockMovement} className="p-3 space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
                  <input
                    type="text"
                    value={selectedProduct.name}
                    disabled
                    className="w-full px-2 py-1 border border-gray-200 rounded bg-gray-50 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Movement Type</label>
                  <select
                    value={movementForm.type}
                    onChange={e =>
                      setMovementForm(prev => ({
                        ...prev,
                        type: e.target.value as 'in' | 'out' | 'adjustment' | 'transfer'
                      }))
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  >
                    <option value="in">Stock In</option>
                    <option value="out">Stock Out</option>
                    <option value="adjustment">Adjustment</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={movementForm.quantity}
                    onChange={e => setMovementForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                  <select
                    value={movementForm.location}
                    onChange={e => setMovementForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    required
                  >
                    <option value="">Select Location</option>
                    {locations.map(location => (
                      <option key={location.id} value={location.name}>{location.name}</option>
                    ))}
                  </select>
                </div>
                {movementForm.type === 'transfer' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Destination Location</label>
                    <select
                      value={movementForm.destinationLocation}
                      onChange={e => setMovementForm(prev => ({ ...prev, destinationLocation: e.target.value }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      required
                    >
                      <option value="">Select Destination</option>
                      {locations.filter(loc => loc.name !== movementForm.location).map(location => (
                        <option key={location.id} value={location.name}>{location.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Reason (Optional)</label>
                  <textarea
                    value={movementForm.reason}
                    onChange={e => setMovementForm(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    rows={2}
                    placeholder="Enter reason for this movement..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMovementModal(false)}
                    className="px-2 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                  >
                    Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Alert Settings Modal */}
        {showAlertSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-xs mx-2">
              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900">Alert Settings</h2>
                <button
                  onClick={() => setShowAlertSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimesCircle className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleUpdateAlertSettings} className="p-3 space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Low Stock Threshold</label>
                  <input
                    type="number"
                    min="0"
                    value={alertSettings.lowStockThreshold}
                    onChange={e => setAlertSettings(prev => ({ ...prev, lowStockThreshold: Number(e.target.value) }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Alert when stock falls below this number</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Critical Stock Threshold</label>
                  <input
                    type="number"
                    min="0"
                    value={alertSettings.criticalStockThreshold}
                    onChange={e => setAlertSettings(prev => ({ ...prev, criticalStockThreshold: Number(e.target.value) }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Critical alert when stock falls below this number</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="emailAlerts"
                      checked={alertSettings.enableEmailAlerts}
                      onChange={e => setAlertSettings(prev => ({ ...prev, enableEmailAlerts: e.target.checked }))}
                      className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="emailAlerts" className="ml-2 block text-xs text-gray-900">
                      Enable Email Alerts
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="pushAlerts"
                      checked={alertSettings.enablePushAlerts}
                      onChange={e => setAlertSettings(prev => ({ ...prev, enablePushAlerts: e.target.checked }))}
                      className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="pushAlerts" className="ml-2 block text-xs text-gray-900">
                      Enable Push Notifications
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAlertSettings(false)}
                    className="px-2 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Location Modal */}
        {showLocationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-xs mx-2">
              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900">Add Location</h2>
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimesCircle className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleCreateLocation} className="p-3 space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Location Name</label>
                  <input
                    type="text"
                    value={locationForm.name}
                    onChange={e => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Location Type</label>
                  <select
                    value={locationForm.type}
                    onChange={e => setLocationForm(prev => ({
                      ...prev,
                      type: e.target.value as 'warehouse' | 'store' | 'showroom'
                    }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  >
                    <option value="warehouse">Warehouse</option>
                    <option value="store">Store</option>
                    <option value="showroom">Showroom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Address (Optional)</label>
                  <textarea
                    value={locationForm.address}
                    onChange={e => setLocationForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    rows={2}
                    placeholder="Enter location address..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLocationModal(false)}
                    className="px-2 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* QR Code Modal */}
        {qrCodeProductId && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2" onClick={() => setQrCodeProductId(null)}>
            <div className="bg-white rounded shadow-xl p-3 max-w-xs w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-gray-900">Product QR Code</h3>
                <button
                  onClick={() => setQrCodeProductId(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
              <div className="text-center">
                <Image
                  src={`${API_BASE_URL}/products/${qrCodeProductId}/qr`}
                  alt="Product QR Code"
                  width={192}
                  height={192}
                  className="w-48 h-48 mx-auto mb-4 border border-gray-200 rounded"
                />
                <div className="flex gap-2">
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
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                  >
                    <FaPrint className="w-3 h-3" />
                    Print
                  </button>
                  <button
                    onClick={() => setQrCodeProductId(null)}
                    className="flex-1 px-2 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {lightboxImages.length > 0 && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3"
            onClick={() => {
              setLightboxImages([]);
              setLightboxIndex(0);
            }}
          >
            <div
              className="relative w-full max-w-3xl rounded border border-gray-700 bg-black p-2"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between text-xs text-white/80">
                <span>{lightboxIndex + 1} / {lightboxImages.length}</span>
                <button
                  type="button"
                  onClick={() => {
                    setLightboxImages([]);
                    setLightboxIndex(0);
                  }}
                  className="rounded border border-white/30 px-2 py-1 text-white hover:bg-white/10"
                >
                  Close
                </button>
              </div>
              <div className="relative h-[60vh] w-full overflow-hidden rounded">
                <Image
                  src={lightboxImages[lightboxIndex]}
                  alt={`Image ${lightboxIndex + 1}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 900px"
                  className="object-contain"
                  unoptimized
                />
              </div>
              {lightboxImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded border border-white/30 bg-black/60 px-2 py-1 text-xs text-white hover:bg-black/80"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightboxIndex((prev) => (prev + 1) % lightboxImages.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-white/30 bg-black/60 px-2 py-1 text-xs text-white hover:bg-black/80"
                  >
                    Next
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </AuthGuard>
  );
}
