import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Package, Server, Search, Filter, Download, RefreshCw,
  Eye, CheckCircle2, AlertTriangle, Layers, DollarSign, Sparkles, X
} from "lucide-react";
import { get, post } from "../lib/api";

export default function ApiProductsNew() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [remoteProducts, setRemoteProducts] = useState<any[]>([]);
  const [fetchingRemote, setFetchingRemote] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [toast, setToast] = useState<string | null>(null);
  const [detailProduct, setDetailProduct] = useState<any | null>(null);
  const [importingAll, setImportingAll] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [provRes, prodRes] = await Promise.all([
        get("/admin/providers").catch(() => []),
        get("/admin/products").catch(() => []),
      ]);
      if (Array.isArray(provRes)) setProviders(provRes);
      if (Array.isArray(prodRes)) setProducts(prodRes);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const fetchRemoteProducts = useCallback(async (provId: string) => {
    if (provId === "all") return;
    setFetchingRemote(true);
    try {
      const res = await get(`/admin/provider-products/${provId}`);
      if (Array.isArray(res)) {
        setRemoteProducts(res);
        showToast(`تم جلب ${res.length} منتج بنجاح من المزود`);
      } else {
        setRemoteProducts([]);
      }
    } catch (err: any) {
      alert(err?.message || "فشل جلب المنتجات من المزود الخارجي");
      setRemoteProducts([]);
    } finally {
      setFetchingRemote(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProvider !== "all") {
      fetchRemoteProducts(selectedProvider);
    } else {
      setRemoteProducts([]);
    }
  }, [selectedProvider, fetchRemoteProducts]);

  const handleImport = async (item: any) => {
    try {
      await post("/admin/provider-products/import", {
        providerId: Number(selectedProvider),
        name: item.name,
        price: item.price || item.priceUsd || 0,
        externalServiceId: item.externalServiceId || item.id,
        category: item.category || "عام",
      });
      showToast(`تم استيراد المنتج "${item.name}" بنجاح`);
      loadData();
    } catch (err: any) {
      alert(err?.message || "فشل استيراد المنتج");
    }
  };

  const handleImportAll = async () => {
    if (selectedProvider === "all") return;
    if (!window.confirm(`هل أنت متأكد من استيراد جميع المنتجات المتاحة (${remoteProducts.length} منتج) إلى المتجر المحلي؟`)) {
      return;
    }
    setImportingAll(true);
    try {
      let count = 0;
      for (const item of remoteProducts) {
        try {
          await post("/admin/provider-products/import", {
            providerId: Number(selectedProvider),
            name: item.name,
            price: item.price || item.priceUsd || 0,
            externalServiceId: item.externalServiceId || item.id,
            category: item.category || "عام",
          });
          count++;
        } catch {
          // ignore individual duplicate fails
        }
      }
      showToast(`تم استيراد ${count} منتج بنجاح إلى المتجر المحلي`);
      loadData();
    } catch (err: any) {
      alert(`حدث خطأ أثناء الاستيراد الجماعي: ${err.message}`);
    } finally {
      setImportingAll(false);
    }
  };

  const activeList = selectedProvider === "all" ? products : remoteProducts;

  // Extract categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    activeList.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [activeList]);

  const filtered = useMemo(() => {
    return activeList
      .filter((p) => {
        const matchSearch =
          (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
          String(p.id || "").includes(search) ||
          String(p.externalServiceId || "").includes(search);
        const matchCat = selectedCategory === "all" || p.category === selectedCategory;
        const matchStatus = statusFilter === "all" || (statusFilter === "active" ? p.active !== false : p.active === false);
        return matchSearch && matchCat && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === "name-asc") return (a.name || "").localeCompare(b.name || "");
        if (sortBy === "name-desc") return (b.name || "").localeCompare(a.name || "");
        if (sortBy === "price-asc") return Number(a.price || a.priceUsd || 0) - Number(b.price || b.priceUsd || 0);
        if (sortBy === "price-desc") return Number(b.price || b.priceUsd || 0) - Number(a.price || a.priceUsd || 0);
        return 0;
      });
  }, [activeList, search, selectedCategory, statusFilter, sortBy]);

  const avgPrice = useMemo(() => {
    if (activeList.length === 0) return 0;
    const sum = activeList.reduce((acc, p) => acc + Number(p.price || p.priceUsd || 0), 0);
    return (sum / activeList.length).toFixed(2);
  }, [activeList]);

  return (
    <div className="space-y-6" dir="rtl">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#C8A45C] text-[#1A1A1A] px-5 py-2.5 rounded-xl shadow-2xl font-bold flex items-center gap-2 border border-white/20 animate-bounce">
          <Sparkles size={16} />
          {toast}
        </div>
      )}

      {/* Header & Provider Selector */}
      <div className="bg-[#1A1A1A] border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#C8A45C]/15 border border-[#C8A45C]/30 flex items-center justify-center text-[#FDE68A] shadow-inner">
            <Package size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              منتجات المزودين عبر API <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#C8A45C]/20 text-[#FDE68A] border border-[#C8A45C]/40">متقدم</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              إدارة، جلب، واستيراد الخدمات والمنتجات الآلية من شبكات المزودين الخارجيين بكفاءة عالية
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Filter size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#C8A45C]" />
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="bg-[#2D2D2D] border border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#C8A45C] shadow-sm transition"
            >
              <option value="all">جميع المنتجات المحلية ({products.length})</option>
              {providers.map((prov) => (
                <option key={prov.id} value={String(prov.id)}>
                  مزود: {prov.name} ({prov.type || "API"})
                </option>
              ))}
            </select>
          </div>

          {selectedProvider !== "all" && (
            <>
              <button
                onClick={() => fetchRemoteProducts(selectedProvider)}
                disabled={fetchingRemote}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2D2D2D] hover:bg-[#353535] border border-slate-700 text-slate-200 text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={14} className={fetchingRemote ? "animate-spin text-[#C8A45C]" : "text-[#C8A45C]"} />
                <span>إعادة جلب المزود</span>
              </button>

              <button
                onClick={handleImportAll}
                disabled={importingAll || remoteProducts.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] text-xs font-black transition shadow-md disabled:opacity-50 cursor-pointer"
              >
                <Download size={14} />
                <span>{importingAll ? "جاري الاستيراد..." : `استيراد الكل (${remoteProducts.length})`}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] rounded-2xl border border-slate-800 p-4 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">المنتجات المعروضة</span>
            <div className="text-2xl font-black text-white font-mono">{activeList.length}</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Package size={20} />
          </div>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl border border-slate-800 p-4 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">متوسط السعر</span>
            <div className="text-2xl font-black text-emerald-400 font-mono">${avgPrice}</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl border border-slate-800 p-4 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">الفئات المتاحة</span>
            <div className="text-2xl font-black text-[#C8A45C] font-mono">{categories.length || 1}</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#C8A45C]/10 border border-[#C8A45C]/20 flex items-center justify-center text-[#C8A45C]">
            <Layers size={20} />
          </div>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl border border-slate-800 p-4 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">حالة المزود الحالي</span>
            <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {selectedProvider === "all" ? "قاعدة البيانات المحلية" : "متصل وجاهز"}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Server size={20} />
          </div>
        </div>
      </div>

      {/* Advanced Filters and Search Bar */}
      <div className="bg-[#1A1A1A] border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالاسم أو المعرف (ID)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#2D2D2D] border border-slate-700 rounded-xl pr-10 pl-4 py-2 text-xs text-white focus:outline-none focus:border-[#C8A45C] placeholder:text-slate-500 font-bold"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#2D2D2D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#C8A45C]"
            >
              <option value="all">جميع الفئات</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#2D2D2D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#C8A45C]"
          >
            <option value="all">جميع الحالات</option>
            <option value="active">متاح / نشط</option>
            <option value="inactive">غير متاح</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#2D2D2D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#C8A45C]"
          >
            <option value="name-asc">الترتيب: حسب الاسم (أ-ي)</option>
            <option value="name-desc">الترتيب: حسب الاسم (ي-أ)</option>
            <option value="price-asc">السعر: من الأقل للأعلى</option>
            <option value="price-desc">السعر: من الأعلى للأقل</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#1A1A1A] border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Package size={18} className="text-[#C8A45C]" />
            {selectedProvider === "all" ? "قائمة المنتجات المحلية المسجلة" : "قائمة منتجات المزود الخارجي (API)"}
          </h2>
          <span className="text-xs bg-[#2D2D2D] text-[#FDE68A] px-3 py-1 rounded-full border border-slate-700 font-mono font-bold">
            {filtered.length} منتج معروض
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#2D2D2D]/60 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">المعرف (ID)</th>
                <th className="p-4">اسم المنتج</th>
                <th className="p-4">الفئة</th>
                <th className="p-4">المزود / المصدر</th>
                <th className="p-4">السعر</th>
                <th className="p-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {loading || fetchingRemote ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400 font-bold">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw size={32} className="animate-spin text-[#C8A45C]" />
                      <span>جاري مزامنة وجلب المنتجات...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-500 font-bold">
                    <AlertTriangle size={32} className="mx-auto mb-2 opacity-40 text-[#C8A45C]" />
                    لا توجد منتجات مطابقة للبحث أو لم يتم جلب المنتجات من المزود بعد.
                  </td>
                </tr>
              ) : (
                filtered.map((p, idx) => (
                  <tr key={p.id || idx} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-mono text-[#C8A45C] font-bold">
                      #{p.externalServiceId || p.id}
                    </td>
                    <td className="p-4 font-bold text-white">{p.name}</td>
                    <td className="p-4 text-slate-300">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] text-slate-300 border border-slate-700">
                        {p.category || "عام"}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-[#C8A45C]">
                        <Server size={12} /> {selectedProvider === "all" ? (p.providerName || "المحلي") : "مزود خارجي"}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-black text-emerald-400">
                      ${Number(p.price || p.priceUsd || 0).toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setDetailProduct(p)}
                          className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold transition flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <Eye size={13} /> التفاصيل
                        </button>
                        {selectedProvider !== "all" && (
                          <button
                            onClick={() => handleImport(p)}
                            className="px-3 py-1.5 rounded-xl bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] font-bold transition flex items-center gap-1 text-[11px] shadow-sm cursor-pointer"
                          >
                            <Download size={13} /> استيراد
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Detail Modal */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#C8A45C]/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setDetailProduct(null)}
              className="absolute left-5 top-5 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#FDE68A]">
                <Package size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">تفاصيل المنتج</h3>
                <p className="text-xs text-slate-400 font-mono">ID: #{detailProduct.id || detailProduct.externalServiceId}</p>
              </div>
            </div>

            <div className="space-y-3 bg-[#2D2D2D] p-4 rounded-2xl border border-slate-800 text-xs text-slate-300">
              <div className="flex justify-between py-1.5 border-b border-slate-700">
                <span className="text-slate-400">اسم المنتج:</span>
                <span className="font-bold text-white">{detailProduct.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-700">
                <span className="text-slate-400">السعر:</span>
                <span className="font-mono font-bold text-emerald-400">${Number(detailProduct.price || detailProduct.priceUsd || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-700">
                <span className="text-slate-400">الفئة:</span>
                <span className="font-bold text-white">{detailProduct.category || "عام"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">معرف الخدمة الخارجية:</span>
                <span className="font-mono text-[#FDE68A]">{detailProduct.externalServiceId || detailProduct.id || "—"}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDetailProduct(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
              >
                إغلاق
              </button>
              {selectedProvider !== "all" && (
                <button
                  onClick={() => {
                    handleImport(detailProduct);
                    setDetailProduct(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] text-xs font-black transition shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Download size={14} /> استيراد المنتج الآن
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
