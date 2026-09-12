import { useState, useEffect } from "react";
import SettingsLegacy from "./SettingsLegacy";
import SettingsNew from "./SettingsNew";
import { get, put } from "../lib/api";

export default function SettingsWrapper() {
  const [useLegacy, setUseLegacy] = useState<boolean>(false); // Default to false (New UI)
  const [loading, setLoading] = useState(true);

  const fetchSetting = async () => {
    try {
      const res = await get<any>("/admin/settings/use-legacy-settings-page");
      console.log("[Settings Wrapper] API response:", res);
      if (res && res.value !== undefined) {
        const isLegacy = res.value === "true" || res.value === true;
        setUseLegacy(isLegacy);
        console.log("[Settings Wrapper] Parsed useLegacy value:", isLegacy);
      } else {
        setUseLegacy(false);
      }
    } catch (err) {
      console.warn("[Settings Wrapper] Failed to fetch legacy settings setting, defaulting to new UI (false):", err);
      setUseLegacy(false); // Default false (New UI)
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSetting();
  }, []);

  console.log("[Settings Wrapper] Render useLegacy state:", useLegacy);

  const toggleLegacyMode = async () => {
    const newValue = !useLegacy;
    setUseLegacy(newValue);
    try {
      await put("/admin/settings/use-legacy-settings-page", { value: String(newValue) });
      console.log("[Settings Wrapper] Updated useLegacy to:", newValue);
    } catch (err) {
      console.error("[Settings Wrapper] Failed to update legacy settings page setting:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-400 space-y-3" dir="rtl">
        <div className="w-10 h-10 border-2 border-[#C8A45C] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">جاري تحميل صفحة الإعدادات...</p>
      </div>
    );
  }

  return useLegacy ? <SettingsLegacy /> : <SettingsNew />;
}
