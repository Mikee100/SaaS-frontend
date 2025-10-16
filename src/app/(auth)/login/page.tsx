"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserContext";
import { FaSpinner, FaCheck, FaEye, FaEyeSlash } from "react-icons/fa";
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

  const [showPassword, setShowPassword] = useState(false);
  const animationStartedRef = useRef(false);

  useEffect(() => {
    setYear(new Date().getFullYear());

    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    if (message) {
      setSuccessMessage(message);
      window.history.replaceState({}, '', '/login');
    }

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
        
        if (currentPath === '/register') {
          console.log('Allowing access to register page');
          setShowLoginAnimation(false);
          animationStartedRef.current = false;
          return;
        }
        
        if (currentPath === '/login') {
          console.log('Redirecting authenticated user from login page');
          const isSuperAdmin = user.roles?.includes('superadmin') || user.isSuperadmin;
          const isAdmin = user.roles?.includes('admin');
          
          console.log('User roles:', user.roles);
          if (isSuperAdmin) {
            router.push("/superadmin");
          } else if (isAdmin) {
            router.push("/admin");
          } else {
            router.push("/");
          }
        } else {
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
  };



  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) clearError();
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) clearError();
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (showLoginAnimation) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center text-white bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-semibold mb-2 text-white">Accessing Your POS</h2>
          <p className="text-gray-400 mb-4">Securing your business dashboard</p>
          <div className="mt-6 flex justify-center space-x-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ReactQueryProvider>
      <ThemeProvider>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
          {/* Modern Geometric Background */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-72 h-72 bg-blue-600/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-slate-700/5 rounded-full blur-3xl"></div>
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="w-full h-full" style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                 linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                backgroundSize: '50px 50px'
              }}></div>
            </div>
          </div>

          {/* Main Login Card */}
          <div className={`w-full max-w-md relative
            transition-all duration-700 ease-out
            ${formVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}
          `}>
            {/* Card Background with Glass Effect */}
            <div className="bg-gray-800/80 backdrop-blur-xl rounded-3xl border border-gray-700/50 shadow-2xl p-8">
              
              {/* Header */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-lg">₿</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">POS System</h1>
                    <p className="text-gray-400 text-sm">Business Dashboard</p>
                  </div>
                </div>
                <p className="text-gray-500 text-sm">Sign in to manage your point of sale</p>
              </div>

              {/* Success Message */}
              {successMessage && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm text-center">
                  <FaCheck className="inline mr-2" />
                  {successMessage}
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{error}</span>
                      <button 
                        type="button" 
                        className="text-red-400 hover:text-red-300 text-xs font-medium"
                        onClick={clearError}
                      >
                        DISMISS
                      </button>
                    </div>
                  </div>
                )}

                {/* Email Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl 
                               focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 
                               outline-none transition-all duration-300 text-white placeholder-gray-500
                               hover:border-gray-500"
                      placeholder="business@example.com"
                      required
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      ✉️
                    </div>
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={handlePasswordChange}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl 
                               focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 
                               outline-none transition-all duration-300 text-white placeholder-gray-500
                               hover:border-gray-500 pr-12"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-sm
                           hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.99]
                           shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <FaSpinner className="animate-spin mr-3" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <span>Access Dashboard</span>
                  )}
                </button>
              </form>

              {/* Footer Links */}
              <div className="mt-6 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <a 
                    href="/forgot-password" 
                    className="text-gray-400 hover:text-blue-400 transition-colors font-medium"
                  >
                    Forgot Password?
                  </a>
                  <a 
                    href="/register" 
                    className="text-blue-400 hover:text-blue-300 font-medium flex items-center"
                  >
                    Create Account →
                  </a>
                </div>
                
                <div className="pt-4 border-t border-gray-700/50">
                  <p className="text-center text-xs text-gray-500">
                    &copy; {year ?? ""} POS System • Secure Business Platform
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ThemeProvider>
    </ReactQueryProvider>
  );
}