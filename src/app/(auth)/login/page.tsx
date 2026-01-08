"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserContext";
import {
  FaSpinner,
  FaCheck,
  FaEye,
  FaEyeSlash,
  FaExclamationTriangle,
  FaLock,
  FaEnvelope,
  FaShieldAlt,
} from "react-icons/fa";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error, user, clearError } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [year, setYear] = useState<number | null>(null);
  const [showLoginAnimation, setShowLoginAnimation] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formVisible, setFormVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });

  const animationStartedRef = useRef(false);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());

    const rememberedEmail = typeof window !== "undefined"
      ? window.localStorage.getItem("rememberedEmail")
      : null;

    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get("message");
    if (message) {
      setSuccessMessage(message);
      window.history.replaceState({}, "", "/login");
    }

    const timer = window.setTimeout(() => setFormVisible(true), 100);
    return () => window.clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    if (user && !animationStartedRef.current) {
      animationStartedRef.current = true;
      setShowLoginAnimation(true);

      const timer = window.setTimeout(() => {
        const currentPath = window.location.pathname;

        if (currentPath === "/register") {
          setShowLoginAnimation(false);
          animationStartedRef.current = false;
          return;
        }

        if (currentPath === "/login") {
          const isSuperAdmin =
            user.roles?.includes("superadmin") || user.isSuperadmin;
          const isAdmin = user.roles?.includes("admin");

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

      return () => window.clearTimeout(timer);
    }
  }, [user, router]);

  const validateEmail = (value: string): string => {
    if (!value.trim()) return "Email address is required";
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value)) return "Please enter a valid email address";
    return "";
  };

  const validatePassword = (value: string): string => {
    if (!value.trim()) return "Password is required";
    if (value.length < 6) return "Password must be at least 6 characters";
    return "";
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setTouched((prev) => ({ ...prev, email: true }));

    if (touched.email) {
      setEmailError(validateEmail(value));
    }

    if (error || formError) {
      clearError();
      setFormError("");
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setTouched((prev) => ({ ...prev, password: true }));

    if (touched.password) {
      setPasswordError(validatePassword(value));
    }

    if (error || formError) {
      clearError();
      setFormError("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState && e.getModifierState("CapsLock")) {
      setCapsLockOn(true);
    } else {
      setCapsLockOn(false);
    }
  };

  const handleKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState && e.getModifierState("CapsLock")) {
      setCapsLockOn(true);
    } else {
      setCapsLockOn(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    setTouched({ email: true, password: true });

    const emailValidationError = validateEmail(email);
    const passwordValidationError = validatePassword(password);

    setEmailError(emailValidationError);
    setPasswordError(passwordValidationError);

    if (emailValidationError || passwordValidationError) return;

    try {
      await login(email, password);

      if (rememberMe) {
        window.localStorage.setItem("rememberedEmail", email);
      } else {
        window.localStorage.removeItem("rememberedEmail");
      }
    } catch (err: any) {
      const errorMessage =
        err?.message ||
        error ||
        "Unable to sign in. Please check your credentials and try again.";
      setFormError(errorMessage);
    }
  };

  if (showLoginAnimation) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
        <div className="relative w-full max-w-xl mx-4 rounded-3xl bg-slate-900/90 border border-slate-700/70 shadow-2xl overflow-hidden">
          {/* Accent strip */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-blue-500 to-indigo-500" />

          <div className="relative flex flex-col md:flex-row gap-6 px-7 py-8 md:px-8 md:py-9">
            {/* Left: spinner + main message */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-5">
                <div className="relative">
                  <div className="h-14 w-14 rounded-full border-2 border-slate-600/60" />
                  <div className="absolute inset-1 rounded-full border-2 border-transparent border-t-emerald-400 border-r-blue-400 animate-spin" />
                  <div className="absolute inset-2 rounded-full bg-slate-900/90 flex items-center justify-center">
                    <FaShieldAlt className="text-emerald-400 text-lg" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                    Preparing workspace
                  </p>
                  <p className="text-base text-slate-200">
                    Signing you into the POS console…
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-2 mb-4">
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-emerald-400 via-blue-500 to-indigo-500 animate-[shimmer_1.4s_infinite]" />
                </div>
              </div>

              {/* Subtext */}
              <p className="text-xs text-slate-400">
                This is quick. We&apos;re restoring your session and checking your
                access level.
              </p>
            </div>

            {/* Right: tiny status checklist */}
            <div className="w-px bg-slate-800/70 hidden md:block" />

            <div className="md:w-40 flex flex-row md:flex-col justify-between md:justify-start gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-400/50">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span>Secure channel</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/10 border border-blue-400/50">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                </span>
                <span>Role check</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-400/50">
                  <span className="h-2 w-2 rounded-full bg-indigo-400" />
                </span>
                <span>Dashboard ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const containerClasses = [
    "w-full",
    "max-w-6xl",
    "relative",
    "z-10",
    "transition-all",
    "duration-700",
    "ease-out",
    formVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0",
  ].join(" ");

  return (
    <ReactQueryProvider>
      <ThemeProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
          </div>

          <div className={containerClasses}>
            <div className="grid md:grid-cols-2 min-h-[520px]">
              <div className="hidden md:flex items-center justify-center relative">
                <div className="relative w-full max-w-md aspect-[4/3] mx-6 rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900">
                  <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_0_0,rgba(255,255,255,0.4)_0,transparent_55%),radial-gradient(circle_at_100%_100%,rgba(15,23,42,0.9)_0,transparent_60%)]" />
                  <div className="relative z-10 h-full flex items-center justify-center px-8">
                    <div className="w-full max-w-sm space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                          <FaShieldAlt className="text-xl text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-blue-100/80">
                            Secure access
                          </p>
                          <p className="text-sm text-blue-50/90">
                            POS console sign-in
                          </p>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white/10 border border-white/15 p-4 backdrop-blur-md space-y-3">
                        <div className="h-3 rounded-full bg-white/30" />
                        <div className="h-3 rounded-full bg-white/20 w-3/4" />
                        <div className="flex gap-3 pt-1">
                          <div className="flex-1 h-12 rounded-xl bg-emerald-400/50" />
                          <div className="flex-1 h-12 rounded-xl bg-blue-400/50" />
                          <div className="flex-1 h-12 rounded-xl bg-indigo-400/50" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center px-4 py-8 md:px-10 md:py-10">
                <div className="md:hidden text-center mb-6">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mr-3">
                      <FaShieldAlt className="text-xl text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900">
                        POS Console
                      </h1>
                      <p className="text-slate-500 text-sm">Secure sign-in</p>
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-900">
                      Sign in
                    </h2>
                    <p className="text-sm text-slate-500">
                      Use your work email and password.
                    </p>
                  </div>
                  <div className="hidden md:inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    Secure session
                  </div>
                </div>

                {successMessage && (
                  <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center">
                    <FaCheck className="mr-2 text-emerald-600" />
                    {successMessage}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {(error || formError) && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <FaExclamationTriangle className="mr-2 mt-0.5 flex-shrink-0 text-amber-600" />
                          <span className="font-medium">
                            {error || formError}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="text-amber-600 hover:text-amber-800 text-xs font-medium ml-4 flex-shrink-0"
                          onClick={() => {
                            clearError();
                            setFormError("");
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-semibold text-slate-700 mb-2"
                    >
                      Email address
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <FaEnvelope />
                      </div>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={handleEmailChange}
                        onBlur={() => {
                          setTouched((prev) => ({ ...prev, email: true }));
                          setEmailError(validateEmail(email));
                        }}
                        className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                          emailError && touched.email
                            ? "border-amber-400 focus:border-amber-500 focus:ring-amber-500/20"
                            : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 hover:border-slate-300"
                        }`}
                        placeholder="you@company.com"
                        required
                        disabled={loading}
                      />
                    </div>
                    {emailError && touched.email && (
                      <p className="mt-2 text-sm text-amber-600 flex items-center">
                        <FaExclamationTriangle className="mr-1.5 text-xs" />
                        {emailError}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label
                        htmlFor="password"
                        className="block text-sm font-semibold text-slate-700"
                      >
                        Password
                      </label>
                      <a
                        href="/forgot-password"
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        Forgot password?
                      </a>
                    </div>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <FaLock />
                      </div>
                      <input
                        ref={passwordInputRef}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={handlePasswordChange}
                        onKeyDown={handleKeyDown}
                        onKeyUp={handleKeyUp}
                        onBlur={() => {
                          setTouched((prev) => ({ ...prev, password: true }));
                          setPasswordError(validatePassword(password));
                        }}
                        className={`w-full pl-12 pr-12 py-3.5 bg-slate-50 border-2 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                          passwordError && touched.password
                            ? "border-amber-400 focus:border-amber-500 focus:ring-amber-500/20"
                            : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 hover:border-slate-300"
                        }`}
                        placeholder="Enter your password"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {capsLockOn && (
                      <p className="mt-2 text-sm text-amber-600 flex items-center">
                        <FaExclamationTriangle className="mr-1.5 text-xs" />
                        Caps Lock is on
                      </p>
                    )}
                    {passwordError && touched.password && (
                      <p className="mt-2 text-sm text-amber-600 flex items-center">
                        <FaExclamationTriangle className="mr-1.5 text-xs" />
                        {passwordError}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center">
                    <input
                      id="rememberMe"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
                      disabled={loading}
                    />
                    <label
                      htmlFor="rememberMe"
                      className="ml-3 text-sm text-slate-700 cursor-pointer"
                    >
                      Remember me for 30 days
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-semibold text-base hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.99] shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <FaSpinner className="animate-spin mr-3" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <span>Sign in to dashboard</span>
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-200">
                  <p className="text-center text-sm text-slate-600">
                    Don&apos;t have an account?{" "}
                    <a
                      href="/register"
                      className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                    >
                      Create account
                    </a>
                  </p>
                  <p className="text-center text-xs text-slate-500 mt-4">
                    &copy; {year ?? ""} POS Console • Secure Business Platform
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
