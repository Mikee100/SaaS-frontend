"use client";
/**
 * Unified Products & Inventory Management Page
 * Combines: Products List, Basic Inventory, and Advanced Inventory
 */
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { apiGet, apiPost, apiDelete, apiPut } from "@/utils/api";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useBranches } from '@/hooks/useBranches';
import FeatureGuard from '@/components/FeatureGuard';
import AuthGuard from '@/components/AuthGuard';
import { 
  FaBox, FaSearch, FaTrash, FaEdit, FaQrcode, FaPlus, FaExclamationTriangle, 
  FaCheckCircle, FaTimesCircle, FaArrowUp, FaArrowDown, FaHistory, FaBell, 
  FaChartLine, FaMapMarkerAlt, FaCalculator, FaCog, FaDownload, FaWarehouse,
  FaStore, FaClipboardList, FaSortAmountDown, FaPrint, FaTimes, FaChevronRight,
  FaLayerGroup, FaSync, FaPalette
} from 'react-icons/fa';
import ProductAttributesManager from '@/components/products/ProductAttributesManager';
import VariationManager from '@/components/products/VariationManager';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import { useBranch } from "@/contexts/BranchContext";
import Image from 'next/image';
import API_BASE_URL from '../../../config/apiConfig';
import * as XLSX from 'xlsx';

// Types
interface Product {
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

type TabType = 'products' | 'inventory' | 'advanced' | 'attributes' | 'variations';
type AdvancedSubTab = 'overview' | 'movements' | 'alerts' | 'forecasting' | 'locations';

export default function UnifiedProductsInventoryPage() {
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
  const [redirectToVariations, setRedirectToVariations] = useState(false);

  // Inventory tab states
  const [stockFilter, setStockFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showStockModal, setShowStockModal] = useState(false);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [modalQuantity, setModalQuantity] = useState(0);
  const [modalProductFields, setModalProductFields] = useState<Partial<Product>>({});
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

  // Permission checks
  const canViewProducts = hasPermission(user, 'view_products');
  const canCreateProducts = hasPermission(user, 'create_products');
  const canEditProducts = hasPermission(user, 'edit_products');
  const canDeleteProducts = hasPermission(user, 'delete_products');
  const canViewInventory = hasPermission(user, 'view_inventory');
  const canEditInventory = hasPermission(user, 'edit_inventory');

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
      const data = await apiGet(`/products?page=${currentPage}&limit=${itemsPerPage}&branchId=${selectedBranchId}${searchParam}`, { 'x-branch-id': selectedBranchId }) as { products: Product[]; pagination: { total: number; page: number; limit: number; pageCount: number } };
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
      if (existingInv) {
        return existingInv;
      }
      // Create synthetic inventory item for product without inventory entry
      return {
        id: `synth_${product.id}`,
        productId: product.id,
        quantity: product.stock || 0,
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
  }, [activeTab, inventoryData, inventoryProductsData, products, search, stockFilter, categoryFilter]);

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
        if (existingInv) return existingInv;
        return {
          id: `synth_${product.id}`,
          productId: product.id,
          quantity: product.stock || 0,
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
  }, [activeTab, inventoryData, advancedInventoryData, inventoryProductsData, products]);

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
      if (existingAdv) {
        return existingAdv;
      }
      // Create synthetic advanced inventory item for product without advanced entry
      return {
        id: `synth_adv_${product.id}`,
        productId: product.id,
        quantity: product.stock || 0,
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
  }, [activeTab, advancedInventoryData, advancedProductsData, products, search, locationFilter, stockFilter]);

  // Sort products
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const aValue = a[sortField as keyof Product] || '';
      const bValue = b[sortField as keyof Product] || '';

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [products, sortField, sortDirection]);

  const loading = productsLoading || inventoryLoading || branchesLoading || advancedInventoryLoading;
  const isSearching = search !== debouncedSearch;

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

    const wantsVariations = formData.get("hasVariations") === "on";

    setSaving(true);
    setError("");
    try {
      const created = await apiPost("/products", {
        name: formData.get("name"),
        sku: formData.get("sku"),
        price: parseFloat(formData.get("price") as string),
        cost: parseFloat(formData.get("cost") as string) || 0,
        stock: parseInt(formData.get("stock") as string),
        description: formData.get("description"),
        supplier: formData.get("supplier"),
        branchId: selectedBranchId,
      }, { 'x-branch-id': selectedBranchId || '' }) as Product;
      
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
          stock: parseInt(formData.get("stock") as string),
          description: formData.get("description"),
          supplier: formData.get("supplier"),
        }, { 'x-branch-id': selectedBranchId || '' });
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
    setShowAddForm(false);
  };

  function openEditModal(product: Product) {
    setEditProduct(product);
    setShowAddForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    await apiDelete(`/products/${id}`, { 'x-branch-id': selectedBranchId || '' });
    queryClient.invalidateQueries({ queryKey: ['products', selectedBranchId] });
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
      const data = await apiGet(`/products?page=${nextPage}&limit=${itemsPerPage}&branchId=${selectedBranchId}${searchParam}`) as { products: Product[]; pagination: unknown };

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

  const exportInventory = () => {
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

  // Helper to flatten product fields for table display
  function flattenProduct(product: Product): { [key: string]: string | number | boolean | undefined; margin: string } {
    const { customFields, supplier, ...rest } = product;
    const flat: { [key: string]: string | number | boolean | undefined; margin: string } = { ...rest, ...(customFields || {}), margin: '' };

    if (supplier) {
      flat.supplier = supplier.name;
    }

    if (product.price > 0) {
      flat.margin = ((product.price - product.cost) / product.price * 100).toFixed(1);
    } else {
      flat.margin = 'N/A';
    }

    return flat;
  }

  const allColumns = useMemo(() => {
    const allColumnsSet = new Set<string>();
    products.forEach((p) => {
      Object.keys(flattenProduct(p)).forEach((k) => {
        if (!['id', 'createdAt', 'updatedAt', 'tenantId', 'customFields'].includes(k)) {
          allColumnsSet.add(k);
        }
      });
    });
    allColumnsSet.add('margin');
    return Array.from(allColumnsSet);
  }, [products]);

  const visibleColumns = allColumns;

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Usage Warning Banner */}
          {isNearLimit && showUsageBanner && activeTab === 'products' && (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-lg animate-in slide-in-from-top-5">
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 rounded-xl shadow-lg backdrop-blur-sm">
                <div className="flex-shrink-0">
                  <FaExclamationTriangle className="text-amber-600 w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-amber-900 text-sm">Approaching Product Limit</p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    {limits?.usage.products.current} of {limits?.usage.products.limit} products used
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href="/settings/billing"
                    className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg text-sm font-semibold hover:from-amber-700 hover:to-orange-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    Upgrade
                  </a>
                  <button
                    onClick={() => setShowUsageBanner(false)}
                    className="p-2 text-amber-700 hover:text-amber-900 rounded-lg hover:bg-amber-100 transition-colors"
                    title="Dismiss"
                    aria-label="Dismiss banner"
                  >
                    <FaTimes className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header Section */}
          <div className="mb-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="flex-shrink-0 p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-sm">
                    <FaBox className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-lg font-semibold text-gray-900">Products & Inventory</h1>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1 border border-gray-200">
                    <FaStore className="w-3.5 h-3.5 text-gray-500" />
                    <label className="text-xs font-medium text-gray-700 whitespace-nowrap">Branch:</label>
                    {branchesLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                        <span className="text-sm text-gray-400">Loading...</span>
                      </div>
                    ) : (
                      <select
                        value={selectedBranchId || ''}
                        onChange={e => setSelectedBranchId(e.target.value)}
                        className="bg-white border-0 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 rounded-md cursor-pointer min-w-[120px]"
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50/50">
              <nav className="flex overflow-x-auto scrollbar-hide -mb-px" role="tablist">
                {[
                  { id: 'products', label: 'Products', icon: FaBox, count: products.length },
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
                    className={`group relative flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-all duration-200 whitespace-nowrap ${
                      activeTab === id
                        ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 transition-transform ${activeTab === id ? 'scale-110' : ''}`} />
                    <span>{label}</span>
                    {count !== undefined && count > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
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
            <div className="p-6">
              {/* PRODUCTS TAB */}
              {activeTab === 'products' && (
                <div className="space-y-6">
                  {/* Products Header Actions */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                          <span className="text-sm font-bold text-blue-700">
                            {loading || isSearching ? (
                              <span className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent"></div>
                                Loading...
                              </span>
                            ) : (
                              `${products.length} Product${products.length !== 1 ? 's' : ''}`
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Per page:</label>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value, 10))}
                          className="bg-white border-0 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 rounded-md cursor-pointer"
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
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="relative flex-1 min-w-[280px] max-w-md">
                        <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                        <input
                          type="text"
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          placeholder="Search products by name, SKU, or description..."
                          className="w-full pl-11 pr-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 placeholder-gray-400"
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
                        onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                        className="px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 flex items-center gap-2 text-sm font-medium transition-all shadow-sm hover:shadow"
                        aria-label={`Switch to ${viewMode === 'grid' ? 'table' : 'grid'} view`}
                      >
                        {viewMode === 'grid' ? <FaSortAmountDown className="w-4 h-4" /> : <FaLayerGroup className="w-4 h-4" />}
                        <span className="hidden sm:inline">{viewMode === 'grid' ? 'Table' : 'Grid'}</span>
                      </button>
                      {canCreateProducts && (
                        <button
                          onClick={() => setShowAddForm(true)}
                          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2 text-sm font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          aria-label="Add new product"
                        >
                          <FaPlus className="w-4 h-4" />
                          <span className="hidden sm:inline">Add Product</span>
                          <span className="sm:hidden">Add</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Add/Edit Product Form */}
                  {showAddForm && (
                    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6 mb-6 animate-in slide-in-from-top-5">
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                            <FaBox className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-gray-900">
                              {editProduct ? 'Edit Product' : 'Add New Product'}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {editProduct ? 'Update product information' : 'Create a new product in your catalog'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setShowAddForm(false);
                            resetForm();
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                          aria-label="Close form"
                        >
                          <FaTimes className="w-5 h-5" />
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

                      <form onSubmit={editProduct ? handleEditProduct : handleAddProduct} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Product Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              name="name"
                              defaultValue={editProduct?.name || ''}
                              required
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white text-gray-900"
                              placeholder="Enter product name"
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
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white text-gray-900"
                              placeholder="Enter SKU"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Selling Price <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                              <input
                                type="number"
                                name="price"
                                step="0.01"
                                min="0"
                                defaultValue={editProduct?.price || ''}
                                required
                                className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white text-gray-900"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Buying Price</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                              <input
                                type="number"
                                name="cost"
                                step="0.01"
                                min="0"
                                defaultValue={editProduct?.cost || ''}
                                className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white text-gray-900"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Stock Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              name="stock"
                              min="0"
                              defaultValue={editProduct?.stock || ''}
                              required
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white text-gray-900"
                              placeholder="0"
                            />
                          </div>
                          <div className="md:col-span-2 flex items-start gap-3 pt-2">
                            <input
                              id="hasVariations"
                              type="checkbox"
                              name="hasVariations"
                              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div>
                              <label
                                htmlFor="hasVariations"
                                className="block text-sm font-semibold text-gray-700"
                              >
                                This product has variations (sizes, colors, etc.)
                              </label>
                              <p className="text-xs text-gray-500 mt-0.5">
                                We&rsquo;ll take you to the Variations tab after creating this product so you can
                                quickly generate options like Size and Color using your attributes.
                              </p>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                            <input
                              type="text"
                              name="category"
                              defaultValue={editProduct?.category || ''}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white text-gray-900"
                              placeholder="Optional category"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                          <textarea
                            name="description"
                            defaultValue={editProduct?.description || ''}
                            rows={4}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white text-gray-900 resize-none"
                            placeholder="Enter product description (optional)"
                          />
                        </div>
                        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                          <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 text-sm font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
                                    <span>Update Product</span>
                                  </>
                                ) : (
                                  <>
                                    <FaPlus className="w-4 h-4" />
                                    <span>Create Product</span>
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
                            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 text-sm font-semibold transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Products Content */}
                  {loading || isSearching ? (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {Array.from({ length: 8 }).map((_, index) => (
                          <div key={`skeleton-${index}`} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 p-5 animate-pulse">
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
                    <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 shadow-sm p-12">
                      <div className="text-center">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <FaBox className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No products found</h3>
                        <p className="text-sm text-gray-600 mb-6">
                          {search ? 'Try adjusting your search criteria' : 'Get started by adding your first product'}
                        </p>
                        {canCreateProducts && !search && (
                          <button
                            onClick={() => setShowAddForm(true)}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 text-sm font-semibold inline-flex items-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          >
                            <FaPlus className="w-4 h-4" />
                            Add Your First Product
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                  <>
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {sortedProducts.map((product) => {
                          const margin = product.price > 0 ? ((product.price - (product.cost || 0)) / product.price * 100) : 0;
                          const stockStatus = product.stock > 10 ? 'good' : product.stock > 0 ? 'low' : 'out';
                          return (
                            <div 
                              key={product.id} 
                              className="group bg-white rounded-xl border-2 border-gray-200 p-5 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1"
                            >
                              {/* Header */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className="flex-shrink-0 p-2.5 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg group-hover:from-blue-200 group-hover:to-indigo-200 transition-colors">
                                    <FaBox className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-gray-900 text-base mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                      {product.name}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        {product.sku}
                                      </span>
                                      {product.category && (
                                        <span className="text-xs text-gray-400 truncate">{product.category}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                                  stockStatus === 'good' ? 'bg-green-100 text-green-700 border border-green-200' :
                                  stockStatus === 'low' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                  'bg-red-100 text-red-700 border border-red-200'
                                }`}>
                                  {product.stock} units
                                </div>
                              </div>

                              {/* Metrics */}
                              <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-1">Selling Price</p>
                                  <p className="text-lg font-bold text-gray-900">Ksh {product.price.toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-1">Buying Price</p>
                                  <p className="text-lg font-bold text-gray-700">Ksh {(product.cost || 0).toFixed(2)}</p>
                                </div>
                                <div className="col-span-2 pt-2 border-t border-gray-200">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-medium text-gray-500">Profit Margin</p>
                                    <p className={`text-base font-bold ${
                                      margin >= 30 ? 'text-green-600' : 
                                      margin >= 20 ? 'text-amber-600' : 
                                      margin >= 0 ? 'text-orange-600' : 'text-red-600'
                                    }`}>
                                      {margin.toFixed(1)}%
                                    </p>
                                  </div>
                                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                                    <div 
                                      className={`h-1.5 rounded-full transition-all ${
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
                              <div className="flex gap-2 pt-4 border-t border-gray-200">
                                {canEditProducts && (
                                  <button
                                    onClick={() => openEditModal(product)}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-all border border-gray-200 hover:border-gray-300"
                                    aria-label={`Edit ${product.name}`}
                                  >
                                    <FaEdit className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Edit</span>
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
                                    onClick={() => setQrCodeProductId(product.id)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 hover:bg-green-100 border border-green-200 hover:border-green-300 text-green-700 text-sm font-medium transition-all"
                                    aria-label={`Generate QR code for ${product.name}`}
                                  >
                                    <FaQrcode className="w-3.5 h-3.5" />
                                  </button>
                                </FeatureGuard>
                                <button
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setSelectedProductId(product.id);
                                    setActiveTab('variations');
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 text-blue-700 text-sm font-medium transition-all"
                                  title="Manage Variations"
                                  aria-label={`Manage variations for ${product.name}`}
                                >
                                  <FaLayerGroup className="w-3.5 h-3.5" />
                                </button>
                                {canDeleteProducts && (
                                  <button
                                    onClick={() => handleDelete(product.id)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-700 text-sm font-medium transition-all"
                                    aria-label={`Delete ${product.name}`}
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
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-lg">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                              <tr>
                                {allColumns.filter(col => visibleColumns.includes(col)).map(col => (
                                  <th
                                    key={col}
                                    className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                                    onClick={() => handleSort(col)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span>{col.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                                      {sortField === col && (
                                        <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                      )}
                                    </div>
                                  </th>
                                ))}
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {sortedProducts.length === 0 ? (
                                <tr>
                                  <td colSpan={visibleColumns.length + 1} className="text-center py-12">
                                    <div className="flex flex-col items-center justify-center">
                                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <FaBox className="w-8 h-8 text-gray-400" />
                                      </div>
                                      <p className="text-sm font-semibold text-gray-900 mb-1">No products found</p>
                                      <p className="text-xs text-gray-500">
                                        {search ? 'Try adjusting your search' : 'Add your first product to get started'}
                                      </p>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                sortedProducts.map((product) => {
                                  const flat = flattenProduct(product);
                                  return (
                                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                      {allColumns.filter(col => visibleColumns.includes(col)).map(col => {
                                        let displayValue: string | number | boolean | undefined = flat[col] ?? '-';
                                        let className = '';
                                        if (col === 'price' || col === 'cost') {
                                          displayValue = `$${typeof flat[col] === 'number' ? flat[col].toFixed(2) : flat[col]}`;
                                        } else if (col === 'margin') {
                                          const marginValue = typeof flat[col] === 'string' && flat[col] !== 'N/A' ? parseFloat(flat[col]) : 0;
                                          className = marginValue >= 20 ? 'text-green-600 font-semibold' : marginValue >= 0 ? 'text-amber-600 font-semibold' : 'text-red-600 font-semibold';
                                          displayValue = flat[col] === 'N/A' ? 'N/A' : `${flat[col]}%`;
                                        }
                                        return (
                                          <td key={col} className={`px-2 py-2 whitespace-nowrap ${className}`}>
                                            {displayValue}
                                          </td>
                                        );
                                      })}
                                      <td className="px-2 py-2">
                                        <div className="flex justify-end gap-2">
                                          {canEditProducts ? (
                                            <button
                                              onClick={() => openEditModal(product)}
                                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                              title="Edit"
                                            >
                                              <FaEdit className="w-4 h-4" />
                                            </button>
                                          ) : null}
                                          <button
                                            onClick={() => {
                                              setSelectedProduct(product);
                                              setSelectedProductId(product.id);
                                              setActiveTab('variations');
                                            }}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                            title="Manage Variations"
                                          >
                                            <FaLayerGroup className="w-4 h-4" />
                                          </button>
                                          <FeatureGuard requiredFeature="api_access" showUpgradePrompt={false} fallback={
                                            <button disabled className="p-2 text-gray-400 rounded-lg cursor-not-allowed" title="QR Code (Upgrade required)">
                                              <FaQrcode className="w-4 h-4" />
                                            </button>
                                          }>
                                            <button
                                              onClick={() => setQrCodeProductId(product.id)}
                                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                                              title="QR Code"
                                            >
                                              <FaQrcode className="w-4 h-4" />
                                            </button>
                                          </FeatureGuard>
                                          {canDeleteProducts ? (
                                            <button
                                              onClick={() => handleDelete(product.id)}
                                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                              title="Delete"
                                            >
                                              <FaTrash className="w-4 h-4" />
                                            </button>
                                          ) : null}
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
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={loadMoreProducts}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingMore ? (
                        <>
                          <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                          Loading Products...
                        </>
                      ) : (
                        <>
                          Load More Products
                          <FaChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Empty State */}
                {products.length === 0 && !loading && !isSearching && (
                  <div className="text-center py-8 bg-white rounded border border-gray-200">
                    <FaBox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <h3 className="text-base font-medium text-gray-900 mb-1">No products yet</h3>
                    <p className="text-xs text-gray-500 mb-2">Get started by adding your first product.</p>
                    {canCreateProducts && (
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                      >
                        Add Your First Product
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
                          <p className="text-[11px] font-semibold text-gray-500">Total Products</p>
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
                            placeholder="Search products..."
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
                        {categories.length > 0 && (
                          <select
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                            className="px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 text-xs font-semibold"
                          >
                            <option value="all">All Categories</option>
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="flex gap-1">
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
                        <h3 className="text-base font-semibold text-gray-900 mb-1">No products found</h3>
                        <p className="text-xs text-gray-500">
                          {inventoryData && inventoryData.length === 0
                            ? "No inventory items found. Products need to have inventory entries to appear here."
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
                        <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-2 shadow-sm hover:shadow transition-all">
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Total Products</p>
                              <p className="text-2xl font-bold text-gray-900">{advancedStats.totalProducts}</p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <FaBox className="w-5 h-5 text-blue-600" />
                            </div>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Total Stock</p>
                              <p className="text-2xl font-bold text-gray-900">{advancedStats.totalStock.toLocaleString()}</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg">
                              <FaWarehouse className="w-5 h-5 text-green-600" />
                            </div>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Inventory Value</p>
                              <p className="text-2xl font-bold text-gray-900">Ksh {advancedStats.totalValue.toLocaleString()}</p>
                            </div>
                            <div className="p-3 bg-purple-50 rounded-lg">
                              <FaCalculator className="w-5 h-5 text-purple-600" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                {/* Simplified Advanced Inventory View */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Inventory Overview</h3>
                      <div className="flex flex-1 sm:flex-initial gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-initial sm:min-w-[200px]">
                          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search products..."
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <select
                          value={stockFilter}
                          onChange={e => setStockFilter(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentAdvancedInventory.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-12 text-center">
                              <div className="flex flex-col items-center">
                                <FaBox className="w-12 h-12 text-gray-300 mb-3" />
                                <p className="text-sm font-medium text-gray-900 mb-1">No products found</p>
                                <p className="text-xs text-gray-500">Try adjusting your search or filters</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          currentAdvancedInventory.map((item) => {
                            const status = getAdvancedStockStatus(item);
                            return (
                              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{item.product?.name}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{item.product?.sku}</div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`text-sm font-semibold ${status.color}`}>{item.quantity || 0}</span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                                    {status.icon}
                                    {status.text}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
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
                    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Showing {advancedStartIndex + 1} to {Math.min(advancedEndIndex, filteredAdvancedInventory.length)} of {filteredAdvancedInventory.length} products
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors"
                        >
                          Previous
                        </button>
                        <span className="px-3 py-1.5 text-sm text-gray-700 font-medium">
                          Page {currentPage} of {advancedTotalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(advancedTotalPages, p + 1))}
                          disabled={currentPage === advancedTotalPages}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors"
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
              <div className="space-y-4">
                {/* Header Section */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gray-100 rounded-lg">
                      <FaPalette className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Product Attributes</h2>
                    </div>
                  </div>
                </div>

                {/* Attributes Content */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <ProductAttributesManager />
                </div>
              </div>
            )}

            {/* VARIATIONS TAB */}
            {activeTab === 'variations' && (
              <div className="space-y-6">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-6 border border-blue-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <FaLayerGroup className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Product Variations</h2>
                        <p className="text-sm text-gray-600 mt-1">Manage product variants like sizes, colors, and other attributes</p>
                      </div>
                    </div>
                    {selectedProduct && (
                      <button
                        onClick={() => {
                          setSelectedProduct(null);
                          setSelectedProductId(null);
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <FaTimes className="w-4 h-4" />
                        Clear Selection
                      </button>
                    )}
                  </div>

                  {/* Product Selector */}
                  {!selectedProduct && (
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Select Product to Manage Variations
                      </label>
                      <div className="flex gap-3">
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
                          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium"
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
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2 shadow-sm"
                        >
                          <FaPlus className="w-4 h-4" />
                          New Product
                        </button>
                      </div>
                      {((activeTab === 'variations' && variationsProductsData ? variationsProductsData : products).length === 0) && (
                        <p className="mt-3 text-sm text-gray-500">
                          No products available. Create a product first to manage variations.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Selected Product Info */}
                  {selectedProduct && (
                    <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">{selectedProduct.name}</h3>
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                              {selectedProduct.sku}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Selling Price</p>
                              <p className="text-sm font-bold text-gray-900">Ksh {selectedProduct.price.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Buying Price</p>
                              <p className="text-sm font-bold text-gray-700">Ksh {(selectedProduct.cost || 0).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Stock</p>
                              <p className="text-sm font-bold text-gray-900">{selectedProduct.stock} units</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Margin</p>
                              <p className={`text-sm font-bold ${
                                selectedProduct.price > 0 && selectedProduct.cost 
                                  ? ((selectedProduct.price - selectedProduct.cost) / selectedProduct.price * 100) >= 30 
                                    ? 'text-green-600' 
                                    : ((selectedProduct.price - selectedProduct.cost) / selectedProduct.price * 100) >= 20 
                                      ? 'text-amber-600' 
                                      : 'text-orange-600'
                                  : 'text-gray-600'
                              }`}>
                                {selectedProduct.price > 0 && selectedProduct.cost
                                  ? `${((selectedProduct.price - selectedProduct.cost) / selectedProduct.price * 100).toFixed(1)}%`
                                  : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab('products')}
                          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                          View Product
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Variations Content */}
                {selectedProduct ? (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <VariationManager
                      productId={selectedProduct.id}
                      baseSku={selectedProduct.sku}
                      basePrice={selectedProduct.price}
                      baseCost={selectedProduct.cost}
                      branchId={selectedBranchId}
                    />
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 overflow-hidden">
                    <div className="text-center py-16 px-6">
                      <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-6">
                        <FaLayerGroup className="w-10 h-10 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Product Selected</h3>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Select a product from the dropdown above or go to the Products tab to create a new product with variations.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                          onClick={() => setActiveTab('products')}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                          <FaBox className="w-4 h-4" />
                          Browse Products
                        </button>
                        {canCreateProducts && (
                          <button
                            onClick={() => {
                              setShowAddForm(true);
                              setActiveTab('products');
                            }}
                            className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-medium transition-colors border-2 border-blue-200 flex items-center justify-center gap-2"
                          >
                            <FaPlus className="w-4 h-4" />
                            Create New Product
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stock Update Modal (Inventory Tab) */}
        {showStockModal && modalProduct && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white p-4 rounded-xl shadow-2xl w-full max-w-xs mx-2 border border-gray-100 relative">
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
      </div>
      </div>
    </AuthGuard>
  );
}
