import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { getPublicJson } from "@/lib/public-api";

interface NewsItem {
  id: number | string;
  content: string;
  type?: string;
  active?: boolean;
}

export default function AnnouncementBar() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [closed, setClosed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem("xpay_announcement_dismissed");
    if (isDismissed === "true") {
      setClosed(true);
      setLoading(false);
      return;
    }

    getPublicJson<NewsItem[]>("/news")
      .then((data) => {
        if (active && Array.isArray(data)) {
          const activeNews = data.filter((item) => item.active !== false && item.content?.trim());
          setNews(activeNews);
        }
      })
      .catch((err) => {
        console.warn("Could not load news announcements:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleDismiss = () => {
    setClosed(true);
    try {
      sessionStorage.setItem("xpay_announcement_dismissed", "true");
    } catch {
      // ignore
    }
  };

  if (closed || loading || news.length === 0) {
    return null;
  }

  return (
    <div
      className="bg-[#1A1A1A] border-b border-[#C8A45C]/35 px-3 py-2 text-xs text-[#FDE68A] shadow-md relative z-10 transition-all duration-300 select-none"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* News Icon Badge */}
        <div className="flex items-center gap-2 bg-[#C8A45C]/20 border border-[#C8A45C]/40 text-[#FDE68A] font-bold px-2.5 py-1 rounded-lg shrink-0 shadow-xs">
          <Megaphone className="w-3.5 h-3.5 text-[#C8A45C] animate-pulse" />
          <span className="text-[11px] hidden xs:inline tracking-wide">تنبيه</span>
        </div>

        {/* Marquee Content */}
        <div className="overflow-hidden flex-1 relative h-5 flex items-center">
          <div className="news-marquee whitespace-nowrap absolute right-0 flex items-center h-full">
            {news.map((item, idx) => (
              <span
                key={item.id || idx}
                className="font-medium text-[#FDE68A] hover:text-white transition-colors mr-10 inline-flex items-center gap-2"
              >
                <span>{item.content}</span>
                {idx < news.length - 1 && (
                  <span className="text-[#C8A45C] opacity-60 text-xs font-mono">•</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Close Button in Gold */}
        <button
          onClick={handleDismiss}
          className="text-[#C8A45C] hover:text-[#FDE68A] hover:bg-zinc-800/80 p-1.5 rounded-lg border border-[#C8A45C]/20 hover:border-[#C8A45C]/50 transition-all shrink-0 cursor-pointer"
          title="إغلاق التنبيه"
          aria-label="إغلاق شريط الأخبار"
          type="button"
        >
          <X className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
