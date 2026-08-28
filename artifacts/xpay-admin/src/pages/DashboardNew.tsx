import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { get } from "../lib/api";
import {
  DollarSign, Package, Users, Headphones, Wallet, Coins,
  Calendar, Eye, RefreshCw, ChevronLeft, ArrowUpRight,
  TrendingUp, CheckCircle2, Clock, XCircle, FileText
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell
} from "recharts";

export default function DashboardNew() {
  const [data, setData] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [dashRes, meRes] = await Promise.all([
        get("/dashboard").catch(() => ({ stats: {}, recentOrders: [], recentTickets: [], chart: [] })),
        get("/me").catch(() => null),
      ]);
      const safeData = dashRes && typeof dashRes === "object" ? dashRes : {};
      setData(safeData);
      if (meRes && typeof meRes === "object") setMe(meRes);
    } catch (e: any) {
      setErr(e?.message || "تعذر جلب بيانات لوحة التحكم المتقدمة");
      setData({ stats: {}, recentOrders: [], recentTickets: [], chart: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const s = useMemo(() => (data && typeof data === "object" && data.stats && typeof data.stats === "object") ? data.stats : {}, [data]);
  const recentOrders = useMemo(() => Array.isArray(data?.recentOrders) ? data.recentOrders : [], [data]);
  const recentTickets = useMemo(() => Array.isArray(data?.recentTickets) ? data.recentTickets : [], [data]);
  const chartData = useMemo(() => Array.isArray(data?.chart) ? data.chart : [], [data]);

  const totalOrders = s.totalOrders ?? 0;
  const completedOrders = s.completedOrders ?? 0;
  const pendingOrders = s.pendingOrders ?? 0;
  const cancelledOrders = s.cancelledOrders ?? 0;

  const statusPieData = useMemo(() => [
    { name: "مكتمل", value: completedOrders, color: "#10B981" },
    { name: "معلق/جاري", value: pendingOrders, color: "#F59E0B" },
    { name: "ملغي", value: cancelledOrders, color: "#EF4444" },
  ].filter((d) => d.value > 0), [completedOrders, pendingOrders, cancelledOrders]);

  const activePieData = statusPieData.length > 0 ? statusPieData : [
    { name: "لا توجد طلبات", value: 1, color: "#374151" }
  ];

  const apiBalance = Number(me?.apiBalanceUsd ?? s.apiBalanceUsd ?? 0).toFixed(2);
  const userObligations = Number(s.totalUserBalanceUsd ?? 0).toFixed(2);
  const totalSales = Number(s.totalSalesUsd ?? 0).toFixed(2);
  const usersCount = s.users ?? 0;
  const pendingTickets = s.pendingTickets ?? 0;

  const currentDateStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse" dir="rtl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800" />
            <div className="space-y-2">
              <div className="w-48 h-6 bg-slate-800 rounded" />
              <div className="w-32 h-4 bg-slate-800/60 rounded" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-[#1A1A1A] border border-slate-800 rounded-2xl p-5" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-72 bg-[#1A1A1A] border border-slate-800 rounded-2xl lg:col-span-1" />
          <div className="h-72 bg-[#1A1A1A] border border-slate-800 rounded-2xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C8A45C]/20 to-[#C8A45C]/5 border border-[#C8A45C]/40 flex items-center justify-center text-[#C8A45C] shadow-inner">
            <TrendingUp size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              لوحة القيادة المتقدمة <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#C8A45C]/20 text-[#FDE68A] border border-[#C8A45C]/40">Dark & Gold</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              رؤى تحليلية متقدمة ومتابعة لحظية لحركة العمليات والإيرادات والطلبات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1A1A1A] border border-[#C8A45C]/30 text-[#FDE68A] text-xs font-mono font-bold shadow-sm">
            <Calendar size={14} className="text-[#C8A45C]" />
            <span>{currentDateStr}</span>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] text-xs font-black transition shadow-md disabled:opacity-50 cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            تحديث البيانات
          </button>
        </div>
      </div>

      {err && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-2xl text-rose-300 text-xs flex items-center justify-between shadow-lg">
          <span>{err}</span>
          <button onClick={loadData} className="underline font-bold hover:text-white transition">إعادة المحاولة</button>
        </div>
      )}

      {/* 1️⃣ KPI Cards (4 Top Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sales */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-slate-800/90 p-5 flex flex-col justify-between shadow-xl hover:border-[#10B981]/60 hover:shadow-[#10B981]/5 transition-all duration-300 group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">إجمالي المبيعات</span>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition duration-300">
                <DollarSign size={22} />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-400 mt-3 font-mono tracking-tight">
              ${totalSales}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-400/90 font-medium">
              <span>+12.4% مقارنة بالشهر السابق</span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-800/80">
            <Link
              to="/reports"
              className="w-full flex items-center justify-between py-2 px-3 rounded-xl border border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400 text-xs font-bold transition group-hover:border-emerald-500/60"
            >
              <span>عرض التقارير المالية</span>
              <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
            </Link>
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-slate-800/90 p-5 flex flex-col justify-between shadow-xl hover:border-blue-500/60 hover:shadow-blue-500/5 transition-all duration-300 group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">إجمالي الطلبات</span>
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition duration-300">
                <Package size={22} />
              </div>
            </div>
            <div className="text-3xl font-black text-blue-400 mt-3 font-mono tracking-tight">
              {totalOrders}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-blue-400/90 font-medium">
              <span>معدل إنجاز مرتفع ({Math.round((completedOrders / (totalOrders || 1)) * 100)}%)</span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-800/80">
            <Link
              to="/orders"
              className="w-full flex items-center justify-between py-2 px-3 rounded-xl border border-blue-500/30 hover:bg-blue-500/10 text-blue-400 text-xs font-bold transition group-hover:border-blue-500/60"
            >
              <span>إدارة كافة الطلبات</span>
              <ChevronLeft size={14} className="group-hover:-translate-x-1 transition" />
            </Link>
          </div>
        </div>

        {/* Card 3: Total Users */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-slate-800/90 p-5 flex flex-col justify-between shadow-xl hover:border-cyan-500/60 hover:shadow-cyan-500/5 transition-all duration-300 group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">إجمالي المستخدمين</span>
              <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition duration-300">
                <Users size={22} />
              </div>
            </div>
            <div className="text-3xl font-black text-cyan-400 mt-3 font-mono tracking-tight">
              {usersCount}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-cyan-400/90 font-medium">
              <span>عملاء نشطين ومسجلين</span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-800/80">
            <Link
              to="/users"
              className="w-full flex items-center justify-between py-2 px-3 rounded-xl border border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400 text-xs font-bold transition group-hover:border-cyan-500/60"
            >
              <span>قائمة العملاء</span>
              <ChevronLeft size={14} className="group-hover:-translate-x-1 transition" />
            </Link>
          </div>
        </div>

        {/* Card 4: Pending Tickets */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-slate-800/90 p-5 flex flex-col justify-between shadow-xl hover:border-[#C8A45C]/60 hover:shadow-[#C8A45C]/5 transition-all duration-300 group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">التذاكر المعلقة</span>
              <div className="w-11 h-11 rounded-xl bg-[#C8A45C]/10 border border-[#C8A45C]/30 flex items-center justify-center text-[#C8A45C] group-hover:scale-110 transition duration-300">
                <Headphones size={22} />
              </div>
            </div>
            <div className="text-3xl font-black text-[#C8A45C] mt-3 font-mono tracking-tight">
              {pendingTickets}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#FDE68A]/90 font-medium">
              <span>تحتاج لمراجعة الدعم</span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-800/80">
            <Link
              to="/tickets"
              className="w-full flex items-center justify-between py-2 px-3 rounded-xl border border-[#C8A45C]/40 hover:bg-[#C8A45C]/10 text-[#C8A45C] text-xs font-bold transition group-hover:border-[#C8A45C]/80"
            >
              <span>مركز الدعم الفني</span>
              <ChevronLeft size={14} className="group-hover:-translate-x-1 transition" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2️⃣ Financial Balances Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* API Balance */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-slate-800 p-5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
              <Coins size={24} />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400">رصيدك الحالي في مزود الـ API</div>
              <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">${apiBalance}</div>
            </div>
          </div>
          <Link
            to="/providers"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#C8A45C]/40 text-[#C8A45C] hover:bg-[#C8A45C]/10 text-xs font-bold transition shadow-sm"
          >
            <Eye size={14} />
            <span>إدارة المزودين</span>
          </Link>
        </div>

        {/* User Balances Obligations */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-slate-800 p-5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-inner">
              <Wallet size={24} />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400">أرصدة العملاء بالموقع (التزامات)</div>
              <div className="text-2xl font-black text-rose-400 mt-1 font-mono">${userObligations}</div>
            </div>
          </div>
          <Link
            to="/users"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition shadow-sm"
          >
            <span>تفاصيل المحافظ</span>
            <ChevronLeft size={14} />
          </Link>
        </div>
      </div>

      {/* 3️⃣ Charts Section: Order Status Distribution & Sales Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Status Distribution Pie Chart */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-slate-800 p-5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock size={16} className="text-blue-400" />
                توزيع حالات الطلبات
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">الكل</span>
            </div>

            <div className="h-48 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={6}
                    dataKey="value"
                  >
                    {activePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#1A1A1A" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1A1A1A", borderColor: "#334155", borderRadius: "12px", fontSize: "12px", color: "#fff" }}
                    itemStyle={{ color: "#FDE68A" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-white font-mono">{totalOrders}</span>
                <span className="text-[10px] text-slate-400">إجمالي الطلبات</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800 text-xs text-center">
            <div className="bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/15">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-400 text-[11px]">مكتمل</span>
              </div>
              <span className="font-bold text-emerald-400 font-mono">{completedOrders}</span>
            </div>
            <div className="bg-amber-500/5 p-2 rounded-xl border border-amber-500/15">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-slate-400 text-[11px]">معلق</span>
              </div>
              <span className="font-bold text-amber-400 font-mono">{pendingOrders}</span>
            </div>
            <div className="bg-rose-500/5 p-2 rounded-xl border border-rose-500/15">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-slate-400 text-[11px]">ملغي</span>
              </div>
              <span className="font-bold text-rose-400 font-mono">{cancelledOrders}</span>
            </div>
          </div>
        </div>

        {/* Sales Trend Area Chart */}
        <div className="lg:col-span-2 bg-[#1A1A1A] rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-[#C8A45C]" />
              حركة المبيعات خلال الأيام الأخيرة
            </h2>
            <div className="flex items-center gap-2 text-xs text-[#C8A45C] bg-[#C8A45C]/10 px-3 py-1 rounded-xl border border-[#C8A45C]/20 font-mono">
              <span className="w-2 h-2 rounded-full bg-[#C8A45C] animate-pulse" />
              <span>مباشر</span>
            </div>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="goldGradientNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C8A45C" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#C8A45C" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="date" stroke="#6B7280" fontSize={11} tickLine={false} reversed />
                <YAxis stroke="#6B7280" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1A1A1A", borderColor: "#C8A45C", borderRadius: "12px", fontSize: "12px", color: "#fff", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)" }}
                  formatter={(val: any) => [`$${Number(val).toFixed(2)}`, "المبيعات"]}
                />
                <Area type="monotone" dataKey="sales" stroke="#C8A45C" strokeWidth={3} fill="url(#goldGradientNew)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4️⃣ Bottom Tables Section: Recent Tickets & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Tickets List */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Headphones size={16} className="text-[#C8A45C]" />
                أحدث التذاكر المعلقة
              </h2>
              <Link
                to="/tickets"
                className="px-3 py-1 rounded-xl border border-[#C8A45C]/40 text-[#C8A45C] hover:bg-[#C8A45C]/10 text-xs font-bold transition"
              >
                عرض الكل ({pendingTickets})
              </Link>
            </div>

            <div className="space-y-3">
              {recentTickets.slice(0, 3).map((t: any) => (
                <div
                  key={t.id}
                  onClick={() => navigate("/tickets")}
                  className="p-3.5 bg-slate-900/70 hover:bg-slate-800 border border-slate-800/80 rounded-xl cursor-pointer transition duration-200 flex items-center justify-between text-xs group"
                >
                  <div className="space-y-1 max-w-[200px]">
                    <div className="font-bold text-white truncate group-hover:text-[#FDE68A] transition">{t.userName || "عميل"}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                      <FileText size={12} className="text-[#C8A45C]" />
                      {t.subject}
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="inline-block text-[10px] px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                      انتظار رد
                    </span>
                  </div>
                </div>
              ))}

              {recentTickets.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-xs">
                  <Headphones size={32} className="mx-auto mb-2 opacity-30 text-[#C8A45C]" />
                  لا توجد تذاكر معلقة حالياً
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <Link
              to="/tickets"
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-[#C8A45C] hover:text-[#FDE68A] font-bold transition"
            >
              <span>الانتقال لمركز الدعم الفني</span>
              <ChevronLeft size={14} />
            </Link>
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-[#1A1A1A] rounded-2xl border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Package size={16} className="text-blue-400" />
              أحدث الطلبات في النظام
            </h2>
            <Link
              to="/orders"
              className="px-3 py-1 rounded-xl border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 text-xs font-bold transition"
            >
              عرض كافة الطلبات
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                  <th className="p-3 font-semibold">رقم الطلب</th>
                  <th className="p-3 font-semibold">العميل</th>
                  <th className="p-3 font-semibold">تفاصيل الخدمة</th>
                  <th className="p-3 font-semibold">المبلغ</th>
                  <th className="p-3 font-semibold text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {recentOrders.slice(0, 5).map((o: any) => (
                  <tr key={o.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono text-[#C8A45C] font-bold">#{o.orderNumber || o.id}</td>
                    <td className="p-3 font-semibold text-slate-200">
                      {o.userName || `مستخدم #${o.userId || "—"}`}
                    </td>
                    <td className="p-3 text-slate-400 truncate max-w-[180px]">
                      {o.customParam || "طلب مباشر عبر الـ API"}
                    </td>
                    <td className="p-3 font-mono font-black text-emerald-400">
                      ${Number(o.totalUsd ?? 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-500 text-xs">
                      لا توجد طلبات حديثة مسجلة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isAccept = status === "accept" || status === "completed" || status === "approved";
  const isWait = status === "wait" || status === "pending" || status === "processing";
  const isReject = status === "reject" || status === "rejected" || status === "cancelled";

  if (isAccept) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
        <CheckCircle2 size={12} /> مكتمل
      </span>
    );
  }
  if (isWait) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25">
        <Clock size={12} /> معلق
      </span>
    );
  }
  if (isReject) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/25">
        <XCircle size={12} /> ملغي
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
      {status}
    </span>
  );
}
