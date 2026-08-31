import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Lock, User, Mail, Eye, EyeOff, UserPlus, AlertCircle } from "lucide-react";
import { toast } from "sonner";

function apiBaseUrl() {
  return (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
}

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || cleanUsername.length < 3) {
      setError("اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل.");
      return;
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("يرجى إدخال بريد إلكتروني صالح.");
      return;
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 خانات على الأقل.");
      return;
    }
    if (cleanPassword !== confirmPassword.trim()) {
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
          "Accept": "application/json",
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
        toast.success("تم إنشاء الحساب بنجاح! مرحباً بك في XPay.");
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
            <Link
              href="/"
              className="inline-flex rounded-2xl bg-[#1A1A1A] border-2 border-[#C8A45C] text-[#C8A45C] font-black items-center justify-center shadow-lg shadow-[#C8A45C]/20 mb-3 hover:scale-105 transition"
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
            إنشاء حساب جديد
          </h1>
          <p className="text-sm font-medium text-zinc-400 mt-1">
            انضم الآن إلى منصة <span className="text-[#C8A45C] font-bold">XPay</span>
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
              اسم المستخدم
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-500">
                <User size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثال: ahmed99"
                disabled={loading}
                className="w-full bg-[#3D3D3D] border border-[#4B5563] rounded-xl pr-10 pl-3 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#C8A45C] focus:ring-2 focus:ring-[#C8A45C]/25 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-500">
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@domain.com"
                disabled={loading}
                className="w-full bg-[#3D3D3D] border border-[#4B5563] rounded-xl pr-10 pl-3 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#C8A45C] focus:ring-2 focus:ring-[#C8A45C]/25 transition text-right"
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

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              تأكيد كلمة المرور
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-500">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full bg-[#3D3D3D] border border-[#4B5563] rounded-xl pr-10 pl-3 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#C8A45C] focus:ring-2 focus:ring-[#C8A45C]/25 transition"
              />
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
                <UserPlus size={18} />
                <span>إنشاء الحساب</span>
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-6 text-center border-t border-zinc-700/80 pt-5 relative z-10">
          <p className="text-xs sm:text-sm text-zinc-400">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="font-black text-[#FDE68A] hover:text-[#C8A45C] underline underline-offset-4">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
