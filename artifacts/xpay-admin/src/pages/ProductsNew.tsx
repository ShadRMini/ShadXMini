import { useEffect, useMemo, useState, useCallback } from "react";
import { get, post, put, del } from "../lib/api";
import { 
  Package, Plus, Search, Filter, Edit3, Trash2, CheckCircle2, XCircle, 
  Sparkles, RefreshCw, Layers, DollarSign, ShieldAlert, Upload, Image as ImageIcon, 
  ChevronLeft, ChevronRight, AlertCircle, Download, Check, Info, FileText,
  ArrowRight, Calculator, Link2
} from "lucide-react";
import ImportFromProviderModal from "../components/ImportFromProviderModal";

const preciseDecimalPattern = /^\d+(\.\d{1,12})?$/;

function cleanDecimal(value: unknown): string {
  return String(value ?? "").trim();
}

function asNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function resolveProviderUnitPrice(row: any): number {
  return asNumber(row.providerUnitPrice ?? row.basePriceUsd);
}

function calculateFinalUnitPrice(row: any): number {
  const explicitFinal = row.finalUnitPrice;
  if (explicitFinal !== null && explicitFinal !== undefined && String(explicitFinal).trim() !== "") {
    return asNumber(explicitFinal);
  }
  return resolveProviderUnitPrice(row) + asNumber(row.storeProfitPerUnit ?? row.priceUsd);
}

function resolveProfitPerUnit(row: any): number {
  return Math.max(0, calculateFinalUnitPrice(row) - resolveProviderUnitPrice(row));
}

function formatMoney(value: number): string {
  return value.toFixed(8);
}

export default function ProductsNew() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "form">("list");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isQuickCategoryOpen, setIsQuickCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryImage, setNewCategoryImage] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    groupId: "",
    image: "",
    order: 0,
    providerId: "",
    providerProductId: "",
    source: "manual",
    finalUnitPrice: "0.01",
    providerUnitPrice: "0.00",
    quantityType: "fixed",
    minQuantity: 1,
    maxQuantity: "",
    quantityValues: "",
    productType: "package",
    available: true,
    featured: false,
    description: "",
    priceSyp: 0,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [prods, cats, groupRows, provs] = await Promise.all([
        get<any[]>("/products"),
        get<any[]>("/categories"),
        get<any[]>("/product-groups"),
        get<any[]>("/providers"),
      ]);

      if (Array.isArray(prods)) setProducts(prods);
      if (Array.isArray(cats)) setCategories(cats);
      if (Array.isArray(groupRows)) setGroups(groupRows);
      if (Array.isArray(provs)) setProviders(provs);
    } catch (err: any) {
      showToast(`فشل تحميل البيانات: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || String(p.id).includes(search);
      const matchCat = !selectedCategory || String(p.categoryId) === selectedCategory;
      const matchProv = !selectedProvider || String(p.providerId) === selectedProvider;
      return matchSearch && matchCat && matchProv;
    });
  }, [products, search, selectedCategory, selectedProvider]);

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredProducts.slice(start, start + limit);
  }, [filteredProducts, page]);

  const totalPages = Math.ceil(filteredProducts.length / limit) || 1;

  // Filter groups according to selected category in form
  const availableGroups = useMemo(() => {
    if (!formData.categoryId) return groups;
    return groups.filter((g) => String(g.categoryId) === String(formData.categoryId));
  }, [groups, formData.categoryId]);

  const processFile = (file: File) => {
    if (file.size > 3 * 1024 * 1024) {
      setFormError("حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 3 ميغابايت.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, image: reader.result as string }));
      setFormError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processFile(file);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      name: "",
      categoryId: categories[0]?.id ? String(categories[0].id) : "",
      groupId: "",
      image: "",
      order: 0,
      providerId: "",
      providerProductId: "",
      source: "manual",
      finalUnitPrice: "0.01",
      providerUnitPrice: "0.00",
      quantityType: "fixed",
      minQuantity: 1,
      maxQuantity: "",
      quantityValues: "",
      productType: "package",
      available: true,
      featured: false,
      description: "",
      priceSyp: 0,
    });
    setFormError(null);
    setActiveTab("form");
  };

  const handleOpenEdit = (p: any) => {
    setEditingId(p.id);
    setFormData({
      name: p.name || "",
      categoryId: p.categoryId !== null && p.categoryId !== undefined ? String(p.categoryId) : "",
      groupId: p.groupId !== null && p.groupId !== undefined ? String(p.groupId) : "",
      image: p.image || "",
      order: p.order || 0,
      providerId: p.providerId !== null && p.providerId !== undefined ? String(p.providerId) : "",
      providerProductId: p.providerProductId || "",
      source: p.source || "manual",
      finalUnitPrice: String(p.finalUnitPrice ?? (resolveProviderUnitPrice(p) + asNumber(p.storeProfitPerUnit || p.priceUsd)) ?? ""),
      providerUnitPrice: String(p.providerUnitPrice ?? p.basePriceUsd ?? "0"),
      quantityType: p.quantityType || "fixed",
      minQuantity: p.minQuantity ?? p.minQty ?? 1,
      maxQuantity: p.maxQuantity ?? p.maxQty ?? "",
      quantityValues: Array.isArray(p.quantityValues) ? p.quantityValues.join(", ") : (p.quantityValues || ""),
      productType: p.productType || "package",
      available: p.available ?? true,
      featured: p.featured ?? false,
      description: p.description || "",
      priceSyp: p.priceSyp || 0,
    });
    setFormError(null);
    setActiveTab("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      if (!formData.name.trim()) throw new Error("اسم المنتج مطلوب.");
      if (!formData.image.trim()) {
        throw new Error("صورة المنتج مطلوبة (أدخل رابط الصورة أو ارفع ملفاً من جهازك).");
      }
      
      const finalUnitStr = cleanDecimal(formData.finalUnitPrice);
      if (!preciseDecimalPattern.test(finalUnitStr)) {
        throw new Error("سعر البيع النهائي يجب أن يكون رقماً موجباً ويدعم حتى 12 خانة عشرية.");
      }

      const provUnitStr = cleanDecimal(formData.providerUnitPrice || "0");
      const providerUnit = asNumber(provUnitStr);
      const finalUnit = asNumber(finalUnitStr);

      if (finalUnit < providerUnit) {
        throw new Error("سعر البيع النهائي يجب أن يكون أكبر من أو يساوي سعر المزود.");
      }

      const storeProfit = (finalUnit - providerUnit).toFixed(8);

      const payload = {
        name: formData.name.trim(),
        categoryId: formData.categoryId ? Number(formData.categoryId) : null,
        groupId: formData.groupId ? Number(formData.groupId) : null,
        image: formData.image.trim(),
        order: Number(formData.order || 0),
        providerId: formData.providerId ? Number(formData.providerId) : null,
        providerProductId: formData.providerProductId ? Number(formData.providerProductId) : null,
        source: formData.source || "manual",
        finalUnitPrice: finalUnitStr,
        providerUnitPrice: provUnitStr || null,
        basePriceUsd: provUnitStr || null,
        storeProfitPerUnit: storeProfit,
        priceUsd: storeProfit,
        quantityType: formData.quantityType,
        minQuantity: Number(formData.minQuantity || 1),
        maxQuantity: formData.maxQuantity !== "" ? Number(formData.maxQuantity) : null,
        minQty: Number(formData.minQuantity || 1),
        maxQty: formData.maxQuantity !== "" ? Number(formData.maxQuantity) : null,
        productType: formData.productType,
        available: Boolean(formData.available),
        featured: Boolean(formData.featured),
        description: formData.description || "",
        priceSyp: Number(formData.priceSyp || 0),
      };

      if (editingId) {
        await put(`/admin/products/${editingId}`, payload);
        showToast("تم تحديث المنتج بنجاح.");
      } else {
        await post("/admin/products", payload);
        showToast("تم إضافة المنتج بنجاح.");
      }

      setActiveTab("list");
      loadData();
    } catch (err: any) {
      setFormError(err.message || "حدث خطأ أثناء حفظ المنتج.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategoryQuickly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      setAddingCategory(true);
      const res = await post<any>("/admin/categories", {
        name: newCategoryName.trim(),
        image: newCategoryImage.trim() || "/xpay-cat-apps.svg",
        columnsCount: 2,
        active: true,
        order: 0,
      });
      showToast("تمت إضافة القسم الجديد بنجاح!");
      setNewCategoryName("");
      setNewCategoryImage("");
      setIsQuickCategoryOpen(false);
      await loadData();
      if (res?.id) {
        setFormData((prev) => ({ ...prev, categoryId: String(res.id) }));
      }
    } catch (err: any) {
      alert(`فشل إضافة القسم: ${err.message}`);
    } finally {
      setAddingCategory(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
    try {
      await del(`/admin/products/${id}`);
      showToast("تم حذف المنتج بنجاح.");
      loadData();
    } catch (err: any) {
      showToast(`فشل الحذف: ${err.message}`);
    }
  };

  const handleToggleAvailable = async (p: any) => {
    try {
      await put(`/admin/products/${p.id}`, { ...p, available: !p.available });
      showToast("تم تحديث حالة التوفر بنجاح.");
      loadData();
    } catch (err: any) {
      showToast(`فشل التحديث: ${err.message}`);
    }
  };

  const verifyProviderProduct = async (p: any) => {
    try {
      setVerifyingId(p.id);
      const result = await get<any>(`/products/${p.id}/provider-status`);
      const lines = [
        `المنتج: ${p.name} (#${p.id})`,
        `النوع: ${result.type}`,
        `موجود لدى المزود: ${result.existsAtProvider ? "نعم" : "لا"}`,
        `سعر المزود الحالي: ${result.remote?.priceUsd ?? "-"}`,
        `رسالة التحقق: ${result.message ?? "-"}`,
      ];
      alert(lines.join("\n"));
    } catch (err: any) {
      alert(`فشل التحقق: ${err.message}`);
    } finally {
      setVerifyingId(null);
    }
  };

  // Preview Calculations
  const previewProvider = asNumber(formData.providerUnitPrice || 0);
  const previewFinal = asNumber(formData.finalUnitPrice || 0);
  const previewProfit = Math.max(0, previewFinal - previewProvider);
  const profitMarginPercent = previewFinal > 0 ? ((previewProfit / previewFinal) * 100).toFixed(1) : "0.0";
  const previewMin = Math.max(1, Number(formData.minQuantity || 1));
  const previewMax = formData.maxQuantity !== "" ? Math.max(previewMin, Number(formData.maxQuantity)) : previewMin;
  const previewMid = Math.floor((previewMin + previewMax) / 2);

  return (
    <div className="space-y-6 text-white" dir="rtl">
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#C8A45C] text-[#1A1A1A] px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-2 border border-white/20 animate-fade-in">
          <Sparkles size={18} />
          {toastMessage}
        </div>
      )}

      {/* Main Page Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#2D2D2D] p-6 rounded-3xl border border-[#C8A45C]/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C8A45C]/5 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#1A1A1A] rounded-2xl border border-[#C8A45C]/40 text-[#C8A45C] shadow-inner">
              <Package size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#FDE68A]">
                {activeTab === "list" ? "إدارة المنتجات" : editingId ? `تعديل المنتج #${editingId}` : "إضافة منتج جديد"}
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                {activeTab === "list" 
                  ? "إدارة دقيقة لمنتجات المتجر والأسعار والمخزون والتكامل مع المزودين" 
                  : "نموذج الصفحة الواحدة المتكاملة: جميع الإعدادات والحقول متاحة ومباشرة في صفحة واحدة"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === "list" ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="bg-[#2D2D2D] hover:bg-[#383838] text-[#FDE68A] border border-[#C8A45C]/40 font-bold px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 transition cursor-pointer"
              >
                <Download size={18} />
                استيراد من مزود API
              </button>
              <button
                onClick={handleOpenCreate}
                className="bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] font-black px-5 py-3 rounded-2xl shadow-lg shadow-[#C8A45C]/25 flex items-center gap-2 transition cursor-pointer"
              >
                <Plus size={18} />
                إضافة منتج جديد
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab("list")}
              className="bg-[#3D3D3D] hover:bg-[#4D4D4D] text-zinc-200 font-bold px-5 py-3 rounded-2xl border border-zinc-600 flex items-center gap-2 transition cursor-pointer"
            >
              <ArrowRight size={18} />
              العودة لقائمة المنتجات
            </button>
          )}
          <button
            onClick={loadData}
            className="p-3 bg-[#3D3D3D] hover:bg-[#4D4D4D] text-[#C8A45C] rounded-2xl border border-zinc-600 transition cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {activeTab === "list" ? (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="bg-[#2D2D2D] p-4 rounded-2xl border border-[#C8A45C]/20 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="بحث بالاسم أو المعرف..."
                className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl pr-10 pl-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="bg-[#1A1A1A] border border-zinc-700 text-zinc-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C8A45C]"
              >
                <option value="">كل الفئات والأقسام</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>

              <select
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value);
                  setPage(1);
                }}
                className="bg-[#1A1A1A] border border-zinc-700 text-zinc-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C8A45C]"
              >
                <option value="">كل المزودين</option>
                {providers.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-[#2D2D2D] rounded-3xl border border-[#C8A45C]/20 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-[#1A1A1A]/80 border-b border-zinc-700 text-xs text-[#C8A45C] uppercase tracking-wider">
                    <th className="p-4 font-bold">المعرف</th>
                    <th className="p-4 font-bold">الصورة والاسم</th>
                    <th className="p-4 font-bold">الفئة / المجموعة</th>
                    <th className="p-4 font-bold">سعر المزود</th>
                    <th className="p-4 font-bold">سعر البيع النهائي</th>
                    <th className="p-4 font-bold">الربح</th>
                    <th className="p-4 font-bold">الحالة</th>
                    <th className="p-4 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700/50 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-zinc-400">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <RefreshCw className="animate-spin text-[#C8A45C]" size={28} />
                          <span>جاري تحميل المنتجات...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-zinc-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Package size={36} className="text-zinc-600" />
                          <p>لا توجد منتجات مطابقة لخيارات البحث.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((p) => {
                      const provUnit = resolveProviderUnitPrice(p);
                      const finalUnit = calculateFinalUnitPrice(p);
                      const profitUnit = resolveProfitPerUnit(p);
                      const cat = categories.find((c) => c.id === p.categoryId);
                      const grp = groups.find((g) => g.id === p.groupId);

                      return (
                        <tr key={p.id} className="hover:bg-[#3D3D3D]/50 transition">
                          <td className="p-4 font-mono text-xs text-zinc-400">#{p.id}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl border border-zinc-700 bg-[#1A1A1A] overflow-hidden flex items-center justify-center shrink-0">
                                {p.image ? (
                                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Package size={20} className="text-zinc-500" />
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-white flex items-center gap-2">
                                  {p.name}
                                  {p.featured && (
                                    <span className="bg-[#C8A45C]/20 text-[#FDE68A] text-[10px] px-2 py-0.5 rounded-full border border-[#C8A45C]/40">مميز</span>
                                  )}
                                </div>
                                <div className="text-xs text-zinc-400 mt-0.5">الترتيب: {p.order} | المصدر: {p.source}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-xs font-medium text-zinc-200">{cat?.name || "بدون فئة"}</div>
                            {grp && <div className="text-[11px] text-[#C8A45C] mt-0.5">مجموعة: {grp.name}</div>}
                          </td>
                          <td className="p-4 font-mono text-zinc-300">${formatMoney(provUnit)}</td>
                          <td className="p-4 font-mono font-bold text-[#FDE68A]">${formatMoney(finalUnit)}</td>
                          <td className="p-4 font-mono text-emerald-400">+${formatMoney(profitUnit)}</td>
                          <td className="p-4">
                            <button
                              onClick={() => handleToggleAvailable(p)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                                p.available ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40" : "bg-red-950/80 text-red-300 border border-red-500/40"
                              }`}
                            >
                              {p.available ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                              {p.available ? "متاح" : "معطل"}
                            </button>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => verifyProviderProduct(p)}
                                disabled={verifyingId === p.id}
                                className="px-2.5 py-1.5 bg-[#1A1A1A] hover:bg-[#3D3D3D] text-[#C8A45C] border border-[#C8A45C]/30 rounded-xl text-xs font-bold transition cursor-pointer"
                                title="التحقق من حالة المزود"
                              >
                                {verifyingId === p.id ? "..." : "تحقق"}
                              </button>
                              <button
                                onClick={() => handleOpenEdit(p)}
                                className="p-2 bg-[#3D3D3D] hover:bg-[#4D4D4D] text-[#C8A45C] rounded-xl transition cursor-pointer"
                                title="تعديل المنتج"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(p.id)}
                                className="p-2 bg-red-950/50 hover:bg-red-900 text-red-300 border border-red-500/30 rounded-xl transition cursor-pointer"
                                title="حذف المنتج"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-zinc-700 flex items-center justify-between bg-[#1A1A1A]/40">
                <div className="text-xs text-zinc-400">
                  عرض الصفحة {page} من {totalPages} (إجمالي المنتجات: {filteredProducts.length})
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                    className="p-2 bg-[#2D2D2D] hover:bg-[#3D3D3D] disabled:opacity-50 text-zinc-300 rounded-xl border border-zinc-700 transition cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={page === totalPages}
                    className="p-2 bg-[#2D2D2D] hover:bg-[#3D3D3D] disabled:opacity-50 text-zinc-300 rounded-xl border border-zinc-700 transition cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* SINGLE INTEGRATED PAGE FORM (No Tabs, No Wizards) */
        <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto">
          {formError && (
            <div className="p-5 bg-red-950/90 border border-red-500/60 text-red-200 rounded-2xl text-sm font-bold flex items-center gap-3 shadow-xl animate-fade-in">
              <AlertCircle size={22} className="text-red-400 shrink-0" />
              <div>{formError}</div>
            </div>
          )}

          {/* GROUP 1: BASIC INFO */}
          <div className="bg-[#2D2D2D] rounded-3xl p-6 sm:p-8 border border-[#C8A45C]/30 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-700/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#1A1A1A] rounded-xl border border-[#C8A45C]/40 text-[#C8A45C]">
                  <Info size={20} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-[#FDE68A]">1. المعلومات الأساسية (Basic Info)</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">الاسم، الفئة، المجموعة، الصورة، وحالة التوفر والتمييز</p>
                </div>
              </div>
              <span className="text-xs px-3 py-1 bg-[#1A1A1A] text-[#C8A45C] border border-[#C8A45C]/30 rounded-full font-bold">
                إلزامي
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-200 mb-2">
                  اسم المنتج <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#C8A45C] focus:ring-1 focus:ring-[#C8A45C]"
                  placeholder="مثال: شدات ببجي 60 UC، بطاقة بلايستيشن 10$"
                />
              </div>

              {/* Category */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-zinc-200">
                    الفئة / القسم <span className="text-red-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsQuickCategoryOpen(true)}
                    className="text-[11px] font-bold text-[#C8A45C] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} />
                    إضافة قسم جديد
                  </button>
                </div>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value, groupId: "" })}
                  className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                >
                  <option value="">اختر القسم...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name} (ID: {c.id})</option>
                  ))}
                </select>
              </div>

              {/* Group */}
              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-2">
                  المجموعة داخل القسم (Group)
                </label>
                <select
                  value={formData.groupId}
                  onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                  className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                >
                  <option value="">بدون مجموعة</option>
                  {availableGroups.map((g) => (
                    <option key={g.id} value={String(g.id)}>{g.name} (ID: {g.id})</option>
                  ))}
                </select>
              </div>

              {/* Product Image with Drag & Drop */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-200 mb-2">
                  صورة المنتج (رابط مباشر أو رفع ملف مع Drag & Drop) <span className="text-red-400">*</span>
                </label>
                
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-3xl p-5 bg-[#1A1A1A] transition flex flex-col sm:flex-row items-center gap-6 ${
                    isDragging ? "border-[#FDE68A] bg-[#C8A45C]/10" : "border-[#C8A45C]/40 hover:border-[#C8A45C]"
                  }`}
                >
                  {/* Image Preview Box */}
                  <div className="w-28 h-28 rounded-2xl border border-zinc-700 bg-[#242424] p-2 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {formData.image ? (
                      <img src={formData.image} alt="معاينة" className="max-w-full max-h-full object-cover rounded-xl" />
                    ) : (
                      <div className="text-center text-zinc-500">
                        <ImageIcon className="mx-auto text-[#C8A45C] mb-1" size={32} />
                        <span className="text-[10px]">لا توجد صورة</span>
                      </div>
                    )}
                  </div>

                  {/* Inputs & Controls */}
                  <div className="flex-1 w-full space-y-3">
                    <div className="relative">
                      <Link2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                        placeholder="أدخل رابط الصورة (https://...) أو اسحب ملفاً هنا"
                        className="w-full bg-[#242424] border border-zinc-700 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C8A45C]"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <label className="bg-[#3D3D3D] hover:bg-[#4D4D4D] text-[#C8A45C] border border-[#C8A45C]/40 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition">
                        <Upload size={16} />
                        اختيار صورة من الجهاز
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                      <span className="text-xs text-zinc-400">يمكنك سحب وإفلات أي صورة هنا مباشرة (PNG, JPG, SVG)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Toggles: Availability & Featured */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-zinc-700 rounded-2xl cursor-pointer hover:border-[#C8A45C]/50 transition">
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-white block">حالة التوفر (Availability)</span>
                    <span className="text-xs text-zinc-400 block">عرض المنتج في المتجر وجعله متاحاً للشراء</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.available}
                    onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                    className="w-5 h-5 accent-[#C8A45C] rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-zinc-700 rounded-2xl cursor-pointer hover:border-[#C8A45C]/50 transition">
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-[#FDE68A] block">منتج مميز (Featured)</span>
                    <span className="text-xs text-zinc-400 block">إبراز المنتج في واجهة المتجر الرئيسية وشريط العروض</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="w-5 h-5 accent-[#C8A45C] rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* GROUP 2: PRICING & FINANCIAL */}
          <div className="bg-[#2D2D2D] rounded-3xl p-6 sm:p-8 border border-[#C8A45C]/30 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-700/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#1A1A1A] rounded-xl border border-[#C8A45C]/40 text-[#C8A45C]">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-[#FDE68A]">2. التسعير والمالية (Pricing & Financial)</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">التحكم الدقيق في سعر المزود، سعر البيع النهائي، وحساب الأرباح</p>
                </div>
              </div>
              <span className="text-xs px-3 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 rounded-full font-bold">
                حساب فوري
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Provider Unit Price */}
              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-2">
                  سعر الوحدة من المزود ($)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.providerUnitPrice}
                    onChange={(e) => setFormData({ ...formData, providerUnitPrice: e.target.value })}
                    placeholder="0.00000000"
                    className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-2xl px-4 py-3.5 text-sm font-mono text-white focus:outline-none focus:border-[#C8A45C]"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1.5">تكلفة الشراء الأساسية من المزود (دعم حتى 12 خانة عشرية).</p>
              </div>

              {/* Final Selling Price */}
              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-2">
                  سعر البيع النهائي للوحدة ($) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.finalUnitPrice}
                    onChange={(e) => setFormData({ ...formData, finalUnitPrice: e.target.value })}
                    placeholder="0.00000000"
                    className="w-full bg-[#1A1A1A] border border-[#C8A45C]/60 rounded-2xl px-4 py-3.5 text-sm font-mono text-[#FDE68A] font-black focus:outline-none focus:border-[#C8A45C] focus:ring-1 focus:ring-[#C8A45C]"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1.5">السعر الفعلي الذي يدفعه العميل للشراء من متجرك.</p>
              </div>

              {/* Price in SYP */}
              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-2">
                  السعر بالليرة السورية (SYP)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.priceSyp}
                    onChange={(e) => setFormData({ ...formData, priceSyp: Number(e.target.value) })}
                    className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1.5">للعرض والتحويل الداخلي في المتجر.</p>
              </div>
            </div>

            {/* Live Profit Calculation Card */}
            <div className="bg-[#1A1A1A] p-6 rounded-2xl border border-[#C8A45C]/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-[#FDE68A] flex items-center gap-2">
                  <Calculator size={18} className="text-[#C8A45C]" />
                  المعاينة المباشرة للأرباح والأسعار
                </div>
                <div className="text-xs text-zinc-400">
                  هامش الربح: <span className="text-emerald-400 font-bold font-mono">%{profitMarginPercent}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-[#242424] p-4 rounded-xl border border-zinc-700">
                  <div className="text-zinc-400">سعر المزود (التكلفة)</div>
                  <div className="font-mono text-white font-bold text-base mt-1">${formatMoney(previewProvider)}</div>
                </div>
                <div className="bg-[#242424] p-4 rounded-xl border border-zinc-700">
                  <div className="text-zinc-400">سعر البيع النهائي</div>
                  <div className="font-mono text-[#FDE68A] font-bold text-base mt-1">${formatMoney(previewFinal)}</div>
                </div>
                <div className="bg-[#242424] p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20">
                  <div className="text-zinc-400">صافي الربح لكل وحدة</div>
                  <div className="font-mono text-emerald-400 font-bold text-base mt-1">+${formatMoney(previewProfit)}</div>
                </div>
              </div>

              {/* Order Quantities Simulation */}
              <div className="overflow-x-auto rounded-xl border border-zinc-700">
                <table className="w-full text-xs text-right">
                  <thead className="bg-[#242424] text-zinc-400 border-b border-zinc-700">
                    <tr>
                      <th className="p-3">حجم الطلب</th>
                      <th className="p-3">الكمية</th>
                      <th className="p-3">تكلفة المزود الإجمالية</th>
                      <th className="p-3">سعر البيع الإجمالي</th>
                      <th className="p-3">إجمالي الربح المتوقع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 font-mono">
                    <tr>
                      <td className="p-3 text-zinc-300 font-sans">الحد الأدنى للطلب</td>
                      <td className="p-3 font-bold">{previewMin}</td>
                      <td className="p-3 text-zinc-400">${formatMoney(previewProvider * previewMin)}</td>
                      <td className="p-3 text-[#FDE68A] font-bold">${formatMoney(previewFinal * previewMin)}</td>
                      <td className="p-3 text-emerald-400 font-bold">+${formatMoney(previewProfit * previewMin)}</td>
                    </tr>
                    {previewMax > previewMin && (
                      <>
                        <tr>
                          <td className="p-3 text-zinc-300 font-sans">متوسط الطلب</td>
                          <td className="p-3 font-bold">{previewMid}</td>
                          <td className="p-3 text-zinc-400">${formatMoney(previewProvider * previewMid)}</td>
                          <td className="p-3 text-[#FDE68A] font-bold">${formatMoney(previewFinal * previewMid)}</td>
                          <td className="p-3 text-emerald-400 font-bold">+${formatMoney(previewProfit * previewMid)}</td>
                        </tr>
                        <tr>
                          <td className="p-3 text-zinc-300 font-sans">الحد الأقصى للطلب</td>
                          <td className="p-3 font-bold">{previewMax}</td>
                          <td className="p-3 text-zinc-400">${formatMoney(previewProvider * previewMax)}</td>
                          <td className="p-3 text-[#FDE68A] font-bold">${formatMoney(previewFinal * previewMax)}</td>
                          <td className="p-3 text-emerald-400 font-bold">+${formatMoney(previewProfit * previewMax)}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* GROUP 3: QUANTITIES & LIMITS */}
          <div className="bg-[#2D2D2D] rounded-3xl p-6 sm:p-8 border border-[#C8A45C]/30 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-700/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#1A1A1A] rounded-xl border border-[#C8A45C]/40 text-[#C8A45C]">
                  <Layers size={20} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-[#FDE68A]">3. الكميات والقيود (Quantities & Limits)</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">نوع الكمية، نوع المنتج، والحد الأدنى والأقصى للطلب</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Quantity Type */}
              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-2">نوع الكمية</label>
                <select
                  value={formData.quantityType}
                  onChange={(e) => setFormData({ ...formData, quantityType: e.target.value })}
                  className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                >
                  <option value="fixed">ثابتة (Fixed)</option>
                  <option value="range">مدى مخصص (Range)</option>
                  <option value="list">قائمة محددة (List)</option>
                </select>
              </div>

              {/* Product Type */}
              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-2">نوع المنتج</label>
                <select
                  value={formData.productType}
                  onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                  className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                >
                  <option value="package">باقة متكاملة (Package)</option>
                  <option value="amount">كمية قابلة للتعديل (Amount)</option>
                </select>
              </div>

              {/* Min Quantity */}
              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-2">الحد الأدنى للكمية</label>
                <input
                  type="number"
                  min="1"
                  value={formData.minQuantity}
                  onChange={(e) => setFormData({ ...formData, minQuantity: Number(e.target.value) })}
                  className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                />
              </div>

              {/* Max Quantity */}
              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-2">الحد الأقصى للكمية (اختياري)</label>
                <input
                  type="number"
                  value={formData.maxQuantity}
                  onChange={(e) => setFormData({ ...formData, maxQuantity: e.target.value })}
                  placeholder="غير محدد"
                  className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                />
              </div>

              {/* Custom Quantity Values (if range or list) */}
              {(formData.quantityType === "list" || formData.quantityType === "range") && (
                <div className="md:col-span-2 lg:col-span-4">
                  <label className="block text-xs font-bold text-zinc-200 mb-2">
                    قيم الكميات المحددة (مفصولة بفواصل)
                  </label>
                  <input
                    type="text"
                    value={formData.quantityValues}
                    onChange={(e) => setFormData({ ...formData, quantityValues: e.target.value })}
                    placeholder="مثال: 60, 325, 660, 1800"
                    className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">تتيح للعميل اختيار كمية سريعة من قائمة محددة.</p>
                </div>
              )}
            </div>
          </div>

          {/* GROUP 4: PROVIDER & INTEGRATION */}
          <div className="bg-[#2D2D2D] rounded-3xl p-6 sm:p-8 border border-[#C8A45C]/30 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-700/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#1A1A1A] rounded-xl border border-[#C8A45C]/40 text-[#C8A45C]">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-[#FDE68A]">4. المزود والتكامل (Provider & Integration)</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">ربط المنتج بمزود API للشحن التلقائي ومزامنة الطلبات</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Provider */}
              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-2">المزود المرتبط</label>
                <select
                  value={formData.providerId}
                  onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
                  className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                >
                  <option value="">بدون مزود (شحن يدوي Manual)</option>
                  {providers.map((p) => (
                    <option key={p.id} value={String(p.id)}>{p.name} (ID: {p.id})</option>
                  ))}
                </select>
              </div>

              {/* Provider Product ID */}
              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-2">معرف المنتج لدى المزود (Provider Product ID)</label>
                <input
                  type="text"
                  value={formData.providerProductId}
                  onChange={(e) => setFormData({ ...formData, providerProductId: e.target.value })}
                  className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                  placeholder="ID المنتج على سيرفر المزود"
                />
              </div>

              {/* Source */}
              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-2">المصدر (Source)</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                >
                  <option value="manual">يدوي (manual)</option>
                  <option value="api">تلقائي API (api)</option>
                  <option value="provider">مزود خارجي (provider)</option>
                </select>
              </div>
            </div>
          </div>

          {/* GROUP 5: ADDITIONAL SETTINGS */}
          <div className="bg-[#2D2D2D] rounded-3xl p-6 sm:p-8 border border-[#C8A45C]/30 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-700/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#1A1A1A] rounded-xl border border-[#C8A45C]/40 text-[#C8A45C]">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-[#FDE68A]">5. إعدادات إضافية (Additional Settings)</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">ترتيب الظهور، والوصف، وملاحظات المنتج</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Order */}
              <div className="max-w-xs">
                <label className="block text-xs font-bold text-zinc-200 mb-2">ترتيب الظهور (Order)</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                  className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                />
                <p className="text-[11px] text-zinc-400 mt-1">الرقم الأصغر يظهر أولاً في قائمة المتجر.</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-2">
                  وصف المنتج والتعليمات للعميل (اختياري)
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                  placeholder="اكتب تعليمات الشحن أو ملاحظات إضافية تظهر للعميل عند فتح صفحة المنتج..."
                />
              </div>
            </div>
          </div>

          {/* Sticky Bottom Actions Bar */}
          <div className="sticky bottom-4 z-20 bg-[#1A1A1A]/95 backdrop-blur-md p-5 rounded-3xl border border-[#C8A45C]/50 shadow-2xl flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className="px-6 py-3.5 bg-[#2D2D2D] hover:bg-[#3D3D3D] text-zinc-300 font-bold rounded-2xl border border-zinc-600 transition cursor-pointer flex items-center gap-2"
            >
              <ArrowRight size={18} />
              إلغاء والعودة للقائمة
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3.5 bg-[#C8A45C] hover:bg-[#B8954A] disabled:opacity-50 text-[#1A1A1A] font-black rounded-2xl shadow-xl shadow-[#C8A45C]/30 transition cursor-pointer flex items-center gap-2.5 text-base"
            >
              {saving ? <RefreshCw className="animate-spin" size={20} /> : <Check size={20} />}
              {editingId ? "حفظ كافة التعديلات" : "إضافة المنتج الآن"}
            </button>
          </div>
        </form>
      )}

      {/* Quick Category Creation Modal */}
      {isQuickCategoryOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#2D2D2D] border border-[#C8A45C]/50 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-[#FDE68A]">إضافة قسم جديد سريعاً</h3>
            <form onSubmit={handleCreateCategoryQuickly} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-1">اسم القسم *</label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="مثال: بطاقات ألعاب"
                  className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-1">أيقونة أو رابط صورة القسم</label>
                <input
                  type="text"
                  value={newCategoryImage}
                  onChange={(e) => setNewCategoryImage(e.target.value)}
                  placeholder="/xpay-cat-games.svg أو رابط خارجي"
                  className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsQuickCategoryOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-300 font-bold bg-[#1A1A1A] border border-zinc-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={addingCategory}
                  className="px-5 py-2 rounded-xl text-[#1A1A1A] font-black bg-[#C8A45C] hover:bg-[#B8954A] shadow-md shadow-[#C8A45C]/30"
                >
                  {addingCategory ? "جاري الإضافة..." : "حفظ القسم"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import from Provider Modal */}
      <ImportFromProviderModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => loadData()}
        categories={categories}
      />
    </div>
  );
}
