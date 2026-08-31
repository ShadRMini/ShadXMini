import { useEffect, useState } from "react";
import { get, put } from "../lib/api";
import { toast } from "sonner";
import {
  Package,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Palette,
  Sliders,
  CheckCircle2,
  Save,
  RotateCcw,
  Sparkles,
  LayoutGrid,
  ShieldCheck,
  Star,
  ShoppingCart,
  Zap,
  Maximize2,
  Share2,
  Heart,
  ImageIcon
} from "lucide-react";

export interface SectionConfig {
  id: string;
  visible: boolean;
  order: number;
  label: string;
  title?: string;
  button_text?: string;
}

export interface CustomizationConfig {
  image_size: string;
  price_color: string;
  button_color: string;
  button_text_color: string;
  bg_color: string;
  text_color: string;
  border_color: string;
  border_radius: string;
  font_family: string;
}

const DEFAULT_SECTIONS: SectionConfig[] = [
  { id: "image", visible: true, order: 1, label: "صورة المنتج والبدائل", title: "صورة المنتج" },
  { id: "title", visible: true, order: 2, label: "اسم المنتج والتصنيف وحالة التوفر", title: "اسم المنتج" },
  { id: "price", visible: true, order: 3, label: "السعر المباشر والمجموع الكلي", title: "السعر" },
  { id: "rating", visible: true, order: 4, label: "شارات التقييم وشارات الخدمة", title: "التقييمات" },
  { id: "description", visible: true, order: 5, label: "وصف المنتج والملاحظات", title: "الوصف" },
  { id: "quantity", visible: true, order: 6, label: "تحديد الكمية وباقات الشحن", title: "اختيار الكمية" },
  { id: "add_to_cart", visible: true, order: 7, label: "زر الإضافة إلى السلة", title: "إضافة إلى السلة", button_text: "إضافة إلى السلة" },
  { id: "buy_now", visible: true, order: 8, label: "زر الشراء وتأكيد الطلب", title: "شراء الآن", button_text: "شراء الآن" },
  { id: "guarantees", visible: true, order: 9, label: "شارات الأمان والضمان الفوري", title: "الضمان والراحة" },
  { id: "reviews", visible: true, order: 10, label: "آراء وتقييمات العملاء", title: "التقييمات والمراجعات" },
  { id: "related_products", visible: true, order: 11, label: "منتجات ذات صلة من نفس القسم", title: "منتجات قد تعجبك" },
  { id: "share_buttons", visible: true, order: 12, label: "أزرار المشاركة والمفضلة", title: "مشاركة والمفضلة" },
  { id: "specifications", visible: false, order: 13, label: "المواصفات التقنية والشحن", title: "المواصفات والتفاصيل" }
];

const DEFAULT_CUSTOMIZATION: CustomizationConfig = {
  image_size: "250px",
  price_color: "#FDE68A",
  button_color: "#C8A45C",
  button_text_color: "#1A1A1A",
  bg_color: "#1A1A1A",
  text_color: "#FFFFFF",
  border_color: "#C8A45C",
  border_radius: "16px",
  font_family: "Cairo"
};

const SECTION_ICONS: Record<string, string> = {
  image: "📷",
  title: "🏷️",
  price: "💵",
  rating: "⭐",
  description: "📝",
  quantity: "🔢",
  buy_now: "🛒",
  guarantees: "🛡️",
  reviews: "💬",
  related_products: "📦",
  share_buttons: "🔗",
  specifications: "⚙️"
};

export default function ProductPageSettings() {
  const [sections, setSections] = useState<SectionConfig[]>(DEFAULT_SECTIONS);
  const [customization, setCustomization] = useState<CustomizationConfig>(DEFAULT_CUSTOMIZATION);
  const [useLegacy, setUseLegacy] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await get("/admin/product-page-settings");
      if (data) {
        if (Array.isArray(data.sections)) {
          // Merge with DEFAULT_SECTIONS if any new sections added
          const existingIds = new Set(data.sections.map((s: any) => s.id));
          const merged = [...data.sections];
          DEFAULT_SECTIONS.forEach((sec) => {
            if (!existingIds.has(sec.id)) {
              merged.push({ ...sec, order: merged.length + 1 });
            }
          });
          merged.sort((a, b) => a.order - b.order);
          setSections(merged);
        }
        if (data.customization) {
          setCustomization((prev) => ({ ...prev, ...data.customization }));
        }
        if (typeof data.use_legacy_product_page === "boolean") {
          setUseLegacy(data.use_legacy_product_page);
        }
      }
    } catch (err) {
      toast.error("فشل تحميل إعدادات صفحة المنتج");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggleVisible = (id: string) => {
    setSections((prev) =>
      prev.map((sec) => (sec.id === id ? { ...sec, visible: !sec.visible } : sec))
    );
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    // Recalculate order values
    const reordered = updated.map((item, idx) => ({ ...item, order: idx + 1 }));
    setSections(reordered);
  };

  const handleCustomizationChange = (field: keyof CustomizationConfig, value: string) => {
    setCustomization((prev) => ({ ...prev, [field]: value }));
  };

  const handleSectionTextChange = (id: string, field: "title" | "button_text", value: string) => {
    setSections((prev) =>
      prev.map((sec) => (sec.id === id ? { ...sec, [field]: value } : sec))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        sections,
        customization,
        use_legacy_product_page: useLegacy,
      };

      await put("/admin/product-page-settings", payload);
      try {
        await put("/admin/product-page-config", payload);
      } catch (e) {
        // optional fallback
      }

      // Also sync theme-settings for backward compatibility
      await put("/admin/theme-settings", {
        product_image_size: customization.image_size,
        product_bg_color: customization.bg_color,
        product_button_color: customization.button_color,
        product_text_color: customization.text_color,
        product_border_color: customization.border_color,
        product_legacy_mode: useLegacy,
        use_legacy_product_page: useLegacy,
      });

      toast.success("تم حفظ وتحديث صفحة المنتج بنجاح! 🚀");
    } catch {
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setSections(DEFAULT_SECTIONS);
    setCustomization(DEFAULT_CUSTOMIZATION);
    setUseLegacy(false);
    toast.info("تمت استعادة الإعدادات الافتراضية");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#C8A45C] space-y-3" dir="rtl">
        <div className="w-8 h-8 border-2 border-[#C8A45C] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold">جاري تحميل إعدادات صفحة المنتج...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300 text-right" dir="rtl">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#242424] p-5 rounded-2xl border border-[#C8A45C]/30 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#C8A45C]/15 border border-[#C8A45C]/40 flex items-center justify-center text-[#C8A45C]">
            <Package size={26} />
          </div>
          <div>
            <h1 className="text-lg font-black text-[#FDE68A] flex items-center gap-2">
              تخصيص صفحة تفاصيل المنتج والشراء
              <span className="text-[10px] bg-[#C8A45C]/20 text-[#C8A45C] px-2.5 py-0.5 rounded-full border border-[#C8A45C]/30 font-bold">
                تحكم كامل
              </span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              إظهار أو إخفاء أي عنصر، إعادة الترتيب بالكامل، وتعديل المظهر والألوان للمتجر
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2.5 bg-[#1A1A1A] hover:bg-black text-zinc-400 hover:text-white rounded-xl border border-zinc-800 transition text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={15} />
            <span>افتراضي</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] rounded-xl font-black text-xs transition shadow-lg shadow-[#C8A45C]/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save size={16} />
            <span>{saving ? "جاري الحفظ..." : "حفظ التغييرات"}</span>
          </button>
        </div>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: CONTROLS & SECTIONS (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Legacy Mode Switch Box */}
          <div className="bg-[#242424] p-5 rounded-2xl border border-[#C8A45C]/30 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C8A45C]/15 border border-[#C8A45C]/30 flex items-center justify-center text-[#C8A45C]">
                  <LayoutGrid size={18} />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-[#FDE68A]">الوضع الكلاسيكي (Legacy Mode)</h2>
                  <p className="text-[10px] text-zinc-400">استخدام الواجهة القديمة (بانر خلفية علوي عريض)</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useLegacy}
                  onChange={(e) => setUseLegacy(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C8A45C]" />
              </label>
            </div>
          </div>

          {/* 2. Sections Visibility & Reordering */}
          <div className="bg-[#242424] p-5 rounded-2xl border border-[#C8A45C]/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders size={18} className="text-[#C8A45C]" />
                <h2 className="text-xs font-bold text-[#FDE68A]">ترتيب وإظهار عناصر الصفحة (Sections Order)</h2>
              </div>
              <span className="text-[10px] text-zinc-400 bg-[#1A1A1A] px-2.5 py-1 rounded-full border border-zinc-800 font-mono">
                {sections.filter((s) => s.visible).length} / {sections.length} ظاهرة
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              يمكنك إخفاء أي عنصر تماماً بالنقر على زر العين، أو إعادة ترتيب الظهور باستخدام أزرار الأسهم:
            </p>

            <div className="space-y-3">
              {sections.map((sec, idx) => (
                <div
                  key={sec.id}
                  className={`p-3.5 rounded-xl border transition-all duration-200 space-y-2.5 ${
                    sec.visible
                      ? "bg-[#1A1A1A] border-zinc-800 text-white"
                      : "bg-[#1A1A1A]/40 border-zinc-800/60 text-zinc-500 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-[#242424] border border-zinc-700 flex items-center justify-center font-mono text-[10px] text-[#C8A45C] font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-sm">{SECTION_ICONS[sec.id] || "📌"}</span>
                      <div>
                        <div className="font-bold text-xs flex items-center gap-2">
                          <span>{sec.label}</span>
                          {!sec.visible && (
                            <span className="text-[9px] bg-red-950/80 text-red-400 border border-red-800/50 px-1.5 py-0.2 rounded font-normal">
                              مخفي
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">ID: {sec.id}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Move Up/Down Controls */}
                      <div className="flex items-center gap-1 bg-[#242424] p-1 rounded-lg border border-zinc-800">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMove(idx, -1)}
                          className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 rounded hover:bg-zinc-800 cursor-pointer"
                          title="تحريك لأعلى"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === sections.length - 1}
                          onClick={() => handleMove(idx, 1)}
                          className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 rounded hover:bg-zinc-800 cursor-pointer"
                          title="تحريك لأسفل"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>

                      {/* Visibility Toggle Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleVisible(sec.id)}
                        className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                          sec.visible
                            ? "bg-[#C8A45C]/20 border-[#C8A45C]/50 text-[#FDE68A]"
                            : "bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {sec.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Section Title & Button Text Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80 text-xs">
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">عنوان القسم المخاطب به العميل:</label>
                      <input
                        type="text"
                        value={sec.title || ""}
                        onChange={(e) => handleSectionTextChange(sec.id, "title", e.target.value)}
                        placeholder={sec.label}
                        className="w-full bg-[#242424] border border-zinc-800 text-white rounded-lg px-2.5 py-1.5 text-xs focus:border-[#C8A45C] outline-none"
                      />
                    </div>

                    {(sec.id === "buy_now" || sec.id === "add_to_cart") && (
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-1">نص الزر التفاعلي:</label>
                        <input
                          type="text"
                          value={sec.button_text || ""}
                          onChange={(e) => handleSectionTextChange(sec.id, "button_text", e.target.value)}
                          placeholder="نص الزر"
                          className="w-full bg-[#242424] border border-zinc-800 text-[#FDE68A] font-bold rounded-lg px-2.5 py-1.5 text-xs focus:border-[#C8A45C] outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Style & Color Customization */}
          <div className="bg-[#242424] p-5 rounded-2xl border border-[#C8A45C]/30 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Palette size={18} className="text-[#C8A45C]" />
              <h2 className="text-xs font-bold text-[#FDE68A]">تخصيص المظهر والألوان (Customization & Styles)</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Image Size Selector */}
              <div className="space-y-1.5 p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800 col-span-1 sm:col-span-2">
                <label className="block text-zinc-300 font-bold flex items-center justify-between">
                  <span>حجم صورة المنتج بالصفحة:</span>
                  <span className="font-mono text-[#FDE68A] text-[10px] bg-[#242424] px-2 py-0.5 rounded border border-[#C8A45C]/30">
                    {customization.image_size}
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { label: "صغير (180px)", val: "180px" },
                    { label: "متوسط (250px)", val: "250px" },
                    { label: "كبير (350px)", val: "350px" },
                  ].map((sz) => (
                    <button
                      key={sz.val}
                      type="button"
                      onClick={() => handleCustomizationChange("image_size", sz.val)}
                      className={`p-2 rounded-xl border text-center transition cursor-pointer text-xs font-bold ${
                        customization.image_size === sz.val
                          ? "bg-[#C8A45C]/20 border-[#C8A45C] text-[#FDE68A]"
                          : "bg-[#242424] border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Color */}
              <div className="space-y-1.5 p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800">
                <label className="block text-zinc-300 font-semibold">خلفية الصفحة (Background)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customization.bg_color}
                    onChange={(e) => handleCustomizationChange("bg_color", e.target.value)}
                    className="w-8 h-8 rounded-lg border border-zinc-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customization.bg_color}
                    onChange={(e) => handleCustomizationChange("bg_color", e.target.value)}
                    className="flex-1 bg-[#242424] border border-zinc-700 text-white font-mono px-2.5 py-1 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Text Color */}
              <div className="space-y-1.5 p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800">
                <label className="block text-zinc-300 font-semibold">لون النص الرئيسي (Text)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customization.text_color}
                    onChange={(e) => handleCustomizationChange("text_color", e.target.value)}
                    className="w-8 h-8 rounded-lg border border-zinc-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customization.text_color}
                    onChange={(e) => handleCustomizationChange("text_color", e.target.value)}
                    className="flex-1 bg-[#242424] border border-zinc-700 text-white font-mono px-2.5 py-1 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Button Color */}
              <div className="space-y-1.5 p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800">
                <label className="block text-zinc-300 font-semibold">لون زر الشراء الرئيسي</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customization.button_color}
                    onChange={(e) => handleCustomizationChange("button_color", e.target.value)}
                    className="w-8 h-8 rounded-lg border border-zinc-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customization.button_color}
                    onChange={(e) => handleCustomizationChange("button_color", e.target.value)}
                    className="flex-1 bg-[#242424] border border-zinc-700 text-white font-mono px-2.5 py-1 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Price Color */}
              <div className="space-y-1.5 p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800">
                <label className="block text-zinc-300 font-semibold">لون خط السعر والمجموع</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customization.price_color}
                    onChange={(e) => handleCustomizationChange("price_color", e.target.value)}
                    className="w-8 h-8 rounded-lg border border-zinc-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customization.price_color}
                    onChange={(e) => handleCustomizationChange("price_color", e.target.value)}
                    className="flex-1 bg-[#242424] border border-zinc-700 text-white font-mono px-2.5 py-1 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Border Color */}
              <div className="space-y-1.5 p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800">
                <label className="block text-zinc-300 font-semibold">لون الإطار والحدود (Border)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customization.border_color}
                    onChange={(e) => handleCustomizationChange("border_color", e.target.value)}
                    className="w-8 h-8 rounded-lg border border-zinc-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customization.border_color}
                    onChange={(e) => handleCustomizationChange("border_color", e.target.value)}
                    className="flex-1 bg-[#242424] border border-zinc-700 text-white font-mono px-2.5 py-1 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Border Radius */}
              <div className="space-y-1.5 p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800">
                <label className="block text-zinc-300 font-semibold">انحناء الزوايا (Radius)</label>
                <select
                  value={customization.border_radius}
                  onChange={(e) => handleCustomizationChange("border_radius", e.target.value)}
                  className="w-full bg-[#242424] border border-zinc-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-mono"
                >
                  <option value="8px">8px (حاد)</option>
                  <option value="12px">12px (متوسط)</option>
                  <option value="16px">16px (افتراضي ناعم)</option>
                  <option value="24px">24px (دائري بلس)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REAL-TIME LIVE PREVIEW (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-6 bg-[#242424] p-5 rounded-2xl border border-[#C8A45C]/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#C8A45C]" />
                <h2 className="text-xs font-bold text-[#FDE68A]">المعاينة المباشرة (Live Storefront Preview)</h2>
              </div>
              <span className="text-[10px] bg-[#C8A45C]/20 text-[#C8A45C] px-2 py-0.5 rounded font-mono font-bold">
                تفاعلي
              </span>
            </div>

            {/* PREVIEW CONTAINER */}
            <div
              className="p-4 rounded-2xl border transition-all duration-300 space-y-3 text-xs overflow-hidden"
              style={{
                backgroundColor: customization.bg_color,
                color: customization.text_color,
                borderColor: `${customization.border_color}50`,
                borderRadius: customization.border_radius,
                fontFamily: customization.font_family,
              }}
            >
              <div className="text-[10px] text-zinc-400 font-bold border-b border-zinc-800 pb-1 flex justify-between">
                <span>معاينة صفحة المنتج بالمتجر</span>
                <span className="text-[#C8A45C]">{useLegacy ? "وضع كلاسيكي" : "وضع ديناميكي"}</span>
              </div>

              {/* RENDER DYNAMIC PREVIEW SECTIONS ACCORDING TO ORDER AND VISIBILITY */}
              {sections
                .filter((s) => s.visible)
                .map((sec) => {
                  switch (sec.id) {
                    case "image":
                      return (
                        <div
                          key={sec.id}
                          className="bg-black/40 p-4 rounded-xl border flex flex-col items-center justify-center relative my-1"
                          style={{ borderColor: `${customization.border_color}40` }}
                        >
                          <div
                            className="flex items-center justify-center bg-[#1A1A1A] rounded-xl border p-2"
                            style={{
                              width: customization.image_size === "180px" ? "120px" : customization.image_size === "350px" ? "200px" : "150px",
                              height: customization.image_size === "180px" ? "120px" : customization.image_size === "350px" ? "200px" : "150px",
                              borderColor: `${customization.border_color}60`,
                            }}
                          >
                            <ShoppingCart className="w-8 h-8 text-[#C8A45C]" />
                          </div>
                          <span className="text-[10px] text-zinc-400 mt-1">صورة المنتج الرئيسية</span>
                        </div>
                      );

                    case "title":
                      return (
                        <div key={sec.id} className="space-y-1 my-1">
                          <span className="text-[9px] bg-[#C8A45C]/20 text-[#C8A45C] px-2 py-0.5 rounded-full font-bold">
                            بطاقات العرض المميزة
                          </span>
                          <div className="font-black text-sm text-white">بطاقة شحن رصيد إلكترونية 100$</div>
                        </div>
                      );

                    case "price":
                      return (
                        <div
                          key={sec.id}
                          className="p-3 rounded-xl border flex items-center justify-between my-1 bg-black/30"
                          style={{ borderColor: `${customization.border_color}40` }}
                        >
                          <span className="text-zinc-400 text-[10px]">السعر الإجمالي:</span>
                          <span className="font-black font-mono text-base" style={{ color: customization.price_color }}>
                            $99.0000
                          </span>
                        </div>
                      );

                    case "rating":
                      return (
                        <div key={sec.id} className="flex items-center gap-2 text-[10px] my-1">
                          <div className="flex text-[#C8A45C]">★★★★★</div>
                          <span className="text-zinc-400">(4.9/5 بناءً على 120 تقييم)</span>
                          <span className="bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded font-bold">متوفر</span>
                        </div>
                      );

                    case "description":
                      return (
                        <div key={sec.id} className="p-2 bg-black/20 rounded-lg text-[10px] text-zinc-300 leading-relaxed my-1">
                          شحن فوري ومباشر للحساب بدون انتظار. يتطلب أدخال معرف اللاعب (Player ID).
                        </div>
                      );

                    case "quantity":
                      return (
                        <div key={sec.id} className="space-y-1 my-1">
                          <div className="text-[10px] font-bold text-zinc-300">الكمية المطلوبة:</div>
                          <div className="flex gap-1.5">
                            {["1", "2", "5", "10"].map((q, i) => (
                              <div
                                key={q}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold border ${
                                  i === 0 ? "bg-[#C8A45C] text-black border-[#C8A45C]" : "bg-zinc-800 text-zinc-300 border-zinc-700"
                                }`}
                              >
                                {q}
                              </div>
                            ))}
                          </div>
                        </div>
                      );

                    case "buy_now":
                      return (
                        <button
                          key={sec.id}
                          type="button"
                          className="w-full py-2.5 rounded-xl font-black text-xs shadow-md transition my-1 flex items-center justify-center gap-1.5"
                          style={{
                            backgroundColor: customization.button_color,
                            color: customization.button_text_color,
                          }}
                        >
                          <ShoppingCart size={15} />
                          تأكيد الشراء المباشر ($99.00)
                        </button>
                      );

                    case "guarantees":
                      return (
                        <div
                          key={sec.id}
                          className="p-2 bg-black/30 rounded-xl border space-y-1 my-1 text-[10px]"
                          style={{ borderColor: `${customization.border_color}30` }}
                        >
                          <div className="font-bold text-[#FDE68A] flex items-center gap-1">
                            <ShieldCheck size={12} /> ضمان الشحن الآمن وسرعة التنفيذ
                          </div>
                          <div className="text-zinc-400">معالجة أوتوماتيكية ودعم على مدار الساعة</div>
                        </div>
                      );

                    case "reviews":
                      return (
                        <div key={sec.id} className="p-2 bg-black/20 rounded-xl border border-zinc-800 space-y-1 my-1 text-[10px]">
                          <div className="font-bold text-[#C8A45C] flex items-center justify-between">
                            <span>آراء المشترين ⭐</span>
                            <span>4.9 / 5</span>
                          </div>
                          <div className="text-zinc-400 italic">"خدمة ممتازة وسريعة جداً"</div>
                        </div>
                      );

                    case "related_products":
                      return (
                        <div key={sec.id} className="p-2 bg-black/20 rounded-xl border border-zinc-800 space-y-1.5 my-1">
                          <div className="font-bold text-xs text-[#FDE68A]">منتجات مشابهة</div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="p-1.5 bg-zinc-800/80 rounded text-[9px] text-zinc-300">منتج فرعي 50$</div>
                            <div className="p-1.5 bg-zinc-800/80 rounded text-[9px] text-zinc-300">منتج فرعي 200$</div>
                          </div>
                        </div>
                      );

                    case "share_buttons":
                      return (
                        <div key={sec.id} className="flex justify-end gap-2 text-[10px] text-zinc-400 my-1">
                          <span className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded">
                            <Share2 size={10} /> مشاركة
                          </span>
                          <span className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded">
                            <Heart size={10} /> المفضلة
                          </span>
                        </div>
                      );

                    default:
                      return null;
                  }
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
