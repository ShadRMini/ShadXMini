import { useState, useEffect } from "react";
import ThemeLegacy from "./ThemeLegacy";
import ThemeNew from "./ThemeNew";
import { get, put } from "../lib/api";

export default function ThemeWrapper() {
  const [useLegacy, setUseLegacy] = useState<boolean>(false); // Default to false (New UI)
  const [useLegacyAuth, setUseLegacyAuth] = useState<boolean>(false); // Default to false (New Split-Screen Auth UI)
  const [loading, setLoading] = useState(true);

  const fetchSetting = async () => {
    try {
      const [resTheme, resAuth] = await Promise.all([
        get<any>("/admin/settings/use-legacy-theme-page").catch(() => null),
        get<any>("/admin/settings/use-legacy-auth-pages").catch(() => null),
      ]);

      if (resTheme && resTheme.value !== undefined) {
        setUseLegacy(resTheme.value === "true" || resTheme.value === true);
      } else {
        setUseLegacy(false);
      }

      if (resAuth && resAuth.value !== undefined) {
        setUseLegacyAuth(resAuth.value === "true" || resAuth.value === true);
      } else {
        setUseLegacyAuth(false);
      }
    } catch (err) {
      console.warn("[Theme Wrapper] Failed to fetch settings, defaulting to false:", err);
      setUseLegacy(false);
      setUseLegacyAuth(false);
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
      await put("/admin/settings/use-legacy-theme-page", { value: String(newValue) });
    } catch (err) {
      console.error("[Theme Wrapper] Failed to update legacy theme page setting:", err);
    }
  };

  const toggleLegacyAuthMode = async () => {
    const newValue = !useLegacyAuth;
    setUseLegacyAuth(newValue);
    try {
      await put("/admin/settings/use-legacy-auth-pages", { value: String(newValue) });
    } catch (err) {
      console.error("[Theme Wrapper] Failed to update legacy auth pages setting:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-400 space-y-3" dir="rtl">
        <div className="w-10 h-10 border-2 border-[#C8A45C] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">جاري تحميل صفحة تخصيص التصميم...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Switch Toggle Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3" dir="rtl">
        {/* Theme Customizer Mode */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#1A1A1A] border border-[#C8A45C]/20 rounded-2xl text-xs text-zinc-400 shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C8A45C] animate-pulse" />
            <span>
              واجهة التخصيص: <strong className="text-[#FDE68A]">{useLegacy ? "القديمة (Legacy)" : "الحديثة التفاعلية ✨"}</strong>
            </span>
          </div>
          <button
            onClick={toggleLegacyMode}
            className="px-3 py-1.5 bg-[#242424] hover:bg-zinc-800 text-[#FDE68A] border border-[#C8A45C]/30 rounded-xl font-bold text-[11px] transition cursor-pointer shadow-xs"
          >
            {useLegacy ? "الحديثة ✨" : "القديمة 🔄"}
          </button>
        </div>

        {/* Store Auth Pages (Login / Register) Style */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#1A1A1A] border border-[#C8A45C]/20 rounded-2xl text-xs text-zinc-400 shadow-md">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${useLegacyAuth ? "bg-amber-500" : "bg-emerald-500"} animate-pulse`} />
            <span>
              صفحات الدخول والتسجيل: <strong className="text-[#FDE68A]">{useLegacyAuth ? "التصميم الكلاسيكي السابق" : "التصميم المقسوم الجديد (Split-Screen) 🌟"}</strong>
            </span>
          </div>
          <button
            onClick={toggleLegacyAuthMode}
            className="px-3 py-1.5 bg-[#242424] hover:bg-zinc-800 text-[#FDE68A] border border-[#C8A45C]/30 rounded-xl font-bold text-[11px] transition cursor-pointer shadow-xs"
          >
            {useLegacyAuth ? "تفعيل الجديد (Split) ✨" : "الرجوع للتصميم السابق 🔄"}
          </button>
        </div>
      </div>

      {useLegacy ? <ThemeLegacy /> : <ThemeNew />}
    </div>
  );
}
