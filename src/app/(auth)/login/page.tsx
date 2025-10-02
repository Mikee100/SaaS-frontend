"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserContext";
import { FaSpinner, FaCheck } from "react-icons/fa";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error, user, clearError } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [showLoginAnimation, setShowLoginAnimation] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formVisible, setFormVisible] = useState(false);
  const [shakeForm, setShakeForm] = useState(false);
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

    // Trigger form slide-in animation
    const timer = setTimeout(() => setFormVisible(true), 100);
    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    if (user && !animationStartedRef.current) {
      console.log('Authenticated user detected in login page:', user);
      animationStartedRef.current = true;
      setShowLoginAnimation(true);
      
      const timer = setTimeout(() => {
        const currentPath = window.location.pathname;
        console.log('Current path in login page effect:', currentPath);
        
        // If we're on the register page, don't redirect
        if (currentPath === '/register') {
          console.log('Allowing access to register page');
          setShowLoginAnimation(false);
          animationStartedRef.current = false;
          return;
        }
        
        // Only redirect if we're on the login page
        if (currentPath === '/login') {
          console.log('Redirecting authenticated user from login page');
          const isSuperAdmin = user.roles?.includes('superadmin') || user.isSuperadmin;
          const isAdmin = user.roles?.includes('admin');
          
          if (isSuperAdmin) {
            router.push("/superadmin");
          } else if (isAdmin) {
            router.push("/admin");
          } else {
            router.push("/");
          }
        } else {
          // If we're on some other page, just clear the animation
          setShowLoginAnimation(false);
          animationStartedRef.current = false;
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

  useEffect(() => {
    if (error) {
      setShakeForm(true);
      const timer = setTimeout(() => setShakeForm(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="text-center text-white bg-white rounded-lg p-8 border border-gray-200">
          <div className="flex justify-center mb-6">
            <FaSpinner className="w-12 h-12 animate-spin text-blue-600" />
          </div>
          <h2 className="text-2xl font-semibold mb-2 text-gray-900">Processing Login...</h2>
          <p className="text-gray-600 mb-4">Authenticating your credentials</p>
          <div className="mt-4 flex justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ReactQueryProvider>
      <ThemeProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4 relative overflow-hidden">
          {/* Floating POS Elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-10 animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}>
              <div className="w-8 h-8 bg-blue-600 rounded-full opacity-30 flex items-center justify-center">
                <span className="text-white text-xs">🛒</span>
              </div>
            </div>
            <div className="absolute top-40 right-20 animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }}>
              <div className="w-6 h-6 bg-slate-600 rounded-full opacity-30 flex items-center justify-center">
                <span className="text-white text-xs">📊</span>
              </div>
            </div>
            <div className="absolute bottom-32 left-20 animate-bounce" style={{ animationDelay: '2s', animationDuration: '3.5s' }}>
              <div className="w-7 h-7 bg-blue-700 rounded-full opacity-30 flex items-center justify-center">
                <span className="text-white text-xs">💳</span>
              </div>
            </div>
            <div className="absolute bottom-20 right-10 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '4.5s' }}>
              <div className="w-5 h-5 bg-slate-700 rounded-full opacity-30 flex items-center justify-center">
                <span className="text-white text-xs">🧾</span>
              </div>
            </div>
          </div>

          <div className={`w-full max-w-md bg-white rounded-lg p-8 flex flex-col items-center relative
            transition-all duration-700 ease-in-out
            ${formVisible ? "translate-x-0 opacity-100" : "-translate-x-20 opacity-0"}
            ${shakeForm ? "animate-shake" : ""}
            border border-gray-200
          `}>
            <div className="mb-8 text-center">
              <div className="text-4xl font-bold text-gray-900 mb-1">
                SaaS POS
              </div>
              <div className="text-gray-600 text-sm">Point of Sale System</div>
              <div className="text-gray-500 text-xs mt-1">Secure login to your dashboard</div>
            </div>

            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center">
                <FaCheck className="inline mr-2" />
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="w-full space-y-6">
              {error && (
                <div className="text-red-600 text-sm text-center flex flex-col gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <span className="font-semibold">{error}</span>
                  <button type="button" className="text-xs underline text-red-500 hover:text-red-600" onClick={clearError}>Clear</button>
                </div>
              )}
              <div className="relative">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={handleEmailChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-300 bg-white text-gray-900 placeholder-gray-500 text-base"
                  required
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">
                  📧
                </div>
              </div>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-300 bg-white text-gray-900 placeholder-gray-500 text-base"
                  required
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">
                  🔒
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-base hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <FaSpinner className="animate-spin mr-2" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <span>Login to Dashboard</span>
                )}
              </button>
            </form>
            <div className="w-full flex justify-end mt-4">
              <a href="/forgot-password" className="text-gray-500 hover:text-gray-700 hover:underline text-sm">Forgot Password?</a>
            </div>
            <div className="mt-6 text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <a href="/register" className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                Register
              </a>
            </div>
            <footer className="absolute -bottom-8 left-0 right-0 text-center text-xs text-gray-500">
              &copy; {year ?? ""} SaaS POS. All rights reserved.
            </footer>
          </div>
        </div>
      </ThemeProvider>
    </ReactQueryProvider>
  );
} 