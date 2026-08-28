import React, { useEffect, useState } from "react";
import UsersLegacy from "./UsersLegacy";
import UsersNew from "./UsersNew";
import { get, put } from "../lib/api";

export default function UsersWrapper() {
  const [useLegacy, setUseLegacy] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSetting = async () => {
    try {
      const res = await get<any>("/admin/settings/use-legacy-users-page");
      if (res && res.value !== undefined) {
        setUseLegacy(res.value === "true" || res.value === true);
      } else {
        const allSettings = await get<Record<string, any>>("/admin/settings");
        const val = allSettings?.use_legacy_users_page;
        setUseLegacy(val === "true" || val === true);
      }
    } catch (err) {
      console.warn("Failed to fetch legacy users page setting, defaulting to new UI:", err);
      setUseLegacy(false);
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
      await put("/admin/settings/use-legacy-users-page", { value: String(newValue) });
    } catch (err) {
      console.error("Failed to update legacy users page setting:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-400 space-y-3" dir="rtl">
        <div className="w-10 h-10 border-2 border-[#C8A45C] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">جاري تحميل صفحة المستخدمين...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Optional Legacy Mode Quick Switch Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1A1A1A] border border-[#C8A45C]/20 rounded-xl text-xs text-zinc-400" dir="rtl">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#C8A45C] animate-pulse" />
          <span>
            الواجهة الحالية: <strong className="text-[#FDE68A]">{useLegacy ? "القديمة (Legacy Mode)" : "الجديدة الفاخرة (Modern Mode)"}</strong>
          </span>
        </div>
        <button
          onClick={toggleLegacyMode}
          className="px-3 py-1 bg-[#242424] hover:bg-zinc-800 text-[#FDE68A] border border-[#C8A45C]/30 rounded-lg font-bold text-[11px] transition cursor-pointer"
        >
          {useLegacy ? "التبديل إلى الواجهة الجديدة ✨" : "الرجوع إلى الواجهة القديمة 🔄"}
        </button>
      </div>

      {useLegacy ? <UsersLegacy /> : <UsersNew />}
    </div>
  );
}
