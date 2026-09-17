import React, { useState } from "react";
import {
  Palette,
  Type,
  Maximize2,
  Eye,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Sliders,
  Sun,
  Moon,
  Info,
  RefreshCw,
} from "lucide-react";

export interface SectionThemeData {
  bg_color: string;
  card_color: string;
  text_color: string;
  title_color: string;
  border_color: string;
  price_color?: string;
  button_color: string;
  button_text_color: string;
  button_hover_color: string;
  font_family: string;
  font_size: number | string;
  heading_size: number | string;
  radius: number | string;
  padding: number | string;
  shadow: string;
}

const ARABIC_FONTS = [
  "Cairo",
  "Changa",
  "Almarai",
  "Tajawal",
  "Noto Kufi Arabic",
  "Alexandria",
];

const SHADOW_OPTIONS = [
  { id: "none", name: "بدون ظل (None)" },
  { id: "light", name: "خفيف (Light)" },
  { id: "medium", name: "متوسط (Medium)" },
  { id: "heavy", name: "قوي (Heavy)" },
];

interface Props {
  title: string;
  subtitle: string;
  prefix: "auth" | "product" | "about" | "contact";
  hasPriceColor?: boolean;
  data: SectionThemeData;
  onChange: (updated: SectionThemeData) => void;
  onSave: () => Promise<void>;
  saving?: boolean;
  extraContent?: React.ReactNode;
}

export default function SectionThemeControls({
  title,
  subtitle,
  prefix,
  hasPriceColor = false,
  data,
  onChange,
  onSave,
  saving = false,
  extraContent,
}: Props) {
  const [isHovered, setIsHovered] = useState(false);

  const updateField = (key: keyof SectionThemeData, val: any) => {
    onChange({ ...data, [key]: val });
  };

  const getShadowCss = (s: string) => {
    switch (s) {
      case "none":
        return "none";
      case "light":
        return "0 2px 8px rgba(0,0,0,0.15)";
      case "heavy":
        return "0 12px 30px rgba(0,0,0,0.5)";
      case "medium":
      default:
        return "0 6px 18px rgba(0,0,0,0.3)";
    }
  };

  return (
    <div className="space-y-6 text-zinc-100" dir="rtl">
      {/* Header & Save Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#242424] p-5 rounded-2xl border border-[#C8A45C]/20 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#C8A45C]/10 border border-[#C8A45C]/30 flex items-center justify-center text-[#C8A45C]">
            <Palette size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#FDE68A] flex items-center gap-2">
              {title}
            </h1>
            <p className="text-xs text-zinc-400 mt-1">{subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#C8A45C] to-[#B38F46] text-black font-bold rounded-xl hover:brightness-110 transition shadow-lg cursor-pointer disabled:opacity-50 text-xs shrink-0"
        >
          <Save size={16} />
          <span>{saving ? "جاري الحفظ..." : "حفظ التغييرات"}</span>
        </button>
      </div>

      {/* ═══════════ LIVE PREVIEW BOX (المعاينة الحية) ═══════════ */}
      <div className="bg-[#242424] p-5 rounded-2xl border border-[#C8A45C]/30 shadow-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Eye size={18} className="text-[#C8A45C]" />
            <h2 className="text-sm font-bold text-[#FDE68A]">
              المعاينة الحية للتبويب ({title})
            </h2>
          </div>
          <span className="text-[10px] bg-[#C8A45C]/20 text-[#FDE68A] px-2.5 py-1 rounded-full font-bold">
            معاينة حية تتفاعل فوراً
          </span>
        </div>

        <div
          className="p-6 transition-all relative overflow-hidden"
          style={{
            backgroundColor: data.bg_color || "#1A1A1A",
            fontFamily: `${data.font_family || "Cairo"}, sans-serif`,
            borderRadius: `${data.radius || 16}px`,
            padding: `${data.padding || 24}px`,
          }}
        >
          <div
            className="p-5 transition-all border relative"
            style={{
              backgroundColor: data.card_color || "#2D2D2D",
              color: data.text_color || "#FFFFFF",
              borderColor: data.border_color || "#C8A45C",
              borderRadius: `${data.radius || 16}px`,
              boxShadow: getShadowCss(data.shadow || "medium"),
            }}
          >
            <h3
              className="font-bold mb-2 transition-colors"
              style={{
                color: data.title_color || "#C8A45C",
                fontSize: `${data.heading_size || 20}px`,
              }}
            >
              عنوان تجريبي للمعاينة
            </h3>

            <p
              className="mb-4 leading-relaxed opacity-90"
              style={{
                color: data.text_color || "#FFFFFF",
                fontSize: `${data.font_size || 14}px`,
              }}
            >
              هذا النص يوضح كيف سينظر المستخدم إلى نصوص هذا التبويب بأسلوب الخط المختار ({data.font_family || "Cairo"}) والألوان المحددة.
            </p>

            {hasPriceColor && (
              <div
                className="font-bold mb-4"
                style={{
                  color: data.price_color || "#C8A45C",
                  fontSize: `${Number(data.heading_size || 20) * 0.9}px`,
                }}
              >
                السعر: 150.00 ر.س
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="px-5 py-2.5 font-bold transition-all shadow-md cursor-pointer"
                style={{
                  backgroundColor: isHovered
                    ? data.button_hover_color || "#B8954A"
                    : data.button_color || "#C8A45C",
                  color: data.button_text_color || "#1A1A1A",
                  borderRadius: `${data.radius || 16}px`,
                  fontSize: `${data.font_size || 14}px`,
                }}
              >
                زر تجريبي (حالة {isHovered ? "Hover" : "العادية"})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ CONTROL SECTIONS ═══════════ */}
      <div className="bg-[#242424] p-6 rounded-2xl border border-zinc-800 space-y-8">
        {/* القسم 1: الألوان الأساسية */}
        <div className="space-y-4 border-b border-zinc-800/80 pb-6">
          <h3 className="text-sm font-bold text-[#FDE68A] flex items-center gap-2">
            🎨 القسم 1: الألوان الأساسية
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* لون خلفية المحتوى */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                لون خلفية المحتوى
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={data.bg_color || "#1A1A1A"}
                  onChange={(e) => updateField("bg_color", e.target.value)}
                  className="w-12 h-10 bg-[#1A1A1A] border border-zinc-700 rounded-lg cursor-pointer p-1"
                />
                <input
                  type="text"
                  value={data.bg_color || "#1A1A1A"}
                  onChange={(e) => updateField("bg_color", e.target.value)}
                  className="flex-1 bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs font-mono outline-none"
                  placeholder="#1A1A1A"
                />
              </div>
            </div>

            {/* لون البطاقات */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                لون البطاقات
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={data.card_color || "#2D2D2D"}
                  onChange={(e) => updateField("card_color", e.target.value)}
                  className="w-12 h-10 bg-[#1A1A1A] border border-zinc-700 rounded-lg cursor-pointer p-1"
                />
                <input
                  type="text"
                  value={data.card_color || "#2D2D2D"}
                  onChange={(e) => updateField("card_color", e.target.value)}
                  className="flex-1 bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs font-mono outline-none"
                  placeholder="#2D2D2D"
                />
              </div>
            </div>

            {/* لون النص الأساسي */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                لون النص الأساسي
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={data.text_color || "#FFFFFF"}
                  onChange={(e) => updateField("text_color", e.target.value)}
                  className="w-12 h-10 bg-[#1A1A1A] border border-zinc-700 rounded-lg cursor-pointer p-1"
                />
                <input
                  type="text"
                  value={data.text_color || "#FFFFFF"}
                  onChange={(e) => updateField("text_color", e.target.value)}
                  className="flex-1 bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs font-mono outline-none"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>

            {/* لون العناوين */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                لون العناوين
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={data.title_color || "#C8A45C"}
                  onChange={(e) => updateField("title_color", e.target.value)}
                  className="w-12 h-10 bg-[#1A1A1A] border border-zinc-700 rounded-lg cursor-pointer p-1"
                />
                <input
                  type="text"
                  value={data.title_color || "#C8A45C"}
                  onChange={(e) => updateField("title_color", e.target.value)}
                  className="flex-1 bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs font-mono outline-none"
                  placeholder="#C8A45C"
                />
              </div>
            </div>

            {/* لون الحدود */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                لون الحدود
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={data.border_color || "#C8A45C"}
                  onChange={(e) => updateField("border_color", e.target.value)}
                  className="w-12 h-10 bg-[#1A1A1A] border border-zinc-700 rounded-lg cursor-pointer p-1"
                />
                <input
                  type="text"
                  value={data.border_color || "#C8A45C"}
                  onChange={(e) => updateField("border_color", e.target.value)}
                  className="flex-1 bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs font-mono outline-none"
                  placeholder="#C8A45C"
                />
              </div>
            </div>

            {/* لون السعر (خاص بصفحة المنتج) */}
            {hasPriceColor && (
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  لون السعر
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={data.price_color || "#C8A45C"}
                    onChange={(e) => updateField("price_color", e.target.value)}
                    className="w-12 h-10 bg-[#1A1A1A] border border-zinc-700 rounded-lg cursor-pointer p-1"
                  />
                  <input
                    type="text"
                    value={data.price_color || "#C8A45C"}
                    onChange={(e) => updateField("price_color", e.target.value)}
                    className="flex-1 bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs font-mono outline-none"
                    placeholder="#C8A45C"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* القسم 2: الأزرار */}
        <div className="space-y-4 border-b border-zinc-800/80 pb-6">
          <h3 className="text-sm font-bold text-[#FDE68A] flex items-center gap-2">
            🎨 القسم 2: الأزرار
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* لون خلفية الأزرار */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                لون خلفية الأزرار
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={data.button_color || "#C8A45C"}
                  onChange={(e) => updateField("button_color", e.target.value)}
                  className="w-12 h-10 bg-[#1A1A1A] border border-zinc-700 rounded-lg cursor-pointer p-1"
                />
                <input
                  type="text"
                  value={data.button_color || "#C8A45C"}
                  onChange={(e) => updateField("button_color", e.target.value)}
                  className="flex-1 bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs font-mono outline-none"
                  placeholder="#C8A45C"
                />
              </div>
            </div>

            {/* لون نص الأزرار */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                لون نص الأزرار
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={data.button_text_color || "#1A1A1A"}
                  onChange={(e) => updateField("button_text_color", e.target.value)}
                  className="w-12 h-10 bg-[#1A1A1A] border border-zinc-700 rounded-lg cursor-pointer p-1"
                />
                <input
                  type="text"
                  value={data.button_text_color || "#1A1A1A"}
                  onChange={(e) => updateField("button_text_color", e.target.value)}
                  className="flex-1 bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs font-mono outline-none"
                  placeholder="#1A1A1A"
                />
              </div>
            </div>

            {/* لون خلفية الأزرار عند Hover */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                لون خلفية الأزرار عند Hover
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={data.button_hover_color || "#B8954A"}
                  onChange={(e) => updateField("button_hover_color", e.target.value)}
                  className="w-12 h-10 bg-[#1A1A1A] border border-zinc-700 rounded-lg cursor-pointer p-1"
                />
                <input
                  type="text"
                  value={data.button_hover_color || "#B8954A"}
                  onChange={(e) => updateField("button_hover_color", e.target.value)}
                  className="flex-1 bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs font-mono outline-none"
                  placeholder="#B8954A"
                />
              </div>
            </div>
          </div>
        </div>

        {/* القسم 3: الطباعة */}
        <div className="space-y-4 border-b border-zinc-800/80 pb-6">
          <h3 className="text-sm font-bold text-[#FDE68A] flex items-center gap-2">
            📝 القسم 3: الطباعة
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* الخط العربي */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                الخط العربي
              </label>
              <select
                value={data.font_family || "Cairo"}
                onChange={(e) => updateField("font_family", e.target.value)}
                className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2.5 rounded-lg text-xs font-bold outline-none cursor-pointer"
              >
                {ARABIC_FONTS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>

            {/* حجم النص الأساسي */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                حجم النص الأساسي (بكسل)
              </label>
              <input
                type="number"
                min={10}
                max={24}
                value={data.font_size ?? 14}
                onChange={(e) => updateField("font_size", Number(e.target.value))}
                className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs font-mono outline-none"
                placeholder="14"
              />
            </div>

            {/* حجم العناوين */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                حجم العناوين (بكسل)
              </label>
              <input
                type="number"
                min={14}
                max={40}
                value={data.heading_size ?? 20}
                onChange={(e) => updateField("heading_size", Number(e.target.value))}
                className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs font-mono outline-none"
                placeholder="20"
              />
            </div>
          </div>
        </div>

        {/* القسم 4: التخطيط */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#FDE68A] flex items-center gap-2">
            📐 القسم 4: التخطيط
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* نصف قطر الزوايا */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                نصف قطر الزوايا (بكسل)
              </label>
              <input
                type="number"
                min={0}
                max={40}
                value={data.radius ?? 16}
                onChange={(e) => updateField("radius", Number(e.target.value))}
                className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs font-mono outline-none"
                placeholder="16"
              />
            </div>

            {/* الحشو الداخلي */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                الحشو الداخلي Padding (بكسل)
              </label>
              <input
                type="number"
                min={0}
                max={60}
                value={data.padding ?? 24}
                onChange={(e) => updateField("padding", Number(e.target.value))}
                className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs font-mono outline-none"
                placeholder="24"
              />
            </div>

            {/* الظلال */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                الظلال (Shadow)
              </label>
              <select
                value={data.shadow || "medium"}
                onChange={(e) => updateField("shadow", e.target.value)}
                className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2.5 rounded-lg text-xs font-bold outline-none cursor-pointer"
              >
                {SHADOW_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Extra Content if provided */}
        {extraContent && (
          <div className="border-t border-zinc-800 pt-6 mt-6">
            {extraContent}
          </div>
        )}
      </div>
    </div>
  );
}
