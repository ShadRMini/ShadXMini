import { useGetProfile, useListBanners, useListCategories } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Wallet, Plus, Layers, Hash, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicJson } from "@/lib/public-api";
import { useAuth } from "@/lib/auth-context";
import CategoryCard from "@/components/categories/CategoryCard";
import BannerCarousel, { BannerItem } from "@/components/home/BannerCarousel";
import AnnouncementBar from "@/components/layout/AnnouncementBar";

type CategoryItem = {
  id: string;
  name: string;
  image: string;
  imageVersion?: string;
  order: number;
  active: boolean;
  productCount: number;
  columnsCount?: number;
};

function readLocalTelegramUser() {
  try {
    const user = (globalThis as any)?.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!user?.id) return null;
    const username = String(
      user.username || `${user.first_name || ""} ${user.last_name || ""}`.trim() || "TelegramUser",
    );
    return {
      telegramId: String(user.id),
      username,
    };
  } catch {
    return null;
  }
}

export default function Home() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading, isError: profileError } = useGetProfile();
  const { data: banners, isLoading: bannersLoading } = useListBanners();
  const { data: categories, isLoading: categoriesLoading } = useListCategories();
  const [fallbackCategories, setFallbackCategories] = useState<CategoryItem[] | null>(null);

  const [showFeaturedOffers, setShowFeaturedOffers] = useState<boolean>(true);
  const [featuredBanners, setFeaturedBanners] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    getPublicJson<CategoryItem[]>("/categories")
      .then((rows) => {
        if (!cancelled) setFallbackCategories(rows.filter((cat) => cat.active));
      })
      .catch((error) => {
        console.error("Fallback categories load failed:", error);
      });

    // Fetch Featured Offers setting & items
    getPublicJson<{ showFeaturedOffers: boolean }>("/public/settings/show-featured-offers")
      .then((res) => {
        if (!cancelled && res) {
          setShowFeaturedOffers(Boolean(res.showFeaturedOffers));
        }
      })
      .catch(() => {});

    getPublicJson<any[]>("/public/banners/featured")
      .then((items) => {
        if (!cancelled && Array.isArray(items)) {
          setFeaturedBanners(items);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const localTelegramUser = readLocalTelegramUser();
  const isInsideTelegram = Boolean((globalThis as any)?.Telegram?.WebApp);
  const visibleCategories: CategoryItem[] = (fallbackCategories || categories || []).map((cat: any) => ({
    id: String(cat.id),
    name: String(cat.name || ""),
    image: String(cat.image || ""),
    imageVersion: cat.imageVersion ? String(cat.imageVersion) : undefined,
    order: Number(cat.order || 0),
    active: Boolean(cat.active),
    productCount: Number(cat.productCount || 0),
    columnsCount: Number(cat.columnsCount ?? cat.columns_count ?? 2),
  }));

  const displayName =
    user?.username ||
    profile?.username ||
    localTelegramUser?.username ||
    (isInsideTelegram ? "Telegram User" : "ضيفنا الكريم");

  const effectiveAvatar = user?.avatarUrl || profile?.avatarUrl;
  const effectiveDisplayId = user?.displayId || profile?.displayId || (user ? "1001" : "");

  const mappedBanners: BannerItem[] = (banners || []).map((b: any) => ({
    id: String(b.id),
    title: String(b.title || ""),
    image: String(b.image || ""),
    link: b.link ? String(b.link) : undefined,
    order: Number(b.order || 0),
  }));

  return (
    <div className="relative pb-10 animate-in fade-in duration-500 overflow-hidden" dir="rtl">
      <div className="home-stars" aria-hidden="true">
        <span className="shooting-star s1" />
        <span className="shooting-star s2" />
        <span className="shooting-star s3" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto space-y-6">
        {/* Top User & Balance Section */}
        <div className="px-2 sm:px-4">
          {/* User Welcome Row */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <Link href="/profile">
                <div className="relative cursor-pointer group">
                  {effectiveAvatar ? (
                    <img
                      src={effectiveAvatar}
                      alt={displayName}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-[#C8A45C]/50 shadow-md group-hover:border-[#C8A45C] transition"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2D2D2D] to-[#1A1A1A] flex items-center justify-center border-2 border-[#C8A45C]/40 shadow-md group-hover:border-[#C8A45C] transition">
                      <span className="text-[#C8A45C] font-black text-xl">
                        {displayName ? displayName.charAt(0).toUpperCase() : "X"}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
              <div>
                <p className="text-[11px] text-zinc-400 font-bold">أهلاً بك يا</p>
                <p className="text-sm sm:text-base font-black text-white">
                  {profileLoading && !displayName ? <Skeleton className="h-4 w-20" /> : displayName}
                </p>
              </div>
            </div>

            {/* Display ID Badge */}
            {effectiveDisplayId && (
              <div className="flex items-center gap-1.5 bg-[#2D2D2D] border border-[#C8A45C]/40 px-3.5 py-1.5 rounded-2xl shadow-md">
                <Hash size={15} className="text-[#C8A45C]" />
                <span className="text-xs text-zinc-400 font-bold hidden sm:inline">المعرف:</span>
                <span className="text-xs sm:text-sm font-mono font-black text-[#FDE68A]">
                  #{effectiveDisplayId}
                </span>
              </div>
            )}
          </div>

          {/* Balance Card */}
          <div className="rounded-3xl bg-gradient-to-br from-[#2D2D2D] via-[#222222] to-[#1A1A1A] border border-[#C8A45C]/40 shadow-xl overflow-hidden relative p-5 sm:p-6 text-white">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#C8A45C]/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#C8A45C]/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <div className="flex justify-between items-center relative z-10">
              <div>
                <div className="flex items-center gap-2 text-zinc-400 mb-1">
                  <Wallet className="w-4 h-4 text-[#C8A45C]" />
                  <span className="text-xs sm:text-sm font-bold">الرصيد المتاح في المحفظة</span>
                </div>
                <div className="text-2xl sm:text-4xl font-black text-white flex items-baseline gap-1.5 tracking-tight">
                  <span className="text-[#C8A45C] font-bold">$</span>
                  {profileLoading ? (
                    <Skeleton className="h-9 w-28 bg-zinc-700" />
                  ) : (
                    Number(profile?.balanceUsd ?? user?.balanceUsd ?? 0).toFixed(2)
                  )}
                  <span className="text-xs text-zinc-400 font-normal mr-2">USD</span>
                </div>
              </div>

              <Link href="/deposit">
                <div className="bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] shadow-lg shadow-[#C8A45C]/25 rounded-2xl px-5 py-3 flex items-center gap-2 text-sm font-black transition-all active:scale-95 cursor-pointer">
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>شحن الرصيد</span>
                </div>
              </Link>
            </div>
          </div>

          {profileError && !localTelegramUser && (
            <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              لم تصل بيانات تيليجرام إلى المتجر. اضغط /start ثم افتح المتجر من زر البوت.
            </div>
          )}
        </div>

        {/* Banner Carousel Component */}
        <BannerCarousel banners={mappedBanners} isLoading={bannersLoading} />

        {/* Announcement / News Ticker Bar */}
        <AnnouncementBar />

        {/* Featured Offers Section (If Enabled by Admin and items exist) */}
        {showFeaturedOffers && featuredBanners.length > 0 && (
          <div className="px-2 sm:px-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#C8A45C]/30">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <Sparkles size={16} />
                </div>
                <h2 className="text-base sm:text-lg font-black text-amber-200">العروض المميزة ⭐</h2>
              </div>
              <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                حصرياً
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {featuredBanners.map((offer) => {
                const offerLink = offer.link && offer.link.trim().length > 0 ? offer.link.trim() : "/deposit";
                const isExternal = offerLink.startsWith("http://") || offerLink.startsWith("https://");

                const cardContent = (
                  <div className="group relative rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#1c1913] via-[#181510] to-zinc-950 p-4 shadow-xl hover:border-amber-500/60 transition-all flex items-center gap-4 overflow-hidden">
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-amber-500/20">
                      <img src={offer.image} alt={offer.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="inline-block px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                        عرض مميز
                      </div>
                      <h3 className="text-sm font-bold text-amber-100 truncate">{offer.title}</h3>
                      {offer.description && (
                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{offer.description}</p>
                      )}
                      <div className="pt-1 flex items-center gap-1 text-[11px] font-bold text-amber-400 group-hover:translate-x-[-2px] transition-transform">
                        <span>اكتشف العرض</span>
                        <span>←</span>
                      </div>
                    </div>
                  </div>
                );

                return isExternal ? (
                  <a key={offer.id} href={offerLink} target="_blank" rel="noopener noreferrer">
                    {cardContent}
                  </a>
                ) : (
                  <Link key={offer.id} href={offerLink}>
                    {cardContent}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Categories Section */}
        <div className="px-2 sm:px-4">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#FDE68A]">
                <Layers size={16} />
              </div>
              <h2 className="text-base sm:text-lg font-black text-[#FDE68A]">الأقسام والخدمات</h2>
            </div>
            <span className="text-xs text-zinc-400 font-bold">
              {visibleCategories.length} {visibleCategories.length === 1 ? "قسم" : "أقسام"}
            </span>
          </div>

          {categoriesLoading && visibleCategories.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="w-full aspect-square rounded-2xl bg-zinc-800" />
                  <Skeleton className="h-3 w-16 bg-zinc-800" />
                </div>
              ))}
            </div>
          ) : visibleCategories.length > 0 ? (
            <div
              className="grid gap-3.5 sm:gap-4"
              style={{
                gridTemplateColumns: `repeat(${visibleCategories[0]?.columnsCount || 2}, minmax(0, 1fr))`,
              }}
            >
              {visibleCategories.map((cat, i) => (
                <CategoryCard
                  key={cat.id}
                  id={cat.id}
                  name={cat.name}
                  image={cat.image}
                  imageVersion={cat.imageVersion}
                  productCount={cat.productCount}
                  index={i}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-zinc-800 bg-[#2D2D2D] px-4 py-10 text-center text-sm text-zinc-400">
              <Layers className="w-10 h-10 mx-auto mb-2 text-[#C8A45C]" />
              <p className="font-bold text-white">لا توجد أقسام متاحة حالياً</p>
              <p className="text-xs text-zinc-400 mt-1">سيتم إضافة وتفعيل الأقسام قريباً.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


