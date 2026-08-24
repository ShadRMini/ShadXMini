import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Heart, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type FavoriteProduct = {
  favoriteId: string;
  favoritedAt: string;
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  image?: string;
  priceUsd: number;
  minTotalUsd: number;
  productType?: string;
  available: boolean;
  minQty: number;
  maxQty?: number;
  description?: string;
  isFavorite: boolean;
};

function apiBaseUrl() {
  return (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
}

export default function Favorites() {
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const baseUrl = apiBaseUrl();
      const token = localStorage.getItem("xpay_store_auth_token");
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}/api/favorites?_=${Date.now()}`, {
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("فشل تحميل قائمة المفضلة");
      }

      const data = await res.json();
      setFavorites(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const removeFavorite = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const baseUrl = apiBaseUrl();
      const token = localStorage.getItem("xpay_store_auth_token");
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}/api/favorites/${productId}`, {
        method: "DELETE",
        headers,
        credentials: "include",
      });

      if (res.ok) {
        setFavorites((prev) => prev.filter((p) => p.id !== productId));
        toast.success("تمت إزالة المنتج من المفضلة");
      }
    } catch {
      toast.error("فشل حذف المنتج من المفضلة");
    }
  };

  return (
    <div className="p-4 sm:p-6 min-h-screen pb-24" dir="rtl">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#C8A45C]/15 flex items-center justify-center text-[#C8A45C]">
            <Heart size={22} className="fill-[#C8A45C]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#111827]">مفضلتي</h1>
            <p className="text-xs text-slate-500 font-medium">المنتجات والخدمات المحفوظة</p>
          </div>
        </div>
        <Link href="/">
          <button className="flex items-center gap-1 text-xs font-bold text-[#C8A45C] hover:text-[#B8954A] bg-white border border-[#D1D5DB] px-3 py-2 rounded-xl shadow-xs transition">
            <span>العودة للمتجر</span>
            <ArrowRight size={14} />
          </button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-[#D1D5DB]">
              <Skeleton className="w-full h-32 rounded-xl mb-3" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-center">
          <p className="text-sm font-bold">{error}</p>
          <button
            onClick={fetchFavorites}
            className="mt-3 px-4 py-2 bg-[#C8A45C] text-white font-bold rounded-xl text-xs"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : favorites.length === 0 ? (
        <div className="bg-white border border-[#D1D5DB] rounded-3xl p-10 text-center shadow-sm my-6">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Heart size={28} />
          </div>
          <h3 className="text-base font-bold text-[#111827] mb-1">لا توجد منتجات في المفضلة بعد</h3>
          <p className="text-xs text-slate-500 mb-5">
            يمكنك تصفح المنتجات في المتجر والضغط على أيقونة القلب لحفظها هنا
          </p>
          <Link href="/">
            <button className="bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] font-extrabold px-6 py-3 rounded-xl text-xs shadow-md shadow-[#C8A45C]/25 transition">
              تصفح الأقسام الآن
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {favorites.map((p) => (
            <Link key={p.id} href={`/products/${p.id}`}>
              <div className="bg-white border border-[#D1D5DB] hover:border-[#C8A45C] rounded-2xl p-4 transition-all duration-300 hover:shadow-lg relative group cursor-pointer flex flex-col justify-between h-full">
                <button
                  onClick={(e) => removeFavorite(p.id, e)}
                  title="حذف من المفضلة"
                  className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-white/90 border border-slate-200 text-red-500 hover:bg-red-50 flex items-center justify-center shadow-xs transition"
                >
                  <Trash2 size={14} />
                </button>

                <div>
                  <div className="w-full h-32 rounded-xl bg-[#F5F2EB] overflow-hidden mb-3 relative">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ShoppingBag size={32} />
                      </div>
                    )}
                    <span className="absolute bottom-2 right-2 bg-[#1A1A1A]/80 text-[#C8A45C] text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {p.categoryName}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#111827] line-clamp-1 mb-1">{p.name}</h3>
                  {p.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">{p.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">السعر</span>
                    <span className="text-sm font-extrabold text-[#C8A45C]">
                      ${Number(p.priceUsd || 0).toFixed(2)}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 group-hover:bg-[#C8A45C] group-hover:text-white px-3 py-1.5 rounded-lg transition">
                    عرض الطلب
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
