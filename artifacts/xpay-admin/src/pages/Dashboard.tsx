import { useEffect, useState } from "react";
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

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadData = async () => {
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
      setErr(e?.message || "تعذر جلب بيانات لوحة التحكم");
      setData({ stats: {}, recentOrders: [], recentTickets: [], chart: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const s = (data && typeof data === "object" && data.stats && typeof data.stats === "object") ? data.stats : {};
  const recentOrders = Array.isArray(data?.recentOrders) ? data.recentOrders : [];
  const recentTickets = Array.isArray(data?.recentTickets) ? data.recentTickets : [];
  const chartData = Array.isArray(data?.chart) ? data.chart : [];

  // Order status counts
  const totalOrders = s.totalOrders ?? 0;
  const completedOrders = s.completedOrders ?? 0;
  const pendingOrders = s.pendingOrders ?? 0;
  const cancelledOrders = s.cancelledOrders ?? 0;

  const statusPieData = [
    { name: "مكتمل", value: completedOrders, color: "#10B981" },
    { name: "معلق/جاري", value: pendingOrders, color: "#F59E0B" },
    { name: "ملغي", value: cancelledOrders, color: "#EF4444" },
  ].filter((d) => d.value > 0);

  // If no data yet, provide placeholder for pie chart
  const activePieData = statusPieData.length > 0 ? statusPieData : [
    { name: "لا توجد طلبات", value: 1, color: "#374151" }
  ];

  // API Balance
  const apiBalance = Number(me?.apiBalanceUsd ?? s.apiBalanceUsd ?? 0).toFixed(2);
  const userObligations = Number(s.totalUserBalanceUsd ?? 0).toFixed(2);
  const totalSales = Number(s.totalSalesUsd ?? 0).toFixed(2);
  const usersCount = s.users ?? 0;
  const pendingTickets = s.pendingTickets ?? 0;

  const currentDateStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#C8A45C]/10 border border-[#C8A45C]/30 flex items-center justify-center text-[#C8A45C]">
            <Package size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              لوحة القيادة
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              نظرة عامة وإحصائيات فورية لأداء النظام والعمليات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1A1A] border border-blue-900/40 text-blue-400 text-xs font-mono font-bold">
            <Calendar size={14} />
            <span>{currentDateStr}</span>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C8A45C] hover:bg-[#B8954A] text-white text-xs font-semibold transition disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            تحديث
          </button>
        </div>
      </div>

      {err && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <span>{err}</span>
          <button onClick={loadData} className="underline font-bold">إعادة المحاولة</button>
        </div>
      )}

      {/* 1️⃣ Top 4 Main Interactive Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sales */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between shadow-lg hover:border-[#10B981]/50 transition duration-200 group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">إجمالي المبيعات</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition">
                <DollarSign size={20} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2 font-mono tracking-tight">
              ${totalSales}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800">
            <Link
              to="/reports"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400 text-xs font-bold transition text-center"
            >
              <span>عرض التقارير</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between shadow-lg hover:border-blue-500/50 transition duration-200 group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">الطلبات الكلية</span>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition">
                <Package size={20} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-blue-400 mt-2 font-mono">
              {totalOrders}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800">
            <Link
              to="/orders"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-blue-500/30 hover:bg-blue-500/10 text-blue-400 text-xs font-bold transition text-center"
            >
              <span>إدارة الطلبات</span>
              <ChevronLeft size={14} />
            </Link>
          </div>
        </div>

        {/* Card 3: Users */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between shadow-lg hover:border-cyan-500/50 transition duration-200 group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">المستخدمين</span>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition">
                <Users size={20} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-cyan-400 mt-2 font-mono">
              {usersCount}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800">
            <Link
              to="/users"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400 text-xs font-bold transition text-center"
            >
              <span>عرض المستخدمين</span>
              <ChevronLeft size={14} />
            </Link>
          </div>
        </div>

        {/* Card 4: Tickets */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between shadow-lg hover:border-[#C8A45C]/50 transition duration-200 group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">تذاكر معلقة</span>
              <div className="w-10 h-10 rounded-xl bg-[#C8A45C]/10 border border-[#C8A45C]/20 flex items-center justify-center text-[#C8A45C] group-hover:scale-110 transition">
                <Headphones size={20} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-[#C8A45C] mt-2 font-mono">
              {pendingTickets}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800">
            <Link
              to="/tickets"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-[#C8A45C]/40 hover:bg-[#C8A45C]/10 text-[#C8A45C] text-xs font-bold transition text-center"
            >
              <span>مراجعة التذاكر</span>
              <ChevronLeft size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* 2️⃣ Balances Section (API Balance & User Balances) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* API Balance Card */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-slate-800 p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Coins size={24} />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400">رصيدك في الـ API</div>
              <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">${apiBalance}</div>
            </div>
          </div>
          <div>
            <Link
              to="/providers"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#C8A45C]/40 text-[#C8A45C] hover:bg-[#C8A45C]/10 text-xs font-bold transition"
            >
              <Eye size={14} />
              <span>مراجعة</span>
            </Link>
          </div>
        </div>

        {/* User Balances Obligations */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-slate-800 p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Wallet size={24} />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400">رصيد العملاء (التزامات)</div>
              <div className="text-2xl font-black text-rose-400 mt-1 font-mono">${userObligations}</div>
            </div>
          </div>
          <div>
            <Link
              to="/users"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition"
            >
              <span>تفاصيل الأرصدة</span>
              <ChevronLeft size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* 3️⃣ Charts Section: Order Status Breakdown & 7-Day Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Status Distribution */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-slate-800 p-5 flex flex-col justify-between shadow-md">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock size={16} className="text-blue-400" />
                حالات الطلبات
              </h2>
            </div>

            <div className="h-44 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {activePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: "8px", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-bold text-white font-mono">{totalOrders}</span>
                <span className="text-[10px] text-slate-400">طلب</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-around gap-2 pt-4 border-t border-slate-800 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-300">مكتمل ({completedOrders})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-300">معلق/جاري ({pendingOrders})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-300">ملغي ({cancelledOrders})</span>
            </div>
          </div>
        </div>

        {/* 7-Day Sales Area Chart */}
        <div className="lg:col-span-2 bg-[#1A1A1A] rounded-2xl border border-slate-800 p-5 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-[#C8A45C]" />
              المبيعات (آخر 7 أيام)
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C8A45C]" />
                <span>المبيعات ($)</span>
              </div>
            </div>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C8A45C" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#C8A45C" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="date" stroke="#6B7280" fontSize={11} reversed />
                <YAxis stroke="#6B7280" fontSize={11} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(val: any) => [`$${Number(val).toFixed(2)}`, "المبيعات"]}
                />
                <Area type="monotone" dataKey="sales" stroke="#C8A45C" strokeWidth={2.5} fill="url(#goldGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4️⃣ Bottom Tables Section: Recent Tickets & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Tickets Widget */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-slate-800 p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Headphones size={16} className="text-[#C8A45C]" />
                تذاكر معلقة
              </h2>
              <Link
                to="/tickets"
                className="px-2.5 py-1 rounded-lg border border-[#C8A45C]/40 text-[#C8A45C] hover:bg-[#C8A45C]/10 text-xs font-semibold transition"
              >
                الكل
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentTickets.slice(0, 4).map((t: any) => (
                <div
                  key={t.id}
                  onClick={() => navigate("/tickets")}
                  className="p-3 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 rounded-xl cursor-pointer transition flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5 max-w-[180px] truncate">
                    <div className="font-semibold text-slate-200 truncate">{t.userName || "عميل"}</div>
                    <div className="text-[11px] text-[#C8A45C] flex items-center gap-1 truncate">
                      <FileText size={12} />
                      {t.subject}
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                      انتظار
                    </span>
                  </div>
                </div>
              ))}

              {recentTickets.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-xs">
                  <Headphones size={28} className="mx-auto mb-2 opacity-30 text-[#C8A45C]" />
                  لا توجد تذاكر معلقة حالياً
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <Link
              to="/tickets"
              className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              <span>فتح مركز الدعم الفني</span>
              <ChevronLeft size={14} />
            </Link>
          </div>
        </div>

        {/* Recent Orders Widget */}
        <div className="lg:col-span-2 bg-[#1A1A1A] rounded-2xl border border-slate-800 p-5 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Package size={16} className="text-blue-400" />
              أحدث الطلبات
            </h2>
            <Link
              to="/orders"
              className="px-2.5 py-1 rounded-lg border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 text-xs font-semibold transition"
            >
              الكل
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/40">
                  <th className="p-2.5 font-semibold">ID</th>
                  <th className="p-2.5 font-semibold">المستخدم</th>
                  <th className="p-2.5 font-semibold">الخدمة / المعرف</th>
                  <th className="p-2.5 font-semibold">السعر</th>
                  <th className="p-2.5 font-semibold text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentOrders.slice(0, 5).map((o: any) => (
                  <tr key={o.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-2.5 font-mono text-slate-400">#{o.orderNumber || o.id}</td>
                    <td className="p-2.5 font-medium text-slate-200">
                      {o.userName || `مستخدم #${o.userId || "—"}`}
                    </td>
                    <td className="p-2.5 text-slate-400 truncate max-w-[150px]">
                      {o.customParam || "خدمة مباشرة"}
                    </td>
                    <td className="p-2.5 font-mono font-bold text-emerald-400">
                      ${Number(o.totalUsd ?? 0).toFixed(2)}
                    </td>
                    <td className="p-2.5 text-center">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500 text-xs">
                      لا توجد طلبات حديثة
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
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 size={11} /> مكتمل
      </span>
    );
  }
  if (isWait) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <Clock size={11} /> معلق
      </span>
    );
  }
  if (isReject) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <XCircle size={11} /> ملغي
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
      {status}
    </span>
  );
}
