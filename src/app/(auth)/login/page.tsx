"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserContext";
import { FaSpinner } from "react-icons/fa";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error, user, clearError } = useUser([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [showLoginAnimation, setShowLoginAnimation] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const animationStartedRef = useRef(false);

  useEffect(() => {
    setYear(new Date().getFullYear());

    // Check for success message in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    if (message) {
      setSuccessMessage(message);
      // Clear the URL parameter
      window.history.replaceState({}, '', '/login');
    }
  }, [router]);

  useEffect(() => {
    if (user && !animationStartedRef.current) {
      console.log('Authenticated user detected in login page:', user);
      animationStartedRef.current = true;
      setShowLoginAnimation(true);
      const timer = setTimeout(() => {
        // Check if user is trying to access register page - allow it
        const currentPath = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);
        const redirectTo = searchParams.get('redirect');

        console.log('Current path:', currentPath, 'Redirect to:', redirectTo);

        // Allow access to register page even when authenticated
        if (currentPath === '/register' || redirectTo === '/register') {
          console.log('User trying to access register page, allowing access');
          setShowLoginAnimation(false);
          animationStartedRef.current = false;
          return;
        }

        // Check both roles array and isSuperadmin flag
        const isSuperAdmin = user.roles?.includes('superadmin') || user.isSuperadmin;
        const isAdmin = user.roles?.includes('admin');

        if (isSuperAdmin) {
          router.push("/superadmin");  // Super admin dashboard
        } else if (isAdmin) {
          router.push("/admin");  // Regular admin dashboard
        } else {
          router.push("/");  // Regular user dashboard
        }
      }, 1000);
      return () => clearTimeout(timer);
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

  // Show loading animation overlay
  if (showLoginAnimation) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="text-center text-white">
          <div className="flex justify-center mb-6">
            <FaSpinner className="w-12 h-12 animate-spin" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Welcome back!</h2>
          <p className="text-gray-300">Setting up your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <ReactQueryProvider>
      <ThemeProvider>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white/90 rounded-2xl shadow-xl p-8 flex flex-col items-center relative">
            <div className="mb-6 text-center">
              <div className="text-3xl font-extrabold text-blue-700 mb-2">SaaS POS</div>
              <div className="text-gray-500 text-sm">Sign in to your account</div>
            </div>

            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm text-center">
                {successMessage}
              </div>
            )}

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
      </ThemeProvider>
    </ReactQueryProvider>
  );
} 