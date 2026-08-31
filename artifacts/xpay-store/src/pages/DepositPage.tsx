import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Wallet,
  Smartphone,
  Landmark,
  ShieldCheck,
  CreditCard,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  Info,
  Sparkles,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { getPublicJson } from "@/lib/public-api";
import { toast } from "sonner";
import LegacyDeposit from "./deposit-legacy";

export interface PaymentField {
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
}

export interface PaymentMethodItem {
  id: string;
  code?: string;
  name: string;
  icon?: string;
  description: string;
  active: boolean;
  order: number;
  fields?: PaymentField[];
}

export interface DepositSections {
  header: { visible: boolean; title: string; description: string };
  payment_methods: { visible: boolean; title: string; description: string };
  amounts: { visible: boolean; title: string; description: string; suggested_amounts: number[] };
  custom_amount: { visible: boolean; label: string; placeholder: string; min: number; max: number; currency: string };
  instructions: { visible: boolean; title: string; content: string; steps: string[] };
}

export interface DepositStyles {
  bg_color: string;
  text_color: string;
  title_color: string;
  card_bg: string;
  card_border: string;
  input_bg: string;
  input_text: string;
  input_border: string;
  input_focus_border: string;
  button_bg: string;
  button_text: string;
  button_hover: string;
  border_radius: string;
  font_family: string;
  amount_button_bg: string;
  amount_button_text: string;
  amount_button_active_bg: string;
  amount_button_active_text: string;
}

export interface DepositConfig {
  title: string;
  subtitle: string;
  sections: DepositSections;
  payment_methods_list: PaymentMethodItem[];
  styles: DepositStyles;
}

const DEFAULT_DEPOSIT_CONFIG: DepositConfig = {
  title: "شحن الرصيد",
  subtitle: "اختر طريقة الدفع المناسبة وقم بشحن محفظتك بسهولة وأمان",
  sections: {
    header: { visible: true, title: "شحن الرصيد", description: "أضف رصيداً إلى محفظتك واستمتع بخدماتنا" },
    payment_methods: { visible: true, title: "طرق الدفع المتاحة", description: "اختر طريقة الدفع المناسبة لك" },
    amounts: {
      visible: true,
      title: "المبالغ المقترحة",
      description: "اختر المبلغ الذي ترغب في شحنه",
      suggested_amounts: [10, 25, 50, 100, 250, 500],
    },
    custom_amount: {
      visible: true,
      label: "مبلغ مخصص",
      placeholder: "أدخل المبلغ الذي ترغب في شحنه",
      min: 1,
      max: 10000,
      currency: "USD",
    },
    instructions: {
      visible: true,
      title: "تعليمات الشحن",
      content: "يرجى اتباع التعليمات التالية لإتمام عملية الشحن بنجاح...",
      steps: [
        "اختر طريقة الدفع المناسبة",
        "أدخل المبلغ الذي ترغب في شحنه",
        "اتبع التعليمات الخاصة بطريقة الدفع المختارة",
        "تأكد من إدخال البيانات بشكل صحيح",
      ],
    },
  },
  payment_methods_list: [
    {
      id: "sham_cash",
      name: "شام كاش",
      icon: "Landmark",
      description: "الدفع عبر محفظة شام كاش",
      active: true,
      order: 1,
      fields: [{ label: "رقم المحفظة", type: "text", required: true, placeholder: "أدخل رقم محفظة شام كاش" }],
    },
    {
      id: "syriatel_cash",
      name: "سيريتل كاش",
      icon: "Smartphone",
      description: "الدفع عبر خدمة سيريتل كاش",
      active: true,
      order: 2,
      fields: [{ label: "رقم الهاتف", type: "text", required: true, placeholder: "أدخل رقم هاتفك" }],
    },
    {
      id: "bank_transfer",
      name: "تحويل بنكي",
      icon: "Landmark",
      description: "التحويل البنكي المباشر",
      active: true,
      order: 3,
      fields: [
        { label: "اسم البنك", type: "text", required: true, placeholder: "اسم البنك" },
        { label: "رقم الحساب", type: "text", required: true, placeholder: "رقم الحساب" },
        { label: "اسم المستفيد", type: "text", required: true, placeholder: "اسم المستفيد" },
      ],
    },
  ],
  styles: {
    bg_color: "#1A1A1A",
    text_color: "#FFFFFF",
    title_color: "#C8A45C",
    card_bg: "#2D2D2D",
    card_border: "#C8A45C/20",
    input_bg: "#3D3D3D",
    input_text: "#FFFFFF",
    input_border: "#4B5563",
    input_focus_border: "#C8A45C",
    button_bg: "#C8A45C",
    button_text: "#1A1A1A",
    button_hover: "#B8954A",
    border_radius: "16px",
    font_family: "Cairo",
    amount_button_bg: "#2D2D2D",
    amount_button_text: "#C8A45C",
    amount_button_active_bg: "#C8A45C",
    amount_button_active_text: "#1A1A1A",
  },
};

export default function DepositPage() {
  const [, setLocation] = useLocation();
  const [config, setConfig] = useState<DepositConfig>(DEFAULT_DEPOSIT_CONFIG);
  const [useLegacy, setUseLegacy] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Form selections state
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [customAmountVal, setCustomAmountVal] = useState<string>("");
  const [fieldInputs, setFieldInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getPublicJson<{ config?: DepositConfig; use_legacy_deposit_page?: boolean }>(
      "/public/deposit-config"
    )
      .then((data) => {
        if (cancelled) return;
        if (data) {
          if (data.config) setConfig(data.config);
          if (data.use_legacy_deposit_page !== undefined) {
            setUseLegacy(Boolean(data.use_legacy_deposit_page));
          }
        }
      })
      .catch((err) => {
        console.error("Failed loading deposit config:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Default selected method when config loads
  useEffect(() => {
    if (config?.payment_methods_list && config.payment_methods_list.length > 0) {
      const activeMethods = config.payment_methods_list.filter((m) => m.active);
      if (activeMethods.length > 0 && !selectedMethodId) {
        setSelectedMethodId(activeMethods[0].id);
      }
    }
  }, [config]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] text-white p-6 flex flex-col items-center justify-center space-y-4" dir="rtl">
        <Skeleton className="w-16 h-16 rounded-2xl bg-zinc-800 animate-pulse" />
        <Skeleton className="w-48 h-6 rounded-xl bg-zinc-800 animate-pulse" />
        <Skeleton className="w-64 h-4 rounded-xl bg-zinc-800 animate-pulse" />
      </div>
    );
  }

  // Render Legacy Mode if enabled
  if (useLegacy) {
    return <LegacyDeposit />;
  }

  const selectedMethod = config.payment_methods_list?.find((m) => m.id === selectedMethodId);

  const getIconComponent = (iconName?: string) => {
    switch (iconName) {
      case "Smartphone":
        return <Smartphone className="w-6 h-6 text-[#C8A45C]" />;
      case "Landmark":
        return <Landmark className="w-6 h-6 text-[#C8A45C]" />;
      case "CreditCard":
        return <CreditCard className="w-6 h-6 text-[#C8A45C]" />;
      case "ShieldCheck":
        return <ShieldCheck className="w-6 h-6 text-[#C8A45C]" />;
      case "Wallet":
      default:
        return <Wallet className="w-6 h-6 text-[#C8A45C]" />;
    }
  };

  const finalAmount = customAmountVal ? parseFloat(customAmountVal) : selectedAmount || 0;

  const handleProceed = () => {
    if (!selectedMethodId) {
      toast.error("يرجى اختيار طريقة الدفع المناسبة");
      return;
    }
    if (!finalAmount || finalAmount <= 0) {
      toast.error("يرجى تحديد أو إدخال مبلغ شحن صريح");
      return;
    }

    if (config.sections.custom_amount.visible && customAmountVal) {
      const val = parseFloat(customAmountVal);
      if (val < config.sections.custom_amount.min || val > config.sections.custom_amount.max) {
        toast.error(
          `المبلغ المخصص يجب أن يكون بين ${config.sections.custom_amount.min} و ${config.sections.custom_amount.max}`
        );
        return;
      }
    }

    // Check required fields
    if (selectedMethod?.fields) {
      for (const field of selectedMethod.fields) {
        if (field.required && !fieldInputs[field.label]) {
          toast.error(`يرجى ملء الحقل المطلوب: ${field.label}`);
          return;
        }
      }
    }

    // Redirect to deposit method flow or display confirmation
    const targetCode = selectedMethod?.code || selectedMethod?.id || "sham_cash";
    setLocation(`/deposit/${targetCode}?amount=${finalAmount}`);
  };

  return (
    <div
      className="min-h-screen pb-24 p-4 sm:p-6 transition-colors duration-300 animate-in fade-in"
      style={{
        backgroundColor: config.styles.bg_color || "#1A1A1A",
        color: config.styles.text_color || "#FFFFFF",
        fontFamily: config.styles.font_family || "Cairo",
      }}
      dir="rtl"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header section */}
        {config.sections.header.visible && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center my-6 space-y-3"
          >
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-[#C8A45C]/30 to-[#1A1A1A] border border-[#C8A45C]/50 flex items-center justify-center shadow-[0_0_25px_rgba(200,164,92,0.25)]">
              <Wallet className="w-8 h-8 text-[#C8A45C]" />
            </div>

            <h1
              className="text-2xl sm:text-3xl font-black"
              style={{ color: config.styles.title_color || "#C8A45C" }}
            >
              {config.sections.header.title || config.title}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
              {config.sections.header.description || config.subtitle}
            </p>
          </motion.div>
        )}

        {/* Section 1: Payment Methods */}
        {config.sections.payment_methods.visible && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 sm:p-6 border shadow-xl space-y-4"
            style={{
              backgroundColor: config.styles.card_bg || "#2D2D2D",
              borderRadius: config.styles.border_radius || "16px",
              borderColor: `${config.styles.title_color || "#C8A45C"}33`,
            }}
          >
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <CreditCard className="w-5 h-5 text-[#C8A45C]" />
              <h2
                className="font-black text-sm sm:text-base"
                style={{ color: config.styles.title_color || "#C8A45C" }}
              >
                {config.sections.payment_methods.title}
              </h2>
            </div>

            {config.sections.payment_methods.description && (
              <p className="text-xs opacity-75">{config.sections.payment_methods.description}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {config.payment_methods_list
                ?.filter((m) => m.active)
                .map((method) => {
                  const isSelected = selectedMethodId === method.id;
                  return (
                    <div
                      key={method.id}
                      onClick={() => setSelectedMethodId(method.id)}
                      className={`p-4 border transition-all cursor-pointer flex flex-col items-center text-center space-y-2 relative ${
                        isSelected
                          ? "ring-2 ring-[#C8A45C] shadow-[0_0_15px_rgba(200,164,92,0.3)] bg-[#383838]"
                          : "hover:bg-[#333333] hover:border-[#C8A45C]/50 opacity-80 hover:opacity-100"
                      }`}
                      style={{
                        backgroundColor: isSelected ? "#383838" : config.styles.card_bg || "#2D2D2D",
                        borderRadius: "12px",
                        borderColor: isSelected ? "#C8A45C" : `${config.styles.title_color || "#C8A45C"}25`,
                      }}
                    >
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[#C8A45C] absolute top-2 right-2" />
                      )}
                      <div className="w-10 h-10 rounded-2xl bg-[#1A1A1A] border border-[#C8A45C]/40 flex items-center justify-center">
                        {getIconComponent(method.icon)}
                      </div>
                      <span className="font-bold text-xs text-white">{method.name}</span>
                      <p className="text-[10px] text-zinc-400 leading-tight">{method.description}</p>
                    </div>
                  );
                })}
            </div>

            {/* Render method custom input fields if available */}
            {selectedMethod?.fields && selectedMethod.fields.length > 0 && (
              <div className="pt-3 border-t border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-[#FDE68A]">
                  بيانات مطلوبة لإستكمال الشحن عبر ({selectedMethod.name}):
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedMethod.fields.map((field, idx) => (
                    <div key={idx} className="space-y-1">
                      <label className="block text-xs font-bold opacity-90">
                        {field.label} {field.required && <span className="text-red-400">*</span>}
                      </label>
                      <input
                        type={field.type || "text"}
                        placeholder={field.placeholder || ""}
                        value={fieldInputs[field.label] || ""}
                        onChange={(e) =>
                          setFieldInputs({ ...fieldInputs, [field.label]: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold border focus:outline-hidden"
                        style={{
                          backgroundColor: config.styles.input_bg || "#3D3D3D",
                          color: config.styles.input_text || "#FFFFFF",
                          borderColor: config.styles.input_border || "#4B5563",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Section 2: Suggested Amounts */}
        {config.sections.amounts.visible && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-5 sm:p-6 border shadow-xl space-y-4"
            style={{
              backgroundColor: config.styles.card_bg || "#2D2D2D",
              borderRadius: config.styles.border_radius || "16px",
              borderColor: `${config.styles.title_color || "#C8A45C"}33`,
            }}
          >
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <DollarSign className="w-5 h-5 text-[#C8A45C]" />
              <h2
                className="font-black text-sm sm:text-base"
                style={{ color: config.styles.title_color || "#C8A45C" }}
              >
                {config.sections.amounts.title}
              </h2>
            </div>

            {config.sections.amounts.description && (
              <p className="text-xs opacity-75">{config.sections.amounts.description}</p>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {(config.sections.amounts.suggested_amounts || []).map((amt) => {
                const isSelected = selectedAmount === amt && !customAmountVal;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setSelectedAmount(amt);
                      setCustomAmountVal("");
                    }}
                    className="py-3 px-2 rounded-xl font-black text-sm border transition-all cursor-pointer shadow-md"
                    style={{
                      backgroundColor: isSelected
                        ? config.styles.button_bg || "#C8A45C"
                        : config.styles.amount_button_bg || "#2D2D2D",
                      color: isSelected
                        ? config.styles.button_text || "#1A1A1A"
                        : config.styles.amount_button_text || "#C8A45C",
                      borderColor: isSelected
                        ? config.styles.button_bg || "#C8A45C"
                        : `${config.styles.title_color || "#C8A45C"}40`,
                    }}
                  >
                    ${amt}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Section 3: Custom Amount */}
        {config.sections.custom_amount.visible && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-5 sm:p-6 border shadow-xl space-y-3"
            style={{
              backgroundColor: config.styles.card_bg || "#2D2D2D",
              borderRadius: config.styles.border_radius || "16px",
              borderColor: `${config.styles.title_color || "#C8A45C"}33`,
            }}
          >
            <label className="block text-xs font-bold text-[#FDE68A]">
              {config.sections.custom_amount.label}:
            </label>
            <div className="relative">
              <input
                type="number"
                min={config.sections.custom_amount.min}
                max={config.sections.custom_amount.max}
                value={customAmountVal}
                onChange={(e) => {
                  setCustomAmountVal(e.target.value);
                  setSelectedAmount(null);
                }}
                placeholder={config.sections.custom_amount.placeholder}
                className="w-full px-4 py-3 rounded-xl text-sm font-bold border focus:outline-hidden pr-8"
                style={{
                  backgroundColor: config.styles.input_bg || "#3D3D3D",
                  color: config.styles.input_text || "#FFFFFF",
                  borderColor: config.styles.input_border || "#4B5563",
                }}
              />
              <span className="absolute left-4 top-3.5 text-xs font-bold text-zinc-400">
                {config.sections.custom_amount.currency || "USD"}
              </span>
            </div>
          </motion.div>
        )}

        {/* Section 4: Instructions */}
        {config.sections.instructions.visible && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="p-5 sm:p-6 border shadow-xl space-y-4"
            style={{
              backgroundColor: config.styles.card_bg || "#2D2D2D",
              borderRadius: config.styles.border_radius || "16px",
              borderColor: `${config.styles.title_color || "#C8A45C"}33`,
            }}
          >
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <ShieldCheck className="w-5 h-5 text-[#C8A45C]" />
              <h2
                className="font-black text-sm sm:text-base"
                style={{ color: config.styles.title_color || "#C8A45C" }}
              >
                {config.sections.instructions.title}
              </h2>
            </div>

            {config.sections.instructions.content && (
              <p className="text-xs opacity-85 leading-relaxed">
                {config.sections.instructions.content}
              </p>
            )}

            {config.sections.instructions.steps && config.sections.instructions.steps.length > 0 && (
              <div className="space-y-2 pt-2">
                {config.sections.instructions.steps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs opacity-90">
                    <div className="w-5 h-5 rounded-full bg-[#C8A45C]/20 border border-[#C8A45C]/40 text-[#C8A45C] font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="pt-2"
        >
          <button
            type="button"
            onClick={handleProceed}
            className="w-full py-4 px-6 rounded-2xl font-black text-base shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
            style={{
              backgroundColor: config.styles.button_bg || "#C8A45C",
              color: config.styles.button_text || "#1A1A1A",
            }}
          >
            <span>متابعة عملية الشحن ({finalAmount}$بقيمة)</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
