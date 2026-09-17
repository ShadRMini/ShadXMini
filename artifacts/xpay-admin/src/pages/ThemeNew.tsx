import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { get, put, del, post } from "../lib/api";
import { applyAdminTheme, broadcastThemeChange, ensureGoogleFontsLoaded, DEFAULT_ADMIN_THEME } from "../lib/theme";
import { THEME_PRESETS, ThemePreset } from "../lib/theme-presets";
import ThemePresetCard from "../components/ThemePresetCard";
import ColorPickerField from "../components/ColorPickerField";

import AuthPagesSettings from "./AuthPagesSettings";
import ProductPageSettings from "./ProductPageSettings";
import AboutSettings from "./AboutSettings";
import ContactSettings from "./ContactSettings";
import BalanceCardSettings from "./BalanceCardSettings";

import {
  Palette,
  Sparkles,
  Save,
  RefreshCw,
  Sun,
  Moon,
  Sliders,
  Layers,
  Check,
  ImageIcon,
  LogIn,
  Package,
  Headphones,
  Wallet,
  Type,
  Maximize,
  Eye,
  Plus,
  Monitor,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

const GOOGLE_FONTS_ARABIC = ["Cairo", "Changa", "Almarai", "Tajawal", "Noto Kufi Arabic", "Readex Pro", "Alex Brush"];
const GOOGLE_FONTS_ENGLISH = ["Inter", "Poppins", "Roboto", "Montserrat", "Open Sans", "Lato"];

export const THEME_TABS = [
  { id: "general", label: "الهوية والمظهر (عام)", icon: Palette, badge: "الأساسي", desc: "أنماط جاهزة، ألوان، خطوط وشعار" },
  { id: "balance", label: "💳 بطاقة الرصيد والمحفظة", icon: Wallet, desc: "التحكم الكامل بتصميم وشكل بطاقة الرصيد" },
  { id: "auth", label: "صفحات الدخول والتسجيل", icon: LogIn, desc: "خلفيات ونصوص ومميزات شاشات الدخول" },
  { id: "product", label: "صفحة المنتج", icon: Package, desc: "ترتيب الأقسام، معاينة الشراء، وأزرار الطلب" },
  { id: "about", label: "صفحة من نحن", icon: Headphones, desc: "نصوص وأقسام ومعلومات المتجر" },
  { id: "contact", label: "تواصل معنا", icon: Headphones, desc: "قنوات الدعم الفني، وسائل التواصل والروابط" },
] as const;

export default function ThemeNew() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "general";

  const handleTabChange = (tabId: string) => {
    if (tabId === "general") {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("tab");
      setSearchParams(nextParams);
    } else {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", tabId);
      setSearchParams(nextParams);
    }
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Theme Presets list
  const [presets, setPresets] = useState<ThemePreset[]>(THEME_PRESETS);
  const [activePresetId, setActivePresetId] = useState<string>("gold");

  // Mode state: 'dark' | 'light' | 'auto'
  const [themeMode, setThemeMode] = useState<"dark" | "light" | "auto">("dark");

  // Core Theme Variables State
  const [theme, setTheme] = useState({
    theme_primary: "#C8A45C",
    theme_secondary: "#B8954A",
    theme_accent: "#FDE68A",
    theme_background: "#1A1A1A",
    theme_card: "#2D2D2D",
    theme_text_primary: "#FFFFFF",
    theme_text_secondary: "#E5E7EB",
    theme_text_muted: "#9CA3AF",
    theme_border: "rgba(200, 164, 92, 0.25)",
    theme_input_bg: "#3D3D3D",

    // Header & Nav
    theme_header_gradient_start: "#1A1A1A",
    theme_header_gradient_end: "#2D2D2D",
    theme_bottom_nav: "#1A1A1A",
    theme_bottom_nav_active: "#C8A45C",
    theme_sidebar_bg: "#1A1A1A",

    // Fonts
    theme_font_arabic: "Cairo",
    theme_font_english: "Inter",
    theme_font_size: "14",
    theme_heading_size: "20",

    // Shape & Effects
    theme_border_radius: "16",
    theme_shadow: "medium",
    theme_padding: "24",

    // Logo
    theme_logo_url: "",
    theme_logo_size: "80px",
    theme_logo_text_color: "#C8A45C",
  });

  const showToastMsg = useCallback((text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // Fetch Theme & Presets
  const fetchThemeSettings = useCallback(async () => {
    setLoading(true);
    try {
      let data: Record<string, any> = {};
      try {
        data = await get<Record<string, any>>("/admin/theme-settings");
      } catch {
        const arr = await get<any[]>("/settings/list");
        if (Array.isArray(arr)) {
          arr.forEach((s) => {
            if (s.key.startsWith("theme_")) data[s.key] = s.value;
          });
        }
      }

      // Fetch custom presets
      try {
        const serverPresets = await get<ThemePreset[]>("/admin/theme-presets");
        if (Array.isArray(serverPresets) && serverPresets.length > 0) {
          const merged = [...THEME_PRESETS];
          serverPresets.forEach((sp) => {
            if (!merged.some((p) => p.id === sp.id)) {
              merged.push(sp);
            }
          });
          setPresets(merged);
        }
      } catch {
        // Fallback to static presets
      }

      const mergedTheme = {
        ...DEFAULT_ADMIN_THEME,
        ...data,
      };

      setTheme(mergedTheme);
      setActivePresetId(data.theme_active_preset || "gold");
      setThemeMode((data.theme_mode as any) || "dark");

      applyAdminTheme(mergedTheme);
    } catch (err: any) {
      console.error("Failed to load theme settings:", err);
      showToastMsg("فشل جلب إعدادات التصميم من السيرفر", "error");
    } finally {
      setLoading(false);
    }
  }, [showToastMsg]);

  useEffect(() => {
    fetchThemeSettings();
  }, [fetchThemeSettings]);

  const handleFieldChange = (key: string, value: any) => {
    const updated = { ...theme, [key]: value };
    setTheme(updated);
    if (key.includes("font")) {
      ensureGoogleFontsLoaded(updated.theme_font_arabic, updated.theme_font_english);
    }
    applyAdminTheme(updated);
  };

  // Apply a preset
  const handleApplyPreset = (presetId: string) => {
    const found = presets.find((p) => p.id === presetId);
    if (!found) return;

    setActivePresetId(presetId);

    const modeKey = themeMode === "light" ? "light" : "dark";
    const palette = found[modeKey] || found.dark;

    const updated = {
      ...theme,
      theme_primary: palette.primary,
      theme_secondary: palette.secondary,
      theme_accent: palette.accent,
      theme_background: palette.background,
      theme_card: palette.card,
      theme_text_primary: palette.textPrimary,
      theme_text_secondary: palette.textSecondary,
      theme_text_muted: palette.textMuted,
      theme_border: palette.border,
      theme_input_bg: palette.inputBg,
    };

    setTheme(updated);
    applyAdminTheme(updated);
    showToastMsg(`تم تطبيق النمط "${found.name}" بنجاح! والمعاينة محدثة الآن.`);
  };

  // Change Mode (Dark / Light / Auto)
  const handleModeChange = (mode: "dark" | "light" | "auto") => {
    setThemeMode(mode);

    // If current preset exists, update colors to reflect light/dark variant of that preset
    const currentPreset = presets.find((p) => p.id === activePresetId);
    if (currentPreset) {
      const modeKey = mode === "light" ? "light" : "dark";
      const palette = currentPreset[modeKey] || currentPreset.dark;

      const updated = {
        ...theme,
        theme_primary: palette.primary,
        theme_secondary: palette.secondary,
        theme_accent: palette.accent,
        theme_background: palette.background,
        theme_card: palette.card,
        theme_text_primary: palette.textPrimary,
        theme_text_secondary: palette.textSecondary,
        theme_text_muted: palette.textMuted,
        theme_border: palette.border,
        theme_input_bg: palette.inputBg,
      };

      setTheme(updated);
      applyAdminTheme(updated);
    }
  };

  // Save Settings to Server
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...theme,
        theme_active_preset: activePresetId,
        theme_mode: themeMode,
      };

      await put("/admin/theme-settings", payload);

      applyAdminTheme(payload);
      broadcastThemeChange(payload);

      showToastMsg("تم حفظ وتطبيق إعدادات الثيم بنجاح على المتجر ولوحة التحكم!", "success");
    } catch (err: any) {
      console.error("Failed to save theme settings:", err);
      showToastMsg(err?.message || "حدث خطأ أثناء حفظ التصميم", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3 text-zinc-400">
        <RefreshCw className="w-8 h-8 animate-spin text-[#C8A45C]" />
        <p className="text-sm font-bold">جاري تحميل إعدادات الهوية والمظهر...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 dir-rtl text-right">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 left-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-bold animate-in fade-in slide-in-from-top-4 ${
            toast.type === "success"
              ? "bg-[#1E2923] border-emerald-500/40 text-emerald-300"
              : "bg-[#291E1E] border-rose-500/40 text-rose-300"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-[#1A1A1A] border border-zinc-800/90 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#2D2D2D] rounded-2xl border border-zinc-700/60 text-[#C8A45C]">
              <Palette size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-wide">تخصيص الهوية والمظهر</h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                إدارة شاملة لنظام الألوان والأنماط والخطوط مع معاينة حية فورية
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchThemeSettings()}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition border border-zinc-700 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            إعادة تعيين
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#C8A45C] hover:bg-[#B8954A] text-black text-xs font-black transition shadow-lg shadow-[#C8A45C]/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            حفظ التغييرات
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 p-2 bg-[#1A1A1A] border border-zinc-800/90 rounded-2xl overflow-x-auto scrollbar-none">
        {THEME_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-[#C8A45C] text-black shadow-md shadow-[#C8A45C]/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {"badge" in tab && tab.badge && (
                <span
                  className={`px-2 py-0.5 text-[10px] rounded-md font-extrabold ${
                    isActive ? "bg-black/20 text-black" : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT SWITCHER */}
      {currentTab === "balance" && <BalanceCardSettings />}
      {currentTab === "auth" && <AuthPagesSettings />}
      {currentTab === "product" && <ProductPageSettings />}
      {currentTab === "about" && <AboutSettings />}
      {currentTab === "contact" && <ContactSettings />}

      {/* GENERAL THEME TAB CONTENT (9 SECTIONS) */}
      {currentTab === "general" && (
        <div className="space-y-8">
          {/* 1. SECTION 1: PRESETS (8 Cards 4x2) */}
          <div className="p-6 bg-[#1A1A1A] border border-zinc-800/90 rounded-3xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-[#C8A45C]" />
                  1. الأنماط الجاهزة (Presets)
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  اختر نمطك المفضل لتطبيقه بنقرة واحدة على جميع عناصر المتجر
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {presets.map((preset) => (
                <ThemePresetCard
                  key={preset.id}
                  preset={preset}
                  isActive={activePresetId === preset.id}
                  currentMode={themeMode}
                  onApply={handleApplyPreset}
                  onEdit={(p) => {
                    handleApplyPreset(p.id);
                    showToastMsg(`يمكنك الآن تعديل متغيرات ${p.name} أدناه`);
                  }}
                />
              ))}
            </div>
          </div>

          {/* 2. SECTION 2: MODE (Dark / Light / Auto) */}
          <div className="p-6 bg-[#1A1A1A] border border-zinc-800/90 rounded-3xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sun size={18} className="text-[#C8A45C]" />
              2. الوضع (Mode)
            </h3>
            <p className="text-xs text-zinc-400">
              حدد الوضع اللوني التلقائي أو الداكن أو الفاتح للمتجر
            </p>

            <div className="grid grid-cols-3 gap-3 max-w-md">
              {[
                { id: "dark", label: "داكن (Dark)", icon: Moon },
                { id: "light", label: "فاتح (Light)", icon: Sun },
                { id: "auto", label: "تلقائي (Auto)", icon: Monitor },
              ].map((m) => {
                const Icon = m.icon;
                const active = themeMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleModeChange(m.id as any)}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold transition border cursor-pointer ${
                      active
                        ? "bg-[#C8A45C] text-black border-[#C8A45C] shadow-lg shadow-[#C8A45C]/20"
                        : "bg-[#252525] text-zinc-300 border-zinc-700/80 hover:bg-zinc-700"
                    }`}
                  >
                    <Icon size={16} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. SECTION 3: PRIMARY COLORS */}
          <div className="p-6 bg-[#1A1A1A] border border-zinc-800/90 rounded-3xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Palette size={18} className="text-[#C8A45C]" />
              3. الألوان الأساسية (Primary Colors)
            </h3>
            <p className="text-xs text-zinc-400">
              تحديد الألوان الرئيسية للمتجر والعناصر التفاعلية
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ColorPickerField
                label="اللون الرئيسي (Primary)"
                value={theme.theme_primary}
                onChange={(v) => handleFieldChange("theme_primary", v)}
                description="أزرار الشراء، الأيقونات النشطة والنصوص البارزة"
              />
              <ColorPickerField
                label="اللون الثانوي (Secondary)"
                value={theme.theme_secondary}
                onChange={(v) => handleFieldChange("theme_secondary", v)}
                description="حالات التحويم وأزرار الإجراءات الثانوية"
              />
              <ColorPickerField
                label="لون التمييز (Accent)"
                value={theme.theme_accent}
                onChange={(v) => handleFieldChange("theme_accent", v)}
                description="شارات الخصم، التنبيهات والنقاط البارزة"
              />
              <ColorPickerField
                label="خلفية المتجر (Background)"
                value={theme.theme_background}
                onChange={(v) => handleFieldChange("theme_background", v)}
                description="الخلفية العامة لجميع الصفحات"
              />
            </div>
          </div>

          {/* 4. SECTION 4: DETAILED COLORS */}
          <div className="p-6 bg-[#1A1A1A] border border-zinc-800/90 rounded-3xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers size={18} className="text-[#C8A45C]" />
              4. الألوان التفصيلية (Detailed Colors)
            </h3>
            <p className="text-xs text-zinc-400">
              التحكم بخلفيات البطاقات والنصوص الحرة والحدود وحقول الإدخال
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <ColorPickerField
                label="لون الكروت والبطاقات (Card Bg)"
                value={theme.theme_card}
                onChange={(v) => handleFieldChange("theme_card", v)}
                description="خلفية بطاقات المنتجات والحاويات"
              />
              <ColorPickerField
                label="النص الرئيسي (Text Primary)"
                value={theme.theme_text_primary}
                onChange={(v) => handleFieldChange("theme_text_primary", v)}
                description="العناوين والنصوص الأساسية"
              />
              <ColorPickerField
                label="النص الثانوي (Text Secondary)"
                value={theme.theme_text_secondary}
                onChange={(v) => handleFieldChange("theme_text_secondary", v)}
                description="النصوص الفرعية والفقرات"
              />
              <ColorPickerField
                label="النص الباهت (Text Muted)"
                value={theme.theme_text_muted}
                onChange={(v) => handleFieldChange("theme_text_muted", v)}
                description="شروحات المنتج والتلميحات"
              />
              <ColorPickerField
                label="الحدود والتقسيمات (Border)"
                value={theme.theme_border}
                onChange={(v) => handleFieldChange("theme_border", v)}
                description="خطوط الفصل وحواف البطاقات"
              />
              <ColorPickerField
                label="خلفية حقول الإدخال (Input Bg)"
                value={theme.theme_input_bg}
                onChange={(v) => handleFieldChange("theme_input_bg", v)}
                description="خلفية مربعات البحث والحقول"
              />
            </div>
          </div>

          {/* 5. SECTION 5: HEADER & NAVIGATION */}
          <div className="p-6 bg-[#1A1A1A] border border-zinc-800/90 rounded-3xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders size={18} className="text-[#C8A45C]" />
              5. الهيدر والتنقل (Header & Navigation)
            </h3>
            <p className="text-xs text-zinc-400">
              تخصيص ألوان الهيدر العلوي، شريط التنقل السفلي والقائمة الجانبية
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <ColorPickerField
                label="بداية تدرج الهيدر"
                value={theme.theme_header_gradient_start}
                onChange={(v) => handleFieldChange("theme_header_gradient_start", v)}
                description="بداية اللون العلوي للـ Header"
              />
              <ColorPickerField
                label="نهاية تدرج الهيدر"
                value={theme.theme_header_gradient_end}
                onChange={(v) => handleFieldChange("theme_header_gradient_end", v)}
                description="نهاية اللون العلوي للـ Header"
              />
              <ColorPickerField
                label="شريط التنقل السفلي"
                value={theme.theme_bottom_nav}
                onChange={(v) => handleFieldChange("theme_bottom_nav", v)}
                description="خلفية شريط التنقل في الجوال"
              />
              <ColorPickerField
                label="الزر النشط في التنقل"
                value={theme.theme_bottom_nav_active}
                onChange={(v) => handleFieldChange("theme_bottom_nav_active", v)}
                description="لون التمييز للأيقونة النشطة"
              />
              <ColorPickerField
                label="القائمة الجانبية (Sidebar)"
                value={theme.theme_sidebar_bg}
                onChange={(v) => handleFieldChange("theme_sidebar_bg", v)}
                description="خلفية القائمة الجانبية للشاشات الكبيرة"
              />
            </div>
          </div>

          {/* 6. SECTION 6: TYPOGRAPHY (Fonts & Sizes) */}
          <div className="p-6 bg-[#1A1A1A] border border-zinc-800/90 rounded-3xl space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Type size={18} className="text-[#C8A45C]" />
              6. الخطوط والاحجام (Typography)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Arabic Font Dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300">الخط العربي (Arabic Font)</label>
                <select
                  value={theme.theme_font_arabic}
                  onChange={(e) => handleFieldChange("theme_font_arabic", e.target.value)}
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C8A45C]"
                >
                  {GOOGLE_FONTS_ARABIC.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              {/* English Font Dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300">الخط الإنجليزي (English Font)</label>
                <select
                  value={theme.theme_font_english}
                  onChange={(e) => handleFieldChange("theme_font_english", e.target.value)}
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C8A45C]"
                >
                  {GOOGLE_FONTS_ENGLISH.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font Size Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-300">
                  <span>حجم النص الرئيسي</span>
                  <span className="text-[#C8A45C] font-mono">{theme.theme_font_size}px</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="24"
                  value={parseInt(theme.theme_font_size) || 14}
                  onChange={(e) => handleFieldChange("theme_font_size", e.target.value)}
                  className="w-full accent-[#C8A45C]"
                />
              </div>

              {/* Heading Size Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-300">
                  <span>حجم العناوين</span>
                  <span className="text-[#C8A45C] font-mono">{theme.theme_heading_size}px</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="36"
                  value={parseInt(theme.theme_heading_size) || 20}
                  onChange={(e) => handleFieldChange("theme_heading_size", e.target.value)}
                  className="w-full accent-[#C8A45C]"
                />
              </div>
            </div>
          </div>

          {/* 7. SECTION 7: SHAPE & EFFECTS */}
          <div className="p-6 bg-[#1A1A1A] border border-zinc-800/90 rounded-3xl space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Maximize size={18} className="text-[#C8A45C]" />
              7. الشكل والمؤثرات (Shape & Effects)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Border Radius */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-300">
                  <span>انحناء الحواف (Border Radius)</span>
                  <span className="text-[#C8A45C] font-mono">{theme.theme_border_radius}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="32"
                  value={parseInt(theme.theme_border_radius) || 16}
                  onChange={(e) => handleFieldChange("theme_border_radius", e.target.value)}
                  className="w-full accent-[#C8A45C]"
                />
              </div>

              {/* Shadow Style Dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300">نمط الظلال (Shadow Style)</label>
                <select
                  value={theme.theme_shadow}
                  onChange={(e) => handleFieldChange("theme_shadow", e.target.value)}
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C8A45C]"
                >
                  <option value="none">بدون ظلال (None)</option>
                  <option value="soft">خفيف (Soft)</option>
                  <option value="medium">متوسط (Medium)</option>
                  <option value="large">عميق (Large)</option>
                  <option value="glow">توهج ذهبي (Glow)</option>
                </select>
              </div>

              {/* Padding */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-300">
                  <span>الحشو الداخلي (Padding)</span>
                  <span className="text-[#C8A45C] font-mono">{theme.theme_padding}px</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="48"
                  value={parseInt(theme.theme_padding) || 24}
                  onChange={(e) => handleFieldChange("theme_padding", e.target.value)}
                  className="w-full accent-[#C8A45C]"
                />
              </div>
            </div>
          </div>

          {/* 8. SECTION 8: LOGO */}
          <div className="p-6 bg-[#1A1A1A] border border-zinc-800/90 rounded-3xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ImageIcon size={18} className="text-[#C8A45C]" />
              8. الشعار (Logo)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300">رابط الشعار (URL)</label>
                <input
                  type="text"
                  value={theme.theme_logo_url}
                  onChange={(e) => handleFieldChange("theme_logo_url", e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C8A45C] dir-ltr text-left"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-300">
                  <span>حجم الشعار</span>
                  <span className="text-[#C8A45C] font-mono">{theme.theme_logo_size}</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="200"
                  value={parseInt(theme.theme_logo_size) || 80}
                  onChange={(e) => handleFieldChange("theme_logo_size", `${e.target.value}px`)}
                  className="w-full accent-[#C8A45C]"
                />
              </div>

              <ColorPickerField
                label="لون نص اسم المتجر"
                value={theme.theme_logo_text_color}
                onChange={(v) => handleFieldChange("theme_logo_text_color", v)}
                description="يظهر عند عدم توفر صورة الشعار"
              />
            </div>
          </div>

          {/* 9. SECTION 9: LIVE PREVIEW */}
          <div className="p-6 bg-[#1A1A1A] border border-zinc-800/90 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Eye size={18} className="text-[#C8A45C]" />
                  9. المعاينة الحية (Live Preview)
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  معاينة فورية حية لمظهر العناصر بالشكل والنمط المحدد حالياً
                </p>
              </div>

              <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[11px] font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                تزامن فوري
              </div>
            </div>

            {/* Simulated Store UI Box */}
            <div
              className="p-6 rounded-2xl border transition-all duration-300 space-y-6"
              style={{
                backgroundColor: theme.theme_background,
                borderColor: theme.theme_border,
                fontFamily: theme.theme_font_arabic,
              }}
            >
              {/* Header preview */}
              <div
                className="p-4 rounded-xl flex items-center justify-between border shadow-sm"
                style={{
                  background: `linear-gradient(90deg, ${theme.theme_header_gradient_start} 0%, ${theme.theme_header_gradient_end} 100%)`,
                  borderColor: theme.theme_border,
                }}
              >
                <div className="flex items-center gap-3">
                  {theme.theme_logo_url ? (
                    <img
                      src={theme.theme_logo_url}
                      alt="Logo"
                      style={{ height: theme.theme_logo_size }}
                      className="object-contain"
                    />
                  ) : (
                    <span
                      className="font-black text-lg"
                      style={{ color: theme.theme_logo_text_color }}
                    >
                      متجري الإكتروني
                    </span>
                  )}
                </div>
                <div
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{
                    backgroundColor: theme.theme_primary,
                    color: "#000",
                  }}
                >
                  تسجيل الدخول
                </div>
              </div>

              {/* Cards Grid preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Balance Card Sample */}
                <div
                  className="p-5 rounded-2xl border space-y-2 text-white"
                  style={{
                    background: `linear-gradient(135deg, ${theme.theme_primary} 0%, ${theme.theme_secondary} 100%)`,
                    borderRadius: `${theme.theme_border_radius}px`,
                  }}
                >
                  <p className="text-xs opacity-80">الرصيد المتاح</p>
                  <h2 className="text-2xl font-black">$1,450.00 USD</h2>
                  <div className="pt-2 flex gap-2">
                    <span className="px-3 py-1 bg-black/20 rounded-lg text-[10px] font-bold">
                      + إيداع سريع
                    </span>
                  </div>
                </div>

                {/* Product Card Sample */}
                <div
                  className="p-4 rounded-2xl border space-y-3"
                  style={{
                    backgroundColor: theme.theme_card,
                    borderColor: theme.theme_border,
                    borderRadius: `${theme.theme_border_radius}px`,
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4
                        className="font-bold text-sm"
                        style={{ color: theme.theme_text_primary }}
                      >
                        بطاقة شحن رقمية VIP
                      </h4>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: theme.theme_text_muted }}
                      >
                        تفعيل فوري تلقائي
                      </p>
                    </div>
                    <span
                      className="px-2 py-0.5 text-[10px] font-extrabold rounded-md"
                      style={{
                        backgroundColor: theme.theme_accent,
                        color: "#000",
                      }}
                    >
                      خصم 15%
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span
                      className="font-black text-base"
                      style={{ color: theme.theme_primary }}
                    >
                      $25.00
                    </span>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl text-xs font-extrabold shadow-sm"
                      style={{
                        backgroundColor: theme.theme_primary,
                        color: "#000",
                        borderRadius: `${Math.max(4, parseInt(theme.theme_border_radius) - 4)}px`,
                      }}
                    >
                      شراء الآن
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Nav preview */}
              <div
                className="p-3 rounded-xl flex items-center justify-around border"
                style={{
                  backgroundColor: theme.theme_bottom_nav,
                  borderColor: theme.theme_border,
                }}
              >
                {["الرئيسية", "المحفظة", "مشترياتي", "حسابي"].map((navItem, idx) => {
                  const isNavActive = idx === 0;
                  return (
                    <span
                      key={navItem}
                      className="text-xs font-bold transition"
                      style={{
                        color: isNavActive ? theme.theme_bottom_nav_active : theme.theme_text_muted,
                      }}
                    >
                      {navItem}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
