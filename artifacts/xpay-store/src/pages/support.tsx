import { useListSocialLinks, getListSocialLinksQueryKey } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import { HeadphonesIcon, MessageCircle, Send, Globe, ChevronLeft, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { getPublicJson } from "@/lib/public-api";

type SocialLinkItem = {
  id: string;
  platform: string;
  url: string;
  label: string;
};

export default function Support() {
  const { data: links, isLoading } = useListSocialLinks({
    query: { queryKey: getListSocialLinksQueryKey() },
  });
  const [fallbackLinks, setFallbackLinks] = useState<SocialLinkItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPublicJson<SocialLinkItem[]>("/social-links")
      .then((rows) => {
        if (!cancelled) setFallbackLinks(rows);
      })
      .catch((error) => {
        console.error("Fallback social links load failed:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleLinks = (fallbackLinks && fallbackLinks.length > 0 ? fallbackLinks : links) || [];

  const getPlatformIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes("whatsapp")) return <MessageCircle className="w-6 h-6 text-[#25D366]" />;
    if (p.includes("telegram")) return <Send className="w-6 h-6 text-[#0088cc]" />;
    if (p.includes("facebook")) return <Globe className="w-6 h-6 text-[#1877F2]" />;
    return <HeadphonesIcon className="w-6 h-6 text-primary" />;
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white pb-24 p-4 max-w-2xl mx-auto animate-in fade-in duration-300" dir="rtl">
      <div className="mb-8 mt-6 text-center">
        <div className="w-20 h-20 bg-[#2D2D2D] rounded-3xl flex items-center justify-center mx-auto mb-4 border border-[#C8A45C]/40 relative shadow-xl shadow-[#C8A45C]/10">
          <div className="absolute inset-0 bg-[#C8A45C]/10 rounded-3xl blur-xl animate-pulse" />
          <HeadphonesIcon className="w-10 h-10 text-[#C8A45C] relative z-10" />
        </div>
        <h1 className="text-2xl font-black text-[#FDE68A] mb-2">كيف يمكننا مساعدتك؟</h1>
        <p className="text-sm text-zinc-400 px-4">
          نحن متواجدون للرد على استفساراتك ومساعدتك في أي استفسار أو عملية دفع.
        </p>
      </div>

      <div className="space-y-4">
        {isLoading && visibleLinks.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl bg-zinc-800" />)
        ) : visibleLinks.length > 0 ? (
          visibleLinks.map((link, i) => (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#2D2D2D] border border-[#C8A45C]/30 rounded-2xl p-4 flex items-center gap-4 hover:bg-[#383838] hover:border-[#C8A45C] transition-all group shadow-lg cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] border border-[#C8A45C]/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  {getPlatformIcon(link.platform)}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white group-hover:text-[#FDE68A] transition-colors mb-1">{link.label}</h3>
                  <p className="text-xs text-zinc-400 capitalize">{link.platform}</p>
                </div>
                <ChevronLeft className="w-5 h-5 text-zinc-500 group-hover:text-[#C8A45C] transition-colors" />
              </a>
            </motion.div>
          ))
        ) : (
          <div className="text-center p-8 bg-[#2D2D2D] rounded-3xl border border-[#C8A45C]/20">
            <p className="text-zinc-400">لا توجد طرق تواصل متاحة حالياً</p>
          </div>
        )}
      </div>

      <div className="mt-8 p-5 bg-[#2D2D2D] border border-[#C8A45C]/40 rounded-3xl text-center shadow-lg">
        <h4 className="font-black text-[#FDE68A] mb-2 text-sm">أوقات العمل</h4>
        <p className="text-xs text-zinc-300 leading-6">
          فريق الدعم متواجد يومياً من 10 صباحاً حتى 12 ليلاً بتوقيت دمشق.
        </p>

        <a
          href="https://t.me/ShadMiniX"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#C8A45C]/40 bg-[#1A1A1A] px-4 py-3 text-sm font-black text-[#FDE68A] shadow-lg shadow-black/40 transition-all hover:border-[#C8A45C] hover:bg-[#383838] active:scale-[0.98]"
        >
          <Sparkles className="h-4 w-4 text-[#C8A45C]" />
          <span>تم تصميم وتطوير المتجر بواسطة ShadMiniX</span>
        </a>
      </div>
    </div>
  );
}

