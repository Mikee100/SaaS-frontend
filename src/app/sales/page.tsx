"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { apiGet, apiPost } from "@/utils/api";
import React from "react";
import Spinner from '@/components/Spinner';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeCanvas } from 'qrcode.react';
import Barcode from 'react-barcode';
import { Scanner } from '@yudiel/react-qr-scanner';
import FeatureGuard from '@/components/FeatureGuard';
import AuthGuard from '@/components/AuthGuard';
import { useRouter } from "next/navigation";
import { 
  FaLock, FaArrowUp, FaQrcode, FaBarcode, FaDownload, FaUpload, FaSearch, 
  FaShoppingCart, FaMoneyBillWave, FaMobileAlt, FaTimes, FaPrint, FaChevronLeft, 
  FaChevronRight, FaKeyboard, FaHistory, FaUser, FaCalculator, FaUndo, FaRedo,
  FaStar, FaClock, FaChartLine, FaExclamationTriangle, FaCheckCircle, FaTimesCircle
} from 'react-icons/fa';
import MpesaPayment from '@/components/MpesaPayment';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import Tooltip from '@/components/Tooltip';
import debounce from '@/utils/debounce';
import ProductSkeleton from '@/components/ProductSkeleton';

type Product = { 
  id: string; 
  name: string; 
  price: number; 
  stock: number; 
  category?: string;
  sku?: string;
  description?: string;
};

type CartItem = Product & { quantity: number };

type Receipt = {
  saleId: string;
  date: string | Date;
  customerName?: string;
  customerPhone?: string;
  items: { productId: string; name: string; price: number; quantity: number }[];
  total: number;
  paymentMethod: string;
  amountReceived: number;
  change: number;
};

type QuickAction = {
  id: string;
  name: string;
  action: () => void;
  icon: React.ReactNode;
  color: string;
};

export default function SalesPage() {
  const { user } = useUser();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  
  // New state for enhanced features
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "price" | "stock">("name");
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [cartHistory, setCartHistory] = useState<CartItem[][]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [favoriteProducts, setFavoriteProducts] = useState<string[]>([]);
  const [showMpesaPayment, setShowMpesaPayment] = useState(false);

  // Permission checks
  const canViewSales = hasPermission(user, 'view_sales');
  const canCreateSales = hasPermission(user, 'create_sales');
  const canEditSales = hasPermission(user, 'edit_sales');
  const canDeleteSales = hasPermission(user, 'delete_sales');

  // Constants
  const productsPerPage = 12;
  const filteredProducts = products
    .filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedCategory === "all" || product.category === selectedCategory)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "price": return a.price - b.price;
        case "stock": return b.stock - a.stock;
        default: return a.name.localeCompare(b.name);
      }
    });
  
  const pageCount = Math.ceil(filteredProducts.length / productsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * productsPerPage, 
    currentPage * productsPerPage
  );
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const categories = ["all", ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [products, businessInfo, recentSalesData] = await Promise.all([
          apiGet("/products"),
          apiGet("/tenant/me"),
          apiGet("/sales/recent").catch(() => [])
        ]);
        setProducts(products);
        setBusinessInfo(businessInfo);
        setRecentSales(recentSalesData);
      } catch (err) {
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'f':
            e.preventDefault();
            document.getElementById('search-input')?.focus();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redoCart();
            } else {
              undoCart();
            }
            break;
          case 'Enter':
            e.preventDefault();
            if (cart.length > 0) {
              handleCheckout();
            }
            break;
          case 'Escape':
            setCheckoutOpen(false);
            setShowScanner(false);
            setShowCustomerModal(false);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cart]);

  // Cart management functions with history
  const addToCart = useCallback((product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      const newCart = existingItem
        ? prevCart.map(item =>
            item.id === product.id
              ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
              : item
          )
        : [...prevCart, { ...product, quantity: 1 }];
      
      // Save to history
      saveToHistory(newCart);
      return newCart;
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prevCart => {
      const newCart = prevCart.filter(item => item.id !== productId);
      saveToHistory(newCart);
      return newCart;
    });
  }, []);

  const updateQuantity = useCallback((productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(prevCart => {
      const newCart = prevCart.map(item => {
        if (item.id === productId) {
          const product = products.find(p => p.id === productId);
          return { ...item, quantity: Math.min(newQuantity, product?.stock || 0) };
        }
        return item;
      });
      saveToHistory(newCart);
      return newCart;
    });
  }, [products, removeFromCart]);

  const saveToHistory = (newCart: CartItem[]) => {
    setCartHistory(prev => {
      const newHistory = [...prev.slice(0, currentHistoryIndex + 1), newCart];
      if (newHistory.length > 10) newHistory.shift(); // Keep only last 10
      return newHistory;
    });
    setCurrentHistoryIndex(prev => prev + 1);
  };

  const undoCart = () => {
    if (currentHistoryIndex > 0) {
      setCurrentHistoryIndex(prev => prev - 1);
      setCart(cartHistory[currentHistoryIndex - 1]);
    }
  };

  const redoCart = () => {
    if (currentHistoryIndex < cartHistory.length - 1) {
      setCurrentHistoryIndex(prev => prev + 1);
      setCart(cartHistory[currentHistoryIndex + 1]);
    }
  };

  const clearCart = () => {
    setCart([]);
    setCartHistory([]);
    setCurrentHistoryIndex(-1);
  };

  const toggleFavorite = (productId: string) => {
    setFavoriteProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleCheckout = () => {
    setCheckoutOpen(true);
  };

  const handleConfirmSale = async () => {
    if (paymentMethod === "mpesa") {
      setShowMpesaPayment(true);
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      if (paymentMethod === "cash" && amountReceived < cartTotal) {
        throw new Error("Amount received must cover the total");
      }

      const saleData = {
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        total: cartTotal,
        paymentMethod,
        amountReceived,
        change: amountReceived - cartTotal,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        idempotencyKey: uuidv4()
      };

      const sale = await apiPost("/sales", saleData);
      
      // Reset and redirect to receipt
      clearCart();
      setCheckoutOpen(false);
      setCustomerName("");
      setCustomerPhone("");
      setAmountReceived(0);
      
      // Refresh products
      apiGet("/products").then(setProducts);
      
      // Redirect to receipt page
      const saleId = sale.id || sale.saleId || sale._id;
      if (saleId) {
        router.push(`/sales/receipt/${saleId}`);
      } else {
        alert("Sale completed successfully!");
      }
    } catch (err: any) {
      setError(err.message || "Failed to complete sale");
    } finally {
      setIsProcessing(false);
    }
  };

  // M-Pesa payment handlers
  const handleMpesaSuccess = useCallback((transactionId: string) => {
    // Show success message
    setStatusMessage('M-Pesa payment successful! Processing your order...');
    
    // Complete the sale with M-Pesa details
    const completeMpesaSale = async () => {
      try {
        const saleData = {
          items: cart.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price
          })),
          total: cartTotal,
          paymentMethod: 'mpesa',
          mpesaTransactionId: transactionId,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          idempotencyKey: uuidv4(),
          tenantId: businessInfo?.id,
          userId: user?.id
        };

        const sale = await apiPost("/sales", saleData);
        
        // Reset cart and close modals
        clearCart();
        setCheckoutOpen(false);
        setShowMpesaPayment(false);
        setCustomerName("");
        setCustomerPhone("");
        
        // Show success message
        alert('Payment successful! Your order has been processed.');
        
        // Refresh products
        apiGet("/products").then(setProducts);
        
        // Redirect to receipt if available
        const saleId = sale.id || sale.saleId || sale._id;
        if (saleId) {
          router.push(`/sales/receipt/${saleId}`);
        }
      } catch (err: any) {
        console.error('Error completing M-Pesa sale:', err);
        setError('Payment was successful but there was an error processing your order. Please contact support.');
      } finally {
        setIsProcessing(false);
      }
    };
    
    completeMpesaSale();
  }, [cart, cartTotal, customerName, customerPhone, businessInfo, user, clearCart, router]);

  const handleMpesaError = useCallback((error: string) => {
    setError(`M-Pesa payment failed: ${error}`);
    setIsProcessing(false);
  }, []);

  const handleMpesaCancel = useCallback(() => {
    setShowMpesaPayment(false);
    setIsProcessing(false);
  }, []);

  const quickActions: QuickAction[] = [
    {
      id: "undo",
      name: "Undo (Ctrl+Z)",
      action: undoCart,
      icon: <FaUndo />,
      color: "bg-gray-500"
    },
    {
      id: "redo", 
      name: "Redo (Ctrl+Shift+Z)",
      action: redoCart,
      icon: <FaRedo />,
      color: "bg-gray-500"
    },
    {
      id: "clear",
      name: "Clear Cart",
      action: clearCart,
      icon: <FaTimes />,
      color: "bg-red-500"
    },
    {
      id: "history",
      name: "Recent Sales",
      action: () => router.push("/sales/history"),
      icon: <FaHistory />,
      color: "bg-blue-500"
    }
  ];

  const [isSearching, setIsSearching] = useState(false);

  // Debounced search function
  const debouncedSearch = useMemo(
    () =>
      debounce((searchValue: string) => {
        setSearchTerm(searchValue);
        setCurrentPage(1);
        setIsSearching(false);
      }, 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIsSearching(true);
    debouncedSearch(value);
  };

  // Loading state for initial data load or search
  const isLoading = loading || isSearching;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Spinner />
      </div>
    );
  }

  // Check if user has permission to view sales
  if (!canViewSales) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <FaExclamationTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to view sales.</p>
          <p className="text-sm text-gray-500">Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  if (error) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-6 bg-white rounded-xl shadow-sm max-w-md">
        <h1 className="text-xl font-bold text-red-600 mb-2">Error</h1>
        <p className="text-gray-700 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Enhanced Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
                <p className="text-sm text-gray-500">Welcome back, {businessInfo?.name || 'User'}</p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm transition"
                  title="Keyboard Shortcuts"
                >
                  <FaKeyboard className="w-4 h-4" />
                  Shortcuts
                </button>
                
                <FeatureGuard requiredFeature="data_export" fallback={
                  <button disabled className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-400 text-sm cursor-not-allowed">
                    <FaDownload className="w-4 h-4" />
                    Export
                    <FaLock className="w-3 h-3" />
                  </button>
                }>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm transition">
                    <FaDownload className="w-4 h-4" />
                    Export
                  </button>
                </FeatureGuard>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <FaShoppingCart className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Cart Items</span>
                </div>
                <p className="text-xl font-bold text-blue-900">{cart.length}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <FaMoneyBillWave className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Total</span>
                </div>
                <p className="text-xl font-bold text-green-900">${cartTotal.toFixed(2)}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <FaChartLine className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">Products</span>
                </div>
                <p className="text-xl font-bold text-purple-900">{products.length}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <FaClock className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">Recent Sales</span>
                </div>
                <p className="text-xl font-bold text-orange-900">{recentSales.length}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Keyboard Shortcuts Modal */}
        {showKeyboardShortcuts && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-lg">Keyboard Shortcuts</h3>
                <button onClick={() => setShowKeyboardShortcuts(false)} className="text-gray-500 hover:text-gray-700">
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ctrl+F</span>
                  <span className="font-medium">Search products</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ctrl+Z</span>
                  <span className="font-medium">Undo cart change</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ctrl+Shift+Z</span>
                  <span className="font-medium">Redo cart change</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Enter</span>
                  <span className="font-medium">Proceed to checkout</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Escape</span>
                  <span className="font-medium">Close modals</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Products Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Enhanced Search and Filters */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex-1">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      id="search-input"
                      type="text"
                      placeholder="Search products... (Ctrl+F)"
                      defaultValue={searchTerm}
                      onChange={handleSearchChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  
                  <FeatureGuard requiredFeature="api_access" fallback={
                    <button disabled className="p-2 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed">
                      <FaQrcode className="w-5 h-5" />
                    </button>
                  }>
                    <button
                      onClick={() => setShowScanner(true)}
                      className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                      title="Scan QR Code"
                    >
                      <FaQrcode className="w-5 h-5" />
                    </button>
                  </FeatureGuard>
                </div>

                {/* Enhanced Filters */}
                <div className="flex items-center gap-4">
                  {/* Category Filter */}
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category === 'all' ? 'All Categories' : category}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort By */}
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="name">Name</option>
                      <option value="price">Price</option>
                      <option value="stock">Stock</option>
                    </select>
                  </div>

                  {/* View Mode */}
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">View</label>
                    <div className="flex border border-gray-300 rounded-lg">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                          viewMode === "grid" 
                            ? "bg-blue-600 text-white" 
                            : "bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        Grid
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                          viewMode === "list" 
                            ? "bg-blue-600 text-white" 
                            : "bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        List
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Grid */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                {isLoading ? (
                  <ProductSkeleton count={8} />
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <FaSearch className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No products found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm ? 'Try a different search term' : 'No products available'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {paginatedProducts.map((product) => (
                      <div 
                        key={product.id}
                        className="group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100"
                      >
                        <div className="aspect-square bg-gray-50 flex items-center justify-center p-4">
                          {/* Product image placeholder */}
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                            <FaShoppingCart className="w-8 h-8" />
                          </div>
                        </div>
                        <div className="p-3">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {product.name}
                          </h3>
                          <p className="mt-1 text-sm font-medium text-blue-600">
                            ${product.price.toFixed(2)}
                          </p>
                          <div className="mt-2 flex justify-between items-center">
                            <span className="text-xs text-gray-500">
                              {product.stock} in stock
                            </span>
                            <button
                              onClick={() => addToCart(product)}
                              disabled={product.stock <= 0}
                              className={`px-2 py-1 text-xs font-medium rounded ${
                                product.stock > 0
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              {product.stock > 0 ? 'Add' : 'Out of stock'}
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(product.id);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full hover:bg-gray-100 transition-colors"
                          aria-label={favoriteProducts.includes(product.id) ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <FaStar
                            className={`w-4 h-4 ${
                              favoriteProducts.includes(product.id)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300 hover:text-yellow-400'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Enhanced Pagination */}
                {pageCount > 1 && (
                  <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-100 rounded"
                    >
                      <FaChevronLeft className="w-3 h-3" />
                      Previous
                    </button>
                    
                    <div className="flex items-center gap-2">
                      {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 text-sm rounded ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}
                      disabled={currentPage === pageCount}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-100 rounded"
                    >
                      Next
                      <FaChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Cart Section */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm h-full flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                      <FaShoppingCart className="text-blue-600" />
                      Order Summary
                    </h2>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                    </span>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    {quickActions.map(action => (
                      <button
                        key={action.id}
                        onClick={action.action}
                        className={`p-2 rounded-lg text-white text-xs font-medium transition-colors ${action.color} hover:opacity-80`}
                        title={action.name}
                      >
                        {action.icon}
                      </button>
                    ))}
                  </div>
                </div>
                
                {cart.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500">
                    <FaShoppingCart className="w-10 h-10 mb-3 text-gray-300" />
                    <p>Your cart is empty</p>
                    <p className="text-sm">Add products to get started</p>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {cart.map(item => (
                        <div key={item.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-800 text-sm">{item.name}</h3>
                            <p className="text-xs text-gray-600">${item.price.toFixed(2)} each</p>
                            <p className="text-xs text-gray-500">Subtotal: ${(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-6 h-6 flex items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-6 h-6 flex items-center justify-center rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="p-4 border-t border-gray-200">
                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium">${cartTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tax:</span>
                          <span className="font-medium">$0.00</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                          <span>Total:</span>
                          <span className="text-blue-600">${cartTotal.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleCheckout}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <FaMoneyBillWave />
                        Checkout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* QR Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 bg-white bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl overflow-hidden w-full max-w-md">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-lg">Scan Product QR Code</h3>
                <button 
                  onClick={() => {
                    setShowScanner(false);
                    setScanResult(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 text-center">
                <div className="bg-black p-4 rounded-lg mb-4">
                  <div className="aspect-square bg-white/10 rounded relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <div className="text-center">
                        <FaQrcode className="w-16 h-16 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Scanner View</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-4">Point your camera at a product QR code</p>
                
                <button
                  onClick={() => setShowScanner(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Checkout Modal */}
        {checkoutOpen && (
          <div className="fixed inset-0 bg-white bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-lg">Complete Order</h3>
                <button 
                  onClick={() => setCheckoutOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Customer Info */}
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">Customer Information</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Name (Optional)</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Phone (Optional)</label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="254700000000"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Payment Method */}
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">Payment Method</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPaymentMethod("cash")}
                      className={`p-3 border rounded-lg flex items-center justify-center gap-2 transition-colors ${
                        paymentMethod === "cash" 
                          ? 'border-blue-500 bg-blue-50 text-blue-600' 
                          : 'border-gray-300 hover:border-blue-300'
                      }`}
                    >
                      <FaMoneyBillWave />
                      Cash
                    </button>
                    <button
                      onClick={() => setPaymentMethod("mpesa")}
                      className={`p-3 border rounded-lg flex items-center justify-center gap-2 transition-colors ${
                        paymentMethod === "mpesa" 
                          ? 'border-blue-500 bg-blue-50 text-blue-600' 
                          : 'border-gray-300 hover:border-blue-300'
                      }`}
                    >
                      <FaMobileAlt />
                      M-Pesa
                    </button>
                  </div>
                </div>
                
                {/* Payment Details */}
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">Payment Details</h4>
                  {paymentMethod === "cash" ? (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Amount Due:</span>
                        <span className="font-bold">${cartTotal.toFixed(2)}</span>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Amount Received</label>
                        <input
                          type="number"
                          value={amountReceived}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            setAmountReceived(isNaN(value) ? 0 : value);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                          min={cartTotal}
                          step="0.01"
                        />
                      </div>
                      {amountReceived > 0 && (
                        <div className="mt-2 text-right">
                          <span className="text-sm text-gray-600">Change: </span>
                          <span className="font-medium">
                            ${(amountReceived - cartTotal).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-600">Amount Due:</span>
                        <span className="font-bold">KES {cartTotal.toFixed(2)}</span>
                      </div>
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-600 mb-2">
                          M-Pesa payment will be processed after order confirmation
                        </p>
                        <button 
                          onClick={() => setShowMpesaPayment(true)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Proceed to M-Pesa Payment
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}
                
                {/* Order Summary */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-medium text-gray-800 mb-2">Order Summary</h4>
                  <div className="space-y-2 mb-3">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.name} × {item.quantity}</span>
                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-bold border-t border-gray-200 pt-2">
                    <span>Total</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setCheckoutOpen(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmSale}
                    disabled={isProcessing || (paymentMethod === "cash" && amountReceived < cartTotal)}
                    className={`flex-1 px-4 py-3 rounded-lg text-white transition-colors ${
                      isProcessing ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                    } flex items-center justify-center gap-2`}
                  >
                    {isProcessing ? (
                      <>
                        <Spinner size={24} />
                        Processing...
                      </>
                    ) : (
                      <>
                        Complete Sale
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* M-Pesa Payment Modal */}
        {showMpesaPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-lg">M-Pesa Payment</h3>
                <button 
                  onClick={() => setShowMpesaPayment(false)}
                  className="text-gray-500 hover:text-gray-700"
                  disabled={isProcessing}
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6">
                <MpesaPayment
                  amount={cartTotal}
                  saleData={{
                    items: cart.map(item => ({
                      productId: item.id,
                      name: item.name,
                      quantity: item.quantity,
                      price: item.price,
                      sku: item.sku
                    })),
                    total: cartTotal,
                    paymentMethod: 'mpesa',
                    customerName: customerName || undefined,
                    customerPhone: customerPhone || undefined,
                    idempotencyKey: uuidv4(),
                    tenantId: businessInfo?.id,
                    userId: user?.id,
                    timestamp: new Date().toISOString()
                  }}
                  onSuccess={handleMpesaSuccess}
                  onError={handleMpesaError}
                  onCancel={handleMpesaCancel}
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </AuthGuard>
  );
}