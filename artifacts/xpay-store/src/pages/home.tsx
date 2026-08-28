import { useGetProfile, useListBanners, useListCategories } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Wallet, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { getPublicJson } from "@/lib/public-api";
import { useAuth } from "@/lib/auth-context";
import CategoryCard from "@/components/categories/CategoryCard";

type CategoryItem = {
  id: string;
  name: string;
  image: string;
  imageVersion?: string;
  order: number;
  active: boolean;
  productCount: number;
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

  useEffect(() => {
    let cancelled = false;
    getPublicJson<CategoryItem[]>("/categories")
      .then((rows) => {
        if (!cancelled) setFallbackCategories(rows.filter((cat) => cat.active));
      })
      .catch((error) => {
        console.error("Fallback categories load failed:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const [emblaRef] = useEmblaCarousel({ loop: true, direction: "rtl" }, [Autoplay({ delay: 3000 })]);
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
  }));

  const displayName =
    user?.username ||
    profile?.username ||
    localTelegramUser?.username ||
    (isInsideTelegram ? "Telegram User" : "ضيف");

  const effectiveAvatar = user?.avatarUrl || profile?.avatarUrl;
  const effectiveDisplayId = user?.displayId || profile?.displayId || (user ? "1001" : "");

  return (
    <div className="relative pb-8 animate-in fade-in duration-500 overflow-hidden">
      <div className="home-stars" aria-hidden="true">
        <span className="shooting-star s1" />
        <span className="shooting-star s2" />
        <span className="shooting-star s3" />
      </div>

      <div className="relative z-10">
        <div className="p-4 pt-6 bg-gradient-to-b from-card/50 to-transparent">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <Link href="/profile">
                <div className="relative cursor-pointer group">
                  {effectiveAvatar ? (
                    <img
                      src={effectiveAvatar}
                      alt={displayName}
                      className="w-11 h-11 rounded-2xl object-cover border-2 border-primary/40 shadow-md group-hover:border-primary transition"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center border-2 border-primary/30 shadow-md group-hover:border-primary transition">
                      <span className="text-primary font-black text-lg">
                        {displayName ? displayName.charAt(0).toUpperCase() : "S"}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
              <div>
                <p className="text-xs text-muted-foreground font-medium">أهلاً بك يا</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">
                    {profileLoading && !displayName ? <Skeleton className="h-4 w-20" /> : displayName}
                  </p>
                  {effectiveDisplayId && (
                    <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg border border-primary/25 shadow-xs">
                      #{effectiveDisplayId}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Card className="xpay-brand-card shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <CardContent className="p-6 relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Wallet className="w-4 h-4 text-primary" />
                    <span className="text-sm">الرصيد المتاح</span>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1 flex items-baseline gap-1">
                    <span className="text-primary">$</span>
                    {profileLoading ? <Skeleton className="h-8 w-24" /> : (profile?.balanceUsd || 0).toFixed(2)}
                  </div>
                </div>
                <Link href="/deposit">
                  <div className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 rounded-full px-4 py-2 flex items-center gap-2 text-sm font-bold transition-transform active:scale-95 cursor-pointer">
                    <Plus className="w-4 h-4" />
                    <span>شحن</span>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {profileError && !localTelegramUser && (
            <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              لم تصل بيانات تيليجرام إلى المتجر. اضغط /start ثم افتح المتجر من زر البوت.
            </div>
          )}
        </div>

        <div className="px-4 mb-8">
          {bannersLoading ? (
            <Skeleton className="w-full h-40 rounded-2xl" />
          ) : banners && banners.length > 0 ? (
            <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
              <div className="flex">
                {banners.map((banner) => (
                  <div key={banner.id} className="flex-[0_0_100%] min-w-0 relative h-40">
                    <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4">
                      <h3 className="text-white font-bold text-lg drop-shadow-md">{banner.title}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">الأقسام</h2>
          </div>

          {categoriesLoading && visibleCategories.length === 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="w-full aspect-square rounded-2xl" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : visibleCategories.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-3 gap-y-5 sm:gap-4">
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
            <div className="rounded-2xl border border-white/10 bg-card/70 px-4 py-6 text-center text-sm text-muted-foreground">
              لا توجد أقسام متاحة حالياً.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

