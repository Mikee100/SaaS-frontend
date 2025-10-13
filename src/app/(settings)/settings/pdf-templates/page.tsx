"use client";
import { FaCog, FaDownload, FaEnvelope, FaEye, FaTimes } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '@/utils/api';

interface Tenant {
  name?: string; 
  pdfTemplate?: {
    businessName: boolean;
    businessAddress: boolean;
    businessPhone: boolean;
    businessEmail: boolean;
    branchInfo: boolean;
    logo: boolean;
    primaryColor: string;
    secondaryColor: string;
    fontSize: string;
    showVat: boolean;
    showSubtotal: boolean;
    footerText: string;
    paperSize: string;
    orientation: string;
    margins: string;
  };
}

export default function PDFTemplatesPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [pdfTemplate, setPdfTemplate] = useState({
    businessName: true,
    businessAddress: true,
    businessPhone: true,
    businessEmail: true,
    branchInfo: true,
    logo: true,
    primaryColor: '#000000',
    secondaryColor: '#666666',
    fontSize: '12',
    showVat: true,
    showSubtotal: true,
    footerText: 'Thank you for your business!',
    paperSize: 'A4',
    orientation: 'portrait',
    margins: 'normal',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const tenantData = await apiGet<Tenant>('/tenant/me');
        setTenant(tenantData);
        if (tenantData.pdfTemplate) setPdfTemplate(tenantData.pdfTemplate);
      } catch {
        setError('Failed to load PDF template settings.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiPut('/tenant/pdf-template', pdfTemplate);
      // Refresh tenant data
      const tenantData = await apiGet<Tenant>('/tenant/me');
      setTenant(tenantData);
    } catch {
      setError('Failed to save PDF template settings.');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  if (loading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">PDF Template Designer</h1>
        <p className="text-gray-600">Customize your PDF templates for invoices, receipts, and reports</p>
      </div>

      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaDownload className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-800">Template Configuration</h2>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePreview}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <FaEye className="w-4 h-4" />
                Preview Template
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:bg-blue-300"
              >
                <FaDownload className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
          <p className="text-gray-600 mt-2">Configure your PDF templates with custom layouts, styling, and content</p>
        </div>

        {/* Layout Settings Card */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <FaCog className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Layout Settings</h3>
              <p className="text-sm text-gray-600">Configure paper size, orientation, and margins</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Paper Size</label>
              <select
                value={pdfTemplate.paperSize}
                onChange={(e) => setPdfTemplate(prev => ({ ...prev, paperSize: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="A5">A5 (148 × 210 mm)</option>
                <option value="Letter">Letter (8.5 × 11 in)</option>
                <option value="Legal">Legal (8.5 × 14 in)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Orientation</label>
              <select
                value={pdfTemplate.orientation}
                onChange={(e) => setPdfTemplate(prev => ({ ...prev, orientation: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Margins</label>
              <select
                value={pdfTemplate.margins}
                onChange={(e) => setPdfTemplate(prev => ({ ...prev, margins: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="normal">Normal (1 inch)</option>
                <option value="narrow">Narrow (0.5 inch)</option>
                <option value="wide">Wide (1.5 inch)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Visibility Card */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <FaDownload className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Content Visibility</h3>
              <p className="text-sm text-gray-600">Choose which information to display on your PDFs</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'businessName', label: 'Business Name', desc: 'Display company name' },
              { key: 'businessAddress', label: 'Business Address', desc: 'Show business location' },
              { key: 'businessPhone', label: 'Business Phone', desc: 'Include contact number' },
              { key: 'businessEmail', label: 'Business Email', desc: 'Show email address' },
              { key: 'branchInfo', label: 'Branch Information', desc: 'Display branch details' },
              { key: 'logo', label: 'Company Logo', desc: 'Include business logo' },
              { key: 'showVat', label: 'VAT Amount', desc: 'Show tax calculations' },
              { key: 'showSubtotal', label: 'Subtotal', desc: 'Display line totals' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  id={key}
                  checked={pdfTemplate[key as keyof typeof pdfTemplate] as boolean}
                  onChange={(e) => setPdfTemplate(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <label htmlFor={key} className="cursor-pointer">
                    <div className="font-medium text-gray-800">{label}</div>
                    <div className="text-sm text-gray-600">{desc}</div>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Styling Card */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <FaCog className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Visual Styling</h3>
              <p className="text-sm text-gray-600">Customize colors, fonts, and appearance</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Primary Color</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={pdfTemplate.primaryColor}
                  onChange={(e) => setPdfTemplate(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={pdfTemplate.primaryColor}
                  onChange={(e) => setPdfTemplate(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="#000000"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Secondary Color</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={pdfTemplate.secondaryColor}
                  onChange={(e) => setPdfTemplate(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={pdfTemplate.secondaryColor}
                  onChange={(e) => setPdfTemplate(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="#666666"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Font Size</label>
              <select
                value={pdfTemplate.fontSize}
                onChange={(e) => setPdfTemplate(prev => ({ ...prev, fontSize: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="8">8pt - Extra Small</option>
                <option value="10">10pt - Small</option>
                <option value="12">12pt - Normal</option>
                <option value="14">14pt - Large</option>
                <option value="16">16pt - Extra Large</option>
                <option value="18">18pt - Huge</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer Settings Card */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <FaEnvelope className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Footer Settings</h3>
              <p className="text-sm text-gray-600">Add custom footer text to your PDFs</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Footer Text</label>
              <textarea
                value={pdfTemplate.footerText}
                onChange={(e) => setPdfTemplate(prev => ({ ...prev, footerText: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Enter footer text that will appear at the bottom of your PDFs..."
              />
            </div>
            <div className="text-sm text-gray-500">
              {pdfTemplate.footerText.length}/200 characters
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Template Actions</h3>
              <p className="text-sm text-gray-600">Save your changes or reset to defaults</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Reset to defaults
                  setPdfTemplate({
                    businessName: true,
                    businessAddress: true,
                    businessPhone: true,
                    businessEmail: true,
                    branchInfo: true,
                    logo: true,
                    primaryColor: '#000000',
                    secondaryColor: '#666666',
                    fontSize: '12',
                    showVat: true,
                    showSubtotal: true,
                    footerText: 'Thank you for your business!',
                    paperSize: 'A4',
                    orientation: 'portrait',
                    margins: 'normal',
                  });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Reset to Defaults
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-blue-300"
              >
                {saving ? 'Saving...' : 'Save All Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-800">PDF Template Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Mock PDF Preview */}
              <div className="bg-gray-50 border rounded-lg p-8 mx-auto max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                  {pdfTemplate.logo && (
                    <div className="w-16 h-16 bg-gray-300 rounded-lg mx-auto mb-4 flex items-center justify-center">
                      <span className="text-gray-600 text-sm">LOGO</span>
                    </div>
                  )}
                  {pdfTemplate.businessName && (
                    <h1 className="text-2xl font-bold text-gray-800 mb-2" style={{ color: pdfTemplate.primaryColor }}>
                      {tenant?.name || 'Business Name'}
                    </h1>
                  )}
                  {pdfTemplate.businessAddress && (
                    <p className="text-gray-600">123 Business Street, City, State 12345</p>
                  )}
                  {pdfTemplate.businessPhone && (
                    <p className="text-gray-600">(555) 123-4567</p>
                  )}
                  {pdfTemplate.businessEmail && (
                    <p className="text-gray-600">contact@business.com</p>
                  )}
                </div>

                {/* Invoice Details */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4" style={{ color: pdfTemplate.primaryColor }}>Invoice #001</h2>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Bill To:</p>
                      <p className="text-gray-600">Customer Name<br />Customer Address<br />City, State 12345</p>
                    </div>
                    <div className="text-right">
                      <p><span className="font-medium">Date:</span> {new Date().toLocaleDateString()}</p>
                      <p><span className="font-medium">Due Date:</span> {new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-8">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr style={{ backgroundColor: pdfTemplate.secondaryColor + '20' }}>
                        <th className="border border-gray-300 px-4 py-2 text-left font-medium" style={{ color: pdfTemplate.primaryColor }}>Description</th>
                        <th className="border border-gray-300 px-4 py-2 text-right font-medium" style={{ color: pdfTemplate.primaryColor }}>Qty</th>
                        <th className="border border-gray-300 px-4 py-2 text-right font-medium" style={{ color: pdfTemplate.primaryColor }}>Rate</th>
                        <th className="border border-gray-300 px-4 py-2 text-right font-medium" style={{ color: pdfTemplate.primaryColor }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2">Sample Product</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">1</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">$100.00</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">$100.00</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2">Another Product</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">2</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">$50.00</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">$100.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-8">
                  <div className="w-48">
                    {pdfTemplate.showSubtotal && (
                      <div className="flex justify-between py-1">
                        <span className="font-medium">Subtotal:</span>
                        <span>$200.00</span>
                      </div>
                    )}
                    {pdfTemplate.showVat && (
                      <div className="flex justify-between py-1">
                        <span className="font-medium">VAT (10%):</span>
                        <span>$20.00</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-t border-gray-300 font-bold text-lg">
                      <span>Total:</span>
                      <span>$220.00</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                {pdfTemplate.footerText && (
                  <div className="text-center text-gray-600 border-t border-gray-300 pt-4">
                    <p>{pdfTemplate.footerText}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  // Mock download functionality
                  alert('PDF download would be initiated here');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FaDownload className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
