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

      {/* Legacy Mode Toggle Bar */}
      <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 px-5 py-3 rounded-2xl flex items-center justify-between text-white shadow-md">
        <div className="flex items-center gap-3">
          <SlidersHorizontal size={20} className="text-[#C8A45C]" />
          <div>
            <div className="text-xs font-bold text-zinc-200">وضع واجهة المنتجات: <span className="text-[#FDE68A]">{useLegacy ? "الواجهة القديمة (Legacy)" : "الواجهة الجديدة المتقدمة (Dark & Gold)"}</span></div>
            <div className="text-[11px] text-zinc-400">يمكنك التبديل بين الواجهتين فوراً بنقرة واحدة دون الحاجة لإعادة نشر</div>
          </div>
        </div>
        <button
          onClick={toggleLegacy}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            useLegacy ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A]"
          }`}
        >
          {useLegacy ? "التبديل إلى الواجهة الجديدة" : "الرجوع إلى التصميم السابق (Legacy)"}
        </button>
      </div>

      {useLegacy ? <ProductsLegacy /> : <ProductsNew />}
    </div>
  );
}
