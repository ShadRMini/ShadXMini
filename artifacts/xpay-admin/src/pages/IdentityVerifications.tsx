import React, { useState, useEffect } from "react";
import { get, patch } from "../lib/api";
import {
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  X,
  AlertCircle,
  Loader2,
  User,
  Calendar,
  Check,
  RotateCcw,
  ZoomIn,
  MessageSquare
} from "lucide-react";

interface IdentityVerificationItem {
  id: number;
  user_id: number;
  full_name: string;
  id_front_image: string;
  id_back_image: string;
  selfie_image: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  reviewed_by?: number;
  reviewer_username?: string;
  reviewed_at?: string;
  created_at: string;
  username: string;
  email?: string;
  display_id?: string;
  avatar_url?: string;
}

interface SummaryCounts {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function IdentityVerifications() {
  const [loading, setLoading] = useState(true);
  const [verifications, setVerifications] = useState<IdentityVerificationItem[]>([]);
  const [counts, setCounts] = useState<SummaryCounts>({ total: 0, pending: 0, approved: 0, rejected: 0 });

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState<IdentityVerificationItem | null>(null);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Lightbox Zoom
  const [lightboxImg, setLightboxImg] = useState<{ src: string; title: string } | null>(null);

  // Toast State
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    fetchVerifications();
  }, [statusFilter]);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      let url = `/admin/identity-verifications?status=${statusFilter}`;
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await get(url);
      setVerifications(res.verifications || []);
      if (res.counts) setCounts(res.counts);
    } catch (err: any) {
      showToast("error", err.message || "فشل جلب طلبات التوثيق.");
    } fontFinally: {
      setLoading(false);
    }
  };

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVerifications();
  };

  const handleApprove = async (id: number) => {
    try {
      setActionLoading(true);
      const res = await patch(`/admin/identity-verifications/${id}/approve`, {});
      if (res.success) {
        showToast("success", "تم قبول طلب التوثيق بنجاح وإرسال إشعار للمستخدم.");
        setSelectedItem(null);
        fetchVerifications();
      } else {
        throw new Error(res.error || "فشل قبول الطلب");
      }
    } catch (err: any) {
      showToast("error", err.message || "حدث خطأ أثناء قبول الطلب.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: number) => {
    if (!rejectReason.trim()) {
      showToast("error", "يرجى كتابة سبب الرفض لتوضيحه للمستخدم.");
      return;
    }

    try {
      setActionLoading(true);
      const res = await patch(`/admin/identity-verifications/${id}/reject`, {
        reason: rejectReason.trim(),
      });
      if (res.success) {
        showToast("success", "تم رفض طلب التوثيق وإشعارات المستخدم بذلك.");
        setShowRejectBox(false);
        setRejectReason("");
        setSelectedItem(null);
        fetchVerifications();
      } else {
        throw new Error(res.error || "فشل رفض الطلب");
      }
    } catch (err: any) {
      showToast("error", err.message || "حدث خطأ أثناء رفض الطلب.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredItems = verifications.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.full_name?.toLowerCase().includes(q) ||
      item.username?.toLowerCase().includes(q) ||
      item.email?.toLowerCase().includes(q) ||
      item.display_id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-right" dir="rtl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#2D2D2D] border border-[#C8A45C]/35 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-[#C8A45C]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C8A45C] to-[#8A6D3B] text-black flex items-center justify-center shadow-lg shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#FDE68A]">مراجعة طلبات توثيق الهوية</h1>
            <p className="text-xs text-[#9CA3AF] font-medium">
              التحقق من صحة الوثائق الرسمية المقدمة من العملاء وقبول أو رفض الطلبات.
            </p>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top duration-200 ${
            toast.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-200"
              : "bg-rose-950/80 border-rose-500/50 text-rose-200"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter("all")}
          className={`cursor-pointer bg-[#2D2D2D] border p-4 rounded-2xl transition-all ${
            statusFilter === "all" ? "border-[#C8A45C] bg-[#333333]" : "border-white/10 hover:border-white/20"
          }`}
        >
          <div className="text-[#9CA3AF] text-xs font-bold mb-1">إجمالي الطلبات</div>
          <div className="text-2xl font-black text-white">{counts.total}</div>
        </div>

        <div
          onClick={() => setStatusFilter("pending")}
          className={`cursor-pointer bg-[#2D2D2D] border p-4 rounded-2xl transition-all ${
            statusFilter === "pending" ? "border-amber-500 bg-amber-950/30" : "border-white/10 hover:border-amber-500/30"
          }`}
        >
          <div className="text-amber-400 text-xs font-bold mb-1 flex items-center justify-between">
            <span>قيد المراجعة</span>
            <Clock className="w-4 h-4 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-amber-300">{counts.pending}</div>
        </div>

        <div
          onClick={() => setStatusFilter("approved")}
          className={`cursor-pointer bg-[#2D2D2D] border p-4 rounded-2xl transition-all ${
            statusFilter === "approved" ? "border-emerald-500 bg-emerald-950/30" : "border-white/10 hover:border-emerald-500/30"
          }`}
        >
          <div className="text-emerald-400 text-xs font-bold mb-1 flex items-center justify-between">
            <span>المقبولة</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-300">{counts.approved}</div>
        </div>

        <div
          onClick={() => setStatusFilter("rejected")}
          className={`cursor-pointer bg-[#2D2D2D] border p-4 rounded-2xl transition-all ${
            statusFilter === "rejected" ? "border-rose-500 bg-rose-950/30" : "border-white/10 hover:border-rose-500/30"
          }`}
        >
          <div className="text-rose-400 text-xs font-bold mb-1 flex items-center justify-between">
            <span>المرفوضة</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-300">{counts.rejected}</div>
        </div>
      </div>

      {/* Toolbar: Filter Tabs & Search */}
      <div className="bg-[#2D2D2D] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "الكل" },
            { id: "pending", label: "قيد المراجعة" },
            { id: "approved", label: "مقبول" },
            { id: "rejected", label: "مرفوض" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-[#C8A45C] text-black shadow-md"
                  : "bg-[#1A1A1A] text-[#9CA3AF] hover:text-white hover:bg-[#222]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative min-w-[260px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم المستخدم أو الهوية..."
            className="w-full bg-[#1A1A1A] border border-white/15 focus:border-[#C8A45C] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
          />
          <button type="submit" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
            <Search className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Verifications Table / Cards */}
      {loading ? (
        <div className="p-12 text-center text-[#9CA3AF] flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-[#C8A45C] animate-spin" />
          <span className="text-xs font-bold">جاري تحميل طلبات التوثيق...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-[#2D2D2D] border border-white/10 rounded-2xl p-12 text-center text-[#9CA3AF] space-y-2">
          <ShieldCheck className="w-12 h-12 mx-auto text-gray-600 mb-2" />
          <p className="text-sm font-bold text-white">لا توجد طلبات توثيق حالياً</p>
          <p className="text-xs">لم يتم العثور على أي نتائج تتطابق مع معايير البحث أو الفلترة المحددة.</p>
        </div>
      ) : (
        <div className="bg-[#2D2D2D] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#1A1A1A] text-[#9CA3AF] font-bold border-b border-white/10">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">المستخدم</th>
                  <th className="p-3.5">الاسم الكامل في الهوية</th>
                  <th className="p-3.5">تاريخ الإرسال</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[#E5E7EB]">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5 font-bold text-[#C8A45C]">#{item.id}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-white/10 flex items-center justify-center font-bold text-[#FDE68A] overflow-hidden shrink-0">
                          {item.avatar_url ? (
                            <img src={item.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            item.username?.charAt(0).toUpperCase() || "U"
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white">{item.username}</div>
                          <div className="text-[10px] text-[#9CA3AF]">ID: {item.display_id || item.user_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-[#FDE68A]">{item.full_name}</td>
                    <td className="p-3.5 text-gray-400">
                      {new Date(item.created_at).toLocaleDateString("ar")} -{" "}
                      {new Date(item.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="p-3.5">
                      {item.status === "pending" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <Clock className="w-3 h-3" />
                          قيد المراجعة
                        </span>
                      )}
                      {item.status === "approved" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3" />
                          مقبول
                        </span>
                      )}
                      {item.status === "rejected" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          <XCircle className="w-3 h-3" />
                          مرفوض
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setShowRejectBox(false);
                          setRejectReason("");
                        }}
                        className="px-3 py-1.5 bg-[#C8A45C] hover:bg-[#FDE68A] text-black font-bold rounded-xl text-xs flex items-center gap-1 mx-auto transition-colors shadow-md"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        عرض التفاصيل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail & Review Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-[#2D2D2D] border border-[#C8A45C]/40 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 my-8 text-right" dir="rtl">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C8A45C]/20 text-[#C8A45C] flex items-center justify-center font-bold">
                  #{selectedItem.id}
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">تفاصيل طلب توثيق الهوية</h2>
                  <p className="text-xs text-[#9CA3AF]">مقدم من العضو: {selectedItem.username}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-rose-600 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User Info Overview */}
            <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[#9CA3AF] block mb-0.5">اسم المستخدم:</span>
                <span className="font-bold text-white">{selectedItem.username}</span>
              </div>
              <div>
                <span className="text-[#9CA3AF] block mb-0.5">معرف الحساب (ID):</span>
                <span className="font-bold text-[#FDE68A]">{selectedItem.display_id || selectedItem.user_id}</span>
              </div>
              <div>
                <span className="text-[#9CA3AF] block mb-0.5">البريد الإلكتروني:</span>
                <span className="font-medium text-gray-300">{selectedItem.email || "غير محدد"}</span>
              </div>
              <div className="col-span-2 sm:col-span-3 border-t border-white/5 pt-2 mt-1">
                <span className="text-[#9CA3AF] block mb-0.5">الاسم الكامل كما يظهر في البطاقة الشخصية:</span>
                <span className="text-sm font-black text-[#FDE68A]">{selectedItem.full_name}</span>
              </div>
            </div>

            {/* Images Grid */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#C8A45C] flex items-center gap-1.5">
                <ZoomIn className="w-4 h-4" />
                الوثائق والصور المرفقة (اضغط لتكبير الصورة):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* ID Front */}
                <div
                  onClick={() => setLightboxImg({ src: selectedItem.id_front_image, title: "صورة الوجه الأمامي للهوية" })}
                  className="group relative cursor-pointer border border-white/15 hover:border-[#C8A45C] rounded-2xl overflow-hidden bg-black/60 h-44 flex flex-col justify-between p-2 transition-all shadow-md"
                >
                  <img src={selectedItem.id_front_image} alt="Front" className="w-full h-32 object-cover rounded-xl" />
                  <div className="text-center text-[11px] font-bold text-white group-hover:text-[#FDE68A]">
                    الوجه الأمامي للهوية 🔍
                  </div>
                </div>

                {/* ID Back */}
                <div
                  onClick={() => setLightboxImg({ src: selectedItem.id_back_image, title: "صورة الوجه الخلفي للهوية" })}
                  className="group relative cursor-pointer border border-white/15 hover:border-[#C8A45C] rounded-2xl overflow-hidden bg-black/60 h-44 flex flex-col justify-between p-2 transition-all shadow-md"
                >
                  <img src={selectedItem.id_back_image} alt="Back" className="w-full h-32 object-cover rounded-xl" />
                  <div className="text-center text-[11px] font-bold text-white group-hover:text-[#FDE68A]">
                    الوجه الخلفي للهوية 🔍
                  </div>
                </div>

                {/* Selfie */}
                <div
                  onClick={() => setLightboxImg({ src: selectedItem.selfie_image, title: "صورة سيلفي مع الهوية" })}
                  className="group relative cursor-pointer border border-white/15 hover:border-[#C8A45C] rounded-2xl overflow-hidden bg-black/60 h-44 flex flex-col justify-between p-2 transition-all shadow-md"
                >
                  <img src={selectedItem.selfie_image} alt="Selfie" className="w-full h-32 object-cover rounded-xl" />
                  <div className="text-center text-[11px] font-bold text-white group-hover:text-[#FDE68A]">
                    سيلفي مع الهوية 🔍
                  </div>
                </div>
              </div>
            </div>

            {/* Reviewed status if already processed */}
            {selectedItem.status !== "pending" && (
              <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-4 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">حالة القرار:</span>
                  <span className="font-bold text-white">
                    {selectedItem.status === "approved" ? "تم القبول ✅" : "تم الرفض ❌"}
                  </span>
                </div>
                {selectedItem.rejection_reason && (
                  <div className="text-rose-400 font-medium pt-1">
                    سبب الرفض: {selectedItem.rejection_reason}
                  </div>
                )}
                {selectedItem.reviewed_at && (
                  <div className="text-[11px] text-[#9CA3AF] pt-1">
                    تاريخ المراجعة: {new Date(selectedItem.reviewed_at).toLocaleString("ar")}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons for Pending Items */}
            {selectedItem.status === "pending" && (
              <div className="space-y-4 border-t border-white/10 pt-4">
                {!showRejectBox ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleApprove(selectedItem.id)}
                      className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      قبول توثيق الهوية
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setShowRejectBox(true)}
                      className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      رفض طلب التوثيق
                    </button>
                  </div>
                ) : (
                  <div className="bg-rose-950/60 border border-rose-500/40 rounded-2xl p-4 space-y-3">
                    <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-rose-400" />
                      اكتب سبب عدم قبول طلب التوثيق (سيتم إرساله للمستخدم):
                    </div>
                    <textarea
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="مثال: الصور غير واضحة، يرجى إعادة التقاط الصورة بإضاءة أفضل..."
                      className="w-full bg-[#1A1A1A] border border-rose-500/30 focus:border-rose-400 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRejectBox(false)}
                        className="px-4 py-2 bg-white/10 text-xs font-bold rounded-xl text-gray-300 hover:bg-white/20"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleReject(selectedItem.id)}
                        className="px-5 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-500 flex items-center gap-1"
                      >
                        {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        تأكيد الرفض والإرسال
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* Lightbox / High-Res Image Modal */}
      {lightboxImg && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative max-w-4xl w-full bg-[#2D2D2D] border border-[#C8A45C]/40 rounded-3xl overflow-hidden p-3 shadow-2xl">
            <div className="flex items-center justify-between p-2 border-b border-white/10">
              <span className="text-xs font-bold text-[#FDE68A]">{lightboxImg.title}</span>
              <button
                onClick={() => setLightboxImg(null)}
                className="w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-rose-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 max-h-[85vh] flex items-center justify-center overflow-auto bg-black/60 rounded-2xl mt-2">
              <img src={lightboxImg.src} alt="Full View" className="max-h-[80vh] w-auto object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
