import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Bell, Check, CheckCheck, Clock, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { getPublicJson, apiRequest } from "@/lib/public-api";
import { useAuth } from "@/lib/auth-context";
import { NotificationItem } from "@/components/layout/NotificationBellDropdown";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getPublicJson<NotificationItem[]>("/me/notifications?limit=100");
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchNotifications();
    }
  }, [user, authLoading]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await apiRequest(`/me/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await apiRequest("/me/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-[#C8A45C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 rounded-3xl bg-[#1A1A1A] border border-[#C8A45C]/30 text-center shadow-xl text-white" dir="rtl">
        <div className="w-14 h-14 rounded-2xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 text-[#C8A45C] flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={28} />
        </div>
        <h2 className="text-lg font-bold text-[#FDE68A] mb-2">تسجيل الدخول مطلوب</h2>
        <p className="text-xs text-zinc-300 mb-6 leading-relaxed">
          يرجى تسجيل الدخول بحسابك لعرض إشعارات طلباتك وعمليات الشحن الخاصة بك.
        </p>
        <div className="flex gap-3">
          <Link href="/login" className="flex-1">
            <Button className="w-full bg-[#C8A45C] text-[#1A1A1A] hover:bg-[#DEB86D] font-bold rounded-xl text-xs py-2.5">
              تسجيل الدخول
            </Button>
          </Link>
          <Link href="/register" className="flex-1">
            <Button variant="outline" className="w-full border-zinc-700 hover:border-[#C8A45C] text-white rounded-xl text-xs py-2.5">
              حساب جديد
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => n.isRead === false).length;
  const filteredNotifications = filter === "unread" ? notifications.filter((n) => n.isRead === false) : notifications;

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 space-y-4" dir="rtl">
      {/* Header card */}
      <div className="bg-[#1A1A1A] border border-[#C8A45C]/30 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-[#C8A45C]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C8A45C]/30 to-[#1A1A1A] border border-[#C8A45C]/50 flex items-center justify-center text-[#C8A45C] shadow-md">
              <Bell size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-[#FDE68A]">مركز الإشعارات والتنبيهات</h1>
                {unreadCount > 0 && (
                  <span className="bg-[#C8A45C]/25 text-[#FDE68A] border border-[#C8A45C]/40 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full">
                    {unreadCount} غير مقروء
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                سجل التحديثات المباشرة لطلباتك، عمليات الشحن، والرسائل الإدارية.
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
              className="flex items-center justify-center gap-2 bg-[#C8A45C]/20 hover:bg-[#C8A45C]/30 border border-[#C8A45C]/40 text-[#FDE68A] text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer active:scale-95 disabled:opacity-50 shadow-xs"
            >
              <CheckCheck size={16} />
              <span>{markingAll ? "جاري التحديث..." : "تحديد الكل كمقروء"}</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-zinc-800/80">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filter === "all"
                ? "bg-[#C8A45C] text-[#1A1A1A] shadow-md"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            جميع الإشعارات ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filter === "unread"
                ? "bg-[#C8A45C] text-[#1A1A1A] shadow-md"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            غير المقروءة ({unreadCount})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-zinc-400 bg-[#1A1A1A] border border-[#C8A45C]/20 rounded-3xl">
            <div className="inline-block w-8 h-8 border-3 border-[#C8A45C] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs">جاري تحميل إشعاراتك...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center bg-[#1A1A1A] border border-[#C8A45C]/20 rounded-3xl">
            <div className="w-16 h-16 rounded-full bg-zinc-800/80 border border-zinc-700 flex items-center justify-center mx-auto mb-3 text-zinc-500">
              <Bell size={26} />
            </div>
            <h3 className="text-sm font-bold text-[#FDE68A] mb-1">
              {filter === "unread" ? "لا توجد إشعارات غير مقروءة" : "لا توجد إشعارات حالياً"}
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              عند إتمام أو تعديل أي طلب أو عملية إيداع ستصلك تنبيهات فورية هنا.
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const isUnread = item.isRead === false;
            const formattedDate = item.createdAt
              ? new Date(item.createdAt).toLocaleString("ar-EG", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                  isUnread
                    ? "bg-gradient-to-r from-[#241D12] via-[#1A1A1A] to-[#1A1A1A] border-[#C8A45C]/60 shadow-lg shadow-[#C8A45C]/5"
                    : "bg-[#1A1A1A]/90 border-zinc-800/80 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 flex-1">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isUnread
                          ? "bg-[#C8A45C]/25 text-[#FDE68A] border border-[#C8A45C]/40"
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      }`}
                    >
                      <Bell size={17} />
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.title && (
                          <h3
                            className={`text-sm font-bold ${
                              isUnread ? "text-[#FDE68A]" : "text-zinc-100"
                            }`}
                          >
                            {item.title}
                          </h3>
                        )}
                        {isUnread && (
                          <span className="text-[10px] bg-[#C8A45C] text-[#1A1A1A] font-extrabold px-2 py-0.5 rounded-full">
                            جديد
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                        {item.content}
                      </p>

                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 pt-1">
                        <Clock size={12} className="text-[#C8A45C]" />
                        <span>{formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  {isUnread && (
                    <button
                      onClick={() => handleMarkAsRead(item.id)}
                      className="p-2 rounded-xl bg-[#C8A45C]/15 hover:bg-[#C8A45C]/30 text-[#C8A45C] hover:text-[#FDE68A] border border-[#C8A45C]/30 transition shrink-0 cursor-pointer"
                      title="تحديد كمقروء"
                    >
                      <Check size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
