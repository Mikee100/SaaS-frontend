"use client";

import React, { useState } from "react";
import { apiPost } from "@/utils/api";

const CreateTenantPage = () => {
  const [form, setForm] = useState({
    name: "",
    businessType: "",
    contactEmail: "",
    contactPhone: "",
    country: "",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
  });
  const [tempPassword, setTempPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const tenantData = {
        name: form.name,
        businessType: form.businessType,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone || undefined,
        country: form.country,
        owner: {
          name: form.ownerName,
          email: form.ownerEmail,
          password: form.ownerPassword,
        },
      };

      const data = await apiPost('/admin/tenants', tenantData);
      setSuccess(`Tenant created successfully! Default password: owner1234@`);
      setForm({
        name: "",
        businessType: "",
        contactEmail: "",
        contactPhone: "",
        country: "",
        ownerName: "",
        ownerEmail: "",
        ownerPassword: "",
      });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "2rem auto", padding: "1rem" }}>
      <h2>Create Tenant</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label>Business Name:</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            type="text"
            placeholder="Enter business name"
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </div>

        <div>
          <label>Business Type:</label>
          <select
            name="businessType"
            value={form.businessType}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          >
            <option value="">Select business type</option>
            <option value="retail">Retail</option>
            <option value="wholesale">Wholesale</option>
            <option value="restaurant">Restaurant</option>
            <option value="services">Services</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label>Contact Email:</label>
          <input
            name="contactEmail"
            value={form.contactEmail}
            onChange={handleChange}
            required
            type="email"
            placeholder="business@example.com"
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </div>

        <div>
          <label>Contact Phone:</label>
          <input
            name="contactPhone"
            value={form.contactPhone}
            onChange={handleChange}
            type="tel"
            placeholder="+1234567890"
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </div>

        <div>
          <label>Country:</label>
          <select
            name="country"
            value={form.country}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          >
            <option value="">Select country</option>
            <option value="Kenya">Kenya</option>
            <option value="United States">United States</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="Canada">Canada</option>
            <option value="Australia">Australia</option>
            <option value="Germany">Germany</option>
            <option value="France">France</option>
            <option value="Japan">Japan</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <hr style={{ margin: "1rem 0", border: "none", borderTop: "1px solid #ccc" }} />
        <h3>Owner Details</h3>

        <div>
          <label>Owner Name:</label>
          <input
            name="ownerName"
            value={form.ownerName}
            onChange={handleChange}
            required
            type="text"
            placeholder="Full name"
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </div>

        <div>
          <label>Owner Email:</label>
          <input
            name="ownerEmail"
            value={form.ownerEmail}
            onChange={handleChange}
            required
            type="email"
            placeholder="owner@example.com"
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </div>

        <div>
          <label>Owner Password:</label>
          <input
            name="ownerPassword"
            value={form.ownerPassword}
            onChange={handleChange}
            required
            type="password"
            placeholder="Default: owner1234@"
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
          <small style={{ color: "#666", fontSize: "0.875rem" }}>
            Note: A default password "owner1234@" will be set. Users can change it after first login.
          </small>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.75rem",
            backgroundColor: loading ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            marginTop: "1rem"
          }}
        >
          {loading ? "Creating..." : "Create Tenant"}
        </button>

        {success && <div style={{ color: "green", marginTop: "1rem" }}>{success}</div>}
        {error && <div style={{ color: "red", marginTop: "1rem" }}>{error}</div>}
      </form>
    </div>
  );
};

export default CreateTenantPage;
