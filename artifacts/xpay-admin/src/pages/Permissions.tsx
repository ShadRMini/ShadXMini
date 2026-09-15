import { useState, useEffect } from "react";
import { Lock, Save, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { get, put } from "../lib/api";

const ROLES = [
  { name: "مدير عام", key: "super_admin", desc: "صلاحيات كاملة على جميع الأقسام" },
  { name: "مشرف", key: "admin", desc: "إدارة المتجر والطلبات والمستخدمين" },
  { name: "دعم فني", key: "support", desc: "عرض الطلبات والمستخدمين والرد فقط" },
];

const SECTIONS = [
  "الطلبات", "الإيداعات", "المستخدمون", "الأقسام", "المنتجات", "طرق الدفع",
  "البانرات", "الأخبار", "المزودون", "الكوبونات", "VIP", "الإشعارات",
  "الإعدادات", "النسخ الاحتياطي", "المشرفون", "سجل النشاط",
];

export default function Permissions() {
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // جلب المصفوفة عند التحميل
  useEffect(() => {
    async function fetchMatrix() {
      try {
        const data = await get("/permissions/matrix");
        if (data && typeof data === "object") {
          setMatrix(data);
        }
      } catch (err) {
        console.error("[Permissions] Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMatrix();
  }, []);

  const isChecked = (roleKey: string, section: string) => {
    if (matrix[roleKey]?.[section] !== undefined) {
      return !!matrix[roleKey][section];
    }
    // Default fallback values
    if (roleKey === "super_admin") return true;
    if (roleKey === "admin") return true;
    return ["الطلبات", "المستخدمون", "الإيداعات"].includes(section);
  };

  const handleToggle = (roleKey: string, section: string) => {
    const current = isChecked(roleKey, section);
    setMatrix((prev) => ({
      ...prev,
      [roleKey]: {
        ...(prev[roleKey] || {}),
        [section]: !current,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build full state if some keys are unset
      const fullMatrix: Record<string, Record<string, boolean>> = {};
      ROLES.forEach((r) => {
        fullMatrix[r.key] = {};
        SECTIONS.forEach((s) => {
          fullMatrix[r.key][s] = isChecked(r.key, s);
        });
      });

      await put("/permissions/matrix", fullMatrix);
      toast.success("✅ تم حفظ وتحديث مصفوفة الصلاحيات بنجاح");
    } catch (err: any) {
      console.error("[Permissions] Save error:", err);
      toast.error(err.message || "فشل حفظ الصلاحيات");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#2D2D2D] border border-[#C8A45C]/30 p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#FDE68A]">
            <Lock size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#FDE68A]">مصفوفة الصلاحيات والأدوار</h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">تكوين وتخصيص صلاحيات الوصول للأقسام المختلفة بحسب الدور الوظيفي</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#C8A45C] hover:bg-[#b8934d] text-[#1A1A1A] font-bold text-sm rounded-2xl shadow-lg transition-all disabled:opacity-50 cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" /> جاري الحفظ...
            </>
          ) : (
            <>
              <Save size={16} /> حفظ الصلاحيات
            </>
          )}
        </button>
      </div>

      <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-[#C8A45C]/20 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#FDE68A]">جدول صلاحيات الأقسام</h2>
          <span className="text-xs bg-[#1A1A1A] text-zinc-400 px-3 py-1 rounded-full border border-zinc-800 font-bold flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-[#C8A45C]" /> يتم تطبيق الصلاحيات ديناميكياً
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-[#1A1A1A] text-zinc-400 text-xs font-bold border-b border-[#C8A45C]/20">
              <tr>
                <th className="text-right px-6 py-4 font-bold text-zinc-300">القسم / الصفحة</th>
                {ROLES.map((r) => (
                  <th key={r.key} className="text-center px-6 py-4 font-bold text-[#FDE68A]">
                    <div>{r.name}</div>
                    <div className="text-[10px] text-zinc-500 font-normal">{r.desc}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {SECTIONS.map((s) => (
                <tr key={s} className="hover:bg-[#353535] transition-colors">
                  <td className="px-6 py-4 font-bold text-white">{s}</td>
                  {ROLES.map((r) => (
                    <td key={r.key} className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked(r.key, s)}
                        onChange={() => handleToggle(r.key, s)}
                        className="w-5 h-5 accent-[#C8A45C] rounded cursor-pointer transition"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer save bar */}
        <div className="p-4 bg-[#1A1A1A] border-t border-[#C8A45C]/20 flex items-center justify-between">
          <p className="text-xs text-zinc-400">تأكد من الضغط على "حفظ الصلاحيات" لتطبيق أي تعديل تجريه على المصفوفة.</p>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C8A45C] hover:bg-[#b8934d] text-[#1A1A1A] font-bold text-xs rounded-xl shadow transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            حفظ التغييرات
          </button>
        </div>
      </div>
    </div>
  );
}
