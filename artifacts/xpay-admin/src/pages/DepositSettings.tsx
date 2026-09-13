import React, { useEffect, useState } from "react";
import { get, put } from "../lib/api";
import { toast } from "sonner";
import { DepositPageUI, type DepositPageConfig } from "@workspace/deposit-ui";
import {
  Wallet,
  Save,
  RotateCcw,
  Sparkles,
  Plus,
  Trash2,
  Sliders,
  Type,
  Palette,
  DollarSign,
  Eye,
  CheckCircle2,
  HelpCircle,
  CreditCard,
  QrCode,
  ShieldCheck,
  Smartphone,
  ChevronDown,
} from "lucide-react";

export interface MethodDisplayConfig {
  page_title: string;
  page_subtitle: string;
  confirm_button_text: string;
  instructions: string;
  bg_color: string;
  title_color: string;
  text_color: string;
  button_color: string;
  border_color: string;
  suggested_amounts: number[];
}

export interface PaymentMethodItem {
  id: number | string;
  code: string;
  name: string;
  subtitle?: string;
  instructions?: string;
  walletAddress?: string;
  logoImage?: string;
  qrImage?: string;
  minAmount?: number;
  active?: boolean;
  order?: number;
  category?: string;
  displayConfig?: MethodDisplayConfig | null;
  display_config?: MethodDisplayConfig | null;
}

const DEFAULT_CONFIG: MethodDisplayConfig = {
  page_title: "شحن الرصيد",
  page_subtitle: "أضف رصيداً إلى محفظتك لتتمكن من الشراء الفوري",
  confirm_button_text: "تأكيد والتحقق من الإيداع",
  instructions: "يرجى تحويل المبلغ المطلوب إلى عنوان المحفظة أدناه، ثم إدخال رقم العملية (Ref) لتأكيد الإيداع بشكل فوري وآمن.",
  bg_color: "#1A1A1A",
  title_color: "#C8A45C",
  text_color: "#E5E7EB",
  button_color: "#C8A45C",
  border_color: "#C8A45C",
  suggested_amounts: [10, 25, 50, 100, 250, 500],
};

export function DepositSettings() {
  const [methods, setMethods] = useState<PaymentMethodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<string | number>("");

  // Configuration state for the currently selected method
  const [config, setConfig] = useState<MethodDisplayConfig>(DEFAULT_CONFIG);
  const [newAmountInput, setNewAmountInput] = useState<string>("");

  // Interactive Live Preview state
  const [previewAmount, setPreviewAmount] = useState<number | string>(50);

  // 1. Fetch payment methods
  const fetchMethods = async () => {
    try {
      setLoading(true);
      const data = await get<PaymentMethodItem[]>("/admin/payment-methods");
      if (Array.isArray(data)) {
        setMethods(data);
        if (data.length > 0) {
          // Keep selection or default to first method
          const currentMethod = data.find((m) => String(m.id) === String(selectedMethodId)) || data[0];
          setSelectedMethodId(currentMethod.id);
          applyMethodConfig(currentMethod);
        }
      }
    } catch (err: any) {
      console.error("Failed to load payment methods for deposit settings:", err);
      toast.error("فشل في تحميل طرق الدفع لتخصيص الإيداع");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  // Helper to extract and apply config from method object
  const applyMethodConfig = (method: PaymentMethodItem) => {
    const rawConfig = method.displayConfig || method.display_config;
    if (rawConfig && typeof rawConfig === "object") {
      setConfig({
        page_title: rawConfig.page_title || `شحن الرصيد عبر ${method.name}`,
        page_subtitle: rawConfig.page_subtitle || (method.subtitle ? `طريقة دفع: ${method.subtitle}` : DEFAULT_CONFIG.page_subtitle),
        confirm_button_text: rawConfig.confirm_button_text || DEFAULT_CONFIG.confirm_button_text,
        instructions: rawConfig.instructions || method.instructions || DEFAULT_CONFIG.instructions,
        bg_color: rawConfig.bg_color || DEFAULT_CONFIG.bg_color,
        title_color: rawConfig.title_color || DEFAULT_CONFIG.title_color,
        text_color: rawConfig.text_color || DEFAULT_CONFIG.text_color,
        button_color: rawConfig.button_color || DEFAULT_CONFIG.button_color,
        border_color: rawConfig.border_color || DEFAULT_CONFIG.border_color,
        suggested_amounts: Array.isArray(rawConfig.suggested_amounts) && rawConfig.suggested_amounts.length > 0
          ? rawConfig.suggested_amounts
          : DEFAULT_CONFIG.suggested_amounts,
      });
    } else {
      // Default initial config based on method data
      setConfig({
        ...DEFAULT_CONFIG,
        page_title: `شحن الرصيد عبر ${method.name}`,
        page_subtitle: method.subtitle ? `طريقة دفع: ${method.subtitle}` : DEFAULT_CONFIG.page_subtitle,
        instructions: method.instructions || DEFAULT_CONFIG.instructions,
      });
    }
  };

  // Handle switching method from dropdown
  const handleSelectMethod = (methodId: string | number) => {
    setSelectedMethodId(methodId);
    const method = methods.find((m) => String(m.id) === String(methodId));
    if (method) {
      applyMethodConfig(method);
    }
  };

  // Reset current config to defaults
  const handleResetDefaults = () => {
    const method = methods.find((m) => String(m.id) === String(selectedMethodId));
    if (!method) return;
    if (confirm(`هل تريد إعادة ضبط إعدادات العرض لطريقة (${method.name}) إلى القيم الافتراضية؟`)) {
      setConfig({
        ...DEFAULT_CONFIG,
        page_title: `شحن الرصيد عبر ${method.name}`,
        page_subtitle: method.subtitle ? `طريقة دفع: ${method.subtitle}` : DEFAULT_CONFIG.page_subtitle,
        instructions: method.instructions || DEFAULT_CONFIG.instructions,
      });
      toast.info("تمت استعادة الإعدادات الافتراضية. اضغط على 'حفظ التعديلات' للاعتماد.");
    }
  };

  // Save current config to backend
  const handleSave = async () => {
    const selectedMethod = methods.find((m) => String(m.id) === String(selectedMethodId));
    if (!selectedMethod) {
      toast.error("يرجى اختيار طريقة دفع أولاً");
      return;
    }

    try {
      setSaving(true);
      // Payload updating payment method with displayConfig
      const payload = {
        ...selectedMethod,
        displayConfig: config,
        display_config: config,
      };

      await put(`/payment-methods/${selectedMethod.id}`, payload);
      toast.success(`تم حفظ تخصيص صفحة الإيداع لطريقة (${selectedMethod.name}) بنجاح!`);

      // Update local methods list
      setMethods((prev) =>
        prev.map((m) =>
          String(m.id) === String(selectedMethod.id)
            ? { ...m, displayConfig: config, display_config: config }
            : m
        )
      );
    } catch (err: any) {
      console.error("Save display config failed:", err);
      toast.error(err?.message || "فشل حفظ التعديلات");
    } finally {
      setSaving(false);
    }
  };

  // Suggested amounts management
  const handleAddAmount = () => {
    const val = Number(newAmountInput);
    if (!val || val <= 0 || isNaN(val)) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }
    if (config.suggested_amounts.includes(val)) {
      toast.error("هذا المبلغ موجود بالفعل");
      return;
    }
    const updated = [...config.suggested_amounts, val].sort((a, b) => a - b);
    setConfig({ ...config, suggested_amounts: updated });
    setNewAmountInput("");
  };

  const handleRemoveAmount = (amountToRemove: number) => {
    const updated = config.suggested_amounts.filter((a) => a !== amountToRemove);
    setConfig({ ...config, suggested_amounts: updated });
  };

  const selectedMethod = methods.find((m) => String(m.id) === String(selectedMethodId));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-[#C8A45C] bg-[#141414] rounded-3xl border border-[#262626]">
        <div className="w-8 h-8 border-2 border-[#C8A45C] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-sm font-semibold">جاري تحميل طرق الدفع وإعدادات التخصيص...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full" dir="rtl">
      {/* Top Header Card & Method Selector */}
      <div className="bg-[#141414] p-6 rounded-3xl border border-[#262626] shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#C8A45C]/20 to-[#C8A45C]/5 border border-[#C8A45C]/30 flex items-center justify-center text-[#C8A45C] shadow-lg shrink-0">
              <Sliders size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight">
                  تخصيص صفحة شحن الرصيد
                </h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#C8A45C]/15 text-[#C8A45C] font-semibold border border-[#C8A45C]/30">
                  حسب طريقة الدفع
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                تحكم بالبيانات، النصوص، الألوان، والمبالغ المقترحة المعروضة للمستخدم في صفحة الإيداع
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 text-xs font-bold bg-[#1F1F1F] hover:bg-red-500/10 text-zinc-400 hover:text-red-400 px-4 py-2.5 rounded-2xl border border-[#333] hover:border-red-500/40 transition-all cursor-pointer"
              title="إعادة التعيين للافتراضي"
            >
              <RotateCcw size={15} />
              <span>إعادة تعيين</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#C8A45C] to-[#E5C378] text-[#141414] font-black text-xs hover:opacity-95 transition-all shadow-lg shadow-[#C8A45C]/20 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-[#141414] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save size={16} />
              )}
              <span>حفظ التعديلات</span>
            </button>
          </div>
        </div>

        {/* Dropdown: Choose Payment Method */}
        <div className="pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-bold text-[#FDE68A] flex items-center gap-1.5 shrink-0">
            <CreditCard size={16} className="text-[#C8A45C]" />
            <span>اختر طريقة الدفع للتخصيص:</span>
          </label>
          <div className="relative flex-1 max-w-md">
            <select
              value={selectedMethodId}
              onChange={(e) => handleSelectMethod(e.target.value)}
              className="w-full h-11 bg-[#1F1F1F] text-white border border-[#333] focus:border-[#C8A45C] rounded-2xl px-4 text-xs font-bold appearance-none cursor-pointer pr-4 pl-10 transition-colors"
            >
              {methods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name} ({method.code}) {method.active ? "• مفعّلة" : "• معطلة"}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#C8A45C]">
              <ChevronDown size={16} />
            </div>
          </div>
          {selectedMethod && (
            <span className="text-xs text-zinc-400 font-medium">
              النوع: <span className="text-zinc-200">{selectedMethod.category || "عام"}</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Controls on Left/Top + Live Preview on Right/Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Controls (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Texts */}
          <div className="bg-[#141414] p-5 sm:p-6 rounded-3xl border border-[#262626] shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-white border-b border-zinc-800 pb-3">
              <Type className="w-4 h-4 text-[#C8A45C]" />
              <span>قسم 1: النصوص والعناوين</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">
                  عنوان الصفحة (Title):
                </label>
                <input
                  type="text"
                  value={config.page_title}
                  onChange={(e) => setConfig({ ...config, page_title: e.target.value })}
                  placeholder="مثال: شحن الرصيد عبر شام كاش"
                  className="w-full h-11 bg-[#1F1F1F] text-white border border-[#333] focus:border-[#C8A45C] rounded-xl px-3.5 text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">
                  الوصف الفرعي (Subtitle):
                </label>
                <input
                  type="text"
                  value={config.page_subtitle}
                  onChange={(e) => setConfig({ ...config, page_subtitle: e.target.value })}
                  placeholder="مثال: أضف رصيداً إلى محفظتك لتتمكن من الشراء"
                  className="w-full h-11 bg-[#1F1F1F] text-white border border-[#333] focus:border-[#C8A45C] rounded-xl px-3.5 text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">
                  نص زر التأكيد (Confirm Button Text):
                </label>
                <input
                  type="text"
                  value={config.confirm_button_text}
                  onChange={(e) => setConfig({ ...config, confirm_button_text: e.target.value })}
                  placeholder="مثال: تأكيد والتحقق من الإيداع"
                  className="w-full h-11 bg-[#1F1F1F] text-white border border-[#333] focus:border-[#C8A45C] rounded-xl px-3.5 text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">
                  نص تعليمات الشحن (Instructions):
                </label>
                <textarea
                  rows={4}
                  value={config.instructions}
                  onChange={(e) => setConfig({ ...config, instructions: e.target.value })}
                  placeholder="اكتب تعليمات الدفع والتحويل خطوة بخطوة للمستخدم..."
                  className="w-full bg-[#1F1F1F] text-white border border-[#333] focus:border-[#C8A45C] rounded-xl p-3 text-xs leading-relaxed font-medium resize-y"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Colors */}
          <div className="bg-[#141414] p-5 sm:p-6 rounded-3xl border border-[#262626] shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-white border-b border-zinc-800 pb-3">
              <Palette className="w-4 h-4 text-[#C8A45C]" />
              <span>قسم 2: الألوان والتنسيقات</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Background Color */}
              <div className="space-y-1.5 bg-[#1F1F1F] p-3 rounded-2xl border border-[#333]">
                <label className="text-[11px] font-bold text-zinc-300 block">لون الخلفية (bg_color)</label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={config.bg_color || "#1A1A1A"}
                    onChange={(e) => setConfig({ ...config, bg_color: e.target.value })}
                    className="w-9 h-9 rounded-xl cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={config.bg_color}
                    onChange={(e) => setConfig({ ...config, bg_color: e.target.value })}
                    className="flex-1 h-9 bg-[#141414] text-white border border-zinc-700 rounded-xl px-2.5 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Title Color */}
              <div className="space-y-1.5 bg-[#1F1F1F] p-3 rounded-2xl border border-[#333]">
                <label className="text-[11px] font-bold text-zinc-300 block">لون العنوان (title_color)</label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={config.title_color || "#C8A45C"}
                    onChange={(e) => setConfig({ ...config, title_color: e.target.value })}
                    className="w-9 h-9 rounded-xl cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={config.title_color}
                    onChange={(e) => setConfig({ ...config, title_color: e.target.value })}
                    className="flex-1 h-9 bg-[#141414] text-white border border-zinc-700 rounded-xl px-2.5 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Text Color */}
              <div className="space-y-1.5 bg-[#1F1F1F] p-3 rounded-2xl border border-[#333]">
                <label className="text-[11px] font-bold text-zinc-300 block">لون النص (text_color)</label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={config.text_color || "#E5E7EB"}
                    onChange={(e) => setConfig({ ...config, text_color: e.target.value })}
                    className="w-9 h-9 rounded-xl cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={config.text_color}
                    onChange={(e) => setConfig({ ...config, text_color: e.target.value })}
                    className="flex-1 h-9 bg-[#141414] text-white border border-zinc-700 rounded-xl px-2.5 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Button Color */}
              <div className="space-y-1.5 bg-[#1F1F1F] p-3 rounded-2xl border border-[#333]">
                <label className="text-[11px] font-bold text-zinc-300 block">لون الأزرار (button_color)</label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={config.button_color || "#C8A45C"}
                    onChange={(e) => setConfig({ ...config, button_color: e.target.value })}
                    className="w-9 h-9 rounded-xl cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={config.button_color}
                    onChange={(e) => setConfig({ ...config, button_color: e.target.value })}
                    className="flex-1 h-9 bg-[#141414] text-white border border-zinc-700 rounded-xl px-2.5 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Border Color */}
              <div className="space-y-1.5 bg-[#1F1F1F] p-3 rounded-2xl border border-[#333] sm:col-span-2">
                <label className="text-[11px] font-bold text-zinc-300 block">لون الحدود والبطاقات (border_color)</label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={config.border_color || "#C8A45C"}
                    onChange={(e) => setConfig({ ...config, border_color: e.target.value })}
                    className="w-9 h-9 rounded-xl cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={config.border_color}
                    onChange={(e) => setConfig({ ...config, border_color: e.target.value })}
                    className="flex-1 h-9 bg-[#141414] text-white border border-zinc-700 rounded-xl px-2.5 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Suggested Amounts */}
          <div className="bg-[#141414] p-5 sm:p-6 rounded-3xl border border-[#262626] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-black text-white">
                <DollarSign className="w-4 h-4 text-[#C8A45C]" />
                <span>قسم 3: المبالغ المقترحة</span>
              </div>
              <span className="text-[11px] text-zinc-400">
                {config.suggested_amounts.length} مبالغ نشطة
              </span>
            </div>

            {/* List of amounts */}
            <div className="flex flex-wrap gap-2">
              {config.suggested_amounts.map((amt) => (
                <div
                  key={amt}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1F1F1F] border border-[#333] text-white font-mono text-xs font-bold"
                >
                  <span className="text-[#C8A45C]">${amt}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAmount(amt)}
                    className="text-zinc-500 hover:text-red-400 transition-colors"
                    title="حذف المبلغ"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new amount form */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="number"
                min="1"
                step="any"
                value={newAmountInput}
                onChange={(e) => setNewAmountInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddAmount()}
                placeholder="أدخل مبلغ جديد..."
                className="h-10 flex-1 max-w-[200px] bg-[#1F1F1F] text-white border border-[#333] focus:border-[#C8A45C] rounded-xl px-3 text-xs font-mono"
              />
              <button
                type="button"
                onClick={handleAddAmount}
                className="h-10 px-4 rounded-xl bg-[#252525] hover:bg-[#303030] text-zinc-200 hover:text-white border border-zinc-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>إضافة مبلغ</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live React Component Preview (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
              <Eye className="w-4 h-4 text-[#C8A45C]" />
              <span className="text-zinc-200">معاينة حية ومطابقة 100% للمتجر (DepositPageUI):</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#1F1F1F] text-[#C8A45C] border border-[#333] font-mono">
              تحديث فوري
            </span>
          </div>

          {/* Internal Live Preview Container with DepositPageUI */}
          <div className="border-2 border-[#C8A45C]/30 rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-[#0A0A0A] px-4 py-2 text-xs text-[#C8A45C] border-b border-[#C8A45C]/20 flex items-center justify-between">
              <span className="font-bold">معاينة حية (Live Preview)</span>
              <span className="text-[10px] text-zinc-400 font-mono">Single Source of Truth</span>
            </div>
            <DepositPageUI
              config={config}
              amount={String(previewAmount)}
              onAmountChange={(v) => setPreviewAmount(v)}
              onAmountSelect={(amt) => setPreviewAmount(amt)}
              currency="USD"
              walletAddress={selectedMethod?.walletAddress || "35147b5811bdc0bf07fdb11b85c8a5d"}
              isPreview={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DepositSettings;
