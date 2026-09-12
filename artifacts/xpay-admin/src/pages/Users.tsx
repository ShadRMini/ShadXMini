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

  return useLegacy ? <UsersLegacy /> : <UsersNew />;
}
