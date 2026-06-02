"use client";

import React from "react";
import { apiDelete, apiGet, apiPost, apiPut } from "@/utils/api";

type MeasurementUnit = {
  id: string;
  name: string;
  abbreviation: string;
  type: string;
  baseUnit?: string | null;
  conversionFactor?: number | null;
  isBaseUnit?: boolean;
  sortOrder?: number;
  isActive?: boolean;
};

type Classification = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  isActive?: boolean;
  isSystem?: boolean;
  units?: MeasurementUnit[];
  _count?: {
    primaryTenants?: number;
    secondaryTenants?: number;
  };
};

type UnitForm = {
  name: string;
  abbreviation: string;
  type: string;
  baseUnit: string;
  conversionFactor: string;
  isBaseUnit: boolean;
  sortOrder: string;
};

const emptyClassificationForm = {
  name: "",
  slug: "",
  description: "",
  icon: "",
  color: "",
};

const emptyUnitForm: UnitForm = {
  name: "",
  abbreviation: "",
  type: "count",
  baseUnit: "",
  conversionFactor: "",
  isBaseUnit: false,
  sortOrder: "0",
};

function generateSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function ClassificationsAdminPage() {
  const [items, setItems] = React.useState<Classification[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [includeInactive, setIncludeInactive] = React.useState(false);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const [classificationForm, setClassificationForm] = React.useState(emptyClassificationForm);
  const [classificationSaving, setClassificationSaving] = React.useState(false);

  const [unitForm, setUnitForm] = React.useState<UnitForm>(emptyUnitForm);
  const [unitSaving, setUnitSaving] = React.useState(false);
  const [editingUnitId, setEditingUnitId] = React.useState<string | null>(null);

  const selected = React.useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId],
  );

  const visibleItems = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) => {
      const haystack = `${item.name} ${item.slug} ${item.description || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [items, search]);

  const fetchClassifications = React.useCallback(async (initial = false) => {
    try {
      if (initial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const data = await apiGet<Classification[]>(
        `/admin/classifications${includeInactive ? "?includeInactive=true" : ""}`,
      );

      setItems(Array.isArray(data) ? data : []);
      setSelectedId((prev) => {
        if (prev && data.some((item) => item.id === prev)) return prev;
        return data[0]?.id ?? null;
      });
    } catch (err: any) {
      const message = err?.message || "Failed to load classifications";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [includeInactive]);

  React.useEffect(() => {
    void fetchClassifications(true);
  }, [fetchClassifications]);

  React.useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  React.useEffect(() => {
    if (!selected) {
      setClassificationForm(emptyClassificationForm);
      setUnitForm(emptyUnitForm);
      setEditingUnitId(null);
      return;
    }

    setClassificationForm({
      name: selected.name || "",
      slug: selected.slug || "",
      description: selected.description || "",
      icon: selected.icon || "",
      color: selected.color || "",
    });

    setUnitForm(emptyUnitForm);
    setEditingUnitId(null);
  }, [selected]);

  const stats = React.useMemo(() => {
    const total = items.length;
    const active = items.filter((i) => i.isActive !== false).length;
    const inactive = total - active;
    const totalUnits = items.reduce((acc, i) => acc + (i.units?.length || 0), 0);
    return { total, active, inactive, totalUnits };
  }, [items]);

  const updateClassificationField = (key: keyof typeof emptyClassificationForm, value: string) => {
    setClassificationForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveClassification = async () => {
    try {
      setClassificationSaving(true);
      setNotice(null);

      if (!classificationForm.name.trim()) {
        setNotice({ type: "error", text: "Classification name is required." });
        return;
      }

      const slug = classificationForm.slug.trim() || generateSlug(classificationForm.name);
      if (!slug) {
        setNotice({ type: "error", text: "Slug is required." });
        return;
      }

      const payload = {
        name: classificationForm.name.trim(),
        slug,
        description: classificationForm.description.trim() || undefined,
        icon: classificationForm.icon.trim() || undefined,
        color: classificationForm.color.trim() || undefined,
      };

      if (!selected) {
        const created = await apiPost<Classification>("/admin/classifications", payload);
        setNotice({ type: "success", text: "Classification created." });
        await fetchClassifications();
        if (created?.id) setSelectedId(created.id);
      } else {
        await apiPut(`/admin/classifications/${selected.id}`, {
          name: payload.name,
          description: payload.description,
          icon: payload.icon,
          color: payload.color,
        });
        setNotice({ type: "success", text: "Classification updated." });
        await fetchClassifications();
      }
    } catch (err: any) {
      setNotice({ type: "error", text: err?.message || "Failed to save classification." });
    } finally {
      setClassificationSaving(false);
    }
  };

  const startCreateClassification = () => {
    setSelectedId(null);
    setClassificationForm(emptyClassificationForm);
    setUnitForm(emptyUnitForm);
    setEditingUnitId(null);
  };

  const toggleClassificationActive = async () => {
    if (!selected) return;
    try {
      setClassificationSaving(true);
      await apiPut(`/admin/classifications/${selected.id}`, {
        isActive: !(selected.isActive !== false),
      });
      setNotice({
        type: "success",
        text: selected.isActive !== false ? "Classification deactivated." : "Classification activated.",
      });
      await fetchClassifications();
    } catch (err: any) {
      setNotice({ type: "error", text: err?.message || "Failed to update classification status." });
    } finally {
      setClassificationSaving(false);
    }
  };

  const deleteClassification = async () => {
    if (!selected) return;
    const ok = window.confirm(`Delete classification '${selected.name}'? This cannot be undone.`);
    if (!ok) return;

    try {
      setClassificationSaving(true);
      await apiDelete(`/admin/classifications/${selected.id}`);
      setNotice({ type: "success", text: "Classification deleted." });
      await fetchClassifications();
      setSelectedId(null);
    } catch (err: any) {
      setNotice({ type: "error", text: err?.message || "Failed to delete classification." });
    } finally {
      setClassificationSaving(false);
    }
  };

  const updateUnitField = (key: keyof UnitForm, value: string | boolean) => {
    setUnitForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveUnit = async () => {
    if (!selected) {
      setNotice({ type: "error", text: "Select a classification first." });
      return;
    }

    try {
      setUnitSaving(true);

      if (!unitForm.name.trim() || !unitForm.abbreviation.trim()) {
        setNotice({ type: "error", text: "Unit name and abbreviation are required." });
        return;
      }

      const payload = {
        name: unitForm.name.trim(),
        abbreviation: unitForm.abbreviation.trim(),
        type: unitForm.type.trim() || "custom",
        baseUnit: unitForm.baseUnit.trim() || undefined,
        conversionFactor: unitForm.conversionFactor ? Number(unitForm.conversionFactor) : undefined,
        isBaseUnit: unitForm.isBaseUnit,
        sortOrder: Number.isNaN(Number(unitForm.sortOrder)) ? 0 : Number(unitForm.sortOrder),
      };

      if (editingUnitId) {
        await apiPut(`/admin/classifications/units/${editingUnitId}`, payload);
        setNotice({ type: "success", text: "Unit updated." });
      } else {
        await apiPost(`/admin/classifications/${selected.id}/units`, payload);
        setNotice({ type: "success", text: "Unit added." });
      }

      setUnitForm(emptyUnitForm);
      setEditingUnitId(null);
      await fetchClassifications();
    } catch (err: any) {
      setNotice({ type: "error", text: err?.message || "Failed to save unit." });
    } finally {
      setUnitSaving(false);
    }
  };

  const editUnit = (unit: MeasurementUnit) => {
    setEditingUnitId(unit.id);
    setUnitForm({
      name: unit.name || "",
      abbreviation: unit.abbreviation || "",
      type: unit.type || "custom",
      baseUnit: unit.baseUnit || "",
      conversionFactor:
        unit.conversionFactor === undefined || unit.conversionFactor === null
          ? ""
          : String(unit.conversionFactor),
      isBaseUnit: Boolean(unit.isBaseUnit),
      sortOrder: String(unit.sortOrder ?? 0),
    });
  };

  const deactivateUnit = async (unit: MeasurementUnit) => {
    const ok = window.confirm(`Deactivate unit '${unit.name}'?`);
    if (!ok) return;

    try {
      setUnitSaving(true);
      await apiDelete(`/admin/classifications/units/${unit.id}`);
      setNotice({ type: "success", text: "Unit deactivated." });
      await fetchClassifications();
    } catch (err: any) {
      setNotice({ type: "error", text: err?.message || "Failed to deactivate unit." });
    } finally {
      setUnitSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-4 md:px-6">
      <div className="mx-auto max-w-350 space-y-3">
        <section className="rounded-lg border border-slate-200 bg-white px-3 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Classifications</h1>
              <p className="text-xs text-slate-600">Manage classification catalog and measurement units.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void fetchClassifications()}
                disabled={refreshing}
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
              <button
                type="button"
                onClick={startCreateClassification}
                className="rounded-md bg-slate-900 px-2 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
              >
                New Classification
              </button>
            </div>
          </div>
        </section>

        {notice && (
          <section
            className={`rounded-md border px-3 py-2 text-xs ${
              notice.type === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-rose-300 bg-rose-50 text-rose-800"
            }`}
          >
            {notice.text}
          </section>
        )}

        {loading ? (
          <section className="rounded-lg border border-slate-200 bg-white px-3 py-6 text-sm text-slate-600">
            Loading classifications...
          </section>
        ) : error ? (
          <section className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-3 text-sm text-rose-800">
            {error}
          </section>
        ) : (
          <>
            <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Total</p>
                <p className="text-lg font-semibold text-slate-900">{stats.total}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Active</p>
                <p className="text-lg font-semibold text-emerald-700">{stats.active}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Inactive</p>
                <p className="text-lg font-semibold text-amber-700">{stats.inactive}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Active Units</p>
                <p className="text-lg font-semibold text-slate-900">{stats.totalUnits}</p>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search classification"
                  className="min-w-55 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-400"
                />
                <label className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeInactive}
                    onChange={(e) => setIncludeInactive(e.target.checked)}
                  />
                  Include inactive
                </label>
              </div>
            </section>

            <section className="grid gap-3 xl:grid-cols-[320px_1fr]">
              <aside className="rounded-lg border border-slate-200 bg-white p-2">
                <div className="max-h-[68vh] overflow-auto">
                  {visibleItems.length === 0 ? (
                    <p className="px-2 py-3 text-xs text-slate-500">No classifications found.</p>
                  ) : (
                    <div className="space-y-1">
                      {visibleItems.map((item) => {
                        const isSelected = selectedId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedId(item.id)}
                            className={`w-full rounded-md border px-2 py-2 text-left text-xs transition ${
                              isSelected
                                ? "border-blue-300 bg-blue-50"
                                : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-slate-900">{item.name}</p>
                                <p className="text-[11px] text-slate-500">{item.slug}</p>
                              </div>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                  item.isActive !== false
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {item.isActive !== false ? "active" : "inactive"}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-600">
                              {item.units?.length || 0} units | {item._count?.primaryTenants || 0} tenants
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </aside>

              <div className="space-y-3">
                <section className="rounded-lg border border-slate-200 bg-white p-3">
                  <h2 className="mb-2 text-sm font-semibold text-slate-900">
                    {selected ? "Edit Classification" : "Create Classification"}
                  </h2>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-xs font-medium text-slate-700">
                      Name *
                      <input
                        value={classificationForm.name}
                        onChange={(e) => {
                          updateClassificationField("name", e.target.value);
                          if (!selected) {
                            updateClassificationField("slug", generateSlug(e.target.value));
                          }
                        }}
                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400"
                      />
                    </label>

                    <label className="text-xs font-medium text-slate-700">
                      Slug {selected ? "(read-only after create)" : "*"}
                      <input
                        value={classificationForm.slug}
                        disabled={Boolean(selected)}
                        onChange={(e) => updateClassificationField("slug", generateSlug(e.target.value))}
                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-100"
                      />
                    </label>

                    <label className="text-xs font-medium text-slate-700">
                      Icon (emoji or token)
                      <input
                        value={classificationForm.icon}
                        onChange={(e) => updateClassificationField("icon", e.target.value)}
                        placeholder="e.g. 🛒"
                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400"
                      />
                    </label>

                    <label className="text-xs font-medium text-slate-700">
                      Color
                      <input
                        value={classificationForm.color}
                        onChange={(e) => updateClassificationField("color", e.target.value)}
                        placeholder="e.g. #2563eb"
                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400"
                      />
                    </label>
                  </div>

                  <label className="mt-2 block text-xs font-medium text-slate-700">
                    Description
                    <textarea
                      value={classificationForm.description}
                      onChange={(e) => updateClassificationField("description", e.target.value)}
                      rows={2}
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400"
                    />
                  </label>

                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={startCreateClassification}
                      disabled={classificationSaving}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                      Clear
                    </button>
                    {selected && (
                      <>
                        <button
                          type="button"
                          onClick={() => void toggleClassificationActive()}
                          disabled={classificationSaving}
                          className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                        >
                          {selected.isActive !== false ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteClassification()}
                          disabled={classificationSaving || selected.isSystem}
                          className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          title={selected.isSystem ? "System classifications cannot be deleted" : "Delete classification"}
                        >
                          Delete
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => void saveClassification()}
                      disabled={classificationSaving}
                      className="rounded-md bg-slate-900 px-2 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      {classificationSaving ? "Saving..." : selected ? "Save Changes" : "Create"}
                    </button>
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-3">
                  <h2 className="mb-2 text-sm font-semibold text-slate-900">
                    {editingUnitId ? "Edit Unit" : "Add Unit"}
                  </h2>

                  {!selected ? (
                    <p className="text-xs text-slate-500">Select or create a classification before managing units.</p>
                  ) : (
                    <>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="text-xs font-medium text-slate-700">
                          Name *
                          <input
                            value={unitForm.name}
                            onChange={(e) => updateUnitField("name", e.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400"
                          />
                        </label>

                        <label className="text-xs font-medium text-slate-700">
                          Abbreviation *
                          <input
                            value={unitForm.abbreviation}
                            onChange={(e) => updateUnitField("abbreviation", e.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400"
                          />
                        </label>

                        <label className="text-xs font-medium text-slate-700">
                          Type
                          <input
                            value={unitForm.type}
                            onChange={(e) => updateUnitField("type", e.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400"
                          />
                        </label>

                        <label className="text-xs font-medium text-slate-700">
                          Sort Order
                          <input
                            type="number"
                            value={unitForm.sortOrder}
                            onChange={(e) => updateUnitField("sortOrder", e.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400"
                          />
                        </label>

                        <label className="text-xs font-medium text-slate-700">
                          Base Unit
                          <input
                            value={unitForm.baseUnit}
                            onChange={(e) => updateUnitField("baseUnit", e.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400"
                          />
                        </label>

                        <label className="text-xs font-medium text-slate-700">
                          Conversion Factor
                          <input
                            type="number"
                            step="0.0001"
                            value={unitForm.conversionFactor}
                            onChange={(e) => updateUnitField("conversionFactor", e.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400"
                          />
                        </label>

                        <label className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={unitForm.isBaseUnit}
                            onChange={(e) => updateUnitField("isBaseUnit", e.target.checked)}
                          />
                          Is base unit
                        </label>
                      </div>

                      <div className="mt-2 flex justify-end gap-2">
                        {editingUnitId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUnitId(null);
                              setUnitForm(emptyUnitForm);
                            }}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Cancel Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void saveUnit()}
                          disabled={unitSaving}
                          className="rounded-md bg-slate-900 px-2 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                          {unitSaving ? "Saving..." : editingUnitId ? "Update Unit" : "Add Unit"}
                        </button>
                      </div>

                      <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
                        <table className="min-w-full text-left">
                          <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
                            <tr>
                              <th className="px-2 py-2 font-semibold">Unit</th>
                              <th className="px-2 py-2 font-semibold">Abbr</th>
                              <th className="px-2 py-2 font-semibold">Type</th>
                              <th className="px-2 py-2 font-semibold">Base</th>
                              <th className="px-2 py-2 font-semibold">Factor</th>
                              <th className="px-2 py-2 font-semibold">Order</th>
                              <th className="px-2 py-2 font-semibold">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                            {(selected.units || []).map((unit) => (
                              <tr key={unit.id}>
                                <td className="px-2 py-2">{unit.name}</td>
                                <td className="px-2 py-2">{unit.abbreviation}</td>
                                <td className="px-2 py-2">{unit.type}</td>
                                <td className="px-2 py-2">{unit.baseUnit || "-"}</td>
                                <td className="px-2 py-2">{unit.conversionFactor ?? "-"}</td>
                                <td className="px-2 py-2">{unit.sortOrder ?? 0}</td>
                                <td className="px-2 py-2">
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => editUnit(unit)}
                                      className="rounded border border-slate-300 bg-white px-1.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void deactivateUnit(unit)}
                                      className="rounded border border-rose-300 bg-rose-50 px-1.5 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100"
                                    >
                                      Deactivate
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </section>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
