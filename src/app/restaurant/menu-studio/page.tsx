"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FaUtensils, FaGlassMartiniAlt, FaIceCream, FaSearch, FaPlus, FaSync, FaTimes, FaPen, FaTrashAlt, FaBoxes } from "react-icons/fa";
import { MdRestaurantMenu } from "react-icons/md";
import { apiDelete, apiGet, apiPost, apiPut } from "@/utils/api";
import { useUser } from "@/components/UserContext";
import { useTenant } from "@/hooks/useTenant";
import { useBranches } from "@/hooks/useBranches";
import { hasPermission } from "@/utils/permissions";

type Product = {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  cost?: number;
  stock?: number;
  description?: string;
  branchId?: string;
  category?: { name?: string } | string;
  customFields?: Record<string, unknown>;
  isActive?: boolean;
};

type TenantRestaurantData = {
  restaurantFeaturesEnabled?: boolean;
  businessType?: string;
};

type ProductCategory = {
  id: string;
  name: string;
  slug?: string;
  isActive?: boolean;
};

type DrinkInventoryMeta = {
  stockTrackedDrink: boolean;
  bottleSizeMl: number;
  servingSizeMl: number;
  purchaseCostPerBottle: number;
};

const RESTAURANT_CATEGORIES = [
  "Meals",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Starters",
  "Salads",
  "Soups",
  "Desserts",
  "Hot Drinks",
  "Sodas",
  "Juices",
  "Cocktails",
  "Beer",
  "Wines",
  "Spirits",
  "Bar Snacks",
];

const DRINK_STOCK_KEYWORDS = [
  "drink",
  "juice",
  "cocktail",
  "beer",
  "wine",
  "spirit",
  "whisky",
  "vodka",
  "rum",
  "gin",
  "cider",
  "bar",
  "soda",
];

function resolvedCategory(product: Product): string {
  if (typeof product.category === "string") {
    return product.category;
  }

  if (product.category && typeof product.category === "object") {
    return String(product.category.name || "");
  }

  return "";
}

function isIngredientProduct(product: Product): boolean {
  const custom = (product.customFields || {}) as Record<string, unknown>;
  const category = resolvedCategory(product).toLowerCase();
  const sku = String(product.sku || "").toUpperCase();

  return (
    custom.isIngredient === true ||
    custom.ingredient === true ||
    category === "ingredients" ||
    category === "ingredient" ||
    sku.startsWith("ING-")
  );
}

function categoryBadgeClass(category: string): string {
  const normalized = category.toLowerCase();
  if (normalized.includes("dessert")) return "bg-pink-100 text-pink-800 border-pink-200";
  if (normalized.includes("drink") || normalized.includes("juice") || normalized.includes("cocktail")) {
    return "bg-cyan-100 text-cyan-800 border-cyan-200";
  }
  if (normalized.includes("beer") || normalized.includes("wine") || normalized.includes("spirit")) {
    return "bg-amber-100 text-amber-800 border-amber-200";
  }
  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}

function isStockTrackedCategoryName(category: string): boolean {
  const normalized = String(category || "").toLowerCase();
  return DRINK_STOCK_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getDrinkInventoryMeta(product?: Product | null): DrinkInventoryMeta {
  const custom = (product?.customFields || {}) as Record<string, unknown>;
  const category = resolvedCategory(product || ({} as Product));
  const inferredTracked =
    custom.stockTrackedDrink === true ||
    custom.stockTracked === true ||
    custom.stockTrackingMode === "drink" ||
    isStockTrackedCategoryName(category);

  return {
    stockTrackedDrink: inferredTracked,
    bottleSizeMl: asNumber(custom.bottleSizeMl, 750),
    servingSizeMl: asNumber(custom.servingSizeMl, 30),
    purchaseCostPerBottle: asNumber(custom.purchaseCostPerBottle, asNumber(product?.cost, 0)),
  };
}

function getDrinkMetrics(bottleSizeMl: number, servingSizeMl: number, purchaseCostPerBottle: number) {
  const bottle = Math.max(0, bottleSizeMl);
  const serving = Math.max(0, servingSizeMl);
  const cost = Math.max(0, purchaseCostPerBottle);
  const servingsPerBottle = bottle > 0 && serving > 0 ? bottle / serving : 0;
  const costPerServing = servingsPerBottle > 0 ? cost / servingsPerBottle : 0;
  return { servingsPerBottle, costPerServing };
}

export default function RestaurantMenuStudioPage() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { data: tenantData, isLoading: tenantLoading } = useTenant();
  const { data: branches = [], isLoading: branchesLoading } = useBranches();

  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Product | null>(null);
  const [itemActionSaving, setItemActionSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState("");

  const [form, setForm] = useState({
    name: "",
    sku: "",
    price: "",
    cost: "",
    stock: "0",
    bottleSizeMl: "750",
    servingSizeMl: "30",
    purchaseCostPerBottle: "0",
    category: "Meals",
    description: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    sku: "",
    category: "Meals",
    price: "0",
    cost: "0",
    stock: "0",
    bottleSizeMl: "750",
    servingSizeMl: "30",
    purchaseCostPerBottle: "0",
    description: "",
  });
  const [stockDraft, setStockDraft] = useState("0");

  const normalizedRoles = useMemo(
    () => (Array.isArray(user?.roles) ? user.roles.map((role) => String(role || "").toLowerCase()) : []),
    [user?.roles],
  );

  const isRestaurantTenant = useMemo(() => {
    const typedTenant = (tenantData || {}) as TenantRestaurantData;
    const businessType = String(typedTenant.businessType || "").toLowerCase();
    return (
      Boolean(typedTenant.restaurantFeaturesEnabled) ||
      businessType.includes("restaurant") ||
      businessType.includes("hospitality")
    );
  }, [tenantData]);

  const canViewProducts = hasPermission(user, "view_products");
  const canCreateProducts = hasPermission(user, "create_products") || normalizedRoles.includes("manager");
  const canEditProducts = hasPermission(user, "edit_products") || normalizedRoles.includes("manager");

  const isCreateStockTrackedDrink = useMemo(
    () => isStockTrackedCategoryName(form.category),
    [form.category],
  );

  const isEditStockTrackedDrink = useMemo(
    () => isStockTrackedCategoryName(editForm.category),
    [editForm.category],
  );

  const createDrinkMetrics = useMemo(
    () =>
      getDrinkMetrics(
        Number(form.bottleSizeMl || 0),
        Number(form.servingSizeMl || 0),
        Number(form.purchaseCostPerBottle || form.cost || 0),
      ),
    [form.bottleSizeMl, form.servingSizeMl, form.purchaseCostPerBottle, form.cost],
  );

  const editDrinkMetrics = useMemo(
    () =>
      getDrinkMetrics(
        Number(editForm.bottleSizeMl || 0),
        Number(editForm.servingSizeMl || 0),
        Number(editForm.purchaseCostPerBottle || editForm.cost || 0),
      ),
    [editForm.bottleSizeMl, editForm.servingSizeMl, editForm.purchaseCostPerBottle, editForm.cost],
  );

  useEffect(() => {
    if (selectedBranchId) return;

    const storedBranch = typeof window !== "undefined" ? localStorage.getItem("selectedBranchId") || "" : "";
    if (storedBranch) {
      setSelectedBranchId(storedBranch);
      return;
    }

    if (user?.branchId) {
      setSelectedBranchId(user.branchId);
      return;
    }

    if (branches.length > 0) {
      const first = branches[0] as { id?: string };
      if (first?.id) {
        setSelectedBranchId(first.id);
      }
    }
  }, [branches, selectedBranchId, user?.branchId]);

  const {
    data: products = [],
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ["restaurant-menu-studio", "products", selectedBranchId],
    queryFn: async (): Promise<Product[]> => {
      if (!selectedBranchId) return [];
      const response = await apiGet<{ products?: Product[] } | Product[]>(
        "/products?page=1&limit=1000&includeVariations=true",
        { "x-branch-id": selectedBranchId },
      );

      if (Array.isArray(response)) return response;
      if (response && Array.isArray(response.products)) return response.products;
      return [];
    },
    enabled: isRestaurantTenant && !!selectedBranchId && canViewProducts,
    staleTime: 20000,
  });

  const {
    data: managedCategories = [],
    isLoading: categoriesLoading,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ["restaurant-menu-studio", "categories"],
    queryFn: async (): Promise<ProductCategory[]> => {
      const result = await apiGet<ProductCategory[]>("/products/categories");
      return Array.isArray(result) ? result : [];
    },
    enabled: isRestaurantTenant && canViewProducts,
    staleTime: 30000,
  });

  const menuItems = useMemo(() => products.filter((item) => !isIngredientProduct(item)), [products]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return menuItems
      .filter((item) => {
        const category = resolvedCategory(item) || "Uncategorized";
        const matchesCategory = selectedCategory === "all" || category.toLowerCase() === selectedCategory.toLowerCase();
        if (!matchesCategory) return false;
        if (!query) return true;

        const name = String(item.name || "").toLowerCase();
        const sku = String(item.sku || "").toLowerCase();
        const description = String(item.description || "").toLowerCase();
        return name.includes(query) || sku.includes(query) || description.includes(query);
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [menuItems, search, selectedCategory]);

  const groupedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of menuItems) {
      const category = resolvedCategory(item) || "Uncategorized";
      counts.set(category, (counts.get(category) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [menuItems]);

  const categoryOptions = useMemo(() => {
    const defaults = RESTAURANT_CATEGORIES;
    const managed = managedCategories.map((item) => String(item.name || "").trim()).filter(Boolean);
    const inUse = groupedCounts.map(([name]) => name).filter(Boolean);
    return Array.from(new Set([...defaults, ...managed, ...inUse])).sort((a, b) => a.localeCompare(b));
  }, [groupedCounts, managedCategories]);

  useEffect(() => {
    if (form.category && categoryOptions.includes(form.category)) return;
    if (categoryOptions.length > 0) {
      setForm((prev) => ({ ...prev, category: categoryOptions[0] }));
    }
  }, [categoryOptions, form.category]);

  async function handleCreateMenuItem(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!canCreateProducts) {
      setMessage({ type: "error", text: "You do not have permission to create menu items." });
      return;
    }

    if (!selectedBranchId) {
      setMessage({ type: "error", text: "Select a branch first." });
      return;
    }

    const name = form.name.trim();
    const category = form.category.trim();
    const price = Number(form.price);
    const cost = Number(form.cost || 0);
    const stock = isStockTrackedCategoryName(category) ? Number(form.stock || 0) : 0;
    const bottleSizeMl = Number(form.bottleSizeMl || 0);
    const servingSizeMl = Number(form.servingSizeMl || 0);
    const purchaseCostPerBottle = Number(form.purchaseCostPerBottle || form.cost || 0);

    if (!name) {
      setMessage({ type: "error", text: "Meal name is required." });
      return;
    }

    if (!category) {
      setMessage({ type: "error", text: "Category is required." });
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setMessage({ type: "error", text: "Selling price must be greater than zero." });
      return;
    }

    if (isStockTrackedCategoryName(category)) {
      if (!Number.isFinite(stock) || stock < 0) {
        setMessage({ type: "error", text: "Drink stock must be zero or more." });
        return;
      }
      if (!Number.isFinite(bottleSizeMl) || bottleSizeMl <= 0) {
        setMessage({ type: "error", text: "Bottle size (ml) must be greater than zero." });
        return;
      }
      if (!Number.isFinite(servingSizeMl) || servingSizeMl <= 0) {
        setMessage({ type: "error", text: "Serving size (ml) must be greater than zero." });
        return;
      }
      if (servingSizeMl > bottleSizeMl) {
        setMessage({ type: "error", text: "Serving size cannot be larger than bottle size." });
        return;
      }
      if (!Number.isFinite(purchaseCostPerBottle) || purchaseCostPerBottle < 0) {
        setMessage({ type: "error", text: "Buying cost per bottle must be valid." });
        return;
      }
    }

    setSaving(true);
    try {
      const servingsPerBottle =
        isStockTrackedCategoryName(category) && bottleSizeMl > 0 && servingSizeMl > 0
          ? bottleSizeMl / servingSizeMl
          : 0;
      const estimatedCostPerServing = servingsPerBottle > 0 ? purchaseCostPerBottle / servingsPerBottle : 0;

      await apiPost(
        "/products",
        {
          name,
          sku: form.sku.trim() || undefined,
          price,
          cost: Number.isFinite(cost) ? cost : 0,
          stock: Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0,
          category,
          description: form.description.trim(),
          customFieldValues: {
            stockTrackedDrink: isStockTrackedCategoryName(category),
            stockTrackingMode: isStockTrackedCategoryName(category) ? "drink" : "non-stock",
            bottleSizeMl: isStockTrackedCategoryName(category) ? bottleSizeMl : undefined,
            servingSizeMl: isStockTrackedCategoryName(category) ? servingSizeMl : undefined,
            purchaseCostPerBottle: isStockTrackedCategoryName(category) ? purchaseCostPerBottle : undefined,
            servingsPerBottle: isStockTrackedCategoryName(category) ? servingsPerBottle : undefined,
            estimatedCostPerServing: isStockTrackedCategoryName(category) ? estimatedCostPerServing : undefined,
          },
          branchId: selectedBranchId,
        },
        { "x-branch-id": selectedBranchId },
      );

      await queryClient.invalidateQueries({ queryKey: ["restaurant-menu-studio", "products", selectedBranchId] });
      setForm({
        name: "",
        sku: "",
        price: "",
        cost: "",
        stock: "0",
        bottleSizeMl: "750",
        servingSizeMl: "30",
        purchaseCostPerBottle: "0",
        category: "Meals",
        description: "",
      });
      setShowCreateForm(false);
      setMessage({ type: "success", text: "Menu item created successfully." });
    } catch (error: unknown) {
      const err = error as Error;
      setMessage({ type: "error", text: err?.message || "Failed to create menu item." });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: Product) {
    if (!canEditProducts) {
      setMessage({ type: "error", text: "You do not have permission to update menu items." });
      return;
    }

    if (!selectedBranchId) return;

    setMessage(null);
    try {
      await apiPut(
        `/products/${item.id}`,
        { isActive: item.isActive === false },
        { "x-branch-id": selectedBranchId },
      );
      await refetchProducts();
      setMessage({ type: "success", text: `${item.name} updated.` });
    } catch (error: unknown) {
      const err = error as Error;
      setMessage({ type: "error", text: err?.message || "Failed to update menu item." });
    }
  }

  async function handleCreateCategory() {
    setCategoryError("");
    if (!canEditProducts) {
      setCategoryError("You do not have permission to manage categories.");
      return;
    }

    const name = newCategoryName.trim();
    if (!name) {
      setCategoryError("Category name is required.");
      return;
    }

    setCategorySaving(true);
    try {
      await apiPost("/products/categories", { name });
      setNewCategoryName("");
      await refetchCategories();
      setMessage({ type: "success", text: `Category \"${name}\" added.` });
    } catch (error: unknown) {
      const err = error as Error;
      setCategoryError(err?.message || "Failed to add category.");
    } finally {
      setCategorySaving(false);
    }
  }

  async function handleDeleteCategory(categoryId: string, categoryName: string) {
    setCategoryError("");
    if (!canEditProducts) {
      setCategoryError("You do not have permission to manage categories.");
      return;
    }

    setCategorySaving(true);
    try {
      await apiDelete(`/products/categories/${categoryId}`);
      await refetchCategories();
      setMessage({ type: "success", text: `Category \"${categoryName}\" removed.` });
    } catch (error: unknown) {
      const err = error as Error;
      setCategoryError(err?.message || "Failed to remove category.");
    } finally {
      setCategorySaving(false);
    }
  }

  function openEditItemModal(item: Product) {
    const drinkMeta = getDrinkInventoryMeta(item);
    setSelectedItem(item);
    setEditForm({
      name: String(item.name || ""),
      sku: String(item.sku || ""),
      category: resolvedCategory(item) || categoryOptions[0] || "Meals",
      price: String(Number(item.price || 0)),
      cost: String(Number(item.cost || 0)),
      stock: String(Number(item.stock || 0)),
      bottleSizeMl: String(drinkMeta.bottleSizeMl),
      servingSizeMl: String(drinkMeta.servingSizeMl),
      purchaseCostPerBottle: String(drinkMeta.purchaseCostPerBottle),
      description: String(item.description || ""),
    });
    setShowEditItemModal(true);
  }

  function openStockModal(item: Product) {
    setSelectedItem(item);
    setStockDraft(String(Number(item.stock || 0)));
    setShowStockModal(true);
  }

  async function handleSaveItemDetails() {
    if (!selectedItem || !selectedBranchId) return;

    const name = editForm.name.trim();
    const category = editForm.category.trim();
    const price = Number(editForm.price);
    const cost = Number(editForm.cost);
    const isDrinkStockTracked = isStockTrackedCategoryName(category);
    const stock = isDrinkStockTracked ? Number(editForm.stock) : 0;
    const bottleSizeMl = Number(editForm.bottleSizeMl || 0);
    const servingSizeMl = Number(editForm.servingSizeMl || 0);
    const purchaseCostPerBottle = Number(editForm.purchaseCostPerBottle || editForm.cost || 0);

    if (!name) {
      setMessage({ type: "error", text: "Item name is required." });
      return;
    }
    if (!category) {
      setMessage({ type: "error", text: "Category is required." });
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setMessage({ type: "error", text: "Selling price must be a valid number." });
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      setMessage({ type: "error", text: "Cost must be a valid number." });
      return;
    }
    if (isDrinkStockTracked) {
      if (!Number.isFinite(stock) || stock < 0) {
        setMessage({ type: "error", text: "Drink stock must be zero or more." });
        return;
      }
      if (!Number.isFinite(bottleSizeMl) || bottleSizeMl <= 0) {
        setMessage({ type: "error", text: "Bottle size (ml) must be greater than zero." });
        return;
      }
      if (!Number.isFinite(servingSizeMl) || servingSizeMl <= 0) {
        setMessage({ type: "error", text: "Serving size (ml) must be greater than zero." });
        return;
      }
      if (servingSizeMl > bottleSizeMl) {
        setMessage({ type: "error", text: "Serving size cannot be larger than bottle size." });
        return;
      }
    }

    setItemActionSaving(true);
    try {
      const servingsPerBottle =
        isDrinkStockTracked && bottleSizeMl > 0 && servingSizeMl > 0
          ? bottleSizeMl / servingSizeMl
          : 0;
      const estimatedCostPerServing = servingsPerBottle > 0 ? purchaseCostPerBottle / servingsPerBottle : 0;

      await apiPut(
        `/products/${selectedItem.id}`,
        {
          name,
          sku: editForm.sku.trim() || undefined,
          category,
          price,
          cost,
          stock: Math.floor(stock),
          description: editForm.description.trim(),
          customFieldValues: {
            stockTrackedDrink: isDrinkStockTracked,
            stockTrackingMode: isDrinkStockTracked ? "drink" : "non-stock",
            bottleSizeMl: isDrinkStockTracked ? bottleSizeMl : undefined,
            servingSizeMl: isDrinkStockTracked ? servingSizeMl : undefined,
            purchaseCostPerBottle: isDrinkStockTracked ? purchaseCostPerBottle : undefined,
            servingsPerBottle: isDrinkStockTracked ? servingsPerBottle : undefined,
            estimatedCostPerServing: isDrinkStockTracked ? estimatedCostPerServing : undefined,
          },
        },
        { "x-branch-id": selectedBranchId },
      );
      await refetchProducts();
      setShowEditItemModal(false);
      setSelectedItem(null);
      setMessage({ type: "success", text: `${name} updated successfully.` });
    } catch (error: unknown) {
      const err = error as Error;
      setMessage({ type: "error", text: err?.message || "Failed to update menu item." });
    } finally {
      setItemActionSaving(false);
    }
  }

  async function handleUpdateStockOnly() {
    if (!selectedItem || !selectedBranchId) return;

    const stock = Number(stockDraft);
    if (!Number.isFinite(stock) || stock < 0) {
      setMessage({ type: "error", text: "Stock must be zero or more." });
      return;
    }

    setItemActionSaving(true);
    try {
      await apiPut(
        `/products/${selectedItem.id}`,
        { stock: Math.floor(stock) },
        { "x-branch-id": selectedBranchId },
      );
      await refetchProducts();
      setShowStockModal(false);
      setSelectedItem(null);
      setMessage({ type: "success", text: `Stock updated for ${selectedItem.name}.` });
    } catch (error: unknown) {
      const err = error as Error;
      setMessage({ type: "error", text: err?.message || "Failed to update stock." });
    } finally {
      setItemActionSaving(false);
    }
  }

  async function handleDeleteMenuItem(item: Product) {
    if (!selectedBranchId) return;

    const confirmed = window.confirm(`Delete ${item.name || "this item"}? This action can be reversed from deleted products.`);
    if (!confirmed) return;

    setItemActionSaving(true);
    try {
      await apiDelete(`/products/${item.id}`, { "x-branch-id": selectedBranchId });
      await refetchProducts();
      setMessage({ type: "success", text: `${item.name} deleted.` });
    } catch (error: unknown) {
      const err = error as Error;
      setMessage({ type: "error", text: err?.message || "Failed to delete menu item." });
    } finally {
      setItemActionSaving(false);
    }
  }

  if (tenantLoading || branchesLoading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading restaurant menu studio...
        </div>
      </div>
    );
  }

  if (!isRestaurantTenant) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          This page is available only for restaurant tenants.
        </div>
      </div>
    );
  }

  if (!canViewProducts) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          You do not have permission to view menu items.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-linear-to-r from-slate-900 via-slate-800 to-emerald-900 p-5 text-white shadow-lg sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Restaurant Control</p>
              <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold sm:text-3xl">
                <MdRestaurantMenu className="text-emerald-300" />
                Menu Studio
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-200">
                Build and manage meals, desserts, drinks, and bar items in one focused page built for restaurants.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => refetchProducts()}
                className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/20"
              >
                <FaSync />
                Refresh
              </button>
              {canEditProducts && (
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  Manage Categories
                </button>
              )}
              {canCreateProducts && (
                <button
                  type="button"
                  onClick={() => setShowCreateForm((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-300"
                >
                  {showCreateForm ? <FaTimes /> : <FaPlus />}
                  {showCreateForm ? "Close Form" : "Add Menu Item"}
                </button>
              )}
            </div>
          </div>
        </section>

        {message && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Menu Items</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{menuItems.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Meals</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {menuItems.filter((item) => resolvedCategory(item).toLowerCase().includes("meal")).length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Desserts</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {menuItems.filter((item) => resolvedCategory(item).toLowerCase().includes("dessert")).length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Drinks</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {
                menuItems.filter((item) => {
                  const category = resolvedCategory(item).toLowerCase();
                  return (
                    category.includes("drink") ||
                    category.includes("juice") ||
                    category.includes("cocktail") ||
                    category.includes("beer") ||
                    category.includes("wine") ||
                    category.includes("spirit")
                  );
                }).length
              }
            </p>
          </div>
        </section>

        {showCreateForm && canCreateProducts && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-semibold text-slate-900">Create Menu Item</h2>
            <p className="mt-1 text-xs text-slate-500">Add meals, desserts, drinks, and any custom menu category.</p>

            <form onSubmit={handleCreateMenuItem} className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-medium text-slate-600">
                Name
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-400 focus:ring"
                  placeholder="Nyama Choma Platter"
                  required
                />
              </label>

              <label className="text-xs font-medium text-slate-600">
                SKU (optional)
                <input
                  value={form.sku}
                  onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-400 focus:ring"
                  placeholder="MEAL-001"
                />
              </label>

              <label className="text-xs font-medium text-slate-600">
                Category
                <select
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-400 focus:ring"
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-medium text-slate-600">
                Selling Price
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-400 focus:ring"
                  placeholder="1200"
                  required
                />
              </label>

              <label className="text-xs font-medium text-slate-600">
                {isCreateStockTrackedDrink ? "Buying Cost Per Bottle" : "Cost Price"}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => setForm((prev) => ({ ...prev, cost: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-400 focus:ring"
                  placeholder="780"
                />
              </label>

              <label className="text-xs font-medium text-slate-600">
                Opening Stock {isCreateStockTrackedDrink ? "(Bottles)" : "(Not tracked for meals/desserts)"}
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-400 focus:ring"
                  disabled={!isCreateStockTrackedDrink}
                />
              </label>

              {isCreateStockTrackedDrink && (
                <>
                  <label className="text-xs font-medium text-slate-600">
                    Bottle Size (ml)
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={form.bottleSizeMl}
                      onChange={(e) => setForm((prev) => ({ ...prev, bottleSizeMl: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-400 focus:ring"
                      placeholder="750"
                    />
                  </label>

                  <label className="text-xs font-medium text-slate-600">
                    Serving Size (ml)
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={form.servingSizeMl}
                      onChange={(e) => setForm((prev) => ({ ...prev, servingSizeMl: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-400 focus:ring"
                      placeholder="30"
                    />
                  </label>

                  <label className="text-xs font-medium text-slate-600">
                    Buying Cost Per Bottle
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.purchaseCostPerBottle}
                      onChange={(e) => setForm((prev) => ({ ...prev, purchaseCostPerBottle: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-400 focus:ring"
                      placeholder="2500"
                    />
                  </label>

                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 md:col-span-2 lg:col-span-3">
                    <p>
                      Estimated servings per bottle: <span className="font-semibold">{createDrinkMetrics.servingsPerBottle.toFixed(1)}</span>
                    </p>
                    <p className="mt-1">
                      Estimated cost per serving: <span className="font-semibold">KES {createDrinkMetrics.costPerServing.toFixed(2)}</span>
                    </p>
                  </div>
                </>
              )}

              <label className="text-xs font-medium text-slate-600 md:col-span-2 lg:col-span-3">
                Description
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-400 focus:ring"
                  rows={3}
                  placeholder="Short description shown to staff."
                />
              </label>

              <div className="md:col-span-2 lg:col-span-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
                >
                  <FaPlus />
                  {saving ? "Creating..." : "Create Menu Item"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-72 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none ring-emerald-400 focus:ring"
                  placeholder="Search meal, dessert, drink..."
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-400 focus:ring"
              >
                <option value="all">All Categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500">{filteredItems.length} items</p>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-12 bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <div className="col-span-3">Item</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2">Sell Price</div>
              <div className="col-span-2">Cost</div>
              <div className="col-span-1">Stock</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1">Actions</div>
            </div>

            {productsLoading ? (
              <div className="px-3 py-6 text-sm text-slate-500">Loading menu items...</div>
            ) : filteredItems.length === 0 ? (
              <div className="px-3 py-8 text-sm text-slate-500">No menu items match your filter.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const category = resolvedCategory(item) || "Uncategorized";
                  return (
                    <div key={item.id} className="grid grid-cols-12 items-center px-3 py-3 text-sm">
                      <div className="col-span-3 min-w-0 pr-3">
                        <p className="truncate font-medium text-slate-900">{item.name || "Unnamed"}</p>
                        <p className="truncate text-xs text-slate-500">{item.sku || "No SKU"}</p>
                      </div>
                      <div className="col-span-2 pr-2">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${categoryBadgeClass(category)}`}>
                          {category}
                        </span>
                      </div>
                      <div className="col-span-2 text-slate-700">KES {Number(item.price || 0).toLocaleString()}</div>
                      <div className="col-span-2 text-slate-700">KES {Number(item.cost || 0).toLocaleString()}</div>
                      <div className="col-span-1 text-slate-700">
                        {isStockTrackedCategoryName(category) ? Number(item.stock || 0) : "n/a"}
                      </div>
                      <div className="col-span-1">
                        <button
                          type="button"
                          disabled={!canEditProducts}
                          onClick={() => toggleActive(item)}
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.isActive === false
                              ? "bg-slate-200 text-slate-700"
                              : "bg-emerald-100 text-emerald-800"
                          } ${canEditProducts ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                        >
                          {item.isActive === false ? "Inactive" : "Active"}
                        </button>
                      </div>
                      <div className="col-span-1">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            disabled={!canEditProducts || itemActionSaving}
                            onClick={() => openEditItemModal(item)}
                            className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FaPen />
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={!canEditProducts || itemActionSaving || !isStockTrackedCategoryName(category)}
                            onClick={() => openStockModal(item)}
                            className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FaBoxes />
                            Stock
                          </button>
                          <button
                            type="button"
                            disabled={!canEditProducts || itemActionSaving}
                            onClick={() => handleDeleteMenuItem(item)}
                            className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FaTrashAlt />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {showEditItemModal && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Edit Menu Item</h2>
                  <p className="mt-1 text-sm text-slate-500">Update name, category, prices, stock, and description.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditItemModal(false);
                    setSelectedItem(null);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              <div className="grid gap-3 p-5 md:grid-cols-2">
                <label className="text-xs font-medium text-slate-600">
                  Name
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-emerald-400 focus:ring"
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  SKU
                  <input
                    value={editForm.sku}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, sku: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-emerald-400 focus:ring"
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Category
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-emerald-400 focus:ring"
                  >
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Stock
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editForm.stock}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, stock: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-emerald-400 focus:ring"
                    disabled={!isEditStockTrackedDrink}
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Selling Price
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.price}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, price: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-emerald-400 focus:ring"
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  {isEditStockTrackedDrink ? "Buying Cost Per Bottle" : "Cost"}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.cost}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, cost: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-emerald-400 focus:ring"
                  />
                </label>
                {isEditStockTrackedDrink && (
                  <>
                    <label className="text-xs font-medium text-slate-600">
                      Bottle Size (ml)
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={editForm.bottleSizeMl}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, bottleSizeMl: e.target.value }))}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-emerald-400 focus:ring"
                      />
                    </label>
                    <label className="text-xs font-medium text-slate-600">
                      Serving Size (ml)
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={editForm.servingSizeMl}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, servingSizeMl: e.target.value }))}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-emerald-400 focus:ring"
                      />
                    </label>
                    <label className="text-xs font-medium text-slate-600 md:col-span-2">
                      Buying Cost Per Bottle
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.purchaseCostPerBottle}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, purchaseCostPerBottle: e.target.value }))}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-emerald-400 focus:ring"
                      />
                    </label>

                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 md:col-span-2">
                      <p>
                        Estimated servings per bottle: <span className="font-semibold">{editDrinkMetrics.servingsPerBottle.toFixed(1)}</span>
                      </p>
                      <p className="mt-1">
                        Estimated cost per serving: <span className="font-semibold">KES {editDrinkMetrics.costPerServing.toFixed(2)}</span>
                      </p>
                    </div>
                  </>
                )}
                <label className="text-xs font-medium text-slate-600 md:col-span-2">
                  Description
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-400 focus:ring"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditItemModal(false);
                    setSelectedItem(null);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={itemActionSaving}
                  onClick={handleSaveItemDetails}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {itemActionSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showStockModal && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Update Stock</h2>
                  <p className="mt-1 text-sm text-slate-500">{selectedItem.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowStockModal(false);
                    setSelectedItem(null);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
              <div className="p-5">
                <label className="text-xs font-medium text-slate-600">
                  New Stock Quantity
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={stockDraft}
                    onChange={(e) => setStockDraft(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-blue-400 focus:ring"
                  />
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowStockModal(false);
                    setSelectedItem(null);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={itemActionSaving}
                  onClick={handleUpdateStockOnly}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                >
                  {itemActionSaving ? "Saving..." : "Update Stock"}
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FaUtensils className="text-emerald-600" />
              Meals
            </h3>
            <p className="mt-2 text-xs text-slate-500">Main dishes and set menus.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FaIceCream className="text-pink-600" />
              Desserts
            </h3>
            <p className="mt-2 text-xs text-slate-500">Cakes, sweets, and after-meal items.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FaGlassMartiniAlt className="text-cyan-600" />
              Drinks
            </h3>
            <p className="mt-2 text-xs text-slate-500">Juices, cocktails, wines, spirits, and soft drinks.</p>
          </div>
        </section>

        {showCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Restaurant Category Manager</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Add or remove menu categories for this tenant. Example: Drinks, Desserts, Wines, Cocktails.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setCategoryError("");
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
                <div className="border-b border-slate-200 p-5 md:border-b-0 md:border-r">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Create Category</h3>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. Smoothies"
                      className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none ring-emerald-400 focus:ring"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={categorySaving}
                      className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                    >
                      Add
                    </button>
                  </div>

                  <p className="mt-5 text-sm font-semibold text-slate-700">Popular Quick Add</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {RESTAURANT_CATEGORIES.filter((name) => !categoryOptions.includes(name)).map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setNewCategoryName(name)}
                        className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        {name}
                      </button>
                    ))}
                  </div>

                  {categoryError && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {categoryError}
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Current Categories</h3>
                  <p className="mt-1 text-xs text-slate-500">You can remove any tenant-managed category not needed.</p>

                  <div className="mt-3 max-h-[52vh] space-y-2 overflow-auto pr-1">
                    {categoriesLoading ? (
                      <p className="text-sm text-slate-500">Loading categories...</p>
                    ) : managedCategories.length === 0 ? (
                      <p className="text-sm text-slate-500">No tenant categories yet. Add one from the left panel.</p>
                    ) : (
                      managedCategories.map((cat) => {
                        const usage = groupedCounts.find(([name]) => name.toLowerCase() === String(cat.name || "").toLowerCase())?.[1] || 0;
                        return (
                          <div
                            key={cat.id}
                            className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium text-slate-900">{cat.name}</p>
                              <p className="text-xs text-slate-500">{usage} menu items currently use this category</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              disabled={categorySaving}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

