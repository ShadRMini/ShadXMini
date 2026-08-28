import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { get, post, patch } from "../lib/api";
import {
  Package,
  Search,
  RotateCcw,
  ArrowRight,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  AlertCircle,
  Inbox,
  X as XIcon,
  User,
  Hash,
  DollarSign
} from "lucide-react";

type OrderItem = {
  id: number;
  orderNumber?: string;
  userId?: number;
  userName?: string;
  productId?: number;
  productName?: string;
  productImage?: string;
  quantity?: number;
  userIdentifier?: string;
  totalUsd?: number | string;
  status: "wait" | "accept" | "completed" | "partial" | "reject" | "cancelled" | string;
  createdAt: string;
  costUsd?: number | string;
  providerOrderId?: string;
};

export default function Orders() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        if (statusFilter === "reject") {
          params.set("status", "reject");
        } else {
          params.set("status", statusFilter);
        }
      }
      const res = await get(`/admin/orders${params.toString() ? "?" + params.toString() : ""}`);
      if (Array.isArray(res)) {
        setOrders(res);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const handleSearch = () => {
    setActiveSearch(searchInput.trim().toLowerCase());
  };

  const handleReset = () => {
    setSearchInput("");
    setActiveSearch("");
    setStatusFilter("all");
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    setBusyId(id);
    try {
      await post(`/admin/orders/${id}/status`, { status: newStatus, note });
      await loadOrders();
      if (selectedOrder?.id === id) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err: any) {
      alert(err?.message || "تعذر تحديث حالة الطلب");
    } finally {
      setBusyId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    // Status tab filter
    let matchStatus = true;
    if (statusFilter === "wait") {
      matchStatus = o.status === "wait" || o.status === "pending";
    } else if (statusFilter === "completed") {
      matchStatus = o.status === "completed" || o.status === "accept";
    } else if (statusFilter === "partial") {
      matchStatus = o.status === "partial";
    } else if (statusFilter === "reject") {
      matchStatus = o.status === "reject" || o.status === "cancelled";
    }

    // Search query filter
    let matchQuery = true;
    if (activeSearch) {
      const idMatch = String(o.id).includes(activeSearch) || String(o.orderNumber || "").toLowerCase().includes(activeSearch);
      const userMatch = (o.userName || "").toLowerCase().includes(activeSearch);
      const linkMatch = (o.userIdentifier || "").toLowerCase().includes(activeSearch);
      const productMatch = (o.productName || "").toLowerCase().includes(activeSearch);
      matchQuery = idMatch || userMatch || linkMatch || productMatch;
    }

    return matchStatus && matchQuery;
  });

  return (
    <div className="space-y-6 text-slate-100 min-h-[85vh] flex flex-col justify-between" dir="rtl">
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between bg-[#1e232d] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Package size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">الطلبات</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                متابعة وإدارة جميع طلبات العملاء وتحديث حالاتها
              </p>
            </div>
          </div>

          <Link
            to="/"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-4 py-2 rounded-xl border border-slate-700 transition"
          >
            <span>العودة</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "الكل" },
            { key: "wait", label: "انتظار" },
            { key: "completed", label: "مكتمل" },
            { key: "partial", label: "جزئي" },
            { key: "reject", label: "مرفوض/ملغي" },
          ].map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
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

        {/* Search & Reset Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search
              size={16}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="بحث: رقم الطلب، الرابط أو اسم الزبون"
              className="w-full bg-[#1e232d] border border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleSearch}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-6 py-2.5 rounded-xl transition shadow"
            >
              <Search size={14} />
              <span>بحث</span>
            </button>

            <button
              onClick={handleReset}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition"
            >
              <RotateCcw size={14} />
              <span>إعادة تعيين</span>
            </button>
          </div>
        </div>

        {/* Table / Empty State Container */}
        <div className="bg-[#1e232d] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">جاري تحميل الطلبات...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 mb-3">
                <Inbox size={32} />
              </div>
              <h3 className="text-sm font-semibold text-slate-300 mb-1">
                لا توجد طلبات مطابقة للبحث
              </h3>
              <p className="text-xs text-slate-500">
                جرب تغيير خيارات التصفية أو التأكد من عبارة البحث.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#14171f] text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5 font-semibold">رقم الطلب</th>
                    <th className="px-4 py-3.5 font-semibold">المنتج</th>
                    <th className="px-4 py-3.5 font-semibold">المستخدم</th>
                    <th className="px-4 py-3.5 font-semibold">المعرف / الرابط</th>
                    <th className="px-4 py-3.5 font-semibold">الكمية</th>
                    <th className="px-4 py-3.5 font-semibold">الإجمالي</th>
                    <th className="px-4 py-3.5 font-semibold">الحالة</th>
                    <th className="px-4 py-3.5 font-semibold">التاريخ</th>
                    <th className="px-4 py-3.5 font-semibold text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3.5 font-bold text-blue-400">
                        #{order.orderNumber || order.id}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-200">
                        {order.productName || "منتج"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        {order.userName || `#${order.userId || "—"}`}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-400 max-w-[160px] truncate">
                        {order.userIdentifier || "—"}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-300">
                        {order.quantity ?? 1}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-emerald-400">
                        ${Number(order.totalUsd || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString("ar-EG")
                          : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition"
                            title="تفاصيل الطلب"
                          >
                            <Eye size={15} />
                          </button>
                          {(order.status === "wait" || order.status === "pending") && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(order.id, "completed")}
                                disabled={busyId === order.id}
                                className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition"
                                title="قبول الطلب"
                              >
                                <CheckCircle2 size={15} />
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(order.id, "reject")}
                                disabled={busyId === order.id}
                                className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                                title="رفض الطلب"
                              >
                                <XCircle size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 py-4 border-t border-slate-800/80 mt-10">
        © 2026 جميع الحقوق محفوظة - Media Booster
      </footer>

      {/* View Order Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#1e232d] border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#14171f]">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  تفاصيل الطلب #{selectedOrder.orderNumber || selectedOrder.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#14171f] p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">المنتج</span>
                  <span className="font-semibold text-white">
                    {selectedOrder.productName || "منتج"}
                  </span>
                </div>

                <div className="bg-[#14171f] p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">العميل</span>
                  <span className="font-semibold text-white">
                    {selectedOrder.userName || `#${selectedOrder.userId}`}
                  </span>
                </div>

                <div className="bg-[#14171f] p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">الكمية</span>
                  <span className="font-semibold text-white">
                    {selectedOrder.quantity ?? 1}
                  </span>
                </div>

                <div className="bg-[#14171f] p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">المبلغ الإجمالي</span>
                  <span className="font-bold text-emerald-400">
                    ${Number(selectedOrder.totalUsd || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {selectedOrder.userIdentifier && (
                <div className="bg-[#14171f] p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">الرابط / المعرف المدخل:</span>
                  <div className="font-mono text-blue-400 select-all break-all bg-slate-950 p-2 rounded-lg border border-slate-800">
                    {selectedOrder.userIdentifier}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between bg-[#14171f] p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400">الحالة الحالية:</span>
                <OrderStatusBadge status={selectedOrder.status} />
              </div>

              {/* Status Action Buttons in Modal */}
              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, "completed")}
                  disabled={busyId === selectedOrder.id}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl transition"
                >
                  تعيين كمكتمل ✓
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, "reject")}
                  disabled={busyId === selectedOrder.id}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold py-2 rounded-xl transition"
                >
                  رفض الطلب ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  if (status === "wait" || status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
        <Clock size={11} />
        <span>انتظار</span>
      </span>
    );
  }
  if (status === "accept" || status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
        <CheckCircle2 size={11} />
        <span>مكتمل</span>
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="inline-flex items-center gap-1 bg-slate-500/10 text-slate-300 border border-slate-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
        <span>جزئي</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
      <XCircle size={11} />
      <span>مرفوض/ملغي</span>
    </span>
  );
}
