"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiPost } from "@/utils/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Invalid reset link");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      await apiPost("/auth/reset-password", { token, newPassword: password });
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'string') {
        setError(err);
      } else {
        setError('Failed to reset password');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md bg-white/90 rounded-2xl shadow-xl p-8 flex flex-col items-center relative">
          <div className="text-red-500 text-center mb-4">
            Invalid reset link. Please request a new password reset.
          </div>
          <a href="/forgot-password" className="text-blue-600 hover:underline font-medium">
            Request Password Reset
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md bg-white/90 rounded-2xl shadow-xl p-8 flex flex-col items-center relative">
          <div className="text-green-600 text-center mb-4">
            Password reset successfully! Redirecting to login...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white/90 rounded-2xl shadow-xl p-8 flex flex-col items-center relative">
        <div className="mb-6 text-center">
          <div className="text-2xl font-extrabold text-blue-700 mb-2">Reset Password</div>
          <div className="text-gray-500 text-sm">Enter your new password</div>
        </div>
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition"
            required
            minLength={6}
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition"
            required
            minLength={6}
          />
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition"
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
        <div className="mt-6 text-sm text-gray-600">
          <a href="/login" className="text-blue-600 hover:underline font-medium">Back to Login</a>
        </div>
      </div>
    </div>
  );
}