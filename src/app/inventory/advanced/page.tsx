"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiGet, apiPost, apiPut } from "@/utils/api";
import AuthGuard from '@/components/AuthGuard';
import {
  FaBox, FaSearch, FaPlus, FaExclamationTriangle, FaCheckCircle, FaTimesCircle,
  FaEdit, FaArrowUp, FaArrowDown, FaHistory, FaBell, FaChartLine,
  FaMapMarkerAlt, FaCalculator, FaEye, FaCog, FaArrowLeft,
  FaDownload, FaSync, FaWarehouse, FaStore,
  FaClipboardList
} from 'react-icons/fa';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import { useBranch } from "@/contexts/BranchContext";
import * as XLSX from 'xlsx';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  category?: string;
  description?: string;
}

interface InventoryItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  location: string;
  lastUpdated: string;
  branchId: string;
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

export default function AdvancedInventoryPage() {
  const { user } = useUser();
  const { selectedBranchId, setSelectedBranchId, canChangeBranch } = useBranch();

  // Main data states
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'movements' | 'alerts' | 'forecasting' | 'locations'>('overview');
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Modal states
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Form states
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

  // Branches
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!selectedBranchId) return;

    setLoading(true);
    try {
      const headers = { 'x-branch-id': selectedBranchId };

      const [
        productsData,
        inventoryData,
        movementsData,
        alertsData,
        locationsData,
        forecastData
      ] = await Promise.all([
        apiGet('/products', headers),
        apiGet('/inventory/advanced', headers),
        apiGet('/inventory/movements', headers),
        apiGet('/inventory/alerts', headers),
        apiGet('/inventory/locations', headers),
        apiGet('/inventory/forecast', headers)
      ]);

      setProducts(Array.isArray(productsData) ? productsData : []);
      setInventory(Array.isArray(inventoryData) ? inventoryData : []);
      setStockMovements(Array.isArray(movementsData) ? movementsData : []);
      setAlerts(Array.isArray(alertsData) ? alertsData : []);
      setLocations(Array.isArray(locationsData) ? locationsData : []);
      setForecastData(Array.isArray(forecastData) ? forecastData : []);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  // Fetch branches
  useEffect(() => {
    async function fetchBranches() {
      setBranchesLoading(true);
      try {
        const data = await apiGet<{ id: string; name: string }[]>('/api/branches');
        if (Array.isArray(data)) {
          setBranches(data);
          if (!selectedBranchId && data.length > 0) {
            setSelectedBranchId(data[0].id);
          }
        } else {
          setBranches([]);
        }
      } catch (error) {
        console.error('Error fetching branches:', error);
      } finally {
        setBranchesLoading(false);
      }
    }
    fetchBranches();
  }, [selectedBranchId, setSelectedBranchId]);

  // Fetch data when branch changes
  useEffect(() => {
    if (selectedBranchId) {
      fetchData();
    }
  }, [selectedBranchId, fetchData]);

  // Calculate statistics
  const stats = {
    totalProducts: products.length,
    totalStock: inventory.reduce((sum, item) => sum + item.quantity, 0),
    totalValue: inventory.reduce((sum, item) => sum + (item.quantity * (item.product?.price || 0)), 0),
    lowStockItems: inventory.filter(item => item.quantity <= item.reorderPoint).length,
    outOfStockItems: inventory.filter(item => item.quantity === 0).length,
    overStockItems: inventory.filter(item => item.quantity > item.maxStock).length,
    activeAlerts: alerts.filter(alert => !alert.isRead).length,
    totalLocations: locations.length
  };

  // Filtered inventory
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
                         item.product?.sku?.toLowerCase().includes(search.toLowerCase());
    const matchesLocation = locationFilter === 'all' || item.location === locationFilter;

    let matchesStock = true;
    if (stockFilter === 'low') matchesStock = item.quantity <= item.reorderPoint && item.quantity > 0;
    if (stockFilter === 'out') matchesStock = item.quantity === 0;
    if (stockFilter === 'over') matchesStock = item.quantity > item.maxStock;

    return matchesSearch && matchesLocation && matchesStock;
  });

  // Pagination
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInventory = filteredInventory.slice(startIndex, endIndex);

  // Handle stock movement
  const handleStockMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !selectedBranchId) return;

    try {
      await apiPost('/inventory/movements', {
        productId: selectedProduct.id,
        type: movementForm.type,
        quantity: movementForm.quantity,
        reason: movementForm.reason,
        location: movementForm.location,
        destinationLocation: movementForm.type === 'transfer' ? movementForm.destinationLocation : null,
        branchId: selectedBranchId
      });

      setShowMovementModal(false);
      setMovementForm({
        type: 'in',
        quantity: 0,
        reason: '',
        location: '',
        destinationLocation: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error recording stock movement:', error);
    }
  };

  // Handle location creation
  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;

    try {
      await apiPost('/inventory/locations', {
        ...locationForm,
        branchId: selectedBranchId
      });

      setShowLocationModal(false);
      setLocationForm({
        name: '',
        type: 'warehouse',
        address: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error creating location:', error);
    }
  };

  // Update alert settings
  const handleUpdateAlertSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;

    try {
      await apiPut('/inventory/alert-settings', {
        ...alertSettings,
        branchId: selectedBranchId
      });

      setShowAlertSettings(false);
    } catch (error) {
      console.error('Error updating alert settings:', error);
    }
  };

  // Mark alert as read
  const markAlertAsRead = async (alertId: string) => {
    try {
      await apiPut(`/inventory/alerts/${alertId}/read`, {});
      fetchData();
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  // Export inventory data
  const exportInventory = () => {
    const exportData = filteredInventory.map(item => ({
      'Product Name': item.product?.name || '',
      'SKU': item.product?.sku || '',
      'Current Stock': item.quantity,
      'Min Stock': item.minStock,
      'Max Stock': item.maxStock,
      'Reorder Point': item.reorderPoint,
      'Location': item.location,
      'Last Updated': new Date(item.lastUpdated).toLocaleDateString()
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, `inventory-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Get stock status
  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity === 0) return { status: 'out', color: 'text-red-600', bg: 'bg-red-50', icon: <FaTimesCircle className="w-4 h-4" />, text: 'Out of Stock' };
    if (item.quantity <= item.reorderPoint) return { status: 'low', color: 'text-orange-600', bg: 'bg-orange-50', icon: <FaExclamationTriangle className="w-4 h-4" />, text: 'Low Stock' };
    if (item.quantity > item.maxStock) return { status: 'over', color: 'text-blue-600', bg: 'bg-blue-50', icon: <FaArrowUp className="w-4 h-4" />, text: 'Over Stock' };
    return { status: 'good', color: 'text-green-600', bg: 'bg-green-50', icon: <FaCheckCircle className="w-4 h-4" />, text: 'Good Stock' };
  };

  // Get alert severity color
  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading advanced inventory data...</p>
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
              href="/inventory"
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaArrowLeft className="w-4 h-4" />
              Back to Inventory
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Advanced Inventory Management</h1>
              <p className="text-gray-600">Comprehensive stock control and analytics</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAlertSettings(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FaCog className="w-4 h-4" />
              Alert Settings
            </button>
            <button
              onClick={exportInventory}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FaDownload className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Branch Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Branch</label>
          {branchesLoading ? (
            <div className="text-gray-500 text-sm">Loading branches...</div>
          ) : (
            <select
              value={selectedBranchId || ''}
              onChange={e => setSelectedBranchId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
              style={{ minWidth: 200 }}
              disabled={!canChangeBranch}
            >
              <option value="" disabled>Select a branch</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <FaBox className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Stock</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalStock.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <FaWarehouse className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inventory Value</p>
                <p className="text-2xl font-bold text-gray-900">${stats.totalValue.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <FaCalculator className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                <p className="text-2xl font-bold text-red-600">{stats.activeAlerts}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <FaBell className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {[
                { id: 'overview', label: 'Overview', icon: FaEye },
                { id: 'movements', label: 'Stock Movements', icon: FaHistory },
                { id: 'alerts', label: 'Alerts', icon: FaBell },
                { id: 'forecasting', label: 'Forecasting', icon: FaChartLine },
                { id: 'locations', label: 'Locations', icon: FaMapMarkerAlt }
              ].map((tab) => (
               // ...existing code...
<button
  key={tab.id}
  onClick={() => setActiveTab(tab.id as 'overview' | 'movements' | 'alerts' | 'forecasting' | 'locations')}
  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
    activeTab === tab.id
      ? 'border-blue-500 text-blue-600'
      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
  }`}
>
  <tab.icon className="w-4 h-4" />
  {tab.label}
</button>
// ...existing code...
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                {/* Filters */}
                <div className="flex flex-col lg:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search products..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={stockFilter}
                      onChange={e => setStockFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Stock Levels</option>
                      <option value="low">Low Stock</option>
                      <option value="out">Out of Stock</option>
                      <option value="over">Over Stock</option>
                    </select>
                    <select
                      value={locationFilter}
                      onChange={e => setLocationFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Locations</option>
                      {locations.map(location => (
                        <option key={location.id} value={location.name}>{location.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Inventory Table */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min/Max</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentInventory.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                              No inventory items found
                            </td>
                          </tr>
                        ) : (
                          currentInventory.map((item) => {
                            const status = getStockStatus(item);
                            return (
                              <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{item.product?.name}</div>
                                    <div className="text-sm text-gray-500">{item.product?.sku}</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {item.location}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`text-sm font-semibold ${status.color}`}>{item.quantity}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {item.minStock} / {item.maxStock}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                                    {status.icon}
                                    {status.text}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        setSelectedProduct(item.product);
                                        
                                        setShowMovementModal(true);
                                      }}
                                      className="text-blue-600 hover:text-blue-900"
                                      title="View History"
                                    >
                                      <FaHistory className="w-4 h-4" />
                                    </button>
                                    {hasPermission(user, 'edit_inventory') && (
                                      <button
                                        onClick={() => {
                                          setSelectedProduct(item.product);
                                         
                                        }}
                                        className="text-green-600 hover:text-green-900"
                                        title="Edit Stock"
                                      >
                                        <FaEdit className="w-4 h-4" />
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="mx-4 text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Stock Movements Tab */}
            {activeTab === 'movements' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Stock Movement History</h3>
                  <button
                    onClick={() => setShowMovementModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    disabled={!hasPermission(user, 'edit_inventory')}
                  >
                    <FaPlus className="w-4 h-4" />
                    Record Movement
                  </button>
                </div>

                <div className="space-y-4">
                  {stockMovements.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No stock movements recorded yet
                    </div>
                  ) : (
                    stockMovements.slice(0, 20).map((movement) => (
                      <div key={movement.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              movement.type === 'in' ? 'bg-green-100 text-green-600' :
                              movement.type === 'out' ? 'bg-red-100 text-red-600' :
                              movement.type === 'adjustment' ? 'bg-yellow-100 text-yellow-600' :
                              'bg-blue-100 text-blue-600'
                            }`}>
                              {movement.type === 'in' ? <FaArrowUp className="w-4 h-4" /> :
                               movement.type === 'out' ? <FaArrowDown className="w-4 h-4" /> :
                               movement.type === 'adjustment' ? <FaSync className="w-4 h-4" /> :
                               <FaBox className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{movement.product?.name}</p>
                              <p className="text-sm text-gray-600">
                                {movement.type.charAt(0).toUpperCase() + movement.type.slice(1)} • {movement.location}
                                {movement.reason && ` • ${movement.reason}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${
                              movement.type === 'in' ? 'text-green-600' :
                              movement.type === 'out' ? 'text-red-600' :
                              'text-gray-600'
                            }`}>
                              {movement.type === 'in' ? '+' : movement.type === 'out' ? '-' : ''}{movement.quantity}
                            </p>
                            <p className="text-xs text-gray-500">
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

            {/* Alerts Tab */}
            {activeTab === 'alerts' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Inventory Alerts</h3>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                      {stats.activeAlerts} Active
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {alerts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No alerts at this time
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div key={alert.id} className={`border rounded-lg p-4 ${getAlertSeverityColor(alert.severity)} ${!alert.isRead ? 'border-l-4' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FaBell className="w-5 h-5" />
                            <div>
                              <p className="font-medium text-gray-900">{alert.product?.name}</p>
                              <p className="text-sm">{alert.message}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(alert.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {!alert.isRead && (
                            <button
                              onClick={() => markAlertAsRead(alert.id)}
                              className="px-3 py-1 bg-white text-gray-700 rounded text-sm hover:bg-gray-50"
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

            {/* Forecasting Tab */}
            {activeTab === 'forecasting' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Stock Forecasting</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FaClipboardList className="w-4 h-4" />
                    Predictive Analytics
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {forecastData.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      Forecasting data not available
                    </div>
                  ) : (
                    forecastData.map((forecast) => (
                      <div key={forecast.productId} className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-900">{forecast.product?.name}</h4>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            forecast.confidence > 80 ? 'bg-green-100 text-green-800' :
                            forecast.confidence > 60 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {forecast.confidence}% confidence
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Current Stock:</span>
                            <span className="font-medium">{forecast.currentStock}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Daily Sales Avg:</span>
                            <span className="font-medium">{forecast.averageDailySales.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Days Until Stockout:</span>
                            <span className={`font-medium ${forecast.daysUntilStockout < 7 ? 'text-red-600' : 'text-green-600'}`}>
                              {forecast.daysUntilStockout}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Recommended Order:</span>
                            <span className="font-medium text-blue-600">{forecast.recommendedOrder}</span>
                          </div>
                        </div>

                        {forecast.daysUntilStockout < 7 && (
                          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <FaExclamationTriangle className="w-4 h-4 text-red-600" />
                              <span className="text-sm text-red-800">Reorder urgently recommended</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Locations Tab */}
            {activeTab === 'locations' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Inventory Locations</h3>
                  <button
                    onClick={() => setShowLocationModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    disabled={!hasPermission(user, 'edit_inventory')}
                  >
                    <FaPlus className="w-4 h-4" />
                    Add Location
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {locations.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      No locations configured
                    </div>
                  ) : (
                    locations.map((location) => (
                      <div key={location.id} className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`p-2 rounded-lg ${
                            location.type === 'warehouse' ? 'bg-blue-100 text-blue-600' :
                            location.type === 'store' ? 'bg-green-100 text-green-600' :
                            'bg-purple-100 text-purple-600'
                          }`}>
                            {location.type === 'warehouse' ? <FaWarehouse className="w-5 h-5" /> :
                             location.type === 'store' ? <FaStore className="w-5 h-5" /> :
                             <FaClipboardList className="w-5 h-5" />}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{location.name}</h4>
                            <p className="text-sm text-gray-600 capitalize">{location.type}</p>
                          </div>
                        </div>

                        {location.address && (
                          <p className="text-sm text-gray-600 mb-4">{location.address}</p>
                        )}

                        <div className="text-sm text-gray-500">
                          {inventory.filter(item => item.location === location.name).length} products stored
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stock Movement Modal */}
        {showMovementModal && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Record Stock Movement</h2>
                <button
                  onClick={() => setShowMovementModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimesCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleStockMovement} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                  <input
                    type="text"
                    value={selectedProduct.name}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Movement Type</label>
              <select
  value={movementForm.type}
  onChange={e =>
    setMovementForm(prev => ({
      ...prev,
      type: e.target.value as 'in' | 'out' | 'adjustment' | 'transfer'
    }))
  }
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
>
  <option value="in">Stock In</option>
  <option value="out">Stock Out</option>
  <option value="adjustment">Adjustment</option>
  <option value="transfer">Transfer</option>
</select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={movementForm.quantity}
                    onChange={e => setMovementForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <select
                    value={movementForm.location}
                    onChange={e => setMovementForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Destination Location</label>
                    <select
                      value={movementForm.destinationLocation}
                      onChange={e => setMovementForm(prev => ({ ...prev, destinationLocation: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
                  <textarea
                    value={movementForm.reason}
                    onChange={e => setMovementForm(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Enter reason for this movement..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowMovementModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Record Movement
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Location Modal */}
        {showLocationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Add New Location</h2>
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimesCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateLocation} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
                  <input
                    type="text"
                    value={locationForm.name}
                    onChange={e => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

              
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location Type</label>
                 <select
  value={locationForm.type}
  onChange={e => setLocationForm(prev => ({
    ...prev,
    type: e.target.value as 'warehouse' | 'store' | 'showroom'
  }))}
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
>
  <option value="warehouse">Warehouse</option>
  <option value="store">Store</option>
  <option value="showroom">Showroom</option>
</select>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address (Optional)</label>
                  <textarea
                    value={locationForm.address}
                    onChange={e => setLocationForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Enter location address..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowLocationModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Location
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Alert Settings Modal */}
        {showAlertSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Alert Settings</h2>
                <button
                  onClick={() => setShowAlertSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimesCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateAlertSettings} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Threshold</label>
                  <input
                    type="number"
                    min="0"
                    value={alertSettings.lowStockThreshold}
                    onChange={e => setAlertSettings(prev => ({ ...prev, lowStockThreshold: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Alert when stock falls below this number</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Critical Stock Threshold</label>
                  <input
                    type="number"
                    min="0"
                    value={alertSettings.criticalStockThreshold}
                    onChange={e => setAlertSettings(prev => ({ ...prev, criticalStockThreshold: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Critical alert when stock falls below this number</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="emailAlerts"
                      checked={alertSettings.enableEmailAlerts}
                      onChange={e => setAlertSettings(prev => ({ ...prev, enableEmailAlerts: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="emailAlerts" className="ml-2 block text-sm text-gray-900">
                      Enable Email Alerts
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="pushAlerts"
                      checked={alertSettings.enablePushAlerts}
                      onChange={e => setAlertSettings(prev => ({ ...prev, enablePushAlerts: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="pushAlerts" className="ml-2 block text-sm text-gray-900">
                      Enable Push Notifications
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAlertSettings(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Settings
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
