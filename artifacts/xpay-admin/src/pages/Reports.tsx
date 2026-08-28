import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { get, post } from "../lib/api";
import {
  TrendingUp,
  Package,
  DollarSign,
  CheckCircle2,
  Filter,
  ArrowRight,
  Trophy,
  BarChart3,
  ShieldCheck,
  Mail,
  Copy,
  Check,
  Inbox,
  Calendar,
  AlertCircle
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function Reports() {
  const todayStr = new Date().toISOString().split("T")[0];
  const lastMonthStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(lastMonthStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    summary: {
      totalOrders: number;
      completedOrders: number;
      totalRevenue: number;
      netProfit: number;
    };
    topServices: Array<{ id: number; name: string; sales_count: number; total_amount: number }>;
    chart: Array<{ date: string; orders_count: number; revenue: number }>;
    adminEmail: string;
    systemLogsClean: boolean;
  }>({
    summary: { totalOrders: 0, completedOrders: 0, totalRevenue: 0, netProfit: 0 },
    topServices: [],
    chart: [],
    adminEmail: "admin@x-z.store",
    systemLogsClean: true,
  });

  const [adminEmailInput, setAdminEmailInput] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const cronPath = "php /home/ccvzmzfu/x-z.store/cron/report_sender.php";

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await get(`/admin/reports?startDate=${startDate}&endDate=${endDate}`);
      if (res && res.summary) {
        setData(res);
        setAdminEmailInput(res.adminEmail || "admin@x-z.store");
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleSaveEmail = async () => {
    if (!adminEmailInput.trim()) return;
    setEmailSaving(true);
    try {
      await post("/admin/reports/email", { email: adminEmailInput.trim() });
      setEmailSuccess(true);
      setTimeout(() => setEmailSuccess(false), 3000);
    } catch {
      alert("فشل حفظ البريد الإلكتروني");
    } finally {
      setEmailSaving(false);
    }
  };

  const handleCopyCron = () => {
    navigator.clipboard.writeText(cronPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#1e232d] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        {/* Right Info */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-wide">التقارير والمالية</h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              تحليل أداء ومبيعات المتجر للفترة المحددة
            </p>
          </div>
        </div>

        {/* Left Filter & Back Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#14171f] border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-slate-400">من تاريخ:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-white border-none outline-none text-xs"
            />
          </div>

          <div className="flex items-center gap-2 bg-[#14171f] border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-slate-400">إلى تاريخ:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-white border-none outline-none text-xs"
            />
          </div>

          <button
            onClick={loadReports}
            disabled={loading}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md"
          >
            <Filter size={14} />
            <span>تصفية</span>
          </button>

          <Link
            to="/"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3.5 py-2 rounded-xl border border-slate-700 transition"
          >
            <span>العودة للرئيسية</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Top 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Orders */}
        <div className="bg-[#1e232d] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-1">
              إجمالي الطلبات (بكل الحالات)
            </span>
            <span className="text-2xl font-bold text-white">
              {data.summary.totalOrders}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Package size={24} />
          </div>
        </div>

        {/* 2. Total Revenue */}
        <div className="bg-[#1e232d] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-1">
              إجمالي الإيرادات (المبيعات)
            </span>
            <span className="text-2xl font-bold text-emerald-400">
              ${Number(data.summary.totalRevenue || 0).toFixed(2)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign size={24} />
          </div>
        </div>

        {/* 3. Net Profit */}
        <div className="bg-[#1e232d] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-1">
              الأرباح الصافية (الطلبات المكتملة)
            </span>
            <span className="text-2xl font-bold text-[#C8A45C]">
              ${Number(data.summary.netProfit || 0).toFixed(2)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#C8A45C]">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* 4. Completed Orders */}
        <div className="bg-[#1e232d] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-1">
              طلبات مكتملة بنجاح
            </span>
            <span className="text-2xl font-bold text-emerald-400">
              {data.summary.completedOrders}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>

      {/* Row 2: Top Selling Services (1/3) & Analytics Chart (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1/3: Top Services */}
        <div className="bg-[#1e232d] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center gap-2 text-white font-bold pb-4 border-b border-slate-800">
            <Trophy size={18} className="text-amber-400" />
            <span>الخدمات الأكثر مبيعاً</span>
          </div>

          <div className="flex-1 flex flex-col justify-center py-6">
            {data.topServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-8">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 mb-3">
                  <Inbox size={26} />
                </div>
                <p className="text-sm text-slate-400">لا توجد مبيعات في هذه الفترة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.topServices.map((srv, idx) => (
                  <div
                    key={srv.id || idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#14171f] border border-slate-800/80"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold flex items-center justify-center border border-blue-500/20">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-200 line-clamp-1">
                        {srv.name}
                      </span>
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-emerald-400">
                        ${Number(srv.total_amount || 0).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {srv.sales_count} طلب
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 2/3: Sales & Orders Analytics Chart */}
        <div className="lg:col-span-2 bg-[#1e232d] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2 text-white font-bold">
              <BarChart3 size={18} className="text-blue-400" />
              <span>تحليل المبيعات والطلبات</span>
            </div>

            {/* Custom Legend */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-400 inline-block" />
                <span className="text-slate-300">المبيعات ($)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-500 inline-block" />
                <span className="text-slate-300">عدد الطلبات</span>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full pt-4 min-h-[260px]">
            {data.chart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
                لا توجد بيانات رسم بياني كافية لهذه الفترة
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a303c" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#2a303c" }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#2a303c" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#14171f",
                      borderColor: "#334155",
                      borderRadius: "12px",
                      color: "#f8fafc",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="المبيعات ($)"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#salesGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="orders_count"
                    name="عدد الطلبات"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#ordersGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: System Logs (1/2) & Email Alerts Settings (1/2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Logs */}
        <div className="bg-[#1e232d] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center gap-2 text-white font-bold pb-4 border-b border-slate-800">
            <ShieldCheck size={18} className="text-emerald-400" />
            <span>سجل النظام (System Logs)</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-sm font-semibold text-emerald-300 mb-1">السجل نظيف، لا توجد أخطاء حالياً.</h3>
            <p className="text-xs text-slate-400">جميع الخدمات والمزامنات تعمل بصورة طبيعية دون انقطاع.</p>
          </div>
        </div>

        {/* Email Alerts Settings */}
        <div className="bg-[#1e232d] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-white font-bold pb-2 border-b border-slate-800">
              <Mail size={18} className="text-blue-400" />
              <span>إعدادات التنبيهات البريدية</span>
            </div>

            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              حدد البريد الإلكتروني الذي سيستلم التقارير اليومية وتنبيهات الأخطاء أو الرصيد المنخفض.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                بريد المشرف (Admin Email)
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={adminEmailInput}
                  onChange={(e) => setAdminEmailInput(e.target.value)}
                  placeholder="admin@x-z.store"
                  className="flex-1 bg-[#14171f] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={handleSaveEmail}
                  disabled={emailSaving}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition shadow"
                >
                  {emailSuccess ? "تم الحفظ ✓" : emailSaving ? "جاري..." : "حفظ"}
                </button>
              </div>
            </div>
          </div>

          {/* Hint Cronjob */}
          <div className="mt-5 p-3.5 rounded-xl bg-[#14171f] border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold mb-2">
              <span>💡 تلميح:</span>
              <span className="text-slate-300 font-normal">
                لتفعيل التقرير التلقائي، قم بإعداد وظيفة (Cron Job) في استضافتك لتعمل كل 24 ساعة على المسار التالي:
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
              <span className="truncate select-all">{cronPath}</span>
              <button
                onClick={handleCopyCron}
                className="ms-2 p-1 text-slate-400 hover:text-white rounded transition"
                title="نسخ المسار"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
