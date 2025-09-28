"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPut } from "@/utils/api";
import { FaBuilding, FaLock } from 'react-icons/fa';
import LogoUploader from '@/components/LogoUploader';
import Link from 'next/link';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';

interface FormField {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
}

interface BusinessInfoForm {
  [key: string]: string | number | null;
  name: string;
  businessType: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  businessCategory: string;
  businessSubcategory: string;
  businessDescription: string;
  foundedYear: number | null;
  employeeCount: string;
  annualRevenue: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  kraPin: string;
  vatNumber: string;
  businessLicense: string;
  taxId: string;
  etimsQrUrl: string;
  currency: string;
  timezone: string;
  invoiceFooter: string;
  logoUrl: string;
}

// Basic business information
const basicFields: FormField[] = [
  { name: "name", label: "Business Name", required: true },
  { name: "businessType", label: "Business Type", required: true },
  { name: "contactEmail", label: "Contact Email", required: true },
  { name: "contactPhone", label: "Contact Phone" },
  { name: "website", label: "Website" },
];

// Enhanced business information
const businessDetailsFields = [
  { name: "businessCategory", label: "Business Category" },
  { name: "businessSubcategory", label: "Business Subcategory" },
  { name: "businessDescription", label: "Business Description", type: "textarea" },
  { name: "foundedYear", label: "Founded Year", type: "number" },
  { name: "employeeCount", label: "Number of Employees" },
  { name: "annualRevenue", label: "Annual Revenue" },
];

// Location information
const locationFields = [
  { name: "address", label: "Address" },
  { name: "city", label: "City" },
  { name: "state", label: "State/Province" },
  { name: "country", label: "Country" },
  { name: "postalCode", label: "Postal Code" },
];

// Legal and compliance
const legalFields = [
  { name: "kraPin", label: "KRA PIN" },
  { name: "vatNumber", label: "VAT Number" },
  { name: "businessLicense", label: "Business License" },
  { name: "taxId", label: "Tax ID" },
  { name: "etimsQrUrl", label: "KRA eTIMS QR Code URL" },
];

// Financial settings
const financialFields = [
  { name: "currency", label: "Currency" },
  { name: "timezone", label: "Timezone" },
  { name: "invoiceFooter", label: "Invoice Footer", type: "textarea" },
  { name: "logoUrl", label: "Logo URL" },
];

const fieldHelp: Record<string, string> = {
  kraPin: 'Your KRA PIN (e.g., P051234567A)',
  vatNumber: 'Your VAT registration number (if applicable)',
  etimsQrUrl: 'URL to your KRA eTIMS QR code image (optional)',
  businessLicense: 'Your business license number',
  taxId: 'Your tax identification number',
  currency: 'Default currency for transactions (e.g., KES, USD)',
  timezone: 'Your business timezone (e.g., Africa/Nairobi)',
  foundedYear: 'Year your business was established',
  employeeCount: 'Number of employees (e.g., 1-10, 11-50, 50+)',
  annualRevenue: 'Annual revenue range (e.g., <1M, 1M-10M, >10M)',
};

function validateKraPin(pin: string) {
  return /^([A|P]\d{9}[A-Z])?$/.test(pin);
}

function validateVatNumber(vat: string) {
  return vat === '' || /^[A|P]\d{9}[A-Z]$/.test(vat);
}

export default function BusinessInfoSettings() {
  const { user } = useUser();
  const [form, setForm] = useState<Partial<BusinessInfoForm>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validation, setValidation] = useState<{ kraPin?: boolean; vatNumber?: boolean; email?: boolean; phone?: boolean; website?: boolean }>({});

  useEffect(() => {
    apiGet<Partial<BusinessInfoForm>>("/tenant/me")
      .then((data) => {
        setForm(data || {});
        setLoading(false);
      })
      .catch((err: unknown) => {
        const error = err as { message?: string };
        setError(error.message || "Failed to load business info");
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Convert number fields to integers
    if (e.target.type === 'number') {
      const numValue = value === '' ? null : parseInt(value, 10);
      setForm({ ...form, [name]: numValue });
    } else {
      setForm({ ...form, [name]: value });
    }

    // Real-time validation
    if (name === 'kraPin') {
      setValidation((v) => ({ ...v, kraPin: validateKraPin(value) }));
    }
    if (name === 'vatNumber') {
      setValidation((v) => ({ ...v, vatNumber: validateVatNumber(value) }));
    }
    if (name === 'contactEmail') {
      setValidation((v) => ({ ...v, email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value === '' }));
    }
    if (name === 'contactPhone') {
      setValidation((v) => ({ ...v, phone: /^\+?[\d\s-()]{10,}$/.test(value) || value === '' }));
    }
    if (name === 'website') {
      setValidation((v) => ({ ...v, website: /^https?:\/\/.+/.test(value) || value === '' }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    if (form.kraPin && !validateKraPin(form.kraPin)) {
      setError('Invalid KRA PIN format.');
      setSaving(false);
      return;
    }
    if (form.vatNumber && !validateVatNumber(form.vatNumber)) {
      setError('Invalid VAT Number format.');
      setSaving(false);
      return;
    }
    try {
      await apiPut("/tenant/me", form);
      setSuccess(true);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "Failed to save business info");
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: FormField) => {
    const isRequired = field.required;
    const hasError = (field.name === 'kraPin' && form.kraPin && validation.kraPin === false) ||
                    (field.name === 'vatNumber' && form.vatNumber && validation.vatNumber === false) ||
                    (field.name === 'contactEmail' && form.contactEmail && validation.email === false) ||
                    (field.name === 'contactPhone' && form.contactPhone && validation.phone === false) ||
                    (field.name === 'website' && form.website && validation.website === false);
    
    // Get the value for the field, handling null/undefined for number fields
    const getFieldValue = (fieldName: string, fieldType?: string) => {
      const value = form[fieldName];
      if (fieldType === 'number') {
        return value !== null && value !== undefined ? value.toString() : '';
      }
      return value || '';
    };
    
    return (
      <div key={field.name} className="flex flex-col gap-2">
        <label htmlFor={field.name} className="font-medium text-gray-700">
          {field.label}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
        {fieldHelp[field.name] && (
          <span className="text-sm text-gray-500">{fieldHelp[field.name]}</span>
        )}
        {field.type === "textarea" ? (
          <textarea
            id={field.name}
            name={field.name}
            value={getFieldValue(field.name)}
            onChange={handleChange}
            rows={3}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${
              hasError ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        ) : field.type === "number" ? (
          <input
            id={field.name}
            name={field.name}
            type="number"
            value={getFieldValue(field.name, 'number')}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${
              hasError ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        ) : (
          <input
            id={field.name}
            name={field.name}
            type="text"
            value={getFieldValue(field.name)}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${
              hasError ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        )}
        {field.name === 'kraPin' && form.kraPin && validation.kraPin === false && (
          <span className="text-red-500 text-sm">Invalid KRA PIN format (e.g., P051234567A)</span>
        )}
        {field.name === 'vatNumber' && form.vatNumber && validation.vatNumber === false && (
          <span className="text-red-500 text-sm">Invalid VAT Number format (e.g., P051234567A)</span>
        )}
        {field.name === 'contactEmail' && form.contactEmail && validation.email === false && (
          <span className="text-red-500 text-sm">Invalid email format</span>
        )}
        {field.name === 'contactPhone' && form.contactPhone && validation.phone === false && (
          <span className="text-red-500 text-sm">Invalid phone format (e.g., +254712345678)</span>
        )}
        {field.name === 'website' && form.website && validation.website === false && (
          <span className="text-red-500 text-sm">Invalid URL format (must start with http:// or https://)</span>
        )}
      </div>
    );
  };

  // Permission checks
  const canEditSettings = hasPermission(user, 'edit_settings');

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user has permission to edit business info
  if (!canEditSettings) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <FaLock className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to edit business info.</p>
          <p className="text-sm text-gray-500">Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 min-h-[80vh]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FaBuilding className="text-blue-600 text-2xl" />
          <h2 className="text-2xl font-bold text-gray-800">Business Info</h2>
        </div>
        <Link href="/settings" className="text-blue-600 hover:underline text-sm">← All Settings</Link>
      </div>
      {success && <div className="mb-4 px-4 py-2 rounded bg-green-50 text-green-700 border border-green-200">Business info saved!</div>}
      {error && <div className="mb-4 px-4 py-2 rounded bg-red-50 text-red-700 border border-red-200">{error}</div>}
      <form onSubmit={handleSave} className="space-y-8">
        {/* Basic Business Information */}
        <div className="bg-white rounded-xl shadow p-10 w-full">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Basic Business Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {basicFields.map(renderField)}
          </div>
        </div>

        {/* Business Details */}
        <div className="bg-white rounded-xl shadow p-10 w-full">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Business Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {businessDetailsFields.map(renderField)}
          </div>
        </div>

        {/* Location Information */}
        <div className="bg-white rounded-xl shadow p-10 w-full">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Location Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {locationFields.map(renderField)}
          </div>
        </div>

        {/* Legal and Compliance */}
        <div className="bg-white rounded-xl shadow p-10 w-full">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Legal and Compliance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {legalFields.filter(field =>
              form.country?.toLowerCase() === 'kenya' || !['kraPin', 'vatNumber', 'etimsQrUrl'].includes(field.name)
            ).map(renderField)}
          </div>
          {form.country?.toLowerCase() !== 'kenya' && (
            <p className="text-sm text-gray-500 mt-4">
              KRA-specific fields (PIN, VAT, eTIMS) are only shown for Kenyan businesses.
            </p>
          )}
        </div>

        {/* Financial Settings */}
        <div className="bg-white rounded-xl shadow p-10 w-full">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Financial Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {financialFields.filter(f => f.name !== 'logoUrl').map(renderField)}
          </div>
          <div className="mt-8">
            <label className="block text-sm font-medium text-gray-700 mb-4">Business Logo</label>
            <LogoUploader
              onUpload={(url) => setForm({ ...form, logoUrl: url })}
              initialLogo={form.logoUrl}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-8 py-2 rounded-lg border border-blue-200 bg-blue-600 text-white font-semibold text-base shadow hover:bg-blue-700 transition disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Business Info"}
          </button>
        </div>
      </form>
    </div>
  );
} 