"use client";
import { useState } from "react";
import { apiPut } from "@/utils/api";
import { FaKey } from "react-icons/fa";
import Link from "next/link";

const MIN_PASSWORD_LENGTH = 8;

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: string }).message;
    if (typeof msg === "string") return msg;
    if (Array.isArray(msg)) return msg[0] ?? "Failed to change password";
  }
  return "Failed to change password";
}

export default function PasswordSettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (!currentPassword.trim()) {
      setError("Please enter your current password.");
      return;
    }

    setLoading(true);
    try {
      await apiPut("/user/me/password", {
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 min-h-[80vh]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FaKey className="text-blue-600 dark:text-blue-400 text-2xl" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
            Change Password
          </h2>
        </div>
        <Link
          href="/settings"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          ← All Settings
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-8 w-full mb-8 border border-gray-200 dark:border-slate-600">
        <p className="text-gray-600 dark:text-slate-400 text-base mb-6">
          Update your password regularly to keep your account secure. Use at least{" "}
          {MIN_PASSWORD_LENGTH} characters for your new password.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label
              htmlFor="current-password"
              className="block font-medium text-gray-700 dark:text-slate-300 mb-2"
            >
              Current Password
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-500 bg-gray-50 dark:bg-slate-700 px-3 py-2.5 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter current password"
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="new-password"
              className="block font-medium text-gray-700 dark:text-slate-300 mb-2"
            >
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-500 bg-gray-50 dark:bg-slate-700 px-3 py-2.5 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block font-medium text-gray-700 dark:text-slate-300 mb-2"
            >
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-500 bg-gray-50 dark:bg-slate-700 px-3 py-2.5 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Confirm new password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          {error && (
            <div
              className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm"
              role="alert"
            >
              {error}
            </div>
          )}
          {success && (
            <div
              className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm"
              role="status"
            >
              Password changed successfully. Use your new password next time you sign in.
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold px-6 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                "Change Password"
              )}
            </button>
          </div>
        </form>
      </div>

      <hr className="border-0 border-t border-gray-200 dark:border-slate-600 my-8" />
      <p className="text-gray-500 dark:text-slate-500 text-sm">
        If you forgot your password, use the{" "}
        <Link
          href="/forgot-password"
          className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
        >
          reset password
        </Link>{" "}
        page.
      </p>
    </div>
  );
}
