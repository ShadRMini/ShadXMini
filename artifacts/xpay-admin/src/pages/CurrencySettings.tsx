import { useState, useEffect } from "react";
import { Globe, Save, DollarSign } from "lucide-react";
import { get, put } from "../lib/api";

export default function CurrencySettings() {
  const [currency, setCurrency] = useState("USD");
  const [rate, setRate] = useState("1.0");
  const [symbol, setSymbol] = useState("$");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    get("/admin/currency-settings")
      .then((res: any) => {
        if (res && typeof res === "object") {
          setCurrency(res.storeCurrency || "USD");
          setRate(String(res.exchangeRate || "1.0"));
          setSymbol(res.currencySymbol || "$");
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await put("/admin/currency-settings", {
        storeCurrency: currency,
        exchangeRate: Number(rate),
        currencySymbol: symbol,
      });
      alert("تم حفظ إعدادات العملة بنجاح");
    } catch (err: any) {
      alert(err?.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 bg-[#2D2D2D] border border-[#C8A45C]/30 p-6 rounded-3xl shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#FDE68A]">
          <Globe size={24} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#FDE68A]">عملة المتجر والإعدادات المالية</h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">إدارة رمز العملة، أسعار الصرف، وتنسيق الأرقام في المنصة</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-[#2D2D2D] border border-[#C8A45C]/30 p-6 rounded-3xl shadow-xl space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-bold text-zinc-300 mb-2">رمز العملة (مثل USD, SAR)</label>
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#C8A45C]/40 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C8A45C]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-300 mb-2">رمز العملة البصري ($ أو ر.س)</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#C8A45C]/40 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C8A45C]"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-zinc-300 mb-2">سعر الصرف مقابل الدولار الأمريكي</label>
          <div className="relative">
            <DollarSign size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C8A45C]" />
            <input
              type="number"
              step="0.0001"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#C8A45C]/40 rounded-xl pr-10 pl-4 py-3 text-white font-bold focus:outline-none focus:border-[#C8A45C]"
              required
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[#C8A45C] hover:bg-[#b8934d] text-[#1A1A1A] font-black px-6 py-3 rounded-xl transition shadow-lg cursor-pointer disabled:opacity-50"
          >
            <Save size={18} />
            <span>{saving ? "جاري الحفظ..." : "حفظ التغييرات"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
