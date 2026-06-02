"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/utils/api";

interface Classification {
  id: string;
  name: string;
  icon?: string;
  _count?: { primaryTenants?: number };
}

const countries = ["Kenya", "Uganda", "Tanzania", "Rwanda", "United States"];
const currencies = ["KES", "USD", "UGX", "TZS", "EUR", "GBP"];

export default function CreateTenantPage() {
  const [loadingClassifications, setLoadingClassifications] = useState(false);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [classificationsError, setClassificationsError] = useState<string | null>(null);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    businessName: "",
    contactEmail: "",
    contactPhone: "",
    country: "",
    classificationId: "",
    unitSystem: "metric",
    currency: "KES",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
  });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoadingClassifications(true);
        setClassificationsError(null);
        const data = (await apiGet("/admin/classifications")) as Classification[];
        if (!cancelled) setClassifications(Array.isArray(data) ? data : []);
      } catch (error: any) {
        if (!cancelled) {
          setClassificationsError(error?.message || "Failed to load classifications.");
        }
      } finally {
        if (!cancelled) setLoadingClassifications(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedClassification = useMemo(
    () => classifications.find((c) => c.id === form.classificationId),
    [classifications, form.classificationId],
  );

  const isValid = useMemo(() => {
    return Boolean(
      form.businessName &&
        form.contactEmail &&
        form.country &&
        form.classificationId &&
        form.ownerName &&
        form.ownerEmail &&
        form.ownerPassword,
    );
  }, [form]);

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm({
      businessName: "",
      contactEmail: "",
      contactPhone: "",
      country: "",
      classificationId: "",
      unitSystem: "metric",
      currency: "KES",
      ownerName: "",
      ownerEmail: "",
      ownerPassword: "",
    });
  };

  const handleCreate = async () => {
    if (!isValid) {
      setSubmitError("Fill all required fields before creating the workspace.");
      return;
    }

    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const payload = {
        name: form.businessName,
        businessType: selectedClassification?.name || "",
        branchName: `${form.businessName} Main Branch`,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        country: form.country,
        owner: {
          name: form.ownerName,
          email: form.ownerEmail,
          password: form.ownerPassword,
        },
        recaptchaToken: "dummy-token",
      };

      await apiPost("/tenant", payload);
      setSubmitSuccess("Workspace created successfully.");
      resetForm();
    } catch (error: any) {
      setSubmitError(error?.message || "Failed to create workspace.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-4 md:px-6">
      <div className="mx-auto max-w-6xl space-y-3">
        <section className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <h1 className="text-lg font-semibold text-slate-900">Create Workspace User</h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Compact setup form for business details, classification, and owner account.
          </p>
        </section>

        {submitError && (
          <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {submitError}
          </div>
        )}

        {submitSuccess && (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            {submitSuccess}
          </div>
        )}

        <section className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3 lg:col-span-2">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Business Details</h2>
            <div className="grid gap-2 md:grid-cols-2">
              <label className="text-xs font-medium text-slate-700">
                Business Name *
                <input
                  value={form.businessName}
                  onChange={(e) => updateForm("businessName", e.target.value)}
                  placeholder="Adeera Technologies"
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </label>

              <label className="text-xs font-medium text-slate-700">
                Contact Email *
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => updateForm("contactEmail", e.target.value)}
                  placeholder="admin@business.com"
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </label>

              <label className="text-xs font-medium text-slate-700">
                Contact Phone
                <input
                  value={form.contactPhone}
                  onChange={(e) => updateForm("contactPhone", e.target.value)}
                  placeholder="+254 700 000000"
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </label>

              <label className="text-xs font-medium text-slate-700">
                Country *
                <select
                  value={form.country}
                  onChange={(e) => updateForm("country", e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                >
                  <option value="">Select country</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Measurement Setup</h2>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                Unit System
                <select
                  value={form.unitSystem}
                  onChange={(e) => updateForm("unitSystem", e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                >
                  <option value="metric">Metric</option>
                  <option value="imperial">Imperial</option>
                </select>
              </label>

              <label className="block text-xs font-medium text-slate-700">
                Currency
                <select
                  value={form.currency}
                  onChange={(e) => updateForm("currency", e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                >
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3 lg:col-span-2">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Classification</h2>
            {loadingClassifications ? (
              <p className="text-xs text-slate-600">Loading classifications...</p>
            ) : classificationsError ? (
              <p className="text-xs text-rose-700">{classificationsError}</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {classifications.map((item) => {
                  const selected = form.classificationId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateForm("classificationId", item.id)}
                      className={`rounded-md border px-2 py-2 text-left text-xs transition ${
                        selected
                          ? "border-blue-600 bg-blue-50 text-blue-900"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <p className="font-semibold">{item.name}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {item._count?.primaryTenants || 0} tenants
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Owner Account</h2>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                Full Name *
                <input
                  value={form.ownerName}
                  onChange={(e) => updateForm("ownerName", e.target.value)}
                  placeholder="Jane Doe"
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </label>

              <label className="block text-xs font-medium text-slate-700">
                Email *
                <input
                  type="email"
                  value={form.ownerEmail}
                  onChange={(e) => updateForm("ownerEmail", e.target.value)}
                  placeholder="owner@business.com"
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </label>

              <label className="block text-xs font-medium text-slate-700">
                Password *
                <input
                  type="password"
                  value={form.ownerPassword}
                  onChange={(e) => updateForm("ownerPassword", e.target.value)}
                  placeholder="Set password"
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-3">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Review</h2>
          <div className="grid gap-2 text-xs text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
            <p><span className="font-semibold">Business:</span> {form.businessName || "-"}</p>
            <p><span className="font-semibold">Country:</span> {form.country || "-"}</p>
            <p><span className="font-semibold">Classification:</span> {selectedClassification?.name || "-"}</p>
            <p><span className="font-semibold">Owner:</span> {form.ownerName || "-"}</p>
          </div>

          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              disabled={submitLoading}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={!isValid || submitLoading}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitLoading ? "Creating..." : "Create Workspace"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
