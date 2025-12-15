"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { apiGet, apiPost } from "@/utils/api";
import React from "react";
import Spinner from '@/components/Spinner';
import { v4 as uuidv4 } from 'uuid';
import FeatureGuard from '@/components/FeatureGuard';
import AuthGuard from '@/components/AuthGuard';
import { useRouter } from "next/navigation";
import {
  FaStore, FaQrcode,  FaSearch,
  FaShoppingCart, FaMoneyBillWave, FaMobileAlt, FaTimes, FaChevronLeft,
  FaChevronRight, FaKeyboard, FaHistory, FaUser, FaUndo, FaRedo,
  FaStar, FaExclamationTriangle,
  FaSort, FaTh, FaList, FaPlus, FaMinus, FaCheck
} from 'react-icons/fa';
import MpesaPayment from '@/components/MpesaPayment';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import Tooltip from '@/components/Tooltip';
import { useQuery, keepPreviousData } from '@tanstack/react-query';

import ProductSkeleton from '@/components/ProductSkeleton';
import { useBranch } from "@/contexts/BranchContext";
import { productCache } from '@/lib/productCache';
import { useTenant } from '@/hooks/useTenant';
import { useBranches } from '@/hooks/useBranches';



type Product = { 
  id: string; 
  name: string; 
  price: number; 
  stock: number; 
  category?: string;
  sku?: string;
  description?: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
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
  
  // Use React Query hooks for data fetching
  const { data: tenantData } = useTenant();
  const { data: branchesData = [] } = useBranches();
  
  // Convert branches data format
  const branches = branchesData.map(b => ({ id: b.id, name: b.name }));
  
  // Auto-select first branch if none selected
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId, setSelectedBranchId]);

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [creditDueDate, setCreditDueDate] = useState("");
  const [creditNotes, setCreditNotes] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const totalCheckoutSteps = 3;

  const [businessInfo, setBusinessInfo] = useState<Record<string, unknown> | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  
  // Set business info from tenant data
  useEffect(() => {
    if (tenantData) {
      setBusinessInfo(tenantData as Record<string, unknown>);
      cacheBusinessInfo(tenantData as Record<string, unknown>);
    }
  }, [tenantData]);


  // New state for enhanced features
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price" | "stock">("name");
  
  // Debounce search query to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms debounce delay
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const [sortOrder] = useState('asc');

  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [cartHistory, setCartHistory] = useState<CartItem[][]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

  const [favoriteProducts, setFavoriteProducts] = useState<string[]>([]);
  const [showMpesaPayment, setShowMpesaPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingSale, setProcessingSale] = useState(false);

  // Simplified product handling

  // Permission checks
  const canViewSales = hasPermission(user, 'view_sales');

  // Constants
  const productsPerPage = 12;
  
  // Since we're using server-side search, we only need to sort client-side
  // Filtering is done on the server via debouncedSearchQuery
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    
    return products.sort((a: Product, b: Product) => {
      // First, sort by stock availability: in-stock products first
      const aInStock = a.stock > 0;
      const bInStock = b.stock > 0;

      if (aInStock && !bInStock) return -1; // a comes first (in stock)
      if (!aInStock && bInStock) return 1;  // b comes first (in stock)

      // If both are in the same stock category, sort by the chosen criteria
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
  }, [products, sortBy, sortOrder]);
  
  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);
  
  const pageCount = Math.ceil(filteredProducts.length / productsPerPage);
  const paginatedProducts = useMemo(() => 
    filteredProducts.slice(
      (currentPage - 1) * productsPerPage, 
      currentPage * productsPerPage
    ),
    [filteredProducts, currentPage, productsPerPage]
  );
  const VAT_RATE = 0.16; // 16% VAT rate for Kenya
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const vatAmount = cartSubtotal * VAT_RATE;
  const cartTotal = cartSubtotal + vatAmount;

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

  // Fetch products using React Query with server-side search and pagination
  // Optimized: Fetch smaller batches, search on server, only fetch when needed
  const { data: productsData, isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ['products', 'sales', selectedBranchId, debouncedSearchQuery],
    queryFn: async () => {
      if (!selectedBranchId) return { products: [], pagination: null };
      
      // Build query parameters
      const searchParam = debouncedSearchQuery ? `&search=${encodeURIComponent(debouncedSearchQuery)}` : '';
      
      // For POS: 
      // - If searching: fetch up to 50 matching products (sufficient for search results)
      // - If no search: fetch 100 most recent/in-stock products (quick initial load)
      const limit = debouncedSearchQuery ? 50 : 100;
      
      const data = await apiGet(
        `/products?page=1&limit=${limit}${searchParam}`, 
        { 'x-branch-id': selectedBranchId }
      ) as { products: Product[]; pagination: Pagination };
      
      return data;
    },
    enabled: !!selectedBranchId,
    staleTime: debouncedSearchQuery ? 30 * 1000 : 2 * 60 * 1000, // Shorter cache for search results
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData, // Keep previous results while fetching new search
  });

  // Update products state when query data changes
  useEffect(() => {
    if (productsData) {
      setProducts(productsData.products || []);
      setLoading(false);
    }
  }, [productsData]);

  // Update loading and error states
  useEffect(() => {
    setLoading(productsLoading);
    if (productsError) {
      const error = productsError instanceof Error ? productsError : new Error('Failed to fetch products');
      setError(error.message);
    }
  }, [productsLoading, productsError]);

  // Cache business info for faster receipt generation
  const cacheBusinessInfo = (businessInfo: Record<string, unknown>) => {
    const cacheData = {
      data: businessInfo,
      timestamp: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
    };
    localStorage.setItem('businessInfoCache', JSON.stringify(cacheData));
  };

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
              ? { ...item, quantity: Math.min(item.quantity + 1, product.stock || 0) }
              : item
          )
        : [...prevCart, { ...product, quantity: 1 } as CartItem];

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
    setCheckoutStep(1);
  };

  const handleConfirmSale = async () => {
    setProcessingSale(true);
    setError(null);

    // Validate required fields
    if (!customerName?.trim()) {
      setError("Customer name is required");
      setProcessingSale(false);
      return;
    }

    if (!selectedBranchId) {
      setError("Please select a branch before processing the sale");
      setProcessingSale(false);
      return;
    }

    if (paymentMethod === 'cash' && amountReceived < cartTotal) {
      setError("Amount received is less than the total amount");
      setProcessingSale(false);
      return;
    }

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
  total: cartTotal, // Add total as it's expected by the DTO
  // Credit-specific fields
  ...(paymentMethod === 'credit' && {
    creditAmount: creditAmount || cartTotal,
    creditDueDate: creditDueDate || undefined,
    creditNotes: creditNotes || undefined,
  }),
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
      productCache.updateProducts(stockUpdates, user?.tenantId);

      // Update local products state
      setProducts(prevProducts =>
        (prevProducts || []).map(product => {
          const cartItem = cart.find(item => item.id === product.id);
          if (cartItem) {
            return { ...product, stock: product.stock - cartItem.quantity };
          }
          return product;
        })
      );

      // Reset form state
      clearCart();
      setCheckoutOpen(false);
      setCustomerName("");
      setCustomerPhone("");
      setAmountReceived(0);
      setCreditAmount(0);
      setCreditDueDate("");
      setCreditNotes("");

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
  setProcessingSale(false);
}
  };

  // M-Pesa payment handlers
  const handleMpesaSuccess = useCallback((transactionId: string) => {
    // The sale is already created in the M-Pesa callback, so we just need to handle the UI success flow
    console.log('M-Pesa payment successful, transaction ID:', transactionId);

    // Clear the cart and reset form state
    clearCart();
    setCheckoutOpen(false);
    setShowMpesaPayment(false);
    setCustomerName("");
    setCustomerPhone("");

    // Refresh products to update stock levels
    apiGet("/products").then((data) => setProducts(data as Product[]));

    // Show success message
    alert('Payment successful! Your order has been processed.');

    // Note: The sale creation and receipt redirect is handled by the M-Pesa callback
    // The callback will have already created the sale and the receipt page will be accessible
  }, [clearCart]);

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
        <h1 className="text-xl font-bold text-red-600 mb-2">Error Loading Sales</h1>
        <p className="text-gray-700 mb-4">{error}</p>
        <div className="flex gap-2 justify-center">
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Retry
          </button>
          <button 
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Enhanced Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto  py-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center ">
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
                
                
              </div>
            </div>

            {/* Quick Stats
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
            </div> */}
          </div>
        </header>

        {/* Keyboard Shortcuts Modal */}
        {showKeyboardShortcuts && (
          <div className="fixed inset-0 bg-white bg-opacity-95 backdrop-blur-md flex items-center justify-center z-50 p-4">
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
                      {searchQuery ? 'Try a different search term' : 'No products available for this branch/tenant. Check with administrator or add products in Inventory.'}
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
          <div className="fixed inset-0 bg-white bg-opacity-95 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl h-[95vh] flex flex-col shadow-2xl border border-gray-200">
              {/* Progress Indicator */}
              <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-xl text-gray-900">Complete Order</h3>
                  <button
                    onClick={() => setCheckoutOpen(false)}
                    className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center space-x-4">
                  {[
                    { step: 1, label: 'Customer Info', icon: FaUser },
                    { step: 2, label: 'Payment', icon: FaMoneyBillWave },
                    { step: 3, label: 'Confirmation', icon: FaCheck }
                  ].map(({ step, label, icon: Icon }) => (
                    <div key={step} className="flex items-center flex-1">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                        step < checkoutStep
                          ? 'bg-green-500 border-green-500 text-white'
                          : step === checkoutStep
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'border-gray-300 text-gray-400'
                      }`}>
                        {step < checkoutStep ? <FaCheck className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <span className={`ml-3 text-sm font-medium ${
                        step <= checkoutStep ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {label}
                      </span>
                      {step < totalCheckoutSteps && (
                        <div className={`flex-1 h-0.5 mx-4 ${
                          step < checkoutStep ? 'bg-green-500' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Step Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                  {/* Step 1: Customer Information */}
                  {checkoutStep === 1 && (
                    <div className="space-y-6">
                      <div className="text-center mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">Customer Information</h4>
                        <p className="text-gray-600">Please provide customer details to proceed</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Customer Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Enter customer name"
                            required
                          />
                          {!customerName && <p className="mt-1 text-sm text-red-600">Customer name is required</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Phone Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="254700000000"
                            required
                          />
                          {!customerPhone && <p className="mt-1 text-sm text-red-600">Phone number is required</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <FaStore className="inline w-4 h-4 mr-2" />
                            Branch
                          </label>
                          <select
                            value={selectedBranchId || ''}
                            onChange={(e) => setSelectedBranchId(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                          >
                            {branches.map(branch => (
                              <option key={branch.id} value={branch.id}>
                                {branch.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Payment Method & Details */}
                  {checkoutStep === 2 && (
                    <div className="space-y-6">
                      <div className="text-center mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">Payment Details</h4>
                        <p className="text-gray-600">Choose your payment method and complete the transaction</p>
                      </div>

                      {/* Payment Method Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
                        <div className="grid grid-cols-3 gap-4">
                          <button
                            onClick={() => setPaymentMethod("cash")}
                            className={`p-4 border-2 rounded-xl flex items-center justify-center gap-3 transition-all ${
                              paymentMethod === "cash"
                                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg'
                                : 'border-gray-200 hover:border-blue-300 bg-white hover:shadow-md'
                            }`}
                          >
                            <FaMoneyBillWave className="w-5 h-5" />
                            <span className="font-medium">Cash</span>
                          </button>
                          <button
                            onClick={() => setPaymentMethod("mpesa")}
                            className={`p-4 border-2 rounded-xl flex items-center justify-center gap-3 transition-all ${
                              paymentMethod === "mpesa"
                                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg'
                                : 'border-gray-200 hover:border-blue-300 bg-white hover:shadow-md'
                            }`}
                          >
                            <FaMobileAlt className="w-5 h-5" />
                            <span className="font-medium">M-Pesa</span>
                          </button>
                          <button
                            onClick={() => setPaymentMethod("credit")}
                            className={`p-4 border-2 rounded-xl flex items-center justify-center gap-3 transition-all ${
                              paymentMethod === "credit"
                                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg'
                                : 'border-gray-200 hover:border-blue-300 bg-white hover:shadow-md'
                            }`}
                          >
                            <FaMoneyBillWave className="w-5 h-5" />
                            <span className="font-medium">Credit</span>
                          </button>
                        </div>
                      </div>

                      {/* Payment Details */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        {paymentMethod === "cash" ? (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700">Subtotal:</span>
                              <span className="font-medium">${cartSubtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700">VAT (16%):</span>
                              <span className="font-medium">${vatAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                              <span className="text-gray-900 font-semibold">Total Amount:</span>
                              <span className="font-bold text-xl text-blue-600">${cartTotal.toFixed(2)}</span>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Amount Received</label>
                              <input
                                type="number"
                                value={amountReceived}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  setAmountReceived(isNaN(value) ? 0 : value);
                                }}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="0.00"
                                min={cartTotal}
                                step="0.01"
                              />
                            </div>

                            {amountReceived > 0 && (
                              <div className={`p-4 rounded-xl ${
                                amountReceived >= cartTotal
                                  ? 'bg-green-50 border border-green-200'
                                  : 'bg-red-50 border border-red-200'
                              }`}>
                                <div className="flex justify-between items-center">
                                  <span className={`font-medium ${
                                    amountReceived >= cartTotal ? 'text-green-800' : 'text-red-800'
                                  }`}>
                                    {amountReceived >= cartTotal ? 'Change:' : 'Shortfall:'}
                                  </span>
                                  <span className={`font-bold text-lg ${
                                    amountReceived >= cartTotal ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    ${(amountReceived - cartTotal).toFixed(2)}
                                  </span>
                                </div>
                                {amountReceived < cartTotal && (
                                  <p className="text-red-600 text-sm mt-2">
                                    Amount received is less than the total amount
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ) : paymentMethod === 'credit' ? (
                          <div className="space-y-4">
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-700 font-medium">Total Amount:</span>
                                <span className="font-bold text-xl text-blue-600">${cartTotal.toFixed(2)}</span>
                              </div>
                              <p className="text-sm text-gray-600">
                                Credit sale will be recorded for the customer
                              </p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Credit Amount</label>
                              <input
                                type="number"
                                value={creditAmount || cartTotal}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  setCreditAmount(isNaN(value) ? 0 : value);
                                }}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder={cartTotal.toFixed(2)}
                                min="0"
                                step="0.01"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date (Optional)</label>
                              <input
                                type="date"
                                value={creditDueDate}
                                onChange={(e) => setCreditDueDate(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                min={new Date().toISOString().split('T')[0]}
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                              <textarea
                                value={creditNotes}
                                onChange={(e) => setCreditNotes(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Additional notes for this credit sale..."
                                rows={3}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-center space-y-4">
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-700 font-medium">Amount Due:</span>
                                <span className="font-bold text-xl text-green-600">KES {cartTotal.toFixed(2)}</span>
                              </div>
                              <p className="text-sm text-gray-600">
                                M-Pesa payment will be processed securely
                              </p>
                            </div>
                            <button
                              onClick={() => setShowMpesaPayment(true)}
                              className="w-full px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium shadow-lg hover:shadow-xl"
                            >
                              Proceed to M-Pesa Payment
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 3: Confirmation */}
                  {checkoutStep === 3 && (
                    <div className="space-y-6">
                      <div className="text-center mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">Order Confirmation</h4>
                        <p className="text-gray-600">Please review your order details before completing</p>
                      </div>

                      {/* Order Summary */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h5 className="font-medium text-gray-900 mb-3">Order Summary</h5>
                        <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
                          {cart.map(item => (
                            <div key={item.id} className="flex justify-between items-center py-2">
                              <span className="text-gray-700">{item.name}</span>
                              <span className="text-gray-900 font-medium">
                                {item.quantity} × ${item.price.toFixed(2)} = ${(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-gray-200 pt-3 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-700">Subtotal:</span>
                            <span className="font-medium">${cartSubtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-700">VAT (16%):</span>
                            <span className="font-medium">${vatAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                            <span>Total:</span>
                            <span className="text-blue-600">${cartTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Customer & Payment Info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-xl p-4">
                          <h6 className="font-medium text-blue-900 mb-2">Customer Details</h6>
                          <p className="text-blue-800 text-sm">{customerName}</p>
                          <p className="text-blue-800 text-sm">{customerPhone}</p>
                        </div>
                        <div className="bg-green-50 rounded-xl p-4">
                          <h6 className="font-medium text-green-900 mb-2">Payment Method</h6>
                          <p className="text-green-800 text-sm capitalize">{paymentMethod}</p>
                          {paymentMethod === 'cash' && amountReceived > 0 && (
                            <p className="text-green-800 text-sm">
                              Received: ${amountReceived.toFixed(2)}
                            </p>
                          )}
                          {paymentMethod === 'credit' && (
                            <div className="text-green-800 text-sm mt-2">
                              <p>Credit Amount: ${(creditAmount || cartTotal).toFixed(2)}</p>
                              {creditDueDate && <p>Due Date: {new Date(creditDueDate).toLocaleDateString()}</p>}
                              {creditNotes && <p>Notes: {creditNotes}</p>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Error Message */}
                      {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                          <div className="flex items-center gap-2">
                            <FaExclamationTriangle className="w-5 h-5" />
                            <span className="font-medium">{error}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0 rounded-b-2xl">
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => setCheckoutStep(prev => Math.max(1, prev - 1))}
                    disabled={checkoutStep === 1}
                    className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Previous
                  </button>

                  <div className="text-sm text-gray-500">
                    Step {checkoutStep} of {totalCheckoutSteps}
                  </div>

                  {checkoutStep < totalCheckoutSteps ? (
                    <button
                      onClick={() => setCheckoutStep(prev => prev + 1)}
                      disabled={
                        (checkoutStep === 1 && (!customerName.trim() || !customerPhone.trim())) ||
                        (checkoutStep === 2 && paymentMethod === "cash" && amountReceived < cartTotal)
                      }
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={handleConfirmSale}
                      disabled={processingSale}
                      className="px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 font-medium shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                      {processingSale ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <FaCheck className="w-4 h-4" />
                          Complete Sale
                        </>
                      )}
                    </button>
                  )}
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
                    tenantId: businessInfo?.id, // <-- this is correct
                    userId: user?.id,
                    timestamp: new Date().toISOString()
                  }}
                  // tenantId prop removed because it's not defined in MpesaPaymentProps
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



