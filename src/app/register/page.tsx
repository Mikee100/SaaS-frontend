"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/utils/api";

export default function RegisterPage() {
  const router = useRouter();
  // Tenant fields
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  // User fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("owner");
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // 1. Create tenant
      const tenant = await apiPost<{ id: string }>("/tenant", {
        name: businessName,
        businessType,
        contactEmail,
        contactPhone,
      });
      // 2. Create user
      await apiPost("/user", {
        name,
        email,
        password,
        role,
        tenantId: tenant.id,
      });
      // 3. Auto-login
      const loginRes = await apiPost<{ access_token: string; user: any }>("/auth/login", { email, password });
      localStorage.setItem("token", loginRes.access_token);
      localStorage.setItem("user", JSON.stringify(loginRes.user));
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-100 p-4">
      <form onSubmit={handleSubmit} className="bg-white/90 border border-gray-200 shadow-xl rounded-2xl w-full max-w-lg p-8 space-y-6 backdrop-blur-md">
        <h1 className="text-3xl font-extrabold mb-2 text-center text-blue-700">Register Your Business</h1>
        <p className="text-center text-gray-500 mb-4">Create your business and first user account</p>
        {error && <div className="text-red-500 text-sm mb-2 text-center">{error}</div>}
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Business Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Business Name"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
              required
            />
            <input
              type="text"
              placeholder="Business Type (e.g. retail, restaurant)"
              value={businessType}
              onChange={e => setBusinessType(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
              required
            />
            <input
              type="email"
              placeholder="Contact Email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
              required
            />
            <input
              type="text"
              placeholder="Contact Phone"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2 mt-4">Your Account</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-300"
              required
            />
            <input
              type="email"
              placeholder="Your Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-300"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-300"
              required
            />
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              <option value="owner">Owner</option>
              <option value="manager">Manager</option>
              <option value="cashier">Cashier</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold text-lg shadow-lg hover:from-blue-700 hover:to-purple-700 transition"
          disabled={loading}
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
    </div>
  );
} 