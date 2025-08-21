
"use client";
import { useState } from "react";
import { apiPost } from "@/utils/api";
import { useRouter } from "next/navigation";

export default function BranchCreatePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    street: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    phone: "",
    email: "",
    manager: "",
    openingHours: "",
    status: "active",
    logo: null,
    customField: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: any) => {
    const { name, value, files } = e.target;
    setForm(f => ({
      ...f,
      [name]: files ? files[0] : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const payload = { ...form };
      // Handle logo upload
      if (form.logo) {
        // You may want to upload logo separately or as FormData
        // For now, skip logo upload logic
        payload.logo = undefined;
      }
      await apiPost("/branches", payload);
      setSuccess("Branch created successfully!");
      setForm({
        name: "",
        street: "",
        city: "",
        state: "",
        country: "",
        postalCode: "",
        phone: "",
        email: "",
        manager: "",
        openingHours: "",
        status: "active",
        logo: null,
        customField: ""
      });
    } catch (err: any) {
      setError(err.message || "Failed to create branch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-xl shadow border mt-8">
      <h2 className="text-2xl font-bold mb-4">Create New Branch</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Branch Name</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg" placeholder="Branch name" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Manager</label>
            <input type="text" name="manager" value={form.manager} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="Manager name or email" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="Contact phone" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="Contact email" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Street</label>
            <input type="text" name="street" value={form.street} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="Street address" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <input type="text" name="city" value={form.city} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="City" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">State</label>
            <input type="text" name="state" value={form.state} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="State" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Country</label>
            <input type="text" name="country" value={form.country} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="Country" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Postal Code</label>
            <input type="text" name="postalCode" value={form.postalCode} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="Postal code" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Opening Hours</label>
            <input type="text" name="openingHours" value={form.openingHours} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g. Mon-Fri 8am-6pm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select name="status" value={form.status} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Logo (optional)</label>
          <input type="file" name="logo" accept="image/*" onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Custom Field (optional)</label>
          <input type="text" name="customField" value={form.customField} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="Any extra info" />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">{success}</div>}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Branch"}
        </button>
      </form>
    </div>
  );
}
