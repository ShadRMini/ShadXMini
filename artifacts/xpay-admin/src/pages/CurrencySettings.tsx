import { useState, useEffect, useMemo } from "react";
import { Globe, Save, DollarSign, RefreshCw, Eye, Percent, CheckCircle2, Sliders, Coins, ArrowRightLeft } from "lucide-react";
import { get, put } from "../lib/api";
import { toast } from "sonner";

export default function CurrencySettings() {
  // القسم 1: العملة الأساسية ورمز العرض
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [showBothCurrencies, setShowBothCurrencies] = useState(true);

  // القسم 2: أسعار الصرف مقابل 1 USD
  const [usdToSyp, setUsdToSyp] = useState<number>(15000);
  const [usdToTry, setUsdToTry] = useState<number>(34.5);
  const [usdToEur, setUsdToEur] = useState<number>(0.92);
  const [usdToSar, setUsdToSar] = useState<number>(3.75);

  // القسم 3: تنسيق الأرقام والأسعار
  const [decimals, setDecimals] = useState<number>(2);
  const [thousandsSeparator, setThousandsSeparator] = useState<string>(",");
  const [decimalSeparator, setDecimalSeparator] = useState<string>(".");

  // حالة التحميل والحفظ
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // جلب كافة الإعدادات عند فتح الصفحة
  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        // جلب الإعدادات من نقطتي النهاية لضمان التوافق التام
        const [currRes, allSettings] = await Promise.all([
          get("/admin/currency-settings").catch(() => null),
          get("/settings").catch(() => null),
        ]);

        const settingsMap = allSettings && typeof allSettings === "object" ? allSettings : {};

        // 1. العملة الأساسية ورمزها
        const storedCurrency = currRes?.storeCurrency || settingsMap?.base_currency || settingsMap?.primary_currency || "USD";
        setBaseCurrency(storedCurrency);
        setCurrencySymbol(currRes?.currencySymbol || settingsMap?.currency_symbol || (storedCurrency === "SYP" ? "ل.س" : "$"));

        // 2. إظهار العملتين معاً
        if (settingsMap?.show_both_currencies !== undefined) {
          setShowBothCurrencies(settingsMap.show_both_currencies !== false && settingsMap.show_both_currencies !== "false");
        }

        // 3. أسعار الصرف
        const sypRate = currRes?.usdToSyp ?? currRes?.exchangeRate ?? settingsMap?.usd_to_syp ?? settingsMap?.exchange_rate ?? 15000;
        setUsdToSyp(Number(sypRate) || 15000);

        if (currRes?.usdToTry || settingsMap?.usd_to_try) {
          setUsdToTry(Number(currRes?.usdToTry || settingsMap?.usd_to_try) || 34.5);
        }
        if (currRes?.usdToEur || settingsMap?.usd_to_eur) {
          setUsdToEur(Number(currRes?.usdToEur || settingsMap?.usd_to_eur) || 0.92);
        }
        if (currRes?.usdToSar || settingsMap?.usd_to_sar) {
          setUsdToSar(Number(currRes?.usdToSar || settingsMap?.usd_to_sar) || 3.75);
        }

        // 4. التنسيق
        if (currRes?.decimals !== undefined || settingsMap?.currency_decimals !== undefined) {
          setDecimals(Number(currRes?.decimals ?? settingsMap?.currency_decimals ?? 2));
        }
        if (currRes?.thousandsSeparator || settingsMap?.thousands_separator) {
          setThousandsSeparator(String(currRes?.thousandsSeparator || settingsMap?.thousands_separator || ","));
        }
        if (currRes?.decimalSeparator || settingsMap?.decimal_separator) {
          setDecimalSeparator(String(currRes?.decimalSeparator || settingsMap?.decimal_separator || "."));
        }
      } catch (err) {
        console.error("[CurrencySettings] Failed to fetch settings:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  // تحديث الرمز التلقائي عند تغيير العملة الأساسية إذا كان الرمز افتراضياً
  const handleCurrencySelect = (curr: string) => {
    setBaseCurrency(curr);
    if (curr === "USD") setCurrencySymbol("$");
    else if (curr === "SYP") setCurrencySymbol("ل.س");
    else if (curr === "TRY") setCurrencySymbol("₺");
    else if (curr === "EUR") setCurrencySymbol("€");
    else if (curr === "SAR") setCurrencySymbol("ر.س");
  };

  // دالة تنسيق الأرقام لمعاينة السعر
  const formatPrice = (val: number, sym: string = currencySymbol) => {
    if (isNaN(val)) return "0";
    const fixed = val.toFixed(decimals);
    const parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
    const formattedNum = parts.length > 1 && decimals > 0 ? parts.join(decimalSeparator) : parts[0];
    return `${formattedNum} ${sym}`;
  };

  // حفظ الإعدادات في قاعدة البيانات
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        storeCurrency: baseCurrency,
        base_currency: baseCurrency,
        primary_currency: baseCurrency,
        currencySymbol,
        currency_symbol: currencySymbol,
        exchangeRate: usdToSyp,
        exchange_rate: String(usdToSyp),
        usd_to_syp: usdToSyp,
        usdToSyp,
        usd_to_try: usdToTry,
        usdToTry,
        usd_to_eur: usdToEur,
        usdToEur,
        usd_to_sar: usdToSar,
        usdToSar,
        show_both_currencies: showBothCurrencies,
        showBothCurrencies,
        decimals,
        currency_decimals: decimals,
        thousandsSeparator,
        thousands_separator: thousandsSeparator,
        decimalSeparator,
        decimal_separator: decimalSeparator,
      };

      // حفظ متزامن في نقطتي النهاية لضمان عمل كل من لوحة التحكم والمتجر
      await Promise.all([
        put("/admin/currency-settings", payload),
        put("/settings", {
          base_currency: baseCurrency,
          primary_currency: baseCurrency,
          currency_symbol: currencySymbol,
          exchange_rate: String(usdToSyp),
          usd_to_syp: String(usdToSyp),
          usd_to_try: String(usdToTry),
          usd_to_eur: String(usdToEur),
          usd_to_sar: String(usdToSar),
          show_both_currencies: showBothCurrencies,
          currency_decimals: decimals,
          thousands_separator: thousandsSeparator,
          decimal_separator: decimalSeparator,
        }).catch(() => null),
      ]);

      toast.success("✅ تم حفظ وتحديث إعدادات العملة وأسعار الصرف بنجاح");
    } catch (err: any) {
      console.error("[CurrencySettings] Save error:", err);
      toast.error(err?.message || "فشل حفظ الإعدادات، يرجى المحاولة مجدداً");
    } finally {
      setSaving(false);
    }
  };

  // إعادة تعيين إلى القيم الافتراضية
  const handleReset = () => {
    if (!confirm("هل ترغب في استعادة الإعدادات الافتراضية للعملة؟")) return;
    setBaseCurrency("USD");
    setCurrencySymbol("$");
    setShowBothCurrencies(true);
    setUsdToSyp(15000);
    setUsdToTry(34.5);
    setUsdToEur(0.92);
    setUsdToSar(3.75);
    setDecimals(2);
    setThousandsSeparator(",");
    setDecimalSeparator(".");
    toast.info("تمت استعادة القيم الافتراضية، اضغط حفظ لتطبيقها");
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#2D2D2D] border border-[#C8A45C]/30 p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#FDE68A] shrink-0">
            <Coins size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#FDE68A]">إعدادات العملة والأسعار المالية</h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              إدارة العملة الأساسية، أسعار الصرف المتعددة، تنسيق الأرقام، والمعاينة الحية للمتجر
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 bg-[#1A1A1A] hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            <span>إعادة تعيين</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* العمود الرئيسي: الأقسام 1 و 2 و 3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* القسم 1: العملة الأساسية ورمز العرض */}
            <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 p-6 rounded-3xl shadow-xl space-y-5">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Globe size={18} className="text-[#C8A45C]" />
                <h3 className="text-base font-bold text-[#FDE68A]">القسم 1: العملة الأساسية ورمز العرض</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-2">
                    العملة الأساسية للنظام (Base Currency)
                  </label>
                  <select
                    value={baseCurrency}
                    onChange={(e) => handleCurrencySelect(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#C8A45C]/40 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C8A45C] cursor-pointer"
                  >
                    <option value="USD">🇺🇸 دولار أمريكي (USD)</option>
                    <option value="SYP">🇸🇾 ليرة سورية (SYP)</option>
                    <option value="TRY">🇹🇷 ليرة تركية (TRY)</option>
                    <option value="EUR">🇪🇺 يورو (EUR)</option>
                    <option value="SAR">🇸🇦 ريال سعودي (SAR)</option>
                  </select>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    العملة التي تُخزن بها الحسابات والأسعار المرجعية
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-2">
                    رمز العرض للعملة (Display Symbol)
                  </label>
                  <input
                    type="text"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    placeholder="$"
                    maxLength={10}
                    className="w-full bg-[#1A1A1A] border border-[#C8A45C]/40 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C8A45C]"
                    required
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">الرمز الذي يظهر بجانب المبالغ للمستخدم</p>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/80">
                <label className="flex items-center gap-3 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={showBothCurrencies}
                    onChange={(e) => setShowBothCurrencies(e.target.checked)}
                    className="w-5 h-5 accent-[#C8A45C] rounded border-zinc-700 bg-[#1A1A1A] cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-bold text-zinc-200 group-hover:text-[#FDE68A] transition">
                      عرض السعر بالعملتين معاً في المتجر (USD + SYP)
                    </span>
                    <p className="text-[11px] text-zinc-400">
                      إظهار السعر بالدولار الأمريكي وبالمقابل بالليرة السورية على بطاقات المنتجات
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* القسم 2: أسعار الصرف */}
            <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 p-6 rounded-3xl shadow-xl space-y-5">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                <ArrowRightLeft size={18} className="text-[#C8A45C]" />
                <h3 className="text-base font-bold text-[#FDE68A]">القسم 2: أسعار الصرف (مقابل 1 USD)</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* 1 USD = SYP */}
                <div className="p-4 bg-[#1A1A1A] border border-[#C8A45C]/20 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-300">🇸🇾 الليرة السورية (SYP)</span>
                    <span className="text-[10px] text-[#C8A45C] font-mono">1 USD = {usdToSyp.toLocaleString()} SYP</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={usdToSyp}
                      onChange={(e) => setUsdToSyp(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#0A0A0A] border border-[#C8A45C]/40 rounded-xl px-3 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-[#C8A45C]"
                      required
                    />
                  </div>
                </div>

                {/* 1 USD = TRY */}
                <div className="p-4 bg-[#1A1A1A] border border-zinc-800 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-300">🇹🇷 الليرة التركية (TRY)</span>
                    <span className="text-[10px] text-zinc-400 font-mono">1 USD = {usdToTry} TRY</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={usdToTry}
                    onChange={(e) => setUsdToTry(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0A0A0A] border border-zinc-700 rounded-xl px-3 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-[#C8A45C]"
                    required
                  />
                </div>

                {/* 1 USD = EUR */}
                <div className="p-4 bg-[#1A1A1A] border border-zinc-800 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-300">🇪🇺 اليورو (EUR)</span>
                    <span className="text-[10px] text-zinc-400 font-mono">1 USD = {usdToEur} EUR</span>
                  </div>
                  <input
                    type="number"
                    step="0.001"
                    min="0.01"
                    value={usdToEur}
                    onChange={(e) => setUsdToEur(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0A0A0A] border border-zinc-700 rounded-xl px-3 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-[#C8A45C]"
                    required
                  />
                </div>

                {/* 1 USD = SAR */}
                <div className="p-4 bg-[#1A1A1A] border border-zinc-800 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-300">🇸🇦 الريال السعودي (SAR)</span>
                    <span className="text-[10px] text-zinc-400 font-mono">1 USD = {usdToSar} SAR</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={usdToSar}
                    onChange={(e) => setUsdToSar(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0A0A0A] border border-zinc-700 rounded-xl px-3 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-[#C8A45C]"
                    required
                  />
                </div>
              </div>
            </div>

            {/* القسم 3: تنسيق الأرقام */}
            <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 p-6 rounded-3xl shadow-xl space-y-5">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Sliders size={18} className="text-[#C8A45C]" />
                <h3 className="text-base font-bold text-[#FDE68A]">القسم 3: تنسيق الأرقام والأسعار</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-2">الخانات العشرية</label>
                  <select
                    value={decimals}
                    onChange={(e) => setDecimals(parseInt(e.target.value))}
                    className="w-full bg-[#1A1A1A] border border-[#C8A45C]/40 rounded-xl px-3 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-[#C8A45C]"
                  >
                    <option value="0">بدون خانات (0)</option>
                    <option value="2">خانتان (0.00)</option>
                    <option value="4">4 خانات (0.0000)</option>
                    <option value="8">8 خانات (للعملات الرقمية)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-2">فاصل الآلاف (Thousands)</label>
                  <select
                    value={thousandsSeparator}
                    onChange={(e) => setThousandsSeparator(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#C8A45C]/40 rounded-xl px-3 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-[#C8A45C]"
                  >
                    <option value=",">فاصلة ( , ) مثل 15,000</option>
                    <option value=".">نقطة ( . ) مثل 15.000</option>
                    <option value=" ">مسافة ( ) مثل 15 000</option>
                    <option value="">بدون فاصل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-2">الفاصل العشري (Decimal)</label>
                  <select
                    value={decimalSeparator}
                    onChange={(e) => setDecimalSeparator(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#C8A45C]/40 rounded-xl px-3 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-[#C8A45C]"
                  >
                    <option value=".">نقطة ( . ) مثل 99.99</option>
                    <option value=",">فاصلة ( , ) مثل 99,99</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* العمود الجانبي: المعاينة الحية وزر الحفظ */}
          <div className="space-y-6">
            {/* القسم 4: المعاينة الحية */}
            <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 p-6 rounded-3xl shadow-xl space-y-5 sticky top-6">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Eye size={18} className="text-[#C8A45C]" />
                <h3 className="text-base font-bold text-[#FDE68A]">القسم 4: معاينة حية للمتجر</h3>
              </div>

              <div className="space-y-4">
                {/* بطاقة نموذج منتج */}
                <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-zinc-800 space-y-3">
                  <span className="text-[11px] font-bold text-zinc-400 block">نموذج منتج (سعر أساسي 99.99 USD):</span>
                  
                  <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2">
                    <span className="text-xs text-zinc-400">السعر بالعملة الأساسية:</span>
                    <span className="text-sm font-mono font-bold text-[#FDE68A]">
                      {formatPrice(99.99)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2">
                    <span className="text-xs text-zinc-400">بالليرة السورية (SYP):</span>
                    <span className="text-sm font-mono font-bold text-emerald-400">
                      {formatPrice(99.99 * usdToSyp, "ل.س")}
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2">
                    <span className="text-xs text-zinc-400">بالليرة التركية (TRY):</span>
                    <span className="text-sm font-mono text-zinc-300">
                      {formatPrice(99.99 * usdToTry, "₺")}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400">باليورو (EUR):</span>
                    <span className="text-sm font-mono text-zinc-300">
                      {formatPrice(99.99 * usdToEur, "€")}
                    </span>
                  </div>
                </div>

                {/* بطاقة عرض الرصيد المزدوج */}
                <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-[#C8A45C]/30 space-y-2">
                  <div className="text-xs font-bold text-zinc-300">شكل عرض السعر المزدوج في المتجر:</div>
                  <div className="p-3 bg-[#0A0A0A] rounded-xl border border-zinc-800 text-center">
                    {showBothCurrencies ? (
                      <div className="space-y-1">
                        <div className="text-base font-black text-[#FDE68A] font-mono">
                          {formatPrice(99.99, "$")}
                        </div>
                        <div className="text-xs font-bold text-zinc-400 font-mono">
                          ≈ {formatPrice(99.99 * usdToSyp, "ل.س")}
                        </div>
                      </div>
                    ) : (
                      <div className="text-base font-black text-[#FDE68A] font-mono">
                        {formatPrice(99.99)}
                      </div>
                    )}
                  </div>
                </div>

                {/* أزرار الحفظ والإجراءات */}
                <div className="pt-2 space-y-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-[#C8A45C] hover:bg-[#b8934d] text-[#1A1A1A] font-black py-3.5 px-6 rounded-2xl shadow-xl transition cursor-pointer disabled:opacity-50 text-sm"
                  >
                    <Save size={18} />
                    <span>{saving ? "جاري الحفظ..." : "حفظ جميع الإعدادات"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
