"use client";
import { useState, useEffect } from "react";
import { apiGet, apiPost } from "@/utils/api";
import React from "react";
import Spinner from '@/components/Spinner';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeCanvas } from 'qrcode.react';
import Barcode from 'react-barcode';
import { Scanner } from '@yudiel/react-qr-scanner';
import FeatureGuard from '@/components/FeatureGuard';
import { useRouter } from "next/navigation";
import { FaLock, FaArrowUp, FaQrcode, FaBarcode, FaDownload, FaUpload, FaSearch, FaShoppingCart, FaMoneyBillWave, FaMobileAlt, FaTimes, FaPrint, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

type Product = { id: string; name: string; price: number; stock: number; };
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

export default function SalesPage() {
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

  // Constants
  const productsPerPage = 12;
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const pageCount = Math.ceil(filteredProducts.length / productsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * productsPerPage, 
    currentPage * productsPerPage
  );
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [products, businessInfo] = await Promise.all([
          apiGet("/products"),
          apiGet("/tenant/me"),
        ]);
        setProducts(products);
        setBusinessInfo(businessInfo);
      } catch (err) {
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Cart management functions
  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item
        );
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(prevCart => prevCart.map(item => {
      if (item.id === productId) {
        const product = products.find(p => p.id === productId);
        return { ...item, quantity: Math.min(newQuantity, product?.stock || 0) };
      }
      return item;
    }));
  };

  const handleCheckout = () => {
    setCheckoutOpen(true);
  };

  const handleConfirmSale = async () => {
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
      setCart([]);
      setCheckoutOpen(false);
      setCustomerName("");
      setCustomerPhone("");
      setAmountReceived(0);
      
      // Refresh products
      apiGet("/products").then(setProducts);
      
      // Redirect to receipt page - use saleId or sale.id
      const saleId = sale.id || sale.saleId || sale._id;
      if (saleId) {
        router.push(`/sales/receipt/${saleId}`);
      } else {
        // Fallback: show success message and stay on page
        alert("Sale completed successfully!");
      }
    } catch (err: any) {
      setError(err.message || "Failed to complete sale");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Spinner size="lg" />
    </div>
  );

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
            <p className="text-sm text-gray-500">Welcome back, {businessInfo?.name || 'User'}</p>
          </div>
          
          <div className="flex gap-3">
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
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search and Actions */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <FeatureGuard requiredFeature="api_access" fallback={
                  <button disabled className="p-2 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed">
                    <FaQrcode className="w-5 h-5" />
                  </button>
                }>
                  <button
                    onClick={() => setShowScanner(true)}
                    className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition"
                    title="Scan QR Code"
                  >
                    <FaQrcode className="w-5 h-5" />
                  </button>
                </FeatureGuard>
              </div>
            </div>

            {/* Products Grid */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-800">Available Products</h2>
              </div>
              
              {paginatedProducts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchTerm ? "No products match your search" : "No products available"}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4">
                  {paginatedProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={product.stock <= 0}
                      className={`relative p-3 rounded-lg border transition-all ${product.stock <= 0 ? 
                        'bg-gray-100 border-gray-200 cursor-not-allowed' : 
                        'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md hover:transform hover:-translate-y-0.5'
                      }`}
                    >
                      {product.stock <= 0 && (
                        <span className="absolute top-2 right-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                          Out of stock
                        </span>
                      )}
                      <h3 className="font-medium text-gray-800 text-sm mb-1 truncate">{product.name}</h3>
                      <p className="text-lg font-bold text-blue-600">${product.price.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">Stock: {product.stock}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pageCount > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <FaChevronLeft className="w-3 h-3" />
                    Previous
                  </button>
                  
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {pageCount}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}
                    disabled={currentPage === pageCount}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Next
                    <FaChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Cart Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm h-full flex flex-col">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <FaShoppingCart className="text-blue-600" />
                  Order Summary
                </h2>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                </span>
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
                  {/* Scanner placeholder - would be replaced with actual scanner */}
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

      {/* Checkout Modal */}
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
                      <span className="font-bold">${cartTotal.toFixed(2)}</span>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">M-Pesa Phone Number</label>
                      <input
                        type="tel"
                        value={mpesaPhone}
                        onChange={(e) => setMpesaPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="254700000000"
                      />
                    </div>
                    <button className="w-full mt-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      Request M-Pesa Payment
                    </button>
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
                      <Spinner size="sm" />
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


    </div>
  );
}