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
    <div className="p-4 sm:p-6 min-h-screen pb-24 bg-[#1A1A1A] text-white max-w-6xl mx-auto" dir="rtl">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#C8A45C]">
            <Heart size={22} className="fill-[#C8A45C]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#FDE68A]">مفضلتي</h1>
            <p className="text-xs text-zinc-400 font-medium">المنتجات والخدمات المحفوظة</p>
          </div>
        </div>
        <Link href="/">
          <button className="flex items-center gap-1.5 text-xs font-bold text-[#C8A45C] hover:text-[#FDE68A] bg-[#2D2D2D] border border-[#C8A45C]/30 hover:border-[#C8A45C] px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer">
            <span>العودة للمتجر</span>
            <ArrowRight size={14} />
          </button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#2D2D2D] p-4 rounded-2xl border border-[#C8A45C]/20">
              <Skeleton className="w-full h-32 rounded-xl mb-3 bg-zinc-800" />
              <Skeleton className="h-4 w-3/4 mb-2 bg-zinc-800" />
              <Skeleton className="h-4 w-1/3 bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-950/40 border border-red-800/50 text-red-300 p-6 rounded-2xl text-center">
          <p className="text-sm font-bold">{error}</p>
          <button
            onClick={fetchFavorites}
            className="mt-3 px-4 py-2 bg-[#C8A45C] text-[#1A1A1A] font-bold rounded-xl text-xs"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : favorites.length === 0 ? (
        <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 rounded-3xl p-10 text-center shadow-md my-6">
          <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border border-[#C8A45C]/30 flex items-center justify-center mx-auto mb-4 text-[#C8A45C]">
            <Heart size={28} />
          </div>
          <h3 className="text-base font-bold text-white mb-1">لا توجد منتجات في المفضلة بعد</h3>
          <p className="text-xs text-zinc-400 mb-5">
            يمكنك تصفح المنتجات في المتجر والضغط على أيقونة القلب لحفظها هنا
          </p>
          <Link href="/">
            <button className="bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] font-black px-6 py-3 rounded-xl text-xs shadow-md shadow-[#C8A45C]/25 transition cursor-pointer">
              تصفح الأقسام والخدمات
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {favorites.map((p) => (
            <Link key={p.id} href={`/products/${p.id}`}>
              <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 hover:border-[#C8A45C] rounded-2xl p-4 transition-all duration-300 hover:shadow-[0_0_15px_rgba(200,164,92,0.2)] relative group cursor-pointer flex flex-col justify-between h-full">
                <button
                  onClick={(e) => removeFavorite(p.id, e)}
                  title="حذف من المفضلة"
                  className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-[#1A1A1A]/90 border border-[#C8A45C]/40 text-red-400 hover:text-red-300 hover:bg-red-950/60 flex items-center justify-center shadow-xs transition cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>

                <div>
                  <div className="w-full h-32 rounded-xl bg-[#1A1A1A] overflow-hidden mb-3 relative">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <ShoppingBag size={32} />
                      </div>
                    )}
                    <span className="absolute bottom-2 right-2 bg-[#1A1A1A]/90 border border-[#C8A45C]/30 text-[#C8A45C] text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {p.categoryName}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white line-clamp-1 mb-1 group-hover:text-[#FDE68A] transition-colors">{p.name}</h3>
                  {p.description && (
                    <p className="text-xs text-zinc-400 line-clamp-2 mb-3">{p.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-700/60 mt-2">
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-medium">السعر</span>
                    <span className="text-sm font-black text-[#FDE68A]">
                      ${Number(p.priceUsd || 0).toFixed(2)}
                    </span>
                  </div>
                  <span className="text-xs font-black text-[#1A1A1A] bg-[#C8A45C] group-hover:bg-[#B8954A] px-3 py-1.5 rounded-lg transition shadow-xs">
                    طلب الآن
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
