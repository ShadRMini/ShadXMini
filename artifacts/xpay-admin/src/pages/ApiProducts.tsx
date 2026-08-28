import { useState, useEffect } from "react";
import { Package, Server, Search, ExternalLink, Filter } from "lucide-react";
import { get } from "../lib/api";

export default function ApiProducts() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [search, setSearch] = useState("");

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

  const filtered = products.filter((p) => {
    const matchSearch = (p.name || "").toLowerCase().includes(search.toLowerCase()) || String(p.id).includes(search);
    const matchProv = selectedProvider === "all" || String(p.providerId) === selectedProvider || String(p.provider_id) === selectedProvider;
    return matchSearch && matchProv;
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
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">عرض وتصفية المنتجات حسب اختيار المزود وتفاصيل الأسعار والروابط</p>
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
              <option value="all">جميع المزودين</option>
              {providers.map((prov) => (
                <option key={prov.id} value={String(prov.id)}>
                  {prov.name}
                </option>
              ))}
            </select>
          </div>
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
          <h2 className="text-lg font-black text-[#FDE68A]">قائمة المنتجات المرتبطة بالمزودين</h2>
          <span className="text-xs bg-[#1A1A1A] text-zinc-300 px-3 py-1 rounded-full border border-zinc-700 font-bold">
            {filtered.length} منتج
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-[#1A1A1A] text-zinc-400 text-xs font-bold border-b border-[#C8A45C]/20">
              <tr>
                <th className="px-5 py-3.5">ID</th>
                <th className="px-5 py-3.5">اسم المنتج</th>
                <th className="px-5 py-3.5">المزود</th>
                <th className="px-5 py-3.5">السعر</th>
                <th className="px-5 py-3.5">معلومات إضافية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-zinc-400 font-bold">
                    جاري تحميل المنتجات...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-zinc-400 font-bold">
                    لا توجد منتجات مطابقة للبحث أو المزود المحدد
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-[#353535] transition-colors">
                    <td className="px-5 py-4 font-mono text-[#FDE68A] font-bold">#{p.id}</td>
                    <td className="px-5 py-4 font-bold text-white">{p.name}</td>
                    <td className="px-5 py-4 text-zinc-300">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1A1A1A] border border-zinc-700 text-xs text-[#C8A45C]">
                        <Server size={12} /> {p.providerName || p.provider_name || "مزود خارجي"}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-emerald-400 font-bold">${Number(p.price || 0).toFixed(2)}</td>
                    <td className="px-5 py-4 text-xs text-zinc-400">
                      {p.externalServiceId ? `External ID: ${p.externalServiceId}` : "نشط ومستقر"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
