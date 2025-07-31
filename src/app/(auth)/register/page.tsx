"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/utils/api";

// Business categories and subcategories
const BUSINESS_CATEGORIES = {
  "Retail": ["Electronics", "Clothing & Fashion", "Home & Garden", "Sports & Outdoors", "Books & Media", "Jewelry & Accessories", "Health & Beauty", "Toys & Games", "Automotive", "Other"],
  "Food & Beverage": ["Restaurant", "Cafe", "Fast Food", "Bakery", "Bar & Pub", "Catering", "Food Delivery", "Grocery Store", "Other"],
  "Services": ["Professional Services", "Personal Care", "Education & Training", "Healthcare", "Financial Services", "Real Estate", "Transportation", "Entertainment", "Other"],
  "Manufacturing": ["Textiles", "Electronics", "Food & Beverage", "Chemicals", "Machinery", "Automotive", "Construction Materials", "Other"],
  "Technology": ["Software Development", "IT Services", "Digital Marketing", "E-commerce", "Cybersecurity", "Cloud Services", "Other"],
  "Healthcare": ["Hospital", "Clinic", "Pharmacy", "Dental", "Mental Health", "Alternative Medicine", "Medical Equipment", "Other"],
  "Education": ["School", "University", "Training Center", "Online Education", "Tutoring", "Language School", "Other"],
  "Other": ["Consulting", "Non-profit", "Government", "Other"]
};

const EMPLOYEE_COUNTS = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
const ANNUAL_REVENUES = ["< 1M KES", "1M-10M KES", "10M-50M KES", "50M-100M KES", "100M-500M KES", "500M+ KES"];
const COUNTRIES = ["Kenya", "Uganda", "Tanzania", "Rwanda", "Ethiopia", "Nigeria", "Ghana", "South Africa", "Other"];

export default function RegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("token")) {
      router.replace("/");
    }
  }, [router]);

  // Form state
  const [formData, setFormData] = useState({
    // Business Info
    businessName: "",
    businessCategory: "",
    businessSubcategory: "",
    businessType: "",
    businessDescription: "",
    
    // Contact Info
    contactEmail: "",
    contactPhone: "",
    website: "",
    
    // Location
    address: "",
    city: "",
    state: "",
    country: "Kenya",
    postalCode: "",
    
    // Business Details
    foundedYear: "",
    employeeCount: "",
    annualRevenue: "",
    
    // Products/Services
    primaryProducts: [] as string[],
    secondaryProducts: [] as string[],
    
    // Legal
    kraPin: "",
    vatNumber: "",
    businessLicense: "",
    
    // Owner Info
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
    ownerRole: "owner"
  });

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProductToggle = (product: string, isPrimary: boolean) => {
    if (isPrimary) {
      const updated = formData.primaryProducts.includes(product)
        ? formData.primaryProducts.filter(p => p !== product)
        : [...formData.primaryProducts, product];
      updateFormData('primaryProducts', updated);
    } else {
      const updated = formData.secondaryProducts.includes(product)
        ? formData.secondaryProducts.filter(p => p !== product)
        : [...formData.secondaryProducts, product];
      updateFormData('secondaryProducts', updated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      // Send all required fields in one request
      const res = await apiPost<{ tenant: any }>("/tenant", {
        name: formData.businessName,
        businessType: formData.businessType,
        businessCategory: formData.businessCategory,
        businessSubcategory: formData.businessSubcategory,
        businessDescription: formData.businessDescription,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        website: formData.website,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        postalCode: formData.postalCode,
        foundedYear: formData.foundedYear ? parseInt(formData.foundedYear) : undefined,
        employeeCount: formData.employeeCount,
        annualRevenue: formData.annualRevenue,
        primaryProducts: formData.primaryProducts,
        secondaryProducts: formData.secondaryProducts,
        kraPin: formData.kraPin,
        vatNumber: formData.vatNumber,
        businessLicense: formData.businessLicense,
        ownerName: formData.ownerName,
        ownerEmail: formData.ownerEmail,
        ownerPassword: formData.ownerPassword,
      });
      
      // Auto-login
      const loginRes = await apiPost<{ access_token: string; user: any }>("/auth/login", { 
        email: formData.ownerEmail, 
        password: formData.ownerPassword 
      });
      localStorage.setItem("token", loginRes.access_token);
      localStorage.setItem("user", JSON.stringify(loginRes.user));
      
      if (loginRes.user.isSuperadmin) {
        router.push("/superadmin");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 5));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">Business Information</h2>
        <p className="text-gray-600 mt-2">Tell us about your business</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Business Name *</label>
          <input
            type="text"
            value={formData.businessName}
            onChange={e => updateFormData('businessName', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your business name"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Business Category *</label>
            <select
              value={formData.businessCategory}
              onChange={e => {
                updateFormData('businessCategory', e.target.value);
                updateFormData('businessSubcategory', '');
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select category</option>
              {Object.keys(BUSINESS_CATEGORIES).map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Business Subcategory</label>
            <select
              value={formData.businessSubcategory}
              onChange={e => updateFormData('businessSubcategory', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!formData.businessCategory}
            >
              <option value="">Select subcategory</option>
              {formData.businessCategory && BUSINESS_CATEGORIES[formData.businessCategory as keyof typeof BUSINESS_CATEGORIES]?.map(subcategory => (
                <option key={subcategory} value={subcategory}>{subcategory}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Business Type *</label>
          <input
            type="text"
            value={formData.businessType}
            onChange={e => updateFormData('businessType', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Retail store, Restaurant, Manufacturing"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Business Description</label>
          <textarea
            value={formData.businessDescription}
            onChange={e => updateFormData('businessDescription', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            placeholder="Describe your business, what you do, and your unique value proposition..."
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">Contact Information</h2>
        <p className="text-gray-600 mt-2">How can we reach your business?</p>
      </div>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email *</label>
            <input
              type="email"
              value={formData.contactEmail}
              onChange={e => updateFormData('contactEmail', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="business@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
            <input
              type="tel"
              value={formData.contactPhone}
              onChange={e => updateFormData('contactPhone', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+254 700 000 000"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
          <input
            type="url"
            value={formData.website}
            onChange={e => updateFormData('website', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://www.yourbusiness.com"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Founded Year</label>
            <input
              type="number"
              value={formData.foundedYear}
              onChange={e => updateFormData('foundedYear', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="2020"
              min="1900"
              max={new Date().getFullYear()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Number of Employees</label>
            <select
              value={formData.employeeCount}
              onChange={e => updateFormData('employeeCount', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select size</option>
              {EMPLOYEE_COUNTS.map(count => (
                <option key={count} value={count}>{count} employees</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Annual Revenue</label>
          <select
            value={formData.annualRevenue}
            onChange={e => updateFormData('annualRevenue', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select revenue range</option>
            {ANNUAL_REVENUES.map(revenue => (
              <option key={revenue} value={revenue}>{revenue}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">Business Location</h2>
        <p className="text-gray-600 mt-2">Where is your business located?</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
          <input
            type="text"
            value={formData.address}
            onChange={e => updateFormData('address', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="123 Business Street"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={e => updateFormData('city', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nairobi"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State/County</label>
            <input
              type="text"
              value={formData.state}
              onChange={e => updateFormData('state', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nairobi County"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
            <select
              value={formData.country}
              onChange={e => updateFormData('country', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {COUNTRIES.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
          <input
            type="text"
            value={formData.postalCode}
            onChange={e => updateFormData('postalCode', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="00100"
          />
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">Products & Services</h2>
        <p className="text-gray-600 mt-2">What does your business sell or offer?</p>
      </div>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Primary Products/Services *</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              "Electronics", "Clothing", "Food & Beverages", "Furniture", "Books", "Jewelry",
              "Beauty Products", "Sports Equipment", "Automotive", "Home Decor", "Toys", "Health Products",
              "Software", "Consulting", "Training", "Maintenance", "Design", "Marketing", "Legal Services",
              "Financial Services", "Transportation", "Entertainment", "Education", "Healthcare"
            ].map(product => (
              <label key={product} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.primaryProducts.includes(product)}
                  onChange={() => handleProductToggle(product, true)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{product}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Secondary Products/Services</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              "Electronics", "Clothing", "Food & Beverages", "Furniture", "Books", "Jewelry",
              "Beauty Products", "Sports Equipment", "Automotive", "Home Decor", "Toys", "Health Products",
              "Software", "Consulting", "Training", "Maintenance", "Design", "Marketing", "Legal Services",
              "Financial Services", "Transportation", "Entertainment", "Education", "Healthcare"
            ].map(product => (
              <label key={product} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.secondaryProducts.includes(product)}
                  onChange={() => handleProductToggle(product, false)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{product}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">KRA PIN</label>
            <input
              type="text"
              value={formData.kraPin}
              onChange={e => updateFormData('kraPin', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="A123456789B"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">VAT Number</label>
            <input
              type="text"
              value={formData.vatNumber}
              onChange={e => updateFormData('vatNumber', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="VAT Number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Business License</label>
            <input
              type="text"
              value={formData.businessLicense}
              onChange={e => updateFormData('businessLicense', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="License Number"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">Your Account</h2>
        <p className="text-gray-600 mt-2">Create your admin account</p>
      </div>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Name *</label>
            <input
              type="text"
              value={formData.ownerName}
              onChange={e => updateFormData('ownerName', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Email *</label>
            <input
              type="email"
              value={formData.ownerEmail}
              onChange={e => updateFormData('ownerEmail', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="john@example.com"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
            <input
              type="password"
              value={formData.ownerPassword}
              onChange={e => updateFormData('ownerPassword', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Create a strong password"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={formData.ownerRole}
              onChange={e => updateFormData('ownerRole', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="owner">Owner</option>
              <option value="manager">Manager</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return renderStep1();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-100 p-4">
      <div className="bg-white/90 border border-gray-200 shadow-xl rounded-2xl w-full max-w-4xl backdrop-blur-md">
        {/* Progress Bar */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Business Registration</h1>
            <span className="text-sm text-gray-500">Step {currentStep} of 5</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            ></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating Account..." : "Complete Registration"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
} 