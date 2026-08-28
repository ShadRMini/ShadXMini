import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { ChevronRight, ChevronLeft, Sparkles, ExternalLink, ArrowLeft, ShieldCheck, Zap } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicJson } from "@/lib/public-api";

export interface BannerItem {
  id: string;
  title: string;
  image: string;
  link?: string;
  order?: number;
  subtitle?: string;
  ctaText?: string;
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
};

export default function BannerCarousel({ banners: propBanners, isLoading }: BannerCarouselProps) {
  const [banners, setBanners] = useState<BannerItem[]>(propBanners || []);
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

  // Fetch banners if not provided
  useEffect(() => {
    if (propBanners && propBanners.length > 0) {
      setBanners(propBanners);
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
  }, [propBanners]);

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
      <div className="w-full max-w-4xl mx-auto px-1 sm:px-2 mb-6">
        <Skeleton className="w-full h-48 sm:h-64 md:h-72 rounded-3xl bg-[#2D2D2D] border border-[#C8A45C]/20 animate-pulse" />
      </div>
    );
  }

  const displayBanners = banners && banners.length > 0 ? banners : [DEFAULT_BANNER];

  return (
    <div className="w-full max-w-4xl mx-auto px-1 sm:px-2 mb-7 relative group select-none">
      {/* Carousel Container */}
      <div
        className="overflow-hidden rounded-3xl border border-[#C8A45C]/40 bg-[#1A1A1A] shadow-[0_10px_30px_rgba(0,0,0,0.35)] relative"
        ref={emblaRef}
      >
        <div className="flex">
          {displayBanners.map((banner, index) => {
            const hasImage = Boolean(banner.image && banner.image.trim().length > 0);
            const bannerLink = banner.link && banner.link.trim().length > 0 ? banner.link.trim() : "/deposit";
            const isExternal = bannerLink.startsWith("http://") || bannerLink.startsWith("https://");

            const BannerWrapper = ({ children }: { children: React.ReactNode }) => {
              if (isExternal) {
                return (
                  <a
                    href={bannerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full cursor-pointer"
                  >
                    {children}
                  </a>
                );
              }
              return (
                <Link href={bannerLink}>
                  <div className="block w-full h-full cursor-pointer">{children}</div>
                </Link>
              );
            };

            return (
              <div
                key={banner.id || index}
                className="flex-[0_0_100%] min-w-0 relative min-h-[190px] sm:min-h-[230px] md:min-h-[260px] bg-gradient-to-br from-[#2D2D2D] via-[#1A1A1A] to-[#141414] overflow-hidden"
              >
                <BannerWrapper>
                  {/* Background Image if exists */}
                  {hasImage ? (
                    <div className="absolute inset-0 w-full h-full">
                      <img
                        src={banner.image}
                        alt={banner.title}
                        className="w-full h-full object-cover object-center opacity-70 group-hover:scale-103 transition-transform duration-700 ease-out"
                        loading={index === 0 ? "eager" : "lazy"}
                      />
                      {/* Gradient overlays for text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#1A1A1A]/75 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A1A]/90 via-[#1A1A1A]/40 to-transparent" />
                    </div>
                  ) : (
                    /* Elegant Graphic Elements when no image */
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-[#C8A45C]/15 blur-3xl" />
                      <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-[#C8A45C]/10 blur-3xl" />
                      <div className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full bg-[#E5C378]/5 blur-2xl" />
                    </div>
                  )}

                  {/* Banner Content */}
                  <div className="relative z-10 h-full min-h-[190px] sm:min-h-[230px] md:min-h-[260px] p-5 sm:p-7 md:p-8 flex flex-col justify-between">
                    {/* Top Tag */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C8A45C]/20 border border-[#C8A45C]/40 text-[#FDE68A] text-[11px] sm:text-xs font-bold shadow-xs">
                        <Sparkles className="w-3.5 h-3.5 text-[#C8A45C]" />
                        <span>عرض مميز</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#C8A45C]" />
                        <span>خدمة موثوقة</span>
                      </div>
                    </div>

                    {/* Middle Content */}
                    <div className="my-auto py-2 max-w-xl">
                      <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-[#FDE68A] leading-snug sm:leading-tight mb-2 drop-shadow-md">
                        {banner.title}
                      </h2>
                      {banner.subtitle && (
                        <p className="text-xs sm:text-sm md:text-base text-[#E5E7EB] line-clamp-2 leading-relaxed max-w-lg drop-shadow-xs font-medium">
                          {banner.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex items-center justify-between gap-4 pt-1">
                      <div className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] font-black text-xs sm:text-sm transition-all shadow-md shadow-[#C8A45C]/20 cursor-pointer group-hover:shadow-lg">
                        <span>{banner.ctaText || "اكتشف الآن"}</span>
                        {isExternal ? (
                          <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                        ) : (
                          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                        <Zap className="w-3.5 h-3.5 text-[#C8A45C]" />
                        <span>تنفيذ تلقائي وفوري</span>
                      </div>
                    </div>
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
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#1A1A1A]/85 hover:bg-[#2D2D2D] border border-[#C8A45C]/40 text-[#FDE68A] items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-md cursor-pointer z-20"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                scrollNext();
              }}
              aria-label="التالي"
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#1A1A1A]/85 hover:bg-[#2D2D2D] border border-[#C8A45C]/40 text-[#FDE68A] items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-md cursor-pointer z-20"
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
                index === selectedIndex
                  ? "w-6 h-2 bg-[#C8A45C] shadow-xs shadow-[#C8A45C]/50"
                  : "w-2 h-2 bg-zinc-400 hover:bg-[#C8A45C]/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
