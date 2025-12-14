"use client";
/**
 * Unified Products & Inventory Management Page
 * Combines: Products List, Basic Inventory, and Advanced Inventory
 */
import { useEffect, useState, useCallback, useMemo } from "react";
import { apiGet, apiPost, apiDelete, apiPut } from "@/utils/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useBranches } from '@/hooks/useBranches';
import FeatureGuard from '@/components/FeatureGuard';
import AuthGuard from '@/components/AuthGuard';
import { 
  FaBox, FaSearch, FaTrash, FaEdit, FaQrcode, FaPlus, FaExclamationTriangle, 
  FaCheckCircle, FaTimesCircle, FaArrowUp, FaArrowDown, FaHistory, FaBell, 
  FaChartLine, FaMapMarkerAlt, FaCalculator, FaCog, FaDownload, FaWarehouse,
  FaStore, FaClipboardList, FaSortAmountDown, FaPrint, FaTimes, FaChevronRight,
  FaLayerGroup, FaChartBar, FaSync
} from 'react-icons/fa';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import Tooltip from '@/components/Tooltip';
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

type TabType = 'products' | 'inventory' | 'advanced';
type AdvancedSubTab = 'overview' | 'movements' | 'alerts' | 'forecasting' | 'locations';

export default function UnifiedProductsInventoryPage() {
  const { user } = useUser();
  const { selectedBranchId, setSelectedBranchId } = useBranch();
  const queryClient = useQueryClient();
  const { data: limits } = usePlanLimits();
  
  // Use React Query hooks for data fetching
  const { data: branchesData = [], isLoading: branchesLoading } = useBranches();
  const branches = branchesData.map(b => ({ id: b.id, name: b.name }));

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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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
    cacheTime: 5 * 60 * 1000,
    keepPreviousData: true,
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
    cacheTime: 3 * 60 * 1000,
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
    cacheTime: 5 * 60 * 1000,
  });

  const { data: stockMovements = [], isLoading: movementsLoading } = useQuery({
    queryKey: ['inventory', 'movements', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const headers = { 'x-branch-id': selectedBranchId };
      const data = await apiGet('/inventory/movements', headers);
      return Array.isArray(data) ? data as StockMovement[] : [];
    },
    enabled: !!selectedBranchId && activeTab === 'advanced' && advancedSubTab === 'movements',
    staleTime: 1 * 60 * 1000,
    cacheTime: 3 * 60 * 1000,
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['inventory', 'alerts', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const headers = { 'x-branch-id': selectedBranchId };
      const data = await apiGet('/inventory/alerts', headers);
      return Array.isArray(data) ? data as InventoryAlert[] : [];
    },
    enabled: !!selectedBranchId && activeTab === 'advanced' && advancedSubTab === 'alerts',
    staleTime: 1 * 60 * 1000,
    cacheTime: 3 * 60 * 1000,
  });

  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['inventory', 'locations', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const headers = { 'x-branch-id': selectedBranchId };
      const data = await apiGet('/inventory/locations', headers);
      return Array.isArray(data) ? data as Location[] : [];
    },
    enabled: !!selectedBranchId && activeTab === 'advanced',
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  const { data: forecastData = [], isLoading: forecastLoading } = useQuery({
    queryKey: ['inventory', 'forecast', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const headers = { 'x-branch-id': selectedBranchId };
      const data = await apiGet('/inventory/forecast', headers);
      return Array.isArray(data) ? data as ForecastData[] : [];
    },
    enabled: !!selectedBranchId && activeTab === 'advanced' && advancedSubTab === 'forecasting',
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
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

  // Calculate statistics for inventory tab
  const inventoryStats = useMemo(() => {
    if (activeTab !== 'inventory' && activeTab !== 'advanced') return null;
    const inv = activeTab === 'advanced' ? (advancedInventoryData || []) : (inventoryData || []);
    const allProducts = inv.map(i => i.product).filter(Boolean);
    
    return {
      totalProducts: allProducts.length,
      inStock: inv.filter(i => i.quantity > 0).length,
      outOfStock: inv.filter(i => i.quantity === 0).length,
      lowStock: inv.filter(i => i.quantity > 0 && i.quantity <= 5).length,
      totalValue: inv.reduce((sum, i) => sum + (i.quantity * (i.product?.price || 0)), 0),
      totalCostValue: inv.reduce((sum, i) => sum + (i.quantity * (i.product?.cost || 0)), 0),
      totalProfit: inv.reduce((sum, i) => {
        const qty = i.quantity;
        const price = i.product?.price || 0;
        const cost = i.product?.cost || 0;
        return sum + (qty * (price - cost));
      }, 0),
    };
  }, [activeTab, inventoryData, advancedInventoryData]);

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
  }, [advancedInventoryData, alerts, locations]);

  // Filtered products for inventory tab
  const filteredInventoryProducts = useMemo(() => {
    if (activeTab !== 'inventory') return [];
    const inv = inventoryData || [];
    return inv.filter(item => {
      const matchesSearch = item.product?.name?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.product?.category === categoryFilter;
      
      if (stockFilter === "in") return matchesSearch && matchesCategory && item.quantity > 0;
      if (stockFilter === "out") return matchesSearch && matchesCategory && item.quantity === 0;
      if (stockFilter === "low") return matchesSearch && matchesCategory && item.quantity > 0 && item.quantity <= 5;
      return matchesSearch && matchesCategory;
    });
  }, [activeTab, inventoryData, search, stockFilter, categoryFilter]);

  // Filtered advanced inventory
  const filteredAdvancedInventory = useMemo(() => {
    if (activeTab !== 'advanced') return [];
    return advancedInventoryData.filter(item => {
      const matchesSearch = item.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
                           item.product?.sku?.toLowerCase().includes(search.toLowerCase());
      const matchesLocation = locationFilter === 'all' || item.location === locationFilter;

      let matchesStock = true;
      if (stockFilter === 'low') matchesStock = item.quantity <= (item.reorderPoint || 0) && item.quantity > 0;
      if (stockFilter === 'out') matchesStock = item.quantity === 0;
      if (stockFilter === 'over') matchesStock = item.quantity > (item.maxStock || 0);

      return matchesSearch && matchesLocation && matchesStock;
    });
  }, [advancedInventoryData, search, locationFilter, stockFilter]);

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

    setSaving(true);
    setError("");
    try {
      await apiPost("/products", {
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
        'Cost': cost,
        'Price': price,
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <FaExclamationTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to view products.</p>
        </div>
      </div>
    );
  }

  if (!canViewInventory && (activeTab === 'inventory' || activeTab === 'advanced')) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <FaExclamationTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to view inventory.</p>
        </div>
      </div>
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
      <div className="max-w-screen-2xl mx-auto px-2 sm:px-4 py-2">
        {/* Usage Warning Banner */}
        {isNearLimit && showUsageBanner && activeTab === 'products' && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
            <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded shadow">
              <FaExclamationTriangle className="text-amber-600 w-4 h-4" />
              <div className="flex-1">
                <span className="font-medium text-amber-800 text-xs">Approaching Product Limit:</span>
                <span className="text-xs text-amber-700 ml-1">
                  {limits?.usage.products.current} of {limits?.usage.products.limit} used.
                </span>
              </div>
              <a
                href="/settings/billing"
                className="px-2 py-0.5 bg-amber-600 text-white rounded text-xs hover:bg-amber-700"
              >
                Upgrade
              </a>
              <button
                onClick={() => setShowUsageBanner(false)}
                className="ml-1 p-1 text-amber-700 hover:text-amber-900 rounded-full hover:bg-amber-100"
                title="Dismiss"
              >
                <FaTimes className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FaBox className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">Products & Inventory</h1>
              <p className="text-xs text-gray-600 truncate">Unified management for products and stock</p>
            </div>
            <div className="ml-4 flex items-center gap-1">
              <label className="text-xs font-medium text-gray-700">Branch:</label>
              {branchesLoading ? (
                <span className="text-gray-400 text-xs">Loading...</span>
              ) : (
                <select
                  value={selectedBranchId || ''}
                  onChange={e => setSelectedBranchId(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded bg-white text-xs"
                  style={{ minWidth: 100 }}
                >
                  <option value="" disabled>Select</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow border border-gray-200 mb-4">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('products')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'products'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FaBox className="w-4 h-4" />
                  Products
                </div>
              </button>
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'inventory'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FaWarehouse className="w-4 h-4" />
                  Inventory
                </div>
              </button>
              <button
                onClick={() => setActiveTab('advanced')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'advanced'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FaChartLine className="w-4 h-4" />
                  Advanced
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {/* PRODUCTS TAB */}
            {activeTab === 'products' && (
              <div>
                {/* Products Header Actions */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3 flex-1">
                    <h3 className="text-sm font-semibold text-gray-800">
                      {loading || isSearching ? 'Loading...' : `${products.length} Product${products.length !== 1 ? 's' : ''}`}
                    </h3>
                    <label className="text-xs font-medium text-gray-700 ml-4">Items:</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value, 10))}
                      className="px-2 py-1 border border-gray-300 rounded bg-white text-xs"
                      disabled={loading || isSearching}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative max-w-xs">
                      <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                      <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search name, SKU, desc..."
                        className="w-full pl-7 pr-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                        style={{ minWidth: 180 }}
                      />
                      {isSearching && (
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                      className="px-2 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 flex items-center gap-1 text-xs"
                    >
                      {viewMode === 'grid' ? <FaSortAmountDown className="w-3 h-3" /> : <FaLayerGroup className="w-3 h-3" />}
                      {viewMode === 'grid' ? 'Table' : 'Grid'}
                    </button>
                    {canCreateProducts && (
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-xs"
                      >
                        <FaPlus className="w-3 h-3" />
                        Add
                      </button>
                    )}
                  </div>
                </div>

                {/* Add/Edit Product Form */}
                {showAddForm && (
                  <div className="mb-4 p-3 bg-white rounded shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-base font-semibold text-gray-800">
                        {editProduct ? 'Edit Product' : 'Add New Product'}
                      </h2>
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          resetForm();
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                      >
                        <FaTimes className="w-4 h-4" />
                      </button>
                    </div>

                    {error && (
                      <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}

                    <form onSubmit={editProduct ? handleEditProduct : handleAddProduct} className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Name *</label>
                          <input
                            type="text"
                            name="name"
                            defaultValue={editProduct?.name || ''}
                            required
                            className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">SKU *</label>
                          <input
                            type="text"
                            name="sku"
                            defaultValue={editProduct?.sku || ''}
                            required
                            className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Price *</label>
                          <input
                            type="number"
                            name="price"
                            step="0.01"
                            min="0"
                            defaultValue={editProduct?.price || ''}
                            required
                            className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Cost</label>
                          <input
                            type="number"
                            name="cost"
                            step="0.01"
                            min="0"
                            defaultValue={editProduct?.cost || ''}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Stock *</label>
                          <input
                            type="number"
                            name="stock"
                            min="0"
                            defaultValue={editProduct?.stock || ''}
                            required
                            className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Description</label>
                        <textarea
                          name="description"
                          defaultValue={editProduct?.description || ''}
                          rows={3}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-xs"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs flex items-center gap-1"
                        >
                          {saving ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              {editProduct ? 'Update' : 'Create'}
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddForm(false);
                            resetForm();
                          }}
                          className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Products Content */}
                {loading || isSearching ? (
                  <div className="bg-white rounded border border-gray-200 shadow-sm">
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                        {Array.from({ length: 6 }).map((_, index) => (
                          <div key={`skeleton-${index}`} className="bg-gray-50 rounded border border-gray-200 p-3 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {sortedProducts.map((product) => (
                          <div key={product.id} className="bg-white rounded border border-gray-200 p-3 shadow-sm hover:shadow transition-shadow">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="p-1 bg-blue-100 rounded">
                                  <FaBox className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-800 text-sm line-clamp-1">{product.name}</h3>
                                  <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                                </div>
                              </div>
                              <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                product.stock > 10 ? 'bg-green-100 text-green-800' :
                                product.stock > 0 ? 'bg-amber-100 text-amber-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {product.stock} in stock
                              </div>
                            </div>
                            <div className="space-y-1 mb-2">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 text-xs">Price:</span>
                                <span className="font-semibold text-gray-800 text-xs">${product.price.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 text-xs">Cost:</span>
                                <span className="font-semibold text-gray-800 text-xs">${(product.cost || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 text-xs">Margin:</span>
                                <span className={`font-semibold text-xs ${product.price > 0 ? (product.price - product.cost) / product.price * 100 >= 20 ? 'text-green-600' : 'text-amber-600' : 'text-gray-800'}`}>
                                  {product.price > 0 ? `${((product.price - product.cost) / product.price * 100).toFixed(1)}%` : 'N/A'}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1 pt-2 border-t border-gray-100">
                              {canEditProducts ? (
                                <button
                                  onClick={() => openEditModal(product)}
                                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded bg-gray-100 border border-gray-200 hover:bg-gray-200 text-xs font-medium transition"
                                >
                                  <FaEdit className="w-3 h-3" />
                                  Edit
                                </button>
                              ) : null}
                              <FeatureGuard requiredFeature="api_access" showUpgradePrompt={false} fallback={
                                <button disabled className="flex items-center gap-1 px-2 py-1 rounded bg-green-50 border border-green-200 text-green-300 text-xs font-medium cursor-not-allowed">
                                  <FaQrcode className="w-3 h-3" />
                                  QR
                                </button>
                              }>
                                <button
                                  onClick={() => setQrCodeProductId(product.id)}
                                  className="flex items-center gap-1 px-2 py-1 rounded bg-green-50 border border-green-200 hover:bg-green-100 text-xs font-medium text-green-700 transition"
                                >
                                  <FaQrcode className="w-3 h-3" />
                                  QR
                                </button>
                              </FeatureGuard>
                              {canDeleteProducts ? (
                                <button
                                  onClick={() => handleDelete(product.id)}
                                  className="flex items-center gap-1 px-2 py-1 rounded bg-red-50 border border-red-200 hover:bg-red-100 text-xs font-medium text-red-700 transition"
                                >
                                  <FaTrash className="w-3 h-3" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded border border-gray-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead className="bg-gray-50">
                              <tr>
                                {allColumns.filter(col => visibleColumns.includes(col)).map(col => (
                                  <th
                                    key={col}
                                    className="px-2 py-2 font-semibold text-gray-600 text-left cursor-pointer hover:bg-gray-100 transition"
                                    onClick={() => handleSort(col)}
                                  >
                                    <div className="flex items-center gap-1">
                                      <span>{col.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                                      {sortField === col && (
                                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                      )}
                                    </div>
                                  </th>
                                ))}
                                <th className="px-2 py-2 font-semibold text-gray-600 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {sortedProducts.length === 0 ? (
                                <tr>
                                  <td colSpan={visibleColumns.length + 1} className="text-center py-8 text-gray-400">
                                    <div className="flex flex-col items-center justify-center py-8">
                                      <FaBox className="w-12 h-12 text-gray-300 mb-3" />
                                      <p className="text-gray-500">No products found.</p>
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
                {/* Statistics */}
                {inventoryStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                      <p className="text-[11px] font-semibold text-gray-500">Total Products</p>
                      <p className="text-base font-bold text-blue-600">{inventoryStats.totalProducts}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 border border-green-100">
                      <p className="text-[11px] font-semibold text-gray-500">Inventory Value</p>
                      <p className="text-base font-bold text-green-600">${inventoryStats.totalValue.toLocaleString()}</p>
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
                    <p className="text-xs text-gray-500">Try adjusting your search or filters</p>
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
                              <span className="text-gray-400">Price</span>
                              <div className="font-bold">${price.toFixed(2)}</div>
                            </div>
                            <div>
                              <span className="text-gray-400">Cost</span>
                              <div className="font-bold">${cost.toFixed(2)}</div>
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
                            <span className="font-bold text-green-600">${totalValue.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] mb-1">
                            <span className="text-gray-400">Total Profit</span>
                            <span className={`font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>${totalProfit.toFixed(2)}</span>
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
              </div>
            )}

            {/* ADVANCED TAB */}
            {activeTab === 'advanced' && (
              <div>
                {/* Statistics */}
                {advancedStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    <div className="bg-white rounded border border-gray-200 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-600">Products</p>
                          <p className="text-lg font-bold text-gray-900">{advancedStats.totalProducts}</p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded">
                          <FaBox className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded border border-gray-200 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-600">Stock</p>
                          <p className="text-lg font-bold text-gray-900">{advancedStats.totalStock.toLocaleString()}</p>
                        </div>
                        <div className="p-2 bg-green-50 rounded">
                          <FaWarehouse className="w-4 h-4 text-green-600" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded border border-gray-200 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-600">Value</p>
                          <p className="text-lg font-bold text-gray-900">${advancedStats.totalValue.toLocaleString()}</p>
                        </div>
                        <div className="p-2 bg-purple-50 rounded">
                          <FaCalculator className="w-4 h-4 text-purple-600" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded border border-gray-200 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-600">Alerts</p>
                          <p className="text-lg font-bold text-red-600">{advancedStats.activeAlerts}</p>
                        </div>
                        <div className="p-2 bg-red-50 rounded">
                          <FaBell className="w-4 h-4 text-red-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Advanced Sub-tabs */}
                <div className="bg-white rounded border border-gray-200 mb-3">
                  <div className="border-b border-gray-200">
                    <nav className="flex">
                      {[
                        { id: 'overview', label: 'Overview', icon: FaBox },
                        { id: 'movements', label: 'Movements', icon: FaHistory },
                        { id: 'alerts', label: 'Alerts', icon: FaBell },
                        { id: 'forecasting', label: 'Forecast', icon: FaChartLine },
                        { id: 'locations', label: 'Locations', icon: FaMapMarkerAlt }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setAdvancedSubTab(tab.id as AdvancedSubTab)}
                          className={`flex items-center gap-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                            advancedSubTab === tab.id
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <tab.icon className="w-3 h-3" />
                          {tab.label}
                        </button>
                      ))}
                    </nav>
                  </div>

                  <div className="p-3">
                    {/* Overview Sub-tab */}
                    {advancedSubTab === 'overview' && (
                      <div>
                        <div className="flex flex-col lg:flex-row gap-2 mb-2">
                          <div className="flex-1">
                            <div className="relative">
                              <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                              <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search products..."
                                className="w-full pl-8 pr-2 py-1 border border-gray-300 rounded text-xs"
                              />
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <select
                              value={stockFilter}
                              onChange={e => setStockFilter(e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-xs"
                            >
                              <option value="all">All Stock</option>
                              <option value="low">Low Stock</option>
                              <option value="out">Out of Stock</option>
                              <option value="over">Over Stock</option>
                            </select>
                            <select
                              value={locationFilter}
                              onChange={e => setLocationFilter(e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-xs"
                            >
                              <option value="all">All Locations</option>
                              {locations.map(location => (
                                <option key={location.id} value={location.name}>{location.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-xs">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Product</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Location</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Stock</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Min/Max</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Status</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-100">
                                {currentAdvancedInventory.length === 0 ? (
                                  <tr>
                                    <td colSpan={6} className="px-3 py-8 text-center text-gray-400 text-xs">
                                      No inventory items found
                                    </td>
                                  </tr>
                                ) : (
                                  currentAdvancedInventory.map((item) => {
                                    const status = getAdvancedStockStatus(item);
                                    return (
                                      <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 whitespace-nowrap">
                                          <div>
                                            <div className="text-xs font-medium text-gray-900">{item.product?.name}</div>
                                            <div className="text-[11px] text-gray-500">{item.product?.sku}</div>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                                          {item.location || 'N/A'}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                          <span className={`font-semibold ${status.color}`}>{item.quantity}</span>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                          {item.minStock || 0} / {item.maxStock || 0}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${status.bg} ${status.color}`}>
                                            {status.icon}
                                            {status.text}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">
                                          <div className="flex gap-1">
                                            <button
                                              onClick={() => {
                                                const prod = products.find(p => p.id === item.product?.id);
                                                if (prod) {
                                                  setSelectedProduct(prod);
                                                  setShowMovementModal(true);
                                                }
                                              }}
                                              className="text-blue-600 hover:text-blue-900"
                                              title="Record Movement"
                                            >
                                              <FaHistory className="w-3 h-3" />
                                            </button>
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

                        {advancedTotalPages > 1 && (
                          <div className="flex justify-center items-center gap-2 mt-3">
                            <button
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                              className="px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                              Previous
                            </button>
                            <span className="mx-2 text-xs text-gray-600">
                              Page {currentPage} of {advancedTotalPages}
                            </span>
                            <button
                              onClick={() => setCurrentPage(p => Math.min(advancedTotalPages, p + 1))}
                              disabled={currentPage === advancedTotalPages}
                              className="px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Movements Sub-tab */}
                    {advancedSubTab === 'movements' && (
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-base font-semibold text-gray-900">Stock Movement History</h3>
                          <button
                            onClick={() => setShowMovementModal(true)}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                            disabled={!canEditInventory}
                          >
                            <FaPlus className="w-3 h-3" />
                            Record
                          </button>
                        </div>
                        <div className="space-y-2">
                          {stockMovements.length === 0 ? (
                            <div className="text-center py-6 text-gray-400 text-xs">
                              No stock movements recorded yet
                            </div>
                          ) : (
                            stockMovements.slice(0, 20).map((movement) => (
                              <div key={movement.id} className="bg-gray-50 rounded p-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className={`p-1 rounded ${
                                      movement.type === 'in' ? 'bg-green-100 text-green-600' :
                                      movement.type === 'out' ? 'bg-red-100 text-red-600' :
                                      movement.type === 'adjustment' ? 'bg-yellow-100 text-yellow-600' :
                                      'bg-blue-100 text-blue-600'
                                    }`}>
                                      {movement.type === 'in' ? <FaArrowUp className="w-3 h-3" /> :
                                       movement.type === 'out' ? <FaArrowDown className="w-3 h-3" /> :
                                       movement.type === 'adjustment' ? <FaSync className="w-3 h-3" /> :
                                       <FaBox className="w-3 h-3" />}
                                    </div>
                                    <div>
                                      <p className="font-medium text-xs text-gray-900">{movement.product?.name}</p>
                                      <p className="text-[11px] text-gray-600">
                                        {movement.type.charAt(0).toUpperCase() + movement.type.slice(1)} • {movement.location}
                                        {movement.reason && ` • ${movement.reason}`}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className={`font-semibold text-xs ${
                                      movement.type === 'in' ? 'text-green-600' :
                                      movement.type === 'out' ? 'text-red-600' :
                                      'text-gray-600'
                                    }`}>
                                      {movement.type === 'in' ? '+' : movement.type === 'out' ? '-' : ''}{movement.quantity}
                                    </p>
                                    <p className="text-[10px] text-gray-400">
                                      {new Date(movement.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Alerts Sub-tab */}
                    {advancedSubTab === 'alerts' && (
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-base font-semibold text-gray-900">Inventory Alerts</h3>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowAlertSettings(true)}
                              className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs"
                            >
                              <FaCog className="w-3 h-3" />
                              Settings
                            </button>
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                              {alerts.filter(a => !a.isRead).length} Active
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {alerts.length === 0 ? (
                            <div className="text-center py-6 text-gray-400 text-xs">
                              No alerts at this time
                            </div>
                          ) : (
                            alerts.map((alert) => (
                              <div key={alert.id} className={`border rounded p-2 ${getAlertSeverityColor(alert.severity)} ${!alert.isRead ? 'border-l-4' : ''}`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <FaBell className="w-4 h-4" />
                                    <div>
                                      <p className="font-medium text-xs text-gray-900">{alert.product?.name}</p>
                                      <p className="text-[11px]">{alert.message}</p>
                                      <p className="text-[10px] text-gray-400 mt-1">
                                        {new Date(alert.createdAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                  {!alert.isRead && (
                                    <button
                                      onClick={() => markAlertAsRead(alert.id)}
                                      className="px-2 py-0.5 bg-white text-gray-700 rounded text-xs hover:bg-gray-50"
                                    >
                                      Mark as Read
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Forecasting Sub-tab */}
                    {advancedSubTab === 'forecasting' && (
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-base font-semibold text-gray-900">Stock Forecasting</h3>
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <FaClipboardList className="w-3 h-3" />
                            Predictive Analytics
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {forecastData.length === 0 ? (
                            <div className="col-span-full text-center py-6 text-gray-400 text-xs">
                              Forecasting data not available
                            </div>
                          ) : (
                            forecastData.map((forecast) => (
                              <div key={forecast.productId} className="bg-white border border-gray-200 rounded p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-xs text-gray-900">{forecast.product?.name}</h4>
                                  <div className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                    forecast.confidence > 80 ? 'bg-green-100 text-green-800' :
                                    forecast.confidence > 60 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {forecast.confidence}% confidence
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-[11px] text-gray-600">Current Stock:</span>
                                    <span className="font-medium">{forecast.currentStock}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-[11px] text-gray-600">Daily Sales Avg:</span>
                                    <span className="font-medium">{forecast.averageDailySales.toFixed(1)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-[11px] text-gray-600">Days Until Stockout:</span>
                                    <span className={`font-medium ${forecast.daysUntilStockout < 7 ? 'text-red-600' : 'text-green-600'}`}>
                                      {forecast.daysUntilStockout}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-[11px] text-gray-600">Recommended Order:</span>
                                    <span className="font-medium text-blue-600">{forecast.recommendedOrder}</span>
                                  </div>
                                </div>
                                {forecast.daysUntilStockout < 7 && (
                                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                                    <div className="flex items-center gap-1">
                                      <FaExclamationTriangle className="w-3 h-3 text-red-600" />
                                      <span className="text-xs text-red-800">Reorder urgently recommended</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Locations Sub-tab */}
                    {advancedSubTab === 'locations' && (
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-base font-semibold text-gray-900">Inventory Locations</h3>
                          <button
                            onClick={() => setShowLocationModal(true)}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                            disabled={!canEditInventory}
                          >
                            <FaPlus className="w-3 h-3" />
                            Add
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {locations.length === 0 ? (
                            <div className="col-span-full text-center py-6 text-gray-400 text-xs">
                              No locations configured
                            </div>
                          ) : (
                            locations.map((location) => (
                              <div key={location.id} className="bg-white border border-gray-200 rounded p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className={`p-1 rounded ${
                                    location.type === 'warehouse' ? 'bg-blue-100 text-blue-600' :
                                    location.type === 'store' ? 'bg-green-100 text-green-600' :
                                    'bg-purple-100 text-purple-600'
                                  }`}>
                                    {location.type === 'warehouse' ? <FaWarehouse className="w-4 h-4" /> :
                                     location.type === 'store' ? <FaStore className="w-4 h-4" /> :
                                     <FaClipboardList className="w-4 h-4" />}
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-xs text-gray-900">{location.name}</h4>
                                    <p className="text-[11px] text-gray-600 capitalize">{location.type}</p>
                                  </div>
                                </div>
                                {location.address && (
                                  <p className="text-[11px] text-gray-600 mb-2">{location.address}</p>
                                )}
                                <div className="text-[11px] text-gray-500">
                                  {advancedInventoryData.filter(item => item.location === location.name).length} products stored
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Price</label>
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
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Cost</label>
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
    </AuthGuard>
  );
}
