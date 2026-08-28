import { useState } from "react";
import { Activity, Play, Clock, CheckCircle2 } from "lucide-react";

export default function CronJobs() {
  const [jobs, setJobs] = useState([
    { id: 1, name: "مزامنة طلبات API التلقائية", schedule: "كل 5 دقائق", status: "نشط", lastRun: "منذ دقيقتين" },
    { id: 2, name: "تحديث أسعار العملات والخدمات", schedule: "كل ساعة", status: "نشط", lastRun: "منذ 45 دقيقة" },
    { id: 3, name: "تنظيف الجلسات والملفات المؤقتة", schedule: "يومياً", status: "نشط", lastRun: "أمس" },
  ]);

  const handleRunNow = (name: string) => {
    alert(`تم تشغيل المهمة "${name}" بنجاح!`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 bg-[#2D2D2D] border border-[#C8A45C]/30 p-6 rounded-3xl shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#FDE68A]">
          <Activity size={24} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#FDE68A]">العمليات والمهام المجدولة (Cron Jobs)</h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">مراقبة وتشغيل المهام التلقائية المجدولة في الخلفية</p>
        </div>
      </div>

      <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-[#C8A45C]/20 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#FDE68A]">قائمة المهام المجدولة النشطة</h2>
          <span className="text-xs bg-[#1A1A1A] text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30 font-bold flex items-center gap-1.5">
            <CheckCircle2 size={12} /> النظام يعمل بكفاءة
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-[#1A1A1A] text-zinc-400 text-xs font-bold border-b border-[#C8A45C]/20">
              <tr>
                <th className="px-5 py-3.5">اسم المهمة</th>
                <th className="px-5 py-3.5">التكرار والجدولة</th>
                <th className="px-5 py-3.5">آخر تنفيذ</th>
                <th className="px-5 py-3.5">الحالة</th>
                <th className="px-5 py-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-[#353535] transition-colors">
                  <td className="px-5 py-4 font-bold text-white flex items-center gap-2">
                    <Clock size={16} className="text-[#C8A45C]" /> {job.name}
                  </td>
                  <td className="px-5 py-4 text-zinc-300 font-mono text-xs">{job.schedule}</td>
                  <td className="px-5 py-4 text-zinc-400 text-xs">{job.lastRun}</td>
                  <td className="px-5 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {job.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => handleRunNow(job.name)}
                      className="inline-flex items-center gap-1.5 bg-[#C8A45C] hover:bg-[#b8934d] text-[#1A1A1A] font-bold px-3 py-1.5 rounded-xl text-xs transition shadow cursor-pointer"
                    >
                      <Play size={12} /> تشغيل الآن
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
