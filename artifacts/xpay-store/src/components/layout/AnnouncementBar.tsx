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
  const [speed, setSpeed] = useState<number>(15);

  useEffect(() => {
    let active = true;

    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem("xpay_announcement_dismissed");
    if (isDismissed === "true") {
      setClosed(true);
      setLoading(false);
      return;
    }

    Promise.all([
      getPublicJson<NewsItem[]>("/news").catch(() => []),
      getPublicJson<any>("/public-settings").catch(() => ({})),
    ])
      .then(([newsData, settingsData]) => {
        if (!active) return;
        if (Array.isArray(newsData)) {
          const activeNews = newsData.filter((item) => item.active !== false && item.content?.trim());
          setNews(activeNews);
        }
        if (settingsData && settingsData.news_ticker_speed) {
          const s = Number(settingsData.news_ticker_speed);
          if (!isNaN(s) && s > 0) {
            setSpeed(s);
          }
        }
      })
      .catch((err) => {
        console.warn("Could not load news announcements or settings:", err);
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
      className="border px-4 py-3 rounded-2xl text-xs shadow-xl relative z-10 transition-all duration-300 select-none my-4"
      style={{
        backgroundColor: "var(--theme-card, #2D2D2D)",
        borderColor: "var(--theme-border, rgba(200, 164, 92, 0.35))",
        color: "var(--theme-accent, #FDE68A)",
      }}
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-3">
        {/* News Icon Badge */}
        <div
          className="flex items-center gap-2 font-bold px-2.5 py-1.5 rounded-xl shrink-0 shadow-xs border"
          style={{
            backgroundColor: "rgba(200, 164, 92, 0.15)",
            borderColor: "var(--theme-border, rgba(200, 164, 92, 0.4))",
            color: "var(--theme-accent, #FDE68A)",
          }}
        >
          <Megaphone className="w-4 h-4 animate-pulse" style={{ color: "var(--theme-primary, #C8A45C)" }} />
          <span className="text-[11px] hidden xs:inline tracking-wide font-black">أخبار متجددة</span>
        </div>

        {/* Marquee Content */}
        <div className="overflow-hidden flex-1 relative h-6 flex items-center">
          <div
            className="news-marquee whitespace-nowrap absolute right-0 flex items-center h-full"
            style={{ animationDuration: `${speed}s` }}
          >
            {news.map((item, idx) => (
              <span
                key={item.id || idx}
                className="font-bold transition-colors mr-12 inline-flex items-center gap-2 text-xs sm:text-sm"
                style={{ color: "var(--theme-accent, #FDE68A)" }}
              >
                <span>{item.content}</span>
                {idx < news.length - 1 && (
                  <span className="opacity-80 text-sm font-mono mr-2" style={{ color: "var(--theme-primary, #C8A45C)" }}>•</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Close Button in Gold */}
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-xl border transition-all shrink-0 cursor-pointer"
          style={{
            color: "var(--theme-primary, #C8A45C)",
            borderColor: "var(--theme-border, rgba(200, 164, 92, 0.25))",
          }}
          title="إغلاق التنبيه"
          aria-label="إغلاق شريط الأخبار"
          type="button"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
