import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import {
  Lock,
  User,
  Mail,
  Eye,
  EyeOff,
  UserPlus,
  AlertCircle,
  ShieldCheck,
  Zap,
  Headphones,
  ArrowRight,
  Package,
  CheckCircle2,
  Circle,
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

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brandLogo, setBrandLogo] = useState<string>("");
  const [useLegacyLayout, setUseLegacyLayout] = useState<boolean>(false);
  const [authConfig, setAuthConfig] = useState<AuthPagesConfig>(DEFAULT_AUTH_PAGES_CONFIG);
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  // Dynamic real-time password criteria (simplified: 6+ chars, letter, number)
  const minRequiredLength = 6;
  const hasMinLength = password.length >= minRequiredLength;
  const hasLetter = /[A-Za-z\u0600-\u06FF]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  useEffect(() => {
    const baseUrl = apiBaseUrl();
    // Fetch auth pages configuration
    fetchAuthPagesConfig(baseUrl).then(({ config, useLegacy }) => {
      if (config) setAuthConfig(config);
      if (useLegacy) setUseLegacyLayout(true);
    });

    apiFetch<any>("/api/settings/public")
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

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanUsername || cleanUsername.length < 3) {
      setError("اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل.");
      return;
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("يرجى إدخال بريد إلكتروني صالح.");
      return;
    }
    if (cleanPassword.length < 6) {
      setError("كلمة المرور 6 أحرف على الأقل");
      return;
    }
    if (cleanPassword.length > 72) {
      setError("كلمة المرور طويلة جداً (72 حرفاً كحد أقصى)");
      return;
    }
    if (cleanPassword !== cleanConfirm) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setLoading(true);
    try {
      const baseUrl = apiBaseUrl();
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: cleanUsername,
          email: cleanEmail,
          password: cleanPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "فشل إنشاء الحساب. يرجى المحاولة لاحقاً.");
      }

      if (data.token && data.user) {
        login(data.token, data.user);
        toast.success("تم إنشاء الحساب بنجاح! مرحباً بك.");
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
      setError(err.message || "حدث خطأ أثناء إنشاء الحساب.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    toast.info("التسجيل عبر Google", {
      description: "التسجيل المباشر بحساب Google قيد التفعيل حالياً. يمكنك إنشاء حسابك الجديد عبر النموذج أدناه بكل سهولة.",
    });
  };

  // --- LEGACY SINGLE CARD LAYOUT (Fallback if use_legacy_auth_pages is true) ---
  if (useLegacyLayout) {
    return (
      <div
        className="min-h-[100dvh] flex flex-col justify-center items-center p-4 sm:p-6 transition-colors duration-200"
        style={{
          backgroundColor: "var(--auth-bg-color, var(--theme-background, #121212))",
          color: "var(--auth-text-color, var(--theme-text-primary, #FFFFFF))",
        }}
        dir="rtl"
      >
        <div
          className="w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border relative overflow-hidden"
          style={{
            backgroundColor: "var(--auth-card-color, var(--theme-card, #1E1E1E))",
            borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 40%, transparent)",
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
            <h1
              className="text-2xl sm:text-3xl font-black tracking-wide"
              style={{ color: "var(--theme-accent, #DFBD69)" }}
            >
              إنشاء حساب جديد
            </h1>
            <p
              className="text-sm font-medium mt-1"
              style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
            >
              انضم الآن إلى المنصة
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs sm:text-sm flex items-start gap-2.5 shadow-md">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <div>
              <label
                className="block text-xs font-bold mb-1.5"
                style={{ color: "var(--theme-text-secondary, #D4D4D8)" }}
              >
                اسم المستخدم
              </label>
              <div className="relative">
                <div
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none"
                  style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
                >
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: ahmed99"
                  disabled={loading}
                  className="w-full border rounded-xl pr-10 pl-3 py-3 text-sm focus:outline-none focus:border-[var(--theme-primary)] transition"
                  style={{
                    backgroundColor: "var(--theme-input-bg, #2A2A2A)",
                    borderColor: "var(--theme-border, #3A3A3A)",
                    color: "var(--theme-text-primary, #FFFFFF)",
                  }}
                />
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-bold mb-1.5"
                style={{ color: "var(--theme-text-secondary, #D4D4D8)" }}
              >
                البريد الإلكتروني
              </label>
              <div className="relative">
                <div
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none"
                  style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
                >
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@domain.com"
                  disabled={loading}
                  className="w-full border rounded-xl pr-10 pl-3 py-3 text-sm focus:outline-none focus:border-[var(--theme-primary)] transition"
                  style={{
                    backgroundColor: "var(--theme-input-bg, #2A2A2A)",
                    borderColor: "var(--theme-border, #3A3A3A)",
                    color: "var(--theme-text-primary, #FFFFFF)",
                  }}
                />
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-bold mb-1.5"
                style={{ color: "var(--theme-text-secondary, #D4D4D8)" }}
              >
                كلمة المرور
              </label>
              <div className="relative">
                <div
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none"
                  style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
                >
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full border rounded-xl pr-10 pl-10 py-3 text-sm focus:outline-none focus:border-[var(--theme-primary)] transition"
                  style={{
                    backgroundColor: "var(--theme-input-bg, #2A2A2A)",
                    borderColor: "var(--theme-border, #3A3A3A)",
                    color: "var(--theme-text-primary, #FFFFFF)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center hover:opacity-80 transition"
                  style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-bold mb-1.5"
                style={{ color: "var(--theme-text-secondary, #D4D4D8)" }}
              >
                تأكيد كلمة المرور
              </label>
              <div className="relative">
                <div
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none"
                  style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
                >
                  <Lock size={18} />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full border rounded-xl pr-10 pl-10 py-3 text-sm focus:outline-none focus:border-[var(--theme-primary)] transition"
                  style={{
                    backgroundColor: "var(--theme-input-bg, #2A2A2A)",
                    borderColor: "var(--theme-border, #3A3A3A)",
                    color: "var(--theme-text-primary, #FFFFFF)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center hover:opacity-80 transition"
                  style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full hover:brightness-95 active:scale-[0.98] font-black py-3.5 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50 mt-2"
              style={{
                backgroundColor: "var(--theme-primary, #C8A45C)",
                color: "var(--theme-background, #1A1A1A)",
              }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus size={18} />
                  <span>إنشاء الحساب</span>
                </>
              )}
            </button>
          </form>

          <div
            className="mt-6 text-center border-t pt-5 relative z-10"
            style={{ borderColor: "var(--theme-border, #3A3A3A)" }}
          >
            <p className="text-xs sm:text-sm" style={{ color: "var(--theme-text-muted, #9E9E9E)" }}>
              لديك حساب بالفعل؟{" "}
              <Link
                href="/login"
                className="font-black hover:underline"
                style={{ color: "var(--theme-accent, #DFBD69)" }}
              >
                تسجيل الدخول
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
      id="register-page-container"
      className="min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-6 lg:p-10 transition-colors duration-200"
      dir="rtl"
      style={{
        backgroundColor: "var(--auth-bg-color, var(--theme-background, #121212))",
        color: "var(--auth-text-color, var(--theme-text-primary, #FFFFFF))",
        fontFamily: "var(--theme-font-arabic, 'Cairo', sans-serif)",
      }}
    >
      {/* Outer Card Container */}
      <div
        id="register-card"
        className="w-full max-w-4xl shadow-2xl rounded-3xl overflow-hidden border flex flex-col lg:flex-row transition-all duration-200"
        style={{
          backgroundColor: "var(--auth-card-color, var(--theme-card, #1E1E1E))",
          borderColor: "var(--auth-border-color, var(--theme-border, #3A3A3A))",
          borderRadius: "var(--theme-border-radius, 24px)",
        }}
      >
        {/* ================= BRANDING COLUMN ================= */}
        {/* On mobile: at top with compact height. On desktop: on the right (first child in RTL flex-row) */}
        <div
          id="register-branding-panel"
          className="w-full lg:w-1/2 p-6 sm:p-8 lg:p-12 flex flex-col justify-between items-center text-center relative overflow-hidden transition-colors duration-200"
          style={{
            backgroundColor: authConfig.common.styles.brandingBgColor || "var(--auth-button-color, var(--theme-primary, #C8A45C))",
            color: authConfig.common.styles.brandingTextColor || "var(--theme-text-primary, #FFFFFF)",
          }}
        >
          {/* Ambient circles */}
          <div
            className="absolute -top-12 -left-12 w-48 h-48 rounded-full blur-2xl pointer-events-none"
            style={{ backgroundColor: "color-mix(in srgb, var(--theme-text-primary, #FFFFFF) 10%, transparent)" }}
          />
          <div
            className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full blur-2xl pointer-events-none"
            style={{ backgroundColor: "color-mix(in srgb, var(--theme-background, #121212) 15%, transparent)" }}
          />

          {/* Centered Content */}
          <div className="my-auto py-2 sm:py-6 flex flex-col items-center z-10 w-full">
            {/* Big Icon in rounded translucent square */}
            <div
              id="register-brand-icon-box"
              className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-2xl sm:rounded-3xl backdrop-blur-md flex items-center justify-center shadow-lg border mb-4 sm:mb-6 transition-transform hover:scale-105 duration-300"
              style={{
                backgroundColor: "color-mix(in srgb, var(--theme-text-primary, #FFFFFF) 20%, transparent)",
                borderColor: "color-mix(in srgb, var(--theme-text-primary, #FFFFFF) 25%, transparent)",
              }}
            >
              {renderAuthIcon(authConfig.register.branding.icon || "UserPlus", "w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 drop-shadow-sm")}
            </div>

            {/* Title & Subtitle */}
            <h2
              className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight mb-2 drop-shadow-xs"
              style={{ color: authConfig.common.styles.brandingTextColor || "var(--theme-text-primary, #FFFFFF)" }}
            >
              {authConfig.register.branding.title}
            </h2>
            <p className="text-xs sm:text-sm lg:text-base opacity-90 font-medium max-w-xs leading-relaxed">
              {authConfig.register.branding.subtitle}
            </p>

            {/* Feature List */}
            {authConfig.register.branding.benefits && authConfig.register.branding.benefits.length > 0 && (
              <div className="hidden sm:flex flex-col gap-3 mt-6 sm:mt-8 w-full max-w-xs text-right">
                {authConfig.register.branding.benefits.map((b, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 backdrop-blur-xs px-4 py-2.5 rounded-xl border"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--theme-background, #121212) 15%, transparent)",
                      borderColor: "color-mix(in srgb, var(--theme-text-primary, #FFFFFF) 15%, transparent)",
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "color-mix(in srgb, var(--theme-text-primary, #FFFFFF) 20%, transparent)" }}
                    >
                      {renderAuthIcon(b.icon, "w-4 h-4")}
                    </div>
                    <span className="text-xs sm:text-sm font-semibold">{b.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ================= FORM COLUMN ================= */}
        {/* Form area: Left on desktop (second child in RTL flex-row), bottom on mobile */}
        <div
          id="register-form-panel"
          className="w-full lg:w-1/2 p-6 sm:p-8 lg:p-12 flex flex-col justify-center"
          style={{
            backgroundColor: "var(--auth-card-color, var(--theme-card, #1E1E1E))",
            color: "var(--auth-text-color, var(--theme-text-primary, #FFFFFF))",
          }}
        >
          <div className="w-full max-w-md mx-auto">
            {/* Header */}
            <div className="mb-6 sm:mb-7 text-right">
              <h1
                className="text-2xl sm:text-3xl font-black tracking-tight"
                style={{ color: authConfig.common.styles.titleColor || "var(--auth-title-color, var(--theme-primary, #C8A45C))" }}
              >
                {authConfig.register.title}
              </h1>
              <p
                className="text-xs sm:text-sm mt-1 font-medium"
                style={{ color: authConfig.common.styles.subtitleColor || "var(--theme-text-muted, #9E9E9E)" }}
              >
                {authConfig.register.subtitle}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                id="register-error-alert"
                className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn"
              >
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Field */}
              <div id="register-field-username">
                <label
                  className="block text-xs sm:text-sm font-bold mb-1 text-right"
                  style={{ color: authConfig.common.styles.labelColor || "var(--auth-text-color, var(--theme-text-secondary, var(--theme-text-primary, #FFFFFF)))" }}
                >
                  {authConfig.register.fields.usernameLabel}
                </label>
                <div className="relative">
                  <div
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none"
                    style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
                  >
                    <User size={19} />
                  </div>
                  <input
                    type="text"
                    id="register-input-username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={authConfig.register.fields.usernamePlaceholder}
                    disabled={loading}
                    className="w-full rounded-xl sm:rounded-2xl pr-11 pl-4 py-3 text-sm transition duration-150 border-2"
                    style={{
                      backgroundColor: authConfig.common.styles.inputBgColor || "var(--theme-input-bg, var(--theme-background, #121212))",
                      color: authConfig.common.styles.inputTextColor || "var(--auth-text-color, var(--theme-text-primary, #FFFFFF))",
                      borderColor: authConfig.common.styles.inputBorderColor || "var(--auth-border-color, var(--theme-border, #3A3A3A))",
                    }}
                  />
                </div>
                {authConfig.register.fields.usernameHint && (
                  <p
                    className="text-[11px] mt-1 text-right"
                    style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
                  >
                    {authConfig.register.fields.usernameHint}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div id="register-field-password">
                <label
                  className="block text-xs sm:text-sm font-bold mb-1 text-right"
                  style={{ color: authConfig.common.styles.labelColor || "var(--auth-text-color, var(--theme-text-secondary, var(--theme-text-primary, #FFFFFF)))" }}
                >
                  {authConfig.register.fields.passwordLabel}
                </label>
                <div className="relative">
                  <div
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none"
                    style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
                  >
                    <Lock size={19} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="register-input-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={authConfig.register.fields.passwordPlaceholder}
                    disabled={loading}
                    className="w-full rounded-xl sm:rounded-2xl pr-11 pl-11 py-3 text-sm transition duration-150 border-2"
                    style={{
                      backgroundColor: authConfig.common.styles.inputBgColor || "var(--theme-input-bg, var(--theme-background, #121212))",
                      color: authConfig.common.styles.inputTextColor || "var(--auth-text-color, var(--theme-text-primary, #FFFFFF))",
                      borderColor: authConfig.common.styles.inputBorderColor || "var(--auth-border-color, var(--theme-border, #3A3A3A))",
                    }}
                  />
                  <button
                    type="button"
                    id="register-toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 pl-3.5 flex items-center hover:opacity-80 transition cursor-pointer"
                    style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Box */}
              {authConfig.register.passwordRequirements.enabled !== false && (
                <div
                  id="register-password-requirements-card"
                  className="p-3.5 rounded-2xl border text-right"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--theme-input-bg, #2A2A2A) 70%, transparent)",
                    borderColor: "var(--theme-border, #3A3A3A)",
                  }}
                >
                  <div
                    className="flex items-center gap-2 mb-2.5 font-bold text-xs"
                    style={{ color: "var(--theme-text-secondary, #D4D4D8)" }}
                  >
                    <ShieldCheck size={16} style={{ color: "var(--theme-primary, #C8A45C)" }} />
                    <span>{authConfig.register.passwordRequirements.title}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-y-2 gap-x-3 text-[11px]">
                    {/* Condition 1: min length (6+) */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                          hasMinLength ? "bg-emerald-500 shadow-xs shadow-emerald-500/50" : ""
                        }`}
                        style={!hasMinLength ? { backgroundColor: "var(--theme-border, #52525B)" } : undefined}
                      />
                      <span
                        className={hasMinLength ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}
                        style={!hasMinLength ? { color: "var(--theme-text-muted, #9E9E9E)" } : undefined}
                      >
                        6 أحرف على الأقل
                      </span>
                    </div>

                    {/* Condition 2: letter */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                          hasLetter ? "bg-emerald-500 shadow-xs shadow-emerald-500/50" : ""
                        }`}
                        style={!hasLetter ? { backgroundColor: "var(--theme-border, #52525B)" } : undefined}
                      />
                      <span
                        className={hasLetter ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}
                        style={!hasLetter ? { color: "var(--theme-text-muted, #9E9E9E)" } : undefined}
                      >
                        حرف
                      </span>
                    </div>

                    {/* Condition 3: number */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                          hasNumber ? "bg-emerald-500 shadow-xs shadow-emerald-500/50" : ""
                        }`}
                        style={!hasNumber ? { backgroundColor: "var(--theme-border, #52525B)" } : undefined}
                      />
                      <span
                        className={hasNumber ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}
                        style={!hasNumber ? { color: "var(--theme-text-muted, #9E9E9E)" } : undefined}
                      >
                        رقم
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirm Password Field */}
              <div id="register-field-confirm-password">
                <label
                  className="block text-xs sm:text-sm font-bold mb-1 text-right"
                  style={{ color: authConfig.common.styles.labelColor || "var(--auth-text-color, var(--theme-text-secondary, var(--theme-text-primary, #FFFFFF)))" }}
                >
                  {authConfig.register.fields.confirmPasswordLabel}
                </label>
                <div className="relative">
                  <div
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none"
                    style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
                  >
                    <Lock size={19} />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="register-input-confirm-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={authConfig.register.fields.confirmPasswordPlaceholder}
                    disabled={loading}
                    className="w-full rounded-xl sm:rounded-2xl pr-11 pl-11 py-3 text-sm transition duration-150 border-2"
                    style={{
                      backgroundColor: authConfig.common.styles.inputBgColor || "var(--theme-input-bg, var(--theme-background, #121212))",
                      color: authConfig.common.styles.inputTextColor || "var(--auth-text-color, var(--theme-text-primary, #FFFFFF))",
                      borderColor: authConfig.common.styles.inputBorderColor || "var(--auth-border-color, var(--theme-border, #3A3A3A))",
                    }}
                  />
                  <button
                    type="button"
                    id="register-toggle-confirm-password"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 left-0 pl-3.5 flex items-center hover:opacity-80 transition cursor-pointer"
                    style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
                    aria-label={showConfirmPassword ? "إخفاء تأكيد كلمة المرور" : "إظهار تأكيد كلمة المرور"}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Email Field */}
              <div id="register-field-email">
                <label
                  className="block text-xs sm:text-sm font-bold mb-1 text-right"
                  style={{ color: authConfig.common.styles.labelColor || "var(--auth-text-color, var(--theme-text-secondary, var(--theme-text-primary, #FFFFFF)))" }}
                >
                  {authConfig.register.fields.emailLabel}
                </label>
                <div className="relative">
                  <div
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none"
                    style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
                  >
                    <Mail size={19} />
                  </div>
                  <input
                    type="email"
                    id="register-input-email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={authConfig.register.fields.emailPlaceholder}
                    disabled={loading}
                    className="w-full rounded-xl sm:rounded-2xl pr-11 pl-4 py-3 text-sm transition duration-150 border-2 text-right"
                    style={{
                      backgroundColor: authConfig.common.styles.inputBgColor || "var(--theme-input-bg, var(--theme-background, #121212))",
                      color: authConfig.common.styles.inputTextColor || "var(--auth-text-color, var(--theme-text-primary, #FFFFFF))",
                      borderColor: authConfig.common.styles.inputBorderColor || "var(--auth-border-color, var(--theme-border, #3A3A3A))",
                    }}
                  />
                </div>
                {authConfig.register.emailVerification?.enabled !== false && (
                  <p
                    className="text-[11px] mt-1 text-right"
                    style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
                  >
                    {authConfig.register.emailVerification?.hintText}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="register-submit-button"
                disabled={loading}
                className="w-full min-h-[48px] sm:min-h-[52px] font-black py-3 px-5 rounded-xl sm:rounded-2xl shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-95 active:scale-[0.99] mt-3"
                style={{
                  backgroundColor: authConfig.common.styles.buttonBgColor || "var(--auth-button-color, var(--theme-primary, #C8A45C))",
                  color: authConfig.common.styles.buttonTextColor || "var(--theme-background, #1A1A1A)",
                  boxShadow: "0 10px 20px -5px color-mix(in srgb, var(--auth-button-color, var(--theme-primary, #C8A45C)) 35%, transparent)",
                }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{authConfig.register.fields.submitButtonText}</span>
                )}
              </button>

              {/* Divider */}
              {authConfig.register.showDivider !== false && (
                <div className="relative flex items-center justify-center my-4">
                  <div
                    className="grow border-t"
                    style={{ borderColor: "var(--theme-border, #3A3A3A)" }}
                  />
                  <span
                    className="shrink-0 px-3 text-xs font-medium"
                    style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
                  >
                    {authConfig.register.dividerText}
                  </span>
                  <div
                    className="grow border-t"
                    style={{ borderColor: "var(--theme-border, #3A3A3A)" }}
                  />
                </div>
              )}

              {/* Google Sign-Up Button */}
              {authConfig.register.showGoogleButton !== false && (
                <button
                  type="button"
                  id="register-google-button"
                  onClick={handleGoogleRegister}
                  className="w-full min-h-[48px] hover:brightness-110 border rounded-xl sm:rounded-2xl py-3 px-4 flex items-center justify-center gap-3 text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer shadow-xs active:scale-[0.99]"
                  style={{
                    backgroundColor: "var(--theme-input-bg, #2A2A2A)",
                    borderColor: "var(--theme-border, #3A3A3A)",
                    color: "var(--theme-text-primary, #FFFFFF)",
                  }}
                >
                  <GoogleIcon className="w-5 h-5 shrink-0" />
                  <span>{authConfig.register.googleButtonText}</span>
                </button>
              )}

              {/* Login Link */}
              <div
                className="pt-3 text-center text-xs sm:text-sm font-medium"
                style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
              >
                {authConfig.register.fields.switchToLoginText}{" "}
                <Link
                  href="/login"
                  id="register-to-login-link"
                  className="font-bold underline-offset-4 hover:underline transition"
                  style={{ color: authConfig.common.styles.titleColor || "var(--auth-title-color, var(--theme-primary, #C8A45C))" }}
                >
                  {authConfig.register.fields.switchToLoginLink}
                </Link>
              </div>

              {/* Back to Home Link */}
              <div className="pt-1 text-center">
                <Link
                  href="/"
                  id="register-back-to-home"
                  className="inline-flex items-center gap-2 text-xs sm:text-sm hover:opacity-80 transition font-semibold"
                  style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
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
