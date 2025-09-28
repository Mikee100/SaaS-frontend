"use client";
import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost } from "@/utils/api";
import React from "react";
import Spinner from '@/components/Spinner';
import { v4 as uuidv4 } from 'uuid';
import FeatureGuard from '@/components/FeatureGuard';
import AuthGuard from '@/components/AuthGuard';
import { useRouter } from "next/navigation";
import {
  FaLock, FaStore, FaQrcode, FaDownload, FaSearch,
  FaShoppingCart, FaMoneyBillWave, FaMobileAlt, FaTimes, FaChevronLeft,
  FaChevronRight, FaKeyboard, FaHistory, FaUser, FaUndo, FaRedo,
  FaStar, FaClock, FaChartLine, FaExclamationTriangle,
  FaFilter, FaSort, FaTh, FaList, FaPlus, FaMinus
} from 'react-icons/fa';
import MpesaPayment from '@/components/MpesaPayment';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import Tooltip from '@/components/Tooltip';

import ProductSkeleton from '@/components/ProductSkeleton';
import { useBranch } from "@/contexts/BranchContext";
import { productCache } from '@/lib/productCache';



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



type QuickAction = {
  id: string;
  name: string;
  action: () => void;
  icon: React.ReactNode;
  color: string;
  disabled?: boolean;
};

export default function SalesPage() {
  const { user } = useUser();
  const router = useRouter();
  const { selectedBranchId, setSelectedBranchId } = useBranch();
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [searchTerm] = useState("");
  const [businessInfo, setBusinessInfo] = useState<Record<string, unknown> | null>(null);
  const [showScanner, setShowScanner] = useState(false);


  // New state for enhanced features
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price" | "stock">("name");
  const [sortOrder] = useState('asc');

  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [recentSales, setRecentSales] = useState<Record<string, unknown>[]>([]);
  const [cartHistory, setCartHistory] = useState<CartItem[][]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

  const [favoriteProducts, setFavoriteProducts] = useState<string[]>([]);
  const [showMpesaPayment, setShowMpesaPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Permission checks
  const canViewSales = hasPermission(user, 'view_sales');

  // Constants
  const productsPerPage = 12;
  const filteredProducts = products
    .filter(product => {
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'stock':
          aValue = a.stock;
          bValue = b.stock;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      if (sortOrder === 'asc') {
        return (aValue as number) - (bValue as number);
      } else {
        return (bValue as number) - (aValue as number);
      }
    });
  
  const pageCount = Math.ceil(filteredProducts.length / productsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * productsPerPage, 
    currentPage * productsPerPage
  );
  const VAT_RATE = 0.16; // 16% VAT rate for Kenya
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const vatAmount = cartSubtotal * VAT_RATE;
  const cartTotal = cartSubtotal + vatAmount;
  const categories = ["all", ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  // ProductCard component for virtualized list
  const ProductCard = ({ product, style, isVirtualized = false }: { product: Product; style?: React.CSSProperties; isVirtualized?: boolean }) => (
    <div
      style={style}
      className={`group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-blue-100 ${
        isVirtualized ? 'w-full h-full' : 'mx-2 mb-4'
      }`}
    >
      <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 relative">
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          <FaShoppingCart className="w-8 h-8 opacity-70" />
        </div>
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium text-gray-700">
          ${product.price.toFixed(2)}
        </div>
        <div className={`absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium ${
          product.stock > 10 ? 'text-green-700' : product.stock > 0 ? 'text-orange-700' : 'text-red-700'
        }`}>
          {product.stock} in stock
        </div>
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 h-10 mb-2">
          {product.name}
        </h3>

        <div className="flex justify-between items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(product.id);
            }}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product);
            }}
            disabled={product.stock <= 0}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              product.stock > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {product.stock > 0 ? 'Add to Cart' : 'Out of stock'}
          </button>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products using cache
        const products = await productCache.getProducts(() => apiGet("/products"));
        setProducts(products);

        // Fetch other data in parallel
        const [businessInfo, recentSalesData] = await Promise.all([
          apiGet("/tenant/me"),
          apiGet("/sales/recent").catch(() => [])
        ]);

        setBusinessInfo(businessInfo as Record<string, unknown>);
        setRecentSales(recentSalesData as Record<string, unknown>[]);
      } catch (error) {
        console.error('Error loading data:', error);
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const data = await apiGet('/api/branches');
        setBranches(data as { id: string; name: string }[]);
        // Only set the first branch if none is selected
        if ((data as { id: string; name: string }[]).length > 0 && !selectedBranchId) {
          setSelectedBranchId((data as { id: string; name: string }[])[0].id);
        }
      } catch (error) {
        console.error('Error fetching branches:', error);
      }
    };
    fetchBranches();
  }, [selectedBranchId, setSelectedBranchId]);

  // Cart management functions with history
  const saveToHistory = useCallback((newCart: CartItem[]) => {
    setCartHistory(prev => {
      const newHistory = [...prev.slice(0, currentHistoryIndex + 1), newCart];
      if (newHistory.length > 10) newHistory.shift();
      return newHistory;
    });
    setCurrentHistoryIndex(prev => prev + 1);
  }, [currentHistoryIndex]);

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
  }, [saveToHistory]);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prevCart => {
      const newCart = prevCart.filter(item => item.id !== productId);
      saveToHistory(newCart);
      return newCart;
    });
  }, [saveToHistory]);

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
  }, [products, removeFromCart, saveToHistory]);

  const undoCart = useCallback(() => {
    if (currentHistoryIndex > 0) {
      setCurrentHistoryIndex(prev => prev - 1);
      setCart(cartHistory[currentHistoryIndex - 1]);
    }
  }, [currentHistoryIndex, cartHistory]);

  const redoCart = useCallback(() => {
    if (currentHistoryIndex < cartHistory.length - 1) {
      setCurrentHistoryIndex(prev => prev + 1);
      setCart(cartHistory[currentHistoryIndex + 1]);
    }
  }, [currentHistoryIndex, cartHistory]);

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
        
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cart, redoCart, undoCart]);
const clearCart = useCallback(() => {
  setCart([]);
  setCartHistory([]);
  setCurrentHistoryIndex(-1);
}, []);

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

 
  
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const data = await apiGet('/api/branches');
        setBranches(data as { id: string; name: string }[]);
        // Only set the first branch if none is selected
        const branchData = data as { id: string; name: string }[];
        if (branchData.length > 0 && !selectedBranchId) {
          setSelectedBranchId(branchData[0].id);
        }
      } catch (error) {
        console.error('Error fetching branches:', error);
      }
    };
    fetchBranches();
  }, [selectedBranchId, setSelectedBranchId]);

  const handleConfirmSale = async () => {
    // Validate required fields
    if (!customerName?.trim()) {
      setError("Customer name is required");
      return;
    }

    if (!selectedBranchId) {
      setError("Please select a branch before processing the sale");
      return;
    }

    if (paymentMethod === 'cash' && amountReceived < cartTotal) {
      setError("Amount received is less than the total amount");
      return;
    }

    
    setError(null);

    try {
      if (paymentMethod === "cash" && amountReceived < cartTotal) {
        throw new Error("Amount received must cover the total");
      }

      // Prepare the sale data according to CreateSaleDto
      const saleData = {
  items: cart.map(item => ({
    productId: item.id,
    quantity: item.quantity,
    price: item.price
  })),
  paymentMethod,
  amountReceived: paymentMethod === 'cash' ? amountReceived : cartTotal,
  customerName: customerName || undefined,
  customerPhone: customerPhone || undefined,
  branchId: selectedBranchId,
  idempotencyKey: uuidv4(),
  total: cartTotal // Add total as it's expected by the DTO
};

      console.log("Submitting sale data:", saleData);
      const response = await apiPost("/sales", saleData);
      type SaleResponse = { data?: { id?: string; saleId?: string; _id?: string } };
      const sale = (response as SaleResponse).data || response;
      console.log("Sale created successfully:", sale);
      
      // Update cache with new stock levels
      const stockUpdates = cart.map(item => ({
        id: item.id,
        updates: { stock: item.stock - item.quantity }
      }));
      productCache.updateProducts(stockUpdates);

      // Reset form state
      clearCart();
      setCheckoutOpen(false);
      setCustomerName("");
      setCustomerPhone("");
      setAmountReceived(0);

      // Redirect to receipt page with the sale ID
      const saleObj = sale as { id?: string; saleId?: string; _id?: string };
      const saleId = (saleObj as { id?: string; saleId?: string; _id?: string }).id || saleObj.saleId || saleObj._id;
      console.log("Extracted sale ID:", saleId);

      if (saleId) {
        router.push(`/sales/receipt/${saleId}`);
      } else {
        console.error("No sale ID found in response:", sale);
        setError("Sale completed but could not redirect to receipt");
      }
   } catch (err: unknown) {
  const error = err as Error;
  console.error("Error creating sale:", error);
  setError(error.message || "Failed to complete sale");
} finally {
     
    }
  };

  // M-Pesa payment handlers
  const handleMpesaSuccess = useCallback((transactionId: string) => {
    // Validate required fields
    if (!selectedBranchId) {
      setError("Please select a branch before processing the payment");
      return;
    }
    
    if (!customerName?.trim() || !customerPhone?.trim()) {
      setError("Customer name and phone number are required for M-Pesa payment");
      return;
    }
    
   
    const completeMpesaSale = async () => {
      try {
        const saleData = {
          items: cart.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price,
            name: item.name
          })),
          total: cartTotal,
          paymentMethod: 'mpesa',
          mpesaTransactionId: transactionId,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          idempotencyKey: uuidv4(),
          branchId: selectedBranchId,
          tenantId: businessInfo?.id,
          userId: user?.id
        };

        const sale = await apiPost("/sales", saleData);
        
        clearCart();
        setCheckoutOpen(false);
        setShowMpesaPayment(false);
        setCustomerName("");
        setCustomerPhone("");
        
        alert('Payment successful! Your order has been processed.');
        
        apiGet("/products").then((data) => setProducts(data as Product[]));
        
        const saleObj = sale as { id?: string; saleId?: string; _id?: string };
        const saleId = saleObj.id || saleObj.saleId || saleObj._id;
        if (saleId) {
          router.push(`/sales/receipt/${saleId}`);
        }
      } catch  {
        console.error('Error completing M-Pesa sale:');
        setError('Payment was successful but there was an error processing your order. Please contact support.');
      } 
    };
    
    completeMpesaSale();
  }, [
    cart,
    cartTotal,
    customerName,
    customerPhone,
    businessInfo,
    user,
    clearCart,
    router,
    selectedBranchId,
  ]);

  const handleMpesaCancel = useCallback(() => {
    setShowMpesaPayment(false);
  
  }, []);

  const quickActions: QuickAction[] = [
    {
      id: "undo",
      name: "Undo (Ctrl+Z)",
      action: undoCart,
      icon: <FaUndo />,
      color: "bg-gray-500 hover:bg-gray-600"
    },
    {
      id: "redo", 
      name: "Redo (Ctrl+Shift+Z)",
      action: redoCart,
      icon: <FaRedo />,
      color: "bg-gray-500 hover:bg-gray-600"
    },
    {
      id: "clear",
      name: "Clear Cart",
      action: clearCart,
      icon: <FaTimes />,
      color: "bg-red-500 hover:bg-red-600"
    },
    {
      id: "history",
      name: "Recent Sales",
      action: () => router.push("/sales/history"),
      icon: <FaHistory />,
      color: "bg-blue-500 hover:bg-blue-600"
    }
  ];

  const [isSearching] = useState(false);

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
          <p className="text-gray-600 mb-4">You don&apos;t have permission to view sales.</p>
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
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
                <p className="text-sm text-gray-500">Welcome back, {typeof businessInfo?.name === "string" && businessInfo?.name.trim() !== "" ? businessInfo.name : "User"}</p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm transition"
                  title="Keyboard Shortcuts"
                >
                  <FaKeyboard className="w-4 h-4" />
                  Shortcuts
                </button>
                
                <FeatureGuard requiredFeature="data_export" fallback={
                  <button disabled className="p-2.5 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed">
                    <FaDownload className="w-5 h-5" />
                    Export
                    <FaLock className="w-3 h-3" />
                  </button>
                }>
                  <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm transition">
                    <FaDownload className="w-4 h-4" />
                    Export
                  </button>
                </FeatureGuard>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <FaShoppingCart className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Cart Items</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{cart.length}</p>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-100">
                <div className="flex items-center gap-2 mb-1">
                  <FaMoneyBillWave className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Total</span>
                </div>
                <p className="text-2xl font-bold text-green-900">${cartTotal.toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-100">
                <div className="flex items-center gap-2 mb-1">
                  <FaChartLine className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">Products</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">{products.length}</p>
              </div>
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-100">
                <div className="flex items-center gap-2 mb-1">
                  <FaClock className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">Recent Sales</span>
                </div>
                <p className="text-2xl font-bold text-orange-900">{recentSales.length}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Keyboard Shortcuts Modal */}
        {showKeyboardShortcuts && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-lg">Keyboard Shortcuts</h3>
                <button onClick={() => setShowKeyboardShortcuts(false)} className="text-gray-500 hover:text-gray-700">
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Ctrl+F</span>
                  <span className="font-medium">Search products</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Ctrl+Z</span>
                  <span className="font-medium">Undo cart change</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Ctrl+Shift+Z</span>
                  <span className="font-medium">Redo cart change</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Enter</span>
                  <span className="font-medium">Proceed to checkout</span>
                </div>
                <div className="flex justify-between py-2">
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
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Cart Summary</h2>
                    {selectedBranchId ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        {branches.find(b => b.id === selectedBranchId)?.name || 'Branch'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        No Branch Selected
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    <FeatureGuard requiredFeature="api_access" fallback={
                      <button disabled className="p-2.5 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed">
                        <FaQrcode className="w-5 h-5" />
                      </button>
                    }>
                      <button
                        onClick={() => setShowScanner(true)}
                        className="p-2.5 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                        title="Scan QR Code"
                      >
                        <FaQrcode className="w-5 h-5" />
                      </button>
                    </FeatureGuard>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="mb-4">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      id="search-input"
                      type="text"
                      placeholder="Search products by name, SKU, or description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <FaTimes className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Enhanced Filters */}
                <div className="flex items-center gap-4">
                  {/* Category Filter */}
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                    <div className="relative">
                      <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                      >
                        {categories.map(category => (
                          <option key={category} value={category}>
                            {category === 'all' ? 'All Categories' : category}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Sort By */}
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
                    <div className="relative">
                      <FaSort className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                      <select
  value={sortBy}
  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as "name" | "price" | "stock")}
  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
>
                        <option value="name">Name</option>
                        <option value="price">Price</option>
                        <option value="stock">Stock</option>
                      </select>
                    </div>
                  </div>

                  {/* View Mode */}
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">View</label>
                    <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                          viewMode === "grid" 
                            ? "bg-blue-600 text-white" 
                            : "bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <FaTh className="w-3 h-3" />
                        Grid
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                          viewMode === "list" 
                            ? "bg-blue-600 text-white" 
                            : "bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <FaList className="w-3 h-3" />
                        List
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Grid */}
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
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
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {paginatedProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                    {/* Enhanced Pagination */}
                    {pageCount > 1 && (
                      <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center mt-4">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-100 rounded-lg transition"
                        >
                          <FaChevronLeft className="w-3 h-3" />
                          Previous
                        </button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                            const page = i + 1;
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 text-sm rounded-lg transition ${
                                  currentPage === page
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          })}
                          {pageCount > 5 && (
                            <span className="px-2 text-gray-500">...</span>
                          )}
                        </div>

                        <button
                          onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}
                          disabled={currentPage === pageCount}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-100 rounded-lg transition"
                        >
                          Next
                          <FaChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Enhanced Cart Section */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm h-full flex flex-col border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                      <FaShoppingCart className="text-blue-600" />
                      Order Summary
                    </h2>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-medium">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                    </span>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    {quickActions.map(action => (
                      <Tooltip key={action.id} content={action.name}>
                        <button
                          onClick={action.action}
                          className={`p-2.5 rounded-lg text-white text-xs font-medium transition-colors ${action.color} shadow-sm hover:shadow-md`}
                        >
                          {action.icon}
                        </button>
                      </Tooltip>
                    ))}
                  </div>
                </div>
                
                {cart.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500">
                    <FaShoppingCart className="w-12 h-12 mb-3 text-gray-300" />
                    <p className="font-medium text-gray-500">Your cart is empty</p>
                    <p className="text-sm mt-1">Add products to get started</p>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {cart.map(item => (
                        <div key={item.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-800 text-sm line-clamp-1">{item.name}</h3>
                            <p className="text-xs text-gray-600">${item.price.toFixed(2)} each</p>
                            <p className="text-xs text-gray-500 mt-1">Subtotal: ${(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            >
                              <FaMinus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center font-medium text-gray-800">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.quantity >= item.stock}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                            >
                              <FaPlus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium">${cartSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">VAT (16%):</span>
                          <span className="font-medium">${vatAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold pt-3 border-t border-gray-200">
                          <span>Total:</span>
                          <span className="text-blue-600">${cartTotal.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleCheckout}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
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
          <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl overflow-hidden w-full max-w-md shadow-2xl">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-lg">Scan Product QR Code</h3>
                <button 
                  onClick={() => {
                    setShowScanner(false);
                    
                  }}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 text-center">
                <div className="bg-black p-4 rounded-lg mb-4 mx-auto max-w-xs">
                  <div className="aspect-square bg-white/10 rounded relative overflow-hidden border-2 border-dashed border-white/30">
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
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Checkout Modal */}
        {checkoutOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
                <h3 className="font-semibold text-lg">Complete Order</h3>
                <button 
                  onClick={() => setCheckoutOpen(false)}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition"
                
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Customer Info */}
                <div>
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <FaUser className="text-blue-500" />
                    Customer Information
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-600 mb-1 flex items-center">
                        Name <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder="John Doe"
                        required
                      />
                      {!customerName && <p className="mt-1 text-sm text-red-600">Customer name is required</p>}
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 mb-1 flex items-center">
                        Phone <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder="254700000000"
                        required
                      />
                      {!customerPhone && <p className="mt-1 text-sm text-red-600">Phone number is required</p>}
                    </div>
                  </div>
                </div>
                
                {/* Branch */}
                <div>
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <FaStore className="text-blue-500" />
                    Branch
                  </h4>
                  <select
                    value={selectedBranchId || ''}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                   
                  >
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <FaMoneyBillWave className="text-blue-500" />
                    Payment Method
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPaymentMethod("cash")}
                      className={`p-3 border rounded-lg flex items-center justify-center gap-2 transition-colors ${
                        paymentMethod === "cash" 
                          ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-inner' 
                          : 'border-gray-300 hover:border-blue-300 bg-white'
                      }`}
                    >
                      <FaMoneyBillWave />
                      Cash
                    </button>
                    <button
                      onClick={() => setPaymentMethod("mpesa")}
                      className={`p-3 border rounded-lg flex items-center justify-center gap-2 transition-colors ${
                        paymentMethod === "mpesa" 
                          ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-inner' 
                          : 'border-gray-300 hover:border-blue-300 bg-white'
                      }`}
                    >
                      <FaMobileAlt />
                      M-Pesa
                    </button>
                  </div>
                </div>
                
                {/* Payment Details */}
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Payment Details</h4>
                  {paymentMethod === "cash" ? (
                    <div>
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Subtotal:</span>
                          <span>${cartSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">VAT (16%):</span>
                          <span>${vatAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                          <span className="text-gray-700 font-medium">Amount Due:</span>
                          <span className="font-bold text-lg">${cartTotal.toFixed(2)}</span>
                        </div>
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
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                          placeholder="0.00"
                          min={cartTotal}
                          step="0.01"
                        />
                      </div>
                      {amountReceived > 0 && (
                        <div className="mt-3 p-3 rounded-lg bg-gray-50">
                          <div className="flex justify-between">
                            <span className="text-gray-700">Change: </span>
                            <span className="font-medium text-green-600">
                              ${(amountReceived - cartTotal).toFixed(2)}
                            </span>
                          </div>
                          {amountReceived < cartTotal && (
                            <p className="text-red-500 text-xs mt-1">Amount received is less than total</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center mb-3 bg-green-50 p-3 rounded-lg">
                        <span className="text-gray-700 font-medium">Amount Due:</span>
                        <span className="font-bold text-lg">KES {cartTotal.toFixed(2)}</span>
                      </div>
                      <div className="text-center py-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-3">
                          M-Pesa payment will be processed after order confirmation
                        </p>
                        <button 
                          onClick={() => setShowMpesaPayment(true)}
                          className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
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
                    <div className="flex items-center gap-2">
                      <FaExclamationTriangle className="w-4 h-4" />
                      {error}
                    </div>
                  </div>
                )}
                
                {/* Order Summary */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-medium text-gray-800 mb-2">Order Summary</h4>
                  <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between text-sm py-1.5">
                        <span className="text-gray-700">{item.name} × {item.quantity}</span>
                        <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-bold border-t border-gray-200 pt-3 text-lg">
                    <span>Total</span>
                    <span className="text-blue-600">${cartTotal.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-1">
                  <button
                    onClick={() => setCheckoutOpen(false)}
                    
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmSale}
                    disabled={(paymentMethod === "cash" && amountReceived < cartTotal)}
                    className={`flex-1 px-4 py-3 rounded-lg text-white transition-colors flex items-center justify-center gap-2 ${
                      'bg-blue-600 hover:bg-blue-700'
                    } shadow-md hover:shadow-lg disabled:opacity-50`}
                  >
                  
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* M-Pesa Payment Modal */}
        {showMpesaPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
                <h3 className="font-semibold text-lg">M-Pesa Payment</h3>
                <button 
                  onClick={() => setShowMpesaPayment(false)}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition"
                  
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
                    branchId: selectedBranchId,
                    tenantId: businessInfo?.id,
                    userId: user?.id,
                    timestamp: new Date().toISOString()
                  }}
                  onSuccess={handleMpesaSuccess}
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



