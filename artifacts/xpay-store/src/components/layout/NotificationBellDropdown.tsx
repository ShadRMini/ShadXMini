import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { Bell, Check, CheckCheck, Clock, ExternalLink } from "lucide-react";
import { getPublicJson, apiRequest } from "@/lib/public-api";
import { useAuth } from "@/lib/auth-context";

export interface NotificationItem {
  id: number;
  title: string | null;
  content: string;
  targetType: string;
  targetUserId: number | null;
  status: string;
  isRead?: boolean;
  readAt?: string | null;
  createdAt: string;
}

export default function NotificationBellDropdown() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll for unread count every 30 seconds
  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const res = await getPublicJson<{ count: number }>("/me/notifications/unread-count");
      setUnreadCount(Number(res?.count || 0));
    } catch {
      // Ignore if unauthenticated or network error
    }
  };

  const fetchRecentNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getPublicJson<NotificationItem[]>("/me/notifications?limit=5");
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // When dropdown opens, fetch latest 5 notifications
  useEffect(() => {
    if (isOpen && user) {
      fetchRecentNotifications();
    }
  }, [isOpen, user]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiRequest(`/me/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiRequest("/me/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  // Only render for logged in users
  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef} dir="rtl">
      {/* Bell Button with Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-[#1A1A1A] border border-[#C8A45C]/35 hover:border-[#C8A45C] text-[#C8A45C] hover:text-[#FDE68A] transition active:scale-95 cursor-pointer shadow-xs"
        title="الإشعارات والتنبيهات"
        aria-label="الإشعارات والتنبيهات"
        type="button"
      >
        <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-red-600 to-amber-600 text-white font-mono text-[10px] font-black rounded-full flex items-center justify-center border border-[#1A1A1A] shadow-md animate-bounce">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 sm:right-auto sm:left-0 mt-2 w-80 sm:w-96 bg-[#1A1A1A] border border-[#C8A45C]/40 rounded-2xl shadow-2xl z-50 overflow-hidden text-right">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-l from-[#241D12] to-[#1A1A1A] border-b border-[#C8A45C]/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#C8A45C]/20 text-[#C8A45C]">
                <Bell size={15} />
              </div>
              <span className="text-xs font-bold text-[#FDE68A]">التنبيهات والإشعارات</span>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-[#C8A45C]/20 text-[#C8A45C] px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} جديد
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] text-[#C8A45C] hover:text-[#FDE68A] flex items-center gap-1 transition cursor-pointer font-medium"
              >
                <CheckCheck size={13} />
                <span>قراءة الكل</span>
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/60 custom-scrollbar">
            {loading ? (
              <div className="p-6 text-center text-xs text-zinc-400">
                <div className="inline-block w-5 h-5 border-2 border-[#C8A45C] border-t-transparent rounded-full animate-spin mb-2" />
                <p>جاري تحميل الإشعارات...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                <div className="w-10 h-10 rounded-full bg-zinc-800/80 border border-zinc-700 flex items-center justify-center mx-auto mb-2 text-zinc-500">
                  <Bell size={18} />
                </div>
                <p className="font-semibold text-zinc-300">لا توجد إشعارات حالياً</p>
                <p className="text-[11px] text-zinc-500 mt-1">ستظهر هنا تحديثات طلباتك وعمليات الشحن</p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = item.isRead === false;
                const formattedDate = item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString("ar-EG", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";

                return (
                  <div
                    key={item.id}
                    className={`p-3 transition-colors ${
                      isUnread
                        ? "bg-[#C8A45C]/10 hover:bg-[#C8A45C]/15 border-r-2 border-[#C8A45C]"
                        : "hover:bg-zinc-900/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {item.title && (
                          <h4
                            className={`text-xs font-bold mb-1 leading-snug ${
                              isUnread ? "text-[#FDE68A]" : "text-zinc-200"
                            }`}
                          >
                            {item.title}
                          </h4>
                        )}
                        <p className="text-[11px] text-zinc-300 leading-relaxed break-words">
                          {item.content}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-400">
                          <Clock size={11} className="text-[#C8A45C]" />
                          <span>{formattedDate}</span>
                        </div>
                      </div>

                      {isUnread && (
                        <button
                          onClick={(e) => handleMarkAsRead(item.id, e)}
                          className="p-1 rounded-md text-[#C8A45C] hover:bg-[#C8A45C]/20 transition shrink-0"
                          title="تحديد كمقروء"
                        >
                          <Check size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer View All Link */}
          <div className="p-2.5 bg-[#12100C] border-t border-[#C8A45C]/20 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-[#FDE68A] bg-[#C8A45C]/20 hover:bg-[#C8A45C]/30 border border-[#C8A45C]/30 rounded-xl transition cursor-pointer"
            >
              <span>عرض جميع الإشعارات</span>
              <ExternalLink size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
