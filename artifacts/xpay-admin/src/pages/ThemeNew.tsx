import React, { useState, useEffect, useCallback } from "react";
import { get, put } from "../lib/api";
import { applyAdminTheme, broadcastThemeChange, ensureGoogleFontsLoaded, DEFAULT_ADMIN_THEME } from "../lib/theme";
import {
  Palette,
  Sparkles,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Type,
  Maximize2,
  Sun,
  Moon,
  Sliders,
  Layers,
  Check,
  Info,
  ImageIcon,
  Maximize,
  Sparkle
} from "lucide-react";

type PalettePreset = {
  id: string;
  name: string;
  nameEn: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  textPrimary: string;
  description: string;
};

const PRESET_PALETTES: PalettePreset[] = [
  {
    id: "gold",
    name: "الذهبي الفاخر (الافتراضي)",
    nameEn: "Luxury Gold",
    primary: "#C8A45C",
    secondary: "#B8954A",
    accent: "#FDE68A",
    background: "#1A1A1A",
    textPrimary: "#FFFFFF",
    description: "الأناقة والفخامة الداكنة الكلاسيكية",
  },
  {
    id: "royal-blue",
    name: "الأزرق الملكي",
    nameEn: "Royal Blue",
    primary: "#3B82F6",
    secondary: "#2563EB",
    accent: "#93C5FD",
    background: "#0F172A",
    textPrimary: "#FFFFFF",
    description: "طابع رقمي احترافي وعصري",
  },
  {
    id: "imperial-emerald",
    name: "الزمردي الإمبراطوري",
    nameEn: "Imperial Emerald",
    primary: "#10B981",
    secondary: "#059669",
    accent: "#6EE7B7",
    background: "#064E3B",
    textPrimary: "#FFFFFF",
    description: "حيوية، نمو وثقة متناهية",
  },
  {
    id: "classic-violet",
    name: "البنفسجي الكلاسيكي",
    nameEn: "Classic Violet",
    primary: "#8B5CF6",
    secondary: "#7C3AED",
    accent: "#C4B5FD",
    background: "#2E1065",
    textPrimary: "#FFFFFF",
    description: "إبداع وسحر بصري عميق",
  },
  {
    id: "ruby-pink",
    name: "الوردي الياقوتي",
    nameEn: "Ruby Pink",
    primary: "#EC4899",
    secondary: "#DB2777",
    accent: "#F9A8D4",
    background: "#4C0519",
    textPrimary: "#FFFFFF",
    description: "جرأة، تميز، وطاقة بصرية لافتة",
  },
  {
    id: "fire-red",
    name: "الأحمر الناري",
    nameEn: "Fire Red",
    primary: "#EF4444",
    secondary: "#DC2626",
    accent: "#FCA5A5",
    background: "#450A0A",
    textPrimary: "#FFFFFF",
    description: "قوة، ديناميكية وحضور استثنائي",
  },
  {
    id: "calm-indigo",
    name: "النيلي الهادئ",
    nameEn: "Calm Indigo",
    primary: "#4F46E5",
    secondary: "#4338CA",
    accent: "#A5B4FC",
    background: "#1E1B4B",
    textPrimary: "#FFFFFF",
    description: "هدوء تقني وأناقة سيبرانية متطورة",
  },
  {
    id: "modern-teal",
    name: "التركوازي العصري",
    nameEn: "Modern Teal",
    primary: "#14B8A6",
    secondary: "#0D9488",
    accent: "#99F6E4",
    background: "#042F2E",
    textPrimary: "#FFFFFF",
    description: "نضارة فائقة وحداثة متجددة",
  },
];

const GOOGLE_FONTS_ARABIC = ["Changa", "Cairo", "Almarai", "Tajawal", "Noto Kufi Arabic"];
const GOOGLE_FONTS_ENGLISH = ["Inter", "Poppins", "Roboto", "Montserrat", "Open Sans"];

export default function ThemeNew() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Theme State
  const [theme, setTheme] = useState({
    theme_primary: "#C8A45C",
    theme_secondary: "#B8954A",
    theme_accent: "#FDE68A",
    theme_background: "#1A1A1A",
    theme_text_primary: "#FFFFFF",
    theme_font_arabic: "Changa",
    theme_font_english: "Inter",
    theme_font_size: "14",
    theme_border_radius: "16",
    theme_shadow: "medium",
    theme_default_mode: "dark",
    theme_logo_size: "80px",
  });

  const [brandLogo, setBrandLogo] = useState<string>("");

  // Preview Mode Toggle (Temporary Light/Dark for Live Preview)
  const [previewMode, setPreviewMode] = useState<"dark" | "light">("dark");

  const showToastMsg = useCallback((text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // Fetch Theme Settings
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

      // Fetch public settings for brand logo
      try {
        const publicSettings = await get<any>("/settings/public");
        const logo = publicSettings?.brand_logo_url || publicSettings?.brandLogoUrl || publicSettings?.site_logo || publicSettings?.siteLogo || "";
        if (logo) setBrandLogo(logo);
      } catch {
        // Fallback
      }

      const mergedTheme = {
        ...DEFAULT_ADMIN_THEME,
        ...data,
      };

      setTheme(mergedTheme);
      applyAdminTheme(mergedTheme);

      if (data.theme_default_mode === "light") {
        setPreviewMode("light");
      }
      console.log("[Theme Admin] Loaded and applied theme settings:", mergedTheme);
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

  const applyPreset = (preset: PalettePreset) => {
    const updated = {
      ...theme,
      theme_primary: preset.primary,
      theme_secondary: preset.secondary,
      theme_accent: preset.accent,
      theme_background: preset.background,
      theme_text_primary: preset.textPrimary,
    };
    setTheme(updated);
    applyAdminTheme(updated);
    showToastMsg(`تم تطبيق لوحة الألوان "${preset.name}" بنجاح! المعاينة حية الآن.`);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      console.log("[Theme Admin] Saving theme settings to server:", theme);
      try {
        await put("/admin/theme-settings", theme);
      } catch {
        const items = Object.entries(theme).map(([k, v]) => ({ key: k, value: v }));
        await put("/settings/items", { items });
      }

      // Apply immediately to current admin panel & broadcast to storefront
      applyAdminTheme(theme);
      broadcastThemeChange(theme);

      showToastMsg("تم حفظ وتطبيق إعدادات التصميم بنجاح على النظام والمتجر!", "success");
    } catch (err: any) {
      console.error("Failed to save theme settings:", err);
      showToastMsg(err?.message || "حدث خطأ أثناء حفظ التصميم", "error");
    } finally {
      setSaving(false);
    }
  };

  // Shadow class mapping for preview
  const getShadowClass = (type: string) => {
    switch (type) {
      case "none":
        return "shadow-none";
      case "light":
        return "shadow-sm";
      case "dark":
        return "shadow-2xl";
      case "medium":
      default:
        return "shadow-lg";
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#242424] p-5 rounded-2xl border border-[#C8A45C]/20 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#C8A45C]/10 border border-[#C8A45C]/30 flex items-center justify-center text-[#C8A45C]">
            <Palette size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#FDE68A] flex items-center gap-2">
              تخصيص الهوية والمظهر (Theme Customization)
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              التحكم في الألوان، الخطوط العربية والأجنبية، حواف البطاقات، والوضع الافتراضي مع معاينة حية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchThemeSettings}
            className="p-2.5 text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition border border-zinc-700 cursor-pointer"
            title="إعادة جلب الإعدادات"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={() => handleSave()}
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#C8A45C] to-[#B38F46] text-black font-bold rounded-xl hover:brightness-110 transition shadow-lg cursor-pointer disabled:opacity-50 text-xs"
          >
            <Save size={16} />
            <span>{saving ? "جاري الحفظ..." : "حفظ التغييرات"}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-[#242424] p-8 rounded-2xl border border-zinc-800 space-y-6 animate-pulse">
          <div className="h-8 bg-zinc-800 rounded-lg w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-zinc-800 rounded-2xl" />
            <div className="h-64 bg-zinc-800 rounded-2xl" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT SIDE: CONTROLS (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Presets Bar / Color Palette Grid */}
            <div className="bg-[#242424] p-5 rounded-2xl border border-[#C8A45C]/20 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#C8A45C]/15 border border-[#C8A45C]/30 flex items-center justify-center text-[#C8A45C]">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#FDE68A]">لوحة الألوان السريعة (Color Presets)</h2>
                    <p className="text-[10px] text-zinc-400">اختر نمطاً متكاملاً أو لونا سريعاً لتطبيقه ومعاينته فوراً</p>
                  </div>
                </div>
                <span className="text-[10px] bg-[#1A1A1A] border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full font-mono">
                  8 أنماط جاهزة
                </span>
              </div>

              {/* 8 Preset Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_PALETTES.map((preset) => {
                  const isPrimaryMatch = theme.theme_primary.toLowerCase() === preset.primary.toLowerCase();
                  const isBackgroundMatch = theme.theme_background.toLowerCase() === preset.background.toLowerCase();
                  const isActive = isPrimaryMatch && isBackgroundMatch;

                  return (
                    <div
                      key={preset.id}
                      onClick={() => applyPreset(preset)}
                      className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 relative overflow-hidden group ${
                        isActive
                          ? "bg-[#1F1F1F] ring-2"
                          : "bg-[#1A1A1A] border-zinc-800 hover:border-zinc-600 hover:bg-[#202020]"
                      }`}
                      style={{
                        borderColor: isActive ? preset.primary : undefined,
                        boxShadow: isActive ? `0 0 20px ${preset.primary}33` : undefined,
                      }}
                    >
                      {/* Active Accent Top Indicator */}
                      {isActive && (
                        <div
                          className="absolute top-0 right-0 left-0 h-1"
                          style={{ backgroundColor: preset.primary }}
                        />
                      )}

                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white group-hover:text-[#FDE68A] transition-colors">
                              {preset.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                            {preset.nameEn} • {preset.description}
                          </span>
                        </div>

                        {isActive ? (
                          <span
                            className="px-2 py-0.5 text-[9px] font-bold rounded-full flex items-center gap-1 shrink-0"
                            style={{
                              backgroundColor: `${preset.primary}25`,
                              color: preset.accent,
                              border: `1px solid ${preset.primary}60`,
                            }}
                          >
                            <Check size={10} /> نشط الآن
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400 group-hover:text-white transition-colors bg-zinc-800/80 px-2 py-0.5 rounded-lg">
                            تطبيق
                          </span>
                        )}
                      </div>

                      {/* Visual 4-Color Swatch Display */}
                      <div className="space-y-1.5 bg-[#141414] p-2.5 rounded-xl border border-zinc-800/80">
                        {/* Gradient Bar */}
                        <div
                          className="h-2 rounded-full w-full shadow-inner"
                          style={{
                            background: `linear-gradient(to right, ${preset.background}, ${preset.primary}, ${preset.secondary}, ${preset.accent})`,
                          }}
                        />

                        {/* Color Blocks */}
                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className="w-full h-5 rounded-lg border border-white/10 shadow-sm transition-transform group-hover:scale-105"
                              style={{ backgroundColor: preset.primary }}
                              title={`الأساسي: ${preset.primary}`}
                            />
                            <span className="text-[8px] text-zinc-400 font-mono">{preset.primary}</span>
                          </div>

                          <div className="flex flex-col items-center gap-1">
                            <span
                              className="w-full h-5 rounded-lg border border-white/10 shadow-sm transition-transform group-hover:scale-105"
                              style={{ backgroundColor: preset.secondary }}
                              title={`الثانوي: ${preset.secondary}`}
                            />
                            <span className="text-[8px] text-zinc-400 font-mono">{preset.secondary}</span>
                          </div>

                          <div className="flex flex-col items-center gap-1">
                            <span
                              className="w-full h-5 rounded-lg border border-white/10 shadow-sm transition-transform group-hover:scale-105"
                              style={{ backgroundColor: preset.accent }}
                              title={`المميز: ${preset.accent}`}
                            />
                            <span className="text-[8px] text-zinc-400 font-mono">{preset.accent}</span>
                          </div>

                          <div className="flex flex-col items-center gap-1">
                            <span
                              className="w-full h-5 rounded-lg border border-white/10 shadow-sm transition-transform group-hover:scale-105"
                              style={{ backgroundColor: preset.background }}
                              title={`الخلفية: ${preset.background}`}
                            />
                            <span className="text-[8px] text-zinc-400 font-mono">{preset.background}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Single-Color Swatches */}
              <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                  <Palette size={14} className="text-[#C8A45C]" />
                  تغيير سريع للون الأساسي فقط:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_PALETTES.map((p) => (
                    <button
                      key={`single-${p.id}`}
                      type="button"
                      onClick={() => {
                        handleFieldChange("theme_primary", p.primary);
                        handleFieldChange("theme_secondary", p.secondary);
                        handleFieldChange("theme_accent", p.accent);
                        showToastMsg(`تم ضبط اللون الأساسي على "${p.name}"`);
                      }}
                      className="w-6 h-6 rounded-full border border-white/20 hover:scale-115 transition-transform cursor-pointer shadow"
                      style={{ backgroundColor: p.primary }}
                      title={`تطبيق اللون الأساسي: ${p.name}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Colors Section */}
            <div className="bg-[#242424] p-5 rounded-2xl border border-[#C8A45C]/20 shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-[#FDE68A] flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Palette size={18} className="text-[#C8A45C]" />
                إعدادات الألوان التفصيلية
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Primary Color */}
                <div className="space-y-1.5 p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800">
                  <label className="block font-semibold text-zinc-300">اللون الأساسي (Primary)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.theme_primary}
                      onChange={(e) => handleFieldChange("theme_primary", e.target.value)}
                      className="w-10 h-9 rounded-lg border border-zinc-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={theme.theme_primary}
                      onChange={(e) => handleFieldChange("theme_primary", e.target.value)}
                      className="flex-1 bg-[#242424] border border-zinc-700 text-white font-mono px-3 py-1.5 rounded-lg outline-none uppercase text-xs"
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div className="space-y-1.5 p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800">
                  <label className="block font-semibold text-zinc-300">اللون الثانوي (Secondary)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.theme_secondary}
                      onChange={(e) => handleFieldChange("theme_secondary", e.target.value)}
                      className="w-10 h-9 rounded-lg border border-zinc-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={theme.theme_secondary}
                      onChange={(e) => handleFieldChange("theme_secondary", e.target.value)}
                      className="flex-1 bg-[#242424] border border-zinc-700 text-white font-mono px-3 py-1.5 rounded-lg outline-none uppercase text-xs"
                    />
                  </div>
                </div>

                {/* Accent Color */}
                <div className="space-y-1.5 p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800">
                  <label className="block font-semibold text-zinc-300">اللون المميز (Accent)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.theme_accent}
                      onChange={(e) => handleFieldChange("theme_accent", e.target.value)}
                      className="w-10 h-9 rounded-lg border border-zinc-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={theme.theme_accent}
                      onChange={(e) => handleFieldChange("theme_accent", e.target.value)}
                      className="flex-1 bg-[#242424] border border-zinc-700 text-white font-mono px-3 py-1.5 rounded-lg outline-none uppercase text-xs"
                    />
                  </div>
                </div>

                {/* Background Color */}
                <div className="space-y-1.5 p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800">
                  <label className="block font-semibold text-zinc-300">لون خلفية المتجر (Background)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.theme_background}
                      onChange={(e) => handleFieldChange("theme_background", e.target.value)}
                      className="w-10 h-9 rounded-lg border border-zinc-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={theme.theme_background}
                      onChange={(e) => handleFieldChange("theme_background", e.target.value)}
                      className="flex-1 bg-[#242424] border border-zinc-700 text-white font-mono px-3 py-1.5 rounded-lg outline-none uppercase text-xs"
                    />
                  </div>
                </div>

                {/* Text Primary Color */}
                <div className="space-y-1.5 p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800 md:col-span-2">
                  <label className="block font-semibold text-zinc-300">لون النص الأساسي (Text Primary)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.theme_text_primary}
                      onChange={(e) => handleFieldChange("theme_text_primary", e.target.value)}
                      className="w-10 h-9 rounded-lg border border-zinc-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={theme.theme_text_primary}
                      onChange={(e) => handleFieldChange("theme_text_primary", e.target.value)}
                      className="flex-1 bg-[#242424] border border-zinc-700 text-white font-mono px-3 py-1.5 rounded-lg outline-none uppercase text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Typography Section */}
            <div className="bg-[#242424] p-5 rounded-2xl border border-[#C8A45C]/20 shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-[#FDE68A] flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Type size={18} className="text-[#C8A45C]" />
                التحكم بالخطوط والطباعة (Typography)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Arabic Font */}
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">الخط العربي الرئيسي</label>
                  <select
                    value={theme.theme_font_arabic}
                    onChange={(e) => handleFieldChange("theme_font_arabic", e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3.5 py-2.5 rounded-xl outline-none cursor-pointer"
                  >
                    {GOOGLE_FONTS_ARABIC.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* English Font */}
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">الخط الإنجليزي والأرقام</label>
                  <select
                    value={theme.theme_font_english}
                    onChange={(e) => handleFieldChange("theme_font_english", e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3.5 py-2.5 rounded-xl outline-none cursor-pointer"
                  >
                    {GOOGLE_FONTS_ENGLISH.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Font Size Slider */}
                <div className="md:col-span-2 space-y-2 p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-zinc-300">حجم النص الأساسي</label>
                    <span className="font-mono text-[#FDE68A] font-bold">{theme.theme_font_size || "14"}px</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="20"
                    step="1"
                    value={theme.theme_font_size || "14"}
                    onChange={(e) => handleFieldChange("theme_font_size", e.target.value)}
                    className="w-full accent-[#C8A45C] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Shapes & Mode Section */}
            <div className="bg-[#242424] p-5 rounded-2xl border border-[#C8A45C]/20 shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-[#FDE68A] flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Sliders size={18} className="text-[#C8A45C]" />
                الحواف، الظلال، والوضع الافتراضي
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Border Radius */}
                <div className="space-y-2 p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-zinc-300">نصف قطر زوايا البطاقات (Border Radius)</label>
                    <span className="font-mono text-[#FDE68A] font-bold">{theme.theme_border_radius || "16"}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="32"
                    step="2"
                    value={theme.theme_border_radius || "16"}
                    onChange={(e) => handleFieldChange("theme_border_radius", e.target.value)}
                    className="w-full accent-[#C8A45C] cursor-pointer"
                  />
                </div>

                {/* Shadows */}
                <div className="space-y-1.5 p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800">
                  <label className="block font-semibold text-zinc-300">شدة الظلال (Shadows)</label>
                  <select
                    value={theme.theme_shadow || "medium"}
                    onChange={(e) => handleFieldChange("theme_shadow", e.target.value)}
                    className="w-full bg-[#242424] border border-zinc-700 focus:border-[#C8A45C] text-white px-3.5 py-2 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="none">بدون ظل (None)</option>
                    <option value="light">ظل خفيف (Light)</option>
                    <option value="medium">ظل متوسط (Medium)</option>
                    <option value="dark">ظل غامق (Dark / Deep)</option>
                  </select>
                </div>

                {/* Default Mode */}
                <div className="md:col-span-2 space-y-1.5 p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800">
                  <label className="block font-semibold text-zinc-300">الوضع الافتراضي عند فتح المتجر</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleFieldChange("theme_default_mode", "dark")}
                      className={`py-2 px-3 rounded-xl border text-center font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        theme.theme_default_mode === "dark"
                          ? "bg-[#C8A45C]/20 border-[#C8A45C] text-[#FDE68A]"
                          : "bg-[#242424] border-zinc-800 text-zinc-400"
                      }`}
                    >
                      <Moon size={14} />
                      <span>داكن (Dark)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleFieldChange("theme_default_mode", "light")}
                      className={`py-2 px-3 rounded-xl border text-center font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        theme.theme_default_mode === "light"
                          ? "bg-[#C8A45C]/20 border-[#C8A45C] text-[#FDE68A]"
                          : "bg-[#242424] border-zinc-800 text-zinc-400"
                      }`}
                    >
                      <Sun size={14} />
                      <span>فاتح (Light)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleFieldChange("theme_default_mode", "system")}
                      className={`py-2 px-3 rounded-xl border text-center font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        theme.theme_default_mode === "system"
                          ? "bg-[#C8A45C]/20 border-[#C8A45C] text-[#FDE68A]"
                          : "bg-[#242424] border-zinc-800 text-zinc-400"
                      }`}
                    >
                      <Layers size={14} />
                      <span>تلقائي (System)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Logo Size & Brand Identity Section */}
            <div className="bg-[#242424] p-5 rounded-2xl border border-[#C8A45C]/20 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h2 className="text-sm font-bold text-[#FDE68A] flex items-center gap-2">
                  <ImageIcon size={18} className="text-[#C8A45C]" />
                  الهوية البصرية وحجم الشعار في المتجر (Logo Size)
                </h2>
                <span className="font-mono text-xs font-bold text-[#C8A45C] bg-[#1A1A1A] border border-[#C8A45C]/30 px-2.5 py-1 rounded-lg">
                  {parseInt(String(theme.theme_logo_size || "80")) || 80}px
                </span>
              </div>

              <div className="space-y-4 text-xs">
                {/* Logo Size Slider */}
                <div className="space-y-2 p-4 bg-[#1A1A1A] rounded-xl border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Maximize size={14} className="text-[#C8A45C]" />
                      التحكم بحجم الشعار (العرض / الارتفاع التناسبي)
                    </label>
                    <span className="font-mono text-[#FDE68A] font-bold text-sm">
                      {parseInt(String(theme.theme_logo_size || "80")) || 80}px
                    </span>
                  </div>

                  <input
                    type="range"
                    min="40"
                    max="160"
                    step="2"
                    value={parseInt(String(theme.theme_logo_size || "80")) || 80}
                    onChange={(e) => handleFieldChange("theme_logo_size", `${e.target.value}px`)}
                    className="w-full accent-[#C8A45C] cursor-pointer h-2 bg-zinc-800 rounded-lg"
                  />

                  {/* Preset Pills */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-zinc-400 font-medium">أحجام جاهزة:</span>
                    {[
                      { label: "صغير", size: "50px" },
                      { label: "متوسط (افتراضي)", size: "80px" },
                      { label: "كبير", size: "110px" },
                      { label: "جامبو", size: "140px" },
                    ].map((preset) => {
                      const isCurrent = (parseInt(String(theme.theme_logo_size || "80")) || 80) === parseInt(preset.size);
                      return (
                        <button
                          key={preset.size}
                          type="button"
                          onClick={() => handleFieldChange("theme_logo_size", preset.size)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                            isCurrent
                              ? "bg-[#C8A45C] text-black border-[#C8A45C] shadow-xs"
                              : "bg-[#242424] text-zinc-300 border-zinc-700 hover:border-[#C8A45C] hover:text-white"
                          }`}
                        >
                          {preset.label} ({preset.size})
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800/80 flex items-start gap-2.5 text-zinc-400 text-[11px] leading-relaxed">
                  <Info size={16} className="text-[#C8A45C] shrink-0 mt-0.5" />
                  <span>
                    يُطبق هذا الخيار تلقائياً وفوراً على كافة أماكن ظهور الشعار في واجهة المتجر:
                    الهيدر العلوي، القائمة الجانبية (Sidebar)، الفوتر، وشاشات تسجيل الدخول وإنشاء الحساب.
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Banner for Product Page Settings */}
            <div className="bg-[#242424] p-5 rounded-2xl border border-blue-500/30 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                    📦
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">تخصيص صفحة تفاصيل المنتج (Product Page Settings)</h2>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      تم تجميع ونقل كافة إعدادات ترتيب العناصر، السحب والإفلات، وإظهار/إخفاء أقسام صفحة المنتج إلى الصفحة المستقلة المخصصة لها.
                    </p>
                  </div>
                </div>
                <a
                  href="/product-page-settings"
                  className="px-4 py-2 bg-gradient-to-r from-[#C8A45C] to-[#B38F46] text-black text-xs font-bold rounded-xl hover:brightness-110 transition shadow-md shrink-0"
                >
                  الانتقال لتخصيص صفحة المنتج ←
                </a>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: LIVE PREVIEW (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
            <div className="bg-[#242424] p-5 rounded-2xl border border-[#C8A45C]/30 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Eye size={18} className="text-[#C8A45C]" />
                  <h2 className="text-sm font-bold text-[#FDE68A]">المعاينة الحية التفاعلية</h2>
                </div>

                {/* Preview Light/Dark toggle */}
                <div className="flex items-center gap-1 bg-[#1A1A1A] p-1 rounded-xl border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("dark")}
                    className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                      previewMode === "dark" ? "bg-[#C8A45C] text-black font-bold" : "text-zinc-400 hover:text-white"
                    }`}
                    title="معاينة الوضع الداكن"
                  >
                    <Moon size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("light")}
                    className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                      previewMode === "light" ? "bg-[#C8A45C] text-black font-bold" : "text-zinc-400 hover:text-white"
                    }`}
                    title="معاينة الوضع الفاتح"
                  >
                    <Sun size={14} />
                  </button>
                </div>
              </div>

              {/* LIVE PREVIEW CANVAS */}
              <div
                className={`p-5 transition-all border ${getShadowClass(theme.theme_shadow)} space-y-4 relative overflow-hidden`}
                style={{
                  backgroundColor: previewMode === "light" ? "#F8FAFC" : theme.theme_background,
                  color: previewMode === "light" ? "#0F172A" : theme.theme_text_primary,
                  borderRadius: `${theme.theme_border_radius || 16}px`,
                  fontFamily: `${theme.theme_font_arabic}, sans-serif`,
                  fontSize: `${theme.theme_font_size || 14}px`,
                  borderColor: `${theme.theme_primary}40`,
                }}
              >
                {/* Header Preview with Dynamic Logo */}
                <div className="flex items-center justify-between border-b pb-3 gap-3" style={{ borderColor: `${theme.theme_primary}30` }}>
                  <div className="flex items-center gap-3 min-w-0">
                    {brandLogo ? (
                      <img
                        src={brandLogo}
                        alt="Brand Logo"
                        style={{
                          height: `${Math.min(64, Math.max(28, Math.round((parseInt(String(theme.theme_logo_size || "80")) || 80) * 0.45)))}px`,
                          maxWidth: `${Math.min(160, Math.max(70, Math.round((parseInt(String(theme.theme_logo_size || "80")) || 80) * 1.5)))}px`,
                          objectFit: "contain",
                          borderRadius: `${Math.max(4, Number(theme.theme_border_radius) - 6)}px`,
                        }}
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center font-black transition-all shadow-sm shrink-0"
                        style={{
                          width: `${Math.min(48, Math.max(28, Math.round((parseInt(String(theme.theme_logo_size || "80")) || 80) * 0.45)))}px`,
                          height: `${Math.min(48, Math.max(28, Math.round((parseInt(String(theme.theme_logo_size || "80")) || 80) * 0.45)))}px`,
                          backgroundColor: theme.theme_primary,
                          color: "#000000",
                          borderRadius: `${Math.max(4, Number(theme.theme_border_radius) - 4)}px`,
                          fontSize: `${Math.min(20, Math.max(12, Math.round((parseInt(String(theme.theme_logo_size || "80")) || 80) * 0.2)))}px`,
                        }}
                      >
                        XP
                      </div>
                    )}
                    <div className="truncate">
                      <div className="font-extrabold truncate" style={{ color: theme.theme_accent }}>
                        ShadMini Store
                      </div>
                      <div className="text-[10px] opacity-70 truncate">شعار المتجر الحجم: {parseInt(String(theme.theme_logo_size || "80")) || 80}px</div>
                    </div>
                  </div>

                  <span
                    className="px-2 py-0.5 text-[10px] font-bold shrink-0"
                    style={{
                      backgroundColor: `${theme.theme_primary}20`,
                      color: theme.theme_accent,
                      borderRadius: `${Math.max(4, Number(theme.theme_border_radius) - 6)}px`,
                    }}
                  >
                    معاينة حية
                  </span>
                </div>

                {/* Sample Card */}
                <div
                  className="p-4 border space-y-3"
                  style={{
                    backgroundColor: previewMode === "light" ? "#FFFFFF" : "#242424",
                    borderRadius: `${Math.max(6, Number(theme.theme_border_radius) - 2)}px`,
                    borderColor: `${theme.theme_primary}30`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">بطاقة منتج تجريبية</span>
                    <span className="font-mono text-xs font-bold" style={{ color: theme.theme_primary }}>
                      $25.00 USD
                    </span>
                  </div>

                  <p className="opacity-80 text-xs leading-relaxed">
                    جملة تجريبية بالخط العربي المختار ({theme.theme_font_arabic}): تمتع بتجربة تسوق سريعة وآمنة.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      className="flex-1 py-2 font-bold text-xs shadow transition hover:brightness-110 cursor-pointer"
                      style={{
                        backgroundColor: theme.theme_primary,
                        color: "#000000",
                        borderRadius: `${Math.max(4, Number(theme.theme_border_radius) - 6)}px`,
                      }}
                    >
                      شراء الآن (CTA)
                    </button>

                    <button
                      type="button"
                      className="px-3 py-2 font-bold text-xs border transition cursor-pointer"
                      style={{
                        backgroundColor: `${theme.theme_secondary}20`,
                        color: theme.theme_accent,
                        borderColor: theme.theme_secondary,
                        borderRadius: `${Math.max(4, Number(theme.theme_border_radius) - 6)}px`,
                      }}
                    >
                      تفاصيل
                    </button>
                  </div>
                </div>

                {/* English Text Sample */}
                <div className="text-[11px] font-mono opacity-60 text-left dir-ltr" style={{ fontFamily: `${theme.theme_font_english}, sans-serif` }}>
                  Sample English Font ({theme.theme_font_english}) • Logo Size: {theme.theme_logo_size || "80px"}
                </div>
              </div>

              <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 pt-2">
                <Info size={14} className="text-[#C8A45C]" />
                <span>المعاينة تتحدث فوراً عند تغيير أي خيار أو حجم الشعار. اضغط حفظ لتطبيقها نهائياً.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
