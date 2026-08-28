import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2,
  Plus,
  Search,
  ExternalLink,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  RefreshCw,
  Download,
  Sparkles,
  Eye,
  GripVertical,
  X,
  Send,
  Phone,
  MessageCircle,
  Globe,
  Radio,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import {
  FaTelegramPlane,
  FaWhatsapp,
  FaFacebookF,
  FaInstagram,
  FaYoutube,
  FaTwitter,
  FaTiktok,
  FaDiscord,
  FaLinkedinIn,
  FaSnapchatGhost,
  FaEnvelope
} from "react-icons/fa";

interface SocialLinkItem {
  id: number;
  platform: string;
  label: string;
  url: string;
  order: number;
  active?: boolean;
}

const PLATFORM_CONFIG: Record<
  string,
  {
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    borderColor: string;
    placeholder: string;
    defaultLabel: string;
  }
> = {
  telegram: {
    name: "تيليجرام",
    icon: FaTelegramPlane,
    color: "#229ED9",
    bgColor: "rgba(34, 158, 217, 0.12)",
    borderColor: "rgba(34, 158, 217, 0.3)",
    placeholder: "https://t.me/your_channel",
    defaultLabel: "قناة تيليجرام الرسمية",
  },
  whatsapp: {
    name: "واتساب",
    icon: FaWhatsapp,
    color: "#25D366",
    bgColor: "rgba(37, 211, 102, 0.12)",
    borderColor: "rgba(37, 211, 102, 0.3)",
    placeholder: "https://wa.me/963900000000",
    defaultLabel: "دعم الواتساب المباشر",
  },
  instagram: {
    name: "انستغرام",
    icon: FaInstagram,
    color: "#E1306C",
    bgColor: "rgba(225, 48, 108, 0.12)",
    borderColor: "rgba(225, 48, 108, 0.3)",
    placeholder: "https://instagram.com/your_account",
    defaultLabel: "حساب الانستغرام",
  },
  facebook: {
    name: "فيسبوك",
    icon: FaFacebookF,
    color: "#1877F2",
    bgColor: "rgba(24, 119, 242, 0.12)",
    borderColor: "rgba(24, 119, 242, 0.3)",
    placeholder: "https://facebook.com/your_page",
    defaultLabel: "صفحة الفيسبوك",
  },
  youtube: {
    name: "يوتيوب",
    icon: FaYoutube,
    color: "#FF0000",
    bgColor: "rgba(255, 0, 0, 0.12)",
    borderColor: "rgba(255, 0, 0, 0.3)",
    placeholder: "https://youtube.com/@channel",
    defaultLabel: "قناة اليوتيوب",
  },
  phone: {
    name: "هاتف",
    icon: Phone,
    color: "#C8A45C",
    bgColor: "rgba(200, 164, 92, 0.12)",
    borderColor: "rgba(200, 164, 92, 0.3)",
    placeholder: "tel:+963900000000",
    defaultLabel: "رقم الخدمة والاتصال",
  },
  x: {
    name: "إكس (تويتر)",
    icon: FaTwitter,
    color: "#1DA1F2",
    bgColor: "rgba(29, 161, 242, 0.12)",
    borderColor: "rgba(29, 161, 242, 0.3)",
    placeholder: "https://x.com/your_handle",
    defaultLabel: "حساب إكس الرسمي",
  },
  tiktok: {
    name: "تيك توك",
    icon: FaTiktok,
    color: "#EE1D52",
    bgColor: "rgba(238, 29, 82, 0.12)",
    borderColor: "rgba(238, 29, 82, 0.3)",
    placeholder: "https://tiktok.com/@username",
    defaultLabel: "تيك توك الرسمية",
  },
  discord: {
    name: "ديسكورد",
    icon: FaDiscord,
    color: "#5865F2",
    bgColor: "rgba(88, 101, 242, 0.12)",
    borderColor: "rgba(88, 101, 242, 0.3)",
    placeholder: "https://discord.gg/invite",
    defaultLabel: "مجتمع ديسكورد",
  },
  email: {
    name: "البريد الإلكتروني",
    icon: FaEnvelope,
    color: "#EA4335",
    bgColor: "rgba(234, 67, 53, 0.12)",
    borderColor: "rgba(234, 67, 53, 0.3)",
    placeholder: "mailto:support@example.com",
    defaultLabel: "البريد الإلكتروني للدعم",
  },
  website: {
    name: "موقع ويب",
    icon: Globe,
    color: "#10B981",
    bgColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    placeholder: "https://example.com",
    defaultLabel: "الموقع الإلكتروني",
  },
};

const DEFAULT_RECOMMENDED_LINKS = [
  { platform: "telegram", label: "قناة التحديثات والمعروضات", url: "https://t.me/shadx_official", order: 1 },
  { platform: "whatsapp", label: "خدمة العملاء الفورية", url: "https://wa.me/963900000000", order: 2 },
  { platform: "instagram", label: "الانستغرام - العروض واليوميات", url: "https://instagram.com/shadx_official", order: 3 },
  { platform: "phone", label: "الخط الساخن المباشر", url: "tel:+963900000000", order: 4 },
];

export default function SocialLinksNew() {
  const [links, setLinks] = useState<SocialLinkItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<SocialLinkItem | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(true);

  // Form states
  const [formData, setFormData] = useState({
    platform: "telegram",
    label: "",
    url: "",
    order: 0,
  });

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/social-links");
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.data || [];
        const formatted = items.map((item: any) => ({
          id: Number(item.id),
          platform: String(item.platform || "telegram").toLowerCase(),
          label: String(item.label || ""),
          url: String(item.url || ""),
          order: Number(item.order || 0),
        }));
        // Sort by order ascending
        formatted.sort((a: SocialLinkItem, b: SocialLinkItem) => a.order - b.order);
        setLinks(formatted);
      } else {
        showToast("تعذر جلب الروابط الاجتماعية", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ في الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    const platform = "telegram";
    const cfg = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.telegram;
    setFormData({
      platform,
      label: cfg.defaultLabel,
      url: cfg.placeholder,
      order: links.length > 0 ? Math.max(...links.map((l) => l.order)) + 1 : 1,
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (item: SocialLinkItem) => {
    setEditingItem(item);
    setFormData({
      platform: item.platform,
      label: item.label,
      url: item.url,
      order: item.order,
    });
    setShowModal(true);
  };

  const handlePlatformChange = (p: string) => {
    const cfg = PLATFORM_CONFIG[p] || PLATFORM_CONFIG.telegram;
    setFormData((prev) => ({
      ...prev,
      platform: p,
      // If label was standard default or empty, set platform's default label
      label: !prev.label || Object.values(PLATFORM_CONFIG).some((c) => c.defaultLabel === prev.label) ? cfg.defaultLabel : prev.label,
      url: !prev.url || Object.values(PLATFORM_CONFIG).some((c) => c.placeholder === prev.url) ? cfg.placeholder : prev.url,
    }));
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label.trim()) {
      showToast("يرجى كتابة الاسم الظاهر للرابط", "error");
      return;
    }
    if (!formData.url.trim()) {
      showToast("يرجى ادخال الرابط", "error");
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        // PUT update
        const res = await fetch(`/api/admin/social-links/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          showToast("تم تحديث الرابط بنجاح");
          setShowModal(false);
          fetchLinks();
        } else {
          showToast("فشل تحديث الرابط", "error");
        }
      } else {
        // POST create
        const res = await fetch("/api/admin/social-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          showToast("تم إضافة الرابط بنجاح");
          setShowModal(false);
          fetchLinks();
        } else {
          showToast("فشل إضافة الرابط", "error");
        }
      }
    } catch (err) {
      showToast("حدث خطأ أثناء الحفظ", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, label: string) => {
    if (!window.confirm(`هل أنت تأكد من حذف الرابط "${label}"؟`)) return;
    try {
      const res = await fetch(`/api/admin/social-links/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("تم حذف الرابط بنجاح");
        setLinks((prev) => prev.filter((l) => l.id !== id));
      } else {
        showToast("فشل حذف الرابط", "error");
      }
    } catch (err) {
      showToast("حدث خطأ أثناء الحذف", "error");
    }
  };

  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= links.length) return;

    const updated = [...links];
    // Swap items
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;

    // Recalculate orders
    const reorderedItems = updated.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    setLinks(reorderedItems);

    // Send backend patch for reorder
    try {
      await fetch("/api/admin/social-links/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: reorderedItems.map((item) => ({ id: item.id, order: item.order })),
        }),
      });
      showToast("تم إعادة الترتيب وحفظ التغييرات");
    } catch (err) {
      showToast("حدث خطأ أثناء إعادة الترتيب", "error");
    }
  };

  const handleAutoSort = async () => {
    if (links.length === 0) return;
    const sorted = [...links].sort((a, b) => a.platform.localeCompare(b.platform));
    const reordered = sorted.map((item, idx) => ({ ...item, order: idx + 1 }));
    setLinks(reordered);

    try {
      await fetch("/api/admin/social-links/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: reordered.map((item) => ({ id: item.id, order: item.order })),
        }),
      });
      showToast("تم الترتيب حسب المنصة بنجاح");
    } catch (err) {
      showToast("حدث خطأ في الترتيب الأوتوماتيكي", "error");
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm("هل تريد إضافة الروابط الافتراضية الموصى بها لموقعك؟")) return;
    setSaving(true);
    try {
      for (const item of DEFAULT_RECOMMENDED_LINKS) {
        await fetch("/api/admin/social-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
      }
      showToast("تم استعادة الروابط الافتراضية بنجاح");
      fetchLinks();
    } catch (err) {
      showToast("حدث خطأ أثناء استعادة الافتراضيات", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(links, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `social_links_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("تم تصدير الروابط بنجاح");
  };

  const handleCopyUrl = (id: number, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    showToast("تم نسخ الرابط إلى الحافظة");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered links
  const filteredLinks = links.filter((item) => {
    const matchesSearch =
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.platform.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedCategory === "all") return matchesSearch;
    if (selectedCategory === "social") return matchesSearch && ["instagram", "facebook", "youtube", "tiktok", "x"].includes(item.platform);
    if (selectedCategory === "messaging") return matchesSearch && ["telegram", "whatsapp", "discord"].includes(item.platform);
    if (selectedCategory === "direct") return matchesSearch && ["phone", "email", "website"].includes(item.platform);

    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0E0E10] text-gray-100 p-4 md:p-8 font-sans transition-colors duration-300" dir="rtl">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border shadow-2xl backdrop-blur-xl ${
              toastMessage.type === "error"
                ? "bg-red-950/90 border-red-500/50 text-red-200"
                : "bg-amber-950/90 border-amber-500/50 text-amber-200"
            }`}
          >
            {toastMessage.type === "error" ? (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Title Section */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-zinc-900/90 via-[#161410] to-zinc-950 p-6 md:p-8 shadow-2xl backdrop-blur-md">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-600/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>إدارة القنوات والتواصل الفاخرة (Dark & Gold)</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100">
                إدارة الروابط الاجتماعية
              </h1>
              <p className="text-zinc-400 text-sm max-w-2xl leading-relaxed">
                تحكم بالروابط المباشرة، قنوات التواصل، وحسابات التواصل الاجتماعي التي تظهر للعملاء في واجهة المتجر ومُختلف أجزائه.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all border ${
                  showPreview
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10"
                    : "bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:border-zinc-600"
                }`}
              >
                <Eye className="w-4 h-4 text-amber-400" />
                <span>{showPreview ? "إخفاء المعاينة" : "معاينة المظهر"}</span>
              </button>

              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-zinc-950 font-bold text-xs md:text-sm shadow-xl shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>إضافة رابط جديد</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-amber-500/10">
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-medium">إجمالي الروابط</p>
                <p className="text-xl font-bold text-amber-100">{links.length}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-medium">قنوات المراسلة</p>
                <p className="text-xl font-bold text-blue-200">
                  {links.filter((l) => ["telegram", "whatsapp", "discord"].includes(l.platform)).length}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-medium">شبكات التواصل</p>
                <p className="text-xl font-bold text-pink-200">
                  {links.filter((l) => ["instagram", "facebook", "youtube", "tiktok", "x"].includes(l.platform)).length}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-medium">تواصل مباشر</p>
                <p className="text-xl font-bold text-emerald-200">
                  {links.filter((l) => ["phone", "email", "website"].includes(l.platform)).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Storefront Preview Drawer / Bar */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-zinc-950 p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <h3 className="text-sm font-semibold text-amber-300">معاينة حيّة لكيفية ظهور الروابط للزوار</h3>
                  </div>
                  <span className="text-xs text-zinc-500">يتأثر الترتيب أوتوماتيكياً بالتعديلات</span>
                </div>

                {links.length === 0 ? (
                  <div className="text-center py-4 text-xs text-zinc-500">لا توجد روابط حالية للمعاينة</div>
                ) : (
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    {links.map((item) => {
                      const cfg = PLATFORM_CONFIG[item.platform] || PLATFORM_CONFIG.website;
                      const IconComp = cfg.icon;
                      return (
                        <a
                          key={item.id}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group flex items-center gap-2.5 px-4 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700/60 hover:border-amber-500/50 transition-all hover:scale-105 active:scale-95"
                          style={{
                            borderColor: cfg.borderColor,
                          }}
                        >
                          <div
                            className="p-1.5 rounded-lg text-white transition-transform group-hover:scale-110"
                            style={{ backgroundColor: cfg.color }}
                          >
                            <IconComp className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-medium text-zinc-200 group-hover:text-amber-200">
                            {item.label}
                          </span>
                          <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-amber-400 transition-colors" />
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toolbar & Filters */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-md">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم الظاهر، المنصة، أو الرابط..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs md:text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {[
              { id: "all", label: "الكل" },
              { id: "messaging", label: "مراسلة" },
              { id: "social", label: "سوشيال" },
              { id: "direct", label: "مباشر" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-zinc-800/50 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Actions Toolbar */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <button
              onClick={handleAutoSort}
              title="ترتيب حسب اسم المنصة"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 text-xs font-medium hover:border-amber-500/40 hover:text-amber-200 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">ترتيب أبجدي</span>
            </button>

            <button
              onClick={handleExportJSON}
              title="تصدير ملف JSON"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 text-xs font-medium hover:border-amber-500/40 hover:text-amber-200 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">تصدير</span>
            </button>

            <button
              onClick={handleResetDefaults}
              title="إعادة تعيين الروابط الموصى بها"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 text-xs font-medium hover:border-amber-500/40 hover:text-amber-200 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">الموصى به</span>
            </button>
          </div>
        </div>

        {/* Content Section: Cards Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
            <p className="text-xs text-zinc-400 animate-pulse">جاري تحميل الروابط الاجتماعية...</p>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/40 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Share2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-zinc-200">لا توجد روابط نتائج مطابقة</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                لم يتم العثور على أي رابط بمحددات البحث أو لم بقم بإضافة أي روابط اجتماعية بعد.
              </p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 hover:brightness-110"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة أول رابط الآن</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {filteredLinks.map((item, index) => {
                const cfg = PLATFORM_CONFIG[item.platform] || PLATFORM_CONFIG.website;
                const IconComp = cfg.icon;

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="group relative rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-5 shadow-xl hover:border-amber-500/40 transition-all hover:shadow-amber-500/5 flex flex-col justify-between"
                  >
                    {/* Top Card Header */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105"
                            style={{ backgroundColor: cfg.color }}
                          >
                            <IconComp className="w-5 h-5" />
                          </div>

                          <div>
                            <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 block">
                              {cfg.name}
                            </span>
                            <h3 className="text-sm font-bold text-amber-100 line-clamp-1">{item.label}</h3>
                          </div>
                        </div>

                        {/* Order Badge & Move Buttons */}
                        <div className="flex items-center gap-1.5 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800">
                          <span className="text-[11px] font-mono font-bold text-amber-400 px-2">#{item.order}</span>

                          <div className="flex flex-col gap-0.5 border-r border-zinc-800 pr-1">
                            <button
                              disabled={index === 0}
                              onClick={() => handleMoveOrder(index, "up")}
                              className="text-zinc-500 hover:text-amber-400 disabled:opacity-30 disabled:hover:text-zinc-500 p-0.5 transition-colors"
                              title="تحريك لأعلى"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              disabled={index === filteredLinks.length - 1}
                              onClick={() => handleMoveOrder(index, "down")}
                              className="text-zinc-500 hover:text-amber-400 disabled:opacity-30 disabled:hover:text-zinc-500 p-0.5 transition-colors"
                              title="تحريك لأسفل"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* URL Box */}
                      <div className="p-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800/80 flex items-center justify-between gap-2 group-hover:border-zinc-700/80 transition-colors">
                        <span className="text-xs font-mono text-zinc-400 truncate flex-1 dir-ltr text-left">
                          {item.url}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleCopyUrl(item.id, item.url)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 transition-all"
                            title="نسخ الرابط"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 transition-all"
                            title="اختبار الرابط"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-800/60">
                      <span className="text-[11px] text-zinc-500 font-medium">النشاط: مفعل</span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20 text-xs font-semibold transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>

                        <button
                          onClick={() => handleDelete(item.id, item.label)}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-xs transition-all"
                          title="حذف الرابط"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg rounded-3xl border border-amber-500/30 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    {editingItem ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-amber-200">
                      {editingItem ? "تعديل الرابط الاجتماعي" : "إضافة رابط جديد"}
                    </h2>
                    <p className="text-xs text-zinc-400">حدد المنصة وتفاصيل التوجيه المباشر</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveModal} className="space-y-4">
                {/* Platform Selector Grid */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-300 block">اختر المنصة / نوع الرابط</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 scrollbar-thin">
                    {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => {
                      const IconComp = cfg.icon;
                      const isSelected = formData.platform === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handlePlatformChange(key)}
                          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-all ${
                            isSelected
                              ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10"
                              : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                          }`}
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: cfg.color }}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-medium leading-tight">{cfg.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Display Label Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">الاسم الظاهر للعملاء</label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="مثال: قناة التيليجرام الرسمية"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                {/* URL Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">الرابط المباشر (URL / Protocol)</label>
                  <input
                    type="text"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder={PLATFORM_CONFIG[formData.platform]?.placeholder || "https://..."}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:border-amber-500/60 dir-ltr text-left"
                  />
                </div>

                {/* Order Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">رقم الترتيب</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 font-mono focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 font-medium text-xs hover:bg-zinc-700 transition-colors"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 hover:brightness-110 disabled:opacity-50 transition-all"
                  >
                    {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>{editingItem ? "حفظ التعديلات" : "إضافة الرابط"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
