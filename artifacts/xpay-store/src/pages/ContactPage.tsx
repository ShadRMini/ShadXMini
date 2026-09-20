import React, { useState, useEffect, useMemo } from "react";
import {
  MessageCircle,
  Send,
  Mail,
  Phone,
  Clock,
  MapPin,
  ChevronDown,
  Sparkles,
  Copy,
  Check,
  HelpCircle,
  ExternalLink,
  SendHorizontal,
  Headphones,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
  Globe,
  Share2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getPublicJson, apiRequest } from "@/lib/public-api";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

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

interface PublicSettings {
  siteName?: string;
  support_whatsapp?: string;
  support_telegram?: string;
  support_email?: string;
  support_phone?: string;
  contact_whatsapp?: string;
  contact_telegram?: string;
  contact_email?: string;
  contact_phone?: string;
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
    map: { visible: false, title: "موقعنا", embed_url: "" },
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
    bg_color: "",
    card_bg: "",
    title_color: "",
    text_color: "",
    border_color: "",
  },
};

const REJECTED_COLORS = [
  "#1a1a1a",
  "#2d2d2d",
  "#c8a45c",
  "#fde68a",
  "#e5e7eb",
  "#3d3d3d",
  "#242424",
  "#ffffff",
  "#b8954a",
  "#111827",
  "#374151",
];

function sanitizeColor(val: string | undefined, fallbackCssVar: string): string {
  if (!val || typeof val !== "string") return fallbackCssVar;
  const normalized = val.trim().toLowerCase();
  if (REJECTED_COLORS.includes(normalized)) {
    return fallbackCssVar;
  }
  return val;
}

const FAQ_LIST_LEGACY = [
  {
    id: "deposit",
    question: "كيف يمكنني شحن رصيدي في المتجر؟",
    answer:
      "يمكنك شحن رصيدك بسهولة فائقة عبر الانتقال إلى صفحة 'المحفظة' أو 'دفعاتي المالية' من القائمة، واختيار وسيلة الدفع الأنسب لك (مثل شام كاش الفوري أو اليدوي، سيريتل كاش، إم تي إن كاش، أو باينانس Pay). بعد إتمام الدفع يتم إيداع الرصيد في حسابك تلقائياً أو فور تدقيق الإشعار.",
  },
  {
    id: "delivery-time",
    question: "ما هي مدة معالجة وتسليم الطلبات؟",
    answer:
      "معظم البطاقات الرقمية، شدات الألعاب، والأكواد يتم تسليمها فورياً وبشكل آلي خلال ثوانٍ معدودة من خصم الرصيد. أما في حالات الشحن اليدوي النادرة فقد تستغرق العملية من 5 إلى 20 دقيقة خلال ساعات العمل.",
  },
  {
    id: "verification",
    question: "كيف أقوم بتوثيق حسابي في المتجر؟",
    answer:
      "يمكنك توثيق حسابك بالتوجه إلى صفحة 'توثيق الهوية' في القائمة الجانبية، ورفع صورة الهوية الوطنية أو جواز السفر مع البيانات الأساسية. يتم تدقيق الطلب من فريق الأمان ورفع سقف معاملاتك وحمايتها.",
  },
  {
    id: "refund",
    question: "ما هي سياسة الاسترجاع والضمان؟",
    answer:
      "نظراً للطبيعة الرقمية للأكواد والخدمات، لا يمكن استرجاع الأكواد المستلمة والسليمة. وفي حال وجود أي خلل أو عطل مثبت في الكود، يضمن المتجر استبدال الكود فوراً أو استرداد كامل قيمته إلى محفظتك.",
  },
];

function getChannelIconComponent(iconName: string) {
  switch (iconName) {
    case "Send":
      return Send;
    case "Mail":
      return Mail;
    case "Phone":
      return Phone;
    case "Facebook":
      return Facebook;
    case "Instagram":
      return Instagram;
    case "Twitter":
      return Twitter;
    case "Youtube":
      return Youtube;
    case "Linkedin":
      return Linkedin;
    case "Globe":
      return Globe;
    case "MapPin":
      return MapPin;
    case "Headphones":
      return Headphones;
    case "HelpCircle":
      return HelpCircle;
    case "Share2":
      return Share2;
    case "MessageCircle":
    default:
      return MessageCircle;
  }
}

export default function ContactPage() {
  const { user } = useAuth();
  const [config, setConfig] = useState<ContactPageConfig>(DEFAULT_CONFIG);
  const [useLegacy, setUseLegacy] = useState(false);
  const [legacySettings, setLegacySettings] = useState<PublicSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Accordion state
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  // Copy indicator state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pre-fill user data if logged in
  useEffect(() => {
    if (user) {
      if (user.username && !name) setName(user.username);
      if (user.email && !email) setEmail(user.email);
    }
  }, [user]);

  // Load Contact Page Config from public endpoint
  useEffect(() => {
    let active = true;
    getPublicJson<any>("/public/contact-config")
      .then((data) => {
        if (!active || !data) return;
        if (data.use_legacy_contact_page !== undefined) {
          setUseLegacy(Boolean(data.use_legacy_contact_page));
        }

        const loadedConfig: ContactPageConfig = {
          title: data.title || DEFAULT_CONFIG.title,
          subtitle: data.subtitle || DEFAULT_CONFIG.subtitle,
          channels: Array.isArray(data.channels) ? data.channels : DEFAULT_CONFIG.channels,
          sections: {
            ...DEFAULT_CONFIG.sections,
            ...(data.sections || {}),
          },
          form_fields: {
            ...DEFAULT_CONFIG.form_fields,
            ...(data.form_fields || {}),
          },
          faq: Array.isArray(data.faq) ? data.faq : DEFAULT_CONFIG.faq,
          styles: {
            ...DEFAULT_CONFIG.styles,
            ...(data.styles || {}),
          },
        };
        setConfig(loadedConfig);

        // Set default subject if available
        if (loadedConfig.form_fields.subject.options?.length) {
          setSubject(loadedConfig.form_fields.subject.options[0]);
        }
      })
      .catch((err) => {
        console.warn("Public contact-config load error, using defaults:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // Also fetch legacy settings in case legacy mode is on
    getPublicJson<PublicSettings>("/settings/public")
      .then((data) => {
        if (active && data) setLegacySettings(data);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  // Sorted channels & FAQ
  const activeChannels = useMemo(() => {
    return (config.channels || [])
      .filter((c) => c.active !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [config.channels]);

  const sortedFaq = useMemo(() => {
    return (config.faq || []).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [config.faq]);

  // Set default open FAQ
  useEffect(() => {
    if (sortedFaq.length > 0 && openFaq === null) {
      setOpenFaq(sortedFaq[0].id);
    }
  }, [sortedFaq]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("تم النسخ إلى الحافظة بنجاح");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const ff = config.form_fields;
    if (ff.name.visible && ff.name.required && !name.trim()) {
      toast.error(`يرجى إدخال ${ff.name.label || "الاسم الكامل"}`);
      return;
    }
    if (ff.email.visible && ff.email.required && (!email.trim() || !email.includes("@"))) {
      toast.error(`يرجى إدخال ${ff.email.label || "بريد إلكتروني صالح"}`);
      return;
    }
    if (ff.subject.visible && ff.subject.required && !subject.trim()) {
      toast.error(`يرجى اختيار ${ff.subject.label || "موضوع الرسالة"}`);
      return;
    }
    if (ff.message.visible && ff.message.required && (!message.trim() || message.trim().length < 5)) {
      toast.error("يرجى كتابة رسالة توضيحية لا تقل عن 5 أحرف");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest("/public/contact-messages", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim() || (user?.username ?? "مستخدم زائر"),
          email: email.trim() || (user?.email ?? "no-email@provided.com"),
          subject: subject.trim() || "استفسار عام",
          message: message.trim(),
        }),
      });

      toast.success("تم إرسال رسالتك بنجاح! سنقوم بالرد عليك في أقرب وقت.");
      setMessage("");
      if (!user) {
        setName("");
        setEmail("");
      }
    } catch (err: any) {
      console.error("Failed to send contact message:", err);
      toast.error(err.message || "حدث خطأ أثناء إرسال الرسالة، يرجى المحاولة لاحقاً");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] text-white p-4 max-w-5xl mx-auto space-y-8" dir="rtl">
        <div className="text-center pt-8 pb-4 space-y-3">
          <Skeleton className="w-16 h-16 rounded-3xl mx-auto bg-zinc-800" />
          <Skeleton className="w-48 h-8 mx-auto bg-zinc-800" />
          <Skeleton className="w-80 h-4 mx-auto bg-zinc-800" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-44 rounded-3xl bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // LEGACY MODE (Requirement: use_legacy_contact_page)
  // -------------------------------------------------------------
  if (useLegacy) {
    const whatsappRaw = legacySettings?.support_whatsapp || "+963900000000";
    const telegramRaw = legacySettings?.support_telegram || "ShadMiniSupport";
    const emailRaw = legacySettings?.support_email || "support@shadmini.com";
    const phoneRaw = legacySettings?.support_phone || "+963900000000";

    const cleanWhatsapp = whatsappRaw.replace(/[^0-9]/g, "");
    const cleanTelegram = telegramRaw.replace(/^@/, "");

    const legacyCards = [
      {
        key: "whatsapp",
        title: "WhatsApp",
        subtitle: "محادثة مباشرة وسريعة",
        value: whatsappRaw,
        actionLabel: "محادثة الآن",
        actionHref: `https://wa.me/${cleanWhatsapp}`,
        icon: MessageCircle,
        iconColor: "text-[#25D366]",
        bgGlow: "bg-[#25D366]/10",
        borderColor: "border-[#25D366]/40",
      },
      {
        key: "telegram",
        title: "Telegram",
        subtitle: "قناة والدعم الفني",
        value: `@${cleanTelegram}`,
        actionLabel: "فتح تليجرام",
        actionHref: `https://t.me/${cleanTelegram}`,
        icon: Send,
        iconColor: "text-[#0088cc]",
        bgGlow: "bg-[#0088cc]/10",
        borderColor: "border-[#0088cc]/40",
      },
      {
        key: "email",
        title: "البريد الإلكتروني",
        subtitle: "للاستفسارات والشكاوى الرسمية",
        value: emailRaw,
        actionLabel: "إرسال بريد",
        actionHref: `mailto:${emailRaw}`,
        icon: Mail,
        iconColor: "text-[#C8A45C]",
        bgGlow: "bg-[#C8A45C]/10",
        borderColor: "border-[#C8A45C]/40",
      },
      {
        key: "phone",
        title: "الاتصال الهاتفي",
        subtitle: "خلال ساعات العمل الرسمية",
        value: phoneRaw,
        actionLabel: "اتصال هاتفي",
        actionHref: `tel:${phoneRaw}`,
        icon: Phone,
        iconColor: "text-[#FDE68A]",
        bgGlow: "bg-[#FDE68A]/10",
        borderColor: "border-[#FDE68A]/40",
      },
    ];

    return (
      <div
        className="min-h-screen pb-24 p-4 max-w-5xl mx-auto selection:bg-[#C8A45C] selection:text-black space-y-8"
        dir="rtl"
        style={{
          backgroundColor: "var(--contact-bg-color, var(--theme-background, #1A1A1A))",
          color: "var(--contact-text-color, var(--theme-text-primary, #FFFFFF))",
        }}
      >
        <div className="text-center pt-4 pb-2">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-3xl border border-[var(--theme-border)] shadow-xl mb-4 text-[var(--theme-primary)]"
            style={{ backgroundColor: "var(--contact-card-color, var(--theme-card))" }}
          >
            <Headphones size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mb-2 tracking-wide text-[var(--theme-primary)]">
            تواصل معنا
          </h1>
          <p className="text-sm sm:text-base text-[var(--theme-text-muted)] max-w-xl mx-auto leading-relaxed">
            نحن هنا لمساعدتك والإجابة على كافة استفساراتك. اختر القناة الأنسب لك أو أرسل لنا رسالة مباشرة.
          </p>
        </div>

        {/* Legacy Cards */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {legacyCards.map((card) => {
            const Icon = card.icon;
            const isCopied = copiedId === card.key;
            return (
              <motion.div
                key={card.key}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-[280px] sm:w-[calc(50%-0.75rem)] sm:max-w-[320px] lg:w-[calc(25%-0.75rem)] border border-[#C8A45C]/20 hover:border-[#C8A45C]/60 rounded-3xl p-6 flex flex-col items-center text-center justify-between shadow-xl relative overflow-hidden group"
                style={{ backgroundColor: "var(--contact-card-color, var(--theme-card, #2D2D2D))" }}
              >
                <div
                  className={`absolute -top-12 -left-12 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity ${card.bgGlow}`}
                />
                <div className="flex flex-col items-center w-full">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-[#1A1A1A] border ${card.borderColor} flex items-center justify-center mb-4 shadow-md group-hover:scale-105 transition-transform`}
                  >
                    <Icon size={26} className={card.iconColor} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1 group-hover:text-[#FDE68A] transition-colors text-center">
                    {card.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mb-3 text-center">{card.subtitle}</p>
                  <div className="flex items-center justify-center gap-2 bg-[#1A1A1A] px-3 py-1.5 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-300 mb-4 w-full max-w-[220px]">
                    <span className="truncate text-center" dir="ltr">
                      {card.value}
                    </span>
                    <button
                      onClick={() => handleCopy(card.value, card.key)}
                      className="text-zinc-500 hover:text-[#C8A45C] transition p-1 cursor-pointer shrink-0"
                      title="نسخ"
                    >
                      {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <a
                  href={card.actionHref}
                  target={card.key !== "phone" ? "_blank" : undefined}
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#C8A45C] hover:bg-[#DEB86D] text-[#1A1A1A] font-black text-xs py-2.5 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
                >
                  <span>{card.actionLabel}</span>
                  <ExternalLink size={13} />
                </a>
              </motion.div>
            );
          })}
        </div>

        {/* Legacy Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 bg-[#2D2D2D] border border-[#C8A45C]/25 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6 border-b border-zinc-800/80 pb-4">
              <div className="w-10 h-10 rounded-xl bg-[#C8A45C]/15 border border-[#C8A45C]/40 flex items-center justify-center text-[#C8A45C]">
                <SendHorizontal size={20} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-[#FDE68A]">
                  أو أرسل لنا رسالة مباشرة
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  فريق الدعم الفني سيقوم بالرد على بريدك الإلكتروني في أقرب وقت.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    الاسم الكامل <span className="text-[#C8A45C]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: أحمد محمد"
                    className="w-full bg-[#3D3D3D] border border-[#4B5563] focus:border-[#C8A45C] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none transition shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    البريد الإلكتروني <span className="text-[#C8A45C]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-[#3D3D3D] border border-[#4B5563] focus:border-[#C8A45C] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none transition shadow-inner"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  موضوع الرسالة <span className="text-[#C8A45C]">*</span>
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-[#3D3D3D] border border-[#4B5563] focus:border-[#C8A45C] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none transition cursor-pointer"
                >
                  <option value="استفسار عام">استفسار عام</option>
                  <option value="مشكلة تقنية">مشكلة تقنية في الطلب أو الرصيد</option>
                  <option value="اقتراح">اقتراح تحسين للمتجر</option>
                  <option value="شكوى">شكوى أو ملاحظة</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-zinc-300">
                    تفاصيل الرسالة <span className="text-[#C8A45C]">*</span>
                  </label>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {message.length} حرف (حد أدنى 10)
                  </span>
                </div>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="اكتب استفسارك بالتفصيل وسنقوم بمساعدتك بأسرع ما يمكن..."
                  className="w-full bg-[#3D3D3D] border border-[#4B5563] focus:border-[#C8A45C] rounded-xl p-3.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none transition resize-none shadow-inner"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#C8A45C] hover:bg-[#DEB86D] text-[#1A1A1A] font-black text-sm py-3.5 rounded-xl shadow-lg transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <Send size={16} className={submitting ? "animate-spin" : ""} />
                <span>{submitting ? "جاري إرسال رسالتك..." : "إرسال الرسالة الآن"}</span>
              </button>
            </form>
          </div>

          <div className="space-y-4">
            <div className="bg-[#2D2D2D] border border-[#C8A45C]/20 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C8A45C]/15 border border-[#C8A45C]/30 flex items-center justify-center text-[#C8A45C]">
                  <Clock size={20} />
                </div>
                <h3 className="font-bold text-white text-sm sm:text-base">ساعات العمل والرد</h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                فريق خدمة العملاء متواجد لمتابعة طلباتكم واستفساراتكم يومياً:
              </p>
              <div className="bg-[#1A1A1A] p-3.5 rounded-2xl border border-zinc-800 space-y-2 text-xs">
                <div className="flex justify-between items-center text-zinc-300">
                  <span className="font-bold">طيلة أيام الأسبوع:</span>
                  <span className="text-[#FDE68A] font-mono font-bold">10:00 ص - 12:00 م</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legacy FAQ */}
        <div className="bg-[#2D2D2D] border border-[#C8A45C]/25 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6 border-b border-zinc-800/80 pb-4">
            <div className="w-10 h-10 rounded-xl bg-[#C8A45C]/15 border border-[#C8A45C]/40 flex items-center justify-center text-[#C8A45C]">
              <HelpCircle size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#FDE68A]">الأسئلة الشائعة</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                إجابات سريعة على أبرز الاستفسارات التي يطرحها عملاؤنا الكرام.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {FAQ_LIST_LEGACY.map((faq) => {
              const isOpen = openFaq === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? "bg-[#1A1A1A] border-[#C8A45C]/50 shadow-md"
                      : "bg-[#1A1A1A]/60 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                    className="w-full p-4 sm:p-5 text-right flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span
                      className={`text-xs sm:text-sm font-bold transition-colors ${
                        isOpen ? "text-[#FDE68A]" : "text-white"
                      }`}
                    >
                      {faq.question}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border transition-transform ${
                        isOpen
                          ? "bg-[#C8A45C] text-[#1A1A1A] border-[#C8A45C] rotate-180"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700"
                      }`}
                    >
                      <ChevronDown size={16} />
                    </div>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-4 pb-5 sm:px-5 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-zinc-800/80 pt-3">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // DYNAMIC MODE (Powered by Admin Panel Config)
  // -------------------------------------------------------------
  const { styles, sections, form_fields } = config;

  return (
    <div
      className="min-h-screen pb-24 p-4 selection:bg-[#C8A45C] selection:text-black transition-colors"
      style={{
        backgroundColor: "var(--contact-bg-color, var(--contact-bg, var(--theme-background)))",
        color: "var(--contact-text-color, var(--contact-text, var(--theme-text-primary)))",
      }}
      dir="rtl"
    >
      <div className="max-w-5xl mx-auto space-y-8">
        {/* 1️⃣ Dynamic Header */}
        <div className="text-center pt-6 pb-2">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-3xl mb-4 shadow-xl border"
            style={{
              backgroundColor: "var(--contact-card-color, var(--contact-card-bg, var(--theme-card)))",
              borderColor: "var(--contact-border-color, var(--contact-border, var(--theme-border)))",
              color: "var(--contact-title-color, var(--contact-title, var(--theme-primary)))",
            }}
          >
            <Headphones size={32} />
          </div>
          <h1
            className="text-2xl sm:text-3xl font-black mb-2 tracking-wide"
            style={{ color: "var(--contact-title-color, var(--contact-title, var(--theme-primary)))" }}
          >
            {config.title || "تواصل معنا"}
          </h1>
          <p
            className="text-sm sm:text-base max-w-xl mx-auto leading-relaxed"
            style={{ color: "var(--contact-text-color, var(--contact-text, var(--theme-text-primary)))", opacity: 0.85 }}
          >
            {config.subtitle || "نحن هنا لمساعدتك. تواصل معنا عبر أي من القنوات التالية"}
          </p>
        </div>

        {/* 2️⃣ Channels Section (if visible) */}
        {sections.channels.visible && activeChannels.length > 0 && (
          <div className="space-y-4">
            {sections.channels.title && (
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: sanitizeColor(styles.title_color, "var(--contact-title-color, var(--contact-title, var(--theme-primary)))") }}
                />
                <h2
                  className="text-base sm:text-lg font-bold"
                  style={{ color: sanitizeColor(styles.title_color, "var(--contact-title-color, var(--contact-title, var(--theme-primary)))") }}
                >
                  {sections.channels.title}
                </h2>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-4">
              {activeChannels.map((channel) => {
                const IconComponent = getChannelIconComponent(channel.icon);
                const isCopied = copiedId === channel.id;
                const channelColor = channel.color || styles.title_color || "#C8A45C";

                return (
                  <motion.div
                    key={channel.id}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="w-full max-w-[280px] sm:w-[calc(50%-0.75rem)] sm:max-w-[320px] lg:w-[calc(25%-0.75rem)] rounded-3xl p-6 flex flex-col items-center text-center justify-between shadow-xl relative overflow-hidden group border"
                    style={{
                      backgroundColor: styles.card_bg || "var(--contact-card-color, var(--theme-card, #2D2D2D))",
                      borderColor: `${channelColor}40`,
                    }}
                  >
                    {/* Background glow using channel's color */}
                    <div
                      className="absolute -top-12 -left-12 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-20 group-hover:opacity-60 transition-opacity"
                      style={{ backgroundColor: channelColor }}
                    />

                    <div className="flex flex-col items-center w-full">
                      {/* Channel Icon Badge */}
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-md group-hover:scale-105 transition-transform text-white"
                        style={{
                          backgroundColor: channelColor,
                        }}
                      >
                        <IconComponent size={26} />
                      </div>

                      <h3
                        className="text-base font-bold mb-1 group-hover:brightness-125 transition-all text-center"
                        style={{ color: styles.text_color || "#FFFFFF" }}
                      >
                        {channel.name}
                      </h3>

                      {/* Display Value with Copy */}
                      <div
                        className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono mb-4 border w-full max-w-[220px]"
                        style={{
                          backgroundColor: `${styles.bg_color || "#1A1A1A"}CC`,
                          borderColor: `${styles.border_color || "#C8A45C"}25`,
                          color: styles.text_color || "#E5E7EB",
                        }}
                      >
                        <span className="truncate text-center" dir="ltr">
                          {channel.value}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(channel.value, channel.id)}
                          className="text-zinc-400 hover:text-white transition p-1 cursor-pointer shrink-0"
                          title="نسخ النص"
                          aria-label="نسخ"
                        >
                          {isCopied ? (
                            <Check size={14} className="text-emerald-400" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Action Button */}
                    <a
                      href={channel.link || "#"}
                      target={channel.link.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 font-bold text-xs py-2.5 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
                      style={{
                        backgroundColor: channelColor,
                        color: "#1A1A1A",
                      }}
                    >
                      <span>تواصل الآن</span>
                      <ExternalLink size={13} />
                    </a>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3️⃣ Contact Form & (FAQ or Map) Section */}
        {(sections.form.visible || sections.map.visible) && (
          <div
            className={
              sections.form.visible && sections.map.visible
                ? "grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
                : "max-w-2xl mx-auto w-full"
            }
          >
            {/* Form Column */}
            {sections.form.visible && (
              <div
                className={`${
                  sections.map.visible ? "lg:col-span-2" : "w-full"
                } rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border`}
                style={{
                  backgroundColor: styles.card_bg || "var(--contact-card-color, var(--theme-card, #2D2D2D))",
                  borderColor: `${styles.border_color || "#C8A45C"}40`,
                }}
              >
                <div
                  className="flex items-center gap-3 mb-6 pb-4 border-b"
                  style={{ borderColor: `${styles.border_color || "#C8A45C"}20` }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border"
                    style={{
                      backgroundColor: `${styles.title_color || "#C8A45C"}20`,
                      borderColor: `${styles.border_color || "#C8A45C"}50`,
                      color: styles.title_color || "#C8A45C",
                    }}
                  >
                    <SendHorizontal size={20} />
                  </div>
                  <div>
                    <h2
                      className="text-lg sm:text-xl font-black"
                      style={{ color: sanitizeColor(styles.title_color, "var(--contact-title-color, var(--contact-title, var(--theme-primary)))") }}
                    >
                      {sections.form.title || "أرسل لنا رسالة"}
                    </h2>
                    {sections.form.subtitle && (
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: styles.text_color || "#E5E7EB", opacity: 0.8 }}
                      >
                        {sections.form.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Name field */}
                    {form_fields.name.visible && (
                      <div>
                        <label
                          className="block text-xs font-bold mb-1.5"
                          style={{ color: styles.text_color || "#E5E7EB" }}
                        >
                          {form_fields.name.label || "الاسم الكامل"}
                          {form_fields.name.required && (
                            <span style={{ color: styles.title_color || "#C8A45C" }}> *</span>
                          )}
                        </label>
                        <input
                          type="text"
                          required={form_fields.name.required}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={form_fields.name.placeholder || "أدخل اسمك الكامل"}
                          className="w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm placeholder-zinc-500 focus:outline-none transition shadow-inner border"
                          style={{
                            backgroundColor: `${styles.bg_color || "#1A1A1A"}EE`,
                            borderColor: `${styles.border_color || "#C8A45C"}30`,
                            color: styles.text_color || "#FFFFFF",
                          }}
                        />
                      </div>
                    )}

                    {/* Email field */}
                    {form_fields.email.visible && (
                      <div>
                        <label
                          className="block text-xs font-bold mb-1.5"
                          style={{ color: styles.text_color || "#E5E7EB" }}
                        >
                          {form_fields.email.label || "البريد الإلكتروني"}
                          {form_fields.email.required && (
                            <span style={{ color: styles.title_color || "#C8A45C" }}> *</span>
                          )}
                        </label>
                        <input
                          type="email"
                          required={form_fields.email.required}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={form_fields.email.placeholder || "name@example.com"}
                          className="w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm placeholder-zinc-500 focus:outline-none transition shadow-inner border"
                          style={{
                            backgroundColor: `${styles.bg_color || "#1A1A1A"}EE`,
                            borderColor: `${styles.border_color || "#C8A45C"}30`,
                            color: styles.text_color || "#FFFFFF",
                          }}
                          dir="ltr"
                        />
                      </div>
                    )}
                  </div>

                  {/* Subject field */}
                  {form_fields.subject.visible && (
                    <div>
                      <label
                        className="block text-xs font-bold mb-1.5"
                        style={{ color: styles.text_color || "#E5E7EB" }}
                      >
                        {form_fields.subject.label || "موضوع الرسالة"}
                        {form_fields.subject.required && (
                          <span style={{ color: styles.title_color || "#C8A45C" }}> *</span>
                        )}
                      </label>
                      {form_fields.subject.options && form_fields.subject.options.length > 0 ? (
                        <select
                          required={form_fields.subject.required}
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none transition cursor-pointer border"
                          style={{
                            backgroundColor: `${styles.bg_color || "#1A1A1A"}EE`,
                            borderColor: `${styles.border_color || "#C8A45C"}30`,
                            color: styles.text_color || "#FFFFFF",
                          }}
                        >
                          {form_fields.subject.options.map((opt) => (
                            <option
                              key={opt}
                              value={opt}
                              style={{ backgroundColor: "#2D2D2D", color: "#FFFFFF" }}
                            >
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          required={form_fields.subject.required}
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder={form_fields.subject.placeholder || "الموضوع..."}
                          className="w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm placeholder-zinc-500 focus:outline-none transition shadow-inner border"
                          style={{
                            backgroundColor: `${styles.bg_color || "#1A1A1A"}EE`,
                            borderColor: `${styles.border_color || "#C8A45C"}30`,
                            color: styles.text_color || "#FFFFFF",
                          }}
                        />
                      )}
                    </div>
                  )}

                  {/* Message field */}
                  {form_fields.message.visible && (
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label
                          className="block text-xs font-bold"
                          style={{ color: styles.text_color || "#E5E7EB" }}
                        >
                          {form_fields.message.label || "الرسالة"}
                          {form_fields.message.required && (
                            <span style={{ color: styles.title_color || "#C8A45C" }}> *</span>
                          )}
                        </label>
                        <span className="text-[11px] font-mono opacity-60">
                          {message.length} حرف
                        </span>
                      </div>
                      <textarea
                        required={form_fields.message.required}
                        rows={5}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={
                          form_fields.message.placeholder || "اكتب استفسارك بالتفصيل..."
                        }
                        className="w-full rounded-xl p-3.5 text-xs sm:text-sm placeholder-zinc-500 focus:outline-none transition resize-none shadow-inner border"
                        style={{
                          backgroundColor: `${styles.bg_color || "#1A1A1A"}EE`,
                          borderColor: `${styles.border_color || "#C8A45C"}30`,
                          color: styles.text_color || "#FFFFFF",
                        }}
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 font-black text-sm py-3.5 rounded-xl shadow-lg transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                    style={{
                      backgroundColor: styles.title_color || "var(--contact-button-color, var(--theme-primary, #C8A45C))",
                      color: styles.bg_color || "#1A1A1A",
                    }}
                  >
                    <Send size={16} className={submitting ? "animate-spin" : ""} />
                    <span>{submitting ? "جاري إرسال رسالتك..." : "إرسال الرسالة الآن"}</span>
                  </button>
                </form>
              </div>
            )}

            {/* Map Column (if visible) */}
            {sections.map.visible && (
              <div
                className="rounded-3xl p-6 shadow-xl space-y-4 border"
                style={{
                  backgroundColor: styles.card_bg || "var(--contact-card-color, var(--theme-card, #2D2D2D))",
                  borderColor: `${styles.border_color || "#C8A45C"}30`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border"
                    style={{
                      backgroundColor: `${styles.title_color || "#C8A45C"}20`,
                      borderColor: `${styles.border_color || "#C8A45C"}40`,
                      color: styles.title_color || "#C8A45C",
                    }}
                  >
                    <MapPin size={20} />
                  </div>
                  <h3
                    className="font-bold text-sm sm:text-base"
                    style={{ color: styles.title_color || "#C8A45C" }}
                  >
                    {sections.map.title || "موقعنا على الخريطة"}
                  </h3>
                </div>

                <div
                  className="rounded-2xl overflow-hidden border h-52 relative"
                  style={{
                    borderColor: `${styles.border_color || "#C8A45C"}30`,
                    backgroundColor: styles.bg_color || "#1A1A1A",
                  }}
                >
                  <iframe
                    title="Store Location"
                    src={
                      sections.map.embed_url ||
                      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d106456.40248232233!2d36.2166667!3d33.5138073!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1518e6dc413cc6a7%3A0x6b9f66ebd1e394f2!2sDamascus%2C%20Syria!5e0!3m2!1sen!2s!4v1650000000000!5m2!1sen!2s"
                    }
                    width="100%"
                    height="100%"
                    style={{
                      border: 0,
                      filter: "invert(90%) hue-rotate(180deg) brightness(85%) contrast(90%)",
                    }}
                    loading="lazy"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4️⃣ FAQ Section (if visible) */}
        {sections.faq.visible && sortedFaq.length > 0 && (
          <div
            className="rounded-3xl p-6 sm:p-8 shadow-2xl border"
            style={{
              backgroundColor: styles.card_bg || "var(--contact-card-color, var(--theme-card, #2D2D2D))",
              borderColor: `${styles.border_color || "#C8A45C"}30`,
            }}
          >
            <div
              className="flex items-center gap-3 mb-6 pb-4 border-b"
              style={{ borderColor: `${styles.border_color || "#C8A45C"}20` }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border"
                style={{
                  backgroundColor: `${styles.title_color || "#C8A45C"}20`,
                  borderColor: `${styles.border_color || "#C8A45C"}40`,
                  color: styles.title_color || "#C8A45C",
                }}
              >
                <HelpCircle size={20} />
              </div>
              <div>
                <h2
                  className="text-lg sm:text-xl font-black"
                  style={{ color: sanitizeColor(styles.title_color, "var(--contact-title-color, var(--contact-title, var(--theme-primary)))") }}
                >
                  {sections.faq.title || "الأسئلة الشائعة"}
                </h2>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: styles.text_color || "#E5E7EB", opacity: 0.8 }}
                >
                  إجابات سريعة ومباشرة على أبرز الاستفسارات الشائعة
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {sortedFaq.map((faq) => {
                const isOpen = openFaq === faq.id;

                return (
                  <div
                    key={faq.id}
                    className="rounded-2xl border transition-all duration-200 overflow-hidden"
                    style={{
                      backgroundColor: isOpen
                        ? `${styles.bg_color || "#1A1A1A"}FA`
                        : `${styles.bg_color || "#1A1A1A"}80`,
                      borderColor: isOpen
                        ? styles.border_color || "#C8A45C"
                        : `${styles.border_color || "#C8A45C"}25`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                      className="w-full p-4 sm:p-5 text-right flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <span
                        className="text-xs sm:text-sm font-bold transition-colors"
                        style={{
                          color: isOpen
                            ? styles.title_color || "#FDE68A"
                            : styles.text_color || "#FFFFFF",
                        }}
                      >
                        {faq.question}
                      </span>
                      <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border transition-transform"
                        style={{
                          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                          backgroundColor: isOpen
                            ? styles.title_color || "#C8A45C"
                            : `${styles.card_bg || "#2D2D2D"}`,
                          color: isOpen ? styles.bg_color || "#1A1A1A" : "#FFFFFF",
                          borderColor: `${styles.border_color || "#C8A45C"}40`,
                        }}
                      >
                        <ChevronDown size={16} />
                      </div>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div
                            className="px-4 pb-5 sm:px-5 text-xs sm:text-sm leading-relaxed border-t pt-3"
                            style={{
                              borderColor: `${styles.border_color || "#C8A45C"}15`,
                              color: styles.text_color || "#E5E7EB",
                              opacity: 0.9,
                            }}
                          >
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
