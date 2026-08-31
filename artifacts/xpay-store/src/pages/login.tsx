import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Lock, User, Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { toast } from "sonner";

function apiBaseUrl() {
  return (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
}

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brandLogo, setBrandLogo] = useState<string>("");
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const baseUrl = apiBaseUrl();
    fetch(`${baseUrl}/api/settings/public`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const logo = data?.brand_logo_url || data?.brandLogoUrl || data?.site_logo || data?.siteLogo || "";
        if (logo) setBrandLogo(logo);
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
          "Accept": "application/json",
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

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center items-center p-4 sm:p-6 bg-[#1A1A1A] text-white" dir="rtl">
      <div className="w-full max-w-md bg-[#2D2D2D] rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#C8A45C]/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#C8A45C]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header with Logo */}
        <div className="text-center mb-6 relative z-10 flex flex-col items-center">
          {brandLogo ? (
            <Link href="/" className="mb-4 inline-block hover:opacity-90 transition">
              <img
                src={brandLogo}
                alt="XPay"
                className="store-brand-logo object-contain rounded-2xl transition-all duration-200"
                style={{
                  height: "var(--theme-logo-size, 56px)",
                  maxHeight: "80px",
                  maxWidth: "calc(var(--theme-logo-size, 56px) * 3)",
                }}
              />
            </Link>
          ) : (
            <Link href="/" className="inline-flex rounded-2xl bg-[#1A1A1A] border-2 border-[#C8A45C] text-[#C8A45C] font-black items-center justify-center shadow-lg shadow-[#C8A45C]/20 mb-3 hover:scale-105 transition"
              style={{
                width: "var(--theme-logo-size, 56px)",
                height: "var(--theme-logo-size, 56px)",
                maxHeight: "72px",
                maxWidth: "72px",
                fontSize: "1.5rem",
              }}
            >
              XP
            </Link>
          )}
          <h1 className="text-2xl sm:text-3xl font-black text-[#FDE68A] tracking-wide">
            تسجيل الدخول
          </h1>
          <p className="text-sm font-medium text-zinc-400 mt-1">
            مرحباً بك مجددًا في متجر <span className="text-[#C8A45C] font-bold">XPay</span>
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs sm:text-sm flex items-start gap-2.5 shadow-md">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
        )}

        {/* Form */}
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
                className="w-full bg-[#3D3D3D] border border-[#4B5563] rounded-xl pr-10 pl-3 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#C8A45C] focus:ring-2 focus:ring-[#C8A45C]/25 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              كلمة المرور
            </label>
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
                className="w-full bg-[#3D3D3D] border border-[#4B5563] rounded-xl pr-10 pl-10 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#C8A45C] focus:ring-2 focus:ring-[#C8A45C]/25 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C8A45C] hover:bg-[#B8954A] active:scale-[0.98] text-[#1A1A1A] font-black py-3.5 px-4 rounded-xl shadow-lg shadow-[#C8A45C]/30 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={18} />
                <span>دخول الحساب</span>
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-6 text-center border-t border-zinc-700/80 pt-5 relative z-10">
          <p className="text-xs sm:text-sm text-zinc-400">
            ليس لديك حساب بعد؟{" "}
            <Link href="/register" className="font-black text-[#FDE68A] hover:text-[#C8A45C] underline underline-offset-4">
              إنشاء حساب جديد
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
