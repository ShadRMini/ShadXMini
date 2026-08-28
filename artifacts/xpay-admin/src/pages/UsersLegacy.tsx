import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { get, patch, post } from "../lib/api";
import {
  Users as UsersIcon,
  Search,
  ArrowRight,
  Edit2,
  Wallet,
  Bell,
  Mail,
  Shield,
  Lock,
  User as UserIcon,
  Calendar,
  Ban,
  FileSpreadsheet
} from "lucide-react";

type UserItem = {
  id: number;
  username: string;
  email?: string | null;
  telegramId?: string | null;
  balanceUsd: string | number;
  balanceSyp: string | number;
  role: string;
  banned: boolean;
  vipLevel: number;
  createdAt: string;
};

export default function UsersLegacy() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  // Modals state
  const [editModalUser, setEditModalUser] = useState<UserItem | null>(null);
  const [balanceModalUser, setBalanceModalUser] = useState<UserItem | null>(null);
  const [notifyModalUser, setNotifyModalUser] = useState<UserItem | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    username: "",
    email: "",
    role: "user",
    vipLevel: 1,
    password: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Balance form state
  const [balanceForm, setBalanceForm] = useState({
    operation: "add" as "add" | "sub",
    amount: "0.00",
    note: "",
  });
  const [savingBalance, setSavingBalance] = useState(false);

  // Notification form state
  const [notifyForm, setNotifyForm] = useState({
    title: "",
    content: "",
  });
  const [sendingNotify, setSendingNotify] = useState(false);

  const loadUsers = async (searchQuery = "") => {
    setLoading(true);
    try {
      const url = searchQuery ? `/admin/users?q=${encodeURIComponent(searchQuery)}` : "/admin/users";
      const res = await get<UserItem[]>(url);
      if (Array.isArray(res)) {
        setUsers(res);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleBan = async (user: UserItem) => {
    try {
      await patch(`/admin/users/${user.id}`, { banned: !user.banned });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, banned: !u.banned } : u))
      );
    } catch {
      alert("فشل تحديث حالة الحساب");
    }
  };

  // Open Edit Modal
  const openEditModal = (user: UserItem) => {
    setEditModalUser(user);
    setEditForm({
      username: user.username,
      email: user.email || "",
      role: user.role || "user",
      vipLevel: user.vipLevel || 1,
      password: "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editModalUser) return;
    setSavingEdit(true);
    try {
      const payload: any = {
        username: editForm.username,
        email: editForm.email || null,
        role: editForm.role,
        vipLevel: Number(editForm.vipLevel),
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }
      await patch(`/admin/users/${editModalUser.id}`, payload);
      await loadUsers(activeSearch);
      setEditModalUser(null);
    } catch (e: any) {
      alert(e?.message || "فشل تحديث بيانات المستخدم");
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Balance Modal
  const openBalanceModal = (user: UserItem) => {
    setBalanceModalUser(user);
    setBalanceForm({
      operation: "add",
      amount: "0.00",
      note: "",
    });
  };

  const handleSaveBalance = async () => {
    if (!balanceModalUser) return;
    const amt = parseFloat(balanceForm.amount);
    if (isNaN(amt) || amt <= 0) {
      alert("يرجى إدخال مبلغ صالح أكبر من صفر");
      return;
    }
    setSavingBalance(true);
    try {
      await post(`/admin/users/${balanceModalUser.id}/adjust-balance`, {
        operation: balanceForm.operation,
        amount: amt,
        currency: "USD",
        note: balanceForm.note || undefined,
      });
      await loadUsers();
      setBalanceModalUser(null);
    } catch (e: any) {
      alert(e?.message || "فشل تعديل الرصيد");
    } finally {
      setSavingBalance(false);
    }
  };

  // Open Notify Modal
  const openNotifyModal = (user: UserItem) => {
    setNotifyModalUser(user);
    setNotifyForm({
      title: "",
      content: "",
    });
  };

  const handleSendNotification = async () => {
    if (!notifyModalUser || !notifyForm.content.trim()) {
      alert("يرجى كتابة محتوى الإشعار");
      return;
    }
    setSendingNotify(true);
    try {
      await post(`/admin/users/${notifyModalUser.id}/notify`, {
        title: notifyForm.title.trim() || "إشعار من الإدارة",
        content: notifyForm.content.trim(),
      });
      alert("تم إرسال الإشعار بنجاح");
      setNotifyModalUser(null);
    } catch (e: any) {
      alert(e?.message || "فشل إرسال الإشعار");
    } finally {
      setSendingNotify(false);
    }
  };

  // Export to Excel / CSV
  const handleExportExcel = () => {
    if (users.length === 0) {
      alert("لا يوجد مستخدمون للتصدير");
      return;
    }
    const headers = ["ID", "Username", "Email", "BalanceUSD", "Role", "Banned", "CreatedAt"];
    const rows = users.map((u) => [
      u.id,
      `"${(u.username || "").replace(/"/g, '""')}"`,
      `"${(u.email || "").replace(/"/g, '""')}"`,
      Number(u.balanceUsd || 0).toFixed(2),
      u.role || "user",
      u.banned ? "Yes" : "No",
      u.createdAt ? new Date(u.createdAt).toISOString() : "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `users_backup_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-purple-600/30 text-purple-300 border-purple-500/40",
      "bg-cyan-600/30 text-cyan-300 border-cyan-500/40",
      "bg-emerald-600/30 text-emerald-300 border-emerald-500/40",
      "bg-amber-600/30 text-amber-300 border-amber-500/40",
      "bg-rose-600/30 text-rose-300 border-rose-500/40",
      "bg-blue-600/30 text-blue-300 border-blue-500/40",
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return colors[sum % colors.length];
  };

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#1e232d] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <UsersIcon size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              المستخدمين والأعضاء (الواجهة القديمة)
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              إدارة حسابات الأعضاء، الأرصدة، والصلاحيات.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold px-3.5 py-2 rounded-xl">
            العدد الإجمالي: {users.length}
          </span>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow"
          >
            <FileSpreadsheet size={15} />
            <span>نسخ احتياطي (Excel)</span>
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

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setActiveSearch(searchTerm.trim())}
            placeholder="ابحث باسم المستخدم، البريد الإلكتروني، أو الـ ID..."
            className="w-full bg-[#1e232d] border border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none transition"
          />
        </div>

        <button
          onClick={() => setActiveSearch(searchTerm.trim())}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-6 py-2.5 rounded-xl transition shadow"
        >
          بحث
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-[#1e232d] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">جاري تحميل المستخدمين...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <UsersIcon size={36} className="text-slate-600 mb-2" />
            <p className="text-sm">لا يوجد مستخدمون مطابقون</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#14171f] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5 font-semibold">ID</th>
                  <th className="px-4 py-3.5 font-semibold">المستخدم</th>
                  <th className="px-4 py-3.5 font-semibold">مستوى VIP</th>
                  <th className="px-4 py-3.5 font-semibold">الرصيد المتاح</th>
                  <th className="px-4 py-3.5 font-semibold">الصلاحية</th>
                  <th className="px-4 py-3.5 font-semibold">تاريخ التسجيل</th>
                  <th className="px-4 py-3.5 font-semibold text-center">الحالة</th>
                  <th className="px-4 py-3.5 font-semibold text-center">تحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => {
                  const initial = (u.username || "U").charAt(0).toUpperCase();
                  const avatarClasses = getAvatarColor(u.username || "U");

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3.5 font-mono text-slate-400">
                        #{u.id}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border ${avatarClasses}`}
                          >
                            {initial}
                          </div>
                          <div>
                            <div className="font-bold text-white tracking-wide">
                              {u.username}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {u.email || u.telegramId || "—"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-bold text-[#C8A45C]">
                        VIP {u.vipLevel || 1}
                      </td>

                      <td className="px-4 py-3.5 font-bold text-emerald-400 text-sm">
                        ${Number(u.balanceUsd || 0).toFixed(2)}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-lg text-[11px] font-medium">
                          <UserIcon size={12} className="text-slate-400" />
                          <span>
                            {u.role === "admin"
                              ? "مشرف"
                              : u.role === "agent"
                              ? "وكيل"
                              : "مستخدم"}
                          </span>
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-slate-500" />
                          <span>
                            {u.createdAt
                              ? new Date(u.createdAt).toISOString().split("T")[0]
                              : "—"}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => handleToggleBan(u)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            !u.banned ? "bg-emerald-500" : "bg-slate-700"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              !u.banned ? "-translate-x-1" : "-translate-x-4"
                            }`}
                          />
                        </button>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(u)}
                            className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white flex items-center justify-center transition"
                            title="تعديل بيانات المستخدم"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            onClick={() => openBalanceModal(u)}
                            className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white flex items-center justify-center transition"
                            title="إدارة الرصيد"
                          >
                            <Wallet size={13} />
                          </button>

                          <button
                            onClick={() => openNotifyModal(u)}
                            className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-white flex items-center justify-center transition"
                            title="إرسال إشعار داخلي"
                          >
                            <Bell size={13} />
                          </button>

                          <button
                            onClick={() => handleToggleBan(u)}
                            className={`w-7 h-7 rounded-lg border flex items-center justify-center transition ${
                              u.banned
                                ? "bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500 hover:text-white"
                                : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white"
                            }`}
                            title={u.banned ? "إلغاء الحظر" : "حظر المستخدم"}
                          >
                            <Ban size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Edit */}
      {editModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#1e232d] border border-purple-500/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="h-1.5 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600" />
            <div className="p-6 text-center">
              <div className="relative w-16 h-16 rounded-full bg-purple-500/20 border-2 border-purple-500 mx-auto flex items-center justify-center text-purple-300 text-2xl font-bold mb-3 shadow-lg shadow-purple-900/30">
                {(editForm.username || "U").charAt(0).toUpperCase()}
              </div>

              <h2 className="text-lg font-bold text-white">تعديل بيانات المستخدم</h2>
              <div className="space-y-3.5 text-right text-xs mt-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">اسم المستخدم</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full bg-[#14171f] border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-[#14171f] border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">نوع الحساب</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full bg-[#14171f] border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="user">مستخدم عادي</option>
                    <option value="agent">وكيل معتمد</option>
                    <option value="admin">مشرف النظام</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">مستوى VIP</label>
                  <select
                    value={editForm.vipLevel}
                    onChange={(e) => setEditForm({ ...editForm, vipLevel: Number(e.target.value) })}
                    className="w-full bg-[#14171f] border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value={1}>VIP1</option>
                    <option value={2}>VIP2</option>
                    <option value={3}>VIP3</option>
                    <option value={4}>SVIP</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5 mt-6">
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 rounded-xl transition text-xs"
                >
                  {savingEdit ? "جاري الحفظ..." : "حفظ التغييرات"}
                </button>
                <button
                  onClick={() => setEditModalUser(null)}
                  className="px-5 bg-slate-800 text-slate-300 font-medium py-2.5 rounded-xl transition text-xs border border-slate-700"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Balance */}
      {balanceModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#1e232d] border border-amber-500/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <h2 className="text-base font-bold text-white mb-2">إدارة رصيد ({balanceModalUser.username})</h2>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">نوع العملية</label>
                <select
                  value={balanceForm.operation}
                  onChange={(e) => setBalanceForm({ ...balanceForm, operation: e.target.value as any })}
                  className="w-full bg-[#14171f] border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="add">+ إضافة رصيد</option>
                  <option value="sub">- خصم رصيد</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">المبلغ ($)</label>
                <input
                  type="number"
                  value={balanceForm.amount}
                  onChange={(e) => setBalanceForm({ ...balanceForm, amount: e.target.value })}
                  className="w-full bg-[#14171f] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">ملاحظة</label>
                <input
                  type="text"
                  value={balanceForm.note}
                  onChange={(e) => setBalanceForm({ ...balanceForm, note: e.target.value })}
                  className="w-full bg-[#14171f] border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="flex gap-2.5 mt-6">
              <button
                onClick={handleSaveBalance}
                disabled={savingBalance}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold py-2.5 rounded-xl text-xs"
              >
                {savingBalance ? "جاري الحفظ..." : "تأكيد"}
              </button>
              <button
                onClick={() => setBalanceModalUser(null)}
                className="px-5 bg-slate-800 text-slate-300 font-medium py-2.5 rounded-xl text-xs"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Notify */}
      {notifyModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#1e232d] border border-cyan-500/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <h2 className="text-base font-bold text-white mb-2">إرسال إشعار لـ ({notifyModalUser.username})</h2>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">عنوان الإشعار</label>
                <input
                  type="text"
                  value={notifyForm.title}
                  onChange={(e) => setNotifyForm({ ...notifyForm, title: e.target.value })}
                  className="w-full bg-[#14171f] border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">المحتوى</label>
                <textarea
                  rows={3}
                  value={notifyForm.content}
                  onChange={(e) => setNotifyForm({ ...notifyForm, content: e.target.value })}
                  className="w-full bg-[#14171f] border border-slate-700 rounded-xl p-3 text-white resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2.5 mt-6">
              <button
                onClick={handleSendNotification}
                disabled={sendingNotify}
                className="flex-1 bg-cyan-600 text-white font-bold py-2.5 rounded-xl text-xs"
              >
                {sendingNotify ? "جاري الإرسال..." : "إرسال"}
              </button>
              <button
                onClick={() => setNotifyModalUser(null)}
                className="px-5 bg-slate-800 text-slate-300 py-2.5 rounded-xl text-xs"
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
