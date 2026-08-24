import { useState } from "react";
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
  const { login } = useAuth();
  const [, setLocation] = useLocation();

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
    <div className="min-h-[100dvh] flex flex-col justify-center items-center p-4 sm:p-6 bg-[#F5F2EB]" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#D1D5DB]">
        {/* Header with Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-[#1A1A1A] border-2 border-[#C8A45C] text-[#C8A45C] text-2xl font-black items-center justify-center shadow-lg shadow-[#C8A45C]/20 mb-3">
            SM
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-wide">
            تسجيل الدخول
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            مرحباً بك في متجر <span className="text-[#C8A45C] font-bold">ShadMini</span>
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اسم المستخدم أو البريد الإلكتروني
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <User size={18} />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="أدخل اسم المستخدم أو الإيميل"
                disabled={loading}
                className="w-full bg-[#FFFFFF] border border-[#D1D5DB] rounded-xl pr-10 pl-3 py-3 text-sm text-[#111827] placeholder:text-slate-400 focus:outline-none focus:border-[#C8A45C] focus:ring-2 focus:ring-[#C8A45C]/20 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              كلمة المرور
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full bg-[#FFFFFF] border border-[#D1D5DB] rounded-xl pr-10 pl-10 py-3 text-sm text-[#111827] placeholder:text-slate-400 focus:outline-none focus:border-[#C8A45C] focus:ring-2 focus:ring-[#C8A45C]/20 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 transition"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C8A45C] hover:bg-[#B8954A] active:scale-[0.98] text-[#1A1A1A] font-extrabold py-3.5 px-4 rounded-xl shadow-lg shadow-[#C8A45C]/30 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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
        <div className="mt-6 text-center border-t border-slate-100 pt-5">
          <p className="text-xs sm:text-sm text-slate-600">
            ليس لديك حساب بعد؟{" "}
            <Link href="/register" className="font-bold text-[#C8A45C] hover:text-[#B8954A] underline underline-offset-4">
              إنشاء حساب جديد
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
