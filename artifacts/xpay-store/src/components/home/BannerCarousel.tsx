import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { ChevronRight, ChevronLeft, Sparkles, ExternalLink, ArrowLeft, ShieldCheck, Zap } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicJson } from "@/lib/public-api";
import { useAuth } from "@/lib/auth-context";
import { useStoreSettings } from "@/lib/store-settings-context";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "sonner";

export interface BannerItem {
  id: string;
  title: string;
  image: string;
  link?: string;
  order?: number;
  subtitle?: string;
  ctaText?: string;
  showDiscoverBtn?: boolean;
  showAutoExecBtn?: boolean;
  showReliableBtn?: boolean;
  showFeaturedBtn?: boolean;
  show_discover_btn?: boolean;
  show_auto_exec_btn?: boolean;
  show_reliable_btn?: boolean;
  show_featured_btn?: boolean;
}

interface BannerCarouselProps {
  banners?: BannerItem[];
  isLoading?: boolean;
}

const DEFAULT_BANNER: BannerItem = {
  id: "default-1",
  title: "أهلاً بك في متجرنا المعتمد",
  subtitle: "شحن فوري ومباشر لجميع الألعاب، التطبيقات، والبطاقات الرقمية بأفضل الأسعار.",
  image: "",
  link: "/deposit",
  ctaText: "إضافة رصيد (شحن)",
  showDiscoverBtn: true,
  showAutoExecBtn: true,
  showReliableBtn: true,
  showFeaturedBtn: true,
};

export default function BannerCarousel({ banners: propBanners, isLoading }: BannerCarouselProps) {
  const [banners, setBanners] = useState<BannerItem[]>(propBanners || []);
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isGuest } = useAuth();
  const storeSettings = useStoreSettings();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      direction: "rtl",
      align: "start",
      skipSnaps: false,
    },
    [Autoplay({ delay: 4500, stopOnInteraction: false })]
  );

  const { banners: contextBanners } = useAppData();

  // Fetch banners if not provided
  useEffect(() => {
    if (propBanners && propBanners.length > 0) {
      setBanners(propBanners);
      return;
    }

    if (contextBanners && contextBanners.length > 0) {
      setBanners(contextBanners);
      return;
    }

    let active = true;
    getPublicJson<BannerItem[]>("/banners")
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setBanners(data);
        }
      })
      .catch(() => {
        // use default
      });

    return () => {
      active = false;
    };
  }, [propBanners, contextBanners]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  if (isLoading && (!banners || banners.length === 0)) {
    return (
      <div className="w-full max-w-4xl mx-auto px-1 sm:px-2 mb-7">
        <Skeleton
          className="w-full min-h-[190px] sm:min-h-[230px] md:min-h-[260px] h-[190px] sm:h-[230px] md:h-[260px] rounded-3xl border animate-pulse"
          style={{
            backgroundColor: "var(--theme-card, #2D2D2D)",
            borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 20%, transparent)",
          }}
        />
      </div>
    );
  }

  const displayBanners = banners && banners.length > 0 ? banners : [DEFAULT_BANNER];

  return (
    <div className="w-full max-w-4xl mx-auto px-1 sm:px-2 mb-7 relative group select-none">
      {/* Carousel Container */}
      <div
        className="overflow-hidden rounded-3xl border relative min-h-[190px] sm:min-h-[230px] md:min-h-[260px]"
        style={{
          backgroundColor: "var(--theme-background, #0a0a0a)",
          borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 40%, transparent)",
          boxShadow: "var(--theme-shadow)",
        }}
        ref={emblaRef}
      >
        <div className="flex">
          {displayBanners.map((banner, index) => {
            const hasImage = Boolean(banner.image && banner.image.trim().length > 0);
            const bannerLink = banner.link && banner.link.trim().length > 0 ? banner.link.trim() : "/deposit";
            const isExternal = bannerLink.startsWith("http://") || bannerLink.startsWith("https://");

            const handleBannerClick = (e: React.MouseEvent) => {
              if (isGuest && !isExternal) {
                e.preventDefault();
                try {
                  sessionStorage.setItem("redirect_after_login", bannerLink);
                } catch {
                  // Ignore
                }
                toast.info("يرجى تسجيل الدخول أو إنشاء حساب للاستمرار ومتابعة الشراء");
                setLocation("/login");
              }
            };

            const BannerWrapper = ({ children }: { children: React.ReactNode }) => {
              if (isExternal) {
                return (
                  <a
                    href={bannerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full cursor-pointer"
                    onClick={handleBannerClick}
                  >
                    {children}
                  </a>
                );
              }
              return (
                <Link href={bannerLink} onClick={handleBannerClick}>
                  <div className="block w-full h-full cursor-pointer">{children}</div>
                </Link>
              );
            };

            const showDiscover = Boolean(banner.showDiscoverBtn ?? banner.show_discover_btn);
            const showAutoExec = Boolean(banner.showAutoExecBtn ?? banner.show_auto_exec_btn);
            const showReliable = Boolean(banner.showReliableBtn ?? banner.show_reliable_btn);
            const showFeatured = Boolean(banner.showFeaturedBtn ?? banner.show_featured_btn);
            const hasTopBadges = showFeatured || showReliable;
            const hasBottomActions = showDiscover || showAutoExec;
            const cleanTitle = banner.title && banner.title.trim() !== "." ? banner.title.trim() : "";
            const hasOverlayContent = Boolean(
              cleanTitle || (banner.subtitle && banner.subtitle.trim()) || hasTopBadges || hasBottomActions
            );

            return (
              <div
                key={banner.id || index}
                className="flex-[0_0_100%] min-w-0 relative min-h-[190px] sm:min-h-[230px] md:min-h-[260px] overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, var(--theme-card, #1A1A1A) 0%, var(--theme-background, #0a0a0a) 100%)",
                }}
              >
                <BannerWrapper>
                  {/* Background Image if exists */}
                  {hasImage ? (
                    <div className="absolute inset-0 w-full h-full">
                      <img
                        src={banner.image}
                        alt={cleanTitle || "Banner"}
                        width="800"
                        height="400"
                        fetchPriority={index === 0 ? "high" : "low"}
                        className="w-full h-full object-cover object-center opacity-100 group-hover:scale-102 transition-transform duration-500 ease-out"
                        loading={index === 0 ? "eager" : "lazy"}
                        decoding="async"
                      />
                      {/* Subtle dark contrast scrim only when text/badges exist — never whitewash in Light Mode */}
                      {hasOverlayContent && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background:
                              "linear-gradient(to top, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.15) 50%, transparent 100%)",
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    /* Elegant Graphic Elements when no image */
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      <div
                        className="absolute -top-12 -left-12 w-48 h-48 rounded-full blur-3xl"
                        style={{
                          backgroundColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 15%, transparent)",
                        }}
                      />
                      <div
                        className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full blur-3xl"
                        style={{
                          backgroundColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 10%, transparent)",
                        }}
                      />
                      <div
                        className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full blur-2xl"
                        style={{
                          backgroundColor: "color-mix(in srgb, var(--theme-accent, #FDE68A) 5%, transparent)",
                        }}
                      />
                    </div>
                  )}

                  {/* Banner Content */}
                  <div className="relative z-10 h-full min-h-[190px] sm:min-h-[230px] md:min-h-[260px] p-5 sm:p-7 md:p-8 flex flex-col justify-between">
                    {/* Top Tag Row */}
                    {hasTopBadges ? (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          {showFeatured && (
                            <div
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] sm:text-xs font-bold shadow-xs"
                              style={{
                                backgroundColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 20%, transparent)",
                                borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 40%, transparent)",
                                color: "var(--theme-accent, #FDE68A)",
                              }}
                            >
                              <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--theme-primary, #C8A45C)" }} />
                              <span>عرض مميز</span>
                            </div>
                          )}
                        </div>
                        <div>
                          {showReliable && (
                            <div
                              className="flex items-center gap-1 text-[10px] sm:text-xs px-2.5 py-1 rounded-full border"
                              style={{
                                backgroundColor: "color-mix(in srgb, var(--theme-background, #0a0a0a) 55%, transparent)",
                                borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 25%, transparent)",
                                color: "var(--theme-text-secondary, #E5E7EB)",
                              }}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" style={{ color: "var(--theme-primary, #C8A45C)" }} />
                              <span>خدمة موثوقة</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div />
                    )}

                    {/* Middle Content */}
                    <div className="my-auto py-2 max-w-xl">
                      {cleanTitle && (
                        <h2
                          className="text-lg sm:text-2xl md:text-3xl font-black leading-snug sm:leading-tight mb-2 drop-shadow-md"
                          style={{ color: "var(--theme-accent, #FDE68A)" }}
                        >
                          {cleanTitle}
                        </h2>
                      )}
                      {banner.subtitle && (
                        <p
                          className="text-xs sm:text-sm md:text-base line-clamp-2 leading-relaxed max-w-lg drop-shadow-xs font-medium"
                          style={{ color: "var(--theme-text-secondary, #E5E7EB)" }}
                        >
                          {banner.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Bottom Action Bar */}
                    {hasBottomActions ? (
                      <div className="flex items-center justify-between gap-4 pt-1">
                        <div>
                          {showDiscover && (
                            <div
                              className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-all shadow-md cursor-pointer group-hover:shadow-lg"
                              style={{
                                backgroundColor: "var(--theme-primary, #C8A45C)",
                                color: "var(--theme-background, #0a0a0a)",
                                boxShadow: "0 4px 14px color-mix(in srgb, var(--theme-primary, #C8A45C) 25%, transparent)",
                              }}
                            >
                              <span>{banner.ctaText || "اكتشف الآن"}</span>
                              {isExternal ? (
                                <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                              ) : (
                                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          {showAutoExec && (
                            <div
                              className="flex items-center gap-1.5 text-[11px] sm:text-xs px-3 py-1.5 rounded-full border"
                              style={{
                                backgroundColor: "color-mix(in srgb, var(--theme-background, #0a0a0a) 55%, transparent)",
                                borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 25%, transparent)",
                                color: "var(--theme-text-secondary, #E5E7EB)",
                              }}
                            >
                              <Zap className="w-3.5 h-3.5" style={{ color: "var(--theme-primary, #C8A45C)" }} />
                              <span>تنفيذ تلقائي وفوري</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div />
                    )}
                  </div>
                </BannerWrapper>
              </div>
            );
          })}
        </div>

        {/* Carousel Navigation Arrows (Desktop / Tablet) */}
        {displayBanners.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                scrollPrev();
              }}
              aria-label="السابق"
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full border items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-md cursor-pointer z-20"
              style={{
                backgroundColor: "color-mix(in srgb, var(--theme-card, #1A1A1A) 90%, transparent)",
                borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 40%, transparent)",
                color: "var(--theme-primary, #C8A45C)",
              }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                scrollNext();
              }}
              aria-label="التالي"
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full border items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-md cursor-pointer z-20"
              style={{
                backgroundColor: "color-mix(in srgb, var(--theme-card, #1A1A1A) 90%, transparent)",
                borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 40%, transparent)",
                color: "var(--theme-primary, #C8A45C)",
              }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Pagination Dots */}
      {displayBanners.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              aria-label={`انتقل إلى البانر ${index + 1}`}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                index === selectedIndex ? "w-6 h-2 shadow-xs" : "w-2 h-2"
              }`}
              style={
                index === selectedIndex
                  ? {
                      backgroundColor: "var(--theme-primary, #C8A45C)",
                      boxShadow: "0 0 8px color-mix(in srgb, var(--theme-primary, #C8A45C) 50%, transparent)",
                    }
                  : {
                      backgroundColor: "var(--theme-border)",
                    }
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
