import { useGetProfile, useListBanners, useListCategories } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Wallet, Plus, Layers, Hash, Sparkles, LogIn, UserPlus, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicJson } from "@/lib/public-api";
import { useAuth } from "@/lib/auth-context";
import { useStoreSettings } from "@/lib/store-settings-context";
import { useCurrency } from "@/lib/currency-context";
import CategoryCard from "@/components/categories/CategoryCard";
import BannerCarousel, { BannerItem } from "@/components/home/BannerCarousel";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import { PRODUCT_GRID_COLS, getProductGridClass } from "@/lib/grid-config";
import { toast } from "sonner";

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
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isGuest } = useAuth();
  const storeSettings = useStoreSettings();
  const { formatPrice, formatPriceWithSyp, baseCurrency } = useCurrency();
  const { data: profile, isLoading: profileLoading, isError: profileError } = useGetProfile();
  const { data: banners, isLoading: bannersLoading } = useListBanners();
  const { data: categories, isLoading: categoriesLoading } = useListCategories();
  const [fallbackCategories, setFallbackCategories] = useState<CategoryItem[] | null>(null);

  const [showFeaturedOffers, setShowFeaturedOffers] = useState<boolean>(true);
  const [featuredBanners, setFeaturedBanners] = useState<any[]>([]);

  useEffect(() => {
    if (isGuest) {
      try {
        localStorage.setItem("guest_visited", "true");
      } catch {
        // Ignore
      }
    }
  }, [isGuest]);

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
    subtitle: b.description ? String(b.description) : (b.subtitle ? String(b.subtitle) : undefined),
    image: String(b.image || ""),
    link: b.link ? String(b.link) : undefined,
    order: Number(b.order || 0),
    showDiscoverBtn: b.showDiscoverBtn ?? b.show_discover_btn ?? false,
    showAutoExecBtn: b.showAutoExecBtn ?? b.show_auto_exec_btn ?? false,
    showReliableBtn: b.showReliableBtn ?? b.show_reliable_btn ?? false,
    showFeaturedBtn: b.showFeaturedBtn ?? b.show_featured_btn ?? false,
  }));

  return (
    <div className="relative pb-10 animate-in fade-in duration-500 overflow-hidden" dir="rtl">
      <div className="home-stars" aria-hidden="true">
        <span className="shooting-star s1" />
        <span className="shooting-star s2" />
        <span className="shooting-star s3" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto space-y-6">
        {/* Top Section: Guest Preview Banner or User & Balance Section */}
        {isGuest ? (
          <div className="px-2 sm:px-4">
            <div
              className="rounded-3xl border-2 shadow-2xl overflow-hidden relative p-theme"
              style={{
                backgroundColor: "var(--theme-card, #2D2D2D)",
                borderColor: "var(--theme-border)",
                color: "var(--theme-text-primary, #E5E7EB)",
              }}
            >
              {/* Decorative Glow Orbs */}
              <div
                className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 20%, transparent)",
                }}
              />
              <div
                className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--theme-accent, #FDE68A) 10%, transparent)",
                }}
              />

              <div className="relative z-10 flex flex-col items-center text-center space-y-4 max-w-2xl mx-auto">
                {/* Badge */}
                <div
                  className="inline-flex items-center gap-2 border px-3.5 py-1.5 rounded-full text-xs font-bold shadow-xs"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 20%, transparent)",
                    borderColor: "var(--theme-border)",
                    color: "var(--theme-accent, #FDE68A)",
                  }}
                >
                  <Sparkles size={14} style={{ color: "var(--theme-primary, #C8A45C)" }} />
                  <span>استطلاع المتجر (وضع الزائر)</span>
                </div>

                {/* Title */}
                <h1
                  className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight"
                  style={{ color: "var(--theme-accent, #FDE68A)" }}
                >
                  {storeSettings.guestPreviewTitle || "مرحباً بك في متجرنا! استطلع الأقسام والمنتجات المتاحة"}
                </h1>

                {/* Subtitle */}
                <p
                  className="text-xs sm:text-sm leading-relaxed max-w-xl"
                  style={{ color: "var(--theme-text-muted, #9CA3AF)" }}
                >
                  {storeSettings.guestPreviewSubtitle || "تصفح تشكيلتنا الواسعة من الألعاب، البطاقات الرقمية، والاشتراكات. لبدء الشراء والاستمتاع بخدماتنا، سجل دخولك أو أنشئ حسابك الآن."}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full pt-2">
                  <Link href="/login" className="w-full sm:w-auto">
                    <button
                      className="w-full sm:w-auto min-w-[160px] hover:opacity-90 font-black text-sm px-6 py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2.5 transition active:scale-95 cursor-pointer"
                      style={{
                        backgroundColor: "var(--theme-primary, #C8A45C)",
                        color: "var(--theme-background, #0a0a0a)",
                      }}
                    >
                      <LogIn size={18} className="stroke-[2.5]" />
                      <span>{storeSettings.guestPreviewLoginButton || "تسجيل الدخول"}</span>
                    </button>
                  </Link>

                  <Link href="/register" className="w-full sm:w-auto">
                    <button
                      className="w-full sm:w-auto min-w-[160px] border font-black text-sm px-6 py-3.5 rounded-2xl shadow-md flex items-center justify-center gap-2.5 transition active:scale-95 cursor-pointer"
                      style={{
                        backgroundColor: "var(--theme-background, #0a0a0a)",
                        borderColor: "var(--theme-border)",
                        color: "var(--theme-accent, #FDE68A)",
                      }}
                    >
                      <UserPlus size={18} className="stroke-[2.5]" style={{ color: "var(--theme-primary, #C8A45C)" }} />
                      <span>{storeSettings.guestPreviewRegisterButton || "إنشاء حساب جديد"}</span>
                    </button>
                  </Link>
                </div>

                {/* Guest Note */}
                <div
                  className="pt-2 border-t w-full flex items-center justify-center gap-2 text-xs font-semibold"
                  style={{
                    borderColor: "var(--theme-border)",
                    color: "var(--theme-text-muted, #9CA3AF)",
                  }}
                >
                  <Info size={15} className="shrink-0" style={{ color: "var(--theme-primary, #C8A45C)" }} />
                  <span>
                    {storeSettings.guestPreviewNote || "لا يمكنك الشراء أو استخدام المتجر بدون حساب. اضغط على أي قسم أو منتج للتسجيل."}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
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
                        width="48"
                        height="48"
                        decoding="async"
                        className="w-12 h-12 rounded-2xl object-cover border-2 shadow-md transition"
                        style={{ borderColor: "var(--theme-border)" }}
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center border-2 shadow-md transition"
                        style={{
                          backgroundColor: "var(--theme-card, #2D2D2D)",
                          borderColor: "var(--theme-border)",
                        }}
                      >
                        <span className="font-black text-xl" style={{ color: "var(--theme-primary, #C8A45C)" }}>
                          {displayName ? displayName.charAt(0).toUpperCase() : "X"}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
                <div>
                  <p className="text-[11px] font-bold" style={{ color: "var(--theme-text-muted, #9CA3AF)" }}>أهلاً بك يا</p>
                  <p className="text-sm sm:text-base font-black" style={{ color: "var(--theme-accent, #FDE68A)" }}>
                    {profileLoading && !displayName ? <Skeleton className="h-4 w-20" /> : displayName}
                  </p>
                </div>
              </div>

              {/* Display ID Badge */}
              {effectiveDisplayId && (
                <div
                  className="flex items-center gap-1.5 border px-3.5 py-1.5 rounded-2xl shadow-md"
                  style={{
                    backgroundColor: "var(--theme-card, #2D2D2D)",
                    borderColor: "var(--theme-border)",
                  }}
                >
                  <Hash size={15} style={{ color: "var(--theme-primary, #C8A45C)" }} />
                  <span className="text-xs font-bold hidden sm:inline" style={{ color: "var(--theme-text-muted, #9CA3AF)" }}>المعرف:</span>
                  <span className="text-xs sm:text-sm font-mono font-black" style={{ color: "var(--theme-accent, #FDE68A)" }}>
                    #{effectiveDisplayId}
                  </span>
                </div>
              )}
            </div>

            {/* Balance Card */}
            <div 
              className="overflow-hidden relative text-white transition-all shadow-xl"
              style={{
                background: "var(--balance-gradient, linear-gradient(135deg, var(--theme-primary, #C8A45C) 0%, var(--theme-secondary, #B8954A) 50%, var(--theme-accent, #FDE68A) 100%))",
                color: "var(--balance-text-color, var(--theme-text-primary, #FFFFFF))",
                borderRadius: "var(--balance-radius, 24px)",
                padding: "var(--balance-padding, 20px)",
                boxShadow: "var(--balance-shadow, var(--theme-shadow))",
              }}
            >
              <div 
                className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"
                style={{ backgroundColor: "var(--balance-glow-color, var(--theme-primary, #C8A45C))", opacity: 0.18 }}
              />

              <div className="flex justify-between items-center relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1" style={{ color: "var(--balance-subtext-color, var(--theme-text-secondary, #E5E7EB))" }}>
                    <Wallet className="w-4 h-4" style={{ color: "var(--balance-badge-color, var(--theme-primary, #C8A45C))" }} />
                    <span className="font-bold" style={{ fontSize: "var(--balance-label-size, 14px)" }}>الرصيد المتاح في المحفظة</span>
                  </div>
                  <div className="font-black flex items-baseline gap-2 flex-wrap tracking-tight" style={{ color: "var(--balance-text-color, var(--theme-text-primary, #FFFFFF))", fontSize: "var(--balance-amount-size, 32px)" }}>
                    {profileLoading ? (
                      <Skeleton
                        className="h-9 w-28"
                        style={{ backgroundColor: "color-mix(in srgb, var(--theme-card, #1A1A1A) 50%, transparent)" }}
                      />
                    ) : (
                      <>
                        <span>{formatPrice(profile?.balanceUsd ?? user?.balanceUsd ?? 0)}</span>
                        {formatPriceWithSyp(profile?.balanceUsd ?? user?.balanceUsd ?? 0).secondary && (
                          <span className="text-xs sm:text-sm font-medium" style={{ color: "var(--balance-currency-color, var(--theme-text-secondary, #E5E7EB))" }}>
                            {formatPriceWithSyp(profile?.balanceUsd ?? user?.balanceUsd ?? 0).secondary}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <Link href="/deposit">
                  <div 
                    className="shadow-lg rounded-2xl px-5 py-3 flex items-center gap-2 text-sm font-black transition-all active:scale-95 cursor-pointer"
                    style={{
                      backgroundColor: "var(--balance-badge-color, var(--theme-primary, #C8A45C))",
                      color: "var(--theme-text-on-balance-badge, #0F172A)",
                    }}
                  >
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
        )}

        {/* Banner Carousel Component */}
        <BannerCarousel banners={mappedBanners} isLoading={bannersLoading} />

        {/* Announcement / News Ticker Bar */}
        <AnnouncementBar />

        {/* Featured Offers Section (If Enabled by Admin and items exist) */}
        {showFeaturedOffers && featuredBanners.length > 0 && (
          <div className="px-2 sm:px-4 space-y-3">
            <div
              className="flex items-center justify-between pb-2 border-b"
              style={{
                borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 30%, transparent)",
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg border flex items-center justify-center"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--theme-accent, #FDE68A) 20%, transparent)",
                    borderColor: "color-mix(in srgb, var(--theme-accent, #FDE68A) 40%, transparent)",
                    color: "var(--theme-accent, #FDE68A)",
                  }}
                >
                  <Sparkles size={16} />
                </div>
                <h2
                  className="text-base sm:text-lg font-black"
                  style={{ color: "var(--theme-text-primary, #E5E7EB)" }}
                >
                  العروض المميزة ⭐
                </h2>
              </div>
              <span
                className="text-xs font-bold px-2.5 py-0.5 rounded-full border"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--theme-accent, #FDE68A) 10%, transparent)",
                  borderColor: "color-mix(in srgb, var(--theme-accent, #FDE68A) 20%, transparent)",
                  color: "var(--theme-accent, #FDE68A)",
                }}
              >
                حصرياً
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {featuredBanners.map((offer) => {
                const offerLink = offer.link && offer.link.trim().length > 0 ? offer.link.trim() : "/deposit";
                const isExternal = offerLink.startsWith("http://") || offerLink.startsWith("https://");

                const handleOfferClick = (e: React.MouseEvent) => {
                  if (isGuest) {
                    e.preventDefault();
                    try {
                      sessionStorage.setItem("redirect_after_login", offerLink);
                    } catch {
                      // Ignore
                    }
                    toast.info("يرجى تسجيل الدخول أو إنشاء حساب للاستمرار ومتابعة الشراء");
                    setLocation("/login");
                  }
                };

                const cardContent = (
                  <div
                    className="group relative rounded-2xl border p-4 shadow-xl transition-all flex items-center gap-4 overflow-hidden"
                    style={{
                      background:
                        "linear-gradient(135deg, color-mix(in srgb, var(--theme-accent, #FDE68A) 8%, var(--theme-card, #1A1A1A)) 0%, var(--theme-card, #1A1A1A) 50%, var(--theme-background, #0a0a0a) 100%)",
                      borderColor: "color-mix(in srgb, var(--theme-accent, #FDE68A) 30%, transparent)",
                    }}
                  >
                    <div
                      className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 border"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--theme-background, #0a0a0a) 40%, transparent)",
                        borderColor: "color-mix(in srgb, var(--theme-accent, #FDE68A) 20%, transparent)",
                      }}
                    >
                      <img src={offer.image} alt={offer.title} width="96" height="96" className="w-full h-full object-cover opacity-100 group-hover:scale-110 transition-transform duration-500" loading="lazy" decoding="async" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div
                        className="inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold"
                        style={{
                          backgroundColor: "color-mix(in srgb, var(--theme-accent, #FDE68A) 20%, transparent)",
                          borderColor: "color-mix(in srgb, var(--theme-accent, #FDE68A) 30%, transparent)",
                          color: "var(--theme-accent, #FDE68A)",
                        }}
                      >
                        عرض مميز
                      </div>
                      <h3
                        className="text-sm font-bold truncate"
                        style={{ color: "var(--theme-text-primary, #E5E7EB)" }}
                      >
                        {offer.title}
                      </h3>
                      {offer.description && (
                        <p
                          className="text-xs line-clamp-2 leading-relaxed"
                          style={{ color: "var(--theme-text-muted, #9CA3AF)" }}
                        >
                          {offer.description}
                        </p>
                      )}
                      <div
                        className="pt-1 flex items-center gap-1 text-[11px] font-bold group-hover:translate-x-[-2px] transition-transform"
                        style={{ color: "var(--theme-accent, #FDE68A)" }}
                      >
                        <span>اكتشف العرض</span>
                        <span>←</span>
                      </div>
                    </div>
                  </div>
                );

                return isExternal ? (
                  <a key={offer.id} href={offerLink} target="_blank" rel="noopener noreferrer" onClick={handleOfferClick}>
                    {cardContent}
                  </a>
                ) : (
                  <Link key={offer.id} href={offerLink} onClick={handleOfferClick}>
                    {cardContent}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Categories Section */}
        <div className="px-theme">
          <div
            className="flex items-center justify-between mb-4 pb-2 border-b"
            style={{
              borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 30%, transparent)",
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg border flex items-center justify-center"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 20%, transparent)",
                  borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 40%, transparent)",
                  color: "var(--theme-accent, #FDE68A)",
                }}
              >
                <Layers size={16} />
              </div>
              <h2
                className="text-base sm:text-lg font-black"
                style={{ color: "var(--theme-text-primary, #E5E7EB)" }}
              >
                الأقسام والخدمات
              </h2>
            </div>
            <span
              className="text-xs font-bold"
              style={{ color: "var(--theme-text-muted, #9CA3AF)" }}
            >
              {visibleCategories.length} {visibleCategories.length === 1 ? "قسم" : "أقسام"}
            </span>
          </div>

          {categoriesLoading && visibleCategories.length === 0 ? (
            <div className={getProductGridClass(PRODUCT_GRID_COLS)}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton
                    className="w-full aspect-square rounded-2xl"
                    style={{ backgroundColor: "var(--theme-card, #2D2D2D)" }}
                  />
                  <Skeleton
                    className="h-3 w-16"
                    style={{ backgroundColor: "var(--theme-card, #2D2D2D)" }}
                  />
                </div>
              ))}
            </div>
          ) : visibleCategories.length > 0 ? (
            <div className={getProductGridClass(PRODUCT_GRID_COLS)}>
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
            <div
              className="rounded-3xl border px-4 py-10 text-center text-sm"
              style={{
                backgroundColor: "var(--theme-card, #2D2D2D)",
                borderColor: "var(--theme-border)",
                color: "var(--theme-text-muted, #9CA3AF)",
              }}
            >
              <Layers
                className="w-10 h-10 mx-auto mb-2"
                style={{ color: "var(--theme-primary, #C8A45C)" }}
              />
              <p
                className="font-bold"
                style={{ color: "var(--theme-text-primary, #E5E7EB)" }}
              >
                لا توجد أقسام متاحة حالياً
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--theme-text-muted, #9CA3AF)" }}
              >
                سيتم إضافة وتفعيل الأقسام قريباً.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


