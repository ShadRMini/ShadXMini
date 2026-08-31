import { useEffect, useState } from "react";
import { get, put } from "../lib/api";
import { toast } from "sonner";
import {
  Info,
  Save,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  Trash2,
  GripVertical,
  Palette,
  Users,
  BarChart3,
  Mail,
  FileText,
  RotateCcw,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Phone,
  MapPin,
  Image as ImageIcon,
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

export interface TeamMember {
  name: string;
  role: string;
  image?: string;
  bio?: string;
}

export interface StatisticItem {
  label: string;
  value: string;
}

export interface AboutSection {
  id: string;
  type: "text" | "team" | "stats" | "contact";
  title: string;
  content?: string;
  image?: string;
  order: number;
  visible: boolean;
  members?: TeamMember[];
  statistics?: StatisticItem[];
  email?: string;
  phone?: string;
  address?: string;
}

export interface AboutStyle {
  bg_color: string;
  text_color: string;
  title_color: string;
  section_bg: string;
  border_radius: string;
  font_family: string;
}

export interface AboutConfig {
  title: string;
  subtitle: string;
  sections: AboutSection[];
  style: AboutStyle;
}

const DEFAULT_CONFIG: AboutConfig = {
  title: "من نحن",
  subtitle: "نحن منصة رقمية متكاملة تقدم حلولاً مبتكرة في عالم التجارة الإلكترونية والخدمات الرقمية",
  sections: [
    {
      id: "intro",
      type: "text",
      title: "قصتنا",
      content: "بدأت رحلتنا في تقديم أسرع وأرقى الخدمات الرقمية للبطاقات والشحن وباقات الألعاب بطرق سريعة وآمنة بأسعار منافسة ومعالجة فورية.",
      image: "",
      order: 1,
      visible: true,
    },
    {
      id: "mission",
      type: "text",
      title: "رسالتنا",
      content: "تمكين الأفراد والشركات من الوصول إلى كافة الخدمات والبطاقات الرقمية بسهولة، سرعة وأمان لا مثيل له.",
      image: "",
      order: 2,
      visible: true,
    },
    {
      id: "vision",
      type: "text",
      title: "رؤيتنا",
      content: "أن نكون الخيار الأول والمنصة الرائدة والأكثر موثوقية في المنطقة لتوفير حلول الشحن الرقمي والخدمات الإلكترونية.",
      image: "",
      order: 3,
      visible: true,
    },
    {
      id: "team",
      type: "team",
      title: "فريقنا المتميز",
      members: [
        { name: "أحمد علي", role: "المدير التنفيذي", image: "", bio: "خبرة تزيد عن 8 سنوات في إدارة المنصات الرقمية وخدمات الدفع." },
        { name: "سارة المحمود", role: "مديرة الدعم والعمليات", image: "", bio: "متخصصة في جودة الخدمة ودعم العملاء الفوري على مدار الساعة." },
      ],
      order: 4,
      visible: true,
    },
    {
      id: "stats",
      type: "stats",
      title: "إحصائيات المنصة",
      statistics: [
        { label: "عميل سعيد", value: "+10,000" },
        { label: "طلب مكتمل", value: "+50,000" },
        { label: "سرعة التنفيذ", value: "فوري" },
        { label: "ساعات الدعم", value: "24/7" },
      ],
      order: 5,
      visible: true,
    },
    {
      id: "contact",
      type: "contact",
      title: "تواصل معنا مباشرة",
      email: "support@shadx.com",
      phone: "+963 900 000 000",
      address: "دمشق، سوريا",
      order: 6,
      visible: true,
    },
  ],
  style: {
    bg_color: "#1A1A1A",
    text_color: "#FFFFFF",
    title_color: "#C8A45C",
    section_bg: "#2D2D2D",
    border_radius: "16px",
    font_family: "Cairo",
  },
};

// Sortable Item Component for Sections
function SortableSectionCard({
  section,
  onToggleVisibility,
  onDeleteSection,
  onUpdateSection,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  section: AboutSection;
  onToggleVisibility: (id: string) => void;
  onDeleteSection: (id: string) => void;
  onUpdateSection: (updated: AboutSection) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "text":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "team":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "stats":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "contact":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "text":
        return "محتوى نصي";
      case "team":
        return "فريق العمل";
      case "stats":
        return "أرقام وإحصائيات";
      case "contact":
        return "معلومات الاتصال";
      default:
        return type;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border transition-all duration-200 ${
        section.visible
          ? "bg-[#2D2D2D] border-[#C8A45C]/30 hover:border-[#C8A45C]"
          : "bg-[#232323] border-zinc-800 opacity-60"
      }`}
    >
      {/* Header Bar */}
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-[#C8A45C] p-1 rounded-lg hover:bg-white/5"
            title="سحب وإعادة ترتيب"
          >
            <GripVertical size={18} />
          </button>

          <span
            className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${getBadgeColor(
              section.type
            )}`}
          >
            {getTypeLabel(section.type)}
          </span>

          <input
            type="text"
            value={section.title}
            onChange={(e) => onUpdateSection({ ...section, title: e.target.value })}
            placeholder="عنوان القسم"
            className="bg-[#1A1A1A] text-white border border-zinc-700 focus:border-[#C8A45C] rounded-xl px-3 py-1.5 text-sm font-bold w-full max-w-xs focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onMoveUp(section.id)}
            disabled={isFirst}
            className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-white/5 cursor-pointer"
            title="تحريك لأعلى"
          >
            <ArrowUp size={16} />
          </button>
          <button
            onClick={() => onMoveDown(section.id)}
            disabled={isLast}
            className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-white/5 cursor-pointer"
            title="تحريك لأسفل"
          >
            <ArrowDown size={16} />
          </button>

          <button
            onClick={() => onToggleVisibility(section.id)}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              section.visible
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700"
            }`}
            title={section.visible ? "إخفاء القسم" : "إظهار القسم"}
          >
            {section.visible ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-zinc-300 hover:text-[#C8A45C] rounded-lg hover:bg-white/5 transition cursor-pointer"
            title="توسيع / إغلاق التعديل"
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          <button
            onClick={() => onDeleteSection(section.id)}
            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
            title="حذف القسم"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Expanded Editing Fields */}
      {expanded && (
        <div className="p-4 pt-2 border-t border-zinc-700/60 space-y-4 bg-[#232323]/60 rounded-b-2xl">
          {/* Section Type Changer */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-zinc-400 font-bold">نوع القسم:</label>
            <select
              value={section.type}
              onChange={(e) =>
                onUpdateSection({
                  ...section,
                  type: e.target.value as any,
                })
              }
              className="bg-[#1A1A1A] text-white border border-zinc-700 focus:border-[#C8A45C] rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-hidden"
            >
              <option value="text">محتوى نصي (Text)</option>
              <option value="team">فريق العمل (Team)</option>
              <option value="stats">أرقام وإحصائيات (Stats)</option>
              <option value="contact">معلومات الاتصال (Contact)</option>
            </select>
          </div>

          {/* Type 1: Text Content */}
          {section.type === "text" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  نص المحتوى:
                </label>
                <textarea
                  value={section.content || ""}
                  onChange={(e) =>
                    onUpdateSection({ ...section, content: e.target.value })
                  }
                  rows={4}
                  placeholder="أدخل النص التفصيلي للقسم..."
                  className="w-full bg-[#1A1A1A] text-white border border-zinc-700 focus:border-[#C8A45C] rounded-xl p-3 text-xs leading-relaxed focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  رابط صورة توضيحية (اختياري):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={section.image || ""}
                    onChange={(e) =>
                      onUpdateSection({ ...section, image: e.target.value })
                    }
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 bg-[#1A1A1A] text-white border border-zinc-700 focus:border-[#C8A45C] rounded-xl px-3 py-2 text-xs focus:outline-hidden"
                  />
                  {section.image && (
                    <img
                      src={section.image}
                      alt="معاينة"
                      className="w-9 h-9 rounded-lg object-cover border border-[#C8A45C]"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Type 2: Team Members */}
          {section.type === "team" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#FDE68A]">
                  أعضاء الفريق ({section.members?.length || 0}):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newMembers = [
                      ...(section.members || []),
                      { name: "عضو جديد", role: "المسمى الوظيفي", bio: "" },
                    ];
                    onUpdateSection({ ...section, members: newMembers });
                  }}
                  className="flex items-center gap-1 text-xs bg-[#C8A45C]/20 hover:bg-[#C8A45C] text-[#C8A45C] hover:text-[#1A1A1A] px-2.5 py-1 rounded-lg border border-[#C8A45C]/40 font-bold transition cursor-pointer"
                >
                  <Plus size={14} />
                  <span>إضافة عضو</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {(section.members || []).map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#1A1A1A] border border-zinc-700/80 rounded-xl space-y-2 relative"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={m.name}
                        onChange={(e) => {
                          const updated = [...(section.members || [])];
                          updated[idx].name = e.target.value;
                          onUpdateSection({ ...section, members: updated });
                        }}
                        placeholder="الاسم"
                        className="bg-[#2D2D2D] text-white border border-zinc-700 focus:border-[#C8A45C] rounded-lg px-2.5 py-1 text-xs font-bold w-1/2 focus:outline-hidden"
                      />
                      <input
                        type="text"
                        value={m.role}
                        onChange={(e) => {
                          const updated = [...(section.members || [])];
                          updated[idx].role = e.target.value;
                          onUpdateSection({ ...section, members: updated });
                        }}
                        placeholder="الدور / المسمى"
                        className="bg-[#2D2D2D] text-white border border-zinc-700 focus:border-[#C8A45C] rounded-lg px-2.5 py-1 text-xs w-1/2 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = section.members?.filter((_, i) => i !== idx);
                          onUpdateSection({ ...section, members: updated });
                        }}
                        className="text-red-400 hover:text-red-300 p-1 rounded-md hover:bg-red-500/10 cursor-pointer shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={m.image || ""}
                        onChange={(e) => {
                          const updated = [...(section.members || [])];
                          updated[idx].image = e.target.value;
                          onUpdateSection({ ...section, members: updated });
                        }}
                        placeholder="رابط الصورة الشخصية"
                        className="flex-1 bg-[#2D2D2D] text-white border border-zinc-700 focus:border-[#C8A45C] rounded-lg px-2.5 py-1 text-xs focus:outline-hidden"
                      />
                      <input
                        type="text"
                        value={m.bio || ""}
                        onChange={(e) => {
                          const updated = [...(section.members || [])];
                          updated[idx].bio = e.target.value;
                          onUpdateSection({ ...section, members: updated });
                        }}
                        placeholder="نبذة سريعة (Bio)"
                        className="flex-1 bg-[#2D2D2D] text-white border border-zinc-700 focus:border-[#C8A45C] rounded-lg px-2.5 py-1 text-xs focus:outline-hidden"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Type 3: Statistics */}
          {section.type === "stats" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#FDE68A]">
                  العناصر الإحصائية ({section.statistics?.length || 0}):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newStats = [
                      ...(section.statistics || []),
                      { label: "تسمية جديدة", value: "100+" },
                    ];
                    onUpdateSection({ ...section, statistics: newStats });
                  }}
                  className="flex items-center gap-1 text-xs bg-[#C8A45C]/20 hover:bg-[#C8A45C] text-[#C8A45C] hover:text-[#1A1A1A] px-2.5 py-1 rounded-lg border border-[#C8A45C]/40 font-bold transition cursor-pointer"
                >
                  <Plus size={14} />
                  <span>إضافة إحصائية</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(section.statistics || []).map((st, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-[#1A1A1A] border border-zinc-700/80 rounded-xl flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={st.label}
                      onChange={(e) => {
                        const updated = [...(section.statistics || [])];
                        updated[idx].label = e.target.value;
                        onUpdateSection({ ...section, statistics: updated });
                      }}
                      placeholder="التسمية (مثلاً: عملاء)"
                      className="bg-[#2D2D2D] text-white border border-zinc-700 focus:border-[#C8A45C] rounded-lg px-2 py-1 text-xs font-bold w-1/2 focus:outline-hidden"
                    />
                    <input
                      type="text"
                      value={st.value}
                      onChange={(e) => {
                        const updated = [...(section.statistics || [])];
                        updated[idx].value = e.target.value;
                        onUpdateSection({ ...section, statistics: updated });
                      }}
                      placeholder="القيمة (مثلاً: +10,000)"
                      className="bg-[#2D2D2D] text-[#FDE68A] border border-zinc-700 focus:border-[#C8A45C] rounded-lg px-2 py-1 text-xs font-black w-1/2 text-center focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = section.statistics?.filter((_, i) => i !== idx);
                        onUpdateSection({ ...section, statistics: updated });
                      }}
                      className="text-red-400 hover:text-red-300 p-1 rounded-md hover:bg-red-500/10 cursor-pointer shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Type 4: Contact */}
          {section.type === "contact" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  البريد الإلكتروني:
                </label>
                <input
                  type="email"
                  value={section.email || ""}
                  onChange={(e) =>
                    onUpdateSection({ ...section, email: e.target.value })
                  }
                  placeholder="info@example.com"
                  className="w-full bg-[#1A1A1A] text-white border border-zinc-700 focus:border-[#C8A45C] rounded-xl px-3 py-1.5 text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  رقم الهاتف / الواتساب:
                </label>
                <input
                  type="text"
                  value={section.phone || ""}
                  onChange={(e) =>
                    onUpdateSection({ ...section, phone: e.target.value })
                  }
                  placeholder="+963 900 000 000"
                  className="w-full bg-[#1A1A1A] text-white border border-zinc-700 focus:border-[#C8A45C] rounded-xl px-3 py-1.5 text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  العنوان / المقر:
                </label>
                <input
                  type="text"
                  value={section.address || ""}
                  onChange={(e) =>
                    onUpdateSection({ ...section, address: e.target.value })
                  }
                  placeholder="دمشق، سوريا"
                  className="w-full bg-[#1A1A1A] text-white border border-zinc-700 focus:border-[#C8A45C] rounded-xl px-3 py-1.5 text-xs focus:outline-hidden"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AboutSettings() {
  const [config, setConfig] = useState<AboutConfig>(DEFAULT_CONFIG);
  const [useLegacy, setUseLegacy] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"sections" | "style" | "preview">("sections");

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
      const res = await get("/admin/about-config");
      if (res) {
        if (res.config) setConfig(res.config);
        if (res.use_legacy_about_page !== undefined) {
          setUseLegacy(Boolean(res.use_legacy_about_page));
        }
      }
    } catch (err: any) {
      toast.error("تعذر تحميل إعدادات صفحة من نحن");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await put("/admin/about-config", {
        config,
        use_legacy_about_page: useLegacy,
      });
      toast.success("تم حفظ إعدادات صفحة من نحن بنجاح");
    } catch (err: any) {
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = config.sections.findIndex((s) => s.id === active.id);
      const newIndex = config.sections.findIndex((s) => s.id === over.id);
      const newSections = arrayMove(config.sections, oldIndex, newIndex).map(
        (sec, idx) => ({ ...sec, order: idx + 1 })
      );
      setConfig({ ...config, sections: newSections });
    }
  };

  const handleMoveUp = (id: string) => {
    const idx = config.sections.findIndex((s) => s.id === id);
    if (idx > 0) {
      const newSections = arrayMove(config.sections, idx, idx - 1).map(
        (sec, index) => ({ ...sec, order: index + 1 })
      );
      setConfig({ ...config, sections: newSections });
    }
  };

  const handleMoveDown = (id: string) => {
    const idx = config.sections.findIndex((s) => s.id === id);
    if (idx < config.sections.length - 1) {
      const newSections = arrayMove(config.sections, idx, idx + 1).map(
        (sec, index) => ({ ...sec, order: index + 1 })
      );
      setConfig({ ...config, sections: newSections });
    }
  };

  const handleToggleVisibility = (id: string) => {
    const newSections = config.sections.map((s) =>
      s.id === id ? { ...s, visible: !s.visible } : s
    );
    setConfig({ ...config, sections: newSections });
  };

  const handleDeleteSection = (id: string) => {
    if (confirm("هل أنت تأكد من رغبتك في حذف هذا القسم؟")) {
      const newSections = config.sections
        .filter((s) => s.id !== id)
        .map((sec, idx) => ({ ...sec, order: idx + 1 }));
      setConfig({ ...config, sections: newSections });
    }
  };

  const handleUpdateSection = (updated: AboutSection) => {
    const newSections = config.sections.map((s) =>
      s.id === updated.id ? updated : s
    );
    setConfig({ ...config, sections: newSections });
  };

  const handleAddSection = () => {
    const newId = `sec_${Date.now()}`;
    const newSec: AboutSection = {
      id: newId,
      type: "text",
      title: "قسم جديد",
      content: "أدخل محتوى القسم هنا...",
      order: config.sections.length + 1,
      visible: true,
    };
    setConfig({ ...config, sections: [...config.sections, newSec] });
  };

  const handleResetDefaults = () => {
    if (confirm("هل تريد إعادة ضبط الصفحة للقيم الافتراضية؟")) {
      setConfig(DEFAULT_CONFIG);
      setUseLegacy(false);
      toast.info("تمت الاستعادة للافتراضي. اضغط حفظ للتأكيد.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#C8A45C]" dir="rtl">
        <div className="w-8 h-8 border-2 border-[#C8A45C] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-sm font-semibold">جاري تحميل تخصيص صفحة من نحن...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto" dir="rtl">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#2D2D2D] border border-[#C8A45C]/35 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#C8A45C] shrink-0">
            <Info size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#FDE68A]">تخصيص صفحة من نحن</h1>
            <p className="text-xs text-zinc-400 font-medium">
              إدارة نصوص، أقسام، ألوان وتنسيق صفحة (About Us) في المتجر
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
            href="/about"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-bold bg-[#1A1A1A] hover:bg-[#383838] text-zinc-300 hover:text-white px-3.5 py-2.5 rounded-2xl border border-zinc-700 transition cursor-pointer"
          >
            <ExternalLink size={14} />
            <span>معاينة في المتجر</span>
          </a>

          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs font-bold bg-[#1A1A1A] hover:bg-red-500/10 text-zinc-400 hover:text-red-400 px-3 py-2.5 rounded-2xl border border-zinc-700 hover:border-red-500/40 transition cursor-pointer"
            title="استعادة الافتراضي"
          >
            <RotateCcw size={14} />
          </button>

          <button
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

      {/* Main Header Edit Section */}
      <div className="bg-[#2D2D2D] border border-[#C8A45C]/35 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-700/80 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#C8A45C]" />
            <h2 className="font-black text-white text-base">العنوان الرئيسي والفرعي للصفحة</h2>
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
              العنوان الرئيسي (Title):
            </label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              className="w-full bg-[#1A1A1A] text-white border border-zinc-700 focus:border-[#C8A45C] rounded-2xl px-4 py-2.5 text-sm font-bold focus:outline-hidden"
              placeholder="من نحن"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              العنوان الفرعي (Subtitle):
            </label>
            <input
              type="text"
              value={config.subtitle}
              onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
              className="w-full bg-[#1A1A1A] text-white border border-zinc-700 focus:border-[#C8A45C] rounded-2xl px-4 py-2.5 text-sm focus:outline-hidden"
              placeholder="وصف مختصر للشركة أو المتجر..."
            />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab("sections")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition cursor-pointer ${
            activeTab === "sections"
              ? "bg-[#C8A45C] text-[#1A1A1A] shadow-md"
              : "bg-[#2D2D2D] text-zinc-400 hover:text-white border border-zinc-700"
          }`}
        >
          <FileText size={16} />
          <span>إدارة الأقسام ({config.sections.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("style")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition cursor-pointer ${
            activeTab === "style"
              ? "bg-[#C8A45C] text-[#1A1A1A] shadow-md"
              : "bg-[#2D2D2D] text-zinc-400 hover:text-white border border-zinc-700"
          }`}
        >
          <Palette size={16} />
          <span>تنسيق الألوان والخطوط</span>
        </button>

        <button
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

      {/* TAB 1: SECTIONS MANAGEMENT */}
      {activeTab === "sections" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400 font-medium">
              يمكنك إعادة ترتيب الأقسام بالسحب والإفلات، تعديل محتواها، أو إخفائها/إضافتها حسب الحاجة:
            </p>
            <button
              onClick={handleAddSection}
              className="flex items-center gap-1.5 bg-[#C8A45C]/20 hover:bg-[#C8A45C] text-[#C8A45C] hover:text-[#1A1A1A] px-3.5 py-2 rounded-2xl border border-[#C8A45C]/40 text-xs font-bold transition cursor-pointer"
            >
              <Plus size={16} />
              <span>إضافة قسم جديد</span>
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={config.sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {config.sections.map((sec, idx) => (
                  <SortableSectionCard
                    key={sec.id}
                    section={sec}
                    onToggleVisibility={handleToggleVisibility}
                    onDeleteSection={handleDeleteSection}
                    onUpdateSection={handleUpdateSection}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    isFirst={idx === 0}
                    isLast={idx === config.sections.length - 1}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* TAB 2: STYLE CUSTOMIZATION */}
      {activeTab === "style" && (
        <div className="bg-[#2D2D2D] border border-[#C8A45C]/35 rounded-3xl p-6 shadow-xl space-y-6">
          <h2 className="font-black text-white text-base border-b border-zinc-700 pb-3 flex items-center gap-2">
            <Palette className="text-[#C8A45C]" size={20} />
            <span>إعدادات التصميم والألوان</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-2">
                خلفية الصفحة (Background Color):
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.style.bg_color || "#1A1A1A"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      style: { ...config.style, bg_color: e.target.value },
                    })
                  }
                  className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border border-zinc-700 p-0.5"
                />
                <input
                  type="text"
                  value={config.style.bg_color || "#1A1A1A"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      style: { ...config.style, bg_color: e.target.value },
                    })
                  }
                  className="flex-1 bg-[#1A1A1A] text-white border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-2">
                لون النصوص العامة (Text Color):
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.style.text_color || "#FFFFFF"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      style: { ...config.style, text_color: e.target.value },
                    })
                  }
                  className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border border-zinc-700 p-0.5"
                />
                <input
                  type="text"
                  value={config.style.text_color || "#FFFFFF"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      style: { ...config.style, text_color: e.target.value },
                    })
                  }
                  className="flex-1 bg-[#1A1A1A] text-white border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-2">
                لون العناوين والتمييز (Title Color):
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.style.title_color || "#C8A45C"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      style: { ...config.style, title_color: e.target.value },
                    })
                  }
                  className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border border-zinc-700 p-0.5"
                />
                <input
                  type="text"
                  value={config.style.title_color || "#C8A45C"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      style: { ...config.style, title_color: e.target.value },
                    })
                  }
                  className="flex-1 bg-[#1A1A1A] text-white border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-2">
                خلفية الأقسام (Section Card BG):
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.style.section_bg || "#2D2D2D"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      style: { ...config.style, section_bg: e.target.value },
                    })
                  }
                  className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border border-zinc-700 p-0.5"
                />
                <input
                  type="text"
                  value={config.style.section_bg || "#2D2D2D"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      style: { ...config.style, section_bg: e.target.value },
                    })
                  }
                  className="flex-1 bg-[#1A1A1A] text-white border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-2">
                انحناء الزوايا (Border Radius):
              </label>
              <input
                type="text"
                value={config.style.border_radius || "16px"}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    style: { ...config.style, border_radius: e.target.value },
                  })
                }
                placeholder="16px"
                className="w-full bg-[#1A1A1A] text-white border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-2">
                خط الصفحة (Font Family):
              </label>
              <select
                value={config.style.font_family || "Cairo"}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    style: { ...config.style, font_family: e.target.value },
                  })
                }
                className="w-full bg-[#1A1A1A] text-white border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold focus:outline-hidden"
              >
                <option value="Cairo">Cairo (القاهرة - معتمد)</option>
                <option value="Changa">Changa</option>
                <option value="Tajawal">Tajawal</option>
                <option value="Alexandria">Alexandria</option>
                <option value="Almarai">Almarai</option>
                <option value="Rubik">Rubik</option>
                <option value="Inter">Inter</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE PREVIEW */}
      {activeTab === "preview" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>معاينة حية حقيقية لصفحة من نحن بناءً على التنسيق الحالي:</span>
            {useLegacy && (
              <span className="text-amber-400 font-bold">
                تنبيه: مفعّل الوضع القديم، ستظهر الصفحة الاستاتيكية القديمة للعملاء.
              </span>
            )}
          </div>

          <div
            className="p-6 rounded-3xl border border-zinc-800 space-y-6 shadow-2xl transition-all"
            style={{
              backgroundColor: config.style.bg_color || "#1A1A1A",
              color: config.style.text_color || "#FFFFFF",
              fontFamily: config.style.font_family || "Cairo",
            }}
          >
            {/* Store Preview Header */}
            <div className="text-center space-y-2 pb-4 border-b border-white/10">
              <h1
                className="text-2xl font-black"
                style={{ color: config.style.title_color || "#C8A45C" }}
              >
                {config.title}
              </h1>
              <p className="text-xs opacity-80 max-w-lg mx-auto">{config.subtitle}</p>
            </div>

            {/* Render Visible Sections */}
            {config.sections
              .filter((s) => s.visible)
              .sort((a, b) => a.order - b.order)
              .map((section) => (
                <div
                  key={section.id}
                  className="p-5 border transition shadow-md"
                  style={{
                    backgroundColor: config.style.section_bg || "#2D2D2D",
                    borderRadius: config.style.border_radius || "16px",
                    borderColor: `${config.style.title_color || "#C8A45C"}33`,
                  }}
                >
                  <h3
                    className="text-base font-black mb-3"
                    style={{ color: config.style.title_color || "#C8A45C" }}
                  >
                    {section.title}
                  </h3>

                  {/* Text Section */}
                  {section.type === "text" && (
                    <div className="space-y-3">
                      <p className="text-xs leading-relaxed opacity-90 whitespace-pre-line">
                        {section.content}
                      </p>
                      {section.image && (
                        <img
                          src={section.image}
                          alt={section.title}
                          className="w-full max-h-56 object-cover rounded-xl mt-2"
                        />
                      )}
                    </div>
                  )}

                  {/* Team Section */}
                  {section.type === "team" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      {(section.members || []).map((m, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl border border-white/10 bg-black/20 flex items-center gap-3"
                        >
                          <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden shrink-0 flex items-center justify-center font-bold text-sm">
                            {m.image ? (
                              <img
                                src={m.image}
                                alt={m.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              m.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-xs">{m.name}</div>
                            <div
                              className="text-[11px] font-medium"
                              style={{ color: config.style.title_color }}
                            >
                              {m.role}
                            </div>
                            {m.bio && (
                              <div className="text-[10px] opacity-70 mt-0.5">{m.bio}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stats Section */}
                  {section.type === "stats" && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mt-3">
                      {(section.statistics || []).map((st, i) => (
                        <div key={i} className="p-3 rounded-xl bg-black/20 border border-white/10">
                          <div
                            className="text-lg font-black"
                            style={{ color: config.style.title_color }}
                          >
                            {st.value}
                          </div>
                          <div className="text-[11px] opacity-80 mt-1">{st.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Contact Section */}
                  {section.type === "contact" && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-3">
                      {section.email && (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/20 border border-white/10">
                          <Mail size={16} style={{ color: config.style.title_color }} />
                          <span className="truncate">{section.email}</span>
                        </div>
                      )}
                      {section.phone && (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/20 border border-white/10">
                          <Phone size={16} style={{ color: config.style.title_color }} />
                          <span className="truncate">{section.phone}</span>
                        </div>
                      )}
                      {section.address && (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/20 border border-white/10">
                          <MapPin size={16} style={{ color: config.style.title_color }} />
                          <span className="truncate">{section.address}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
