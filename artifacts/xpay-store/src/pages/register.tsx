import { useState } from "react";
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
  const { login } = useAuth();
  const [, setLocation] = useLocation();

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
        toast.success("تم إنشاء الحساب بنجاح! مرحباً بك في ShadMini.");
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
    <div className="min-h-[100dvh] flex flex-col justify-center items-center p-4 sm:p-6 bg-[#F5F2EB]" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#D1D5DB]">
        {/* Header with Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-[#1A1A1A] border-2 border-[#C8A45C] text-[#C8A45C] text-2xl font-black items-center justify-center shadow-lg shadow-[#C8A45C]/20 mb-3">
            SM
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-wide">
            إنشاء حساب جديد
          </h1>
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
              اسم المستخدم
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <User size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثال: ahmed99"
                disabled={loading}
                className="w-full bg-[#FFFFFF] border border-[#D1D5DB] rounded-xl pr-10 pl-3 py-3 text-sm text-[#111827] placeholder:text-slate-400 focus:outline-none focus:border-[#C8A45C] focus:ring-2 focus:ring-[#C8A45C]/20 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@domain.com"
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

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              تأكيد كلمة المرور
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full bg-[#FFFFFF] border border-[#D1D5DB] rounded-xl pr-10 pl-3 py-3 text-sm text-[#111827] placeholder:text-slate-400 focus:outline-none focus:border-[#C8A45C] focus:ring-2 focus:ring-[#C8A45C]/20 transition"
              />
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
                <UserPlus size={18} />
                <span>إنشاء الحساب</span>
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-6 text-center border-t border-slate-100 pt-5">
          <p className="text-xs sm:text-sm text-slate-600">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="font-bold text-[#C8A45C] hover:text-[#B8954A] underline underline-offset-4">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
