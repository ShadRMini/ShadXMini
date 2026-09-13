import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Plus,
  Search,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Check,
  X,
  Upload,
  Image as ImageIcon,
  QrCode,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Power,
  Coins,
  Copy,
  Info,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import { get, post, put, patch, del } from "../lib/api";

export interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  subtitle: string;
  instructions?: string;
  walletAddress?: string;
  logoImage?: string;
  qrImage?: string;
  minAmount: number;
  active: boolean;
  order: number;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

const PRESET_METHODS = [
  {
    code: "sham_cash",
    name: "شام كاش",
    subtitle: "تتطلب توثيق الحساب",
    category: "تلقائي",
    minAmount: 1,
    instructions: "يرجى التحويل إلى عنوان المحفظة ثم إدخال رقم العملية للتأكيد الفوري.",
  },
  {
    code: "sham_cash_auto",
    name: "شام كاش (تلقائي)",
    subtitle: "تأكيد فوري",
    category: "تلقائي",
    minAmount: 1,
    instructions: "الدفع التلقائي عبر شام كاش مع التحقق اللحظي.",
  },
  {
    code: "syriatel_cash",
    name: "سيرياتيل كاش",
    subtitle: "شحن فوري",
    category: "فوري",
    minAmount: 1,
    instructions: "يرجى التحويل إلى الرقم المعتمد وإرفاق إشعار الدفع.",
  },
  {
    code: "binance_pay",
    name: "Binance Pay",
    subtitle: "شحن فوري",
    category: "فوري",
    minAmount: 1,
    instructions: "الدفع عبر معرف بينانس مع التأكيد السريع.",
  },
  {
    code: "usdt_auto",
    name: "USDT تلقائي",
    subtitle: "شحن فوري TRC20",
    category: "فوري",
    minAmount: 5,
    instructions: "تحويل شبكة TRC20 مع المعالجة التلقائية.",
  },
  {
    code: "mtn_cash",
    name: "MTN Cash",
    subtitle: "مراجعة يدوية",
    category: "يدوي",
    minAmount: 1,
    instructions: "يرجى التحويل عبر MTN كاش ورفع إشعار العملية للمراجعة.",
  },
];

export default function PaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<PaymentMethod | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // File input refs for image uploads
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    code: "sham_cash",
    customCode: "",
    name: "",
    subtitle: "",
    category: "فوري",
    instructions: "",
    walletAddress: "",
    logoImage: "",
    qrImage: "",
    minAmount: 1,
    active: true,
    order: 0,
  });

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchMethods = async () => {
    setLoading(true);
    try {
      const data = await get<any[]>("/payment-methods");
      if (Array.isArray(data)) {
        const formatted: PaymentMethod[] = data.map((item: any) => ({
          id: Number(item.id),
          code: String(item.code || ""),
          name: String(item.name || ""),
          subtitle: String(item.subtitle || ""),
          category: item.category || "فوري",
          instructions: item.instructions || "",
          walletAddress: item.walletAddress || "",
          logoImage: item.logoImage || "",
          qrImage: item.qrImage || "",
          minAmount: Number(item.minAmount || 1),
          active: item.active !== false,
          order: Number(item.order || 0),
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }));
        // Sort by order ascending
        formatted.sort((a, b) => a.order - b.order || a.id - b.id);
        setMethods(formatted);
      }
    } catch (err: any) {
      console.error("Error fetching payment methods:", err);
      showToast("تعذر تحميل طرق الدفع من الخادم", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    const maxOrder = methods.reduce((max, m) => Math.max(max, m.order), 0);
    setFormData({
      code: "sham_cash",
      customCode: "",
      name: "شام كاش",
      subtitle: "تتطلب توثيق الحساب",
      category: "تلقائي",
      instructions: "يرجى التحويل إلى عنوان المحفظة ثم إدخال رقم العملية للتأكيد الفوري.",
      walletAddress: "35147b5811bdc0bf07fdb11b85c8a5d",
      logoImage: "",
      qrImage: "",
      minAmount: 1,
      active: true,
      order: maxOrder + 1,
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (item: PaymentMethod) => {
    setEditingItem(item);
    const isPreset = PRESET_METHODS.some((p) => p.code === item.code);
    setFormData({
      code: isPreset ? item.code : "custom",
      customCode: isPreset ? "" : item.code,
      name: item.name,
      subtitle: item.subtitle,
      category: item.category || "فوري",
      instructions: item.instructions || "",
      walletAddress: item.walletAddress || "",
      logoImage: item.logoImage || "",
      qrImage: item.qrImage || "",
      minAmount: item.minAmount,
      active: item.active,
      order: item.order,
    });
    setShowModal(true);
  };

  const handlePresetSelect = (code: string) => {
    if (code === "custom") {
      setFormData((prev) => ({ ...prev, code: "custom" }));
      return;
    }
    const preset = PRESET_METHODS.find((p) => p.code === code);
    if (preset) {
      setFormData((prev) => ({
        ...prev,
        code,
        customCode: "",
        name: prev.name && prev.name !== preset.name ? prev.name : preset.name,
        subtitle: prev.subtitle && prev.subtitle !== preset.subtitle ? prev.subtitle : preset.subtitle,
        category: preset.category,
        minAmount: preset.minAmount,
        instructions: prev.instructions || preset.instructions,
      }));
    } else {
      setFormData((prev) => ({ ...prev, code }));
    }
  };

  // Image Upload Handlers (converts file to Base64)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("يرجى اختيار ملف صورة صالح (PNG, JPG, SVG, WebP)", "error");
      e.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast("حجم الصورة كبير جداً. الحد الأقصى المسموح 2 ميجابايت", "error");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFormData((prev) => ({ ...prev, logoImage: base64 }));
      showToast("تم تحميل شعار الطريقة بنجاح");
    };
    reader.onerror = () => {
      showToast("فشل في قراءة ملف الصورة", "error");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("يرجى اختيار ملف صورة صالح", "error");
      e.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast("حجم صورة QR كبير جداً. الحد الأقصى 2 ميجابايت", "error");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFormData((prev) => ({ ...prev, qrImage: base64 }));
      showToast("تم تحميل صورة كود QR بنجاح");
    };
    reader.onerror = () => {
      showToast("فشل في قراءة ملف QR", "error");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalCode = formData.code === "custom" ? formData.customCode.trim() : formData.code.trim();

    if (!finalCode) {
      showToast("يرجى تحديد أو إدخال كود طريقة الدفع", "error");
      return;
    }

    if (!formData.name.trim()) {
      showToast("يرجى إدخال اسم طريقة الدفع", "error");
      return;
    }

    if (!formData.subtitle.trim()) {
      showToast("يرجى إدخال العنوان الفرعي", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: finalCode,
        name: formData.name.trim(),
        subtitle: formData.subtitle.trim(),
        category: formData.category,
        instructions: formData.instructions.trim(),
        walletAddress: formData.walletAddress.trim(),
        logoImage: formData.logoImage.trim(),
        qrImage: formData.qrImage.trim(),
        minAmount: Number(formData.minAmount || 1),
        active: formData.active,
        order: Number(formData.order || 0),
      };

      if (editingItem) {
        await put(`/payment-methods/${editingItem.id}`, payload);
        showToast("تم تحديث طريقة الدفع بنجاح");
      } else {
        await post("/payment-methods", payload);
        showToast("تمت إضافة طريقة الدفع بنجاح");
      }

      setShowModal(false);
      await fetchMethods();
    } catch (err: any) {
      console.error("Save error:", err);
      showToast(err.message || "حدث خطأ أثناء حفظ البيانات", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: PaymentMethod) => {
    const newActive = !item.active;
    // Optimistic UI update
    setMethods((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, active: newActive } : m))
    );

    try {
      await patch(`/payment-methods/${item.id}/toggle`, { active: newActive });
      showToast(newActive ? `تم تفعيل "${item.name}"` : `تم تعطيل "${item.name}"`);
    } catch (err: any) {
      console.error("Toggle active error:", err);
      // Revert optimistic update
      setMethods((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, active: item.active } : m))
      );
      showToast(err?.message || "فشل في تحديث حالة التفعيل", "error");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await del(`/payment-methods/${id}`);
      setMethods((prev) => prev.filter((m) => m.id !== id));
      setDeleteConfirmId(null);
      showToast("تم حذف طريقة الدفع بنجاح");
    } catch (err: any) {
      console.error("Delete error:", err);
      showToast(err.message || "فشل في حذف طريقة الدفع", "error");
    }
  };

  const handleMove = async (method: PaymentMethod, direction: "up" | "down") => {
    const currentIndex = methods.findIndex((m) => m.id === method.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= methods.length) return;

    const newMethods = [...methods];
    const temp = newMethods[currentIndex];
    newMethods[currentIndex] = newMethods[targetIndex];
    newMethods[targetIndex] = temp;

    // Update order values sequentially
    const updated = newMethods.map((m, idx) => ({ ...m, order: idx + 1 }));
    setMethods(updated);

    try {
      const items = updated.map((m) => ({ id: m.id, order: m.order }));
      await patch("/payment-methods/reorder", { items });
      showToast("تم تحديث ترتيب ظهور طرق الدفع");
    } catch (err: any) {
      console.error("Reorder error:", err);
      showToast(err?.message || "تعذر حفظ الترتيب الجديد في الخادم", "error");
      fetchMethods();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
    showToast("تم النسخ إلى الحافظة");
  };

  // Filtered methods
  const filteredMethods = methods.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.walletAddress && m.walletAddress.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCat =
      filterCategory === "all" ||
      (filterCategory === "active" && m.active) ||
      (filterCategory === "inactive" && !m.active) ||
      m.category === filterCategory;

    return matchesSearch && matchesCat;
  });

  const totalCount = methods.length;
  const activeCount = methods.filter((m) => m.active).length;
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="w-full space-y-6 pb-12" dir="rtl">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold border backdrop-blur-md pointer-events-none ${
              toastMessage.type === "success"
                ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/40"
                : "bg-red-950/90 text-red-300 border-red-500/40"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] p-6 rounded-3xl border border-[#262626] shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C8A45C]/20 to-[#C8A45C]/5 border border-[#C8A45C]/30 flex items-center justify-center text-[#C8A45C] shadow-lg">
            <CreditCard className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white tracking-tight">
                إدارة طرق الدفع
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#C8A45C]/15 text-[#C8A45C] font-semibold border border-[#C8A45C]/30">
                ربط كامل مع المتجر
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              تحكم كامل في طرق الإيداع، الشعار، العناوين، والترتيب مع المزامنة التلقائية مع صفحة المحفظة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchMethods}
            disabled={loading}
            className="p-3 rounded-2xl bg-[#1F1F1F] hover:bg-[#262626] border border-[#333] text-zinc-300 hover:text-white transition-all disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin text-[#C8A45C]" : ""}`} />
          </button>

          <button
            id="btn-add-payment-method"
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#C8A45C] to-[#DFBF7A] text-black font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة طريقة دفع جديدة</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#181818] p-4 rounded-2xl border border-[#2A2A2A] flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs text-zinc-400 font-medium">إجمالي طرق الدفع</div>
            <div className="text-2xl font-black text-white">{totalCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#181818] p-4 rounded-2xl border border-[#2A2A2A] flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs text-zinc-400 font-medium">الطرق المفعلة بالمتجر</div>
            <div className="text-2xl font-black text-emerald-400">{activeCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#181818] p-4 rounded-2xl border border-[#2A2A2A] flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs text-zinc-400 font-medium">الطرق المعطلة</div>
            <div className="text-2xl font-black text-zinc-500">{inactiveCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-500/10 border border-zinc-500/20 flex items-center justify-center text-zinc-400">
            <Power className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#181818] p-3 rounded-2xl border border-[#2A2A2A]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="بحث بالاسم، الكود، أو عنوان المحفظة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-10 py-2.5 bg-[#121212] border border-[#2E2E2E] rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C8A45C]/70 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "الكل" },
            { id: "active", label: "المفعلة فقط" },
            { id: "inactive", label: "المعطلة" },
            { id: "فوري", label: "شحن فوري" },
            { id: "تلقائي", label: "تلقائي" },
            { id: "يدوي", label: "يدوي" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterCategory === cat.id
                  ? "bg-[#C8A45C] text-black shadow-sm"
                  : "bg-[#202020] text-zinc-400 hover:text-white hover:bg-[#282828]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Methods List / Table */}
      <div className="bg-[#141414] rounded-3xl border border-[#262626] shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-400 space-y-3">
            <div className="w-10 h-10 border-2 border-[#C8A45C] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold">جاري تحميل طرق الدفع...</p>
          </div>
        ) : filteredMethods.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 rounded-3xl bg-[#1E1E1E] border border-[#2C2C2C] flex items-center justify-center text-zinc-500 mb-3">
              <CreditCard className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">لا توجد طرق دفع مطابقة</h3>
            <p className="text-xs text-zinc-500 max-w-sm mb-4">
              لم نتمكن من العثور على أي وسيلة دفع تطابق معايير البحث الحالية. يمكنك إضافة وسيلة جديدة الآن.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C8A45C] text-black text-xs font-bold shadow-md hover:brightness-110"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة طريقة دفع</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-[#222] bg-[#181818]/60 text-xs font-bold text-zinc-400">
                  <th className="py-4 px-4 w-16 text-center">الترتيب</th>
                  <th className="py-4 px-4">الشعار والوسيلة</th>
                  <th className="py-4 px-4">الكود والتصنيف</th>
                  <th className="py-4 px-4">عنوان المحفظة / الرقم</th>
                  <th className="py-4 px-4 text-center">أدنى مبلغ</th>
                  <th className="py-4 px-4 text-center">الحالة بالمتجر</th>
                  <th className="py-4 px-4 text-center w-36">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202020] text-xs sm:text-sm">
                {filteredMethods.map((method, index) => (
                  <tr
                    key={method.id}
                    id={`admin-payment-row-${method.id}`}
                    className={`hover:bg-[#1A1A1A] transition-colors group ${
                      !method.active ? "opacity-60 bg-[#121212]/50" : ""
                    }`}
                  >
                    {/* Order buttons */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMove(method, "up")}
                          disabled={index === 0}
                          title="تحريك لأعلى"
                          className="p-1 rounded bg-[#202020] hover:bg-[#2E2E2E] text-zinc-400 hover:text-white disabled:opacity-20 transition-all"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono text-xs font-bold text-[#C8A45C]">
                          {method.order}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMove(method, "down")}
                          disabled={index === filteredMethods.length - 1}
                          title="تحريك لأسفل"
                          className="p-1 rounded bg-[#202020] hover:bg-[#2E2E2E] text-zinc-400 hover:text-white disabled:opacity-20 transition-all"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Logo & Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#202020] border border-[#333] flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {method.logoImage ? (
                            <img
                              src={method.logoImage}
                              alt={method.name}
                              className="w-10 h-10 object-contain"
                            />
                          ) : (
                            <CreditCard className="w-6 h-6 text-zinc-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-[#C8A45C] transition-colors flex items-center gap-2">
                            <span>{method.name}</span>
                            {method.qrImage && (
                              <span title="يتضمن كود QR" className="text-zinc-500 hover:text-white">
                                <QrCode className="w-3.5 h-3.5 text-zinc-400" />
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                            {method.subtitle}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Code & Category */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span className="inline-block font-mono text-xs px-2 py-0.5 rounded-md bg-[#222] border border-[#333] text-zinc-300">
                          {method.code}
                        </span>
                        <div>
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              method.category === "فوري" || method.subtitle.includes("فوري")
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : method.category === "تلقائي" || method.subtitle.includes("توثيق")
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}
                          >
                            {method.category || "فوري"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Wallet Address */}
                    <td className="py-3 px-4">
                      {method.walletAddress ? (
                        <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-300 max-w-[200px]">
                          <span className="truncate" title={method.walletAddress}>
                            {method.walletAddress}
                          </span>
                          <button
                            onClick={() => copyToClipboard(method.walletAddress || "")}
                            className="p-1 rounded bg-[#202020] hover:bg-[#2C2C2C] text-zinc-400 hover:text-white shrink-0"
                            title="نسخ العنوان"
                          >
                            {copiedText === method.walletAddress ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>

                    {/* Min Amount */}
                    <td className="py-3 px-4 text-center font-mono font-bold text-white">
                      ${method.minAmount}
                    </td>

                    {/* Active Toggle Switch */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(method)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                          method.active
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                            : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-300"
                        }`}
                        title={method.active ? "انقر للتعطيل" : "انقر للتفعيل"}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            method.active ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
                          }`}
                        />
                        <span>{method.active ? "مفعل بالمتجر" : "معطل"}</span>
                      </button>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(method)}
                          className="p-2 rounded-xl bg-[#202020] hover:bg-[#2C2C2C] text-zinc-300 hover:text-[#C8A45C] border border-[#303030] transition-all"
                          title="تعديل طريقة الدفع"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeleteConfirmId(method.id)}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 transition-all"
                          title="حذف طريقة الدفع"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#181818] border border-[#303030] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-right"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-white">تأكيد حذف طريقة الدفع</h3>
                <p className="text-xs text-zinc-400">
                  هل أنت متأكد من رغبتك في حذف طريقة الدفع هذه نهائياً؟ لن تظهر للمستخدمين في صفحة المحفظة بعد الحذف.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg transition-all"
                >
                  نعم، احذف الآن
                </button>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 rounded-xl bg-[#252525] hover:bg-[#303030] text-zinc-300 font-semibold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#181818] border border-[#2E2E2E] rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-8"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-[#262626] bg-[#141414]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C8A45C]/15 border border-[#C8A45C]/30 flex items-center justify-center text-[#C8A45C]">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {editingItem ? "تعديل طريقة الدفع" : "إضافة طريقة دفع جديدة"}
                    </h2>
                    <p className="text-xs text-zinc-400">
                      حدد تفاصيل الوسيلة والشعار ومعلومات التحويل
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl bg-[#222] hover:bg-[#2D2D2D] text-zinc-400 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* 1. Code / Preset selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 block">
                    كود وسيلة الدفع <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={formData.code}
                      onChange={(e) => handlePresetSelect(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#121212] border border-[#2E2E2E] rounded-xl text-xs text-white focus:outline-none focus:border-[#C8A45C]"
                    >
                      {PRESET_METHODS.map((preset) => (
                        <option key={preset.code} value={preset.code}>
                          {preset.name} ({preset.code})
                        </option>
                      ))}
                      <option value="custom">كود مخصص آخر...</option>
                    </select>

                    {formData.code === "custom" && (
                      <input
                        type="text"
                        placeholder="مثال: zain_cash أو paypal"
                        value={formData.customCode}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, customCode: e.target.value }))
                        }
                        className="w-full px-3 py-2.5 bg-[#121212] border border-[#2E2E2E] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-[#C8A45C]"
                        required
                      />
                    )}
                  </div>
                </div>

                {/* 2. Name & Subtitle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300 block">
                      اسم طريقة الدفع <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: سيرياتيل كاش"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-[#121212] border border-[#2E2E2E] rounded-xl text-xs text-white focus:outline-none focus:border-[#C8A45C]"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300 block">
                      الوصف الفرعي (شارة الحالة) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: شحن فوري أو تتطلب توثيق الحساب"
                      value={formData.subtitle}
                      onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-[#121212] border border-[#2E2E2E] rounded-xl text-xs text-white focus:outline-none focus:border-[#C8A45C]"
                      required
                    />
                  </div>
                </div>

                {/* 3. Category, Min Amount, Order */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300 block">التصنيف</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-[#121212] border border-[#2E2E2E] rounded-xl text-xs text-white focus:outline-none focus:border-[#C8A45C]"
                    >
                      <option value="فوري">فوري</option>
                      <option value="تلقائي">تلقائي</option>
                      <option value="يدوي">يدوي</option>
                      <option value="مراجعة يدوية">مراجعة يدوية</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300 block">أدنى مبلغ ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={formData.minAmount}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, minAmount: parseFloat(e.target.value) || 1 }))
                      }
                      className="w-full px-3 py-2.5 bg-[#121212] border border-[#2E2E2E] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-[#C8A45C]"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300 block">ترتيب الظهور</label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, order: parseInt(e.target.value, 10) || 0 }))
                      }
                      className="w-full px-3 py-2.5 bg-[#121212] border border-[#2E2E2E] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-[#C8A45C]"
                    />
                  </div>
                </div>

                {/* 4. Logo Image Section with Upload Button & Preview */}
                <div className="p-4 rounded-2xl bg-[#121212] border border-[#2A2A2A] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-[#C8A45C]" />
                      <span>شعار طريقة الدفع (Logo)</span>
                    </label>
                    {formData.logoImage && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, logoImage: "" }))}
                        className="text-[11px] text-red-400 hover:text-red-300 font-semibold"
                      >
                        إزالة الشعار
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Logo Preview box */}
                    <div className="w-16 h-16 rounded-2xl bg-[#181818] border border-[#333] flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      {formData.logoImage ? (
                        <img
                          src={formData.logoImage}
                          alt="Preview"
                          className="w-12 h-12 object-contain"
                        />
                      ) : (
                        <span className="text-[10px] text-zinc-600 text-center px-1">بدون شعار</span>
                      )}
                    </div>

                    {/* Logo upload and URL controls */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          ref={logoFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => logoFileInputRef.current?.click()}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#242424] hover:bg-[#2F2F2F] text-xs font-semibold text-white border border-[#3A3A3A] transition-all"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#C8A45C]" />
                          <span>رفع صورة من الجهاز</span>
                        </button>
                        <span className="text-[11px] text-zinc-500">الحد الأقصى 2MB</span>
                      </div>

                      <input
                        type="text"
                        placeholder="أو ضع رابط مباشر للشعار (URL)..."
                        value={formData.logoImage}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, logoImage: e.target.value }))
                        }
                        className="w-full px-3 py-2 bg-[#181818] border border-[#2E2E2E] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#C8A45C]"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. QR Code Section */}
                <div className="p-4 rounded-2xl bg-[#121212] border border-[#2A2A2A] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-[#C8A45C]" />
                      <span>صورة كود QR (اختياري)</span>
                    </label>
                    {formData.qrImage && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, qrImage: "" }))}
                        className="text-[11px] text-red-400 hover:text-red-300 font-semibold"
                      >
                        إزالة كود QR
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#181818] border border-[#333] flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      {formData.qrImage ? (
                        <img
                          src={formData.qrImage}
                          alt="QR Preview"
                          className="w-12 h-12 object-contain"
                        />
                      ) : (
                        <QrCode className="w-6 h-6 text-zinc-600" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          ref={qrFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleQrUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => qrFileInputRef.current?.click()}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#242424] hover:bg-[#2F2F2F] text-xs font-semibold text-white border border-[#3A3A3A] transition-all"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#C8A45C]" />
                          <span>رفع صورة كود QR</span>
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="أو رابط مباشر لصورة كود QR..."
                        value={formData.qrImage}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, qrImage: e.target.value }))
                        }
                        className="w-full px-3 py-2 bg-[#181818] border border-[#2E2E2E] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#C8A45C]"
                      />
                    </div>
                  </div>
                </div>

                {/* 6. Wallet Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">
                    عنوان المحفظة أو رقم الهاتف المعتمد للتحويل
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 0991234567 أو TQn9Y2khEsLJW1ChVWFMSMeSTow5KaxnSE"
                    value={formData.walletAddress}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, walletAddress: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 bg-[#121212] border border-[#2E2E2E] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-[#C8A45C]"
                  />
                </div>

                {/* 7. Instructions */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">
                    تعليمات التحويل التي تظهر للمستخدم بالمتجر
                  </label>
                  <textarea
                    rows={3}
                    placeholder="اكتب التعليمات والخطوات التي يجب على المستخدم اتباعها لإتمام الدفع بنجاح..."
                    value={formData.instructions}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, instructions: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 bg-[#121212] border border-[#2E2E2E] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#C8A45C]"
                  />
                </div>

                {/* 8. Active Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#121212] border border-[#262626]">
                  <div>
                    <div className="text-xs font-bold text-white">تفعيل الطريقة في المتجر</div>
                    <div className="text-[11px] text-zinc-500">
                      عند التعطيل لن تظهر طريقة الدفع للعملاء في صفحة الإيداع
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, active: e.target.checked }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C8A45C]"></div>
                  </label>
                </div>

                {/* Modal Actions */}
                <div className="flex items-center gap-3 pt-3 border-t border-[#262626]">
                  <button
                    id="btn-save-payment-method"
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#C8A45C] to-[#DFBF7A] text-black font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{editingItem ? "حفظ التعديلات" : "إضافة الطريقة"}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 rounded-xl bg-[#222] hover:bg-[#2C2C2C] text-zinc-300 font-semibold text-sm transition-all"
                  >
                    إلغاء
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
