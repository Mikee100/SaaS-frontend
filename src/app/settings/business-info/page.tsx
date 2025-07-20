"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPut } from "@/utils/api";
import Spinner from '../../../components/Spinner';

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

  const handleSubmit = async (e: React.FormEvent) => {
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

  if (loading) return <Spinner size={40} className="my-12" />;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <h2 style={{ fontWeight: 700, fontSize: 28, marginBottom: 24 }}>Business Info</h2>
      <form onSubmit={handleSubmit} style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 2px 12px 0 rgba(0,0,0,0.06)',
        padding: 32,
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}>
        {fields.map((f) => (
          <div key={f.name} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor={f.name} style={{ fontWeight: 500, marginBottom: 2 }}>{f.label}</label>
            {fieldHelp[f.name] && (
              <span style={{ color: '#888', fontSize: 13, marginBottom: 2 }}>{fieldHelp[f.name]}</span>
            )}
            {f.name === "invoiceFooter" ? (
              <textarea
                id={f.name}
                name={f.name}
                value={form[f.name] || ""}
                onChange={handleChange}
                rows={3}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 16,
                  outline: 'none',
                  transition: 'border 0.2s',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            ) : (
              <input
                id={f.name}
                name={f.name}
                type="text"
                value={form[f.name] || ""}
                onChange={handleChange}
                style={{
                  border: f.name === 'kraPin' && form.kraPin && validation.kraPin === false ? '1.5px solid #dc2626' :
                         f.name === 'vatNumber' && form.vatNumber && validation.vatNumber === false ? '1.5px solid #dc2626' :
                         '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 16,
                  outline: 'none',
                  transition: 'border 0.2s',
                  fontFamily: 'inherit',
                }}
              />
            )}
            {f.name === 'kraPin' && form.kraPin && validation.kraPin === false && (
              <span style={{ color: '#dc2626', fontSize: 13 }}>Invalid KRA PIN format (e.g., P051234567A)</span>
            )}
            {f.name === 'vatNumber' && form.vatNumber && validation.vatNumber === false && (
              <span style={{ color: '#dc2626', fontSize: 13 }}>Invalid VAT Number format (e.g., P051234567A)</span>
            )}
          </div>
        ))}
        <button type="submit" disabled={saving} style={{
          marginTop: 16,
          background: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '12px 0',
          fontWeight: 600,
          fontSize: 17,
          cursor: saving ? 'not-allowed' : 'pointer',
          boxShadow: '0 1px 4px 0 rgba(37,99,235,0.08)',
          transition: 'background 0.15s',
        }}>
          {saving ? "Saving..." : "Save"}
        </button>
        {success && <div style={{ color: "#059669", background: '#ecfdf5', borderRadius: 6, padding: '8px 12px', marginTop: 8 }}>Saved!</div>}
        {error && <div style={{ color: "#dc2626", background: '#fef2f2', borderRadius: 6, padding: '8px 12px', marginTop: 8 }}>{error}</div>}
      </form>
    </div>
  );
} 