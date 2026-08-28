import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { get } from "../lib/api";
import { Copy, Check, ArrowRight, Search, Server, Info } from "lucide-react";

interface ProviderProduct {
  id: number;
  name: string;
  price: number;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    if (!id || id === "undefined") {
      setError("معرف المزود غير صالح. الرجاء العودة واختيار مزود.");
      setLoading(false);
      return;
    }

    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await get<{ provider: string; products: ProviderProduct[]; isCustom?: boolean }>(`/providers/${id}/products`);
        setProviderName(data.provider || "");
        setIsCustom(!!data.isCustom);
        setProducts(data.products || []);
      } catch (err: any) {
        setError(err.message || "فشل جلب المنتجات");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [id]);

  useEffect(() => {
    if (searchParams.get("search") === "1") {
      const el = document.getElementById("provider-products-search") as HTMLInputElement | null;
      if (el) setTimeout(() => el.focus(), 80);
    }
  }, [searchParams]);

  const copyToClipboard = (text: number) => {
    navigator.clipboard.writeText(String(text)).then(() => {
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const filteredProducts = products.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(p.id).toLowerCase().includes(q) ||
      String(p.name || "").toLowerCase().includes(q) ||
      String(p.category || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/providers")}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#C8A45C] bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm transition-colors"
          >
            <ArrowRight size={16} /> العودة للمزودين
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Server size={20} className="text-[#C8A45C]" />
              منتجات المزود: {providerName || `#${id}`}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              استعراض معرفات وأسعار المنتجات لدى المزود لربطها بمتجرك
            </p>
          </div>
        </div>
      </div>

      {isCustom && (
        <div className="bg-[#C8A45C]/10 border border-[#C8A45C]/30 rounded-xl p-3.5 flex items-center gap-3 text-sm text-[#8C6D23]">
          <Info size={18} className="text-[#C8A45C] flex-shrink-0" />
          <span>هذا مزود مخصص / يدوي (Custom Provider). القائمة أدناه تعرض المنتجات المعينة لهذا المزود محلياً.</span>
        </div>
      )}

      <div className="relative max-w-md">
        <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id="provider-products-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالمعرف (ID) أو الاسم أو الفئة..."
          className="w-full border border-slate-300 rounded-xl pr-10 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A45C] focus:border-[#C8A45C]"
        />
      </div>

      {loading && <div className="text-center py-12 text-slate-400">جاري تحميل المنتجات...</div>}
      {error && <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">{error}</div>}

      {!loading && !error && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="text-right px-4 py-3.5 font-semibold">المعرف (ID)</th>
                  <th className="text-right px-4 py-3.5 font-semibold">الاسم</th>
                  <th className="text-right px-4 py-3.5 font-semibold">الفئة</th>
                  <th className="text-right px-4 py-3.5 font-semibold">السعر (USD)</th>
                  <th className="text-center px-4 py-3.5 font-semibold">نسخ المعرف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      لا توجد منتجات مطابقة
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#8C6D23] bg-amber-50/40">{p.id}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                      <td className="px-4 py-3 text-slate-500">{p.category}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-700">${Number(p.price || 0).toFixed(4)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => copyToClipboard(p.id)}
                          className="p-1.5 text-slate-400 hover:text-[#C8A45C] hover:bg-[#C8A45C]/10 rounded-lg transition-colors"
                          title="نسخ المعرف"
                        >
                          {copiedId === p.id ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

