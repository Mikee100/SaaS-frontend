"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FaStore,
  FaSearch,
  FaShoppingCart,
  FaMoneyBillWave,
  FaMobileAlt,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaUser,
  FaStar,
  FaPlus,
  FaMinus,
  FaCheck,
} from "react-icons/fa";
import { apiGet, apiPost } from "@/utils/api";
import { v4 as uuidv4 } from "uuid";
import { useUser } from "@/components/UserContext";
import { useBranch } from "@/contexts/BranchContext";
import AuthGuard from "@/components/AuthGuard";
import Spinner from "@/components/Spinner";

type ProductVariation = {
  id: string;
  sku: string;
  price?: number;
  stock: number;
  attributes?: Record<string, string>;
  isActive: boolean;
};

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku?: string;
  description?: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
};

// Cart item can be a base product or a variation of a product.
type CartItem = Product & {
  quantity: number;
  // When this is a variation, keep the base product id here so backend stays happy
  baseProductId?: string;
  variationId?: string;
  variationSku?: string;
  variationAttributes?: Record<string, string>;
};

export default function SalesPage() {
  const router = useRouter();
  const { user } = useUser();
  const { selectedBranchId, setSelectedBranchId } = useBranch();

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price" | "stock">("name");
  const [sortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const totalCheckoutSteps = 3;

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mpesa" | "credit">("cash");
  const [amountReceived, setAmountReceived] = useState<number>(0);

  // IMPORTANT: make these OPTIONAL
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [processingSale, setProcessingSale] = useState(false);

  // Variations support
  const [productVariations, setProductVariations] = useState<
    Record<string, ProductVariation[]>
  >({});
  const [showVariationModal, setShowVariationModal] = useState(false);
  const [selectedProductForVariation, setSelectedProductForVariation] =
    useState<Product | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Auto-select first branch if none
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const data = await apiGet<{ id: string; name: string }[]>("/branches");
        const safe = Array.isArray(data) ? data : [];
        setBranches(safe);
        if (!selectedBranchId && safe.length > 0) {
          setSelectedBranchId(safe[0].id);
        }
      } catch {
        // ignore for now
      }
    };
    loadBranches();
  }, [selectedBranchId, setSelectedBranchId]);

  // Load products
  useEffect(() => {
    const load = async () => {
      if (!selectedBranchId) return;
      setLoading(true);
      setError(null);
      try {
        const searchParam = debouncedSearchQuery
          ? `&search=${encodeURIComponent(debouncedSearchQuery)}`
          : "";
        const data = await apiGet<{ products: Product[]; pagination: Pagination }>(
          `/products?page=1&limit=100${searchParam}`,
          { "x-branch-id": selectedBranchId }
        );
        const prods = data.products || [];
        setProducts(prods);

        // Load variations for each product so we can show them on the sales page
        const variationsMap: Record<string, ProductVariation[]> = {};
        for (const p of prods) {
          try {
            const vars = await apiGet<ProductVariation[]>(
              `/products/${p.id}/variations`,
              { "x-branch-id": selectedBranchId }
            );
            if (Array.isArray(vars) && vars.length > 0) {
              variationsMap[p.id] = vars;
            }
          } catch {
            // ignore missing variations
          }
        }
        setProductVariations(variationsMap);
      } catch (e: any) {
        setError(e?.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedBranchId, debouncedSearchQuery]);

  const filteredProducts = useMemo(() => {
    const arr = [...products];
    arr.sort((a, b) => {
      const aInStock = a.stock > 0;
      const bInStock = b.stock > 0;
      if (aInStock && !bInStock) return -1;
      if (!aInStock && bInStock) return 1;

      let aVal: string | number;
      let bVal: string | number;
      switch (sortBy) {
        case "price":
          aVal = a.price;
          bVal = b.price;
          break;
        case "stock":
          aVal = a.stock;
          bVal = b.stock;
          break;
        default:
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
      }
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortOrder === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return arr;
  }, [products, sortBy, sortOrder]);

  const pageCount = Math.ceil(filteredProducts.length / productsPerPage);
  const paginatedProducts = useMemo(
    () =>
      filteredProducts.slice(
        (currentPage - 1) * productsPerPage,
        currentPage * productsPerPage
      ),
    [filteredProducts, currentPage, productsPerPage]
  );

  const VAT_RATE = 0.16;
  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const vatAmount = cartSubtotal * VAT_RATE;
  const cartTotal = cartSubtotal + vatAmount;

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id
            ? { ...i, quantity: Math.min(i.quantity + 1, product.stock) }
            : i
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  // Helper: add a variation as a cart item by turning it into a product-like object
  const addVariationToCart = useCallback(
    (baseProduct: Product, variation: ProductVariation) => {
      const displayName = variation.attributes
        ? `${baseProduct.name} - ${Object.values(variation.attributes).join(
            ", "
          )}`
        : `${baseProduct.name} - ${variation.sku}`;

      const variationItem: CartItem = {
        ...baseProduct,
        id: variation.id, // unique per variation for cart operations
        baseProductId: baseProduct.id, // but remember the base product id for backend
        sku: variation.sku,
        price: variation.price ?? baseProduct.price,
        stock: variation.stock,
        name: displayName,
        quantity: 1,
        variationId: variation.id,
        variationSku: variation.sku,
        variationAttributes: variation.attributes,
      };

      setCart((prev) => {
        const existing = prev.find((i) => i.id === variationItem.id);
        if (existing) {
          return prev.map((i) =>
            i.id === variationItem.id
              ? {
                  ...i,
                  quantity: Math.min(i.quantity + 1, variationItem.stock),
                }
              : i
          );
        }
        return [...prev, variationItem];
      });
    },
    []
  );

  const updateQuantity = useCallback((productId: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.id === productId
            ? { ...i, quantity: Math.max(0, Math.min(qty, i.stock)) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const handleCheckout = () => {
    setCheckoutStep(1);
    setCheckoutOpen(true);
  };

  // Make name/phone OPTIONAL: remove validation here
  const handleConfirmSale = async () => {
    setProcessingSale(true);
    setError(null);

    if (!selectedBranchId) {
      setError("Please select a branch before processing the sale");
      setProcessingSale(false);
      return;
    }

    if (paymentMethod === "cash" && amountReceived < cartTotal) {
      setError("Amount received is less than the total amount");
      setProcessingSale(false);
      return;
    }

    try {
      const saleData = {
        items: cart.map((item) => ({
          // Backend only knows about base product IDs, not variation IDs
          productId: (item as any).baseProductId || item.id,
          quantity: item.quantity,
          price: item.price,
        })),
        paymentMethod,
        amountReceived: paymentMethod === "cash" ? amountReceived : cartTotal,
        // OPTIONAL fields – sent only if filled
        customerName: customerName?.trim() || undefined,
        customerPhone: customerPhone?.trim()
          ? `+254${customerPhone}`
          : undefined,
        branchId: selectedBranchId,
        total: cartTotal,
        idempotencyKey: uuidv4(),
      };

      const response = await apiPost<{ success: boolean; data: { saleId: string }; message: string }>("/sales", saleData);

      // Extract sale ID from response
      const saleId = response?.data?.saleId;
      
      if (!saleId) {
        throw new Error("Sale ID not found in response");
      }

      // Clear cart and close modal before routing
      setCart([]);
      setCheckoutOpen(false);
      setCustomerName("");
      setCustomerPhone("");
      setAmountReceived(0);
      setCheckoutStep(1);

      // Route to receipt page immediately
      router.push(`/receipt/${saleId}`);
    } catch (e: any) {
      setError(e?.message || "Failed to complete sale");
      setProcessingSale(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-height-[300px]">
        <Spinner />
      </div>
    );
  }

  if (error && !checkoutOpen) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm rounded-xl p-6 max-w-md text-center">
          <h1 className="text-lg font-semibold text-red-600 mb-2">
            Error Loading Sales
          </h1>
          <p className="text-gray-700 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  const ProductCard = ({ product }: { product: Product }) => {
    const variations = productVariations[product.id] || [];
    const activeVars = variations.filter((v) => v.isActive !== false);

    const hasVariations = activeVars.length > 0;
    const totalVarStock = hasVariations
      ? activeVars.reduce((sum, v) => sum + (v.stock || 0), 0)
      : product.stock;

    let primaryPrice = product.price;
    let priceLabel = `$${product.price.toFixed(2)}`;
    if (hasVariations) {
      const prices = activeVars.map((v) => v.price ?? product.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      primaryPrice = min;
      priceLabel =
        min === max
          ? `$${min.toFixed(2)}`
          : `$${min.toFixed(2)} - $${max.toFixed(2)}`;
    }

    return (
      <div className="group bg-white rounded-lg border border-gray-200 hover:border-blue-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
        <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <FaShoppingCart className="w-8 h-8 text-gray-300" />
        </div>
        <div className="p-3 space-y-2">
          <div className="flex justify-between items-start gap-2">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
              {product.name}
            </h3>
            <button className="p-1.5 rounded-full hover:bg-gray-100">
              <FaStar className="w-4 h-4 text-gray-300 group-hover:text-yellow-400" />
            </button>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>SKU: {product.sku || "N/A"}</span>
            <span
              className={
                totalVarStock > 10
                  ? "text-green-600"
                  : totalVarStock > 0
                  ? "text-orange-600"
                  : "text-red-600"
              }
            >
              {totalVarStock} in stock
            </span>
          </div>
          {hasVariations && (
            <div className="text-[11px] text-blue-600 font-medium flex items-center gap-1">
              {activeVars.length} variation{activeVars.length > 1 ? "s" : ""}{" "}
              available
            </div>
          )}
          <div className="flex justify-between items-center mt-1">
            <span className="text-base font-bold text-blue-600">
              {priceLabel}
            </span>
            {hasVariations ? (
              <button
                onClick={() => {
                  setSelectedProductForVariation(product);
                  setShowVariationModal(true);
                }}
                disabled={totalVarStock <= 0}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  totalVarStock > 0
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                {totalVarStock > 0 ? "Select Variation" : "Out of stock"}
              </button>
            ) : (
              <button
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  product.stock > 0
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                {product.stock > 0 ? "Add to Cart" : "Out of stock"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
              <p className="text-sm text-gray-500">
                Welcome back, {user?.name || "User"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Branch
                </label>
                <select
                  value={selectedBranchId || ""}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Products */}
            <div className="lg:col-span-2 space-y-4">
              {/* Search & Filters */}
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200 space-y-3">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products by name, SKU, or description..."
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) =>
                        setSortBy(e.target.value as "name" | "price" | "stock")
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      <option value="name">Name</option>
                      <option value="price">Price</option>
                      <option value="stock">Stock</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Products Grid */}
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No products found.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {paginatedProducts.map((p) => (
                        <ProductCard key={p.id} product={p} />
                      ))}
                    </div>
                    {pageCount > 1 && (
                      <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={currentPage === 1}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50"
                        >
                          <FaChevronLeft className="w-3 h-3" /> Previous
                        </button>
                        <span>
                          Page {currentPage} of {pageCount}
                        </span>
                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.min(pageCount, p + 1))
                          }
                          disabled={currentPage === pageCount}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50"
                        >
                          Next <FaChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Cart */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                    <FaShoppingCart className="text-blue-600" />
                    Order Summary
                  </h2>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                    {cart.reduce((sum, i) => sum + i.quantity, 0)} items
                  </span>
                </div>

                {cart.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-gray-500 text-sm">
                    <FaShoppingCart className="w-10 h-10 mb-3 text-gray-300" />
                    Your cart is empty
                  </div>
                ) : (
                  <>
                    <div className="flex-1 p-4 space-y-3">
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-start bg-gray-50 rounded-lg p-3 border border-gray-100"
                        >
                          <div>
                            <div className="font-medium text-sm text-gray-900">
                              {item.name}
                            </div>
                            <div className="text-xs text-gray-600">
                              ${item.price.toFixed(2)} each
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Subtotal: $
                              {(item.price * item.quantity).toFixed(2)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                            >
                              <FaMinus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                              disabled={item.quantity >= item.stock}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 disabled:bg-gray-100 disabled:text-gray-400"
                            >
                              <FaPlus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium">
                          ${cartSubtotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">VAT (16%)</span>
                        <span className="font-medium">
                          ${vatAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                        <span>Total</span>
                        <span className="text-blue-600">
                          ${cartTotal.toFixed(2)}
                        </span>
                      </div>
                      <button
                        onClick={handleCheckout}
                        className="mt-3 w-full py-3 bg-blue-600 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 shadow-md"
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

        {/* Checkout Modal */}
        {checkoutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" />
            {/* Slightly narrower & shorter modal so it fits better on screen */}
            <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-gray-200">
              {/* Header */}
              <div className="px-6 pt-4 pb-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-xl text-gray-900 mb-0.5">
                      Complete Order
                    </h3>
                    <p className="text-xs text-gray-600">
                      Step {checkoutStep} of {totalCheckoutSteps}
                    </p>
                  </div>
                  <button
                    onClick={() => setCheckoutOpen(false)}
                    className="p-2 rounded-lg hover:bg-white/80 text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              {/* Make body scrollable if content exceeds max height */}
              <div className="flex-1 px-6 py-4 space-y-5 overflow-y-auto">
                {/* Step 1: Customer Info (now OPTIONAL) */}
                {checkoutStep === 1 && (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 mb-0.5">
                          Customer Information
                        </h4>
                        <p className="text-xs text-gray-500">
                          Customer name and phone are optional. You can leave
                          them blank if you wish.
                        </p>
                      </div>
                      {/* Branch selector inside modal as well */}
                      <div className="text-right">
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">
                          <FaStore className="inline w-3 h-3 mr-1" />
                          Branch
                        </label>
                        <select
                          value={selectedBranchId || ""}
                          onChange={(e) => setSelectedBranchId(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs bg-white"
                        >
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-4">
                      {/* Name (optional) */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                          <span>Customer Name</span>
                          <span className="text-xs text-gray-400 font-normal">
                            (optional)
                          </span>
                        </label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-0 focus:border-blue-500"
                          placeholder="e.g., Mike Karis"
                        />
                      </div>

                      {/* Phone (optional, soft-format) */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                          <span>Phone Number</span>
                          <span className="text-xs text-gray-400 font-normal">
                            (optional)
                          </span>
                        </label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">
                            +254
                          </div>
                          <input
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => {
                              let value = e.target.value.replace(/\D/g, "");
                              if (value.startsWith("254")) {
                                value = value.substring(3);
                              }
                              if (value.startsWith("0")) {
                                value = value.substring(1);
                              }
                              value = value.substring(0, 9);
                              setCustomerPhone(value);
                            }}
                            className="w-full pl-16 pr-4 py-3.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-0 focus:border-blue-500"
                            placeholder="700 000 000 (optional)"
                          />
                        </div>
                        <p className="text-[11px] text-gray-500">
                          You can leave this blank or enter any number. It is
                          not strictly validated.
                        </p>
                        {customerPhone && (
                          <p className="text-xs text-green-600 mt-1 font-medium">
                            Using: +254{" "}
                            {customerPhone.match(/.{1,3}/g)?.join(" ") ||
                              customerPhone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Payment */}
                {checkoutStep === 2 && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">
                        Payment Details
                      </h4>
                      <p className="text-sm text-gray-500">
                        Choose payment method and enter payment information.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Method
                        </label>
                        <div className="grid grid-cols-3 gap-4">
                          {["cash", "mpesa", "credit"].map((m) => (
                            <button
                              key={m}
                              onClick={() =>
                                setPaymentMethod(m as "cash" | "mpesa" | "credit")
                              }
                              className={`p-4 border-2 rounded-xl flex items-center justify-center gap-3 text-sm font-medium transition-all ${
                                paymentMethod === m
                                  ? "border-blue-500 bg-blue-50 text-blue-700 shadow-lg"
                                  : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-md"
                              }`}
                            >
                              {m === "cash" && (
                                <FaMoneyBillWave className="w-5 h-5" />
                              )}
                              {m === "mpesa" && (
                                <FaMobileAlt className="w-5 h-5" />
                              )}
                              {m === "credit" && (
                                <FaMoneyBillWave className="w-5 h-5" />
                              )}
                              <span className="capitalize">{m}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {paymentMethod === "cash" && (
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Amount Due</span>
                            <span className="font-semibold text-blue-600">
                              ${cartTotal.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Amount Received
                            </label>
                            <input
                              type="number"
                              value={amountReceived || ""}
                              onChange={(e) =>
                                setAmountReceived(
                                  e.target.value === ""
                                    ? 0
                                    : parseFloat(e.target.value)
                                )
                              }
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-0 focus:border-blue-500"
                              placeholder={cartTotal.toFixed(2)}
                              min={0}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 3: Confirmation */}
                {checkoutStep === 3 && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-semibold text-gray-900">
                      Confirm Order
                    </h4>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                      <div>
                        <h5 className="text-sm font-semibold text-gray-800 mb-1">
                          Items
                        </h5>
                        <ul className="space-y-1 text-sm text-gray-700">
                          {cart.map((item) => (
                            <li
                              key={item.id}
                              className="flex justify-between gap-2"
                            >
                              <span>
                                {item.name} × {item.quantity}
                              </span>
                              <span>
                                $
                                {(item.price * item.quantity).toFixed(2)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="pt-2 border-t border-gray-200 space-y-1 text-sm">
                        <div className="flex justify-between text-gray-600">
                          <span>Subtotal</span>
                          <span>${cartSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>VAT (16%)</span>
                          <span>${vatAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold pt-1">
                          <span>Total</span>
                          <span className="text-blue-600">
                            ${cartTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-between items-center gap-4">
                <button
                  onClick={() => setCheckoutStep((prev) => Math.max(1, prev - 1))}
                  disabled={checkoutStep === 1}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-white hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm flex items-center gap-2"
                >
                  <FaChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <div className="text-sm text-gray-600">
                  Step {checkoutStep} of {totalCheckoutSteps}
                </div>

                {checkoutStep < totalCheckoutSteps ? (
                  <button
                    onClick={() => setCheckoutStep((prev) => prev + 1)}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm shadow-lg flex items-center gap-2"
                  >
                    Next
                    <FaChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleConfirmSale}
                    disabled={processingSale}
                    className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 font-semibold text-sm shadow-lg flex items-center gap-2"
                  >
                    {processingSale ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

        {/* Variation Selection Modal */}
        {showVariationModal && selectedProductForVariation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-white/70 backdrop-blur-sm"
              onClick={() => {
                setShowVariationModal(false);
                setSelectedProductForVariation(null);
              }}
            />
            <div className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Select Variation
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {selectedProductForVariation.name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowVariationModal(false);
                    setSelectedProductForVariation(null);
                  }}
                  className="p-2 rounded-lg hover:bg-white/70 text-gray-500 hover:text-gray-700"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
                {(() => {
                  const variations =
                    productVariations[selectedProductForVariation.id] || [];
                  const active = variations.filter(
                    (v) => v.isActive !== false
                  );

                  if (active.length === 0) {
                    return (
                      <div className="text-center py-10 text-sm text-gray-500">
                        No variations available for this product.
                      </div>
                    );
                  }

                  return active.map((v) => {
                    const attributesLabel = v.attributes
                      ? Object.entries(v.attributes)
                          .map(([k, val]) => `${k}: ${val}`)
                          .join(", ")
                      : "";
                    const price = v.price ?? selectedProductForVariation.price;
                    const hasStock = v.stock > 0;

                    return (
                      <button
                        key={v.id}
                        disabled={!hasStock}
                        onClick={() => {
                          if (!hasStock) return;
                          addVariationToCart(selectedProductForVariation, v);
                          setShowVariationModal(false);
                          setSelectedProductForVariation(null);
                        }}
                        className={`w-full text-left p-4 rounded-xl border-2 mb-2 transition-all flex justify-between items-start ${
                          hasStock
                            ? "border-gray-200 hover:border-blue-500 hover:bg-blue-50 cursor-pointer"
                            : "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex-1 pr-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {attributesLabel || v.sku}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            SKU: {v.sku}
                          </div>
                          <div className="text-sm font-bold text-blue-600 mt-1">
                            ${price.toFixed(2)}
                          </div>
                        </div>
                        <div
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            hasStock
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {hasStock ? `${v.stock} in stock` : "Out of stock"}
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}


