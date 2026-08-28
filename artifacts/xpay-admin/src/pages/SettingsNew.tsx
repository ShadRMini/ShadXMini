import React, { useState, useEffect, useCallback } from "react";
import { get, put } from "../lib/api";
import {
  Settings,
  Store,
  Palette,
  ShieldCheck,
  Globe,
  Bell,
  Key,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Upload,
  Trash2,
  Copy,
  RefreshCw,
  Info,
  Mail,
  Phone,
  MapPin,
  Clock,
  Coins,
  Sparkles
} from "lucide-react";

export default function SettingsNew() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "branding" | "security" | "regional" | "notifications" | "integrations">("general");

  // Feedback State
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Show/Hide Sensitive API Keys State
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Logo upload preview & Drag state
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

  const showToastMsg = useCallback((text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // Fetch Settings
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setValidationErrors({});
    try {
      // First try /admin/settings, fallback to /settings/list
      let fetched: Record<string, any> = {};
      try {
        const data = await get<Record<string, any>>("/admin/settings");
        fetched = data || {};
      } catch {
        const arr = await get<any[]>("/settings/list");
        if (Array.isArray(arr)) {
          arr.forEach((item) => {
            fetched[item.key] = item.value;
          });
        }
      }

      setSettings(fetched);
      if (fetched.brand_logo_url || fetched.site_logo || fetched.store_logo) {
        setLogoPreview(fetched.brand_logo_url || fetched.site_logo || fetched.store_logo);
      }
    } catch (err: any) {
      console.error("Failed to load settings:", err);
      showToastMsg(err?.message || "فشل تحميل إعدادات لوحة التحكم", "error");
    } finally {
      setLoading(false);
    }
  }, [showToastMsg]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Handle Input Changes
  const handleValueChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (validationErrors[key]) {
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  // Toggle API Key Visibility
  const toggleKeyVisibility = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (keyName: string, value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
    showToastMsg("تم نسخ المفتاح إلى الحافظة بنجاح");
  };

  // Logo File Upload Handling
  const processLogoFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToastMsg("يرجى اختيار صورة صالحة (PNG, JPG, WEBP)", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToastMsg("حجم الصورة يجب أن لا يتجاوز 2 ميجابايت", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setLogoPreview(result);
      handleValueChange("brand_logo_url", result);
      handleValueChange("site_logo", result);
      showToastMsg("تم اختيار الشعار الجديد والمعاينة متوفرة الآن");
    };
    reader.readAsDataURL(file);
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingLogo(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processLogoFile(e.dataTransfer.files[0]);
    }
  };

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processLogoFile(e.target.files[0]);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    handleValueChange("brand_logo_url", "");
    handleValueChange("site_logo", "");
    showToastMsg("تم إزالة الشعار");
  };

  // Inline Form Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (settings.support_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(settings.support_email)) {
        errors.support_email = "صيغة البريد الإلكتروني غير صحيحة";
      }
    }

    if (settings.exchange_rate) {
      const rate = Number(settings.exchange_rate);
      if (isNaN(rate) || rate <= 0) {
        errors.exchange_rate = "سعر الصرف يجب أن يكون رقماً موجباً";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Form
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) {
      showToastMsg("يرجى تصحيح الأخطاء الموضحة في النموذج", "error");
      return;
    }

    setSaving(true);
    try {
      const items = Object.entries(settings).map(([k, v]) => ({ key: k, value: v }));
      
      try {
        await put("/admin/settings", settings);
      } catch {
        await put("/settings/items", { items });
      }

      showToastMsg("تم حفظ جميع الإعدادات وتحديث النظام بنجاح!", "success");
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      showToastMsg(err?.message || "حدث خطأ أثناء حفظ الإعدادات", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-zinc-100" dir="rtl">
      {/* Toast Feedback */}
      {toast && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl border shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce transition-all ${
            toast.type === "success"
              ? "bg-emerald-950 border-emerald-500/50 text-emerald-300"
              : "bg-red-950 border-red-500/50 text-red-300"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#242424] p-5 rounded-2xl border border-[#C8A45C]/20 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#C8A45C]/10 border border-[#C8A45C]/30 flex items-center justify-center text-[#C8A45C]">
            <Settings size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#FDE68A] flex items-center gap-2">
              الإعدادات العامة للنظام (الواجهة الجديدة)
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              تخصيص هوية المتجر، خيارات الأمان، إعدادات الدفع، والتكاملات البرمجية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchSettings}
            className="p-2.5 text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition border border-zinc-700 cursor-pointer"
            title="تحديث الإعدادات"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={() => handleSaveSettings()}
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#C8A45C] to-[#B38F46] text-black font-bold rounded-xl hover:brightness-110 transition shadow-lg cursor-pointer disabled:opacity-50 text-xs"
          >
            <Save size={16} />
            <span>{saving ? "جاري الحفظ..." : "حفظ التغييرات"}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="bg-[#242424] p-2 rounded-2xl border border-[#C8A45C]/20 shadow-md overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "general"
                ? "bg-[#C8A45C]/20 text-[#FDE68A] border border-[#C8A45C]/40"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Store size={16} />
            <span>عام</span>
          </button>

          <button
            onClick={() => setActiveTab("branding")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "branding"
                ? "bg-[#C8A45C]/20 text-[#FDE68A] border border-[#C8A45C]/40"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Palette size={16} />
            <span>المظهر والعلامة التجارية</span>
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "security"
                ? "bg-[#C8A45C]/20 text-[#FDE68A] border border-[#C8A45C]/40"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <ShieldCheck size={16} />
            <span>الأمان والصلاحيات</span>
          </button>

          <button
            onClick={() => setActiveTab("regional")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "regional"
                ? "bg-[#C8A45C]/20 text-[#FDE68A] border border-[#C8A45C]/40"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Globe size={16} />
            <span>الإقليمية والعملات</span>
          </button>

          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "notifications"
                ? "bg-[#C8A45C]/20 text-[#FDE68A] border border-[#C8A45C]/40"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Bell size={16} />
            <span>الإشعارات والبريد</span>
          </button>

          <button
            onClick={() => setActiveTab("integrations")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "integrations"
                ? "bg-[#C8A45C]/20 text-[#FDE68A] border border-[#C8A45C]/40"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Key size={16} />
            <span>التكاملات ومفاتيح API</span>
          </button>
        </div>
      </div>

      {/* Settings Forms Body */}
      <div className="bg-[#242424] p-6 rounded-2xl border border-[#C8A45C]/20 shadow-xl min-h-[420px]">
        {loading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-6 bg-zinc-800 rounded-lg w-1/4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-20 bg-zinc-800 rounded-xl" />
              <div className="h-20 bg-zinc-800 rounded-xl" />
              <div className="h-20 bg-zinc-800 rounded-xl" />
              <div className="h-20 bg-zinc-800 rounded-xl" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
            {/* ==================== TAB 1: GENERAL ==================== */}
            {activeTab === "general" && (
              <div className="space-y-5 animate-fadeIn">
                <div className="border-b border-zinc-800 pb-3">
                  <h2 className="text-base font-bold text-[#FDE68A] flex items-center gap-2">
                    <Store size={18} className="text-[#C8A45C]" />
                    معلومات المتجر الأساسية
                  </h2>
                  <p className="text-zinc-400 text-[11px] mt-0.5">
                    البيانات العامة الهامة التي تظهر للعملاء والمستخدمين
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Store Name */}
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      اسم المتجر / التطبيق <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.site_name ?? settings.store_name ?? "ShadMini"}
                      onChange={(e) => {
                        handleValueChange("site_name", e.target.value);
                        handleValueChange("store_name", e.target.value);
                      }}
                      placeholder="اسم متجرك..."
                      className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3.5 py-2.5 rounded-xl outline-none"
                    />
                  </div>

                  {/* Store Description */}
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      الوصف القصير للمتجر
                    </label>
                    <input
                      type="text"
                      value={settings.site_description ?? settings.store_description ?? ""}
                      onChange={(e) => {
                        handleValueChange("site_description", e.target.value);
                        handleValueChange("store_description", e.target.value);
                      }}
                      placeholder="وصف مختصر لمجال عملك..."
                      className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3.5 py-2.5 rounded-xl outline-none"
                    />
                  </div>

                  {/* Admin Official Email */}
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1 flex items-center justify-between">
                      <span>البريد الإلكتروني الرسمي</span>
                      {validationErrors.support_email && (
                        <span className="text-red-400 text-[10px]">{validationErrors.support_email}</span>
                      )}
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="email"
                        value={settings.support_email ?? settings.admin_email ?? ""}
                        onChange={(e) => {
                          handleValueChange("support_email", e.target.value);
                          handleValueChange("admin_email", e.target.value);
                        }}
                        placeholder="admin@example.com"
                        className={`w-full bg-[#1A1A1A] border ${
                          validationErrors.support_email ? "border-red-500" : "border-zinc-700 focus:border-[#C8A45C]"
                        } text-white pr-9 pl-3 py-2.5 rounded-xl outline-none`}
                      />
                    </div>
                  </div>

                  {/* Support Phone / WhatsApp */}
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      رقم هاتف / واتساب الدعم الفني
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        value={settings.support_phone ?? settings.support_whatsapp ?? ""}
                        onChange={(e) => {
                          handleValueChange("support_phone", e.target.value);
                          handleValueChange("support_whatsapp", e.target.value);
                        }}
                        placeholder="+963 9xx xxx xxx"
                        className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white pr-9 pl-3 py-2.5 rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  {/* Support Telegram */}
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      معرف تليغرام / قناة الدعم الفني
                    </label>
                    <input
                      type="text"
                      value={settings.telegram_channel ?? settings.support_telegram ?? ""}
                      onChange={(e) => {
                        handleValueChange("telegram_channel", e.target.value);
                        handleValueChange("support_telegram", e.target.value);
                      }}
                      placeholder="@support_handle"
                      className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3.5 py-2.5 rounded-xl outline-none"
                    />
                  </div>
                </div>

                {/* Announcement Popup Settings */}
                <div className="pt-4 border-t border-zinc-800 space-y-4">
                  <h3 className="font-bold text-white text-xs flex items-center gap-2">
                    <Sparkles size={16} className="text-[#C8A45C]" />
                    إعدادات الإعلان المنبثق في الصفحة الرئيسية
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800">
                      <span className="font-semibold text-zinc-300">تفعيل نافذة الإعلان المنبثقة</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.store_popup_enabled === "true" || settings.store_popup_enabled === true}
                          onChange={(e) => handleValueChange("store_popup_enabled", String(e.target.checked))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C8A45C]"></div>
                      </label>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-zinc-300 font-semibold mb-1">
                        نص الإعلان المنبثق للزوار
                      </label>
                      <input
                        type="text"
                        value={settings.store_popup_message ?? settings.store_popup_text ?? ""}
                        onChange={(e) => {
                          handleValueChange("store_popup_message", e.target.value);
                          handleValueChange("store_popup_text", e.target.value);
                        }}
                        placeholder="مرحباً بك في متجرنا! خصومات مميزة بمناسبة الافتتاح..."
                        className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3.5 py-2.5 rounded-xl outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 2: BRANDING ==================== */}
            {activeTab === "branding" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="border-b border-zinc-800 pb-3">
                  <h2 className="text-base font-bold text-[#FDE68A] flex items-center gap-2">
                    <Palette size={18} className="text-[#C8A45C]" />
                    المظهر والشعار والعلامة التجارية
                  </h2>
                  <p className="text-zinc-400 text-[11px] mt-0.5">
                    تحكم في الشعار وألوان النظام مع معاينة فورية ومباشرة للتغييرات
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Logo Upload Box (lg:col-span-7) */}
                  <div className="lg:col-span-7 space-y-4">
                    <label className="block text-zinc-300 font-semibold">شعار المتجر الرسمي (Store Logo)</label>

                    {/* Drag & Drop Area */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingLogo(true);
                      }}
                      onDragLeave={() => setIsDraggingLogo(false)}
                      onDrop={handleLogoDrop}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center gap-3 ${
                        isDraggingLogo
                          ? "border-[#C8A45C] bg-[#C8A45C]/10"
                          : "border-zinc-700 hover:border-[#C8A45C]/50 bg-[#1A1A1A]"
                      }`}
                    >
                      {logoPreview ? (
                        <div className="space-y-3">
                          <div className="w-24 h-24 mx-auto p-2 bg-[#242424] rounded-2xl border border-[#C8A45C]/40 flex items-center justify-center shadow-lg overflow-hidden">
                            <img src={logoPreview} alt="Store Logo" className="max-w-full max-h-full object-contain" />
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <label className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg cursor-pointer border border-zinc-700 transition">
                              تغيير الصورة
                              <input type="file" accept="image/*" onChange={handleLogoFileSelect} className="hidden" />
                            </label>
                            <button
                              type="button"
                              onClick={handleRemoveLogo}
                              className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                            >
                              <Trash2 size={13} />
                              إزالة الشعار
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-full bg-[#C8A45C]/10 flex items-center justify-center text-[#C8A45C]">
                            <Upload size={22} />
                          </div>
                          <div>
                            <p className="font-bold text-white text-xs">قم بإسقاط الصورة هنا أو انقر للاختيار</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">يدعم PNG, JPG, WEBP بحجم أقصى 2MB</p>
                          </div>
                          <label className="px-4 py-2 bg-gradient-to-r from-[#C8A45C] to-[#B38F46] text-black font-bold text-xs rounded-xl cursor-pointer hover:brightness-110 transition shadow">
                            اختر صورة من جهازك
                            <input type="file" accept="image/*" onChange={handleLogoFileSelect} className="hidden" />
                          </label>
                        </>
                      )}
                    </div>

                    {/* Logo URL alternative */}
                    <div>
                      <label className="block text-zinc-400 text-[11px] mb-1">أو أدخل رابط مباشر للصورة (URL)</label>
                      <input
                        type="text"
                        value={settings.brand_logo_url ?? settings.site_logo ?? ""}
                        onChange={(e) => {
                          handleValueChange("brand_logo_url", e.target.value);
                          handleValueChange("site_logo", e.target.value);
                          setLogoPreview(e.target.value);
                        }}
                        placeholder="https://example.com/logo.png"
                        className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3.5 py-2.5 rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  {/* Live Preview Card (lg:col-span-5) */}
                  <div className="lg:col-span-5 space-y-4">
                    <label className="block text-zinc-300 font-semibold">المعاينة الحية لهوية المتجر</label>

                    <div className="bg-[#1A1A1A] border border-[#C8A45C]/30 rounded-2xl p-5 space-y-4 shadow-2xl relative overflow-hidden">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                        <div className="flex items-center gap-2.5">
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo Preview" className="w-8 h-8 rounded-lg object-contain bg-[#242424] p-1 border border-zinc-700" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-[#C8A45C]/20 text-[#FDE68A] font-black flex items-center justify-center">
                              {((settings.site_name || "S") as string).charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-white text-xs">{settings.site_name || "ShadMini Store"}</div>
                            <div className="text-[10px] text-zinc-400">{settings.site_description || "متجر الخدمات الفاخرة"}</div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          متصل
                        </span>
                      </div>

                      <div className="p-3 bg-[#242424] rounded-xl border border-zinc-800 space-y-2">
                        <div className="text-[11px] font-bold text-[#FDE68A]">بطاقة إيضاحية تجريبية</div>
                        <p className="text-[10px] text-zinc-400">هكذا ستبدو عناصر واجهة المتجر الخاصة بك للعملاء.</p>
                        <button
                          type="button"
                          className="w-full py-2 bg-gradient-to-r from-[#C8A45C] to-[#B38F46] text-black font-bold text-xs rounded-lg shadow"
                        >
                          زر الإجراء الرئيسي
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 3: SECURITY ==================== */}
            {activeTab === "security" && (
              <div className="space-y-5 animate-fadeIn">
                <div className="border-b border-zinc-800 pb-3">
                  <h2 className="text-base font-bold text-[#FDE68A] flex items-center gap-2">
                    <ShieldCheck size={18} className="text-[#C8A45C]" />
                    الأمان وسياسات الحماية
                  </h2>
                  <p className="text-zinc-400 text-[11px] mt-0.5">
                    ضبط معايير الأمان وحماية حسابات المشرفين والأعضاء
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Registration Open Switch */}
                  <div className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-2xl border border-zinc-800">
                    <div>
                      <div className="font-bold text-white text-xs">السماح بتسجيل حسابات جديدة</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">فتح أو إغلاق التسجيل المباشر بالموقع</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.registration_open === "true" || settings.registration_open === true}
                        onChange={(e) => handleValueChange("registration_open", String(e.target.checked))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C8A45C]"></div>
                    </label>
                  </div>

                  {/* Session Timeout */}
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      مهلة انتهاء الجلسة (بالدقائق)
                    </label>
                    <div className="relative">
                      <Clock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="number"
                        min={1}
                        value={settings.session_timeout_minutes ?? 60}
                        onChange={(e) => handleValueChange("session_timeout_minutes", e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white pr-9 pl-3 py-2.5 rounded-xl outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 4: REGIONAL ==================== */}
            {activeTab === "regional" && (
              <div className="space-y-5 animate-fadeIn">
                <div className="border-b border-zinc-800 pb-3">
                  <h2 className="text-base font-bold text-[#FDE68A] flex items-center gap-2">
                    <Globe size={18} className="text-[#C8A45C]" />
                    الإعدادات الإقليمية والعملات
                  </h2>
                  <p className="text-zinc-400 text-[11px] mt-0.5">
                    ضبط العملات الافتراضية، أسعار الصرف، والمنطقة الزمنية
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* USD to SYP Exchange Rate */}
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1 flex items-center justify-between">
                      <span>سعر صرف 1$ مقابل الليرة السورية (SYP)</span>
                      {validationErrors.exchange_rate && (
                        <span className="text-red-400 text-[10px]">{validationErrors.exchange_rate}</span>
                      )}
                    </label>
                    <div className="relative">
                      <Coins size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="number"
                        step="any"
                        value={settings.exchange_rate ?? settings.currency_rate_usd_syp ?? 15000}
                        onChange={(e) => {
                          handleValueChange("exchange_rate", e.target.value);
                          handleValueChange("currency_rate_usd_syp", e.target.value);
                        }}
                        className={`w-full bg-[#1A1A1A] border ${
                          validationErrors.exchange_rate ? "border-red-500" : "border-zinc-700 focus:border-[#C8A45C]"
                        } text-white font-mono pr-9 pl-3 py-2.5 rounded-xl outline-none`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 5: NOTIFICATIONS ==================== */}
            {activeTab === "notifications" && (
              <div className="space-y-5 animate-fadeIn">
                <div className="border-b border-zinc-800 pb-3">
                  <h2 className="text-base font-bold text-[#FDE68A] flex items-center gap-2">
                    <Bell size={18} className="text-[#C8A45C]" />
                    الإشعارات وخادم البريد (SMTP)
                  </h2>
                  <p className="text-zinc-400 text-[11px] mt-0.5">
                    إعداد خادم SMTP لتنفيذ وتأكيد عمليات الإشعارات والبريد
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* SMTP Host */}
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">مضيف البريد (SMTP Host)</label>
                    <input
                      type="text"
                      value={settings.smtp_host ?? ""}
                      onChange={(e) => handleValueChange("smtp_host", e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3.5 py-2.5 rounded-xl outline-none"
                    />
                  </div>

                  {/* SMTP Password */}
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">كلمة مرور البريد (Password)</label>
                    <div className="relative">
                      <input
                        type={showKeys["smtp_pass"] ? "text" : "password"}
                        value={settings.smtp_pass ?? ""}
                        onChange={(e) => handleValueChange("smtp_pass", e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white pr-3.5 pl-10 py-2.5 rounded-xl outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility("smtp_pass")}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                      >
                        {showKeys["smtp_pass"] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 6: INTEGRATIONS & API KEYS ==================== */}
            {activeTab === "integrations" && (
              <div className="space-y-5 animate-fadeIn">
                <div className="border-b border-zinc-800 pb-3">
                  <h2 className="text-base font-bold text-[#FDE68A] flex items-center gap-2">
                    <Key size={18} className="text-[#C8A45C]" />
                    التكاملات ومفاتيح الربط البرمجي (API Keys)
                  </h2>
                  <p className="text-zinc-400 text-[11px] mt-0.5">
                    إدارة المفاتيح الحساسة للربط مع التلغرام وبوابات الدفع والمزودين الخارجيين
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Telegram Bot Token */}
                  <div className="p-4 bg-[#1A1A1A] rounded-2xl border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-white text-xs flex items-center gap-2">
                        <span>Telegram Bot Token</span>
                        <span className="text-[10px] text-zinc-500 font-normal">(لإرسال إشعارات التلغرام)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("telegram_bot_token", settings.telegram_bot_token)}
                        className="text-zinc-400 hover:text-[#FDE68A] transition flex items-center gap-1 text-[11px]"
                      >
                        <Copy size={13} />
                        <span>{copiedKey === "telegram_bot_token" ? "تم النسخ!" : "نسخ"}</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showKeys["telegram_bot_token"] ? "text" : "password"}
                        value={settings.telegram_bot_token ?? ""}
                        onChange={(e) => handleValueChange("telegram_bot_token", e.target.value)}
                        placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                        className="w-full bg-[#242424] border border-zinc-700 focus:border-[#C8A45C] text-white font-mono text-xs pr-3.5 pl-10 py-2.5 rounded-xl outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility("telegram_bot_token")}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                      >
                        {showKeys["telegram_bot_token"] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Submit Action */}
            <div className="pt-6 border-t border-zinc-800 flex items-center justify-between">
              <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                <Info size={14} className="text-[#C8A45C]" />
                <span>يتم الحفظ والتحديث في قاعدة البيانات فوراً عند الضغط على "حفظ التغييرات".</span>
              </div>

              <button
                type="submit"
                disabled={saving || loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#C8A45C] to-[#B38F46] text-black font-bold rounded-xl hover:brightness-110 transition shadow-lg cursor-pointer disabled:opacity-50 text-xs"
              >
                <Save size={16} />
                <span>{saving ? "جاري الحفظ..." : "حفظ التغييرات"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
