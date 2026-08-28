import { useEffect, useState } from "react";
import Crud from "../components/Crud";
import { get, put } from "../lib/api";
import { Gauge, Save, CheckCircle2 } from "lucide-react";

export default function News() {
  const [speed, setSpeed] = useState<number>(15);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    get<any>("/admin/settings/news-ticker")
      .then((res) => {
        if (res && res.newsTickerSpeed) {
          setSpeed(Number(res.newsTickerSpeed));
        }
      })
      .catch((err) => {
        console.warn("Could not fetch news ticker speed:", err);
      });
  }, []);

  const handleSaveSpeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      await put("/admin/settings/news-ticker", { newsTickerSpeed: speed });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || "فشل حفظ سرعة شريط الأخبار");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Speed Control Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 max-w-xl">
        <div className="flex items-center gap-2 mb-3">
          <Gauge className="w-5 h-5 text-[#C8A45C]" />
          <h2 className="text-base font-bold text-slate-900">سرعة شريط الأخبار</h2>
        </div>
        <form onSubmit={handleSaveSpeed} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              مدة مرور الشريط (بالثواني)
            </label>
            <input
              type="number"
              min={3}
              max={120}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-[#C8A45C] focus:ring-1 focus:ring-[#C8A45C]"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              كلما زاد الرقم، أصبحت حركة الانتقال أبطأ وأكثر سلاسة (القيمة الافتراضية: 15 ثانية).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#C8A45C] hover:bg-[#B8954A] text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "جاري الحفظ..." : "حفظ السرعة"}</span>
            </button>
            {success && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> تم الحفظ بنجاح
              </span>
            )}
            {error && <span className="text-xs text-red-600 font-bold">{error}</span>}
          </div>
        </form>
      </div>

      {/* News Crud Table */}
      <Crud
        resource="news"
        title="إدارة الأخبار والتنبيهات"
        fields={[
          { name: "content", label: "المحتوى", type: "textarea", required: true },
          {
            name: "type",
            label: "النوع",
            type: "select",
            default: "general",
            options: [
              { value: "general", label: "عام" },
              { value: "offer", label: "عرض" },
              { value: "alert", label: "تنبيه" },
              { value: "new_service", label: "خدمة جديدة" },
            ],
          },
          { name: "active", label: "مفعل", type: "boolean", default: true },
        ]}
      />
    </div>
  );
}
