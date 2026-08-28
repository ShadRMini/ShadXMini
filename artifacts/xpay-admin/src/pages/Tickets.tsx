import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { get } from "../lib/api";
import {
  Ticket as TicketIcon,
  Search,
  ArrowRight,
  Eye,
  Clock,
  CheckCircle2,
  Lock,
  MessageSquare,
  RefreshCw,
  User
} from "lucide-react";

interface TicketItem {
  id: number;
  userId?: number;
  userName?: string;
  userEmail?: string;
  subject: string;
  status: "pending" | "answered" | "closed" | string;
  createdAt: string;
  updatedAt?: string;
}

export default function Tickets() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "answered" | "closed">("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await get("/admin/tickets");
      if (Array.isArray(data)) {
        setTickets(data);
      } else {
        setTickets([]);
      }
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const pendingCount = tickets.filter(
    (t) => t.status === "pending" || t.status === "wait" || t.status === "open"
  ).length;

  const filteredTickets = tickets.filter((t) => {
    const matchTab =
      activeTab === "all"
        ? true
        : activeTab === "pending"
        ? t.status === "pending" || t.status === "wait" || t.status === "open"
        : activeTab === "answered"
        ? t.status === "answered" || t.status === "replied"
        : t.status === "closed";

    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      String(t.id).includes(q) ||
      (t.subject || "").toLowerCase().includes(q) ||
      (t.userName || "").toLowerCase().includes(q);

    return matchTab && matchSearch;
  });

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#1e232d] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        {/* Right Info */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#C8A45C]">
            <TicketIcon size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-wide">
                إدارة تذاكر الدعم
              </h1>
              {pendingCount > 0 && (
                <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold px-2.5 py-0.5 rounded-full">
                  بانتظار الرد: {pendingCount}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              قم بالرد على استفسارات العملاء وحل المشكلات الفنية.
            </p>
          </div>
        </div>

        {/* Left Back Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={loadTickets}
            disabled={loading}
            className="flex items-center gap-1.5 bg-[#14171f] hover:bg-slate-800 text-slate-300 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-800 transition"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>تحديث</span>
          </button>

          <Link
            to="/"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-4 py-2 rounded-xl border border-slate-700 transition"
          >
            <span>العودة للرئيسية</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {[
            { key: "all", label: "الكل" },
            { key: "pending", label: "بانتظار الرد" },
            { key: "answered", label: "تم الرد" },
            { key: "closed", label: "مغلقة" },
          ].map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition duration-200 ${
                  active
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                    : "bg-[#1e232d] text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في التذاكر..."
            className="w-full bg-[#1e232d] border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-[#1e232d] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">جاري تحميل التذاكر...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <TicketIcon size={36} className="text-slate-600 mb-2" />
            <p className="text-sm">لا توجد تذاكر دعم</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#14171f] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5 font-semibold">ID</th>
                  <th className="px-4 py-3.5 font-semibold">الموضوع</th>
                  <th className="px-4 py-3.5 font-semibold">المستخدم</th>
                  <th className="px-4 py-3.5 font-semibold">الحالة</th>
                  <th className="px-4 py-3.5 font-semibold">آخر تحديث</th>
                  <th className="px-4 py-3.5 font-semibold text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTickets.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    {/* ID */}
                    <td className="px-4 py-3.5 font-mono text-slate-400">
                      #{t.id}
                    </td>

                    {/* Subject */}
                    <td className="px-4 py-3.5 font-semibold">
                      <Link
                        to={`/tickets/${t.id}`}
                        className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1.5"
                      >
                        <span>{t.subject}</span>
                      </Link>
                    </td>

                    {/* User */}
                    <td className="px-4 py-3.5 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-slate-500" />
                        <span>{t.userName || "مستخدم"}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <TicketStatusBadge status={t.status} />
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">
                      {t.updatedAt || t.createdAt
                        ? new Date(t.updatedAt || t.createdAt).toLocaleString("ar-EG", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => navigate(`/tickets/${t.id}`)}
                        className="inline-flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-blue-500/30 transition shadow"
                      >
                        <Eye size={13} />
                        <span>عرض والرد</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TicketStatusBadge({ status }: { status: string }) {
  if (status === "pending" || status === "wait" || status === "open") {
    return (
      <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
        <Clock size={11} />
        <span>انتظار</span>
      </span>
    );
  }
  if (status === "answered" || status === "replied") {
    return (
      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
        <CheckCircle2 size={11} />
        <span>تم الرد</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 bg-slate-500/10 text-slate-400 border border-slate-700 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
      <Lock size={11} />
      <span>مغلقة</span>
    </span>
  );
}
