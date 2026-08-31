import { useEffect, useState } from "react";
import { get, put } from "../lib/api";
import { Save, Palette, CheckCircle2 } from "lucide-react";
import { applyAdminTheme, broadcastThemeChange } from "../lib/theme";

const FIELDS = [
  { key: "theme_primary", label: "اللون الرئيسي", type: "color", default: "#C8A45C" },
  { key: "theme_accent", label: "اللون الثانوي (Accent)", type: "color", default: "#FDE68A" },
  { key: "theme_bg", label: "خلفية المتجر", type: "color", default: "#1A1A1A" },
  { key: "theme_font", label: "الخط العربي والافتراضي", type: "text", default: "Changa" },
  { key: "theme_radius", label: "نصف القطر (px)", type: "number", default: "16" },
];

export default function ThemeLegacy() {
  const [values, setValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    get("/admin/theme-settings")
      .then((data: any) => {
        const obj: Record<string, any> = {};
        FIELDS.forEach((f) => (obj[f.key] = f.default));
        if (data && typeof data === "object") {
          FIELDS.forEach((f) => {
            if (data[f.key] !== undefined) obj[f.key] = data[f.key];
            if (f.key === "theme_bg" && data.theme_background) obj.theme_bg = data.theme_background;
            if (f.key === "theme_font" && data.theme_font_arabic) obj.theme_font = data.theme_font_arabic;
            if (f.key === "theme_radius" && data.theme_border_radius) obj.theme_radius = data.theme_border_radius;
          });
        }
        setValues(obj);
      })
      .catch(() => {
        get("/settings/list")
          .then((arr: any[]) => {
            const obj: Record<string, any> = {};
            FIELDS.forEach((f) => (obj[f.key] = f.default));
            if (Array.isArray(arr)) {
              arr.forEach((s) => {
                if (s.key in obj) obj[s.key] = s.value;
              });
            }
            setValues(obj);
          })
          .catch(() => {});
      });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const items = FIELDS.map((f) => ({ key: f.key, value: values[f.key] }));
      const payload: Record<string, any> = {
        theme_primary: values.theme_primary,
        theme_accent: values.theme_accent,
        theme_background: values.theme_bg,
        theme_bg: values.theme_bg,
        theme_font_arabic: values.theme_font,
        theme_font: values.theme_font,
        theme_border_radius: values.theme_radius,
        theme_radius: values.theme_radius,
      };

      try {
        await put("/admin/theme-settings", payload);
      } catch {
        await put("/settings/items", { items });
      }

      applyAdminTheme(payload);
      broadcastThemeChange(payload);

      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      console.error("Failed to save legacy theme:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 text-zinc-100" dir="rtl">
      <div className="flex items-center justify-between bg-[#242424] p-4 rounded-2xl border border-[#C8A45C]/20 shadow-md">
        <h1 className="text-xl font-bold text-[#FDE68A] flex items-center gap-2">
          <Palette className="text-[#C8A45C]" /> تخصيص التصميم (الواجهة القديمة)
        </h1>
      </div>

      <form onSubmit={save} className="bg-[#1F1F1F] rounded-2xl shadow-xl border border-[#C8A45C]/30 p-6 space-y-4 max-w-2xl">
        {FIELDS.map((f) => (
          <div key={f.key} className="grid grid-cols-3 items-center gap-3">
            <label className="text-xs font-bold text-zinc-300">{f.label}</label>
            <input
              type={f.type}
              value={values[f.key] ?? f.default}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              className="col-span-2 bg-[#2D2D2D] border border-zinc-700 rounded-xl px-3 py-2 text-xs h-10 text-white focus:border-[#C8A45C] transition"
            />
          </div>
        ))}

        {done && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} /> تم الحفظ وتطبيق التصميم فوراً على النظام والمتجر!
          </div>
        )}

        <button
          disabled={saving}
          className="bg-gradient-to-r from-[#C8A45C] to-[#B8954A] text-black px-6 py-2.5 rounded-xl font-bold hover:brightness-110 disabled:opacity-50 flex items-center gap-2 cursor-pointer text-xs shadow-lg"
        >
          <Save size={16} /> {saving ? "جاري الحفظ..." : "حفظ التصميم"}
        </button>

        <p className="text-[11px] text-zinc-400">
          يتم تطبيق التصميم وحفظه في السيرفر وتحديث واجهة المتجر ولوحة التحكم بشكل متزامن وفوري.
        </p>
      </form>
    </div>
  );
}

