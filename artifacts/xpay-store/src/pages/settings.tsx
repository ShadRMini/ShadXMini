import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  User,
  Mail,
  Lock,
  Camera,
  Check,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  Trash2,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
];

function apiBaseUrl() {
  return (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
}

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { user, token, updateUser, refreshUser } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setEmail(user.email || "");
      setAvatarUrl(user.avatarUrl || null);
    }
  }, [user]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار ملف صورة صالح (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error("حجم الصورة كبير جداً. الحد الأقصى هو 3 ميغابايت.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarUrl(result);
      toast.success("تم تحميل الصورة بنجاح.");
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    const clean = customUrl.trim();
    if (!clean) return;
    setAvatarUrl(clean);
    setShowUrlInput(false);
    setCustomUrl("");
    toast.success("تم تطبيق رابط الصورة.");
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    toast.info("تمت إزالة الصورة الرمزية.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Frontend Validations
    if (!cleanUsername || cleanUsername.length < 3) {
      setErrorMessage("اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل.");
      return;
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage("يرجى إدخال بريد إلكتروني صالح.");
      return;
    }

    // If new password is provided, validate rules
    if (newPassword) {
      if (newPassword.length < 6) {
        setErrorMessage("كلمة المرور الجديدة يجب أن تكون 6 خانات أو أكثر.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage("كلمة المرور الجديدة وتأكيدها غير متطابقين.");
        return;
      }
    }

    // If user has password or is setting one, check current password if required
    if (user?.hasPassword !== false && !currentPassword) {
      setErrorMessage("يرجى إدخال كلمة المرور الحالية لتأكيد التغييرات.");
      return;
    }

    setLoading(true);
    try {
      const baseUrl = apiBaseUrl();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const payload: Record<string, any> = {
        username: cleanUsername,
        email: cleanEmail,
        avatarUrl: avatarUrl,
      };

      if (currentPassword) {
        payload.currentPassword = currentPassword;
      }

      if (newPassword) {
        payload.newPassword = newPassword;
      }

      const res = await fetch(`${baseUrl}/api/users/me`, {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "تعذر تحديث الملف الشخصي. يرجى المحاولة لاحقاً.");
      }

      // Update AuthContext with fresh data
      if (data.user) {
        updateUser(data.user, data.token);
      } else {
        await refreshUser();
      }

      toast.success(data.message || "تم تحديث الملف الشخصي بنجاح!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Delay redirect slightly for pleasant UX feedback
      setTimeout(() => {
        setLocation("/profile");
      }, 700);
    } catch (err: any) {
      const message = err?.message || "حدث خطأ غير متوقع.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const displayName = username || user?.username || "عضو ShadMini";
  const displayInit = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-[85vh] max-w-3xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="bg-[#1A1A1A] border border-[#C8A45C]/30 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#C8A45C]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C8A45C]/15 border border-[#C8A45C]/30 text-[#C8A45C] text-xs font-bold mb-2">
              <ShieldCheck size={14} />
              <span>إدارة الحساب والأمان</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">إعدادات الحساب</h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-medium">
              تعديل بياناتك الشخصية، الصورة الرمزية، وتحديث كلمة المرور.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setLocation("/profile")}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 text-xs font-bold border border-zinc-700 transition"
          >
            <span>العودة للملف الشخصي</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 flex items-start gap-3 text-sm animate-in fade-in shadow-md">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Section 1: Avatar Editor */}
        <div className="bg-[#F5F2EB] border border-[#C8A45C]/30 rounded-3xl p-6 shadow-md">
          <h2 className="text-base font-extrabold text-[#111827] flex items-center gap-2 mb-4">
            <Camera className="w-5 h-5 text-[#C8A45C]" />
            الصورة الرمزية (الأفاتار)
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar Preview */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-[#C8A45C] shadow-lg bg-[#1A1A1A] flex items-center justify-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarUrl(null)}
                  />
                ) : (
                  <span className="text-4xl font-black text-[#C8A45C]">{displayInit}</span>
                )}
              </div>
              <label
                htmlFor="avatar-file-input"
                className="absolute -bottom-2 -left-2 bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] p-2 rounded-2xl cursor-pointer shadow-md transition transform active:scale-95"
                title="تحميل صورة"
              >
                <Camera size={16} />
                <input
                  id="avatar-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Avatar Controls */}
            <div className="flex-1 w-full space-y-3">
              <p className="text-xs text-slate-600 font-medium">
                اختر صورة تعبر عنك عبر تحميل ملف، أو إدخال رابط مباشر، أو اختيار أحد الرموز الجاهزة.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="avatar-file-input"
                  className="px-3.5 py-2 rounded-xl bg-[#1A1A1A] hover:bg-zinc-800 text-[#C8A45C] text-xs font-bold cursor-pointer transition border border-[#C8A45C]/30 flex items-center gap-1.5"
                >
                  <Camera size={14} />
                  <span>رفع صورة</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition border border-slate-300"
                >
                  رابط صورة
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition border border-red-200 flex items-center gap-1.5"
                  >
                    <Trash2 size={14} />
                    <span>حذف</span>
                  </button>
                )}
              </div>

              {/* Custom URL Input dropdown */}
              {showUrlInput && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200 animate-in fade-in">
                  <input
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-[#C8A45C]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    className="px-3 py-2 bg-[#C8A45C] text-[#1A1A1A] text-xs font-bold rounded-xl hover:bg-[#B8954A]"
                  >
                    تطبيق
                  </button>
                </div>
              )}

              {/* Avatar Presets */}
              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                  <Sparkles size={12} className="text-[#C8A45C]" />
                  نماذج سريعة
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {AVATAR_PRESETS.map((preset, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setAvatarUrl(preset)}
                      className={`w-9 h-9 rounded-xl overflow-hidden shrink-0 border-2 transition ${
                        avatarUrl === preset ? "border-[#C8A45C] scale-105 shadow-xs" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={preset} alt={`preset-${index}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Basic Profile Info */}
        <div className="bg-[#F5F2EB] border border-[#C8A45C]/30 rounded-3xl p-6 shadow-md space-y-4">
          <h2 className="text-base font-extrabold text-[#111827] flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-[#C8A45C]" />
            البيانات الأساسية
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>اسم المستخدم</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="اسم المستخدم (3 أحرف على الأقل)"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-2xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#C8A45C] focus:ring-2 focus:ring-[#C8A45C]/20 transition"
                />
                <User size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                يظهر اسم المستخدم في طلباتك وتفاعلاتك داخل المتجر.
              </p>
            </div>

            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>البريد الإلكتروني</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@domain.com"
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-2xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#C8A45C] focus:ring-2 focus:ring-[#C8A45C]/20 transition text-right"
                />
                <Mail size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                يستخدم لاستعادة الحساب واستقبال إشعارات الطلبات.
              </p>
            </div>
          </div>

          {/* Readonly Account Details */}
          <div className="pt-2 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white/80 p-3 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block">معرّف الحساب (ID)</span>
              <span className="text-xs font-mono font-black text-[#C8A45C]">
                {user?.displayId || user?.id || "---"}
              </span>
            </div>

            <div className="bg-white/80 p-3 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block">مستوى العضوية</span>
              <span className="text-xs font-black text-slate-800">
                {user?.vipBadge?.name || "عضوية عامة"}
              </span>
            </div>

            <div className="bg-white/80 p-3 rounded-2xl border border-slate-200 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-500 font-bold block">تاريخ الانضمام</span>
              <span className="text-xs font-bold text-slate-700">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("ar-EG") : "عضو مميز"}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Password & Security */}
        <div className="bg-[#F5F2EB] border border-[#C8A45C]/30 rounded-3xl p-6 shadow-md space-y-4">
          <h2 className="text-base font-extrabold text-[#111827] flex items-center gap-2 mb-2">
            <Lock className="w-5 h-5 text-[#C8A45C]" />
            الأمان وكلمة المرور
          </h2>

          {/* Current Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>كلمة المرور الحالية</span>
                {user?.hasPassword !== false && <span className="text-red-500">*</span>}
              </label>
              <span className="text-[11px] text-amber-700 font-semibold">مطلوبة لتأكيد أي تغييرات</span>
            </div>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية لتأكيد الحفظ"
                dir="ltr"
                className="w-full px-3.5 py-2.5 pr-10 pl-10 text-sm rounded-2xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#C8A45C] focus:ring-2 focus:ring-[#C8A45C]/20 transition text-right"
              />
              <Lock size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs font-extrabold text-slate-800 mb-3">
              تغيير كلمة المرور (اختياري):
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">كلمة المرور الجديدة</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="اتركها فارغة إذا لا ترغب بتغييرها"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 pr-10 pl-10 text-sm rounded-2xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#C8A45C] focus:ring-2 focus:ring-[#C8A45C]/20 transition text-right"
                  />
                  <Lock size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">6 خانات على الأقل</span>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">تأكيد كلمة المرور الجديدة</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 pr-10 pl-10 text-sm rounded-2xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#C8A45C] focus:ring-2 focus:ring-[#C8A45C]/20 transition text-right"
                  />
                  <Lock size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setLocation("/profile")}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 text-sm font-bold border border-slate-300 transition active:scale-95"
          >
            إلغاء
          </button>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] text-sm font-black shadow-lg shadow-[#C8A45C]/25 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Check size={18} />
                <span>حفظ التغييرات</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
