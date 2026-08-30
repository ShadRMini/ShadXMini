import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
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
  X,
  Star,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  UploadCloud,
  Layers,
  Tag,
  Link as LinkIcon
} from "lucide-react";
import { get, post, put, patch, del } from "../lib/api";

interface BannerItem {
  id: number;
  image: string;
  title: string;
  description?: string;
  link?: string;
  order: number;
  active: boolean;
  featured: boolean;
  createdAt?: string;
}

export default function BannersNew() {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<BannerItem | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showLivePreview, setShowLivePreview] = useState<boolean>(true);

  // Global store setting state
  const [showFeaturedInStore, setShowFeaturedInStore] = useState<boolean>(true);
  const [togglingStoreSetting, setTogglingStoreSetting] = useState<boolean>(false);

  // Form states
  const [formData, setFormData] = useState({
    image: "",
    title: "",
    description: "",
    link: "",
    order: 0,
    active: true,
    featured: false,
  });

  const showToast = useCallback((text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Fetch Banners and Store Setting
  const fetchBannersAndSettings = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Banners
      const data = await get<any>("/admin/banners");
      const items = Array.isArray(data) ? data : data.data || [];
      const formatted: BannerItem[] = items.map((item: any) => ({
        id: Number(item.id),
        image: String(item.image || ""),
        title: String(item.title || ""),
        description: String(item.description || ""),
        link: String(item.link || ""),
        order: Number(item.order || 0),
        active: item.active !== undefined ? Boolean(item.active) : true,
        featured: Boolean(item.featured),
      }));
      formatted.sort((a, b) => a.order - b.order);
      setBanners(formatted);

      // 2. Fetch Store Featured Setting
      try {
        const settingData = await get<any>("/admin/settings/show-featured-offers");
        if (settingData && settingData.value !== undefined) {
          setShowFeaturedInStore(settingData.value === "true" || settingData.value === true);
        }
      } catch (sErr) {
        console.warn("[Banners] Non-critical: Could not fetch show-featured-offers setting:", sErr);
      }
    } catch (err: any) {
      console.error("[Banners] Error fetching banners:", err);
      showToast(err?.message || "حدث خطأ في الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchBannersAndSettings();
  }, [fetchBannersAndSettings]);

  // Toggle Show Featured Offers in Store
  const handleToggleStoreFeaturedSetting = async () => {
    setTogglingStoreSetting(true);
    const newValue = !showFeaturedInStore;
    setShowFeaturedInStore(newValue);

    try {
      await put("/admin/settings/show-featured-offers", { value: String(newValue) });
      showToast(
        newValue ? "تم تفعيل عرض العروض المميزة في المتجر" : "تم تعطيل قسم العروض المميزة في المتجر"
      );
    } catch (err: any) {
      console.error("[Banners] Toggle setting error:", err);
      setShowFeaturedInStore(!newValue); // Revert
      showToast(err?.message || "فشل تحديث إعدادات المتجر", "error");
    } finally {
      setTogglingStoreSetting(false);
    }
  };

  // Open Modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80",
      title: "عرض حصري جديد",
      description: "احصل على خصم مميز لفترة محدودة على جميع الخدمات الرقمية.",
      link: "/deposit",
      order: banners.length > 0 ? Math.max(...banners.map((b) => b.order)) + 1 : 1,
      active: true,
      featured: false,
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (item: BannerItem) => {
    setEditingItem(item);
    setFormData({
      image: item.image,
      title: item.title,
      description: item.description || "",
      link: item.link || "",
      order: item.order,
      active: item.active,
      featured: item.featured,
    });
    setShowModal(true);
  };

  // Save Modal Form
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast("يرجى كتابة عنوان البانر", "error");
      return;
    }
    if (!formData.image.trim()) {
      showToast("يرجى إدخال رابط الصورة", "error");
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        // PUT update
        await put(`/admin/banners/${editingItem.id}`, formData);
        showToast("تم تحديث البانر بنجاح");
        setShowModal(false);
        fetchBannersAndSettings();
      } else {
        // POST create
        await post("/admin/banners", formData);
        showToast("تم إضافة البانر بنجاح");
        setShowModal(false);
        fetchBannersAndSettings();
      }
    } catch (err: any) {
      console.error("[Banners] Save error:", err);
      showToast(err?.message || "حدث خطأ أثناء الحفظ", "error");
    } finally {
      setSaving(false);
    }
  };

  // Delete Banner
  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`هل أنت تأكد من حذف البانر "${title}"؟`)) return;
    try {
      await del(`/admin/banners/${id}`);
      showToast("تم حذف البانر بنجاح");
      setBanners((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      console.error("[Banners] Delete error:", err);
      showToast(err?.message || "فشل حذف البانر", "error");
    }
  };

  // Toggle Active Optimistically
  const handleToggleActive = async (id: number) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, active: !b.active } : b))
    );

    try {
      await patch(`/admin/banners/${id}/toggle-active`, {});
      showToast("تم تغيير حالة البانر بنجاح");
    } catch (err: any) {
      console.error("[Banners] Toggle active error:", err);
      // revert on failure
      setBanners((prev) =>
        prev.map((b) => (b.id === id ? { ...b, active: !b.active } : b))
      );
      showToast(err?.message || "فشل تحديث حالة البانر", "error");
    }
  };

  // Toggle Featured Optimistically
  const handleToggleFeatured = async (id: number) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, featured: !b.featured } : b))
    );

    try {
      await patch(`/admin/banners/${id}/toggle-featured`, {});
      showToast("تم تغيير حالة العرض المميز بنجاح");
    } catch (err: any) {
      console.error("[Banners] Toggle featured error:", err);
      // revert
      setBanners((prev) =>
        prev.map((b) => (b.id === id ? { ...b, featured: !b.featured } : b))
      );
      showToast(err?.message || "فشل تمييز العرض", "error");
    }
  };

  // Move Order
  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= banners.length) return;

    const updated = [...banners];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;

    const reorderedItems = updated.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    setBanners(reorderedItems);

    try {
      await patch("/admin/banners/reorder", {
        items: reorderedItems.map((b) => ({ id: b.id, order: b.order })),
      });
      showToast("تم تحديث ترتيب البانرات بنجاح");
    } catch (err: any) {
      console.error("[Banners] Reorder error:", err);
      showToast(err?.message || "حدث خطأ أثناء إعادة الترتيب", "error");
    }
  };

  // Auto Sort
  const handleAutoSort = async () => {
    if (banners.length === 0) return;
    const sorted = [...banners].sort((a, b) => a.title.localeCompare(b.title));
    const reordered = sorted.map((b, idx) => ({ ...b, order: idx + 1 }));
    setBanners(reordered);

    try {
      await patch("/admin/banners/reorder", {
        items: reordered.map((b) => ({ id: b.id, order: b.order })),
      });
      showToast("تم ترتيب البانرات أوتوماتيكياً حسب العنوان");
    } catch (err: any) {
      console.error("[Banners] Auto-sort error:", err);
      showToast(err?.message || "حدث خطأ أثناء الترتيب", "error");
    }
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(banners, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `banners_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("تم تصدير البانرات والعروض بنجاح");
  };

  // Copy Link
  const handleCopyLink = (id: number, link: string) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    showToast("تم نسخ الرابط للحافظة");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered Banners
  const filteredBanners = useMemo(() => {
    return banners.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.link && item.link.toLowerCase().includes(searchQuery.toLowerCase()));

      if (selectedFilter === "all") return matchesSearch;
      if (selectedFilter === "active") return matchesSearch && item.active;
      if (selectedFilter === "featured") return matchesSearch && item.featured;
      if (selectedFilter === "inactive") return matchesSearch && !item.active;

      return matchesSearch;
    });
  }, [banners, searchQuery, selectedFilter]);

  // Primary active banner for preview
  const primaryBanner = useMemo(() => {
    return banners.find((b) => b.active) || banners[0] || null;
  }, [banners]);

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

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Title & Banner Dashboard */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-zinc-900/90 via-[#181510] to-zinc-950 p-6 md:p-8 shadow-2xl backdrop-blur-md">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-600/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>إدارة البانرات والعروض الفاخرة (Dark & Gold)</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100">
                إدارة البانر والعروض المميزة
              </h1>
              <p className="text-zinc-400 text-sm max-w-2xl leading-relaxed">
                أنشئ بانرات واجهة المتجر، وخصّص قسم العروض المميزة، مع إمكانية المعاينة الحية وإعادة الترتيب التفاعلي.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto">
              <button
                onClick={() => setShowLivePreview(!showLivePreview)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all border ${
                  showLivePreview
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10"
                    : "bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:border-zinc-600"
                }`}
              >
                <Eye className="w-4 h-4 text-amber-400" />
                <span>{showLivePreview ? "إخفاء المعاينة الحية" : "المعاينة الحية"}</span>
              </button>

              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-zinc-950 font-bold text-xs md:text-sm shadow-xl shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>إضافة بانر جديد</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-amber-500/10">
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-medium">إجمالي البانرات</p>
                <p className="text-xl font-bold text-amber-100">{banners.length}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-medium">البانرات النشطة</p>
                <p className="text-xl font-bold text-emerald-200">
                  {banners.filter((b) => b.active).length}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-300">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-medium">العروض المميزة</p>
                <p className="text-xl font-bold text-amber-200">
                  {banners.filter((b) => b.featured).length}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-medium">قسم العروض بالمتجر</p>
                <p className={`text-sm font-bold ${showFeaturedInStore ? "text-emerald-400" : "text-zinc-500"}`}>
                  {showFeaturedInStore ? "مفعل بالمتجر" : "معطل بالمتجر"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Storefront Banner Preview */}
        <AnimatePresence>
          {showLivePreview && primaryBanner && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden space-y-2"
            >
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    معاينة حية للمتجر (Storefront Hero Preview)
                  </h3>
                </div>
                <span className="text-[11px] text-zinc-500">العرض الرئيسي الحالي للزوار</span>
              </div>

              <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 bg-zinc-950 aspect-[21/9] sm:aspect-[25/8] max-h-72 shadow-2xl group">
                <img
                  src={primaryBanner.image}
                  alt={primaryBanner.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/25 to-transparent flex flex-col justify-end p-6 sm:p-8">
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
                        {primaryBanner.featured ? "عرض مميز 🔥" : "بانر رئيسي"}
                      </span>
                      <span className="text-xs text-zinc-400">ترتيب #{primaryBanner.order}</span>
                    </div>
                    <h2 className="text-xl sm:text-3xl font-black text-amber-100 leading-tight">
                      {primaryBanner.title}
                    </h2>
                    {primaryBanner.description && (
                      <p className="text-xs sm:text-sm text-zinc-300 line-clamp-2 leading-relaxed">
                        {primaryBanner.description}
                      </p>
                    )}
                    {primaryBanner.link && (
                      <div className="pt-2">
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-500/20">
                          <span>استكشف الآن</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toolbar & Filters Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-md">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالعنوان، الوصف، أو الرابط..."
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

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {[
              { id: "all", label: "الكل" },
              { id: "active", label: "النشطة" },
              { id: "featured", label: "المميزة ⭐" },
              { id: "inactive", label: "المعطلة" },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedFilter === filter.id
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-zinc-800/50 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Actions & Global Store Feature Switch */}
          <div className="flex items-center gap-3 shrink-0 self-end lg:self-auto">
            {/* Store Featured Offers Global Toggle */}
            <button
              onClick={handleToggleStoreFeaturedSetting}
              disabled={togglingStoreSetting}
              title="تفعيل/تعطيل قسم العروض المميزة في واجهة المتجر الرئيسية"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                showFeaturedInStore
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40 shadow-sm"
                  : "bg-zinc-800/80 text-zinc-400 border-zinc-700/60"
              }`}
            >
              {showFeaturedInStore ? (
                <ToggleRight className="w-5 h-5 text-emerald-400" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-zinc-500" />
              )}
              <span>قسم العروض المميزة بالمتجر</span>
            </button>

            <button
              onClick={handleAutoSort}
              title="ترتيب البانرات أوتوماتيكياً"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 text-xs font-medium hover:border-amber-500/40 hover:text-amber-200 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">ترتيب أبجدي</span>
            </button>

            <button
              onClick={handleExportJSON}
              title="تصدير البانرات إلى JSON"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 text-xs font-medium hover:border-amber-500/40 hover:text-amber-200 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">تصدير</span>
            </button>
          </div>
        </div>

        {/* Content Section: Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-4 animate-pulse">
                <div className="w-full h-40 bg-zinc-800 rounded-xl" />
                <div className="h-4 bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-800 rounded w-1/2" />
                <div className="h-8 bg-zinc-800 rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredBanners.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/40 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ImageIcon className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-zinc-200">لا توجد بانرات مطابقة</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                لم يتم العثور على نتائج للبحث المحدد أو لم تقم بإنشاء أي بانرات بعد.
              </p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 hover:brightness-110"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة أول بانر الآن</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredBanners.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`group relative rounded-2xl border bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-5 shadow-xl transition-all flex flex-col justify-between overflow-hidden ${
                    item.featured
                      ? "border-amber-500/50 shadow-amber-500/5"
                      : "border-zinc-800/80 hover:border-zinc-700"
                  }`}
                >
                  {/* Card Thumbnail Image */}
                  <div className="space-y-4">
                    <div className="relative w-full h-44 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800/80 group">
                      <img
                        src={item.image}
                        alt={item.title}
                        loading="lazy"
                        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                          !item.active ? "grayscale opacity-50" : ""
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/30 pointer-events-none" />

                      {/* Top Badges */}
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                            item.active
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : "bg-zinc-800 text-zinc-400 border-zinc-700"
                          }`}
                        >
                          {item.active ? "نشط" : "معطل"}
                        </span>

                        {item.featured && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>عرض مميز</span>
                          </span>
                        )}
                      </div>

                      {/* Order Controls Badge */}
                      <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-zinc-950/90 px-2.5 py-1 rounded-xl border border-zinc-800 text-xs font-mono">
                        <span className="text-amber-400 font-bold">#{item.order}</span>
                        <div className="flex items-center gap-0.5 border-r border-zinc-800 pr-1 mr-1">
                          <button
                            disabled={index === 0}
                            onClick={() => handleMoveOrder(index, "up")}
                            className="text-zinc-400 hover:text-amber-300 disabled:opacity-30 transition-colors p-0.5"
                            title="تحريك لأعلى"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            disabled={index === filteredBanners.length - 1}
                            onClick={() => handleMoveOrder(index, "down")}
                            className="text-zinc-400 hover:text-amber-300 disabled:opacity-30 transition-colors p-0.5"
                            title="تحريك لأسفل"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Banner Info */}
                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold text-amber-100 line-clamp-1">{item.title}</h3>
                      {item.description ? (
                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{item.description}</p>
                      ) : (
                        <p className="text-xs text-zinc-600 italic">لا يوجد وصف للبانر</p>
                      )}
                    </div>

                    {/* URL Box */}
                    {item.link && (
                      <div className="p-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800 flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-zinc-400 truncate flex-1 dir-ltr text-left">
                          {item.link}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleCopyLink(item.id, item.link || "")}
                            className="p-1 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 transition-all"
                            title="نسخ الرابط"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <a
                            href={item.link}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 transition-all"
                            title="فتح الرابط"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-800/80">
                    <div className="flex items-center gap-2">
                      {/* Active Toggle Switch */}
                      <button
                        onClick={() => handleToggleActive(item.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          item.active
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                            : "bg-zinc-800/80 text-zinc-400 border-zinc-700"
                        }`}
                        title="تبديل التفعيل"
                      >
                        {item.active ? (
                          <ToggleRight className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-zinc-500" />
                        )}
                        <span>{item.active ? "نشط" : "تفعيل"}</span>
                      </button>

                      {/* Featured Offer Toggle Button */}
                      <button
                        onClick={() => handleToggleFeatured(item.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          item.featured
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : "bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:text-amber-200"
                        }`}
                        title="تمييز كعرض خاص في المتجر"
                      >
                        <Star className={`w-3.5 h-3.5 ${item.featured ? "fill-amber-400 text-amber-400" : ""}`} />
                        <span>{item.featured ? "عرض مميز" : "تمييز"}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20 text-xs transition-all"
                        title="تعديل"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(item.id, item.title)}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-xs transition-all"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add / Edit Banner Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-xl rounded-3xl border border-amber-500/30 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    {editingItem ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-amber-200">
                      {editingItem ? "تعديل البانر والعرض" : "إضافة بانر جديد"}
                    </h2>
                    <p className="text-xs text-zinc-400">أدخل تفاصيل وصورة البانر بدقة</p>
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
                {/* Image Upload / URL Input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-300 block">صورة البانر (رابط / URL)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:border-amber-500/60 dir-ltr text-left"
                    />
                  </div>

                  {/* Thumbnail Preview */}
                  {formData.image && (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800">
                      <img
                        src={formData.image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <span className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-[10px] text-zinc-300">
                        معاينة الصورة
                      </span>
                    </div>
                  )}
                </div>

                {/* Banner Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">عنوان البانر الرئيسي</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="مثال: خصم 50% على شحن جواهر ببجي"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                {/* Description Textarea */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">وصف البانر والعرض</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="تفاصيل العرض والمميزات المرفقة..."
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                {/* Link URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">رابط التوجيه عند الضغط (URL / Route)</label>
                  <input
                    type="text"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    placeholder="مثال: /product/15 أو https://..."
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:border-amber-500/60 dir-ltr text-left"
                  />
                </div>

                {/* Order & Switches Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 block">رقم الترتيب</label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                      className="w-full px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 font-mono focus:outline-none focus:border-amber-500/60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 block">حالة التفعيل</label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, active: !formData.active })}
                      className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        formData.active
                          ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-500"
                      }`}
                    >
                      {formData.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      <span>{formData.active ? "نشط بالمتجر" : "معطل"}</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 block">عرض مميز (Featured)</label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, featured: !formData.featured })}
                      className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        formData.featured
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-500"
                      }`}
                    >
                      <Star className={`w-4 h-4 ${formData.featured ? "fill-amber-400 text-amber-400" : ""}`} />
                      <span>{formData.featured ? "نعم مميز" : "عادي"}</span>
                    </button>
                  </div>
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
                    <span>{editingItem ? "حفظ التعديلات" : "إضافة البانر"}</span>
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
