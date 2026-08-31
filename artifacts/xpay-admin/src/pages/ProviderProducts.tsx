import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { get } from "../lib/api";
import {
  Copy, Check, ArrowRight, Search, Server, Info,
  Download, RefreshCw, FileSpreadsheet, Layers, DollarSign,
  Package, ExternalLink, Sparkles, Filter
} from "lucide-react";

interface ProviderProduct {
  id: number | string;
  name: string;
  price: number | string;
  category: string;
}

export default function ProviderProducts() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [providerName, setProviderName] = useState<string>("");
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [products, setProducts] = useState<ProviderProduct[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchProducts = async (isManualRefresh = false) => {
    if (!id || id === "undefined") {
      setError("معرف المزود غير صالح. الرجاء العودة واختيار مزود.");
      setLoading(false);
      return;
    }

    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = await get<{ provider: string; products: ProviderProduct[]; isCustom?: boolean }>(`/providers/${id}/products`);
      setProviderName(data.provider || "");
      setIsCustom(!!data.isCustom);
      setProducts(data.products || []);
      if (isManualRefresh) {
        setToast("تم تحديث قائمة منتجات المزود بنجاح");
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || "فشل جلب المنتجات من المزود");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [id]);

  useEffect(() => {
    if (searchParams.get("search") === "1") {
      const el = document.getElementById("provider-products-search") as HTMLInputElement | null;
      if (el) setTimeout(() => el.focus(), 80);
    }
  }, [searchParams]);

  const copyToClipboard = (text: string | number, label: string = "المعرف") => {
    navigator.clipboard.writeText(String(text)).then(() => {
      setCopiedId(text);
      setToast(`تم نسخ ${label}: ${text}`);
      setTimeout(() => setCopiedId(null), 2000);
      setTimeout(() => setToast(null), 2500);
    });
  };

  // Extract categories list
  const categoriesList = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchSearch =
        !q ||
        String(p.id).toLowerCase().includes(q) ||
        String(p.name || "").toLowerCase().includes(q) ||
        String(p.category || "").toLowerCase().includes(q);

      const matchCategory = selectedCategory === "all" || p.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [products, search, selectedCategory]);

  // Quick stats
  const stats = useMemo(() => {
    const total = products.length;
    const filteredCount = filteredProducts.length;
    const catsCount = categoriesList.length;
    const prices = products.map((p) => Number(p.price || 0)).filter((v) => !isNaN(v) && v > 0);
    const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    return { total, filteredCount, catsCount, avgPrice, minPrice, maxPrice };
  }, [products, filteredProducts, categoriesList]);

  // Export to CSV
  const exportCsv = () => {
    if (filteredProducts.length === 0) return;
    const headers = ["ID", "Name", "Category", "Price_USD"];
    const rows = filteredProducts.map((p) => [
      `"${String(p.id).replace(/"/g, '""')}"`,
      `"${String(p.name || "").replace(/"/g, '""')}"`,
      `"${String(p.category || "").replace(/"/g, '""')}"`,
      Number(p.price || 0).toFixed(4),
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `provider_${providerName || id}_products_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#C8A45C] text-[#1A1A1A] px-5 py-2.5 rounded-xl shadow-xl font-bold flex items-center gap-2 border border-white/20 animate-in fade-in slide-in-from-top-2">
          <Sparkles size={16} />
          {toast}
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/providers")}
            className="flex items-center gap-2 text-xs font-bold text-[#FDE68A] hover:text-[#1A1A1A] bg-[#1A1A1A] hover:bg-[#C8A45C] border border-[#C8A45C]/40 px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <ArrowRight size={16} /> العودة للمزودين
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#FDE68A] flex items-center gap-2.5">
              <Server size={22} className="text-[#C8A45C]" />
              منتجات المزود: <span className="text-white">{providerName || `#${id}`}</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              استعراض معرفات وأسعار المنتجات لدى المزود لربطها بمتجرك ومطابقتها
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchProducts(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#383838] text-[#FDE68A] border border-[#C8A45C]/40 px-3.5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            title="تحديث البيانات من المزود"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-[#C8A45C]" : "text-[#C8A45C]"} />
            {refreshing ? "جاري التحديث..." : "تحديث فوري"}
          </button>

          <button
            onClick={exportCsv}
            disabled={filteredProducts.length === 0}
            className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#383838] text-[#FDE68A] border border-[#C8A45C]/40 px-3.5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            title="تصدير النتائج إلى ملف CSV"
          >
            <Download size={14} className="text-[#C8A45C]" />
            تصدير CSV
          </button>

          <button
            onClick={() => navigate("/api-products")}
            className="flex items-center gap-2 bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer"
          >
            <ExternalLink size={14} />
            جدول الاستيراد المتقدم
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#2D2D2D] border border-[#C8A45C]/20 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-400 font-medium">إجمالي المنتجات</div>
            <div className="text-xl font-black text-[#FDE68A] mt-0.5">{stats.total}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-[#C8A45C]/30 flex items-center justify-center text-[#C8A45C]">
            <Package size={18} />
          </div>
        </div>

        <div className="bg-[#2D2D2D] border border-[#C8A45C]/20 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-400 font-medium">الأقسام والفئات</div>
            <div className="text-xl font-black text-white mt-0.5">{stats.catsCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-[#C8A45C]/30 flex items-center justify-center text-[#C8A45C]">
            <Layers size={18} />
          </div>
        </div>

        <div className="bg-[#2D2D2D] border border-[#C8A45C]/20 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-400 font-medium">متوسط السعر</div>
            <div className="text-xl font-black text-[#C8A45C] mt-0.5">${stats.avgPrice.toFixed(2)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-[#C8A45C]/30 flex items-center justify-center text-[#C8A45C]">
            <DollarSign size={18} />
          </div>
        </div>

        <div className="bg-[#2D2D2D] border border-[#C8A45C]/20 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-400 font-medium">نطاق الأسعار</div>
            <div className="text-xs font-bold text-white mt-1 font-mono">
              ${stats.minPrice.toFixed(2)} - ${stats.maxPrice.toFixed(2)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-[#C8A45C]/30 flex items-center justify-center text-[#C8A45C]">
            <Sparkles size={18} />
          </div>
        </div>
      </div>

      {isCustom && (
        <div className="bg-[#1A1A1A] border border-[#C8A45C]/40 rounded-2xl p-4 flex items-center gap-3.5 text-sm text-[#FDE68A] shadow-md">
          <div className="w-9 h-9 rounded-xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#C8A45C] shrink-0">
            <Info size={18} />
          </div>
          <span className="text-xs sm:text-sm leading-relaxed">
            هذا مزود مخصص / يدوي (Custom Provider). القائمة أدناه تعرض المنتجات والخدمات المعينة لهذا المزود محلياً.
          </span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 p-4 rounded-2xl shadow-lg flex flex-col md:flex-row gap-3.5 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#C8A45C]" />
          <input
            id="provider-products-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث سريع بالمعرف (ID) أو اسم المنتج أو الفئة..."
            className="w-full bg-[#1A1A1A] border border-[#C8A45C]/30 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#C8A45C] focus:border-[#C8A45C] transition-all"
          />
        </div>

        {categoriesList.length > 0 && (
          <div className="flex items-center gap-2 min-w-[200px]">
            <div className="relative w-full">
              <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C8A45C] pointer-events-none" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#C8A45C]/30 rounded-xl pr-9 pl-4 py-2.5 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#C8A45C] transition-all appearance-none cursor-pointer"
              >
                <option value="all" className="bg-[#1A1A1A] text-white">جميع الفئات ({categoriesList.length})</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#1A1A1A] text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="bg-[#2D2D2D] border border-[#C8A45C]/20 rounded-2xl p-16 text-center shadow-lg">
          <div className="w-10 h-10 border-3 border-[#C8A45C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-sm font-bold text-[#FDE68A]">جاري جلب منتجات المزود...</div>
          <div className="text-xs text-zinc-400 mt-1">يتم التواصل مع واجهة API الخارجية</div>
        </div>
      )}

      {error && (
        <div className="p-5 bg-rose-950/40 border border-rose-800/60 text-rose-300 rounded-2xl text-sm flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <Info size={20} className="text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchProducts(true)}
            className="px-3.5 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition border border-rose-700 cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Data Table */}
      {!loading && !error && (
        <div className="bg-[#2D2D2D] rounded-3xl shadow-xl border border-[#C8A45C]/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-right border-collapse">
              <thead className="bg-[#1A1A1A] text-[#FDE68A] border-b border-[#C8A45C]/30 select-none">
                <tr>
                  <th className="px-5 py-4 font-black w-24 text-right">المعرف (ID)</th>
                  <th className="px-5 py-4 font-black text-right">اسم المنتج</th>
                  <th className="px-5 py-4 font-black text-right">الفئة / التصنيف</th>
                  <th className="px-5 py-4 font-black text-right">السعر (USD)</th>
                  <th className="px-5 py-4 font-black text-center w-28">نسخ المعرف</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16 bg-[#242424] text-zinc-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package size={32} className="text-zinc-600 mb-1" />
                        <span className="text-sm font-bold text-zinc-300">لا توجد منتجات مطابقة لنتائج البحث</span>
                        <span className="text-xs text-zinc-500">جرب البحث بكلمة أخرى أو تغيير الفئة</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p, idx) => {
                    // Alternating row background for optimal readability: #242424 and #2D2D2D
                    const isEven = idx % 2 === 0;
                    const rowBg = isEven ? "bg-[#242424]" : "bg-[#2D2D2D]";

                    return (
                      <tr
                        key={p.id}
                        className={`${rowBg} border-b border-[#C8A45C]/10 hover:bg-[#353535] transition-colors duration-150`}
                      >
                        {/* ID Column */}
                        <td className="px-5 py-3.5 font-mono font-bold text-[#C8A45C] select-all">
                          <span className="bg-[#1A1A1A] px-2 py-1 rounded-lg border border-[#C8A45C]/20 inline-block">
                            {p.id}
                          </span>
                        </td>

                        {/* Name Column */}
                        <td className="px-5 py-3.5 font-bold text-[#FFFFFF]">
                          <div className="leading-snug">{p.name}</div>
                        </td>

                        {/* Category Column */}
                        <td className="px-5 py-3.5 text-zinc-300">
                          {p.category ? (
                            <span className="bg-[#1A1A1A] text-zinc-300 px-2.5 py-1 rounded-lg border border-[#C8A45C]/20 text-xs font-medium inline-block">
                              {p.category}
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>

                        {/* Price Column */}
                        <td className="px-5 py-3.5 font-mono font-black text-[#FDE68A] text-sm">
                          <span className="bg-[#1A1A1A] px-2.5 py-1 rounded-lg border border-[#C8A45C]/30 text-[#FDE68A] inline-block shadow-xs">
                            ${Number(p.price || 0).toFixed(4)}
                          </span>
                        </td>

                        {/* Copy Action Column */}
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => copyToClipboard(p.id, "معرف المنتج")}
                            className="inline-flex items-center justify-center p-2 text-zinc-300 hover:text-[#1A1A1A] bg-[#1A1A1A] hover:bg-[#C8A45C] border border-[#C8A45C]/30 rounded-xl transition-all cursor-pointer shadow-xs"
                            title="نسخ المعرف إلى الحافظة"
                          >
                            {copiedId === p.id ? (
                              <Check size={16} className="text-emerald-400" />
                            ) : (
                              <Copy size={16} />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="bg-[#1A1A1A] border-t border-[#C8A45C]/30 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 gap-2">
            <div>
              عرض <span className="font-bold text-[#FDE68A]">{filteredProducts.length}</span> من أصل{" "}
              <span className="font-bold text-white">{products.length}</span> منتج
            </div>
            <div className="text-[11px] text-zinc-500">
              * الأسعار المعروضة هي أسعار التكلفة الواردة مباشرة من واجهة مزود الخدمة
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


