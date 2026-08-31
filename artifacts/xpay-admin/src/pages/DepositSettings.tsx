import { useEffect, useState } from "react";
import { get, put } from "../lib/api";
import { toast } from "sonner";
import {
  Wallet,
  Save,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  Trash2,
  GripVertical,
  Palette,
  RotateCcw,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Landmark,
  Smartphone,
  ShieldCheck,
  DollarSign,
  FileText,
  HelpCircle,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface PaymentField {
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
}

export interface PaymentMethodItem {
  id: string;
  name: string;
  icon?: string;
  description: string;
  active: boolean;
  order: number;
  fields: PaymentField[];
}

export interface DepositSectionHeader {
  visible: boolean;
  title: string;
  description: string;
}

export interface DepositSectionPaymentMethods {
  visible: boolean;
  title: string;
  description: string;
}

export interface DepositSectionAmounts {
  visible: boolean;
  title: string;
  description: string;
  suggested_amounts: number[];
}

export interface DepositSectionCustomAmount {
  visible: boolean;
  label: string;
  placeholder: string;
  min: number;
  max: number;
  currency: string;
}

export interface DepositSectionInstructions {
  visible: boolean;
  title: string;
  content: string;
  steps: string[];
}

export interface DepositSections {
  header: DepositSectionHeader;
  payment_methods: DepositSectionPaymentMethods;
  amounts: DepositSectionAmounts;
  custom_amount: DepositSectionCustomAmount;
  instructions: DepositSectionInstructions;
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

function MethodSortableCard({
  method,
  onToggleActive,
  onDeleteMethod,
  onUpdateMethod,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  method: PaymentMethodItem;
  onToggleActive: (id: string) => void;
  onDeleteMethod: (id: string) => void;
  onUpdateMethod: (updated: PaymentMethodItem) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: method.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border transition-all duration-200 ${
        method.active
          ? "bg-[#2D2D2D] border-[#C8A45C]/35 hover:border-[#C8A45C]"
          : "bg-[#232323] border-zinc-800 opacity-60"
      }`}
    >
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-[#C8A45C] p-1 rounded-lg hover:bg-white/5"
            title="سحب لإعادة الترتيب"
          >
            <GripVertical size={18} />
          </button>

          <div className="w-8 h-8 rounded-xl bg-[#1A1A1A] border border-[#C8A45C]/40 text-[#C8A45C] flex items-center justify-center shrink-0">
            {method.icon === "Smartphone" ? (
              <Smartphone size={16} />
            ) : method.icon === "Landmark" ? (
              <Landmark size={16} />
            ) : method.icon === "CreditCard" ? (
              <CreditCard size={16} />
            ) : method.icon === "ShieldCheck" ? (
              <ShieldCheck size={16} />
            ) : (
              <Wallet size={16} />
            )}
          </div>

          <input
            type="text"
            value={method.name}
            onChange={(e) => onUpdateMethod({ ...method, name: e.target.value })}
            placeholder="اسم طريقة الدفع"
            className="bg-[#1A1A1A] text-white border border-zinc-700 focus:border-[#C8A45C] rounded-xl px-3 py-1.5 text-sm font-bold w-full max-w-xs focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onMoveUp(method.id)}
            disabled={isFirst}
            className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-white/5 cursor-pointer"
            title="أعلى"
          >
            <ArrowUp size={16} />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(method.id)}
            disabled={isLast}
            className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-white/5 cursor-pointer"
            title="أسفل"
          >
            <ArrowDown size={16} />
          </button>

          <button
            type="button"
            onClick={() => onToggleActive(method.id)}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              method.active
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700"
            }`}
            title={method.active ? "مفعلة" : "معطلة"}
          >
            {method.active ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-zinc-300 hover:text-[#C8A45C] rounded-lg hover:bg-white/5 transition cursor-pointer"
            title="توسيع الإعدادات"
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          <button
            type="button"
            onClick={() => onDeleteMethod(method.id)}
            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
            title="حذف طريقة الدفع"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 pt-2 border-t border-zinc-700/60 space-y-4 bg-[#232323]/60 rounded-b-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                الوصف المباشر:
              </label>
              <input
                type="text"
                value={method.description}
                onChange={(e) => onUpdateMethod({ ...method, description: e.target.value })}
                placeholder="مثال: الدفع الفوري عبر محفظة شام كاش"
                className="w-full bg-[#1A1A1A] text-white border border-zinc-700 focus:border-[#C8A45C] rounded-xl px-3 py-1.5 text-xs focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                الأيقونة المعتمدة:
              </label>
              <select
                value={method.icon || "Wallet"}
                onChange={(e) => onUpdateMethod({ ...method, icon: e.target.value })}
                className="w-full bg-[#1A1A1A] text-white border border-zinc-700 focus:border-[#C8A45C] rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-hidden"
              >
                <option value="Wallet">محفظة (Wallet)</option>
                <option value="Landmark">بنك / صرح (Landmark)</option>
                <option value="Smartphone">هاتف / كاش (Smartphone)</option>
                <option value="CreditCard">بطاقة بنكية (CreditCard)</option>
                <option value="ShieldCheck">دفع آمن (ShieldCheck)</option>
              </select>
            </div>
          </div>

          {/* Dynamic Input Fields Management */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#FDE68A]">
                حقول إدخال البيانات المطلوبة للعميل ({method.fields?.length || 0}):
              </span>
              <button
                type="button"
                onClick={() => {
                  const newFields = [
                    ...(method.fields || []),
                    { label: "حقل جديد", type: "text", required: true, placeholder: "أدخل البيانات" },
                  ];
                  onUpdateMethod({ ...method, fields: newFields });
                }}
                className="flex items-center gap-1 text-[11px] bg-[#C8A45C]/20 hover:bg-[#C8A45C] text-[#C8A45C] hover:text-[#1A1A1A] px-2 py-1 rounded-lg border border-[#C8A45C]/40 font-bold transition cursor-pointer"
              >
                <Plus size={14} />
                <span>إضافة حقل</span>
              </button>
            </div>

            <div className="space-y-2">
              {(method.fields || []).map((field, fIdx) => (
                <div
                  key={fIdx}
                  className="p-2.5 bg-[#1A1A1A] border border-zinc-700/80 rounded-xl flex flex-wrap items-center gap-2"
                >
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => {
                      const updated = [...method.fields];
                      updated[fIdx].label = e.target.value;
                      onUpdateMethod({ ...method, fields: updated });
                    }}
                    placeholder="اسم الحقل"
                    className="bg-[#2D2D2D] text-white border border-zinc-700 focus:border-[#C8A45C] rounded-lg px-2 py-1 text-xs font-bold w-32 focus:outline-hidden"
                  />

                  <input
                    type="text"
                    value={field.placeholder || ""}
                    onChange={(e) => {
                      const updated = [...method.fields];
                      updated[fIdx].placeholder = e.target.value;
                      onUpdateMethod({ ...method, fields: updated });
                    }}
                    placeholder="النص الإرشادي (Placeholder)"
                    className="bg-[#2D2D2D] text-zinc-300 border border-zinc-700 focus:border-[#C8A45C] rounded-lg px-2 py-1 text-xs flex-1 min-w-[140px] focus:outline-hidden"
                  />

                  <label className="flex items-center gap-1 text-[11px] text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => {
                        const updated = [...method.fields];
                        updated[fIdx].required = e.target.checked;
                        onUpdateMethod({ ...method, fields: updated });
                      }}
                      className="accent-[#C8A45C]"
                    />
                    <span>مطلوب</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = method.fields.filter((_, i) => i !== fIdx);
                      onUpdateMethod({ ...method, fields: updated });
                    }}
                    className="text-red-400 hover:text-red-300 p-1 rounded-md hover:bg-red-500/10 cursor-pointer shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DepositSettings() {
  const [config, setConfig] = useState<DepositConfig>(DEFAULT_DEPOSIT_CONFIG);
  const [useLegacy, setUseLegacy] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"general" | "amounts" | "methods" | "instructions" | "styles" | "preview">("general");
  const [selectedAmountPreview, setSelectedAmountPreview] = useState<number | null>(50);
  const [selectedMethodPreview, setSelectedMethodPreview] = useState<string>("sham_cash");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await get("/admin/deposit-config");
      if (res) {
        if (res.config) setConfig(res.config);
        if (res.use_legacy_deposit_page !== undefined) {
          setUseLegacy(Boolean(res.use_legacy_deposit_page));
        }
      }
    } catch (err: any) {
      toast.error("تعذر تحميل إعدادات صفحة شحن الرصيد");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await put("/admin/deposit-config", {
        config,
        use_legacy_deposit_page: useLegacy,
      });
      toast.success("تم حفظ إعدادات صفحة شحن الرصيد بنجاح");
    } catch (err: any) {
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  const handleDragEndMethods = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = config.payment_methods_list.findIndex((m) => m.id === active.id);
      const newIndex = config.payment_methods_list.findIndex((m) => m.id === over.id);
      const newList = arrayMove(config.payment_methods_list, oldIndex, newIndex).map(
        (m, idx) => ({ ...m, order: idx + 1 })
      );
      setConfig({ ...config, payment_methods_list: newList });
    }
  };

  const handleMoveMethodUp = (id: string) => {
    const idx = config.payment_methods_list.findIndex((m) => m.id === id);
    if (idx > 0) {
      const newList = arrayMove(config.payment_methods_list, idx, idx - 1).map(
        (m, index) => ({ ...m, order: index + 1 })
      );
      setConfig({ ...config, payment_methods_list: newList });
    }
  };

  const handleMoveMethodDown = (id: string) => {
    const idx = config.payment_methods_list.findIndex((m) => m.id === id);
    if (idx < config.payment_methods_list.length - 1) {
      const newList = arrayMove(config.payment_methods_list, idx, idx + 1).map(
        (m, index) => ({ ...m, order: index + 1 })
      );
      setConfig({ ...config, payment_methods_list: newList });
    }
  };

  const handleToggleMethodActive = (id: string) => {
    const newList = config.payment_methods_list.map((m) =>
      m.id === id ? { ...m, active: !m.active } : m
    );
    setConfig({ ...config, payment_methods_list: newList });
  };

  const handleDeleteMethod = (id: string) => {
    if (confirm("هل تريد حذف طريقة الدفع هذه؟")) {
      const newList = config.payment_methods_list
        .filter((m) => m.id !== id)
        .map((m, idx) => ({ ...m, order: idx + 1 }));
      setConfig({ ...config, payment_methods_list: newList });
    }
  };

  const handleUpdateMethod = (updated: PaymentMethodItem) => {
    const newList = config.payment_methods_list.map((m) =>
      m.id === updated.id ? updated : m
    );
    setConfig({ ...config, payment_methods_list: newList });
  };

  const handleAddMethod = () => {
    const newId = `method_${Date.now()}`;
    const newMethod: PaymentMethodItem = {
      id: newId,
      name: "طريقة جديدة",
      icon: "Wallet",
      description: "وصف طريقة الدفع الجديدة",
      active: true,
      order: config.payment_methods_list.length + 1,
      fields: [{ label: "بيانات الحساب", type: "text", required: true, placeholder: "أدخل التفاصيل" }],
    };
    setConfig({ ...config, payment_methods_list: [...config.payment_methods_list, newMethod] });
  };

  // Amounts management
  const handleAddSuggestedAmount = () => {
    const current = config.sections.amounts.suggested_amounts || [];
    const last = current.length > 0 ? current[current.length - 1] * 2 : 100;
    const updated = [...current, last];
    setConfig({
      ...config,
      sections: {
        ...config.sections,
        amounts: { ...config.sections.amounts, suggested_amounts: updated },
      },
    });
  };

  const handleRemoveSuggestedAmount = (index: number) => {
    const current = config.sections.amounts.suggested_amounts || [];
    const updated = current.filter((_, i) => i !== index);
    setConfig({
      ...config,
      sections: {
        ...config.sections,
        amounts: { ...config.sections.amounts, suggested_amounts: updated },
      },
    });
  };

  const handleUpdateSuggestedAmount = (index: number, val: number) => {
    const current = [...(config.sections.amounts.suggested_amounts || [])];
    current[index] = val;
    setConfig({
      ...config,
      sections: {
        ...config.sections,
        amounts: { ...config.sections.amounts, suggested_amounts: current },
      },
    });
  };

  // Steps management
  const handleAddInstructionStep = () => {
    const current = config.sections.instructions.steps || [];
    const updated = [...current, "خطوة تعليمات جديدة"];
    setConfig({
      ...config,
      sections: {
        ...config.sections,
        instructions: { ...config.sections.instructions, steps: updated },
      },
    });
  };

  const handleRemoveInstructionStep = (index: number) => {
    const current = config.sections.instructions.steps || [];
    const updated = current.filter((_, i) => i !== index);
    setConfig({
      ...config,
      sections: {
        ...config.sections,
        instructions: { ...config.sections.instructions, steps: updated },
      },
    });
  };

  const handleUpdateInstructionStep = (index: number, val: string) => {
    const current = [...(config.sections.instructions.steps || [])];
    current[index] = val;
    setConfig({
      ...config,
      sections: {
        ...config.sections,
        instructions: { ...config.sections.instructions, steps: current },
      },
    });
  };

  const handleResetDefaults = () => {
    if (confirm("هل تريد إعادة ضبط صفحة شحن الرصيد للقيم الافتراضية؟")) {
      setConfig(DEFAULT_DEPOSIT_CONFIG);
      setUseLegacy(false);
      toast.info("تمت الاستعادة للافتراضي. اضغط حفظ للتأكيد.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#C8A45C]" dir="rtl">
        <div className="w-8 h-8 border-2 border-[#C8A45C] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-sm font-semibold">جاري تحميل إعدادات صفحة شحن الرصيد...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto" dir="rtl">
      {/* Top Header & Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#2D2D2D] border border-[#C8A45C]/35 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#C8A45C] shrink-0">
            <Wallet size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#FDE68A]">تخصيص صفحة شحن الرصيد</h1>
            <p className="text-xs text-zinc-400 font-medium">
              تعديل وإدارة جميع محتويات صفحة الدفع وتعبئة الرصيد بالكامل ديناميكياً
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Legacy Mode Toggle */}
          <div className="flex items-center gap-2 bg-[#1A1A1A] px-3 py-2 rounded-2xl border border-zinc-700">
            <span className="text-xs font-bold text-zinc-300">الواجهة القديمة:</span>
            <button
              type="button"
              onClick={() => setUseLegacy(!useLegacy)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                useLegacy ? "bg-amber-500" : "bg-zinc-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useLegacy ? "-translate-x-6" : "-translate-x-1"
                }`}
              />
            </button>
          </div>

          <a
            href="/deposit"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-bold bg-[#1A1A1A] hover:bg-[#383838] text-zinc-300 hover:text-white px-3.5 py-2.5 rounded-2xl border border-zinc-700 transition cursor-pointer"
          >
            <ExternalLink size={14} />
            <span>معاينة الصفحة</span>
          </a>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs font-bold bg-[#1A1A1A] hover:bg-red-500/10 text-zinc-400 hover:text-red-400 px-3 py-2.5 rounded-2xl border border-zinc-700 hover:border-red-500/40 transition cursor-pointer"
            title="استعادة الافتراضي"
          >
            <RotateCcw size={14} />
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs font-bold bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] px-5 py-2.5 rounded-2xl shadow-lg transition cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>حفظ التغييرات</span>
          </button>
        </div>
      </div>

      {/* Main Page Title Header Section */}
      <div className="bg-[#2D2D2D] border border-[#C8A45C]/35 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-700/80 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#C8A45C]" />
            <h2 className="font-black text-white text-base">العنوان الرئيسي والوصف الإرشادي</h2>
          </div>
          {useLegacy && (
            <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg font-bold">
              مفعل وضع الصفحة القديمة
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              عنوان الصفحة (Title):
            </label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              className="w-full bg-[#1A1A1A] text-white border border-zinc-700 focus:border-[#C8A45C] rounded-2xl px-4 py-2.5 text-sm font-bold focus:outline-hidden"
              placeholder="شحن الرصيد"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              الوصف الفرعي (Subtitle):
            </label>
            <input
              type="text"
              value={config.subtitle}
              onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
              className="w-full bg-[#1A1A1A] text-white border border-zinc-700 focus:border-[#C8A45C] rounded-2xl px-4 py-2.5 text-sm focus:outline-hidden"
              placeholder="اختر طريقة الدفع المناسبة وقم بشحن محفظتك..."
            />
          </div>
        </div>
      </div>

      {/* Tab Controls */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition cursor-pointer ${
            activeTab === "general"
              ? "bg-[#C8A45C] text-[#1A1A1A] shadow-md"
              : "bg-[#2D2D2D] text-zinc-400 hover:text-white border border-zinc-700"
          }`}
        >
          <Sliders size={16} />
          <span>الأقسام الأساسية</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("methods")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition cursor-pointer ${
            activeTab === "methods"
              ? "bg-[#C8A45C] text-[#1A1A1A] shadow-md"
              : "bg-[#2D2D2D] text-zinc-400 hover:text-white border border-zinc-700"
          }`}
        >
          <CreditCard size={16} />
          <span>طرق الدفع ({config.payment_methods_list.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("amounts")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition cursor-pointer ${
            activeTab === "amounts"
              ? "bg-[#C8A45C] text-[#1A1A1A] shadow-md"
              : "bg-[#2D2D2D] text-zinc-400 hover:text-white border border-zinc-700"
          }`}
        >
          <DollarSign size={16} />
          <span>المبالغ المقترحة والمخصصة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("instructions")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition cursor-pointer ${
            activeTab === "instructions"
              ? "bg-[#C8A45C] text-[#1A1A1A] shadow-md"
              : "bg-[#2D2D2D] text-zinc-400 hover:text-white border border-zinc-700"
          }`}
        >
          <HelpCircle size={16} />
          <span>تعليمات الشحن</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("styles")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition cursor-pointer ${
            activeTab === "styles"
              ? "bg-[#C8A45C] text-[#1A1A1A] shadow-md"
              : "bg-[#2D2D2D] text-zinc-400 hover:text-white border border-zinc-700"
          }`}
        >
          <Palette size={16} />
          <span>الألوان والتنسيق</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition cursor-pointer ${
            activeTab === "preview"
              ? "bg-[#C8A45C] text-[#1A1A1A] shadow-md"
              : "bg-[#2D2D2D] text-zinc-400 hover:text-white border border-zinc-700"
          }`}
        >
          <Eye size={16} />
          <span>المعاينة المباشرة</span>
        </button>
      </div>

      {/* TAB 1: GENERAL SECTIONS VISIBILITY & HEADINGS */}
      {activeTab === "general" && (
        <div className="bg-[#2D2D2D] border border-[#C8A45C]/35 rounded-3xl p-6 shadow-xl space-y-6">
          <h2 className="font-black text-white text-base border-b border-zinc-700 pb-3">
            إدارة إظهار وتخصيص عناوين الأقسام
          </h2>

          <div className="space-y-4">
            {/* Section 1: Header */}
            <div className="p-4 bg-[#1A1A1A] border border-zinc-700 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#FDE68A]">قسم الهيدر والترحيب</span>
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
                  <span>إظهار القسم:</span>
                  <input
                    type="checkbox"
                    checked={config.sections.header.visible}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        sections: {
                          ...config.sections,
                          header: { ...config.sections.header, visible: e.target.checked },
                        },
                      })
                    }
                    className="accent-[#C8A45C] w-4 h-4"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={config.sections.header.title}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      sections: {
                        ...config.sections,
                        header: { ...config.sections.header, title: e.target.value },
                      },
                    })
                  }
                  placeholder="عنوان الهيدر"
                  className="bg-[#2D2D2D] text-white border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold"
                />
                <input
                  type="text"
                  value={config.sections.header.description}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      sections: {
                        ...config.sections,
                        header: { ...config.sections.header, description: e.target.value },
                      },
                    })
                  }
                  placeholder="الوصف"
                  className="bg-[#2D2D2D] text-white border border-zinc-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>

            {/* Section 2: Payment Methods Header */}
            <div className="p-4 bg-[#1A1A1A] border border-zinc-700 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#FDE68A]">قسم طرق الدفع المتاحة</span>
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
                  <span>إظهار القسم:</span>
                  <input
                    type="checkbox"
                    checked={config.sections.payment_methods.visible}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        sections: {
                          ...config.sections,
                          payment_methods: {
                            ...config.sections.payment_methods,
                            visible: e.target.checked,
                          },
                        },
                      })
                    }
                    className="accent-[#C8A45C] w-4 h-4"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={config.sections.payment_methods.title}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      sections: {
                        ...config.sections,
                        payment_methods: {
                          ...config.sections.payment_methods,
                          title: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="عنوان طرق الدفع"
                  className="bg-[#2D2D2D] text-white border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold"
                />
                <input
                  type="text"
                  value={config.sections.payment_methods.description}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      sections: {
                        ...config.sections,
                        payment_methods: {
                          ...config.sections.payment_methods,
                          description: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="الوصف"
                  className="bg-[#2D2D2D] text-white border border-zinc-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>

            {/* Section 3: Amounts Header */}
            <div className="p-4 bg-[#1A1A1A] border border-zinc-700 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#FDE68A]">قسم المبالغ المقترحة</span>
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
                  <span>إظهار القسم:</span>
                  <input
                    type="checkbox"
                    checked={config.sections.amounts.visible}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        sections: {
                          ...config.sections,
                          amounts: { ...config.sections.amounts, visible: e.target.checked },
                        },
                      })
                    }
                    className="accent-[#C8A45C] w-4 h-4"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={config.sections.amounts.title}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      sections: {
                        ...config.sections,
                        amounts: { ...config.sections.amounts, title: e.target.value },
                      },
                    })
                  }
                  placeholder="عنوان قسم المبالغ"
                  className="bg-[#2D2D2D] text-white border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold"
                />
                <input
                  type="text"
                  value={config.sections.amounts.description}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      sections: {
                        ...config.sections,
                        amounts: { ...config.sections.amounts, description: e.target.value },
                      },
                    })
                  }
                  placeholder="الوصف"
                  className="bg-[#2D2D2D] text-white border border-zinc-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PAYMENT METHODS MANAGEMENT */}
      {activeTab === "methods" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400 font-medium">
              إضافة وتعديل وإعادة ترتيب وسائل الدفع وحقول إدخال البيانات المطلوبة:
            </p>
            <button
              type="button"
              onClick={handleAddMethod}
              className="flex items-center gap-1.5 bg-[#C8A45C]/20 hover:bg-[#C8A45C] text-[#C8A45C] hover:text-[#1A1A1A] px-3.5 py-2 rounded-2xl border border-[#C8A45C]/40 text-xs font-bold transition cursor-pointer"
            >
              <Plus size={16} />
              <span>إضافة طريقة دفع جديدة</span>
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEndMethods}
          >
            <SortableContext
              items={config.payment_methods_list.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {config.payment_methods_list.map((method, idx) => (
                  <MethodSortableCard
                    key={method.id}
                    method={method}
                    onToggleActive={handleToggleMethodActive}
                    onDeleteMethod={handleDeleteMethod}
                    onUpdateMethod={handleUpdateMethod}
                    onMoveUp={handleMoveMethodUp}
                    onMoveDown={handleMoveMethodDown}
                    isFirst={idx === 0}
                    isLast={idx === config.payment_methods_list.length - 1}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* TAB 3: AMOUNTS MANAGEMENT */}
      {activeTab === "amounts" && (
        <div className="bg-[#2D2D2D] border border-[#C8A45C]/35 rounded-3xl p-6 shadow-xl space-y-6">
          <h2 className="font-black text-white text-base border-b border-zinc-700 pb-3">
            المبالغ المقترحة والمبلغ المخصص
          </h2>

          {/* Suggested Amounts List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#FDE68A]">
                قائمة المبالغ المقترحة ($):
              </label>
              <button
                type="button"
                onClick={handleAddSuggestedAmount}
                className="flex items-center gap-1 text-xs bg-[#C8A45C]/20 hover:bg-[#C8A45C] text-[#C8A45C] hover:text-[#1A1A1A] px-3 py-1.5 rounded-xl border border-[#C8A45C]/40 font-bold transition cursor-pointer"
              >
                <Plus size={14} />
                <span>إضافة مبلغ</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {(config.sections.amounts.suggested_amounts || []).map((amt, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#1A1A1A] border border-zinc-700 rounded-2xl flex items-center justify-between gap-2"
                >
                  <span className="text-xs font-bold text-[#C8A45C]">$</span>
                  <input
                    type="number"
                    value={amt}
                    onChange={(e) =>
                      handleUpdateSuggestedAmount(idx, Number(e.target.value))
                    }
                    className="w-16 bg-[#2D2D2D] text-white text-center font-bold text-sm border border-zinc-700 rounded-lg py-1 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSuggestedAmount(idx)}
                    className="text-red-400 hover:text-red-300 p-1 rounded-md hover:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Amount Settings */}
          <div className="pt-4 border-t border-zinc-700/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[#FDE68A]">إعدادات المبلغ المخصص</span>
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
                <span>إظهار إدخال المبلغ المخصص:</span>
                <input
                  type="checkbox"
                  checked={config.sections.custom_amount.visible}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      sections: {
                        ...config.sections,
                        custom_amount: {
                          ...config.sections.custom_amount,
                          visible: e.target.checked,
                        },
                      },
                    })
                  }
                  className="accent-[#C8A45C] w-4 h-4"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">تسمية الحقل:</label>
                <input
                  type="text"
                  value={config.sections.custom_amount.label}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      sections: {
                        ...config.sections,
                        custom_amount: {
                          ...config.sections.custom_amount,
                          label: e.target.value,
                        },
                      },
                    })
                  }
                  className="w-full bg-[#1A1A1A] text-white border border-zinc-700 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">الحد الأدنى للمبلغ ($):</label>
                <input
                  type="number"
                  value={config.sections.custom_amount.min}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      sections: {
                        ...config.sections,
                        custom_amount: {
                          ...config.sections.custom_amount,
                          min: Number(e.target.value),
                        },
                      },
                    })
                  }
                  className="w-full bg-[#1A1A1A] text-white border border-zinc-700 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">الحد الأقصى للمبلغ ($):</label>
                <input
                  type="number"
                  value={config.sections.custom_amount.max}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      sections: {
                        ...config.sections,
                        custom_amount: {
                          ...config.sections.custom_amount,
                          max: Number(e.target.value),
                        },
                      },
                    })
                  }
                  className="w-full bg-[#1A1A1A] text-white border border-zinc-700 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INSTRUCTIONS */}
      {activeTab === "instructions" && (
        <div className="bg-[#2D2D2D] border border-[#C8A45C]/35 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-700 pb-3">
            <h2 className="font-black text-white text-base">قسم تعليمات وتوجيهات الشحن</h2>
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
              <span>إظهار القسم:</span>
              <input
                type="checkbox"
                checked={config.sections.instructions.visible}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    sections: {
                      ...config.sections,
                      instructions: {
                        ...config.sections.instructions,
                        visible: e.target.checked,
                      },
                    },
                  })
                }
                className="accent-[#C8A45C] w-4 h-4"
              />
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">عنوان التعليمات:</label>
              <input
                type="text"
                value={config.sections.instructions.title}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    sections: {
                      ...config.sections,
                      instructions: {
                        ...config.sections.instructions,
                        title: e.target.value,
                      },
                    },
                  })
                }
                className="w-full bg-[#1A1A1A] text-white border border-zinc-700 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">محتوى التنبيه العام:</label>
              <textarea
                value={config.sections.instructions.content}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    sections: {
                      ...config.sections,
                      instructions: {
                        ...config.sections.instructions,
                        content: e.target.value,
                      },
                    },
                  })
                }
                rows={3}
                className="w-full bg-[#1A1A1A] text-white border border-zinc-700 rounded-xl p-3 text-xs leading-relaxed focus:outline-hidden"
              />
            </div>

            {/* Steps list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#FDE68A]">خطوات الشحن التوضيحية:</label>
                <button
                  type="button"
                  onClick={handleAddInstructionStep}
                  className="flex items-center gap-1 text-xs bg-[#C8A45C]/20 hover:bg-[#C8A45C] text-[#C8A45C] hover:text-[#1A1A1A] px-3 py-1 rounded-xl border border-[#C8A45C]/40 font-bold transition cursor-pointer"
                >
                  <Plus size={14} />
                  <span>إضافة خطوة</span>
                </button>
              </div>

              <div className="space-y-2">
                {(config.sections.instructions.steps || []).map((step, sIdx) => (
                  <div key={sIdx} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#C8A45C]/20 text-[#C8A45C] text-xs font-bold flex items-center justify-center shrink-0">
                      {sIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => handleUpdateInstructionStep(sIdx, e.target.value)}
                      className="flex-1 bg-[#1A1A1A] text-white border border-zinc-700 rounded-xl px-3 py-1.5 text-xs focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveInstructionStep(sIdx)}
                      className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: STYLES CUSTOMIZATION */}
      {activeTab === "styles" && (
        <div className="bg-[#2D2D2D] border border-[#C8A45C]/35 rounded-3xl p-6 shadow-xl space-y-6">
          <h2 className="font-black text-white text-base border-b border-zinc-700 pb-3 flex items-center gap-2">
            <Palette className="text-[#C8A45C]" size={20} />
            <span>تنسيق العناصر والألوان والخطوط</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-2">خلفية الصفحة (bg_color):</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.styles.bg_color || "#1A1A1A"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      styles: { ...config.styles, bg_color: e.target.value },
                    })
                  }
                  className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border border-zinc-700 p-0.5"
                />
                <input
                  type="text"
                  value={config.styles.bg_color || "#1A1A1A"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      styles: { ...config.styles, bg_color: e.target.value },
                    })
                  }
                  className="flex-1 bg-[#1A1A1A] text-white border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-2">لون العناوين (title_color):</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.styles.title_color || "#C8A45C"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      styles: { ...config.styles, title_color: e.target.value },
                    })
                  }
                  className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border border-zinc-700 p-0.5"
                />
                <input
                  type="text"
                  value={config.styles.title_color || "#C8A45C"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      styles: { ...config.styles, title_color: e.target.value },
                    })
                  }
                  className="flex-1 bg-[#1A1A1A] text-white border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-2">خلفية البطاقات (card_bg):</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.styles.card_bg || "#2D2D2D"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      styles: { ...config.styles, card_bg: e.target.value },
                    })
                  }
                  className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border border-zinc-700 p-0.5"
                />
                <input
                  type="text"
                  value={config.styles.card_bg || "#2D2D2D"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      styles: { ...config.styles, card_bg: e.target.value },
                    })
                  }
                  className="flex-1 bg-[#1A1A1A] text-white border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-2">لون أزرار الإجراء (button_bg):</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.styles.button_bg || "#C8A45C"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      styles: { ...config.styles, button_bg: e.target.value },
                    })
                  }
                  className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border border-zinc-700 p-0.5"
                />
                <input
                  type="text"
                  value={config.styles.button_bg || "#C8A45C"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      styles: { ...config.styles, button_bg: e.target.value },
                    })
                  }
                  className="flex-1 bg-[#1A1A1A] text-white border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-2">نصف قطر الزوايا (border_radius):</label>
              <input
                type="text"
                value={config.styles.border_radius || "16px"}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    styles: { ...config.styles, border_radius: e.target.value },
                  })
                }
                className="w-full bg-[#1A1A1A] text-white border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-2">نوع الخط (font_family):</label>
              <select
                value={config.styles.font_family || "Cairo"}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    styles: { ...config.styles, font_family: e.target.value },
                  })
                }
                className="w-full bg-[#1A1A1A] text-white border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold focus:outline-hidden"
              >
                <option value="Cairo">Cairo (القاهرة - المعتمد)</option>
                <option value="Changa">Changa</option>
                <option value="Tajawal">Tajawal</option>
                <option value="Alexandria">Alexandria</option>
                <option value="Almarai">Almarai</option>
                <option value="Inter">Inter</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: LIVE PREVIEW */}
      {activeTab === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>معاينة حية وتفاعلية لصفحة شحن الرصيد بموجب التنسيقات الحالية:</span>
            {useLegacy && (
              <span className="text-amber-400 font-bold">
                تنبيه: مفعّل الوضع القديم للمتجر.
              </span>
            )}
          </div>

          <div
            className="p-6 rounded-3xl border border-zinc-800 space-y-6 shadow-2xl transition-all max-w-2xl mx-auto"
            style={{
              backgroundColor: config.styles.bg_color || "#1A1A1A",
              color: config.styles.text_color || "#FFFFFF",
              fontFamily: config.styles.font_family || "Cairo",
            }}
          >
            {/* Header section */}
            {config.sections.header.visible && (
              <div className="text-center space-y-2 pb-4 border-b border-white/10">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#C8A45C]">
                  <Wallet size={24} />
                </div>
                <h1
                  className="text-xl font-black"
                  style={{ color: config.styles.title_color || "#C8A45C" }}
                >
                  {config.sections.header.title}
                </h1>
                <p className="text-xs opacity-75">{config.sections.header.description}</p>
              </div>
            )}

            {/* Payment methods section */}
            {config.sections.payment_methods.visible && (
              <div className="space-y-3">
                <h3
                  className="text-sm font-bold"
                  style={{ color: config.styles.title_color || "#C8A45C" }}
                >
                  {config.sections.payment_methods.title}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {config.payment_methods_list
                    .filter((m) => m.active)
                    .map((method) => (
                      <div
                        key={method.id}
                        onClick={() => setSelectedMethodPreview(method.id)}
                        className={`p-3.5 border transition cursor-pointer flex items-center gap-3 ${
                          selectedMethodPreview === method.id ? "ring-2 ring-[#C8A45C]" : ""
                        }`}
                        style={{
                          backgroundColor: config.styles.card_bg || "#2D2D2D",
                          borderRadius: config.styles.border_radius || "16px",
                          borderColor: `${config.styles.title_color || "#C8A45C"}33`,
                        }}
                      >
                        <div className="w-9 h-9 rounded-xl bg-black/25 flex items-center justify-center text-[#C8A45C]">
                          <Landmark size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-white">{method.name}</h4>
                          <p className="text-[10px] opacity-70">{method.description}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Suggested amounts section */}
            {config.sections.amounts.visible && (
              <div className="space-y-3">
                <h3
                  className="text-sm font-bold"
                  style={{ color: config.styles.title_color || "#C8A45C" }}
                >
                  {config.sections.amounts.title}
                </h3>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(config.sections.amounts.suggested_amounts || []).map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSelectedAmountPreview(amt)}
                      className="py-2.5 px-2 rounded-xl text-xs font-bold border transition cursor-pointer"
                      style={{
                        backgroundColor:
                          selectedAmountPreview === amt
                            ? config.styles.button_bg || "#C8A45C"
                            : config.styles.card_bg || "#2D2D2D",
                        color:
                          selectedAmountPreview === amt
                            ? config.styles.button_text || "#1A1A1A"
                            : config.styles.title_color || "#C8A45C",
                        borderColor: `${config.styles.title_color || "#C8A45C"}40`,
                      }}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom amount section */}
            {config.sections.custom_amount.visible && (
              <div className="space-y-2">
                <label className="block text-xs font-bold opacity-80">
                  {config.sections.custom_amount.label}:
                </label>
                <input
                  type="number"
                  placeholder={config.sections.custom_amount.placeholder}
                  className="w-full p-2.5 rounded-xl text-xs font-bold border"
                  style={{
                    backgroundColor: config.styles.input_bg || "#3D3D3D",
                    color: config.styles.input_text || "#FFFFFF",
                    borderColor: config.styles.input_border || "#4B5563",
                  }}
                />
              </div>
            )}

            {/* Instructions section */}
            {config.sections.instructions.visible && (
              <div
                className="p-4 border space-y-2"
                style={{
                  backgroundColor: config.styles.card_bg || "#2D2D2D",
                  borderRadius: config.styles.border_radius || "16px",
                  borderColor: `${config.styles.title_color || "#C8A45C"}33`,
                }}
              >
                <h4
                  className="text-xs font-bold flex items-center gap-1.5"
                  style={{ color: config.styles.title_color || "#C8A45C" }}
                >
                  <ShieldCheck size={16} />
                  <span>{config.sections.instructions.title}</span>
                </h4>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  {config.sections.instructions.content}
                </p>

                <ul className="space-y-1 text-[11px] opacity-85 pt-1">
                  {(config.sections.instructions.steps || []).map((st, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-[#C8A45C]" />
                      <span>{st}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
