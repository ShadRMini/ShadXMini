import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Info,
  ShieldCheck,
  Zap,
  Headphones,
  Globe,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Users,
  Award,
  Sparkles,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

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
      content:
        "بدأت رحلتنا في تقديم أسرع وأرقى الخدمات الرقمية للبطاقات والشحن وباقات الألعاب بطرق سريعة وآمنة بأسعار منافسة ومعالجة فورية.",
      image: "",
      order: 1,
      visible: true,
    },
    {
      id: "mission",
      type: "text",
      title: "رسالتنا",
      content:
        "تمكين الأفراد والشركات من الوصول إلى كافة الخدمات والبطاقات الرقمية بسهولة، سرعة وأمان لا مثيل له.",
      image: "",
      order: 2,
      visible: true,
    },
    {
      id: "vision",
      type: "text",
      title: "رؤيتنا",
      content:
        "أن نكون الخيار الأول والمنصة الرائدة والأكثر موثوقية في المنطقة لتوفير حلول الشحن الرقمي والخدمات الإلكترونية.",
      image: "",
      order: 3,
      visible: true,
    },
    {
      id: "team",
      type: "team",
      title: "فريقنا المتميز",
      members: [
        {
          name: "أحمد علي",
          role: "المدير التنفيذي",
          image: "",
          bio: "خبرة تزيد عن 8 سنوات في إدارة المنصات الرقمية وخدمات الدفع.",
        },
        {
          name: "سارة المحمود",
          role: "مديرة الدعم والعمليات",
          image: "",
          bio: "متخصصة في جودة الخدمة ودعم العملاء الفوري على مدار الساعة.",
        },
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

export default function About() {
  const [config, setConfig] = useState<AboutConfig | null>(null);
  const [useLegacy, setUseLegacy] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

    fetch(`${baseUrl}/api/public/about-config`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data) {
          if (data.config) {
            setConfig(data.config);
          } else if (data.title || data.sections) {
            setConfig({
              title: data.title || DEFAULT_CONFIG.title,
              subtitle: data.subtitle || DEFAULT_CONFIG.subtitle,
              sections: data.sections || DEFAULT_CONFIG.sections,
              style: data.style || DEFAULT_CONFIG.style,
            });
          } else {
            setConfig(DEFAULT_CONFIG);
          }
          if (data.use_legacy_about_page !== undefined) {
            setUseLegacy(Boolean(data.use_legacy_about_page));
          }
        } else {
          setConfig(DEFAULT_CONFIG);
        }
      })
      .catch(() => {
        if (active) setConfig(DEFAULT_CONFIG);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`تم نسخ ${label}`);
  };

  if (isLoading) {
    return (
      <div className="p-6 min-h-screen bg-[#1A1A1A] text-white flex flex-col items-center justify-center gap-3" dir="rtl">
        <div className="w-8 h-8 border-2 border-[#C8A45C] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-zinc-400 font-medium">جاري تحميل صفحة من نحن...</span>
      </div>
    );
  }

  // Legacy Static Design Mode
  if (useLegacy) {
    return (
      <div className="p-4 sm:p-6 min-h-screen bg-[#1A1A1A] text-white pb-24 animate-in fade-in duration-300" dir="rtl">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#C8A45C]">
              <Info size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#FDE68A]">من نحن</h1>
              <p className="text-xs text-zinc-400 font-medium">تعرف على المنصة وخدماتنا (الوضع الكلاسيكي)</p>
            </div>
          </div>
          <Link href="/">
            <button className="flex items-center gap-1 text-xs font-bold text-[#C8A45C] hover:text-[#FDE68A] bg-[#2D2D2D] border border-zinc-700 hover:border-[#C8A45C] px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer">
              <span>الرئيسية</span>
              <ArrowRight size={14} />
            </button>
          </Link>
        </div>

        <div className="space-y-4 max-w-2xl mx-auto">
          {/* Hero Card */}
          <div className="bg-[#2D2D2D] border border-[#C8A45C]/40 text-white rounded-3xl p-6 sm:p-8 text-center shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#C8A45C]/10 rounded-full blur-3xl pointer-events-none" />
            <h2 className="text-xl sm:text-2xl font-black text-[#FDE68A] mb-2">
              منصة ShadMini للخدمات الرقمية
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium">
              المنصة الرائدة والأسرع لخدمات شحن الألعاب، البطاقات الرقمية، والاشتراكات في الوطن العربي بأعلى معايير الأمان والسرعة.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 rounded-2xl p-4 shadow-md hover:border-[#C8A45C] transition">
              <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-[#C8A45C]/40 text-[#C8A45C] flex items-center justify-center mb-3">
                <Zap size={20} />
              </div>
              <h3 className="text-sm font-bold text-[#FDE68A] mb-1">تسليم فوري وآلي</h3>
              <p className="text-xs text-zinc-400 leading-normal">
                تنفيذ فوري لطلباتك عبر أحدث أنظمة الربط المباشر مع مزودي الخدمات العالمية.
              </p>
            </div>

            <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 rounded-2xl p-4 shadow-md hover:border-[#C8A45C] transition">
              <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-[#C8A45C]/40 text-[#C8A45C] flex items-center justify-center mb-3">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-sm font-bold text-[#FDE68A] mb-1">حماية وأمان كامل</h3>
              <p className="text-xs text-zinc-400 leading-normal">
                معاملات مالية مشفرة بالكامل لضمان سلامة بياناتك وأرصدتك الرقمية.
              </p>
            </div>

            <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 rounded-2xl p-4 shadow-md hover:border-[#C8A45C] transition">
              <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-[#C8A45C]/40 text-[#C8A45C] flex items-center justify-center mb-3">
                <Globe size={20} />
              </div>
              <h3 className="text-sm font-bold text-[#FDE68A] mb-1">طرق دفع محلية ودولية</h3>
              <p className="text-xs text-zinc-400 leading-normal">
                دعم شام كاش، سيريتل كاش، MTN كاش، بينانس باي، وUSDT.
              </p>
            </div>

            <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 rounded-2xl p-4 shadow-md hover:border-[#C8A45C] transition">
              <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-[#C8A45C]/40 text-[#C8A45C] flex items-center justify-center mb-3">
                <Headphones size={20} />
              </div>
              <h3 className="text-sm font-bold text-[#FDE68A] mb-1">دعم فني متواصل</h3>
              <p className="text-xs text-zinc-400 leading-normal">
                فريق دعم فني جاهز للإجابة على استفساراتكم ومتابعة الطلبات على مدار الساعة.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dynamic Page Setup
  const currentConfig = config || DEFAULT_CONFIG;
  const style = currentConfig.style || DEFAULT_CONFIG.style;
  const activeSections = (currentConfig.sections || DEFAULT_CONFIG.sections)
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  return (
    <div
      className="p-4 sm:p-6 min-h-screen pb-24 animate-in fade-in duration-300"
      dir="rtl"
      style={{
        backgroundColor: style.bg_color || "#1A1A1A",
        color: style.text_color || "#FFFFFF",
        fontFamily: style.font_family || "Cairo",
      }}
    >
      {/* Top Bar Header */}
      <div className="flex items-center justify-between mb-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center border"
            style={{
              backgroundColor: `${style.title_color || "#C8A45C"}20`,
              borderColor: `${style.title_color || "#C8A45C"}50`,
              color: style.title_color || "#C8A45C",
            }}
          >
            <Info size={22} />
          </div>
          <div>
            <h1
              className="text-xl font-black"
              style={{ color: style.title_color || "#C8A45C" }}
            >
              {currentConfig.title || "من نحن"}
            </h1>
            <p className="text-xs opacity-75 font-medium">
              {currentConfig.subtitle || "تعرف على المنصة ورسالتنا"}
            </p>
          </div>
        </div>

        <Link href="/">
          <button
            className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition border cursor-pointer hover:opacity-90"
            style={{
              backgroundColor: style.section_bg || "#2D2D2D",
              borderColor: `${style.title_color || "#C8A45C"}50`,
              color: style.title_color || "#C8A45C",
            }}
          >
            <span>الرئيسية</span>
            <ArrowRight size={14} />
          </button>
        </Link>
      </div>

      {/* Sections List */}
      <div className="space-y-4 max-w-2xl mx-auto">
        {activeSections.map((section) => (
          <div
            key={section.id}
            className="p-5 sm:p-6 border shadow-xl transition relative overflow-hidden"
            style={{
              backgroundColor: style.section_bg || "#2D2D2D",
              borderRadius: style.border_radius || "16px",
              borderColor: `${style.title_color || "#C8A45C"}35`,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 shrink-0" style={{ color: style.title_color || "#C8A45C" }} />
              <h2
                className="text-lg font-black"
                style={{ color: style.title_color || "#C8A45C" }}
              >
                {section.title}
              </h2>
            </div>

            {/* Section Type: Text */}
            {section.type === "text" && (
              <div className="space-y-3">
                <p className="text-xs sm:text-sm leading-relaxed opacity-90 whitespace-pre-line font-medium">
                  {section.content}
                </p>
                {section.image && (
                  <div className="rounded-2xl overflow-hidden border border-white/10 mt-3">
                    <img
                      src={section.image}
                      alt={section.title}
                      className="w-full max-h-64 object-cover"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Section Type: Team */}
            {section.type === "team" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {(section.members || []).map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-white/10 bg-black/20 flex items-start gap-3"
                  >
                    <div
                      className="w-11 h-11 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center font-black text-sm border"
                      style={{
                        backgroundColor: `${style.title_color || "#C8A45C"}20`,
                        borderColor: `${style.title_color || "#C8A45C"}40`,
                        color: style.title_color || "#C8A45C",
                      }}
                    >
                      {m.image ? (
                        <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                      ) : (
                        m.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-xs sm:text-sm text-white truncate">{m.name}</h3>
                      <div
                        className="text-xs font-bold mt-0.5"
                        style={{ color: style.title_color || "#C8A45C" }}
                      >
                        {m.role}
                      </div>
                      {m.bio && (
                        <p className="text-[11px] opacity-75 mt-1 leading-snug line-clamp-2 font-medium">
                          {m.bio}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Section Type: Stats */}
            {section.type === "stats" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mt-4">
                {(section.statistics || []).map((st, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-black/25 border border-white/10 flex flex-col justify-center items-center"
                  >
                    <div
                      className="text-xl sm:text-2xl font-black tracking-tight"
                      style={{ color: style.title_color || "#C8A45C" }}
                    >
                      {st.value}
                    </div>
                    <div className="text-xs opacity-80 font-bold mt-1">{st.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Section Type: Contact */}
            {section.type === "contact" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs font-medium">
                {section.email && (
                  <div
                    onClick={() => copyToClipboard(section.email!, "البريد الإلكتروني")}
                    className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-black/25 border border-white/10 cursor-pointer hover:border-[#C8A45C] transition"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-4 h-4 shrink-0" style={{ color: style.title_color }} />
                      <span className="truncate">{section.email}</span>
                    </div>
                    <Copy className="w-3.5 h-3.5 opacity-60 shrink-0" />
                  </div>
                )}

                {section.phone && (
                  <div
                    onClick={() => copyToClipboard(section.phone!, "رقم الهاتف")}
                    className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-black/25 border border-white/10 cursor-pointer hover:border-[#C8A45C] transition"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Phone className="w-4 h-4 shrink-0" style={{ color: style.title_color }} />
                      <span className="truncate" dir="ltr">{section.phone}</span>
                    </div>
                    <Copy className="w-3.5 h-3.5 opacity-60 shrink-0" />
                  </div>
                )}

                {section.address && (
                  <div
                    onClick={() => copyToClipboard(section.address!, "العنوان")}
                    className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-black/25 border border-white/10 cursor-pointer hover:border-[#C8A45C] transition"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className="w-4 h-4 shrink-0" style={{ color: style.title_color }} />
                      <span className="truncate">{section.address}</span>
                    </div>
                    <Copy className="w-3.5 h-3.5 opacity-60 shrink-0" />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
