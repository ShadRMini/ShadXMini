import { useState, useEffect } from "react";
import SocialLinksLegacy from "./SocialLinksLegacy";
import SocialLinksNew from "./SocialLinksNew";
import { get, put } from "../lib/api";

export default function SocialLinksWrapper() {
  const [useLegacy, setUseLegacy] = useState<boolean>(false); // Default to false (New UI)
  const [loading, setLoading] = useState(true);

  const fetchSetting = async () => {
    try {
      const res = await get<any>("/admin/settings/use-legacy-social-links-page");
      console.log("[SocialLinks Wrapper] API response:", res);
      if (res && res.value !== undefined) {
        const isLegacy = res.value === "true" || res.value === true;
        setUseLegacy(isLegacy);
        console.log("[SocialLinks Wrapper] Parsed useLegacy value:", isLegacy);
      } else {
        setUseLegacy(false);
      }
    } catch (err) {
      console.warn("[SocialLinks Wrapper] Failed to fetch legacy social links setting, defaulting to new UI (false):", err);
      setUseLegacy(false); // Default false (New UI)
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSetting();
  }, []);

  const toggleLegacyMode = async () => {
    const newValue = !useLegacy;
    setUseLegacy(newValue);
    try {
      await put("/admin/settings/use-legacy-social-links-page", { value: String(newValue) });
      console.log("[SocialLinks Wrapper] Updated useLegacy to:", newValue);
    } catch (err) {
      console.error("[SocialLinks Wrapper] Failed to update legacy social links page setting:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-400 space-y-3" dir="rtl">
        <div className="w-10 h-10 border-2 border-[#C8A45C] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">جاري تحميل صفحة الروابط الاجتماعية...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Switch Toggle Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1A1A1A] border border-[#C8A45C]/20 rounded-2xl text-xs text-zinc-400 shadow-md" dir="rtl">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C8A45C] animate-pulse" />
          <span>
            الواجهة الحالية للروابط الاجتماعية: <strong className="text-[#FDE68A]">{useLegacy ? "القديمة (Legacy Mode)" : "الحديثة التفاعلية (Dark & Gold)"}</strong>
          </span>
        </div>
        <button
          onClick={toggleLegacyMode}
          className="px-3.5 py-1.5 bg-[#242424] hover:bg-zinc-800 text-[#FDE68A] border border-[#C8A45C]/30 rounded-xl font-bold text-[11px] transition cursor-pointer shadow-xs"
        >
          {useLegacy ? "التبديل إلى الواجهة الجديدة ✨" : "الرجوع إلى الواجهة القديمة 🔄"}
        </button>
      </div>

      {useLegacy ? <SocialLinksLegacy /> : <SocialLinksNew />}
    </div>
  );
}
