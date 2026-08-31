import { useState, useEffect } from "react";
import { Package, Server, Search, Filter, Download, RefreshCw } from "lucide-react";
import { get, post } from "../lib/api";

export default function ApiProducts() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [remoteProducts, setRemoteProducts] = useState<any[]>([]);
  const [fetchingRemote, setFetchingRemote] = useState(false);

  const loadData = async () => {
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
  };

  useEffect(() => {
    loadData();
  }, []);

  const fetchRemoteProducts = async (provId: string) => {
    if (provId === "all") return;
    setFetchingRemote(true);
    try {
      const res = await get(`/admin/provider-products/${provId}`);
      if (Array.isArray(res)) {
        setRemoteProducts(res);
      } else {
        setRemoteProducts([]);
      }
    } catch (err: any) {
      alert(err?.message || "فشل جلب المنتجات من المزود الخارجي");
      setRemoteProducts([]);
    } finally {
      setFetchingRemote(false);
    }
  };

  useEffect(() => {
    if (selectedProvider !== "all") {
      fetchRemoteProducts(selectedProvider);
    } else {
      setRemoteProducts([]);
    }
  }, [selectedProvider]);

  const handleImport = async (item: any) => {
    try {
      await post("/admin/provider-products/import", {
        providerId: Number(selectedProvider),
        name: item.name,
        price: item.price || 0,
        externalServiceId: item.externalServiceId || item.id,
      });
      alert("تم استيراد المنتج بنجاح إلى قاعدة البيانات المحلية");
      loadData();
    } catch (err: any) {
      alert(err?.message || "فشل استيراد المنتج");
    }
  };

  const displayList = selectedProvider === "all" ? products : remoteProducts;
  const filtered = displayList.filter((p) => {
    const matchSearch = (p.name || "").toLowerCase().includes(search.toLowerCase()) || String(p.id).includes(search);
    return matchSearch;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#2D2D2D] border border-[#C8A45C]/30 p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#FDE68A]">
            <Package size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#FDE68A]">منتجات عبر API</h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">جلب واستيراد المنتجات من المزودين الخارجيين وعرض الأسعار</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="bg-[#1A1A1A] border border-[#C8A45C]/40 rounded-xl pr-9 pl-4 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-[#C8A45C]"
            >
              <option value="all">جميع المزودين (المحلي)</option>
              {providers.map((prov) => (
                <option key={prov.id} value={String(prov.id)}>
                  {prov.name}
                </option>
              ))}
            </select>
          </div>
          {selectedProvider !== "all" && (
            <button
              onClick={() => fetchRemoteProducts(selectedProvider)}
              className="flex items-center gap-2 bg-[#C8A45C] hover:bg-[#b8934d] text-[#1A1A1A] font-bold px-4 py-2.5 rounded-xl transition shadow cursor-pointer"
            >
              <RefreshCw size={16} className={fetchingRemote ? "animate-spin" : ""} />
              <span>جلب المنتجات</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 p-4 rounded-2xl flex items-center gap-3">
        <Search size={18} className="text-[#C8A45C]" />
        <input
          type="text"
          placeholder="البحث باسم المنتج أو الـ ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-white text-sm focus:outline-none placeholder:text-zinc-500 font-bold"
        />
      </div>

      {/* Table */}
      <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-[#C8A45C]/20 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#FDE68A]">
            {selectedProvider === "all" ? "قائمة المنتجات المحلية" : "قائمة منتجات المزود الخارجي (API)"}
          </h2>
          <span className="text-xs bg-[#1A1A1A] text-zinc-300 px-3 py-1 rounded-full border border-zinc-700 font-bold">
            {filtered.length} منتج
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm border-collapse">
            <thead className="bg-[#1A1A1A] text-[#FDE68A] text-xs font-black border-b border-[#C8A45C]/30 select-none">
              <tr>
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">اسم المنتج</th>
                <th className="px-5 py-4">المزود</th>
                <th className="px-5 py-4">السعر (USD)</th>
                <th className="px-5 py-4">معلومات إضافية</th>
                {selectedProvider !== "all" && <th className="px-5 py-4 text-center">استيراد</th>}
              </tr>
            </thead>
            <tbody>
              {loading || fetchingRemote ? (
                <tr>
                  <td colSpan={selectedProvider !== "all" ? 6 : 5} className="text-center py-16 bg-[#242424] text-zinc-400 font-bold">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-2 border-[#C8A45C] border-t-transparent rounded-full animate-spin mb-2" />
                      <span className="text-sm font-bold text-[#FDE68A]">جاري جلب المنتجات من المزود...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={selectedProvider !== "all" ? 6 : 5} className="text-center py-16 bg-[#242424] text-zinc-400 font-bold">
                    لا توجد منتجات مطابقة أو لم يتم جلب المنتجات بعد. اختر مزوداً واضغط "جلب المنتجات".
                  </td>
                </tr>
              ) : (
                filtered.map((p, idx) => {
                  const isEven = idx % 2 === 0;
                  const rowBg = isEven ? "bg-[#242424]" : "bg-[#2D2D2D]";

                  return (
                    <tr key={p.id || idx} className={`${rowBg} border-b border-[#C8A45C]/10 hover:bg-[#353535] transition-colors`}>
                      <td className="px-5 py-3.5 font-mono text-[#C8A45C] font-bold">
                        <span className="bg-[#1A1A1A] px-2 py-0.5 rounded-lg border border-[#C8A45C]/20 inline-block">
                          #{p.id}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-white">{p.name}</td>
                      <td className="px-5 py-3.5 text-zinc-300">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1A1A1A] border border-[#C8A45C]/20 text-xs text-[#FDE68A]">
                          <Server size={12} className="text-[#C8A45C]" /> {selectedProvider === "all" ? (p.providerName || "المحلي") : "مزود API"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[#FDE68A] font-black">
                        <span className="bg-[#1A1A1A] px-2 py-0.5 rounded-lg border border-[#C8A45C]/30 inline-block">
                          ${Number(p.price || p.priceUsd || 0).toFixed(4)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-zinc-400">
                        {p.externalServiceId ? `External ID: ${p.externalServiceId}` : "نشط ومستقر"}
                      </td>
                      {selectedProvider !== "all" && (
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => handleImport(p)}
                            className="inline-flex items-center gap-1.5 bg-[#C8A45C] hover:bg-[#b8934d] text-[#1A1A1A] px-3.5 py-1.5 rounded-xl text-xs font-black transition shadow cursor-pointer"
                          >
                            <Download size={13} /> استيراد للمتجر
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
