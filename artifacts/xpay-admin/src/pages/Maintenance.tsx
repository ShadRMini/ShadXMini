import { useEffect, useState } from "react";
import { get, put } from "../lib/api";
import { PowerOff, Save, Wrench } from "lucide-react";

const DEFAULT_TITLE = "الموقع قيد الصيانة المؤقتة";
const DEFAULT_MESSAGE =
  "نعمل حاليًّا على تنفيذ مجموعة من أعمال الصيانة والتحديث لتحسين أداء الموقع، وتعزيز مستوى الأمان، وتطوير تجربة المستخدم بشكل أفضل. نعتذر عن أي إزعاج قد يسببه ذلك، ونرجو منكم التفضل بالعودة لاحقًا.";

export default function Maintenance() {
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [icon, setIcon] = useState("Wrench");
  const [contactEnabled, setContactEnabled] = useState(true);
  const [contactText, setContactText] = useState("تواصل معنا");
  const [contactUrl, setContactUrl] = useState("/support");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get("/maintenance-settings")
      .then((data: any) => {
        if (data) {
          setEnabled(Boolean(data.maintenanceMode));
          setTitle(String(data.maintenanceTitle || DEFAULT_TITLE));
          setMessage(String(data.maintenanceMessage || DEFAULT_MESSAGE));
          setIcon(String(data.maintenanceIcon || "Wrench"));
          setContactEnabled(Boolean(data.maintenanceContactEnabled));
          setContactText(String(data.maintenanceContactText || "تواصل معنا"));
          setContactUrl(String(data.maintenanceContactUrl || "/support"));
          setEstimatedTime(String(data.maintenanceEstimatedTime || ""));
        }
      })
      .catch(() => {
        get("/settings/list").then((arr: any[]) => {
          const map = Object.fromEntries(arr.map((s) => [s.key, s.value]));
          setEnabled(map.maintenance_mode === true || map.maintenance_mode === "true");
          setTitle(String(map.maintenance_title || DEFAULT_TITLE));
          setMessage(String(map.maintenance_message || DEFAULT_MESSAGE));
          setIcon(String(map.maintenance_icon || "Wrench"));
          setContactEnabled(map.maintenance_contact_enabled !== false && map.maintenance_contact_enabled !== "false");
          setContactText(String(map.maintenance_contact_text || "تواصل معنا"));
          setContactUrl(String(map.maintenance_contact_url || "/support"));
          setEstimatedTime(String(map.maintenance_estimated_time || ""));
        }).catch(() => {});
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await put("/maintenance-settings", {
      maintenance_mode: enabled,
      maintenance_title: title || DEFAULT_TITLE,
      maintenance_message: message || DEFAULT_MESSAGE,
      maintenance_icon: icon,
      maintenance_contact_enabled: contactEnabled,
      maintenance_contact_text: contactText,
      maintenance_contact_url: contactUrl,
      maintenance_estimated_time: estimatedTime,
    });
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  };

  if (loading) {
    return <div className="p-6 text-slate-500">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <PowerOff className="text-amber-600" /> إعدادات وضع الصيانة
        </h1>
      </div>

      <form onSubmit={save} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
        <label className="flex items-center justify-between p-4 border border-amber-200 bg-amber-50/50 rounded-xl cursor-pointer">
          <div>
            <div className="font-bold text-slate-900">تفعيل وضع الصيانة العام</div>
            <div className="text-xs text-slate-600 mt-0.5">عند التفعيل، ستظهر صفحة الصيانة الفاخرة لجميع عملاء المتجر (باستثناء المشرفين).</div>
          </div>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-6 h-6 accent-amber-600 cursor-pointer" />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">العنوان الرئيسي</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500" required />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">أيقونة الصيانة</label>
            <select value={icon} onChange={(e) => setIcon(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500">
              <option value="Wrench">مفتاح ربط (Wrench)</option>
              <option value="Construction">إنشاءات / صيانة (Construction)</option>
              <option value="Clock">ساعة انتظار (Clock)</option>
              <option value="ShieldAlert">تنبيه أمان (ShieldAlert)</option>
              <option value="Server">خادم / سيرفر (Server)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">رسالة الصيانة التفصيلية</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500" required />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">وقت الانتهاء المتوقع (اختياري)</label>
          <input value={estimatedTime} onChange={(e) => setEstimatedTime(e.target.value)} placeholder="مثال: متوقع العودة اليوم الساعة 6:00 مساءً" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500" />
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-4">
          <label className="flex items-center justify-between p-3 border border-slate-200 rounded-lg cursor-pointer">
            <div>
              <div className="font-semibold text-slate-800 text-sm">إظهار زر التواصل</div>
              <div className="text-xs text-slate-500">تمكين الزر لمساعدة العملاء في التواصل أثناء الصيانة.</div>
            </div>
            <input type="checkbox" checked={contactEnabled} onChange={(e) => setContactEnabled(e.target.checked)} className="w-5 h-5 accent-amber-600 cursor-pointer" />
          </label>

          {contactEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">نص زر التواصل</label>
                <input value={contactText} onChange={(e) => setContactText(e.target.value)} placeholder="تواصل معنا عبر الدعم" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">رابط زر التواصل</label>
                <input value={contactUrl} onChange={(e) => setContactUrl(e.target.value)} placeholder="/support أو رابط واتساب" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          )}
        </div>

        {done && <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">تم حفظ إعدادات وضع الصيانة بنجاح.</div>}
        <button type="submit" className="bg-amber-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-amber-700 transition flex items-center gap-2 shadow-lg shadow-amber-900/10">
          <Save size={18} /> حفظ التغييرات
        </button>
      </form>
    </div>
  );
}
