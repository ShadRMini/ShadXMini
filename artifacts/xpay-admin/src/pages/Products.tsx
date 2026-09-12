import { useEffect, useState } from "react";
import { get, put } from "../lib/api";
import ProductsLegacy from "./ProductsLegacy";
import ProductsNew from "./ProductsNew";
import { Sparkles, SlidersHorizontal } from "lucide-react";

export default function Products() {
  const [useLegacy, setUseLegacy] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const loadSetting = async () => {
    try {
      setLoading(true);
      const res = await get<any>("/admin/settings/use-legacy-product-form");
      setUseLegacy(res.useLegacy === true || res.value === "true");
    } catch (err) {
      console.error("Error loading legacy product setting:", err);
      setUseLegacy(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSetting();
  }, []);

  const toggleLegacy = async () => {
    const nextVal = !useLegacy;
    try {
      await put("/admin/settings/use-legacy-product-form", { useLegacy: nextVal, value: String(nextVal) });
      setUseLegacy(nextVal);
      setToast(nextVal ? "تم التبديل إلى الواجهة القديمة (Legacy)" : "تم التبديل إلى الواجهة الجديدة المتقدمة");
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      alert(`فشل التبديل: ${err.message}`);
    }
  };

  if (loading || useLegacy === null) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-zinc-400">
        جاري تحميل إعدادات الواجهة...
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#C8A45C] text-[#1A1A1A] px-5 py-2.5 rounded-xl shadow-xl font-bold flex items-center gap-2 border border-white/20">
          <Sparkles size={16} />
          {toast}
        </div>
      )}

      {useLegacy ? <ProductsLegacy /> : <ProductsNew />}
    </div>
  );
}
