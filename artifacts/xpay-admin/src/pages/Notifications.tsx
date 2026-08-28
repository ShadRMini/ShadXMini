import { useEffect, useState, useMemo } from "react";
import { get, post, del } from "../lib/api";
import { 
  Bell, 
  Send, 
  Trash2, 
  ShoppingCart, 
  Wallet, 
  Users, 
  Crown, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  Sparkles
} from "lucide-react";

interface NotificationItem {
  id: number;
  targetType: string;
  targetUserId: number | null;
  targetUserName?: string | null;
  targetUserEmail?: string | null;
  targetDisplayId?: string | null;
  title: string | null;
  content: string;
  status: string;
  createdAt: string;
}

interface UserOption {
  id: number;
  username: string;
  email?: string;
  displayId?: string;
}

export default function Notifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetType, setTargetType] = useState("all");
  const [targetUserId, setTargetUserId] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await get("/admin/notifications");
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error("Load notifications error:", e);
      setErr(e.message || "فشل تحميل قائمة الإشعارات");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await get("/admin/users");
      if (Array.isArray(data)) {
        setUsers(
          data.map((u: any) => ({
            id: u.id,
            username: u.username,
            email: u.email,
            displayId: u.displayId || String(u.id),
          }))
        );
      }
    } catch (e) {
      console.error("Load users for notifications error:", e);
    }
  };

  useEffect(() => {
    loadNotifications();
    loadUsers();
  }, []);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErr("يرجى كتابة محتوى الإشعار");
      return;
    }
    if (targetType === "user" && !targetUserId) {
      setErr("يرجى اختيار أو تحديد ID المستخدم المستهدف");
      return;
    }

    setBusy(true);
    setErr(null);
    setSuccessMsg(null);

    try {
      await post("/admin/notifications", {
        title: title.trim() || "إشعار من الإدارة",
        content: content.trim(),
        targetType,
        targetUserId: targetType === "user" ? Number(targetUserId) : null,
      });

      setSuccessMsg("تم إرسال الإشعار وحفظه بنجاح!");
      setTitle("");
      setContent("");
      setTargetUserId("");
      setUserSearchQuery("");
      await loadNotifications();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e: any) {
      setErr(e.message || "فشل إرسال الإشعار");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الإشعار نهائياً؟")) return;
    try {
      await del(`/admin/notifications/${id}`);
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (e: any) {
      alert(e.message || "فشل حذف الإشعار");
    }
  };

  const applyTemplate = (tplTitle: string, tplContent: string) => {
    setTitle(tplTitle);
    setContent(tplContent);
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((n) => {
      // Category filter
      if (filterType === "orders") {
        const text = `${n.title || ""} ${n.content}`.toLowerCase();
        if (!text.includes("طلب") && !text.includes("order") && !text.includes("شراء")) return false;
      } else if (filterType === "deposits") {
        const text = `${n.title || ""} ${n.content}`.toLowerCase();
        if (!text.includes("إيداع") && !text.includes("شحن") && !text.includes("deposit") && !text.includes("رصيد")) return false;
      } else if (filterType === "vip") {
        if (n.targetType !== "vip") return false;
      } else if (filterType === "direct") {
        if (n.targetType !== "user") return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullText = `${n.title || ""} ${n.content} ${n.targetUserName || ""} ${n.targetUserEmail || ""} ${n.targetUserId || ""}`.toLowerCase();
        if (!fullText.includes(q)) return false;
      }

      return true;
    });
  }, [items, filterType, searchQuery]);

  // Quick stats
  const stats = useMemo(() => {
    let orderCount = 0;
    let depositCount = 0;
    let userCount = 0;
    items.forEach((it) => {
      const text = `${it.title || ""} ${it.content}`.toLowerCase();
      if (text.includes("طلب") || text.includes("order")) orderCount++;
      if (text.includes("إيداع") || text.includes("شحن") || text.includes("رصيد")) depositCount++;
      if (it.targetType === "user") userCount++;
    });
    return {
      total: items.length,
      orders: orderCount,
      deposits: depositCount,
      users: userCount,
    };
  }, [items]);

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return users.slice(0, 50);
    const q = userSearchQuery.toLowerCase();
    return users
      .filter((u) => u.username.toLowerCase().includes(q) || (u.email && u.email.toLowerCase().includes(q)) || String(u.id).includes(q) || (u.displayId && u.displayId.includes(q)))
      .slice(0, 50);
  }, [users, userSearchQuery]);

  const getItemIcon = (n: NotificationItem) => {
    const text = `${n.title || ""} ${n.content}`.toLowerCase();
    if (text.includes("طلب") || text.includes("order")) {
      return <ShoppingCart size={18} className="text-blue-500" />;
    }
    if (text.includes("إيداع") || text.includes("شحن") || text.includes("رصيد") || text.includes("محفظتك")) {
      return <Wallet size={18} className="text-emerald-500" />;
    }
    if (n.targetType === "vip" || text.includes("vip")) {
      return <Crown size={18} className="text-amber-500" />;
    }
    return <Bell size={18} className="text-[#C8A45C]" />;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#C8A45C]/15 border border-[#C8A45C]/30 flex items-center justify-center text-[#C8A45C]">
              <Bell size={22} />
            </div>
            <span>نظام الإشعارات والتنبيهات</span>
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            إدارة وتوليد الإشعارات الفورية للطلبات، عمليات الشحن والإيداع، ورسائل المستخدمين
          </p>
        </div>

        <button
          onClick={loadNotifications}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin text-[#C8A45C]" : ""} />
          <span>تحديث الإشعارات</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>إجمالي الإشعارات</span>
            <Bell size={16} className="text-[#C8A45C]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats.total}</div>
          <div className="text-xs text-slate-400 mt-0.5">مسجلة في قاعدة البيانات</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>تنبيهات الطلبات</span>
            <ShoppingCart size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats.orders}</div>
          <div className="text-xs text-slate-400 mt-0.5">قبول ورفض وتنفيذ</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>تنبيهات الإيداعات</span>
            <Wallet size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats.deposits}</div>
          <div className="text-xs text-slate-400 mt-0.5">شحن وموافقة ورفض</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>رسائل مخصصة لمستخدم</span>
            <Users size={16} className="text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats.users}</div>
          <div className="text-xs text-slate-400 mt-0.5">إشعارات داخلية فردية</div>
        </div>
      </div>

      {/* Send Notification Form */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#C8A45C]">
              <Send size={16} />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">إرسال إشعار داخلي جديد</h2>
              <p className="text-xs text-slate-300">يظهر الإشعار فوراً في حساب المستخدم داخل النظام</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#C8A45C] bg-[#C8A45C]/10 border border-[#C8A45C]/30 px-3 py-1.5 rounded-lg">
            <Sparkles size={14} />
            <span>نظام الإرسال المباشر</span>
          </div>
        </div>

        <form onSubmit={send} className="p-5 md:p-6 space-y-4">
          {/* Quick Templates */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">قوالب سريعة جاهزة:</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyTemplate("🎉 تم شحن رصيد حسابك بنجاح", "تمت إضافة الرصيد إلى محفظتك بنجاح، يمكنك الآن متابعة عمليات الشراء في المتجر.")}
                className="text-xs bg-slate-100 hover:bg-[#C8A45C]/15 hover:text-[#C8A45C] hover:border-[#C8A45C]/40 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition-all"
              >
                + شحن رصيد
              </button>
              <button
                type="button"
                onClick={() => applyTemplate("✅ تم تنفيذ طلبك بنجاح", "تمت معالجة وتنفيذ طلبك وتسليم البيانات المطلوبة بنجاح. شكراً لتعاملك معنا.")}
                className="text-xs bg-slate-100 hover:bg-[#C8A45C]/15 hover:text-[#C8A45C] hover:border-[#C8A45C]/40 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition-all"
              >
                + تنفيذ طلب
              </button>
              <button
                type="button"
                onClick={() => applyTemplate("⚠️ تنبيه هام من الإدارة", "يرجى التحقق من تفاصيل حسابك أو التواصل مع الدعم الفني للاستفسار.")}
                className="text-xs bg-slate-100 hover:bg-[#C8A45C]/15 hover:text-[#C8A45C] hover:border-[#C8A45C]/40 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition-all"
              >
                + تنبيه إداري
              </button>
              <button
                type="button"
                onClick={() => applyTemplate("⭐ ترقية إلى عضوية VIP", "تهانينا! تم ترقية حسابك إلى باقة VIP للاستفادة من خصومات وأسعار خاصة.")}
                className="text-xs bg-slate-100 hover:bg-[#C8A45C]/15 hover:text-[#C8A45C] hover:border-[#C8A45C]/40 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition-all"
              >
                + ترقية VIP
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Target Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">فئة المستهدفين</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C8A45C]/30 focus:border-[#C8A45C]"
              >
                <option value="all">📢 جميع المستخدمين (إشعار عام)</option>
                <option value="user">👤 مستخدم محدد (فردي)</option>
                <option value="vip">⭐ عملاء VIP فقط</option>
              </select>
            </div>

            {/* If Specific User */}
            {targetType === "user" && (
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">اختر المستخدم المستهدف</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      placeholder="بحث بالاسم أو البريد..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C8A45C]/30 focus:border-[#C8A45C]"
                    />
                  </div>
                  <div>
                    <select
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C8A45C]/30 focus:border-[#C8A45C]"
                    >
                      <option value="">-- اختر المستخدم ({filteredUsers.length}) --</option>
                      {filteredUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          #{u.id} - {u.username} {u.email ? `(${u.email})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">عنوان الإشعار</label>
            <input
              type="text"
              placeholder="مثال: تم شحن حسابك، أو تنبيه هام بخصوص طلبك"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C8A45C]/30 focus:border-[#C8A45C]"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              محتوى الإشعار <span className="text-rose-500">*</span>
            </label>
            <textarea
              placeholder="اكتب نص الإشعار هنا بشكل واضح ومحدد..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C8A45C]/30 focus:border-[#C8A45C]"
            />
          </div>

          {/* Alerts */}
          {err && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{err}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm flex items-center gap-2">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={busy}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#C8A45C] hover:bg-[#b5924b] text-slate-900 font-bold rounded-xl shadow-md shadow-[#C8A45C]/20 transition-all disabled:opacity-50"
            >
              <Send size={16} />
              <span>{busy ? "جاري الإرسال..." : "إرسال الإشعار الآن"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Notifications List Section */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Filter size={16} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">سجل الإشعارات والتنبيهات</h2>
              <p className="text-xs text-slate-500">عرض وتصفية جميع الإشعارات الصادرة في النظام</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative min-w-[240px]">
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث في الإشعارات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C8A45C]/30 focus:border-[#C8A45C]"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-3 bg-slate-50 border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filterType === "all"
                ? "bg-[#C8A45C] text-slate-900 shadow-xs"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            الكل ({items.length})
          </button>
          <button
            onClick={() => setFilterType("orders")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterType === "orders"
                ? "bg-[#C8A45C] text-slate-900 shadow-xs"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <ShoppingCart size={13} />
            <span>الطلبات ({stats.orders})</span>
          </button>
          <button
            onClick={() => setFilterType("deposits")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterType === "deposits"
                ? "bg-[#C8A45C] text-slate-900 shadow-xs"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Wallet size={13} />
            <span>الإيداعات ({stats.deposits})</span>
          </button>
          <button
            onClick={() => setFilterType("direct")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterType === "direct"
                ? "bg-[#C8A45C] text-slate-900 shadow-xs"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Users size={13} />
            <span>رسائل فردية ({stats.users})</span>
          </button>
          <button
            onClick={() => setFilterType("vip")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterType === "vip"
                ? "bg-[#C8A45C] text-slate-900 shadow-xs"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Crown size={13} />
            <span>عملاء VIP</span>
          </button>
        </div>

        {/* Notifications Items */}
        <div className="divide-y divide-slate-100">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <Bell size={22} />
              </div>
              <div className="text-slate-700 font-bold text-sm">لا توجد إشعارات مطابقة</div>
              <p className="text-slate-400 text-xs mt-1">
                {items.length === 0 ? "لم يتم إرسال أو تسجيل أي إشعار حتى الآن" : "جرب تغيير خيارات البحث أو التصفية"}
              </p>
            </div>
          ) : (
            filteredItems.map((n) => (
              <div
                key={n.id}
                className="p-4 sm:p-5 flex items-start gap-3.5 hover:bg-slate-50/80 transition-all group"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  {getItemIcon(n)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {n.title && (
                      <span className="font-bold text-slate-900 text-sm">{n.title}</span>
                    )}

                    {/* Target Badge */}
                    {n.targetType === "all" ? (
                      <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        📢 جميع المستخدمين
                      </span>
                    ) : n.targetType === "vip" ? (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        ⭐ عملاء VIP
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        👤 {n.targetUserName || `مستخدم #${n.targetUserId}`}
                        {n.targetDisplayId ? ` (${n.targetDisplayId})` : ""}
                      </span>
                    )}

                    <span className="text-xs text-slate-400 mr-auto">
                      {new Date(n.createdAt).toLocaleDateString("ar-EG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed break-words">{n.content}</p>
                </div>

                {/* Actions */}
                <button
                  onClick={() => remove(n.id)}
                  className="text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                  title="حذف الإشعار"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
