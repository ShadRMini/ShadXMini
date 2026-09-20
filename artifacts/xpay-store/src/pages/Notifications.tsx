import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  Trash2,
  ShoppingBag,
  CreditCard,
  Tag,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  AlertTriangle,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getPublicJson, apiRequest } from "@/lib/public-api";
import { useAuth } from "@/lib/auth-context";
import { NotificationItem } from "@/components/layout/NotificationBellDropdown";
import { Button } from "@/components/ui/button";

type FilterType = "all" | "unread" | "order" | "payment" | "offer" | "system";

function formatArabicRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 30) return "الآن";
  if (diffInSeconds < 60) return `منذ ${diffInSeconds} ثانية`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes === 1) return "منذ دقيقة";
  if (diffInMinutes === 2) return "منذ دقيقتين";
  if (diffInMinutes <= 10) return `منذ ${diffInMinutes} دقائق`;
  if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours === 1) return "منذ ساعة";
  if (diffInHours === 2) return "منذ ساعتين";
  if (diffInHours <= 10) return `منذ ${diffInHours} ساعات`;
  if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "منذ يوم";
  if (diffInDays === 2) return "منذ يومين";
  if (diffInDays <= 10) return `منذ ${diffInDays} أيام`;
  if (diffInDays < 30) return `منذ ${diffInDays} يوماً`;

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths === 1) return "منذ شهر";
  if (diffInMonths === 2) return "منذ شهرين";
  if (diffInMonths < 12) return `منذ ${diffInMonths} أشهر`;

  return date.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

function getNotificationCategory(item: NotificationItem): "order" | "payment" | "offer" | "system" {
  const text = `${item.title || ""} ${item.content || ""} ${item.targetType || ""}`.toLowerCase();
  if (
    text.includes("طلب") ||
    text.includes("order") ||
    text.includes("شراء") ||
    text.includes("تسليم") ||
    text.includes("منتج") ||
    item.targetType === "order"
  ) {
    return "order";
  }
  if (
    text.includes("دفع") ||
    text.includes("شحن") ||
    text.includes("إيداع") ||
    text.includes("رصيد") ||
    text.includes("محفظة") ||
    text.includes("فاتورة") ||
    text.includes("payment") ||
    text.includes("deposit") ||
    text.includes("shamcash") ||
    text.includes("كاش") ||
    item.targetType === "deposit"
  ) {
    return "payment";
  }
  if (
    text.includes("عرض") ||
    text.includes("خصم") ||
    text.includes("تخفيض") ||
    text.includes("مفاجأة") ||
    text.includes("هدية") ||
    text.includes("باقة") ||
    text.includes("offer") ||
    text.includes("discount") ||
    item.targetType === "offer"
  ) {
    return "offer";
  }
  return "system";
}

function extractLink(text: string): string | null {
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  if (urlMatch) return urlMatch[0];
  const internalMatch = text.match(/\/(orders|deposits|deposit|loyalty|profile|categories|products)\/?[a-zA-Z0-9_-]*/);
  if (internalMatch) return internalMatch[0];
  return null;
}

// Memoized Card Component
const NotificationCard = React.memo(function NotificationCard({
  item,
  onMarkAsRead,
  onDelete,
  onCardClick,
}: {
  item: NotificationItem;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  onCardClick: (item: NotificationItem) => void;
}) {
  const isUnread = item.isRead === false;
  const category = getNotificationCategory(item);
  const relativeTime = formatArabicRelativeTime(item.createdAt);
  const detectedLink = extractLink(item.content);

  const getCategoryMeta = () => {
    switch (category) {
      case "order":
        return {
          icon: ShoppingBag,
          colorClass: "text-[var(--theme-primary)] bg-[var(--theme-primary)]/15 border-[var(--theme-primary)]/40",
          name: "طلب",
        };
      case "payment":
        return {
          icon: CreditCard,
          colorClass: "text-emerald-400 bg-emerald-500/15 border-emerald-500/40",
          name: "مدفوعات",
        };
      case "offer":
        return {
          icon: Tag,
          colorClass: "text-amber-400 bg-amber-500/15 border-amber-500/40",
          name: "عرض",
        };
      case "system":
      default:
        return {
          icon: Bell,
          colorClass: "text-sky-400 bg-sky-500/15 border-sky-500/40",
          name: "النظام",
        };
    }
  };

  const meta = getCategoryMeta();
  const IconComponent = meta.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={() => onCardClick(item)}
      className={`group relative rounded-2xl p-4 sm:p-5 border transition-all duration-200 cursor-pointer select-none overflow-hidden ${
        isUnread
          ? "bg-[var(--theme-card)] border-[var(--theme-primary)]/40 border-r-4 border-r-[var(--theme-primary)] shadow-lg shadow-black/40"
          : "bg-[var(--theme-card)] border-[var(--theme-primary)]/20 opacity-85 hover:opacity-100 hover:border-[var(--theme-primary)]/40"
      }`}
    >
      {/* Background glow on unread */}
      {isUnread && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--theme-primary)]/5 rounded-full blur-2xl pointer-events-none" />
      )}

      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          {/* Category Icon */}
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 shadow-sm transition-transform group-hover:scale-105 ${meta.colorClass}`}
          >
            <IconComponent size={20} />
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Header row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[var(--theme-background)] text-zinc-400 border border-zinc-800">
                {meta.name}
              </span>

              {item.title && (
                <h3
                  className={`text-sm sm:text-base font-bold truncate ${
                    isUnread ? "text-[var(--theme-accent)]" : "text-zinc-100"
                  }`}
                >
                  {item.title}
                </h3>
              )}

              {isUnread && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[var(--theme-primary)] text-[var(--theme-background)] shadow-sm shadow-[var(--theme-primary)]/40 animate-pulse">
                  جديد
                </span>
              )}
            </div>

            {/* Description / Content */}
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed break-words line-clamp-3">
              {item.content}
            </p>

            {/* Footer row: Time & Link indicator */}
            <div className="flex items-center gap-3 pt-1 text-xs text-zinc-400 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-[var(--theme-primary)]" />
                <span>{relativeTime}</span>
              </div>

              {detectedLink && (
                <div className="flex items-center gap-1 text-[var(--theme-primary)] font-semibold text-[11px] hover:underline">
                  <span>فتح الرابط</span>
                  <ExternalLink size={12} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hover / Direct Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {isUnread && (
            <button
              onClick={() => onMarkAsRead(item.id)}
              className="p-2 rounded-xl bg-[var(--theme-primary)]/15 hover:bg-[var(--theme-primary)]/30 text-[var(--theme-primary)] hover:text-[var(--theme-accent)] border border-[var(--theme-primary)]/30 transition active:scale-95 cursor-pointer"
              title="تحديد كمقروء"
              aria-label="تحديد كمقروء"
            >
              <Check size={16} />
            </button>
          )}

          <button
            onClick={() => onDelete(item.id)}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-red-300 border border-red-500/25 transition active:scale-95 cursor-pointer opacity-75 group-hover:opacity-100"
            title="حذف الإشعار"
            aria-label="حذف الإشعار"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
});

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [page, setPage] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const PAGE_SIZE = 20;

  // Fetch notifications
  const fetchNotifications = useCallback(
    async (showLoadingSpinner = true) => {
      if (!user) {
        setLoading(false);
        return;
      }

      if (showLoadingSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const data = await getPublicJson<NotificationItem[]>("/me/notifications?limit=100");
        if (Array.isArray(data)) {
          setNotifications(data);
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
        toast.error("فشل تحديث الإشعارات");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  // Initial load
  useEffect(() => {
    if (!authLoading) {
      fetchNotifications(true);
    }
  }, [authLoading, fetchNotifications]);

  // Auto-Refresh every 30 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  // Mark single as read
  const handleMarkAsRead = useCallback(async (id: number) => {
    try {
      await apiRequest(`/me/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      toast.success("تم تحديد الإشعار كمقروء");
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      toast.error("تعذر تحديد الإشعار كمقروء");
    }
  }, []);

  // Mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    setMarkingAll(true);
    try {
      await apiRequest("/me/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("تم تحديد جميع الإشعارات كمقروءة");
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      toast.error("تعذر تحديث حالة الإشعارات");
    } finally {
      setMarkingAll(false);
    }
  }, []);

  // Delete single notification
  const handleDeleteNotification = useCallback(async (id: number) => {
    try {
      await apiRequest(`/me/notifications/${id}`, { method: "DELETE" });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("تم حذف الإشعار بنجاح");
    } catch (err) {
      console.error("Failed to delete notification:", err);
      // Fallback: remove locally
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("تم حذف الإشعار");
    }
  }, []);

  // Delete all notifications
  const handleDeleteAll = useCallback(async () => {
    setDeletingAll(true);
    try {
      await apiRequest("/me/notifications/delete-all", { method: "DELETE" });
      setNotifications([]);
      setShowDeleteAllModal(false);
      toast.success("تم حذف جميع الإشعارات بنجاح");
    } catch (err) {
      console.error("Failed to delete all notifications:", err);
      setNotifications([]);
      setShowDeleteAllModal(false);
      toast.success("تم حذف جميع الإشعارات");
    } finally {
      setDeletingAll(false);
    }
  }, []);

  // Card click handler: mark read and follow link if present
  const handleCardClick = useCallback(
    async (item: NotificationItem) => {
      if (item.isRead === false) {
        handleMarkAsRead(item.id);
      }
      const link = extractLink(item.content);
      if (link) {
        if (link.startsWith("http")) {
          window.open(link, "_blank", "noopener,noreferrer");
        } else {
          setLocation(link);
        }
      }
    },
    [handleMarkAsRead, setLocation]
  );

  // Filtered & Paginated items
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (filter === "unread") return item.isRead === false;
      if (filter === "order") return getNotificationCategory(item) === "order";
      if (filter === "payment") return getNotificationCategory(item) === "payment";
      if (filter === "offer") return getNotificationCategory(item) === "offer";
      if (filter === "system") return getNotificationCategory(item) === "system";
      return true;
    });
  }, [notifications, filter]);

  const totalFiltered = filteredNotifications.length;
  const paginatedNotifications = useMemo(() => {
    return filteredNotifications.slice(0, page * PAGE_SIZE);
  }, [filteredNotifications, page]);

  const hasMore = paginatedNotifications.length < totalFiltered;

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => n.isRead === false).length;
  }, [notifications]);

  // If user is not authenticated
  if (!authLoading && !user) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 rounded-3xl bg-[var(--theme-background)] border border-[var(--theme-primary)]/30 text-center shadow-2xl text-white" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-[var(--theme-primary)]/20 border border-[var(--theme-primary)]/40 text-[var(--theme-primary)] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[var(--theme-primary)]/10">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-black text-[var(--theme-accent)] mb-2">تسجيل الدخول مطلوب</h2>
        <p className="text-xs text-zinc-300 mb-6 leading-relaxed">
          يرجى تسجيل الدخول بحسابك لعرض إشعارات وتنبيهات طلباتك وشحناتك المالية.
        </p>
        <div className="flex gap-3">
          <Link href="/login" className="flex-1">
            <Button className="w-full bg-[var(--theme-primary)] hover:bg-[var(--theme-accent)] text-[var(--theme-background)] font-bold rounded-xl text-xs py-3 shadow-md">
              تسجيل الدخول
            </Button>
          </Link>
          <Link href="/register" className="flex-1">
            <Button variant="outline" className="w-full border-zinc-700 hover:border-[var(--theme-primary)] text-white rounded-xl text-xs py-3">
              حساب جديد
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-24 p-4 max-w-4xl mx-auto transition-colors"
      style={{
        backgroundColor: "var(--theme-background)",
        color: "var(--theme-text-primary)",
      }}
      dir="rtl"
    >
      {/* Top Header Card */}
      <div
        className="rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden mb-6 border"
        style={{
          backgroundColor: "var(--theme-card)",
          borderColor: "var(--theme-border)",
        }}
      >
        {/* Glow decoration */}
        <div className="absolute -top-16 -left-16 w-44 h-44 bg-[var(--theme-primary)]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-44 h-44 bg-[var(--theme-primary)]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          {/* Title & Count */}
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center border shadow-lg shrink-0"
              style={{
                backgroundColor: "var(--theme-background)",
                borderColor: "var(--theme-border)",
                color: "var(--theme-primary)",
              }}
            >
              <Bell size={26} style={{ color: "var(--theme-primary)" }} />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black" style={{ color: "var(--theme-primary)" }}>
                  الإشعارات والتنبيهات
                </h1>
                {unreadCount > 0 && (
                  <span className="bg-[var(--theme-primary)] text-[var(--theme-background)] text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs">
                    {unreadCount} غير مقروء
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 mt-1 font-medium">
                لديك <span className="text-[var(--theme-accent)] font-bold">{notifications.length}</span> إشعار في حسابك
              </p>
            </div>
          </div>

          {/* Action Buttons: Refresh, Mark All, Delete All */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Manual Refresh Button */}
            <button
              onClick={() => fetchNotifications(false)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--theme-background)] hover:bg-zinc-800 border border-zinc-700 hover:border-[var(--theme-primary)]/50 text-zinc-300 text-xs font-bold transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="تحديث الإشعارات"
              aria-label="تحديث الإشعارات"
            >
              <RefreshCw size={15} className={`text-[var(--theme-primary)] ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">تحديث</span>
            </button>

            {/* Mark All As Read Button */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--theme-primary)]/15 hover:bg-[var(--theme-primary)]/30 border border-[var(--theme-primary)]/40 text-[var(--theme-accent)] text-xs font-bold transition active:scale-95 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <CheckCheck size={16} className="text-[var(--theme-primary)]" />
                <span>{markingAll ? "جاري التحديث..." : "تحديد الكل كمقروء"}</span>
              </button>
            )}

            {/* Delete All Button */}
            {notifications.length > 0 && (
              <button
                onClick={() => setShowDeleteAllModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                <Trash2 size={16} className="text-red-400" />
                <span>حذف الكل</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-6 pt-4 border-t border-zinc-700/60 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => {
              setFilter("all");
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              filter === "all"
                ? "bg-[var(--theme-primary)] text-[var(--theme-background)] shadow-md shadow-[var(--theme-primary)]/25"
                : "bg-[var(--theme-background)] text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700/60"
            }`}
          >
            الكل ({notifications.length})
          </button>

          <button
            onClick={() => {
              setFilter("unread");
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              filter === "unread"
                ? "bg-[var(--theme-primary)] text-[var(--theme-background)] shadow-md shadow-[var(--theme-primary)]/25"
                : "bg-[var(--theme-background)] text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700/60"
            }`}
          >
            <span>غير مقروءة</span>
            {unreadCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  filter === "unread" ? "bg-[var(--theme-background)] text-[var(--theme-accent)]" : "bg-[var(--theme-primary)] text-[var(--theme-background)]"
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setFilter("order");
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              filter === "order"
                ? "bg-[var(--theme-primary)] text-[var(--theme-background)] shadow-md shadow-[var(--theme-primary)]/25"
                : "bg-[var(--theme-background)] text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700/60"
            }`}
          >
            <ShoppingBag size={14} className={filter === "order" ? "text-[var(--theme-background)]" : "text-[var(--theme-primary)]"} />
            <span>الطلبات</span>
          </button>

          <button
            onClick={() => {
              setFilter("payment");
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              filter === "payment"
                ? "bg-[var(--theme-primary)] text-[var(--theme-background)] shadow-md shadow-[var(--theme-primary)]/25"
                : "bg-[var(--theme-background)] text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700/60"
            }`}
          >
            <CreditCard size={14} className={filter === "payment" ? "text-[var(--theme-background)]" : "text-emerald-400"} />
            <span>المدفوعات</span>
          </button>

          <button
            onClick={() => {
              setFilter("offer");
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              filter === "offer"
                ? "bg-[var(--theme-primary)] text-[var(--theme-background)] shadow-md shadow-[var(--theme-primary)]/25"
                : "bg-[var(--theme-background)] text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700/60"
            }`}
          >
            <Tag size={14} className={filter === "offer" ? "text-[var(--theme-background)]" : "text-amber-400"} />
            <span>العروض</span>
          </button>

          <button
            onClick={() => {
              setFilter("system");
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              filter === "system"
                ? "bg-[var(--theme-primary)] text-[var(--theme-background)] shadow-md shadow-[var(--theme-primary)]/25"
                : "bg-[var(--theme-background)] text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700/60"
            }`}
          >
            <Bell size={14} className={filter === "system" ? "text-[var(--theme-background)]" : "text-sky-400"} />
            <span>النظام</span>
          </button>
        </div>
      </div>

      {/* Notifications List Container */}
      <div className="space-y-3">
        {loading ? (
          // Skeleton Loading
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-[var(--theme-card)] border border-[var(--theme-primary)]/20 rounded-2xl p-5 flex items-start gap-4 animate-pulse"
            >
              <div className="w-11 h-11 rounded-xl bg-zinc-800 shrink-0" />
              <div className="flex-1 space-y-2.5">
                <div className="h-4 bg-zinc-800 rounded-md w-1/3" />
                <div className="h-3 bg-zinc-800/80 rounded-md w-3/4" />
                <div className="h-2.5 bg-zinc-800/60 rounded-md w-1/4" />
              </div>
            </div>
          ))
        ) : filteredNotifications.length === 0 ? (
          // Empty State
          <div className="p-12 text-center bg-[var(--theme-card)] border border-[var(--theme-primary)]/20 rounded-3xl shadow-xl">
            <div className="w-18 h-18 rounded-3xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center mx-auto mb-4 text-zinc-500 shadow-inner">
              <Bell size={32} />
            </div>
            <h3 className="text-base sm:text-lg font-black text-[var(--theme-accent)] mb-1.5">
              لا توجد إشعارات حالياً
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
              ستظهر هنا جميع الإشعارات والتنبيهات المتعلقة بحسابك وطلباتك وعمليات الشحن.
            </p>
          </div>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              {paginatedNotifications.map((item) => (
                <NotificationCard
                  key={item.id}
                  item={item}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDeleteNotification}
                  onCardClick={handleCardClick}
                />
              ))}
            </AnimatePresence>

            {/* Pagination / Load More */}
            {hasMore && (
              <div className="pt-4 text-center">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--theme-card)] hover:bg-[var(--theme-input-bg)] border border-[var(--theme-primary)]/40 text-[var(--theme-accent)] text-xs font-bold transition shadow-lg active:scale-95 cursor-pointer"
                >
                  <ChevronDown size={16} />
                  <span>تحميل المزيد من الإشعارات ({totalFiltered - paginatedNotifications.length} متبقي)</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete All Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in" dir="rtl">
          <div className="w-full max-w-md bg-[var(--theme-card)] border border-red-500/40 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} />
            </div>

            <h3 className="text-lg font-black text-white mb-2">تأكيد حذف جميع الإشعارات</h3>
            <p className="text-xs text-zinc-300 mb-6 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف كافة الإشعارات والتنبيهات؟ لن تتمكن من التراجع عن هذه الخطوة.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteAll}
                disabled={deletingAll}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl text-xs transition shadow-lg cursor-pointer disabled:opacity-50"
              >
                {deletingAll ? "جاري الحذف..." : "تأكيد الحذف"}
              </button>
              <button
                onClick={() => setShowDeleteAllModal(false)}
                disabled={deletingAll}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-xl text-xs transition cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
