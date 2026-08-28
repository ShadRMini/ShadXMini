import { useState, useEffect } from "react";
import { Server, AlertTriangle, CheckCircle, RefreshCw, Layers } from "lucide-react";
import { get } from "../lib/api";

export default function ProviderReports() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await get("/admin/provider-reports");
      if (Array.isArray(res)) {
        setReportData(res);
      } else {
        setReportData([]);
      }
    } catch {
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#2D2D2D] border border-[#C8A45C]/30 p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#FDE68A]">
            <Server size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#FDE68A]">تقارير المزودين والمزامنة</h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">مراقبة تنبيهات المزامنة والخدمات المتوقفة خلال آخر 24 ساعة</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 bg-[#C8A45C] hover:bg-[#b8934d] text-[#1A1A1A] font-bold px-4 py-2.5 rounded-xl transition shadow-md cursor-pointer"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span>تحديث البيانات</span>
        </button>
      </div>

      {/* Sync Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-bold">حالة المزامنة العامة</p>
            <p className="text-lg font-black text-white mt-0.5">متصل ومستقر</p>
          </div>
        </div>
        <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-bold">الخدمات المتوقفة</p>
            <p className="text-lg font-black text-white mt-0.5">{reportData.length} خدمات</p>
          </div>
        </div>
        <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#C8A45C]/20 text-[#C8A45C] flex items-center justify-center">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-bold">فترة المراقبة</p>
            <p className="text-lg font-black text-white mt-0.5">آخر 24 ساعة</p>
          </div>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-[#C8A45C]/20 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#FDE68A]">جدول مراقبة الخدمات المتوقفة والمحذوفة</h2>
          <span className="text-xs bg-[#1A1A1A] text-zinc-300 px-3 py-1 rounded-full border border-zinc-700 font-bold">
            {reportData.length} عنصر
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-[#1A1A1A] text-zinc-400 text-xs font-bold border-b border-[#C8A45C]/20">
              <tr>
                <th className="px-5 py-3.5">ID</th>
                <th className="px-5 py-3.5">اسم الخدمة</th>
                <th className="px-5 py-3.5">المزود</th>
                <th className="px-5 py-3.5">التكلفة (API)</th>
                <th className="px-5 py-3.5">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-zinc-400 font-bold">
                    جاري تحميل التقرير...
                  </td>
                </tr>
              ) : reportData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-1">
                        <CheckCircle size={24} />
                      </div>
                      <p className="text-base font-black text-white">لا توجد خدمات متوقفة حالياً</p>
                      <p className="text-xs text-zinc-400">جميع خدمات المزودين تعمل بشكل طبيعي ومستقر.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                reportData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#353535] transition-colors">
                    <td className="px-5 py-4 font-mono text-[#FDE68A] font-bold">#{item.id || idx + 1}</td>
                    <td className="px-5 py-4 font-bold text-white">{item.name || item.serviceName}</td>
                    <td className="px-5 py-4 text-zinc-300">{item.providerName || "المزود الرئيسي"}</td>
                    <td className="px-5 py-4 font-mono text-emerald-400">${item.cost || "0.00"}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <AlertTriangle size={12} /> متوقف / محذوف
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
