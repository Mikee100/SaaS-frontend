"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error, user, clearError } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
    // user and error will update via context
  };

  // Clear error on input change
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) clearError();
  };
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) clearError();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/90 rounded-2xl shadow-xl p-8 flex flex-col items-center relative">
        <div className="mb-6 text-center">
          <div className="text-3xl font-extrabold text-blue-700 mb-2">SaaS POS</div>
          <div className="text-gray-500 text-sm">Sign in to your account</div>
        </div>
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {error && (
            <div className="text-red-500 text-sm text-center flex flex-col gap-2">
              <span>{error}</span>
              <button type="button" className="text-xs underline text-blue-600" onClick={clearError}>Clear</button>
            </div>
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={handleEmailChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={handlePasswordChange}
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
    </div>
  );
} 