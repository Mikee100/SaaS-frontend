"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/utils/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("token")) {
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      interface LoginResponse {
        access_token: string;
        user: {
          id: string;
          email: string;
          name: string;
          role: string;
        };
      }
      
      const res = await apiPost<LoginResponse>("/auth/login", { email, password });
      localStorage.setItem("token", res.access_token);
      localStorage.setItem("user", JSON.stringify(res.user));
      router.push("/");
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white/90 rounded-2xl shadow-xl p-8 flex flex-col items-center relative">
      <div className="mb-6 text-center">
        <div className="text-3xl font-extrabold text-blue-700 mb-2">SaaS POS</div>
        <div className="text-gray-500 text-sm">Sign in to your account</div>
      </div>
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition"
          required
        />
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <div className="w-full flex justify-end mt-2">
        <a href="/forgot-password" className="text-blue-600 hover:underline text-sm font-medium">Forgot Password?</a>
      </div>
      <div className="mt-6 text-sm text-gray-600">
        Don't have an account?{" "}
        <a href="/register" className="text-blue-600 hover:underline font-medium">
          Register
        </a>
      </div>
      <footer className="absolute -bottom-8 left-0 right-0 text-center text-xs text-gray-400">
        &copy; {year ?? ""} SaaS POS. All rights reserved.
      </footer>
    </div>
  );
} 