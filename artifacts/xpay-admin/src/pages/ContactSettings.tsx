import { useEffect, useState, useId } from "react";
import { get, put } from "../lib/api";
import { toast } from "sonner";
import {
  Save,
  RotateCcw,
  ExternalLink,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Palette,
  HelpCircle,
  MessageCircle,
  Send,
  Mail,
  Phone,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
  Globe,
  MapPin,
  Headphones,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Layout,
  FileText,
  Sliders,
  CheckCircle2,
  Clock,
  Layers
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

export interface ContactChannel {
  id: string;
  name: string;
  icon: string;
  value: string;
  link: string;
  color: string;
  active: boolean;
  order: number;
}

export interface SectionConfig {
  visible: boolean;
  title: string;
  subtitle?: string;
  embed_url?: string;
}

export interface FormFieldConfig {
  visible: boolean;
  label: string;
  placeholder: string;
  required: boolean;
  options?: string[];
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  order: number;
}

export interface ContactStyles {
  bg_color: string;
  card_bg: string;
  title_color: string;
  text_color: string;
  border_color: string;
}

export interface ContactPageConfig {
  title: string;
  subtitle: string;
  channels: ContactChannel[];
  sections: {
    channels: SectionConfig;
    form: SectionConfig;
    faq: SectionConfig;
    map: SectionConfig;
  };
  form_fields: {
    name: FormFieldConfig;
    email: FormFieldConfig;
    subject: FormFieldConfig;
    message: FormFieldConfig;
  };
  faq: FAQItem[];
  styles: ContactStyles;
}

const DEFAULT_CONFIG: ContactPageConfig = {
  title: "تواصل معنا",
  subtitle: "نحن هنا لمساعدتك. تواصل معنا عبر أي من القنوات التالية",
  channels: [
    {
      id: "whatsapp",
      name: "واتساب",
      icon: "MessageCircle",
      value: "+963900000000",
      link: "https://wa.me/963900000000",
      color: "#25D366",
      active: true,
      order: 1,
    },
    {
      id: "telegram",
      name: "تليجرام",
      icon: "Send",
      value: "@ShadXMiniSupport",
      link: "https://t.me/ShadXMiniSupport",
      color: "#0088CC",
      active: true,
      order: 2,
    },
    {
      id: "email",
      name: "البريد الإلكتروني",
      icon: "Mail",
      value: "support@shadxmini.com",
      link: "mailto:support@shadxmini.com",
      color: "#C8A45C",
      active: true,
      order: 3,
    },
    {
      id: "phone",
      name: "الهاتف",
      icon: "Phone",
      value: "+963 900 000 000",
      link: "tel:+963900000000",
      color: "#3B82F6",
      active: true,
      order: 4,
    },
  ],
  sections: {
    channels: { visible: true, title: "قنوات التواصل" },
    form: { visible: true, title: "أرسل لنا رسالة", subtitle: "أو أرسل لنا رسالة مباشرة" },
    faq: { visible: true, title: "الأسئلة الشائعة" },
    map: { visible: false, title: "موقعنا على الخريطة", embed_url: "" },
  },
  form_fields: {
    name: { visible: true, label: "الاسم الكامل", placeholder: "أدخل اسمك الكامل", required: true },
    email: { visible: true, label: "البريد الإلكتروني", placeholder: "أدخل بريدك الإلكتروني", required: true },
    subject: {
      visible: true,
      label: "الموضوع",
      placeholder: "اختر الموضوع",
      required: true,
      options: ["استفسار عام", "مشكلة تقنية", "اقتراح", "شكوى", "أخرى"],
    },
    message: { visible: true, label: "الرسالة", placeholder: "اكتب رسالتك هنا...", required: true },
  },
  faq: [
    {
      id: "faq1",
      question: "كيف يمكنني شحن رصيدي؟",
      answer: "يمكنك شحن رصيدك من خلال صفحة المحفظة باستخدام طرق الدفع المتاحة.",
      order: 1,
    },
    {
      id: "faq2",
      question: "ما هي مدة معالجة الطلبات؟",
      answer: "يتم معالجة الطلبات عادة خلال دقائق، وقد تستغرق بعض الطلبات حتى 24 ساعة.",
      order: 2,
    },
    {
      id: "faq3",
      question: "كيف أتوثيق حسابي؟",
      answer: "يمكنك توثيق حسابك من خلال صفحة توثيق الهوية في القائمة الجانبية.",
      order: 3,
    },
  ],
  styles: {
    bg_color: "#1A1A1A",
    card_bg: "#2D2D2D",
    title_color: "#C8A45C",
    text_color: "#E5E7EB",
    border_color: "#C8A45C",
  },
};

export const AVAILABLE_ICONS = [
  { value: "MessageCircle", label: "واتساب / دردشة", Icon: MessageCircle },
  { value: "Send", label: "تليجرام / إرسال", Icon: Send },
  { value: "Mail", label: "بريد إلكتروني", Icon: Mail },
  { value: "Phone", label: "هاتف / اتصال", Icon: Phone },
  { value: "Facebook", label: "فيسبوك", Icon: Facebook },
  { value: "Instagram", label: "انستغرام", Icon: Instagram },
  { value: "Twitter", label: "تويتر / X", Icon: Twitter },
  { value: "Youtube", label: "يوتيوب", Icon: Youtube },
  { value: "Linkedin", label: "لينكد إن", Icon: Linkedin },
  { value: "Globe", label: "موقع ويب", Icon: Globe },
  { value: "MapPin", label: "الموقع / العنوان", Icon: MapPin },
  { value: "Headphones", label: "الدعم الفني", Icon: Headphones },
  { value: "HelpCircle", label: "مركز المساعدة", Icon: HelpCircle },
];

export function renderChannelIcon(iconName: string, className = "w-5 h-5") {
  const found = AVAILABLE_ICONS.find((i) => i.value === iconName);
  if (found) {
    const Component = found.Icon;
    return <Component className={className} />;
  }
  return <MessageCircle className={className} />;
}

// Sortable Channel Item Component
function SortableChannelItem({
  channel,
  index,
  total,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  channel: ContactChannel;
  index: number;
  total: number;
  onUpdate: (updated: ContactChannel) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: channel.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border p-4 transition-all duration-200 ${
        channel.active
          ? "bg-[#252525] border-[#C8A45C]/30 hover:border-[#C8A45C]/60"
          : "bg-[#1f1f1f]/60 border-zinc-800 opacity-75"
      }`}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          {/* Drag Handle */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-1.5 text-zinc-400 hover:text-[#C8A45C] hover:bg-zinc-800 rounded-lg cursor-grab active:cursor-grabbing transition-colors"
            title="سحب لإعادة الترتيب"
          >
            <GripVertical size={18} />
          </button>

          {/* Up / Down Fallback */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              disabled={index === 0}
              onClick={onMoveUp}
              className="p-1 text-zinc-400 hover:text-[#C8A45C] hover:bg-zinc-800 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              title="تحريك لأعلى"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              disabled={index === total - 1}
              onClick={onMoveDown}
              className="p-1 text-zinc-400 hover:text-[#C8A45C] hover:bg-zinc-800 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              title="تحريك لأسفل"
            >
              <ArrowDown size={14} />
            </button>
          </div>

          {/* Color & Icon Preview Badge */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm border border-white/10 shrink-0"
            style={{ backgroundColor: channel.color || "#C8A45C" }}
          >
            {renderChannelIcon(channel.icon, "w-4 h-4")}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-zinc-100">{channel.name || "قناة جديدة"}</span>
            <span className="text-xs text-zinc-500 font-mono">#{index + 1}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Toggle Active */}
          <button
            type="button"
            onClick={() => onUpdate({ ...channel, active: !channel.active })}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
              channel.active
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700"
            }`}
          >
            {channel.active ? <Eye size={13} /> : <EyeOff size={13} />}
            <span>{channel.active ? "مفعّلة" : "معطّلة"}</span>
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
            title="حذف القناة"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Channel Form Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Name */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1">اسم القناة</label>
          <input
            type="text"
            value={channel.name}
            onChange={(e) => onUpdate({ ...channel, name: e.target.value })}
            placeholder="مثال: واتساب الدعم الفني"
            className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-sm text-zinc-100 rounded-lg px-3 py-1.5 outline-none transition-colors"
          />
        </div>

        {/* Icon */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1">الأيقونة</label>
          <select
            value={channel.icon}
            onChange={(e) => onUpdate({ ...channel, icon: e.target.value })}
            className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-sm text-zinc-100 rounded-lg px-2.5 py-1.5 outline-none transition-colors"
          >
            {AVAILABLE_ICONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#1A1A1A] text-zinc-200">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Display Value */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1">النص / المعرف الظاهر</label>
          <input
            type="text"
            value={channel.value}
            onChange={(e) => onUpdate({ ...channel, value: e.target.value })}
            placeholder="+963 900 000 000"
            className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-sm text-zinc-100 rounded-lg px-3 py-1.5 outline-none transition-colors font-mono"
          />
        </div>

        {/* Link / URL */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1">الرابط المباشر (URL / tel / mailto)</label>
          <input
            type="text"
            value={channel.link}
            onChange={(e) => onUpdate({ ...channel, link: e.target.value })}
            placeholder="https://wa.me/..."
            className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-sm text-zinc-100 rounded-lg px-3 py-1.5 outline-none transition-colors font-mono"
          />
        </div>

        {/* Color picker & presets */}
        <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-3 pt-1">
          <label className="text-xs text-zinc-400 flex items-center gap-1">
            <span>لون القناة:</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={channel.color || "#C8A45C"}
              onChange={(e) => onUpdate({ ...channel, color: e.target.value })}
              className="w-7 h-7 rounded border border-zinc-700 cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={channel.color || "#C8A45C"}
              onChange={(e) => onUpdate({ ...channel, color: e.target.value })}
              className="w-24 bg-[#1A1A1A] border border-zinc-700 text-xs text-zinc-200 rounded px-2 py-1 font-mono uppercase"
            />
          </div>

          {/* Fast Color Presets */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-zinc-500">ألوان شائعة:</span>
            {[
              { label: "واتساب", hex: "#25D366" },
              { label: "تليجرام", hex: "#0088CC" },
              { label: "ذهبي", hex: "#C8A45C" },
              { label: "أزرق", hex: "#3B82F6" },
              { label: "انستغرام", hex: "#E1306C" },
              { label: "فيسبوك", hex: "#1877F2" },
              { label: "أحمر", hex: "#EF4444" },
            ].map((p) => (
              <button
                key={p.hex}
                type="button"
                onClick={() => onUpdate({ ...channel, color: p.hex })}
                className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform"
                style={{ backgroundColor: p.hex }}
                title={p.label}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sortable FAQ Item Component
function SortableFaqItem({
  faq,
  index,
  total,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  faq: FAQItem;
  index: number;
  total: number;
  onUpdate: (updated: FAQItem) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: faq.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-[#252525] border border-[#C8A45C]/20 hover:border-[#C8A45C]/40 rounded-xl p-4 transition-all duration-200"
    >
      <div className="flex items-center justify-between gap-3 mb-3 border-b border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-1 text-zinc-400 hover:text-[#C8A45C] hover:bg-zinc-800 rounded cursor-grab active:cursor-grabbing"
            title="سحب للترتيب"
          >
            <GripVertical size={16} />
          </button>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              disabled={index === 0}
              onClick={onMoveUp}
              className="p-1 text-zinc-400 hover:text-[#C8A45C] rounded disabled:opacity-30"
              title="تحريك لأعلى"
            >
              <ArrowUp size={13} />
            </button>
            <button
              type="button"
              disabled={index === total - 1}
              onClick={onMoveDown}
              className="p-1 text-zinc-400 hover:text-[#C8A45C] rounded disabled:opacity-30"
              title="تحريك لأسفل"
            >
              <ArrowDown size={13} />
            </button>
          </div>
          <span className="text-xs font-bold text-[#FDE68A]">سؤال #{index + 1}</span>
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
          title="حذف السؤال"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">السؤال</label>
          <input
            type="text"
            value={faq.question}
            onChange={(e) => onUpdate({ ...faq, question: e.target.value })}
            placeholder="اكتب السؤال هنا..."
            className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-sm text-zinc-100 rounded-lg px-3 py-1.5 outline-none font-medium"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">الإجابة</label>
          <textarea
            rows={2}
            value={faq.answer}
            onChange={(e) => onUpdate({ ...faq, answer: e.target.value })}
            placeholder="اكتب الإجابة المفصلة هنا..."
            className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-sm text-zinc-100 rounded-lg px-3 py-2 outline-none leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}

export default function ContactSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"sections" | "channels" | "form" | "faq" | "styles">(
    "channels"
  );

  const [config, setConfig] = useState<ContactPageConfig>(DEFAULT_CONFIG);
  const [useLegacy, setUseLegacy] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load config
  useEffect(() => {
    let active = true;
    setLoading(true);
    get<{ success: boolean; config: ContactPageConfig; use_legacy_contact_page: boolean }>(
      "/admin/contact-config"
    )
      .then((res) => {
        if (!active) return;
        if (res && res.config) {
          // Merge with defaults to ensure complete structure
          const loaded = {
            ...DEFAULT_CONFIG,
            ...res.config,
            sections: {
              ...DEFAULT_CONFIG.sections,
              ...(res.config.sections || {}),
            },
            form_fields: {
              ...DEFAULT_CONFIG.form_fields,
              ...(res.config.form_fields || {}),
            },
            styles: {
              ...DEFAULT_CONFIG.styles,
              ...(res.config.styles || {}),
            },
            channels: Array.isArray(res.config.channels)
              ? res.config.channels
              : DEFAULT_CONFIG.channels,
            faq: Array.isArray(res.config.faq) ? res.config.faq : DEFAULT_CONFIG.faq,
          };
          setConfig(loaded);
        }
        if (res && res.use_legacy_contact_page !== undefined) {
          setUseLegacy(Boolean(res.use_legacy_contact_page));
        }
      })
      .catch((err) => {
        console.error("Failed to load contact config:", err);
        toast.error("فشل تحميل إعدادات صفحة تواصل معنا، تم استخدام القيم الافتراضية");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Save config
  const handleSave = async (overrideLegacy?: boolean) => {
    setSaving(true);
    const legacyValue = overrideLegacy !== undefined ? overrideLegacy : useLegacy;
    try {
      const res = await put<{ success: boolean; message?: string }>("/admin/contact-config", {
        config,
        use_legacy_contact_page: legacyValue,
      });

      if (res && res.success) {
        toast.success("تم حفظ إعدادات صفحة تواصل معنا بنجاح");
      } else {
        toast.success("تم حفظ التعديلات بنجاح");
      }
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err?.message || "حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  // Toggle Legacy Mode
  const handleToggleLegacy = async () => {
    const nextVal = !useLegacy;
    setUseLegacy(nextVal);
    await handleSave(nextVal);
    toast.info(
      nextVal
        ? "تم التحويل إلى التصميم القديم (Legacy)"
        : "تم تفعيل التصميم الحديث والمتجاوب مع لوحة التحكم"
    );
  };

  // Reset to default
  const handleReset = () => {
    if (confirm("هل أنت متأكد من رغبتك في إعادة ضبط جميع الإعدادات إلى الوضع الافتراضي؟")) {
      setConfig(DEFAULT_CONFIG);
      toast.info("تمت استعادة الإعدادات الافتراضية، يرجى الضغط على زر الحفظ لتأكيدها");
    }
  };

  // Channel Actions
  const handleAddChannel = () => {
    const newId = `channel_${Date.now()}`;
    const newChan: ContactChannel = {
      id: newId,
      name: "قناة تواصل جديدة",
      icon: "MessageCircle",
      value: "+963 900 000 000",
      link: "https://wa.me/963900000000",
      color: "#C8A45C",
      active: true,
      order: config.channels.length + 1,
    };
    setConfig((prev) => ({
      ...prev,
      channels: [...prev.channels, newChan],
    }));
    toast.success("تمت إضافة قناة جديدة");
  };

  const handleUpdateChannel = (updated: ContactChannel) => {
    setConfig((prev) => ({
      ...prev,
      channels: prev.channels.map((c) => (c.id === updated.id ? updated : c)),
    }));
  };

  const handleDeleteChannel = (id: string) => {
    if (confirm("هل أنت متأكد من حذف قناة التواصل هذه؟")) {
      setConfig((prev) => ({
        ...prev,
        channels: prev.channels.filter((c) => c.id !== id),
      }));
      toast.info("تم حذف القناة");
    }
  };

  const handleDragEndChannels = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setConfig((prev) => {
        const oldIndex = prev.channels.findIndex((c) => c.id === active.id);
        const newIndex = prev.channels.findIndex((c) => c.id === over.id);
        const sorted = arrayMove(prev.channels, oldIndex, newIndex).map((item, idx) => ({
          ...item,
          order: idx + 1,
        }));
        return { ...prev, channels: sorted };
      });
    }
  };

  const handleMoveChannel = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= config.channels.length) return;
    setConfig((prev) => {
      const sorted = arrayMove(prev.channels, index, targetIndex).map((item, idx) => ({
        ...item,
        order: idx + 1,
      }));
      return { ...prev, channels: sorted };
    });
  };

  // FAQ Actions
  const handleAddFaq = () => {
    const newId = `faq_${Date.now()}`;
    const newItem: FAQItem = {
      id: newId,
      question: "سؤال جديد؟",
      answer: "اكتب الإجابة هنا...",
      order: config.faq.length + 1,
    };
    setConfig((prev) => ({
      ...prev,
      faq: [...prev.faq, newItem],
    }));
    toast.success("تمت إضافة سؤال جديد");
  };

  const handleUpdateFaq = (updated: FAQItem) => {
    setConfig((prev) => ({
      ...prev,
      faq: prev.faq.map((f) => (f.id === updated.id ? updated : f)),
    }));
  };

  const handleDeleteFaq = (id: string) => {
    if (confirm("هل تريد حذف هذا السؤال؟")) {
      setConfig((prev) => ({
        ...prev,
        faq: prev.faq.filter((f) => f.id !== id),
      }));
      toast.info("تم حذف السؤال");
    }
  };

  const handleDragEndFaq = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setConfig((prev) => {
        const oldIndex = prev.faq.findIndex((f) => f.id === active.id);
        const newIndex = prev.faq.findIndex((f) => f.id === over.id);
        const sorted = arrayMove(prev.faq, oldIndex, newIndex).map((item, idx) => ({
          ...item,
          order: idx + 1,
        }));
        return { ...prev, faq: sorted };
      });
    }
  };

  const handleMoveFaq = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= config.faq.length) return;
    setConfig((prev) => {
      const sorted = arrayMove(prev.faq, index, targetIndex).map((item, idx) => ({
        ...item,
        order: idx + 1,
      }));
      return { ...prev, faq: sorted };
    });
  };

  // Subject options management
  const [newSubjectOption, setNewSubjectOption] = useState("");
  const handleAddSubjectOption = () => {
    const opt = newSubjectOption.trim();
    if (!opt) return;
    const current = config.form_fields.subject.options || [];
    if (current.includes(opt)) {
      toast.error("هذا الخيار موجود مسبقاً");
      return;
    }
    setConfig((prev) => ({
      ...prev,
      form_fields: {
        ...prev.form_fields,
        subject: {
          ...prev.form_fields.subject,
          options: [...current, opt],
        },
      },
    }));
    setNewSubjectOption("");
  };

  const handleDeleteSubjectOption = (opt: string) => {
    setConfig((prev) => ({
      ...prev,
      form_fields: {
        ...prev.form_fields,
        subject: {
          ...prev.form_fields.subject,
          options: (prev.form_fields.subject.options || []).filter((o) => o !== opt),
        },
      },
    }));
  };

  // Section updater
  const updateSection = (sectionKey: string, field: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: {
          ...(prev.sections as any)[sectionKey],
          [field]: value,
        },
      },
    }));
  };

  // Form field updater
  const updateFormField = (fieldKey: string, prop: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      form_fields: {
        ...prev.form_fields,
        [fieldKey]: {
          ...(prev.form_fields as any)[fieldKey],
          [prop]: value,
        },
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-zinc-400">
        <div className="w-9 h-9 border-3 border-[#C8A45C] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">جاري تحميل إعدادات صفحة تواصل معنا...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="bg-[#1A1A1A] border border-[#C8A45C]/30 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C8A45C]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#C8A45C]">
                <Headphones size={22} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[#C8A45C]">
                  تخصيص صفحة تواصل معنا
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                  إدارة شاملة لقنوات التواصل، الأقسام، نموذج الرسائل، الأسئلة الشائعة وتصميم الصفحة
                </p>
              </div>
            </div>
          </div>

          {/* Top Controls */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Preview link */}
            <a
              href="/contact"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-[#2D2D2D] hover:bg-[#383838] text-zinc-300 hover:text-white rounded-xl text-xs font-medium border border-zinc-700 transition-colors"
            >
              <ExternalLink size={14} />
              <span>معاينة في المتجر</span>
            </a>

            {/* Reset button */}
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#2D2D2D] hover:bg-[#383838] text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-medium border border-zinc-700 transition-colors"
              title="إعادة ضبط للافتراضي"
            >
              <RotateCcw size={14} />
              <span>استعادة الافتراضي</span>
            </button>

            {/* Save button */}
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave()}
              className="flex items-center gap-2 px-4 py-2 bg-[#C8A45C] hover:bg-[#b08d48] text-[#1A1A1A] font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-[#C8A45C]/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save size={16} />
              )}
              <span>{saving ? "جاري الحفظ..." : "حفظ التغييرات"}</span>
            </button>
          </div>
        </div>

        {/* Legacy Warning Banner */}
        {useLegacy && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3 text-xs text-amber-200">
            <Sliders size={16} className="shrink-0 text-amber-400" />
            <span>
              <strong>تنبيه:</strong> صفحة التواصل في المتجر معروضة حالياً باستخدام{" "}
              <strong>التصميم السابق (Legacy)</strong>. التعديلات هنا ستُحفظ في قاعدة البيانات ولكنها لن
              تظهر في المتجر حتى تقوم بالتبديل إلى <strong>التصميم الجديد المخصص</strong> من الزر أعلاه.
            </span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-3">
        {[
          { id: "channels", label: "قنوات التواصل", icon: MessageCircle, count: config.channels.length },
          { id: "sections", label: "الأقسام والنصوص", icon: Layout },
          { id: "form", label: "نموذج الرسائل", icon: FileText },
          { id: "faq", label: "الأسئلة الشائعة", icon: HelpCircle, count: config.faq.length },
          { id: "styles", label: "الألوان والمظهر", icon: Palette },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                isActive
                  ? "bg-[#C8A45C] text-[#1A1A1A] shadow-md shadow-[#C8A45C]/20"
                  : "bg-[#252525] text-zinc-300 hover:text-white hover:bg-[#2e2e2e] border border-zinc-800"
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono ${
                    isActive
                      ? "bg-[#1A1A1A]/20 text-[#1A1A1A]"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: CHANNELS */}
      {activeTab === "channels" && (
        <div className="space-y-4">
          <div className="bg-[#1A1A1A] border border-[#C8A45C]/20 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#FDE68A] flex items-center gap-2">
                <MessageCircle size={18} className="text-[#C8A45C]" />
                <span>إدارة قنوات التواصل</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                يمكنك إضافة أي قناة (واتساب، تليجرام، إيميل، هاتف، شبكات اجتماعية)، سحب وإفلات لإعادة الترتيب، أو إخفائها مؤقتاً.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddChannel}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#C8A45C]/20 hover:bg-[#C8A45C]/30 text-[#FDE68A] border border-[#C8A45C]/40 rounded-xl text-xs font-bold transition-all"
            >
              <Plus size={16} />
              <span>إضافة قناة جديدة</span>
            </button>
          </div>

          {config.channels.length === 0 ? (
            <div className="bg-[#222] border border-dashed border-zinc-700 rounded-2xl p-8 text-center text-zinc-400 space-y-3">
              <MessageCircle size={36} className="mx-auto text-zinc-600" />
              <p className="text-sm">لا توجد قنوات تواصل حالياً.</p>
              <button
                type="button"
                onClick={handleAddChannel}
                className="px-4 py-2 bg-[#C8A45C] text-[#1A1A1A] text-xs font-bold rounded-xl"
              >
                إضافة أول قناة تواصل
              </button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndChannels}
            >
              <SortableContext
                items={config.channels.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {config.channels.map((chan, idx) => (
                    <SortableChannelItem
                      key={chan.id}
                      channel={chan}
                      index={idx}
                      total={config.channels.length}
                      onUpdate={handleUpdateChannel}
                      onDelete={() => handleDeleteChannel(chan.id)}
                      onMoveUp={() => handleMoveChannel(idx, "up")}
                      onMoveDown={() => handleMoveChannel(idx, "down")}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      {/* TAB 2: SECTIONS & MAIN TEXTS */}
      {activeTab === "sections" && (
        <div className="space-y-5">
          {/* Main Title & Subtitle */}
          <div className="bg-[#222] border border-[#C8A45C]/20 rounded-2xl p-5 shadow-lg space-y-4">
            <h2 className="text-base font-bold text-[#FDE68A] flex items-center gap-2">
              <Sparkles size={18} className="text-[#C8A45C]" />
              <span>النصوص الرئيسية للهيدر العلوي</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1 font-medium">
                  عنوان الصفحة الرئيسي
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  placeholder="تواصل معنا"
                  className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-sm text-zinc-100 rounded-xl px-3.5 py-2.5 outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1 font-medium">
                  الوصف / النص الفرعي
                </label>
                <input
                  type="text"
                  value={config.subtitle}
                  onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                  placeholder="نحن هنا لمساعدتك على مدار الساعة..."
                  className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-sm text-zinc-100 rounded-xl px-3.5 py-2.5 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section Visibility & Sub-titles */}
          <div className="bg-[#222] border border-[#C8A45C]/20 rounded-2xl p-5 shadow-lg space-y-4">
            <h2 className="text-base font-bold text-[#FDE68A] flex items-center gap-2">
              <Layers size={18} className="text-[#C8A45C]" />
              <span>التحكم في إظهار الأقسام وتسمياتها</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Channels Section */}
              <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-zinc-200 flex items-center gap-2">
                    <MessageCircle size={16} className="text-[#C8A45C]" />
                    <span>قسم قنوات التواصل</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        sections: {
                          ...config.sections,
                          channels: {
                            ...config.sections.channels,
                            visible: !config.sections.channels.visible,
                          },
                        },
                      })
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      config.sections.channels.visible
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-zinc-800 text-zinc-500 border-zinc-700"
                    }`}
                  >
                    {config.sections.channels.visible ? "ظاهر" : "مخفي"}
                  </button>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">عنوان القسم</label>
                  <input
                    type="text"
                    value={config.sections.channels.title}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        sections: {
                          ...config.sections,
                          channels: { ...config.sections.channels, title: e.target.value },
                        },
                      })
                    }
                    placeholder="قنوات التواصل"
                    className="w-full bg-[#252525] border border-zinc-700 text-xs text-zinc-200 rounded-lg px-3 py-2 outline-none"
                  />
                </div>
              </div>

              {/* Form Section */}
              <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-zinc-200 flex items-center gap-2">
                    <Send size={16} className="text-[#C8A45C]" />
                    <span>قسم "أرسل لنا رسالة"</span>
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.sections.form.visible}
                      onChange={(e) => updateSection("form", "visible", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C8A45C]"></div>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">عنوان القسم</label>
                    <input
                      type="text"
                      value={config.sections.form.title}
                      onChange={(e) => updateSection("form", "title", e.target.value)}
                      placeholder="أرسل لنا رسالة"
                      className="w-full bg-[#252525] border border-zinc-700 text-xs text-zinc-200 rounded-lg px-3 py-2 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">النص الفرعي للقسم</label>
                    <input
                      type="text"
                      value={config.sections.form.subtitle || ""}
                      onChange={(e) => updateSection("form", "subtitle", e.target.value)}
                      placeholder="أو أرسل لنا رسالة مباشرة"
                      className="w-full bg-[#252525] border border-zinc-700 text-xs text-zinc-200 rounded-lg px-3 py-2 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* FAQ Section */}
              <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-zinc-200 flex items-center gap-2">
                    <HelpCircle size={16} className="text-[#C8A45C]" />
                    <span>قسم الأسئلة الشائعة (FAQ)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        sections: {
                          ...config.sections,
                          faq: {
                            ...config.sections.faq,
                            visible: !config.sections.faq.visible,
                          },
                        },
                      })
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      config.sections.faq.visible
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-zinc-800 text-zinc-500 border-zinc-700"
                    }`}
                  >
                    {config.sections.faq.visible ? "ظاهر" : "مخفي"}
                  </button>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">عنوان قسم الأسئلة</label>
                  <input
                    type="text"
                    value={config.sections.faq.title}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        sections: {
                          ...config.sections,
                          faq: { ...config.sections.faq, title: e.target.value },
                        },
                      })
                    }
                    placeholder="الأسئلة الشائعة"
                    className="w-full bg-[#252525] border border-zinc-700 text-xs text-zinc-200 rounded-lg px-3 py-2 outline-none"
                  />
                </div>
              </div>

              {/* Map Section */}
              <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-zinc-200 flex items-center gap-2">
                    <MapPin size={16} className="text-[#C8A45C]" />
                    <span>قسم الخريطة الجغرافية</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        sections: {
                          ...config.sections,
                          map: {
                            ...config.sections.map,
                            visible: !config.sections.map.visible,
                          },
                        },
                      })
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      config.sections.map.visible
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-zinc-800 text-zinc-500 border-zinc-700"
                    }`}
                  >
                    {config.sections.map.visible ? "ظاهر" : "مخفي"}
                  </button>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">عنوان الخريطة</label>
                  <input
                    type="text"
                    value={config.sections.map.title}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        sections: {
                          ...config.sections,
                          map: { ...config.sections.map, title: e.target.value },
                        },
                      })
                    }
                    placeholder="موقعنا الجغرافي"
                    className="w-full bg-[#252525] border border-zinc-700 text-xs text-zinc-200 rounded-lg px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    رابط تضمين الخريطة (Google Maps Embed URL)
                  </label>
                  <input
                    type="text"
                    value={config.sections.map.embed_url || ""}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        sections: {
                          ...config.sections,
                          map: { ...config.sections.map, embed_url: e.target.value },
                        },
                      })
                    }
                    placeholder="https://www.google.com/maps/embed?pb=..."
                    className="w-full bg-[#252525] border border-zinc-700 text-xs text-zinc-200 rounded-lg px-3 py-2 outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FORM FIELDS */}
      {activeTab === "form" && (
        <div className="space-y-6">
          {/* قسم أرسل لنا رسالة */}
          <div className="space-y-5 bg-[#2D2D2D] p-5 sm:p-6 rounded-2xl border border-[#C8A45C]/20 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-[#FDE68A] flex items-center gap-2">
                <Send size={18} className="text-[#C8A45C]" />
                <span>قسم "أرسل لنا رسالة"</span>
              </h3>

              {/* مفتاح تبديل إظهار/إخفاء القسم */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-400">
                  {config.sections.form.visible ? "القسم ظاهر في المتجر" : "القسم مخفي من المتجر"}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.sections.form.visible}
                    onChange={(e) => updateSection("form", "visible", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C8A45C]"></div>
                </label>
              </div>
            </div>

            {/* حقول التعديل */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-300 text-xs font-semibold mb-1">
                  عنوان القسم (في المتجر)
                </label>
                <input
                  type="text"
                  value={config.sections.form.title}
                  onChange={(e) => updateSection("form", "title", e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3.5 py-2.5 rounded-xl outline-none font-bold text-sm"
                  placeholder="أرسل لنا رسالة"
                />
              </div>

              <div>
                <label className="block text-zinc-300 text-xs font-semibold mb-1">
                  النص الفرعي / الوصف
                </label>
                <input
                  type="text"
                  value={config.sections.form.subtitle || ""}
                  onChange={(e) => updateSection("form", "subtitle", e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3.5 py-2.5 rounded-xl outline-none text-sm"
                  placeholder="أو أرسل لنا رسالة مباشرة"
                />
              </div>
            </div>

            {/* إدارة حقول النموذج */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <h4 className="text-sm font-bold text-[#C8A45C] flex items-center gap-2">
                  <FileText size={16} />
                  <span>تخصيص حقول النموذج</span>
                </h4>
                <span className="text-[11px] text-zinc-400">
                  يمكنك تفعيل/إلغاء تفعيل كل حقل بشكل منفصل وتحديد إذا كان إجبارياً
                </span>
              </div>

              {Object.entries(config.form_fields).map(([key, field]) => (
                <div key={key} className="bg-[#1A1A1A] p-4 rounded-xl border border-zinc-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-white text-xs flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#C8A45C]"></span>
                      حقل:{" "}
                      {key === "name"
                        ? "الاسم الكامل (name)"
                        : key === "email"
                        ? "البريد الإلكتروني (email)"
                        : key === "subject"
                        ? "الموضوع (subject)"
                        : "نص الرسالة (message)"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-400">
                        {field.visible ? "مفعّل" : "معطّل"}
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.visible}
                          onChange={(e) => updateFormField(key, "visible", e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C8A45C]"></div>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-zinc-400 text-[11px] mb-1 font-medium">
                        التسمية (Label)
                      </label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateFormField(key, "label", e.target.value)}
                        className="w-full bg-[#242424] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-400 text-[11px] mb-1 font-medium">
                        النص التوضيحي (Placeholder)
                      </label>
                      <input
                        type="text"
                        value={field.placeholder}
                        onChange={(e) => updateFormField(key, "placeholder", e.target.value)}
                        className="w-full bg-[#242424] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer pb-2">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateFormField(key, "required", e.target.checked)}
                          className="w-4 h-4 accent-[#C8A45C] rounded"
                        />
                        <span>مطلوب (إلزامي)</span>
                      </label>
                    </div>
                  </div>

                  {key === "subject" && (
                    <div className="mt-3 pt-3 border-t border-zinc-800">
                      <label className="block text-zinc-400 text-[11px] mb-1.5 font-semibold">
                        خيارات القائمة المنسدلة لموضوع الرسالة:
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {(field.options || []).map((opt) => (
                          <span
                            key={opt}
                            className="inline-flex items-center gap-1.5 bg-[#2A2A2A] text-zinc-200 text-xs px-2.5 py-1 rounded-lg border border-zinc-700"
                          >
                            <span>{opt}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubjectOption(opt)}
                              className="text-zinc-400 hover:text-red-400 font-bold ml-1 cursor-pointer"
                              title="حذف الخيار"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2 max-w-sm">
                        <input
                          type="text"
                          value={newSubjectOption}
                          onChange={(e) => setNewSubjectOption(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddSubjectOption();
                            }
                          }}
                          placeholder="أضف خياراً جديداً..."
                          className="bg-[#242424] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-1.5 rounded-lg text-xs outline-none flex-1"
                        />
                        <button
                          type="button"
                          onClick={handleAddSubjectOption}
                          className="bg-[#C8A45C] text-black font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-[#DEB86D] transition cursor-pointer"
                        >
                          إضافة
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FAQ */}
      {activeTab === "faq" && (
        <div className="space-y-4">
          <div className="bg-[#1A1A1A] border border-[#C8A45C]/20 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#FDE68A] flex items-center gap-2">
                <HelpCircle size={18} className="text-[#C8A45C]" />
                <span>إدارة الأسئلة الشائعة (FAQ)</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                أضف الأسئلة الأكثر تكراراً لتوفير وقت العميل وإعطاء إجابات واضحة وفورية. يمكنك سحب الأسئلة لإعادة ترتيبها.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddFaq}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#C8A45C]/20 hover:bg-[#C8A45C]/30 text-[#FDE68A] border border-[#C8A45C]/40 rounded-xl text-xs font-bold transition-all"
            >
              <Plus size={16} />
              <span>إضافة سؤال جديد</span>
            </button>
          </div>

          {config.faq.length === 0 ? (
            <div className="bg-[#222] border border-dashed border-zinc-700 rounded-2xl p-8 text-center text-zinc-400 space-y-3">
              <HelpCircle size={36} className="mx-auto text-zinc-600" />
              <p className="text-sm">لا توجد أسئلة شائعة حالياً.</p>
              <button
                type="button"
                onClick={handleAddFaq}
                className="px-4 py-2 bg-[#C8A45C] text-[#1A1A1A] text-xs font-bold rounded-xl"
              >
                إضافة أول سؤال
              </button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndFaq}
            >
              <SortableContext
                items={config.faq.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {config.faq.map((faq, idx) => (
                    <SortableFaqItem
                      key={faq.id}
                      faq={faq}
                      index={idx}
                      total={config.faq.length}
                      onUpdate={handleUpdateFaq}
                      onDelete={() => handleDeleteFaq(faq.id)}
                      onMoveUp={() => handleMoveFaq(idx, "up")}
                      onMoveDown={() => handleMoveFaq(idx, "down")}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      {/* TAB 5: STYLES & COLORS */}
      {activeTab === "styles" && (
        <div className="space-y-6">
          <div className="bg-[#1A1A1A] border border-[#C8A45C]/20 rounded-2xl p-5 shadow-lg">
            <h2 className="text-base font-bold text-[#FDE68A] flex items-center gap-2">
              <Palette size={18} className="text-[#C8A45C]" />
              <span>تخصيص ألوان وتصميم صفحة تواصل معنا</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              تحكم في درجات ألوان الخلفية، والبطاقات، والنصوص، ولون الإبراز والحدود ليتطابق مع هوية المتجر الفاخرة.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Color pickers */}
            <div className="bg-[#222] border border-zinc-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-zinc-200 border-b border-zinc-800 pb-2">
                لوحة الألوان الأساسية
              </h3>

              {/* bg_color */}
              <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800">
                <div>
                  <span className="block text-xs font-bold text-zinc-200">لون خلفية الصفحة</span>
                  <span className="text-[11px] text-zinc-500 font-mono">bg_color</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.styles.bg_color}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        styles: { ...config.styles, bg_color: e.target.value },
                      })
                    }
                    className="w-8 h-8 rounded border border-zinc-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={config.styles.bg_color}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        styles: { ...config.styles, bg_color: e.target.value },
                      })
                    }
                    className="w-24 bg-[#252525] border border-zinc-700 text-xs text-zinc-200 rounded px-2 py-1 font-mono uppercase"
                  />
                </div>
              </div>

              {/* card_bg */}
              <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800">
                <div>
                  <span className="block text-xs font-bold text-zinc-200">لون خلفية البطاقات</span>
                  <span className="text-[11px] text-zinc-500 font-mono">card_bg</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.styles.card_bg}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        styles: { ...config.styles, card_bg: e.target.value },
                      })
                    }
                    className="w-8 h-8 rounded border border-zinc-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={config.styles.card_bg}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        styles: { ...config.styles, card_bg: e.target.value },
                      })
                    }
                    className="w-24 bg-[#252525] border border-zinc-700 text-xs text-zinc-200 rounded px-2 py-1 font-mono uppercase"
                  />
                </div>
              </div>

              {/* title_color */}
              <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800">
                <div>
                  <span className="block text-xs font-bold text-zinc-200">لون العناوين الرئيسية</span>
                  <span className="text-[11px] text-zinc-500 font-mono">title_color</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.styles.title_color}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        styles: { ...config.styles, title_color: e.target.value },
                      })
                    }
                    className="w-8 h-8 rounded border border-zinc-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={config.styles.title_color}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        styles: { ...config.styles, title_color: e.target.value },
                      })
                    }
                    className="w-24 bg-[#252525] border border-zinc-700 text-xs text-zinc-200 rounded px-2 py-1 font-mono uppercase"
                  />
                </div>
              </div>

              {/* text_color */}
              <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800">
                <div>
                  <span className="block text-xs font-bold text-zinc-200">لون النصوص العادية</span>
                  <span className="text-[11px] text-zinc-500 font-mono">text_color</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.styles.text_color}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        styles: { ...config.styles, text_color: e.target.value },
                      })
                    }
                    className="w-8 h-8 rounded border border-zinc-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={config.styles.text_color}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        styles: { ...config.styles, text_color: e.target.value },
                      })
                    }
                    className="w-24 bg-[#252525] border border-zinc-700 text-xs text-zinc-200 rounded px-2 py-1 font-mono uppercase"
                  />
                </div>
              </div>

              {/* border_color */}
              <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800">
                <div>
                  <span className="block text-xs font-bold text-zinc-200">لون الإطارات والحدود</span>
                  <span className="text-[11px] text-zinc-500 font-mono">border_color</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.styles.border_color}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        styles: { ...config.styles, border_color: e.target.value },
                      })
                    }
                    className="w-8 h-8 rounded border border-zinc-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={config.styles.border_color}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        styles: { ...config.styles, border_color: e.target.value },
                      })
                    }
                    className="w-24 bg-[#252525] border border-zinc-700 text-xs text-zinc-200 rounded px-2 py-1 font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Live Mini Preview Box */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-zinc-200">معاينة حية مصغرة للتصميم</h3>
              <div
                className="rounded-2xl p-6 border transition-all duration-300 shadow-xl space-y-4"
                style={{
                  backgroundColor: config.styles.bg_color,
                  borderColor: config.styles.border_color,
                }}
              >
                {/* Title */}
                <div className="text-center space-y-1">
                  <h4
                    className="text-lg font-black"
                    style={{ color: config.styles.title_color }}
                  >
                    {config.title || "تواصل معنا"}
                  </h4>
                  <p
                    className="text-xs"
                    style={{ color: config.styles.text_color, opacity: 0.8 }}
                  >
                    {config.subtitle || "نحن هنا لمساعدتك على مدار الساعة"}
                  </p>
                </div>

                {/* Sample Card */}
                <div
                  className="rounded-xl p-4 border"
                  style={{
                    backgroundColor: config.styles.card_bg,
                    borderColor: `${config.styles.border_color}40`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: "#25D366" }}
                      >
                        <MessageCircle size={16} />
                      </div>
                      <div>
                        <span
                          className="block text-xs font-bold"
                          style={{ color: config.styles.text_color }}
                        >
                          واتساب الدعم الفني
                        </span>
                        <span
                          className="text-[11px] font-mono"
                          style={{ color: config.styles.title_color }}
                        >
                          +963 900 000 000
                        </span>
                      </div>
                    </div>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full border"
                      style={{
                        borderColor: config.styles.border_color,
                        color: config.styles.title_color,
                      }}
                    >
                      متصل الآن
                    </span>
                  </div>
                </div>

                {/* Sample Button */}
                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl font-bold text-xs shadow-md transition-opacity"
                  style={{
                    backgroundColor: config.styles.title_color,
                    color: config.styles.bg_color,
                  }}
                >
                  إرسال الرسالة الآن
                </button>
              </div>

              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs text-zinc-400">
                💡 <strong>ملاحظة:</strong> الألوان المحددة تنعكس فورياً على صفحة تواصل معنا في المتجر طالما أن وضع التصميم الجديد مفعّل.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1A1A1A]/95 backdrop-blur-md border-t border-[#C8A45C]/30 p-3 sm:px-8 z-40 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-2 text-xs text-zinc-300">
          <CheckCircle2 size={16} className="text-[#C8A45C]" />
          <span>
            الوضع الحالي:{" "}
            <strong className={useLegacy ? "text-amber-300" : "text-emerald-300"}>
              {useLegacy ? "التصميم القديم (Legacy)" : "التصميم الجديد المخصص"}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#C8A45C] hover:bg-[#b08d48] text-[#1A1A1A] font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-[#C8A45C]/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>{saving ? "جاري الحفظ..." : "حفظ التغييرات"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
