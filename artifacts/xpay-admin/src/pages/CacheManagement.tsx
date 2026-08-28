import { useState } from "react";
import { Database, Trash2, CheckCircle, RefreshCw } from "lucide-react";
import { post } from "../lib/api";

export default function CacheManagement() {
  const [clearing, setClearing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleClearCache = async () => {
    if (!confirm("هل أنت متأكد من رغبتك في مسح الذاكرة المؤقتة (Cache) بالكامل؟")) return;
    setClearing(true);
    setSuccess(false);
    try {
      await post("/admin/clear-cache", {});
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch {
      alert("فشل مسح الذاكرة المؤقتة");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 bg-[#2D2D2D] border border-[#C8A45C]/30 p-6 rounded-3xl shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#FDE68A]">
          <Database size={24} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#FDE68A]">إدارة الذاكرة المؤقتة (Cache)</h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">مسح ملفات التخزين المؤقت لتحسين أداء المنصة وتحديث البيانات فوراً</p>
        </div>
      </div>

      <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 p-8 rounded-3xl shadow-xl text-center space-y-6">
        <div className="w-20 h-20 bg-[#C8A45C]/10 border border-[#C8A45C]/30 rounded-full flex items-center justify-center mx-auto text-[#C8A45C]">
          <Trash2 size={36} />
        </div>

        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-xl font-black text-white">حذف وتفريغ الكاش المؤقت</h3>
          <p className="text-xs sm:text-sm text-zinc-400">
            سيؤدي هذا الإجراء إلى إعادة تعقيم ذاكرة النظام المؤقتة ومزامنة الطلبات والأقسام والمنتجات بدون أي تأخير.
          </p>
        </div>

        {success && (
          <div className="max-w-md mx-auto bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2">
            <CheckCircle size={18} /> تم مسح الذاكرة المؤقتة بنجاح وتحديث النظام!
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={handleClearCache}
            disabled={clearing}
            className="flex items-center justify-center gap-2 mx-auto bg-amber-600 hover:bg-amber-700 text-white font-black px-8 py-3.5 rounded-2xl transition shadow-lg cursor-pointer disabled:opacity-50"
          >
            {clearing ? <RefreshCw size={18} className="animate-spin" /> : <Trash2 size={18} />}
            <span>{clearing ? "جاري مسح الكاش..." : "مسح الذاكرة المؤقتة الآن"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
