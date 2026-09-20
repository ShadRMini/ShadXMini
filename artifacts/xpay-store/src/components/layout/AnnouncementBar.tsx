import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { useStoreSettings } from "@/lib/store-settings-context";

interface NewsItem {
  id: number | string;
  content: string;
  type?: string;
  active?: boolean;
}

export default function AnnouncementBar() {
  const { news: globalNews, loading: globalLoading } = useAppData();
  const storeSettings = useStoreSettings();
  const [closed, setClosed] = useState(false);

  // Check if dismissed in this session
  useEffect(() => {
    const isDismissed = sessionStorage.getItem("xpay_announcement_dismissed");
    if (isDismissed === "true") {
      setClosed(true);
    }
  }, []);

  const speed =
    storeSettings?.newsTickerSpeed ||
    Number((storeSettings as any)?.news_ticker_speed) ||
    15;

  const news = (globalNews || []).filter(
    (item: any) => item.active !== false && item.content?.trim()
  );

  const handleDismiss = () => {
    setClosed(true);
    try {
      sessionStorage.setItem("xpay_announcement_dismissed", "true");
    } catch {
      // ignore
    }
  };

  if (closed || globalLoading || news.length === 0) {
    return null;
  }

  return (
    <div
      className="border px-4 py-3 rounded-2xl text-xs shadow-xl relative z-10 transition-all duration-300 select-none my-4"
      style={{
        backgroundColor: "var(--theme-card)",
        borderColor: "var(--theme-border)",
        color: "var(--theme-accent)",
      }}
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-3">
        {/* News Icon Badge */}
        <div
          className="flex items-center gap-2 font-bold px-2.5 py-1.5 rounded-xl shrink-0 shadow-xs border"
          style={{
            backgroundColor: "rgba(200, 164, 92, 0.15)",
            borderColor: "var(--theme-border)",
            color: "var(--theme-accent)",
          }}
        >
          <Megaphone className="w-4 h-4 animate-pulse" style={{ color: "var(--theme-primary)" }} />
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
                style={{ color: "var(--theme-accent)" }}
              >
                <span>{item.content}</span>
                {idx < news.length - 1 && (
                  <span className="opacity-80 text-sm font-mono mr-2" style={{ color: "var(--theme-primary)" }}>•</span>
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
            color: "var(--theme-primary)",
            borderColor: "var(--theme-border)",
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
