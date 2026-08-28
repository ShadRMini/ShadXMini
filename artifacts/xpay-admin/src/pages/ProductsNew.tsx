import { useEffect, useMemo, useState } from "react";
import { get, post, put, del } from "../lib/api";
import { 
  Package, Plus, Search, Filter, Edit3, Trash2, CheckCircle2, XCircle, 
  Sparkles, RefreshCw, Layers, DollarSign, ShieldAlert, Upload, Image as ImageIcon, 
  ChevronLeft, ChevronRight, Eye, AlertCircle, Check, Download
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
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "form">("list");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formTab, setFormTab] = useState<"basic" | "pricing" | "quantity" | "provider" | "additional">("basic");
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    groupId: "",
    image: "",
    order: 0,
    providerId: "",
    providerProductId: "",
    source: "manual",
    finalUnitPrice: "",
    providerUnitPrice: "",
    quantityType: "fixed",
    minQuantity: 1,
    maxQuantity: "",
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
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
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setFormError("حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 2 ميغابايت.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, image: reader.result as string }));
      setFormError(null);
    };
    reader.readAsDataURL(file);
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
      providerUnitPrice: "0",
      quantityType: "fixed",
      minQuantity: 1,
      maxQuantity: "",
      productType: "package",
      available: true,
      featured: false,
      description: "",
      priceSyp: 0,
    });
    setFormError(null);
    setFormTab("basic");
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
      providerUnitPrice: String(p.providerUnitPrice ?? p.basePriceUsd ?? ""),
      quantityType: p.quantityType || "fixed",
      minQuantity: p.minQuantity ?? p.minQty ?? 1,
      maxQuantity: p.maxQuantity ?? p.maxQty ?? "",
      productType: p.productType || "package",
      available: p.available ?? true,
      featured: p.featured ?? false,
      description: p.description || "",
      priceSyp: p.priceSyp || 0,
    });
    setFormError(null);
    setFormTab("basic");
    setActiveTab("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      if (!formData.name.trim()) throw new Error("اسم المنتج مطلوب.");
      if (!formData.image.trim()) {
        throw new Error("صورة المنتج مطلوبة (أدخل رابط الصورة أو ارفع ملفاً).");
      }
      
      const finalUnitStr = cleanDecimal(formData.finalUnitPrice);
      if (!preciseDecimalPattern.test(finalUnitStr)) {
        throw new Error("سعر البيع النهائي يجب أن يكون رقماً موجباً ويدعم حتى 12 خانة عشرية.");
      }

      const provUnitStr = cleanDecimal(formData.providerUnitPrice);
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
  const previewMin = Math.max(1, Number(formData.minQuantity || 1));
  const previewMax = formData.maxQuantity !== "" ? Math.max(previewMin, Number(formData.maxQuantity)) : previewMin;

  return (
    <div className="space-y-6 text-white" dir="rtl">
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#C8A45C] text-[#1A1A1A] px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-2 border border-white/20 animate-bounce">
          <Sparkles size={18} />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#2D2D2D] p-6 rounded-3xl border border-[#C8A45C]/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C8A45C]/5 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#1A1A1A] rounded-2xl border border-[#C8A45C]/40 text-[#C8A45C]">
              <Package size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#FDE68A]">إدارة المنتجات (الواجهة المتقدمة الجديدة)</h1>
              <p className="text-xs text-zinc-400 mt-1">إدارة متقدمة وسريعة للمنتجات مع تحكم دقيق في الأسعار والكميات والمزودين</p>
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
              العودة لقائمة المنتجات
            </button>
          )}
          <button
            onClick={loadData}
            className="p-3 bg-[#3D3D3D] hover:bg-[#4D4D4D] text-[#C8A45C] rounded-2xl border border-zinc-600 transition cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw size={20} />
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
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم أو المعرف..."
                className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl pr-10 pl-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-[#1A1A1A] border border-zinc-700 text-zinc-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C8A45C]"
              >
                <option value="">كل الفئات والأقسام</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>

              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
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
                      <td colSpan={8} className="text-center py-12 text-zinc-400">جاري تحميل المنتجات...</td>
                    </tr>
                  ) : paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-zinc-400">لا توجد منتجات مطابقة لخيارات البحث.</td>
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
        /* Form View */
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto bg-[#2D2D2D] p-8 rounded-3xl border border-[#C8A45C]/40 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-700 pb-4">
            <h2 className="text-xl font-black text-[#FDE68A]">
              {editingId ? `تعديل المنتج #${editingId}` : "إضافة منتج جديد (واجهة متقدمة)"}
            </h2>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "basic", label: "1. الأساسيات" },
                { id: "pricing", label: "2. التسعير والأرباح" },
                { id: "quantity", label: "3. الكميات" },
                { id: "provider", label: "4. المزود والتكامل" },
                { id: "additional", label: "5. إضافي" },
              ].map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setFormTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    formTab === tab.id ? "bg-[#C8A45C] text-[#1A1A1A] shadow-lg shadow-[#C8A45C]/30" : "bg-[#1A1A1A] text-zinc-400 hover:text-white border border-zinc-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {formError && (
            <div className="p-4 bg-red-950/80 border border-red-500/50 text-red-200 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle size={18} />
              {formError}
            </div>
          )}

          {/* Tab 1: Basic Info */}
          {formTab === "basic" && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-2">اسم المنتج *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                    placeholder="مثال: شدات ببجي 60 شدة"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-2">الفئة / القسم *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                  >
                    <option value="">اختر القسم...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={String(c.id)}>{c.name} (ID: {c.id})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-2">مجموعة داخل القسم (اختياري)</label>
                  <select
                    value={formData.groupId}
                    onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                    className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                  >
                    <option value="">بدون مجموعة</option>
                    {groups.map((g) => (
                      <option key={g.id} value={String(g.id)}>{g.name} (ID: {g.id})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-2">ترتيب العرض</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                    className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                  />
                </div>
              </div>

              {/* Image upload with Drag & Drop */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-2">صورة المنتج (رابط أو رفع ملف) *</label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-[#C8A45C]/40 bg-[#1A1A1A] p-2 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {formData.image ? (
                      <img src={formData.image} alt="معاينة" className="max-w-full max-h-full object-cover rounded-xl" />
                    ) : (
                      <ImageIcon className="text-[#C8A45C]" size={28} />
                    )}
                  </div>
                  <div className="flex-1 w-full space-y-3">
                    <input
                      type="text"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="https://example.com/image.png"
                      className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                    />
                    <div className="flex items-center gap-3">
                      <label className="bg-[#3D3D3D] hover:bg-[#4D4D4D] text-[#C8A45C] border border-[#C8A45C]/40 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition">
                        <Upload size={16} />
                        رفع صورة من الجهاز
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                      <span className="text-xs text-zinc-400">الحد الأقصى 2 ميغابايت (PNG, JPG)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Pricing & Currency */}
          {formTab === "pricing" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-2">سعر المزود لكل وحدة ($)</label>
                  <input
                    type="text"
                    value={formData.providerUnitPrice}
                    onChange={(e) => setFormData({ ...formData, providerUnitPrice: e.target.value })}
                    placeholder="0.00000000"
                    className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-[#C8A45C]"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">تكلفة الشراء الأصلية من المزود (دعم دقة عالية حتى 12 خانة).</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-2">سعر البيع النهائي لكل وحدة ($) *</label>
                  <input
                    type="text"
                    required
                    value={formData.finalUnitPrice}
                    onChange={(e) => setFormData({ ...formData, finalUnitPrice: e.target.value })}
                    placeholder="0.00000000"
                    className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-4 py-3 text-sm font-mono text-[#FDE68A] font-bold focus:outline-none focus:border-[#C8A45C]"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">السعر الإجمالي الذي يدفعه العميل لكل وحدة.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-2">سعر الليرة السورية للعرض الداخلي فقط (اختياري)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.priceSyp}
                  onChange={(e) => setFormData({ ...formData, priceSyp: Number(e.target.value) })}
                  className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                />
              </div>

              {/* Live Preview Card */}
              <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-[#C8A45C]/30 space-y-4">
                <div className="text-sm font-bold text-[#FDE68A] flex items-center gap-2">
                  <DollarSign size={18} />
                  معاينة مباشرة لحساب الأرباح والأسعار
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="bg-[#2D2D2D] p-3 rounded-xl border border-zinc-700">
                    <div className="text-zinc-400">سعر المزود للوحدة</div>
                    <div className="font-mono text-white font-bold text-sm mt-1">${formatMoney(previewProvider)}</div>
                  </div>
                  <div className="bg-[#2D2D2D] p-3 rounded-xl border border-zinc-700">
                    <div className="text-zinc-400">سعر البيع النهائي للوحدة</div>
                    <div className="font-mono text-[#FDE68A] font-bold text-sm mt-1">${formatMoney(previewFinal)}</div>
                  </div>
                  <div className="bg-[#2D2D2D] p-3 rounded-xl border border-zinc-700">
                    <div className="text-zinc-400">الربح المحسوب للوحدة</div>
                    <div className="font-mono text-emerald-400 font-bold text-sm mt-1">+${formatMoney(previewProfit)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Quantities */}
          {formTab === "quantity" && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-2">نوع الكمية</label>
                  <select
                    value={formData.quantityType}
                    onChange={(e) => setFormData({ ...formData, quantityType: e.target.value })}
                    className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                  >
                    <option value="fixed">ثابتة</option>
                    <option value="range">مدى (Range)</option>
                    <option value="list">قائمة (List)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-2">نوع المنتج</label>
                  <select
                    value={formData.productType}
                    onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                    className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                  >
                    <option value="package">باقة (Package)</option>
                    <option value="amount">كمية (Amount)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-2">أقل كمية مسموحة</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minQuantity}
                    onChange={(e) => setFormData({ ...formData, minQuantity: Number(e.target.value) })}
                    className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-2">أعلى كمية مسموحة (اختياري)</label>
                  <input
                    type="number"
                    value={formData.maxQuantity}
                    onChange={(e) => setFormData({ ...formData, maxQuantity: e.target.value })}
                    placeholder="ترك فارغاً للكميات غير المحدودة"
                    className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Provider & Integration */}
          {formTab === "provider" && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-2">المزود المرتبط</label>
                  <select
                    value={formData.providerId}
                    onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
                    className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                  >
                    <option value="">بدون مزود (يدوي)</option>
                    {providers.map((p) => (
                      <option key={p.id} value={String(p.id)}>{p.name} (ID: {p.id})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-2">معرف المنتج لدى المزود</label>
                  <input
                    type="number"
                    value={formData.providerProductId}
                    onChange={(e) => setFormData({ ...formData, providerProductId: e.target.value })}
                    className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                    placeholder="ID عند المزود"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-2">مصدر المنتج (Source)</label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Additional Settings */}
          {formTab === "additional" && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center gap-8 bg-[#1A1A1A] p-5 rounded-2xl border border-zinc-700">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.available}
                    onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                    className="w-5 h-5 accent-[#C8A45C] rounded"
                  />
                  <span className="text-sm font-bold text-white">المنتج متاح للعملاء في المتجر</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="w-5 h-5 accent-[#C8A45C] rounded"
                  />
                  <span className="text-sm font-bold text-[#FDE68A]">منتج مميز (يظهر في الواجهة الرئيسية)</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-2">وصف المنتج (اختياري)</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                  placeholder="اكتب تفاصيل إضافية عن المنتج والتعليمات..."
                />
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-700">
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className="px-6 py-3 bg-[#3D3D3D] hover:bg-[#4D4D4D] text-zinc-300 font-bold rounded-xl transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] font-black rounded-xl shadow-lg shadow-[#C8A45C]/30 transition cursor-pointer"
            >
              {editingId ? "حفظ التعديلات" : "إضافة المنتج الآن"}
            </button>
          </div>
        </form>
      )}
      <ImportFromProviderModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => loadData()}
        categories={categories}
      />
    </div>
  );
}
