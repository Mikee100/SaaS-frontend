"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/utils/api";
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
  category?: { name?: string } | string;
  customFields?: Record<string, unknown>;
};

type BomRecipeLine = {
  ingredientProductId: string;
  quantity: number;
  unit: string;
  wastePercent?: number;
};

type BomRecipe = {
  id: string;
  productId: string;
  yieldQty: number;
  yieldUnit: string;
  version: number;
  lines: BomRecipeLine[];
  product?: Product;
};

type BomDraftLine = {
  localId: string;
  ingredientProductId: string;
  quantity: string;
  unit: string;
  wastePercent: string;
};

type TenantRestaurantData = {
  restaurantFeaturesEnabled?: boolean;
  businessType?: string;
};

const BOM_UNIT_GROUPS: Array<{ label: string; options: string[] }> = [
  { label: "Weight", options: ["mg", "g", "kg", "oz", "lb"] },
  { label: "Volume", options: ["ml", "cl", "l", "tsp", "tbsp", "cup"] },
  { label: "Portion / Serving", options: ["pinch", "dash", "pc", "piece", "slice", "portion", "plate"] },
  { label: "Packaging", options: ["shot", "can", "bottle", "pack", "bunch"] },
];

const BOM_UNIT_OPTIONS = BOM_UNIT_GROUPS.flatMap((group) => group.options);

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

function money(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export default function RestaurantInventoryCostingPage() {
  const { user } = useUser();
  const { data: tenantData, isLoading: tenantLoading } = useTenant();
  const { data: branches = [], isLoading: branchesLoading } = useBranches();

  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedMealId, setSelectedMealId] = useState("");
  const [lineDrafts, setLineDrafts] = useState<BomDraftLine[]>([
    {
      localId: `line-${Date.now()}`,
      ingredientProductId: "",
      quantity: "1",
      unit: "kg",
      wastePercent: "0",
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  const canManageRecipeCosting = useMemo(
    () =>
      Boolean(
        user?.isSuperadmin ||
          hasPermission(user, "restaurant_bom_manage") ||
          normalizedRoles.includes("manager"),
      ),
    [normalizedRoles, user],
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

  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ["restaurant-costing", "products", selectedBranchId],
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
    enabled: isRestaurantTenant && !!selectedBranchId,
    staleTime: 30000,
  });

  const {
    data: recipes = [],
    isLoading: recipesLoading,
    refetch: refetchRecipes,
  } = useQuery({
    queryKey: ["restaurant-costing", "recipes", selectedBranchId],
    queryFn: async (): Promise<BomRecipe[]> => {
      if (!selectedBranchId) return [];
      const result = await apiGet<BomRecipe[]>("/restaurant/bom/recipes", { "x-branch-id": selectedBranchId });
      return Array.isArray(result) ? result : [];
    },
    enabled: isRestaurantTenant && !!selectedBranchId && canManageRecipeCosting,
    staleTime: 15000,
  });

  const ingredientProducts = useMemo(
    () => products.filter((product) => isIngredientProduct(product)),
    [products],
  );

  const mealProducts = useMemo(
    () => products.filter((product) => !isIngredientProduct(product)),
    [products],
  );

  const productNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of products) {
      map.set(product.id, product.name || "Unnamed product");
    }
    return map;
  }, [products]);

  const productCostById = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) {
      const baseCost = Number(product.cost || 0);
      const fallbackPrice = Number(product.price || 0);
      map.set(product.id, baseCost > 0 ? baseCost : fallbackPrice);
    }
    return map;
  }, [products]);

  const selectedMeal = useMemo(
    () => mealProducts.find((item) => item.id === selectedMealId) || null,
    [mealProducts, selectedMealId],
  );

  useEffect(() => {
    if (!selectedMealId && mealProducts.length > 0) {
      setSelectedMealId(mealProducts[0].id);
    }
  }, [mealProducts, selectedMealId]);

  useEffect(() => {
    if (!selectedMealId) return;

    const recipe = recipes.find((item) => item.productId === selectedMealId);
    if (!recipe) {
      setLineDrafts([
        {
          localId: `line-${Date.now()}`,
          ingredientProductId: "",
          quantity: "1",
          unit: "kg",
          wastePercent: "0",
        },
      ]);
      return;
    }

    const nextDrafts = (recipe.lines || []).map((line, index) => ({
      localId: `${recipe.id}-${index}`,
      ingredientProductId: line.ingredientProductId,
      quantity: String(line.quantity || 1),
      unit: line.unit || "kg",
      wastePercent: String(line.wastePercent || 0),
    }));

    setLineDrafts(
      nextDrafts.length > 0
        ? nextDrafts
        : [
            {
              localId: `line-${Date.now()}`,
              ingredientProductId: "",
              quantity: "1",
              unit: "kg",
              wastePercent: "0",
            },
          ],
    );
  }, [recipes, selectedMealId]);

  const recipeCost = useMemo(() => {
    return lineDrafts.reduce((sum, line) => {
      const qty = Number(line.quantity || 0);
      const waste = Math.max(0, Number(line.wastePercent || 0));
      const unitCost = Number(productCostById.get(line.ingredientProductId) || 0);
      const multiplier = 1 + waste / 100;
      return sum + unitCost * qty * multiplier;
    }, 0);
  }, [lineDrafts, productCostById]);

  const sellingPrice = Number(selectedMeal?.price || 0);
  const grossMargin = sellingPrice - recipeCost;
  const grossMarginPct = sellingPrice > 0 ? (grossMargin / sellingPrice) * 100 : 0;

  const addLine = () => {
    setLineDrafts((prev) => [
      ...prev,
      {
        localId: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ingredientProductId: "",
        quantity: "1",
        unit: "kg",
        wastePercent: "0",
      },
    ]);
  };

  const updateLine = (localId: string, patch: Partial<BomDraftLine>) => {
    setLineDrafts((prev) => prev.map((line) => (line.localId === localId ? { ...line, ...patch } : line)));
  };

  const removeLine = (localId: string) => {
    setLineDrafts((prev) => {
      const next = prev.filter((line) => line.localId !== localId);
      if (next.length > 0) return next;
      return [
        {
          localId: `line-${Date.now()}`,
          ingredientProductId: "",
          quantity: "1",
          unit: "kg",
          wastePercent: "0",
        },
      ];
    });
  };

  const saveRecipe = async () => {
    if (!selectedMealId) {
      setMessage({ type: "error", text: "Select a meal first." });
      return;
    }

    const validLines = lineDrafts
      .map((line) => ({
        ingredientProductId: line.ingredientProductId,
        quantity: Number(line.quantity || 0),
        unit: String(line.unit || "kg").trim() || "kg",
        wastePercent: Number(line.wastePercent || 0),
      }))
      .filter((line) => line.ingredientProductId && line.quantity > 0);

    if (validLines.length === 0) {
      setMessage({ type: "error", text: "Add at least one valid ingredient line." });
      return;
    }

    if (new Set(validLines.map((line) => line.ingredientProductId)).size !== validLines.length) {
      setMessage({ type: "error", text: "Duplicate ingredients are not allowed." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await apiPost(
        "/restaurant/bom/recipes",
        {
          productId: selectedMealId,
          yieldQty: 1,
          yieldUnit: "plate",
          lines: validLines,
        },
        { "x-branch-id": selectedBranchId },
      );

      await Promise.all([refetchRecipes(), refetchProducts()]);
      setMessage({ type: "success", text: "Recipe BOM saved successfully." });
    } catch (error) {
      const typed = error as { message?: string };
      setMessage({
        type: "error",
        text: typed?.message || "Failed to save recipe BOM.",
      });
    } finally {
      setSaving(false);
    }
  };

  const recipeRows = useMemo(() => {
    return recipes
      .map((recipe) => {
        const cost = (recipe.lines || []).reduce((sum, line) => {
          const unitCost = Number(productCostById.get(line.ingredientProductId) || 0);
          const qty = Number(line.quantity || 0);
          const wasteMultiplier = 1 + Math.max(0, Number(line.wastePercent || 0)) / 100;
          return sum + unitCost * qty * wasteMultiplier;
        }, 0);
        const product = mealProducts.find((item) => item.id === recipe.productId);
        const price = Number(product?.price || 0);
        const margin = price - cost;
        const marginPct = price > 0 ? (margin / price) * 100 : 0;

        return {
          recipe,
          mealName: recipe.product?.name || productNameById.get(recipe.productId) || "Unknown meal",
          ingredientCount: recipe.lines?.length || 0,
          productionCost: cost,
          sellingPrice: price,
          margin,
          marginPct,
        };
      })
      .sort((a, b) => a.mealName.localeCompare(b.mealName));
  }, [mealProducts, productCostById, productNameById, recipes]);

  if (tenantLoading || branchesLoading) {
    return <div className="p-6 text-sm text-gray-600">Loading restaurant inventory costing...</div>;
  }

  if (!isRestaurantTenant) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">Restaurant Inventory Costing</h1>
        <p className="mt-3 text-sm text-gray-600">
          This page is only available for tenants with a restaurant account.
        </p>
      </div>
    );
  }

  if (!canManageRecipeCosting) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">Restaurant Inventory Costing</h1>
        <p className="mt-3 text-sm text-gray-600">
          You do not have permission to manage meal ingredient costing.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurant Inventory Costing</h1>
          <p className="text-sm text-gray-600 mt-1">
            Define meal ingredients, track production cost, and compare against selling price.
          </p>
        </div>
        <div className="min-w-55">
          <label className="mb-1 block text-xs font-medium text-gray-600">Branch</label>
          <select
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
          >
            <option value="">Select branch</option>
            {branches.map((branch) => {
              const typed = branch as { id: string; name?: string };
              return (
                <option key={typed.id} value={typed.id}>
                  {typed.name || typed.id}
                </option>
              );
            })}
          </select>
        </div>
      </div>

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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900">Meal BOM Editor</h2>
            <p className="text-xs text-gray-500 mt-1">Each meal should include all ingredient lines that compose it.</p>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Meal</label>
                <select
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={selectedMealId}
                  onChange={(e) => setSelectedMealId(e.target.value)}
                  disabled={productsLoading}
                >
                  <option value="">Select meal</option>
                  {mealProducts
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                  <p className="text-gray-500">Production</p>
                  <p className="mt-1 font-semibold text-gray-900">{money(recipeCost)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                  <p className="text-gray-500">Selling</p>
                  <p className="mt-1 font-semibold text-gray-900">{money(sellingPrice)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                  <p className="text-gray-500">Margin</p>
                  <p className={`mt-1 font-semibold ${grossMargin >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {money(grossMargin)}
                  </p>
                  <p className="text-[11px] text-gray-500">{grossMarginPct.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {lineDrafts.map((line) => {
                const normalizedUnit = String(line.unit || "kg").trim() || "kg";
                const customUnit = BOM_UNIT_OPTIONS.includes(normalizedUnit) ? null : normalizedUnit;

                return (
                <div key={line.localId} className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-2 md:grid-cols-12">
                  <select
                    className="rounded-md border border-gray-300 px-2 py-2 text-xs md:col-span-5"
                    value={line.ingredientProductId}
                    onChange={(e) => updateLine(line.localId, { ingredientProductId: e.target.value })}
                  >
                    <option value="">Ingredient product</option>
                    {ingredientProducts
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                  </select>

                  <input
                    type="number"
                    min={0.0001}
                    step="0.01"
                    className="rounded-md border border-gray-300 px-2 py-2 text-xs md:col-span-2"
                    placeholder="Qty"
                    value={line.quantity}
                    onChange={(e) => updateLine(line.localId, { quantity: e.target.value })}
                  />

                  <select
                    className="rounded-md border border-gray-300 px-2 py-2 text-xs md:col-span-2"
                    value={normalizedUnit}
                    onChange={(e) => updateLine(line.localId, { unit: e.target.value })}
                  >
                    {BOM_UNIT_GROUPS.map((group) => (
                      <optgroup key={`${line.localId}-${group.label}`} label={group.label}>
                        {group.options.map((unit) => (
                          <option key={`${line.localId}-${unit}`} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    {customUnit && (
                      <optgroup label="Existing Unit">
                        <option key={`${line.localId}-${customUnit}`} value={customUnit}>
                          {customUnit}
                        </option>
                      </optgroup>
                    )}
                  </select>

                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    className="rounded-md border border-gray-300 px-2 py-2 text-xs md:col-span-2"
                    placeholder="Waste %"
                    value={line.wastePercent}
                    onChange={(e) => updateLine(line.localId, { wastePercent: e.target.value })}
                  />

                  <button
                    type="button"
                    onClick={() => removeLine(line.localId)}
                    className="rounded-md border border-red-300 bg-red-50 px-2 py-2 text-xs font-medium text-red-700 hover:bg-red-100 md:col-span-1"
                  >
                    Remove
                  </button>
                </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addLine}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
                >
                  Add Ingredient
                </button>
                <button
                  type="button"
                  onClick={() => void saveRecipe()}
                  disabled={saving || !selectedMealId}
                  className="rounded-md bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Meal BOM"}
                </button>
              </div>

              <p className="text-xs text-gray-600">
                Estimated production cost: <span className="font-semibold text-gray-900">{money(recipeCost)}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900">Costing Overview</h2>
            <p className="text-xs text-gray-500 mt-1">Meals, production cost, selling price, and margin.</p>
          </div>
          <div className="max-h-160 overflow-auto p-3">
            {recipesLoading && <p className="text-sm text-gray-500">Loading recipes...</p>}

            {!recipesLoading && recipeRows.length === 0 && (
              <p className="text-sm text-gray-500">No recipe BOMs saved yet.</p>
            )}

            <div className="space-y-2">
              {recipeRows.map((row) => (
                <button
                  key={row.recipe.id}
                  type="button"
                  onClick={() => setSelectedMealId(row.recipe.productId)}
                  className="w-full rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{row.mealName}</p>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700">
                      v{row.recipe.version}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{row.ingredientCount} ingredients</p>
                  <div className="mt-2 grid grid-cols-3 gap-1 text-[11px]">
                    <div>
                      <p className="text-gray-500">Cost</p>
                      <p className="font-semibold text-gray-900">{money(row.productionCost)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Sell</p>
                      <p className="font-semibold text-gray-900">{money(row.sellingPrice)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Margin</p>
                      <p className={`font-semibold ${row.margin >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {money(row.margin)}
                      </p>
                      <p className="text-gray-500">{row.marginPct.toFixed(1)}%</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!selectedBranchId && (
        <p className="text-xs text-amber-700">Select a branch to load restaurant meals and ingredient costing data.</p>
      )}

      {(productsLoading || recipesLoading) && selectedBranchId && (
        <p className="text-xs text-gray-500">Refreshing data...</p>
      )}
    </div>
  );
}
