"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPut } from "@/utils/api";
import Spinner from '../../../components/Spinner';
import { FaBuilding } from 'react-icons/fa';
import Link from 'next/link';

const fields = [
  { name: "name", label: "Business Name" },
  { name: "businessType", label: "Business Type" },
  { name: "contactEmail", label: "Contact Email" },
  { name: "contactPhone", label: "Contact Phone" },
  { name: "address", label: "Address" },
  { name: "currency", label: "Currency" },
  { name: "timezone", label: "Timezone" },
  { name: "invoiceFooter", label: "Invoice Footer" },
  { name: "logoUrl", label: "Logo URL" },
  { name: "kraPin", label: "KRA PIN" },
  { name: "vatNumber", label: "VAT Number" },
  { name: "etimsQrUrl", label: "KRA eTIMS QR Code URL" },
];

const fieldHelp: Record<string, string> = {
  kraPin: 'Your KRA PIN (e.g., P051234567A)',
  vatNumber: 'Your VAT registration number (if applicable)',
  etimsQrUrl: 'URL to your KRA eTIMS QR code image (optional)',
};

function validateKraPin(pin: string) {
  return /^([A|P]\d{9}[A-Z])?$/.test(pin);
}

function validateVatNumber(vat: string) {
  return vat === '' || /^[A|P]\d{9}[A-Z]$/.test(vat);
}

export default function BusinessInfoSettings() {
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validation, setValidation] = useState<{ kraPin?: boolean; vatNumber?: boolean }>({});

  useEffect(() => {
    apiGet<any>("/tenant/me")
      .then((data) => {
        setForm(data || {});
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (name === 'kraPin') {
      setValidation((v) => ({ ...v, kraPin: validateKraPin(value) }));
    }
    if (name === 'vatNumber') {
      setValidation((v) => ({ ...v, vatNumber: validateVatNumber(value) }));
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[300px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

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
        <div className="bg-white rounded-xl shadow p-10 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {fields.map((f) => (
              <div key={f.name} className="flex flex-col gap-2">
                <label htmlFor={f.name} className="font-medium text-gray-700">{f.label}</label>
                {fieldHelp[f.name] && (
                  <span className="text-sm text-gray-500">{fieldHelp[f.name]}</span>
                )}
                {f.name === "invoiceFooter" ? (
                  <textarea
                    id={f.name}
                    name={f.name}
                    value={form[f.name] || ""}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <input
                    id={f.name}
                    name={f.name}
                    type="text"
                    value={form[f.name] || ""}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${
                      f.name === 'kraPin' && form.kraPin && validation.kraPin === false ? 'border-red-500' :
                      f.name === 'vatNumber' && form.vatNumber && validation.vatNumber === false ? 'border-red-500' :
                      'border-gray-300'
                    }`}
                  />
                )}
                {f.name === 'kraPin' && form.kraPin && validation.kraPin === false && (
                  <span className="text-red-500 text-sm">Invalid KRA PIN format (e.g., P051234567A)</span>
                )}
                {f.name === 'vatNumber' && form.vatNumber && validation.vatNumber === false && (
                  <span className="text-red-500 text-sm">Invalid VAT Number format (e.g., P051234567A)</span>
                )}
              </div>
            ))}
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