import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  ShieldCheck,
  Zap,
  Headphones,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  AuthPagesConfig,
  DEFAULT_AUTH_PAGES_CONFIG,
  fetchAuthPagesConfig,
  renderAuthIcon,
} from "@/lib/authPagesConfig";

function apiBaseUrl() {
  return (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
}

function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brandLogo, setBrandLogo] = useState<string>("");
  const [useLegacyLayout, setUseLegacyLayout] = useState<boolean>(false);
  const [authConfig, setAuthConfig] = useState<AuthPagesConfig>(DEFAULT_AUTH_PAGES_CONFIG);
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const baseUrl = apiBaseUrl();
    // Fetch auth pages configuration
    fetchAuthPagesConfig(baseUrl).then(({ config, useLegacy }) => {
      if (config) setAuthConfig(config);
      if (useLegacy) setUseLegacyLayout(true);
    });

    fetch(`${baseUrl}/api/settings/public`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const logo = data?.brand_logo_url || data?.brandLogoUrl || data?.site_logo || data?.siteLogo || "";
        if (logo) setBrandLogo(logo);
        if (data?.use_legacy_auth_pages === true || data?.useLegacyAuthPages === true) {
          setUseLegacyLayout(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();

    if (!cleanIdentifier) {
      setError("يرجى إدخال اسم المستخدم أو البريد الإلكتروني.");
      return;
    }
    if (!cleanPassword) {
      setError("يرجى إدخال كلمة المرور.");
      return;
    }

    setLoading(true);
    try {
      const baseUrl = apiBaseUrl();
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          login: cleanIdentifier,
          password: cleanPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "فشل تسجيل الدخول. يرجى التأكد من البيانات المدخلة.");
      }

      if (data.token && data.user) {
        login(data.token, data.user);
        toast.success("تم تسجيل الدخول بنجاح! أهلاً بك.");
        try {
          const redirectPath = sessionStorage.getItem("redirect_after_login");
          if (redirectPath) {
            sessionStorage.removeItem("redirect_after_login");
            setLocation(redirectPath);
            return;
          }
        } catch {
          // Ignore
        }
        setLocation("/");
      } else {
        throw new Error("استجابة غير صالحة من الخادم.");
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع أثناء تسجيل الدخول.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    toast.info("تسجيل الدخول عبر Google", {
      description: "خدمة تسجيل الدخول السريع عبر حساب Google قيد التفعيل حالياً. يمكنك تسجيل الدخول ببيانات حسابك مباشرة.",
    });
  };

  const handleForgotPassword = () => {
    toast.info("استعادة كلمة المرور", {
      description: "لاستعادة كلمة المرور، يرجى التواصل مع فريق الدعم الفني عبر صفحة المساعدة أو تليجرام مع تزويدنا باسم المستخدم.",
    });
  };

  // --- LEGACY SINGLE CARD LAYOUT (Fallback if use_legacy_auth_pages is true) ---
  if (useLegacyLayout) {
    return (
      <div
        className="min-h-[100dvh] flex flex-col justify-center items-center p-4 sm:p-6 transition-colors duration-200"
        style={{
          backgroundColor: "var(--auth-bg-color, var(--theme-background, #1A1A1A))",
          color: "var(--auth-text-color, var(--theme-text-primary, #FFFFFF))",
        }}
        dir="rtl"
      >
        <div
          className="w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-[var(--theme-primary,#C8A45C)]/40 relative overflow-hidden"
          style={{
            backgroundColor: "var(--auth-card-color, var(--theme-card, #2D2D2D))",
          }}
        >
          <div className="text-center mb-6 relative z-10 flex flex-col items-center">
            {brandLogo ? (
              <Link href="/" className="mb-4 inline-block hover:opacity-90 transition">
                <img
                  src={brandLogo}
                  alt="Store Logo"
                  className="object-contain rounded-2xl max-h-20"
                />
              </Link>
            ) : null}
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--theme-accent,#FDE68A)] tracking-wide">
              تسجيل الدخول
            </h1>
            <p className="text-sm font-medium text-zinc-400 mt-1">مرحباً بك مجددًا في المتجر</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs sm:text-sm flex items-start gap-2.5 shadow-md">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                اسم المستخدم أو البريد الإلكتروني
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-500">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="أدخل اسم المستخدم أو الإيميل"
                  disabled={loading}
                  className="w-full bg-[#3D3D3D] border border-zinc-600 rounded-xl pr-10 pl-3 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--theme-primary,#C8A45C)] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">كلمة المرور</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full bg-[#3D3D3D] border border-zinc-600 rounded-xl pr-10 pl-10 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--theme-primary,#C8A45C)] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 hover:text-zinc-200 transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--theme-primary,#C8A45C)] hover:bg-[var(--theme-secondary,#B8954A)] active:scale-[0.98] text-zinc-950 font-black py-3.5 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  <span>دخول الحساب</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-zinc-700/80 pt-5 relative z-10">
            <p className="text-xs sm:text-sm text-zinc-400">
              ليس لديك حساب بعد؟{" "}
              <Link href="/register" className="font-black text-[var(--theme-accent,#FDE68A)] hover:underline">
                إنشاء حساب جديد
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- MODERN SPLIT-SCREEN LAYOUT (Visual Match with Screenshots) ---
  return (
    <div
      id="login-page-container"
      className="min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-6 lg:p-10 transition-colors duration-200"
      dir="rtl"
      style={{
        backgroundColor: "var(--auth-bg-color, var(--theme-background, #121212))",
        color: "var(--auth-text-color, var(--theme-text-primary, inherit))",
        fontFamily: "var(--theme-font-arabic, 'Cairo', sans-serif)",
      }}
    >
      {/* Outer Card Container */}
      <div
        id="login-card"
        className="w-full max-w-4xl shadow-2xl rounded-3xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800 flex flex-col lg:flex-row transition-all duration-200"
        style={{
          backgroundColor: "var(--auth-card-color, var(--theme-card, #1E1E1E))",
          borderRadius: "var(--theme-border-radius, 24px)",
        }}
      >
        {/* ================= BRANDING COLUMN ================= */}
        {/* On mobile: at top with compact height. On desktop: on the right (first child in RTL flex-row) */}
        <div
          id="login-branding-panel"
          className="w-full lg:w-1/2 p-6 sm:p-8 lg:p-12 flex flex-col justify-between items-center text-center relative overflow-hidden transition-colors duration-200"
          style={{
            backgroundColor: authConfig.common.styles.brandingBgColor || "var(--auth-button-color, var(--theme-primary, #C8A45C))",
            color: authConfig.common.styles.brandingTextColor || "#FFFFFF",
          }}
        >
          {/* Subtle background ambient circles */}
          <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-black/10 blur-2xl pointer-events-none" />

          {/* Centered Brand Content */}
          <div className="my-auto py-2 sm:py-6 flex flex-col items-center z-10 w-full">
            {/* Big Icon in rounded translucent square */}
            <div
              id="login-brand-icon-box"
              className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-2xl sm:rounded-3xl bg-white/20 dark:bg-black/15 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/25 mb-4 sm:mb-6 transition-transform hover:scale-105 duration-300"
            >
              {renderAuthIcon(authConfig.login.branding.icon || "LogIn", "w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white drop-shadow-sm")}
            </div>

            {/* Title & Subtitle */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight mb-2 drop-shadow-xs" style={{ color: authConfig.common.styles.brandingTextColor || "#FFFFFF" }}>
              {authConfig.login.branding.title}
            </h2>
            <p className="text-xs sm:text-sm lg:text-base opacity-90 font-medium max-w-xs leading-relaxed">
              {authConfig.login.branding.subtitle}
            </p>

            {/* Features List (Visible on desktop & tablet, hidden on compact mobile) */}
            {authConfig.login.branding.benefits && authConfig.login.branding.benefits.length > 0 && (
              <div className="hidden sm:flex flex-col gap-3.5 mt-6 sm:mt-8 w-full max-w-xs text-right">
                {authConfig.login.branding.benefits.map((b, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-black/10 dark:bg-black/20 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/10">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      {renderAuthIcon(b.icon, "w-4 h-4 text-white")}
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-white">{b.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ================= FORM COLUMN ================= */}
        {/* Form area: Left on desktop (second child in RTL flex-row), bottom on mobile */}
        <div
          id="login-form-panel"
          className="w-full lg:w-1/2 p-6 sm:p-8 lg:p-12 flex flex-col justify-center text-zinc-900 dark:text-zinc-100"
          style={{
            backgroundColor: "var(--auth-card-color, var(--theme-card, #1E1E1E))",
            color: "var(--auth-text-color, var(--theme-text-primary, inherit))",
          }}
        >
          <div className="w-full max-w-md mx-auto">
            {/* Header */}
            <div className="mb-6 sm:mb-8 text-right">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: authConfig.common.styles.titleColor }}>
                {authConfig.login.title}
              </h1>
              <p className="text-xs sm:text-sm mt-1 font-medium" style={{ color: authConfig.common.styles.subtitleColor }}>
                {authConfig.login.subtitle}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                id="login-error-alert"
                className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn"
              >
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* Username / Email Field */}
              <div id="login-field-identifier">
                <label className="block text-xs sm:text-sm font-bold mb-1.5 text-right" style={{ color: authConfig.common.styles.labelColor }}>
                  {authConfig.login.fields.usernameLabel}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                    <User size={19} />
                  </div>
                  <input
                    type="text"
                    id="login-input-identifier"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={authConfig.login.fields.usernamePlaceholder}
                    disabled={loading}
                    className="w-full rounded-xl sm:rounded-2xl pr-11 pl-4 py-3 sm:py-3.5 text-sm transition duration-150 border-2"
                    style={{
                      backgroundColor: authConfig.common.styles.inputBgColor,
                      color: authConfig.common.styles.inputTextColor,
                      borderColor: authConfig.common.styles.inputBorderColor,
                    }}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div id="login-field-password">
                <label className="block text-xs sm:text-sm font-bold mb-1.5 text-right" style={{ color: authConfig.common.styles.labelColor }}>
                  {authConfig.login.fields.passwordLabel}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                    <Lock size={19} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="login-input-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={authConfig.login.fields.passwordPlaceholder}
                    disabled={loading}
                    className="w-full rounded-xl sm:rounded-2xl pr-11 pl-11 py-3 sm:py-3.5 text-sm transition duration-150 border-2"
                    style={{
                      backgroundColor: authConfig.common.styles.inputBgColor,
                      color: authConfig.common.styles.inputTextColor,
                      borderColor: authConfig.common.styles.inputBorderColor,
                    }}
                  />
                  <button
                    type="button"
                    id="login-toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="login-submit-button"
                disabled={loading}
                className="w-full min-h-[48px] sm:min-h-[52px] font-black py-3 px-5 rounded-xl sm:rounded-2xl shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-95 active:scale-[0.99] mt-2"
                style={{
                  backgroundColor: authConfig.common.styles.buttonBgColor || "var(--auth-button-color, var(--theme-primary, #C8A45C))",
                  color: authConfig.common.styles.buttonTextColor || "#1A1A1A",
                  boxShadow: "0 10px 20px -5px rgba(200, 164, 92, 0.35)",
                }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{authConfig.login.fields.submitButtonText}</span>
                )}
              </button>

              {/* Forgot Password Link */}
              {authConfig.login.fields.showForgotPassword && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    id="login-forgot-password"
                    onClick={handleForgotPassword}
                    className="text-xs sm:text-sm hover:underline transition font-medium cursor-pointer"
                    style={{ color: authConfig.common.styles.titleColor }}
                  >
                    {authConfig.login.fields.forgotPasswordText}
                  </button>
                </div>
              )}

              {/* Divider */}
              {authConfig.login.showDivider && (
                <div className="relative flex items-center justify-center my-4 sm:my-5">
                  <div className="grow border-t border-zinc-200 dark:border-zinc-700/80" />
                  <span className="shrink-0 px-3 text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                    {authConfig.login.dividerText}
                  </span>
                  <div className="grow border-t border-zinc-200 dark:border-zinc-700/80" />
                </div>
              )}

              {/* Google Sign-In Button */}
              {authConfig.login.showGoogleButton && (
                <button
                  type="button"
                  id="login-google-button"
                  onClick={handleGoogleLogin}
                  className="w-full min-h-[48px] bg-white dark:bg-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-700 rounded-xl sm:rounded-2xl py-3 px-4 flex items-center justify-center gap-3 text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-200 transition-all duration-150 cursor-pointer shadow-xs active:scale-[0.99]"
                >
                  <GoogleIcon className="w-5 h-5 shrink-0" />
                  <span>{authConfig.login.googleButtonText}</span>
                </button>
              )}

              {/* Register Link */}
              <div className="pt-3 text-center text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                {authConfig.login.fields.switchToRegisterText}{" "}
                <Link
                  href="/register"
                  id="login-to-register-link"
                  className="font-bold underline-offset-4 hover:underline transition"
                  style={{ color: authConfig.common.styles.titleColor }}
                >
                  {authConfig.login.fields.switchToRegisterLink}
                </Link>
              </div>

              {/* Back to Home Link */}
              <div className="pt-2 text-center">
                <Link
                  href="/"
                  id="login-back-to-home"
                  className="inline-flex items-center gap-2 text-xs sm:text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition font-semibold"
                >
                  <span>{authConfig.common.backToHomeText}</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
