"use client";
import { useState, useEffect } from "react";
import { apiGet, apiPost } from "@/utils/api";
import React from "react";
import Spinner from '@/components/Spinner';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeCanvas } from 'qrcode.react';
import Barcode from 'react-barcode';

type Product = { id: number; name: string; price: number; stock: number; };
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
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 8;
  const pageCount = Math.ceil(products.length / productsPerPage);
  const paginatedProducts = products.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage);
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [mpesaStatus, setMpesaStatus] = useState<null | { success: boolean; message: string }>(null);
  const [mpesaLoading, setMpesaLoading] = useState(false);
  const [saleLoading, setSaleLoading] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => uuidv4());
  const [mpesaPolling, setMpesaPolling] = useState(false);
  const [mpesaPollProgress, setMpesaPollProgress] = useState(0);
  const [mpesaPollCancelled, setMpesaPollCancelled] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [businessInfo, setBusinessInfo] = useState<any>(null);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<Product[]>("/products");
        setProducts(data);
      } catch (err: any) {
        setError(err.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  useEffect(() => {
    async function fetchBusinessInfo() {
      try {
        const info = await apiGet('/tenant/me');
        setBusinessInfo(info);
      } catch (e) {
        // Optionally handle error
      }
    }
    fetchBusinessInfo();
  }, []);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.id.toString().includes(searchTerm)
  );

  function addToCart(product: Product) {
    if (product.stock <= 0) return;
    
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }

  function removeFromCart(productId: number) {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  }

  function updateQuantity(productId: number, quantity: number) {
    if (quantity < 1) return;
    
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === productId) {
          const product = products.find(p => p.id === productId);
          const maxQuantity = product?.stock || 1;
          return { ...item, quantity: Math.min(quantity, maxQuantity) };
        }
        return item;
      })
    );
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const changeDue = paymentMethod === "cash" ? amountReceived - total : 0;

  function handleCheckout() {
    setCheckoutOpen(true);
    setAmountReceived(total); // Auto-fill amount received with total
    setPaymentMethod("cash");
    setSaleError(null);
    setMpesaStatus(null);
    setIdempotencyKey(uuidv4()); // Generate a new key for each checkout
  }

  async function getMpesaTransactionWithRetry(checkoutRequestId: string, retries = 5, delay = 2000): Promise<{ id: string }> {
    setMpesaPolling(true);
    setMpesaPollProgress(0);
    setMpesaPollCancelled(false);
    for (let i = 0; i < retries; i++) {
      if (mpesaPollCancelled) throw new Error('Payment confirmation cancelled');
      try {
        const tx = await apiGet<{ id: string }>(`/mpesa/by-checkout-id/${checkoutRequestId}`);
        if (tx && tx.id) {
          setMpesaPolling(false);
          setMpesaStatus({ success: true, message: 'Payment confirmed!' });
          return tx;
        }
      } catch (err) {
        // ignore 404
      }
      setMpesaStatus({ success: false, message: `Waiting for payment confirmation... (${i + 1}/${retries})` });
      setMpesaPollProgress(((i + 1) / retries) * 100);
      await new Promise(res => setTimeout(res, delay));
    }
    setMpesaPolling(false);
    throw new Error('Payment not confirmed after several attempts');
  }

  async function handleConfirmSale() {
    setSaleError(null);
    setMpesaStatus(null);
    setMpesaPollCancelled(false);
    
    if (paymentMethod === "mpesa") {
      // Validate phone
      if (!mpesaPhone.match(/^(07|2547|25407|\+2547)\d{8}$/)) {
        setMpesaStatus({ success: false, message: "Invalid phone number format. Use 07XXXXXXXX, 2547XXXXXXXX, or +2547XXXXXXXX" });
        return;
      }
      
      setMpesaLoading(true);
      try {
        const mpesaRes = await apiPost<any>("/mpesa", { phoneNumber: mpesaPhone, amount: total });
        
        if (!mpesaRes.success) {
          throw new Error(mpesaRes.message || "Failed to initiate payment");
        }
        
        setMpesaStatus({ 
          success: true, 
          message: "Payment request sent to your phone. Please complete the transaction." 
        });
        
        if (mpesaRes.data?.CheckoutRequestID) {
          const tx = await getMpesaTransactionWithRetry(mpesaRes.data.CheckoutRequestID);
          await completeSale(tx.id);
        }
      } catch (err: any) {
        setMpesaStatus({ success: false, message: err.message || "Payment failed" });
        setMpesaLoading(false);
      }
      return;
    }
    
    await completeSale();
  }

  async function completeSale(mpesaTransactionId?: string) {
    setSaleLoading(true);
    try {
      const salePayload = {
        items: cart.map(item => ({ productId: item.id, quantity: item.quantity })),
        paymentMethod,
        amountReceived: paymentMethod === "cash" ? amountReceived : total,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        mpesaTransactionId,
        idempotencyKey,
      };
      const receiptData = await apiPost<Receipt>("/sales", salePayload);
      setReceipt(receiptData);
      setCart([]);
      setCheckoutOpen(false);
      setShowReceipt(true);
      setCustomerName("");
      setCustomerPhone("");
      setMpesaPhone("");
      setMpesaLoading(false);
      setTimeout(() => setShowReceipt(false), 10000);
    } catch (err: any) {
      setSaleError(err.message || "Sale failed");
      setMpesaLoading(false);
    } finally {
      setSaleLoading(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
  
  if (error) return (
    <div className="p-8 text-center">
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md mx-auto">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
      <button 
        onClick={() => window.location.reload()}
        className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Retry
      </button>
    </div>
  );

  // Digital receipt URL
  const digitalReceiptUrl = (typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com') + `/receipt/${receipt?.saleId}`;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Point of Sale System</h1>
        
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Product List */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <h2 className="text-xl font-bold text-gray-800">Products</h2>
                <div className="relative w-full md:w-64">
                  <input
                    type="text"
                    placeholder="Search products..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <svg
                    className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
              
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No products found
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredProducts
                      .slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage)
                      .map((product) => (
                      <div
                        key={product.id}
                        className={`border rounded-lg p-4 flex flex-col transition-all ${product.stock > 0 ? 
                          'hover:shadow-md hover:border-blue-300 bg-white' : 
                          'bg-gray-50 opacity-70'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            #{product.id}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            product.stock > 5 ? 'bg-green-100 text-green-800' :
                            product.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                          </span>
                        </div>
                        <div className="font-bold text-lg text-gray-800 mb-1 truncate">{product.name}</div>
                        <div className="text-xl font-extrabold text-blue-600 mb-3">
                          ${product.price.toFixed(2)}
                        </div>
                        <button
                          className={`mt-auto w-full py-2 rounded-lg font-medium transition-colors ${
                            product.stock > 0 ?
                            'bg-blue-600 hover:bg-blue-700 text-white' :
                            'bg-gray-200 text-gray-500 cursor-not-allowed'
                          }`}
                          onClick={() => addToCart(product)}
                          disabled={product.stock === 0}
                        >
                          {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {filteredProducts.length > productsPerPage && (
                    <div className="flex justify-between items-center mt-6">
                      <button
                        className={`px-4 py-2 rounded-lg border ${currentPage === 1 ? 
                          'text-gray-400 cursor-not-allowed' : 
                          'text-gray-700 hover:bg-gray-100'}`}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {currentPage} of {Math.ceil(filteredProducts.length / productsPerPage)}
                      </span>
                      <button
                        className={`px-4 py-2 rounded-lg border ${currentPage === Math.ceil(filteredProducts.length / productsPerPage) ? 
                          'text-gray-400 cursor-not-allowed' : 
                          'text-gray-700 hover:bg-gray-100'}`}
                        onClick={() => setCurrentPage((p) => Math.min(Math.ceil(filteredProducts.length / productsPerPage), p + 1))}
                        disabled={currentPage === Math.ceil(filteredProducts.length / productsPerPage)}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Cart */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Your Cart</h2>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {cart.length} {cart.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <p className="mt-2 text-gray-500">Your cart is empty</p>
                  <p className="text-sm text-gray-400">Add products to get started</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{item.name}</div>
                          <div className="text-sm text-gray-500">${item.price.toFixed(2)} each</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={item.stock}
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                            className="w-12 text-center border rounded py-1 text-sm"
                          />
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300"
                            disabled={item.quantity >= item.stock}
                          >
                            +
                          </button>
                        </div>
                        <div className="font-medium text-right min-w-[60px]">
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove item"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 border-t pt-4 space-y-3">
                    <div className="flex justify-between font-medium">
                      <span>Subtotal:</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                    
                    <button
                      className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${
                        cart.length > 0 ? 
                        'bg-green-600 hover:bg-green-700' : 
                        'bg-gray-300 cursor-not-allowed'
                      }`}
                      disabled={cart.length === 0}
                      onClick={handleCheckout}
                    >
                      Proceed to Checkout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Checkout Modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => !mpesaPolling && setCheckoutOpen(false)}
          ></div>
          
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10"
              onClick={() => !mpesaPolling && setCheckoutOpen(false)}
              disabled={mpesaPolling}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Complete Your Order</h2>
              
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Order Total:</span>
                  <span className="text-2xl font-bold text-blue-600">${total.toFixed(2)}</span>
                </div>
                {cart.length > 0 && (
                  <div className="text-sm text-gray-500">
                    {cart.length} {cart.length === 1 ? 'item' : 'items'} in cart
                  </div>
                )}
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      className={`py-2 px-3 rounded-lg border ${
                        paymentMethod === "cash" ? 
                        'border-blue-500 bg-blue-50 text-blue-700' : 
                        'border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setPaymentMethod("cash")}
                      disabled={mpesaLoading || mpesaPolling}
                    >
                      Cash
                    </button>
                    <button
                      className={`py-2 px-3 rounded-lg border ${
                        paymentMethod === "card" ? 
                        'border-blue-500 bg-blue-50 text-blue-700' : 
                        'border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setPaymentMethod("card")}
                      disabled={mpesaLoading || mpesaPolling}
                    >
                      Card
                    </button>
                    <button
                      className={`py-2 px-3 rounded-lg border ${
                        paymentMethod === "mpesa" ? 
                        'border-blue-500 bg-blue-50 text-blue-700' : 
                        'border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setPaymentMethod("mpesa")}
                      disabled={mpesaLoading || mpesaPolling}
                    >
                      M-Pesa
                    </button>
                  </div>
                </div>
                
                {paymentMethod === "cash" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount Received
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        min={total}
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    {amountReceived > 0 && (
                      <div className={`mt-2 text-sm font-medium ${
                        changeDue >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Change Due: ${Math.max(0, changeDue).toFixed(2)}
                        {changeDue < 0 && (
                          <span className="block text-xs text-red-500">Amount received is less than total</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {paymentMethod === "mpesa" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      M-Pesa Phone Number
                    </label>
                    <input
                      type="text"
                      value={mpesaPhone}
                      onChange={(e) => setMpesaPhone(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="07XXXXXXXX or 2547XXXXXXXX"
                      disabled={mpesaLoading || mpesaPolling}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Enter your M-Pesa registered phone number
                    </p>
                    
                    {mpesaPolling && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${mpesaPollProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-sm text-center text-blue-700 mb-2">
                            {mpesaStatus?.message || "Waiting for payment confirmation..."}
                          </p>
                          <button
                            className="text-xs text-red-600 hover:underline"
                            onClick={() => setMpesaPollCancelled(true)}
                          >
                            Cancel Payment
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {mpesaStatus && !mpesaPolling && (
                      <div className={`mt-2 p-2 rounded text-sm ${
                        mpesaStatus.success ? 
                        'bg-green-100 text-green-700' : 
                        'bg-red-100 text-red-700'
                      }`}>
                        {mpesaStatus.message}
                      </div>
                    )}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name (optional)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Customer name"
                    disabled={mpesaLoading || mpesaPolling}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Phone (optional)
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Customer phone"
                    disabled={mpesaLoading || mpesaPolling}
                  />
                </div>
                
                {saleError && (
                  <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                    {saleError}
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => !mpesaPolling && setCheckoutOpen(false)}
                  disabled={mpesaPolling}
                >
                  Cancel
                </button>
                <button
                  className={`px-4 py-2 rounded-lg text-white font-medium ${
                    (paymentMethod === "cash" && amountReceived < total) ||
                    (paymentMethod === "mpesa" && (mpesaLoading || mpesaPolling || !mpesaPhone)) ?
                    'bg-gray-400 cursor-not-allowed' :
                    'bg-green-600 hover:bg-green-700'
                  }`}
                  disabled={
                    (paymentMethod === "cash" && amountReceived < total) ||
                    (paymentMethod === "mpesa" && (mpesaLoading || mpesaPolling || !mpesaPhone))
                  }
                  onClick={handleConfirmSale}
                >
                  {mpesaLoading || saleLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Confirm Payment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Receipt Notification */}
      {showReceipt && receipt && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up print-receipt max-w-sm mx-auto p-6 bg-white rounded shadow-none border-none font-mono text-xs" style={{ width: 340 }}>
          {/* Header */}
          <div className="text-center mb-2">
            {businessInfo?.logoUrl && (
              <img src={businessInfo.logoUrl} alt="Business Logo" className="mx-auto mb-2 max-h-16" style={{ objectFit: 'contain' }} />
            )}
            {businessInfo && (
              <>
                <div className="font-bold text-lg tracking-wide">{businessInfo.name}</div>
                <div className="text-xs">{businessInfo.businessType}</div>
                {businessInfo.address && <div className="text-xs">{businessInfo.address}</div>}
                {businessInfo.contactPhone && <div className="text-xs">Phone: {businessInfo.contactPhone}</div>}
                {businessInfo.contactEmail && <div className="text-xs mb-1">Email: {businessInfo.contactEmail}</div>}
              </>
            )}
            {/* Barcode for receipt number */}
            <div className="flex justify-center my-2">
              <Barcode value={receipt.saleId} width={1.2} height={32} fontSize={10} />
            </div>
            <div className="border-t border-dashed my-2"></div>
            <div className="flex justify-between">
              <span>Receipt:</span>
              <span className="font-bold">#{receipt.saleId.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{new Date(receipt.date).toLocaleString()}</span>
            </div>
            {receipt.customerName && (
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{receipt.customerName}</span>
              </div>
            )}
            {receipt.customerPhone && (
              <div className="flex justify-between">
                <span>Phone:</span>
                <span>{receipt.customerPhone}</span>
              </div>
            )}
            <div className="border-t border-dashed my-2"></div>
          </div>

          {/* Items */}
          <div>
            {receipt.items.map((item) => (
              <div key={item.productId} className="flex justify-between mb-1">
                <span>
                  {item.quantity} x {item.name}
                </span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed my-2"></div>

          {/* Totals */}
          <div className="flex justify-between font-bold">
            <span>Total:</span>
            <span>${receipt.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Payment:</span>
            <span className="capitalize">{receipt.paymentMethod}</span>
          </div>
          {receipt.paymentMethod === "cash" && (
            <>
              <div className="flex justify-between">
                <span>Received:</span>
                <span>${receipt.amountReceived.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Change:</span>
                <span>${receipt.change.toFixed(2)}</span>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="border-t border-dashed my-2"></div>
          <div className="text-center mt-2">
            <div className="font-semibold">Thank you for your business!</div>
            <div className="text-xs mt-1">No returns without receipt. Earn loyalty points with every purchase!</div>
            <div className="text-xs mt-1">Return policy: Items can be returned within 14 days with receipt.</div>
            {/* QR Code for digital receipt at the bottom */}
            <div className="flex justify-center my-4">
              <QRCodeCanvas value={(typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com') + `/receipt/${receipt.saleId}`} size={64} />
            </div>
          </div>

          {/* Print/Close Buttons (hidden in print) */}
          <div className="mt-4 flex gap-2 no-print">
            <button
              onClick={() => window.print()}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              Print Receipt
            </button>
            <a
              href={digitalReceiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium text-center"
              style={{ display: 'inline-block', lineHeight: '2.25rem' }}
            >
              View Digital Receipt
            </a>
            <button
              onClick={() => setShowReceipt(false)}
              className="flex-1 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}