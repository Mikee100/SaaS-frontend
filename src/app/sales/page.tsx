"use client";
import { useState, useEffect } from "react";
import { apiGet, apiPost } from "@/utils/api";
import React from "react";


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
  const [mpesaPolling, setMpesaPolling] = useState(false);
  const [mpesaPollProgress, setMpesaPollProgress] = useState(0);
  const [mpesaPollCancelled, setMpesaPollCancelled] = useState(false);

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

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
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
    setCart((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const changeDue = paymentMethod === "cash" ? amountReceived - total : 0;

  function handleCheckout() {
    setCheckoutOpen(true);
    setAmountReceived(0);
    setPaymentMethod("cash");
  }

  // Helper: Wait for MpesaTransaction by checkoutRequestId
  async function getMpesaTransactionWithRetry(checkoutRequestId: string, retries = 5, delay = 2000): Promise<{ id: string }> {
    setMpesaPolling(true);
    setMpesaPollProgress(0);
    setMpesaPollCancelled(false);
    for (let i = 0; i < retries; i++) {
      if (mpesaPollCancelled) throw new Error('Polling cancelled by user');
      try {
        const tx = await apiGet<{ id: string }>(`/mpesa/by-checkout-id/${checkoutRequestId}`);
        if (tx && tx.id) {
          setMpesaPolling(false);
          setMpesaStatus({ success: true, message: 'M-Pesa payment confirmed!' });
          return tx;
        }
      } catch (err) {
        // ignore 404
      }
      setMpesaStatus({ success: false, message: `Waiting for M-Pesa confirmation... (${i + 1}/${retries})` });
      setMpesaPollProgress(((i + 1) / retries) * 100);
      await new Promise(res => setTimeout(res, delay));
    }
    setMpesaPolling(false);
    throw new Error('M-Pesa payment not confirmed after several retries');
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
        setMpesaStatus({ success: mpesaRes.success, message: mpesaRes.message || (mpesaRes.success ? "Prompt sent to phone. Complete payment on your device." : "Failed to initiate payment.") });
        setMpesaLoading(false);
        if (mpesaRes.success && mpesaRes.data && mpesaRes.data.CheckoutRequestID) {
          // Wait for MpesaTransaction to be available
          setMpesaStatus({ success: false, message: "Waiting for M-Pesa confirmation..." });
          try {
            const tx = await getMpesaTransactionWithRetry(mpesaRes.data.CheckoutRequestID);
            const salePayload = {
              items: cart.map(item => ({ productId: item.id, quantity: item.quantity })),
              paymentMethod,
              amountReceived: total,
              customerName: customerName || undefined,
              customerPhone: customerPhone || undefined,
              mpesaTransactionId: tx.id, // Use the UUID
            };
            const receiptData = await apiPost<Receipt>("/sales", salePayload);
            setReceipt(receiptData);
            setCart([]);
            setCheckoutOpen(false);
            setShowReceipt(true);
            setCustomerName("");
            setCustomerPhone("");
            setTimeout(() => setShowReceipt(false), 8000);
          } catch (err: any) {
            setSaleError(err.message || "Sale failed");
          }
        }
        return;
      } catch (err: any) {
        setMpesaStatus({ success: false, message: err.message || "Failed to initiate payment." });
        setMpesaLoading(false);
      }
      return;
    }
    try {
      const salePayload = {
        items: cart.map(item => ({ productId: item.id, quantity: item.quantity })),
        paymentMethod,
        amountReceived,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
      };
      const receiptData = await apiPost<Receipt>("/sales", salePayload);
      setReceipt(receiptData);
      setCart([]);
      setCheckoutOpen(false);
      setShowReceipt(true);
      setCustomerName("");
      setCustomerPhone("");
      setTimeout(() => setShowReceipt(false), 8000);
    } catch (err: any) {
      setSaleError(err.message || "Sale failed");
    }
  }

  if (loading) return <div className="p-8">Loading products...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <>
      <div className="flex gap-8">
        {/* Product List */}
        <div className="w-2/3 bg-white rounded shadow p-6">
          <h2 className="text-xl font-bold mb-4">Products</h2>
          <div className="grid grid-cols-2 gap-4">
            {paginatedProducts.map((product) => (
              <div
                key={product.id}
                className="border rounded-lg p-4 pt-8 flex flex-col shadow-sm hover:shadow-lg transition group bg-gradient-to-br from-blue-50 to-white relative"
              >
                <div className="absolute top-2 right-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono">ID: {product.id}</div>
                <div className="font-extrabold text-xl text-center text-blue-900 mb-2 border-b pb-1">{product.name}</div>
                <div className="text-gray-600 text-base mb-1">${product.price.toFixed(2)}</div>
                <div className="text-xs mb-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full font-semibold ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>Stock: {product.stock}</span>
                </div>
                <button
                  className="mt-auto bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                  onClick={() => addToCart(product)}
                  disabled={product.stock === 0}
                >
                  {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </div>
            ))}
          </div>
          {/* Pagination controls */}
          <div className="flex justify-between items-center mt-6">
            <button
              className="px-3 py-1 rounded border text-xs disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <span className="text-xs px-2">Page {currentPage} of {pageCount}</span>
            <button
              className="px-3 py-1 rounded border text-xs disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
              disabled={currentPage === pageCount}
            >
              Next
            </button>
          </div>
        </div>
        {/* Cart */}
        <div className="w-1/3">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold mb-4">Cart</h2>
            {cart.length === 0 ? (
              <div className="text-gray-500">Cart is empty</div>
            ) : (
              <ul className="space-y-3">
                {cart.map((item) => (
                  <li key={item.id} className="flex items-center justify-between bg-blue-50 rounded p-2">
                    <div>
                      <div className="font-semibold text-blue-900">{item.name}</div>
                      <div className="text-xs text-gray-500">
                        ${item.price.toFixed(2)} x
                        <input
                          type="number"
                          min={1}
                          max={item.stock}
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                          className="w-12 mx-1 border rounded px-1 text-center"
                        />
                        = ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                    <button
                      className="text-red-500 hover:underline text-xs"
                      onClick={() => removeFromCart(item.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 border-t pt-4">
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <button
                className="mt-4 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50 transition"
                disabled={cart.length === 0}
                onClick={handleCheckout}
              >
                Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Checkout Modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Blurry overlay */}
          <div className="absolute inset-0 bg-white/40 backdrop-blur-sm z-0"></div>
          <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 p-8 w-full max-w-md relative animate-fadeIn z-10">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-blue-600 text-xl font-bold"
              onClick={() => setCheckoutOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-4 text-blue-900">Checkout</h2>
            <div className="mb-4">
              <div className="mb-2 text-lg">Total: <span className="font-bold text-blue-900">${total.toFixed(2)}</span></div>
              <label className="block mb-2 font-semibold">Payment Method:</label>
              <select
                className="border rounded px-2 py-1 w-full mb-2"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                disabled={mpesaLoading || mpesaPolling}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mpesa">M-Pesa</option>
              </select>
              {paymentMethod === "cash" && (
                <div>
                  <label className="block mb-1 font-semibold">Amount Received:</label>
                  <input
                    type="number"
                    min={total}
                    value={amountReceived}
                    onChange={e => setAmountReceived(Number(e.target.value))}
                    className="border rounded px-2 py-1 w-full"
                    disabled={mpesaLoading || mpesaPolling}
                  />
                  <div className="mt-2">Change Due: <span className="font-bold">${changeDue >= 0 ? changeDue.toFixed(2) : "0.00"}</span></div>
                </div>
              )}
              {paymentMethod === "mpesa" && (
                <div className="mt-2">
                  <label className="block mb-1 font-semibold">M-Pesa Phone Number:</label>
                  <input
                    type="text"
                    value={mpesaPhone}
                    onChange={e => setMpesaPhone(e.target.value)}
                    className="border rounded px-2 py-1 w-full"
                    placeholder="07XXXXXXXX or 2547XXXXXXXX"
                    disabled={mpesaLoading || mpesaPolling}
                  />
                  {mpesaPolling && (
                    <div className="flex flex-col items-center mt-4">
                      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
                      <div className="w-full bg-blue-100 rounded-full h-2 mb-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${mpesaPollProgress}%` }}></div>
                      </div>
                      <div className="text-xs text-blue-700 mb-2">{mpesaStatus?.message || "Waiting for M-Pesa confirmation..."}</div>
                      <button
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => setMpesaPollCancelled(true)}
                        disabled={!mpesaPolling}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {mpesaStatus && !mpesaPolling && (
                    <div className={mpesaStatus.success ? "text-green-600 mt-2" : "text-red-500 mt-2"}>{mpesaStatus.message}</div>
                  )}
                </div>
              )}
              <label className="block mt-4 mb-1 font-semibold">Customer Name (optional):</label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="border rounded px-2 py-1 w-full"
                placeholder="Enter customer name"
                disabled={mpesaLoading || mpesaPolling}
              />
              <label className="block mt-2 mb-1 font-semibold">Customer Phone (optional):</label>
              <input
                type="text"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="border rounded px-2 py-1 w-full"
                placeholder="Enter customer phone"
                disabled={mpesaLoading || mpesaPolling}
              />
              {saleError && <div className="text-red-500 mt-2">{saleError}</div>}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                onClick={() => setCheckoutOpen(false)}
                disabled={mpesaLoading || mpesaPolling}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                disabled={
                  (paymentMethod === "cash" && amountReceived < total) ||
                  (paymentMethod === "mpesa" && (mpesaLoading || mpesaPolling || !mpesaPhone))
                }
                onClick={handleConfirmSale}
              >
                {mpesaLoading || mpesaPolling ? "Processing..." : "Confirm Sale"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Receipt/Confirmation */}
      {showReceipt && receipt && (
        <div className="fixed bottom-8 right-8 bg-white border shadow-lg rounded p-6 z-50 min-w-[320px]">
          <div className="font-bold text-lg mb-2">Sale Complete!</div>
          <div className="mb-2 text-xs text-gray-500">Sale ID: {receipt.saleId}</div>
          <div className="mb-2 text-xs text-gray-500">Date: {new Date(receipt.date).toLocaleString()}</div>
          <div className="mb-2">Customer: {receipt.customerName || "-"} {receipt.customerPhone && `(${receipt.customerPhone})`}</div>
          <table className="w-full text-xs mb-2">
            <thead>
              <tr>
                <th className="text-left">Item</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Price</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item: any) => (
                <tr key={item.productId}>
                  <td>{item.name}</td>
                  <td className="text-right">{item.quantity}</td>
                  <td className="text-right">${item.price.toFixed(2)}</td>
                  <td className="text-right">${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="font-bold">Total: ${receipt.total.toFixed(2)}</div>
          <div>Payment: {receipt.paymentMethod}</div>
          <div>Amount Received: ${receipt.amountReceived.toFixed(2)}</div>
          <div>Change: ${receipt.change.toFixed(2)}</div>
          <button
            className="mt-4 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 w-full"
            onClick={() => window.print()}
          >
            Print Receipt
          </button>
        </div>
      )}
    </>
  );
} 