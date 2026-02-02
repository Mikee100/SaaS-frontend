"use client";

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiPut } from '@/utils/api';
import { useTenant } from '@/hooks/useTenant';
import {
  FaSave,
  FaEye,
  FaTimes,
  FaCheckCircle,
  FaExclamationCircle,
  FaPalette,
  FaFileAlt,
  FaAlignLeft,
  FaAlignCenter,
  FaAlignRight,
  FaCog,
} from 'react-icons/fa';

type HeaderAlignment = 'left' | 'center' | 'right';

type PdfTemplateState = {
  businessName: boolean;
  businessAddress: boolean;
  businessPhone: boolean;
  businessEmail: boolean;
  branchInfo: boolean;
  logo: boolean;
  primaryColor: string;
  secondaryColor: string;
  fontSize: string;
  headerFontSize: string;
  bodyFontSize: string;
  titleFontSize: string;
  headerAlignment: HeaderAlignment;
  showVat: boolean;
  showSubtotal: boolean;
  footerText: string;
  paperSize: string;
  orientation: string;
  margins: string;
  currency?: string;
};

const DEFAULT_TEMPLATE: PdfTemplateState = {
  businessName: true,
  businessAddress: true,
  businessPhone: true,
  businessEmail: true,
  branchInfo: true,
  logo: true,
  primaryColor: '#1e3a8a',
  secondaryColor: '#e0e7ff',
  fontSize: '12',
  headerFontSize: '18',
  bodyFontSize: '12',
  titleFontSize: '16',
  headerAlignment: 'left',
  showVat: true,
  showSubtotal: true,
  footerText: 'Thank you for your business!',
  paperSize: 'A4',
  orientation: 'portrait',
  margins: 'normal',
  currency: 'KES',
};

function mergeTemplate(saved: Record<string, unknown> | null | undefined): PdfTemplateState {
  if (!saved || typeof saved !== 'object') return { ...DEFAULT_TEMPLATE };
  const align = saved.headerAlignment as HeaderAlignment;
  return {
    ...DEFAULT_TEMPLATE,
    ...saved,
    primaryColor: typeof saved.primaryColor === 'string' ? saved.primaryColor : DEFAULT_TEMPLATE.primaryColor,
    secondaryColor: typeof saved.secondaryColor === 'string' ? saved.secondaryColor : DEFAULT_TEMPLATE.secondaryColor,
    footerText: typeof saved.footerText === 'string' ? saved.footerText : DEFAULT_TEMPLATE.footerText,
    paperSize: typeof saved.paperSize === 'string' ? saved.paperSize : DEFAULT_TEMPLATE.paperSize,
    orientation: typeof saved.orientation === 'string' ? saved.orientation : DEFAULT_TEMPLATE.orientation,
    margins: typeof saved.margins === 'string' ? saved.margins : DEFAULT_TEMPLATE.margins,
    fontSize: typeof saved.fontSize === 'string' ? saved.fontSize : DEFAULT_TEMPLATE.fontSize,
    headerFontSize: typeof saved.headerFontSize === 'string' ? saved.headerFontSize : DEFAULT_TEMPLATE.headerFontSize,
    bodyFontSize: typeof saved.bodyFontSize === 'string' ? saved.bodyFontSize : DEFAULT_TEMPLATE.bodyFontSize,
    titleFontSize: typeof saved.titleFontSize === 'string' ? saved.titleFontSize : DEFAULT_TEMPLATE.titleFontSize,
    headerAlignment: align === 'center' || align === 'right' ? align : 'left',
  };
}

export default function PDFTemplatesPage() {
  const queryClient = useQueryClient();
  const { data: tenantData, isLoading: loading, error: tenantError, refetch } = useTenant();
  const tenant = tenantData as { name?: string; address?: string; contactPhone?: string; contactEmail?: string; pdfTemplate?: Record<string, unknown> } | null | undefined;

  const [pdfTemplate, setPdfTemplate] = useState<PdfTemplateState>(DEFAULT_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const loadTemplate = useCallback(() => {
    const merged = mergeTemplate(tenant?.pdfTemplate);
    setPdfTemplate(merged);
  }, [tenant?.pdfTemplate]);

  useEffect(() => {
    if (!loading && tenant !== undefined) loadTemplate();
  }, [loading, tenant, loadTemplate]);

  const update = (updates: Partial<PdfTemplateState>) => {
    setPdfTemplate((prev) => ({ ...prev, ...updates }));
    setSaveError(null);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await apiPut('/tenant/pdf-template', pdfTemplate);
      await queryClient.invalidateQueries({ queryKey: ['tenant'] });
      setSaveSuccess(true);
      setHasUnsavedChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPdfTemplate({ ...DEFAULT_TEMPLATE });
    setSaveError(null);
    setHasUnsavedChanges(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading template settings…</p>
        </div>
      </div>
    );
  }

  if (tenantError) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-red-50 border border-red-200 rounded-xl text-center">
        <FaExclamationCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-red-800 mb-1">Couldn’t load settings</h2>
        <p className="text-sm text-red-700 mb-4">Template settings couldn’t be loaded. You can try again.</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  const businessName = tenant?.name || 'Your Business Name';
  const businessAddress = tenant?.address || '123 Business Street';
  const businessPhone = tenant?.contactPhone || '(555) 000-0000';
  const businessEmail = tenant?.contactEmail || 'contact@example.com';

  return (
    <div className="max-w-6xl mx-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 -mx-4 px-4 py-3 sm:mx-0 sm:px-0 sm:rounded-t-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Report & PDF design</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              This design is used for reports, sales history, expenses, and other PDF exports.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <FaCheckCircle className="w-4 h-4" /> Saved
              </span>
            )}
            {saveError && (
              <span className="flex items-center gap-1.5 text-sm text-red-600" title={saveError}>
                <FaExclamationCircle className="w-4 h-4" /> Error
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FaEye className="w-4 h-4" /> Preview
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:pointer-events-none"
            >
              <FaSave className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
        {saveError && (
          <p className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Layout */}
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
              <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <FaCog className="w-4 h-4 text-gray-500" /> Layout
              </h2>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="block">
                <span className="block text-xs font-medium text-gray-600 mb-1">Paper</span>
                <select
                  value={pdfTemplate.paperSize}
                  onChange={(e) => update({ paperSize: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                  <option value="Letter">Letter</option>
                  <option value="Legal">Legal</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-gray-600 mb-1">Orientation</span>
                <select
                  value={pdfTemplate.orientation}
                  onChange={(e) => update({ orientation: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-gray-600 mb-1">Margins</span>
                <select
                  value={pdfTemplate.margins}
                  onChange={(e) => update({ margins: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="narrow">Narrow</option>
                  <option value="normal">Normal</option>
                  <option value="wide">Wide</option>
                </select>
              </label>
            </div>
          </section>

          {/* What appears on PDFs */}
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
              <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <FaFileAlt className="w-4 h-4 text-gray-500" /> Content on PDFs
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Toggle what appears in the header of reports and receipts.</p>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'businessName' as const, label: 'Business name' },
                  { key: 'businessAddress' as const, label: 'Address' },
                  { key: 'businessPhone' as const, label: 'Phone' },
                  { key: 'businessEmail' as const, label: 'Email' },
                  { key: 'branchInfo' as const, label: 'Branch info' },
                  { key: 'logo' as const, label: 'Logo' },
                  { key: 'showSubtotal' as const, label: 'Subtotal on invoices' },
                  { key: 'showVat' as const, label: 'VAT on invoices' },
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(pdfTemplate[key])}
                      onChange={(e) => update({ [key]: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-800">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* Header alignment */}
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
              <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <FaAlignLeft className="w-4 h-4 text-gray-500" /> Header alignment
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Position of business name and details on each PDF.</p>
            </div>
            <div className="p-4">
              <div className="flex gap-2">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => update({ headerAlignment: align })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      pdfTemplate.headerAlignment === align
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {align === 'left' && <FaAlignLeft className="w-4 h-4" />}
                    {align === 'center' && <FaAlignCenter className="w-4 h-4" />}
                    {align === 'right' && <FaAlignRight className="w-4 h-4" />}
                    {align.charAt(0).toUpperCase() + align.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Colours & font sizes */}
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
              <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <FaPalette className="w-4 h-4 text-gray-500" /> Colours & font sizes
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Control colours and font size for each part of the PDF.</p>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Primary colour (headers)</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={pdfTemplate.primaryColor}
                      onChange={(e) => update({ primaryColor: e.target.value })}
                      className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={pdfTemplate.primaryColor}
                      onChange={(e) => update({ primaryColor: e.target.value })}
                      className="flex-1 min-w-0 px-2 py-2 text-sm font-mono border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Secondary colour (accents)</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={pdfTemplate.secondaryColor}
                      onChange={(e) => update({ secondaryColor: e.target.value })}
                      className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={pdfTemplate.secondaryColor}
                      onChange={(e) => update({ secondaryColor: e.target.value })}
                      className="flex-1 min-w-0 px-2 py-2 text-sm font-mono border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                <label className="block">
                  <span className="block text-xs font-medium text-gray-600 mb-1">Business name (header)</span>
                  <select
                    value={pdfTemplate.headerFontSize}
                    onChange={(e) => update({ headerFontSize: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {[10, 12, 14, 16, 18, 20, 22, 24].map((n) => (
                      <option key={n} value={String(n)}>{n}pt</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-gray-600 mb-1">Report & section titles</span>
                  <select
                    value={pdfTemplate.titleFontSize}
                    onChange={(e) => update({ titleFontSize: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {[10, 12, 14, 16, 18, 20].map((n) => (
                      <option key={n} value={String(n)}>{n}pt</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-gray-600 mb-1">Body text (address, tables)</span>
                  <select
                    value={pdfTemplate.bodyFontSize}
                    onChange={(e) => update({ bodyFontSize: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {[8, 9, 10, 11, 12, 14, 16].map((n) => (
                      <option key={n} value={String(n)}>{n}pt</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block pt-2 border-t border-gray-100">
                <span className="block text-xs font-medium text-gray-600 mb-1">Default font size (fallback)</span>
                <select
                  value={pdfTemplate.fontSize}
                  onChange={(e) => update({ fontSize: e.target.value })}
                  className="w-full max-w-[140px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {[8, 10, 12, 14, 16, 18].map((n) => (
                    <option key={n} value={String(n)}>{n}pt</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* Footer */}
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
              <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <FaAlignLeft className="w-4 h-4 text-gray-500" /> Footer text
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Shown at the bottom of each PDF page.</p>
            </div>
            <div className="p-4">
              <textarea
                value={pdfTemplate.footerText}
                onChange={(e) => update({ footerText: e.target.value.slice(0, 200) })}
                rows={3}
                maxLength={200}
                placeholder="e.g. Thank you for your business!"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{pdfTemplate.footerText.length}/200</p>
            </div>
          </section>
        </div>

        {/* Live preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Preview</p>
            <div
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
              style={{
                fontFamily: 'system-ui, sans-serif',
                textAlign: pdfTemplate.headerAlignment === 'center' ? 'center' : pdfTemplate.headerAlignment === 'right' ? 'right' : 'left',
              }}
            >
              {pdfTemplate.businessName && (
                <p
                  className="font-semibold truncate"
                  style={{ color: pdfTemplate.primaryColor, fontSize: `${Math.min(parseInt(pdfTemplate.headerFontSize, 10) || 18, 24)}px` }}
                >
                  {businessName}
                </p>
              )}
              {pdfTemplate.businessAddress && (
                <p className="text-gray-600 mt-0.5" style={{ fontSize: `${Math.min(parseInt(pdfTemplate.bodyFontSize, 10) || 12, 16)}px` }}>
                  {businessAddress}
                </p>
              )}
              {pdfTemplate.businessPhone && (
                <p className="text-gray-600" style={{ fontSize: `${Math.min(parseInt(pdfTemplate.bodyFontSize, 10) || 12, 16)}px` }}>{businessPhone}</p>
              )}
              {pdfTemplate.businessEmail && (
                <p className="text-gray-600" style={{ fontSize: `${Math.min(parseInt(pdfTemplate.bodyFontSize, 10) || 12, 16)}px` }}>{businessEmail}</p>
              )}
              <div
                className="mt-3 pt-3 border-t border-gray-200"
                style={{ color: pdfTemplate.primaryColor, fontSize: `${Math.min(parseInt(pdfTemplate.titleFontSize, 10) || 16, 20)}px`, textAlign: 'left' }}
              >
                Report title · Generated date
              </div>
              <div className="mt-2 h-6 rounded" style={{ backgroundColor: pdfTemplate.secondaryColor }} />
              <div className="mt-2 text-gray-500 text-xs" style={{ textAlign: 'left' }}>{pdfTemplate.footerText || 'Footer text…'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Full preview modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
              <div className="bg-white rounded-lg shadow-sm p-6 max-w-md mx-auto">
                {pdfTemplate.businessName && (
                  <h1 className="text-xl font-bold" style={{ color: pdfTemplate.primaryColor }}>
                    {businessName}
                  </h1>
                )}
                {pdfTemplate.businessAddress && <p className="text-gray-600 text-sm mt-1">{businessAddress}</p>}
                {pdfTemplate.businessPhone && <p className="text-gray-600 text-sm">{businessPhone}</p>}
                {pdfTemplate.businessEmail && <p className="text-gray-600 text-sm">{businessEmail}</p>}
                <h2 className="mt-6 text-base font-semibold" style={{ color: pdfTemplate.primaryColor }}>
                  Sample report
                </h2>
                <p className="text-sm text-gray-500 mt-1">Generated: {new Date().toLocaleString()}</p>
                <table className="w-full mt-4 text-sm border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: pdfTemplate.secondaryColor }}>
                      <th className="border border-gray-300 px-3 py-2 text-left font-medium" style={{ color: pdfTemplate.primaryColor }}>Item</th>
                      <th className="border border-gray-300 px-3 py-2 text-right font-medium" style={{ color: pdfTemplate.primaryColor }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="border border-gray-300 px-3 py-2">Sample row</td><td className="border border-gray-300 px-3 py-2 text-right">100</td></tr>
                  </tbody>
                </table>
                {pdfTemplate.footerText && (
                  <p className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500 text-center">
                    {pdfTemplate.footerText}
                  </p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
