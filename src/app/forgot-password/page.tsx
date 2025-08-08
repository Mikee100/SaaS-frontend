"use client";
import { useState } from "react";
import { apiPost } from "@/utils/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiPost("/auth/forgot-password", { email });
      setSubmitted(true);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white/90 rounded-2xl shadow-xl p-8 flex flex-col items-center relative">
        <div className="mb-6 text-center">
          <div className="text-2xl font-extrabold text-blue-700 mb-2">Forgot Password</div>
          <div className="text-gray-500 text-sm">Enter your email to reset your password</div>
        </div>
        {submitted ? (
          <div className="text-green-600 text-center">
            If an account with that email exists, a password reset link has been sent.
          </div>
        ) : (
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
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}
        <div className="mt-6 text-sm text-gray-600">
          <a href="/login" className="text-blue-600 hover:underline font-medium">Back to Login</a>
        </div>
      </div>
    </div>
  );
} 