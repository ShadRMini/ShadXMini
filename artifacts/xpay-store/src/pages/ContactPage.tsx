import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  MessageCircle,
  Send,
  Mail,
  Phone,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Copy,
  Check,
  HelpCircle,
  ExternalLink,
  SendHorizontal,
  Headphones
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getPublicJson, apiRequest } from "@/lib/public-api";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

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

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_LIST: FAQItem[] = [
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

export default function ContactPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("استفسار عام");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Accordion state
  const [openFaq, setOpenFaq] = useState<string | null>("deposit");

  // Copy indicator state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Pre-fill user data if logged in
  useEffect(() => {
    if (user) {
      if (user.username && !name) setName(user.username);
      if (user.email && !email) setEmail(user.email);
    }
  }, [user]);

  // Load Store Settings
  useEffect(() => {
    let active = true;
    getPublicJson<PublicSettings>("/settings/public")
      .then((data) => {
        if (active && data) {
          setSettings(data);
        }
      })
      .catch((err) => {
        console.warn("Public settings load fallback:", err);
      })
      .finally(() => {
        if (active) setLoadingSettings(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const whatsappRaw =
    settings?.support_whatsapp || settings?.contact_whatsapp || "+963900000000";
  const telegramRaw =
    settings?.support_telegram || settings?.contact_telegram || "ShadMiniSupport";
  const emailRaw =
    settings?.support_email || settings?.contact_email || "support@shadmini.com";
  const phoneRaw =
    settings?.support_phone || settings?.contact_phone || "+963900000000";

  // Clean URLs
  const cleanWhatsapp = whatsappRaw.replace(/[^0-9]/g, "");
  const cleanTelegram = telegramRaw.replace(/^@/, "");

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("تم النسخ إلى الحافظة");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("يرجى إدخال الاسم الكامل");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("يرجى إدخال بريد إلكتروني صالح");
      return;
    }
    if (!subject.trim()) {
      toast.error("يرجى اختيار موضوع الرسالة");
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      toast.error("يرجى كتابة رسالة توضيحية لا تقل عن 10 أحرف");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest("/public/contact-messages", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      toast.success("تم إرسال رسالتك بنجاح! سنرد عليك في أقرب وقت.");
      setMessage("");
      if (!user) {
        setName("");
        setEmail("");
      }
    } catch (err: any) {
      console.error("Failed to send contact message:", err);
      toast.error(err.message || "حدث خطأ أثناء الإرسال، يرجى المحاولة لاحقاً");
    } finally {
      setSubmitting(false);
    }
  };

  const contactCards = [
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
      className="min-h-screen bg-[#1A1A1A] text-white pb-24 p-4 max-w-5xl mx-auto selection:bg-[#C8A45C] selection:text-black space-y-8"
      dir="rtl"
    >
      {/* 1️⃣ Header */}
      <div className="text-center pt-4 pb-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-[#2D2D2D] border border-[#C8A45C]/40 shadow-xl shadow-[#C8A45C]/10 mb-4 text-[#C8A45C]">
          <Headphones size={32} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#C8A45C] mb-2 tracking-wide">
          تواصل معنا
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
          نحن هنا لمساعدتك والإجابة على كافة استفساراتك. اختر القناة الأنسب لك أو أرسل لنا رسالة مباشرة.
        </p>
      </div>

      {/* 2️⃣ Contact Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {contactCards.map((card) => {
          const Icon = card.icon;
          const isCopied = copiedKey === card.key;

          return (
            <motion.div
              key={card.key}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="bg-[#2D2D2D] border border-[#C8A45C]/20 hover:border-[#C8A45C]/60 rounded-3xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden group"
            >
              {/* Subtle top-right glow */}
              <div
                className={`absolute -top-12 -left-12 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity ${card.bgGlow}`}
              />

              <div>
                {/* Channel Icon */}
                <div
                  className={`w-12 h-12 rounded-2xl bg-[#1A1A1A] border ${card.borderColor} flex items-center justify-center mb-4 shadow-md group-hover:scale-105 transition-transform`}
                >
                  <Icon size={24} className={card.iconColor} />
                </div>

                <h3 className="text-base font-bold text-white mb-1 group-hover:text-[#FDE68A] transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-zinc-400 mb-3">{card.subtitle}</p>

                {/* Display Value with Copy */}
                <div className="flex items-center justify-between bg-[#1A1A1A] px-3 py-2 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-300 mb-4">
                  <span className="truncate" dir="ltr">
                    {card.value}
                  </span>
                  <button
                    onClick={() => handleCopy(card.value, card.key)}
                    className="text-zinc-500 hover:text-[#C8A45C] transition p-1 cursor-pointer"
                    title="نسخ"
                    aria-label="نسخ"
                  >
                    {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Action Button */}
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

      {/* 3️⃣ Contact Form & Work Hours Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Contact Form (2 columns on large screen) */}
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
              {/* Full Name */}
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

              {/* Email */}
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

            {/* Subject Select */}
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

            {/* Message Textarea */}
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

            {/* Submit Button */}
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

        {/* Info & Work Hours Card (1 column on large screen) */}
        <div className="space-y-4">
          {/* Work Hours */}
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
              <div className="flex justify-between items-center text-zinc-400 text-[11px] pt-1 border-t border-zinc-800">
                <span>التوقيت المحلي:</span>
                <span>توقيت دمشق (GMT+3)</span>
              </div>
            </div>
          </div>

          {/* Location & Map Card */}
          <div className="bg-[#2D2D2D] border border-[#C8A45C]/20 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#C8A45C]/15 border border-[#C8A45C]/30 flex items-center justify-center text-[#C8A45C]">
                <MapPin size={20} />
              </div>
              <h3 className="font-bold text-white text-sm sm:text-base">المقر والخدمة الرقمية</h3>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              خدماتنا الرقمية متوفرة على مدار الساعة لجميع العملاء في مختلف المحافظات والدول.
            </p>

            {/* Stylized Google Maps Frame */}
            <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-[#1A1A1A] h-36 relative">
              <iframe
                title="Store Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d106456.40248232233!2d36.2166667!3d33.5138073!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1518e6dc413cc6a7%3A0x6b9f66ebd1e394f2!2sDamascus%2C%20Syria!5e0!3m2!1sen!2s!4v1650000000000!5m2!1sen!2s"
                width="100%"
                height="100%"
                style={{ border: 0, filter: "invert(90%) hue-rotate(180deg) brightness(85%) contrast(90%)" }}
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4️⃣ Frequently Asked Questions (FAQ) */}
      <div className="bg-[#2D2D2D] border border-[#C8A45C]/25 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 border-b border-zinc-800/80 pb-4">
          <div className="w-10 h-10 rounded-xl bg-[#C8A45C]/15 border border-[#C8A45C]/40 flex items-center justify-center text-[#C8A45C]">
            <HelpCircle size={20} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#FDE68A]">
              الأسئلة الشائعة
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              إجابات سريعة على أبرز الاستفسارات التي يطرحها عملاؤنا الكرام.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {FAQ_LIST.map((faq) => {
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
