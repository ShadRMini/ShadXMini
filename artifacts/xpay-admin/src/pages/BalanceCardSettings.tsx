import React, { useState, useEffect } from "react";
import { get, put } from "../lib/api";
import { toast } from "sonner";
import {
  Wallet,
  Palette,
  Sliders,
  Sparkles,
  Save,
  RefreshCw,
  ShieldCheck,
  Eye,
} from "lucide-react";

export default function BalanceCardSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State
  const [balanceGradientStart, setBalanceGradientStart] = useState("#1E40AF");
  const [balanceGradientMid, setBalanceGradientMid] = useState("#3B82F6");
  const [balanceGradientEnd, setBalanceGradientEnd] = useState("#60A5FA");
  const [balanceTextColor, setBalanceTextColor] = useState("#FFFFFF");
  const [balanceSubtextColor, setBalanceSubtextColor] = useState("#E0F2FE");
  const [balanceBadgeColor, setBalanceBadgeColor] = useState("#FFFFFF");
  const [balanceCurrencyColor, setBalanceCurrencyColor] = useState("#FFFFFF");

  const [balanceRadius, setBalanceRadius] = useState<number>(24);
  const [balancePadding, setBalancePadding] = useState<number>(24);
  const [balanceAmountSize, setBalanceAmountSize] = useState<number>(32);
  const [balanceLabelSize, setBalanceLabelSize] = useState<number>(14);

  const [balanceShadow, setBalanceShadow] = useState<string>("heavy");
  const [balanceGlowEnabled, setBalanceGlowEnabled] = useState<boolean>(true);
  const [balanceGlowColor, setBalanceGlowColor] = useState("#3B82F6");

  // Fetch Settings
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await get<any>("/admin/theme-settings");
      if (data) {
        if (data.balance_gradient_start || data.balanceGradientStart) setBalanceGradientStart(data.balance_gradient_start || data.balanceGradientStart);
        if (data.balance_gradient_mid || data.balanceGradientMid) setBalanceGradientMid(data.balance_gradient_mid || data.balanceGradientMid);
        if (data.balance_gradient_end || data.balanceGradientEnd) setBalanceGradientEnd(data.balance_gradient_end || data.balanceGradientEnd);
        if (data.balance_text_color || data.balanceTextColor) setBalanceTextColor(data.balance_text_color || data.balanceTextColor);
        if (data.balance_subtext_color || data.balanceSubtextColor) setBalanceSubtextColor(data.balance_subtext_color || data.balanceSubtextColor);
        if (data.balance_badge_color || data.balanceBadgeColor) setBalanceBadgeColor(data.balance_badge_color || data.balanceBadgeColor);
        if (data.balance_currency_color || data.balanceCurrencyColor) setBalanceCurrencyColor(data.balance_currency_color || data.balanceCurrencyColor);

        if (data.balance_radius !== undefined || data.balanceRadius !== undefined) setBalanceRadius(Number(data.balance_radius ?? data.balanceRadius));
        if (data.balance_padding !== undefined || data.balancePadding !== undefined) setBalancePadding(Number(data.balance_padding ?? data.balancePadding));
        if (data.balance_amount_size !== undefined || data.balanceAmountSize !== undefined) setBalanceAmountSize(Number(data.balance_amount_size ?? data.balanceAmountSize));
        if (data.balance_label_size !== undefined || data.balanceLabelSize !== undefined) setBalanceLabelSize(Number(data.balance_label_size ?? data.balanceLabelSize));

        if (data.balance_shadow || data.balanceShadow) setBalanceShadow(data.balance_shadow || data.balanceShadow);
        if (data.balance_glow_enabled !== undefined || data.balanceGlowEnabled !== undefined) {
          const val = data.balance_glow_enabled ?? data.balanceGlowEnabled;
          setBalanceGlowEnabled(val === true || val === "true" || val === 1);
        }
        if (data.balance_glow_color || data.balanceGlowColor) setBalanceGlowColor(data.balance_glow_color || data.balanceGlowColor);
      }
    } catch (err) {
      console.warn("Could not fetch balance card settings:", err);
      toast.error("فشل جلب إعدادات بطاقة الرصيد من السيرفر");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        balance_gradient_start: balanceGradientStart,
        balance_gradient_mid: balanceGradientMid,
        balance_gradient_end: balanceGradientEnd,
        balance_text_color: balanceTextColor,
        balance_subtext_color: balanceSubtextColor,
        balance_badge_color: balanceBadgeColor,
        balance_currency_color: balanceCurrencyColor,
        balance_radius: balanceRadius,
        balance_padding: balancePadding,
        balance_amount_size: balanceAmountSize,
        balance_label_size: balanceLabelSize,
        balance_shadow: balanceShadow,
        balance_glow_enabled: balanceGlowEnabled,
        balance_glow_color: balanceGlowColor,
      };

      await put("/admin/theme-settings", payload);
      toast.success("تم حفظ إعدادات بطاقة الرصيد والمحفظة بنجاح وتطبيقها على المتجر!");
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err?.message || "حدث خطأ أثناء حفظ إعدادات بطاقة الرصيد");
    } finally {
      setSaving(false);
    }
  };

  const getShadowValue = (shadowType: string) => {
    switch (shadowType) {
      case "none":
        return "none";
      case "light":
        return "0 4px 12px rgba(0, 0, 0, 0.15)";
      case "medium":
        return "0 8px 24px rgba(0, 0, 0, 0.25)";
      case "glow":
        return `0 0 25px ${balanceGlowColor}60`;
      case "heavy":
      default:
        return "0 12px 32px rgba(30, 64, 175, 0.35)";
    }
  };

  if (loading) {
    return (
      <div className="bg-[#242424] p-8 rounded-2xl border border-zinc-800 space-y-6 animate-pulse">
        <div className="h-8 bg-zinc-800 rounded-lg w-1/3" />
        <div className="h-64 bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-zinc-100" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#242424] p-5 rounded-2xl border border-[#C8A45C]/20 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#C8A45C]/10 border border-[#C8A45C]/30 flex items-center justify-center text-[#C8A45C]">
            <Wallet size={26} />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#FDE68A] flex items-center gap-2">
              تخصيص بطاقة الرصيد والمحفظة
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              التحكم في ألوان التدرج، خطوط المبالغ، الحواف، التأثيرات والشارات الخاصة ببطاقات الرصيد في المتجر
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchSettings}
            className="p-2.5 text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition border border-zinc-700 cursor-pointer"
            title="إعادة جلب الإعدادات"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#C8A45C] to-[#B38F46] text-black font-bold rounded-xl hover:brightness-110 transition shadow-lg cursor-pointer disabled:opacity-50 text-xs"
          >
            <Save size={16} />
            <span>{saving ? "جاري الحفظ..." : "حفظ إعدادات بطاقة الرصيد"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* ═══════════ القسم 1: الألوان (Color Palette) ═══════════ */}
          <div className="bg-[#242424] p-5 rounded-2xl border border-[#C8A45C]/20 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-[#FDE68A] flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Palette size={18} className="text-[#C8A45C]" />
              <span>🎨 لوحة الألوان (Color Palette)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Gradient Start */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  لون التدرج (البداية)
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={balanceGradientStart}
                    onChange={(e) => setBalanceGradientStart(e.target.value)}
                    className="w-12 h-10 bg-[#1A1A1A] border border-zinc-700 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={balanceGradientStart}
                    onChange={(e) => setBalanceGradientStart(e.target.value)}
                    className="flex-1 bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs font-mono outline-none"
                    placeholder="#1E40AF"
                  />
                </div>
              </div>

              {/* Gradient Mid */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  لون التدرج (الوسط)
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={balanceGradientMid}
                    onChange={(e) => setBalanceGradientMid(e.target.value)}
                    className="w-12 h-10 bg-[#1A1A1A] border border-zinc-700 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={balanceGradientMid}
                    onChange={(e) => setBalanceGradientMid(e.target.value)}
                    className="flex-1 bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs font-mono outline-none"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>

              {/* Gradient End */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  لون التدرج (النهاية)
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={balanceGradientEnd}
                    onChange={(e) => setBalanceGradientEnd(e.target.value)}
                    className="w-12 h-10 bg-[#1A1A1A] border border-zinc-700 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={balanceGradientEnd}
                    onChange={(e) => setBalanceGradientEnd(e.target.value)}
                    className="flex-1 bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs font-mono outline-none"
                    placeholder="#60A5FA"
                  />
                </div>
              </div>

              {/* Text Primary */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  لون النص الأساسي (المبلغ)
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={balanceTextColor}
                    onChange={(e) => setBalanceTextColor(e.target.value)}
                    className="w-12 h-10 bg-[#1A1A1A] border border-zinc-700 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={balanceTextColor}
                    onChange={(e) => setBalanceTextColor(e.target.value)}
                    className="flex-1 bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs font-mono outline-none"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>

              {/* Subtext Color */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  لون النص الثانوي (التسمية)
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={balanceSubtextColor}
                    onChange={(e) => setBalanceSubtextColor(e.target.value)}
                    className="w-12 h-10 bg-[#1A1A1A] border border-zinc-700 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={balanceSubtextColor}
                    onChange={(e) => setBalanceSubtextColor(e.target.value)}
                    className="flex-1 bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs font-mono outline-none"
                    placeholder="#E0F2FE"
                  />
                </div>
              </div>

              {/* Badge Color */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  لون شارة "محفظة آمنة"
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={balanceBadgeColor}
                    onChange={(e) => setBalanceBadgeColor(e.target.value)}
                    className="w-12 h-10 bg-[#1A1A1A] border border-zinc-700 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={balanceBadgeColor}
                    onChange={(e) => setBalanceBadgeColor(e.target.value)}
                    className="flex-1 bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs font-mono outline-none"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>

              {/* Currency Color */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  لون العملة (USD/SYP)
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={balanceCurrencyColor}
                    onChange={(e) => setBalanceCurrencyColor(e.target.value)}
                    className="w-12 h-10 bg-[#1A1A1A] border border-zinc-700 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={balanceCurrencyColor}
                    onChange={(e) => setBalanceCurrencyColor(e.target.value)}
                    className="flex-1 bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs font-mono outline-none"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ القسم 2: التخطيط والأبعاد (Layout) ═══════════ */}
          <div className="bg-[#242424] p-5 rounded-2xl border border-[#C8A45C]/20 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-[#FDE68A] flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Sliders size={18} className="text-[#C8A45C]" />
              <span>📐 التخطيط والأبعاد (Layout & Sizes)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Border Radius */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  نصف قطر الزوايا (px): {balanceRadius}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="48"
                  value={balanceRadius}
                  onChange={(e) => setBalanceRadius(Number(e.target.value))}
                  className="w-full accent-[#C8A45C] bg-[#1A1A1A] rounded-lg h-2 cursor-pointer"
                />
              </div>

              {/* Padding */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  الحشو الداخلي (Padding): {balancePadding}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="48"
                  value={balancePadding}
                  onChange={(e) => setBalancePadding(Number(e.target.value))}
                  className="w-full accent-[#C8A45C] bg-[#1A1A1A] rounded-lg h-2 cursor-pointer"
                />
              </div>

              {/* Amount Size */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  حجم خط المبلغ (px): {balanceAmountSize}px
                </label>
                <input
                  type="range"
                  min="20"
                  max="56"
                  value={balanceAmountSize}
                  onChange={(e) => setBalanceAmountSize(Number(e.target.value))}
                  className="w-full accent-[#C8A45C] bg-[#1A1A1A] rounded-lg h-2 cursor-pointer"
                />
              </div>

              {/* Label Size */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  حجم التسمية (px): {balanceLabelSize}px
                </label>
                <input
                  type="range"
                  min="10"
                  max="20"
                  value={balanceLabelSize}
                  onChange={(e) => setBalanceLabelSize(Number(e.target.value))}
                  className="w-full accent-[#C8A45C] bg-[#1A1A1A] rounded-lg h-2 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* ═══════════ القسم 3: التأثيرات (Effects) ═══════════ */}
          <div className="bg-[#242424] p-5 rounded-2xl border border-[#C8A45C]/20 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-[#FDE68A] flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Sparkles size={18} className="text-[#C8A45C]" />
              <span>✨ التأثيرات والظلال (Effects & Glow)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Shadow Select */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  نوع الظل (Shadow)
                </label>
                <select
                  value={balanceShadow}
                  onChange={(e) => setBalanceShadow(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-zinc-700 text-white px-3 py-2 rounded-lg text-xs outline-none focus:border-[#C8A45C]"
                >
                  <option value="none">بدون ظل (None)</option>
                  <option value="light">خفيف (Light)</option>
                  <option value="medium">متوسط (Medium)</option>
                  <option value="heavy">عميق وبارز (Heavy)</option>
                  <option value="glow">متوهج (Glow)</option>
                </select>
              </div>

              {/* Glow Enabled */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  تأثير التوهج الخلفي (Orb Glow)
                </label>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setBalanceGlowEnabled(!balanceGlowEnabled)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      balanceGlowEnabled
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                    }`}
                  >
                    <span>{balanceGlowEnabled ? "مفعل ✨" : "معطل ❌"}</span>
                  </button>
                </div>
              </div>

              {/* Glow Color */}
              {balanceGlowEnabled && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    لون التوهج (Glow Color)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={balanceGlowColor}
                      onChange={(e) => setBalanceGlowColor(e.target.value)}
                      className="w-12 h-10 bg-[#1A1A1A] border border-zinc-700 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={balanceGlowColor}
                      onChange={(e) => setBalanceGlowColor(e.target.value)}
                      className="flex-1 bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs font-mono outline-none"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 bg-gradient-to-r from-[#C8A45C] to-[#B38F46] text-black font-black rounded-xl hover:brightness-110 transition shadow-lg cursor-pointer disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            <Save size={18} />
            <span>{saving ? "جاري حفظ الإعدادات..." : "💾 حفظ إعدادات بطاقة الرصيد"}</span>
          </button>
        </div>

        {/* Live Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#242424] p-5 rounded-2xl border border-[#C8A45C]/20 shadow-xl sticky top-6 space-y-4">
            <h3 className="text-sm font-bold text-[#FDE68A] flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Eye size={18} className="text-[#C8A45C]" />
              <span>👁️ معاينة حية (Live Preview)</span>
            </h3>

            <p className="text-xs text-zinc-400">
              شكل بطاقة الرصيد كما ستظهر للمستخدم في شاشات المتجر والمحفظة:
            </p>

            {/* Live Card */}
            <div className="flex justify-center pt-2">
              <div
                className="relative overflow-hidden w-full max-w-sm transition-all"
                style={{
                  background: `linear-gradient(135deg, ${balanceGradientStart} 0%, ${balanceGradientMid} 50%, ${balanceGradientEnd} 100%)`,
                  color: balanceTextColor,
                  borderRadius: `${balanceRadius}px`,
                  padding: `${balancePadding}px`,
                  boxShadow: getShadowValue(balanceShadow),
                }}
              >
                {/* Glow Decoration */}
                {balanceGlowEnabled && (
                  <div
                    className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-30 pointer-events-none blur-xl"
                    style={{ backgroundColor: balanceGlowColor }}
                  />
                )}

                <div className="relative z-10 space-y-3">
                  {/* Top Row: Label + Badge */}
                  <div className="flex items-center justify-between">
                    <p
                      style={{
                        color: balanceSubtextColor,
                        fontSize: `${balanceLabelSize}px`,
                        fontWeight: "600",
                      }}
                    >
                      رصيدك الحالي
                    </p>

                    <div
                      className="px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5"
                      style={{
                        backgroundColor: `${balanceBadgeColor}20`,
                        color: balanceBadgeColor,
                        border: `1px solid ${balanceBadgeColor}40`,
                      }}
                    >
                      <ShieldCheck size={14} style={{ color: balanceBadgeColor }} />
                      <span>محفظة آمنة</span>
                    </div>
                  </div>

                  {/* Main Amount */}
                  <div>
                    <h2
                      style={{
                        color: balanceTextColor,
                        fontSize: `${balanceAmountSize}px`,
                        fontWeight: "900",
                        lineHeight: 1.1,
                      }}
                    >
                      $25.00
                    </h2>
                    <p
                      style={{
                        color: balanceCurrencyColor,
                        fontSize: "12px",
                        marginTop: "6px",
                        fontWeight: "500",
                      }}
                    >
                      ≈ 10,875 ل.س
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
              <p className="font-bold text-zinc-300">أين تظهر هذه البطاقة؟</p>
              <ul className="list-disc list-inside space-y-0.5 pr-2">
                <li>الصفحة الرئيسية (مربع الرصيد المتاح).</li>
                <li>صفحة المحفظة الرئيسية (`/deposit`).</li>
                <li>صفحة تفاصيل الرصيد (`/wallet`).</li>
                <li>القائمة الجانبية (Sidebar).</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
