import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { get, post, put } from "../lib/api";
import {
  ArrowRight,
  Send,
  Lock,
  Mail,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  ShieldAlert
} from "lucide-react";

interface TicketMessage {
  id: number;
  ticketId: number;
  senderType: "user" | "admin" | string;
  senderName: string;
  message: string;
  createdAt: string;
}

interface TicketDetailData {
  id: number;
  userId?: number;
  userName?: string;
  userEmail?: string;
  subject: string;
  status: "pending" | "answered" | "closed" | string;
  priority?: string;
  createdAt: string;
  updatedAt?: string;
  messages: TicketMessage[];
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);

  const loadTicket = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await get<TicketDetailData>(`/admin/tickets/${id}`);
      if (res && res.id) {
        setTicket(res);
      }
    } catch (err) {
      console.error("Failed to load ticket:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
  }, [id]);

  const handleSendReply = async () => {
    if (!ticket || !replyText.trim()) return;
    setSending(true);
    try {
      await post(`/admin/tickets/${ticket.id}/reply`, { message: replyText.trim() });
      setReplyText("");
      await loadTicket();
    } catch (err: any) {
      alert(err?.message || "تعذر إرسال الرد");
    } finally {
      setSending(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!ticket) return;
    setClosing(true);
    try {
      await post(`/admin/tickets/${ticket.id}/close`, {});
      await loadTicket();
    } catch (err: any) {
      alert(err?.message || "تعذر إغلاق التذكرة");
    } finally {
      setClosing(false);
    }
  };

  // Quick reply shortcuts
  const quickReplies = [
    { label: "تم الحل ✅", text: "تم حل المشكلة وتفعيل الخدمة بنجاح. شكراً لتواصلك معنا." },
    { label: "طلب رقم الطلب 🆔", text: "يرجى تزويدنا برقم الطلب أو المعرف الخاص بالعملية لنتمكن من المتابعة." },
    { label: "صيانة 🛠️", text: "يتم حالياً إجراء صيانة وتحديث على هذا القسم، يرجى الانتظار والمحاولة لاحقاً." },
    { label: "جارٍ الفحص 🔍", text: "تم استلام استفسارك وجارٍ الفحص من قبل الفريق الفني، سنوافيك بالرد قريباً." },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 gap-3" dir="rtl">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">جاري تحميل بيانات التذكرة...</span>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-20 text-slate-400" dir="rtl">
        <p className="text-sm mb-4">التذكرة غير موجودة أو تم حذفها.</p>
        <Link to="/tickets" className="text-xs text-blue-400 hover:underline">
          العودة لقائمة التذاكر
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-100 max-w-5xl mx-auto" dir="rtl">
      {/* Top Header Card */}
      <div className="bg-[#1e232d] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Right Info */}
        <div className="flex items-center gap-3">
          <Link
            to="/tickets"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3.5 py-2 rounded-xl border border-slate-700 transition"
          >
            <span>العودة للقائمة</span>
            <ArrowRight size={14} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">
              {ticket.subject}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              العميل: <span className="text-slate-200 font-semibold">{ticket.userName || "مستخدم"}</span>
            </p>
          </div>
        </div>

        {/* Left Status Badges & Close Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Badge */}
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
              ticket.status === "pending" || ticket.status === "wait"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                : ticket.status === "answered"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            حالة التذكرة: {ticket.status}
          </span>

          {/* Email */}
          {ticket.userEmail && (
            <span className="flex items-center gap-1.5 bg-[#14171f] border border-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-xl font-mono">
              <Mail size={13} className="text-slate-500" />
              <span>{ticket.userEmail}</span>
            </span>
          )}

          {/* Close Ticket Button */}
          {ticket.status !== "closed" && (
            <button
              onClick={handleCloseTicket}
              disabled={closing}
              className="flex items-center gap-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl border border-rose-500/30 transition shadow"
            >
              <Lock size={13} />
              <span>{closing ? "جاري الإغلاق..." : "إغلاق التذكرة"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Conversation Box */}
      <div className="bg-[#1e232d] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        {/* Messages List */}
        <div className="space-y-4 min-h-[220px]">
          {ticket.messages && ticket.messages.length > 0 ? (
            ticket.messages.map((msg) => {
              const isAdmin = msg.senderType === "admin";
              return (
                <div
                  key={msg.id}
                  className={`p-4 rounded-2xl border transition ${
                    isAdmin
                      ? "bg-blue-950/30 border-blue-800/40 mr-auto max-w-2xl text-right"
                      : "bg-[#14171f] border-slate-800/80 ml-auto max-w-2xl text-right"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60 text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                          isAdmin
                            ? "bg-blue-600 text-white"
                            : "bg-purple-600/30 text-purple-300 border border-purple-500/40"
                        }`}
                      >
                        {isAdmin ? "A" : (msg.senderName || "U").charAt(0).toUpperCase()}
                      </div>
                      <span className={`font-bold ${isAdmin ? "text-blue-400" : "text-white"}`}>
                        {msg.senderName || (isAdmin ? "الدعم الفني" : "العميل")}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-500 font-mono">
                      {msg.createdAt
                        ? new Date(msg.createdAt).toLocaleString("ar-EG", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : ""}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {msg.message}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-slate-500 text-xs">
              لا توجد رسائل سابقة في هذه التذكرة.
            </div>
          )}
        </div>

        {/* Quick Replies Bar */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-400">
            <Sparkles size={14} className="text-amber-400" />
            <span>ردود سريعة:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickReplies.map((qr, idx) => (
              <button
                key={idx}
                onClick={() => setReplyText(qr.text)}
                className="bg-[#14171f] hover:bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 transition"
              >
                {qr.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reply Textarea & Send Button */}
        <div className="pt-2 space-y-3">
          <textarea
            rows={4}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="اكتب ردك هنا للعميل..."
            className="w-full bg-[#14171f] border border-slate-700 rounded-2xl p-4 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none leading-relaxed"
          />

          <div className="flex justify-end">
            <button
              onClick={handleSendReply}
              disabled={sending || !replyText.trim()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-lg shadow-blue-900/30"
            >
              <span>{sending ? "جاري الإرسال..." : "إرسال الرد"}</span>
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
