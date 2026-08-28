import React, { useState, useEffect, useMemo, useCallback } from "react";
import { get, post, patch, put, del } from "../lib/api";
import {
  Users,
  UserPlus,
  UserCheck,
  Wallet,
  Search,
  RotateCcw,
  FileSpreadsheet,
  Plus,
  Edit2,
  Bell,
  Trash2,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Ban,
  Shield,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  AlertTriangle,
  Send,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  CheckSquare,
  Square
} from "lucide-react";

export type UserItem = {
  id: number;
  displayId?: string;
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

export default function UsersNew() {
  // Main Data
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Filters State
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [vipFilter, setVipFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals State
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [userForm, setUserForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
    vipLevel: 1,
    banned: false
  });

  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceUser, setBalanceUser] = useState<UserItem | null>(null);
  const [savingBalance, setSavingBalance] = useState(false);
  const [balanceForm, setBalanceForm] = useState({
    operation: "add" as "add" | "sub",
    amount: "",
    note: ""
  });

  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifyUser, setNotifyUser] = useState<UserItem | null>(null);
  const [sendingNotify, setSendingNotify] = useState(false);
  const [notifyForm, setNotifyForm] = useState({
    title: "",
    content: ""
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionType: "delete_user" | "bulk_delete" | "bulk_ban" | "bulk_unban";
    targetId?: number;
  }>({
    isOpen: false,
    title: "",
    message: "",
    actionType: "delete_user"
  });

  // Auto-dismiss toast
  const showToast = useCallback((text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await get<UserItem[]>("/admin/users");
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        setUsers([]);
      }
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err?.message || "تعذر تحميل قائمة المستخدمين");
      showToast("تعذر تحميل قائمة المستخدمين", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Derived Statistics (useMemo)
  const stats = useMemo(() => {
    const total = users.length;
    
    // Users registered this month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const newThisMonth = users.filter((u) => {
      if (!u.createdAt) return false;
      const d = new Date(u.createdAt);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).length;

    // Active users
    const activeCount = users.filter((u) => !u.banned).length;

    // Total Wallet Balance ($)
    const totalBalance = users.reduce((acc, u) => acc + (Number(u.balanceUsd) || 0), 0);

    return {
      total,
      newThisMonth,
      activeCount,
      totalBalance
    };
  }, [users]);

  // Filtered Users List (useMemo)
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search
      const q = search.trim().toLowerCase();
      if (q) {
        const matchName = u.username?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchPhone = u.telegramId?.toLowerCase().includes(q);
        const matchId = String(u.id) === q || u.displayId?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchId) return false;
      }

      // Role
      if (roleFilter !== "all" && u.role !== roleFilter) return false;

      // VIP Level
      if (vipFilter !== "all" && Number(u.vipLevel) !== Number(vipFilter)) return false;

      // Status
      if (statusFilter === "active" && u.banned) return false;
      if (statusFilter === "banned" && !u.banned) return false;

      return true;
    });
  }, [users, search, roleFilter, vipFilter, statusFilter]);

  // Paginated List (useMemo)
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Reset page if filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, vipFilter, statusFilter, pageSize]);

  // Toggle Ban Optimistically
  const handleToggleBan = async (user: UserItem) => {
    const newBannedState = !user.banned;
    // Optimistic Update
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, banned: newBannedState } : u))
    );

    try {
      await patch(`/admin/users/${user.id}`, { banned: newBannedState });
      showToast(newBannedState ? "تم حظر الحساب بنجاح" : "تم إلغاء حظر الحساب بنجاح", "success");
    } catch (err: any) {
      // Rollback on failure
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, banned: user.banned } : u))
      );
      showToast(err?.message || "فشل تعديل حالة الحساب", "error");
    }
  };

  // Bulk Actions Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedUsers.map((u) => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const executeConfirmAction = async () => {
    const { actionType, targetId } = confirmModal;
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

    if (actionType === "delete_user" && targetId) {
      try {
        await del(`/admin/users/${targetId}`);
        setUsers((prev) => prev.filter((u) => u.id !== targetId));
        showToast("تم حذف المستخدم بنجاح", "success");
      } catch (err: any) {
        showToast(err?.message || "فشل حذف المستخدم", "error");
      }
    } else if (actionType === "bulk_delete") {
      try {
        await post("/admin/users/bulk-delete", { userIds: selectedIds });
        setUsers((prev) => prev.filter((u) => !selectedIds.includes(u.id)));
        setSelectedIds([]);
        showToast("تم حذف المستخدمين المحددين بنجاح", "success");
      } catch (err: any) {
        showToast(err?.message || "فشل الحذف الجماعي", "error");
      }
    } else if (actionType === "bulk_ban" || actionType === "bulk_unban") {
      const isBan = actionType === "bulk_ban";
      try {
        await post("/admin/users/bulk-ban", { userIds: selectedIds, banned: isBan });
        setUsers((prev) =>
          prev.map((u) => (selectedIds.includes(u.id) ? { ...u, banned: isBan } : u))
        );
        setSelectedIds([]);
        showToast(isBan ? "تم حظر المستخدمين بنجاح" : "تم إلغاء حظر المستخدمين بنجاح", "success");
      } catch (err: any) {
        showToast(err?.message || "فشل الإجراء الجماعي", "error");
      }
    }
  };

  // Export to Excel / CSV
  const handleExportExcel = () => {
    if (filteredUsers.length === 0) {
      showToast("لا توجد بيانات للتصدير", "error");
      return;
    }
    const headers = ["ID", "Username", "Email", "Phone", "VIP_Level", "Balance_USD", "Role", "Banned", "Created_At"];
    const rows = filteredUsers.map((u) => [
      u.id,
      `"${(u.username || "").replace(/"/g, '""')}"`,
      `"${(u.email || "").replace(/"/g, '""')}"`,
      `"${(u.telegramId || "").replace(/"/g, '""')}"`,
      `VIP${u.vipLevel || 1}`,
      Number(u.balanceUsd || 0).toFixed(2),
      u.role || "user",
      u.banned ? "Banned" : "Active",
      u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `users_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("تم تصدير ملف البيانات بنجاح", "success");
  };

  // Modals Openers
  const openCreateModal = () => {
    setEditingUser(null);
    setUserForm({
      username: "",
      email: "",
      password: "",
      role: "user",
      vipLevel: 1,
      banned: false
    });
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (user: UserItem) => {
    setEditingUser(user);
    setUserForm({
      username: user.username || "",
      email: user.email || "",
      password: "",
      role: user.role || "user",
      vipLevel: user.vipLevel || 1,
      banned: user.banned
    });
    setIsAddEditModalOpen(true);
  };

  const openBalanceModal = (user: UserItem) => {
    setBalanceUser(user);
    setBalanceForm({
      operation: "add",
      amount: "",
      note: ""
    });
    setIsBalanceModalOpen(true);
  };

  const openNotifyModal = (user: UserItem) => {
    setNotifyUser(user);
    setNotifyForm({
      title: "",
      content: ""
    });
    setIsNotifyModalOpen(true);
  };

  // Submit Save Add/Edit User
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.username.trim()) {
      showToast("اسم المستخدم مطلوب", "error");
      return;
    }
    if (!editingUser && !userForm.password.trim()) {
      showToast("كلمة المرور مطلوبة لإضافة مستخدم جديد", "error");
      return;
    }

    setSavingUser(true);
    try {
      const payload: any = {
        username: userForm.username.trim(),
        email: userForm.email.trim() || null,
        role: userForm.role,
        vipLevel: Number(userForm.vipLevel),
        banned: userForm.banned
      };

      if (userForm.password.trim()) {
        payload.password = userForm.password.trim();
      }

      if (editingUser) {
        await put(`/admin/users/${editingUser.id}`, payload);
        showToast("تم تحديث بيانات المستخدم بنجاح", "success");
      } else {
        await post("/admin/users", payload);
        showToast("تم إنشاء المستخدم بنجاح", "success");
      }

      setIsAddEditModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      showToast(err?.message || "فشل حفظ بيانات المستخدم", "error");
    } finally {
      setSavingUser(false);
    }
  };

  // Submit Save Balance
  const handleSaveBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceUser) return;
    const amt = parseFloat(balanceForm.amount);
    if (isNaN(amt) || amt <= 0) {
      showToast("يرجى إدخال مبلغ صالح أكبر من صفر", "error");
      return;
    }

    setSavingBalance(true);
    try {
      await post(`/admin/users/${balanceUser.id}/adjust-balance`, {
        operation: balanceForm.operation,
        amount: amt,
        currency: "USD",
        note: balanceForm.note || undefined
      });
      showToast("تم تعديل الرصيد بنجاح", "success");
      setIsBalanceModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      showToast(err?.message || "فشل تعديل الرصيد", "error");
    } finally {
      setSavingBalance(false);
    }
  };

  // Submit Send Notification
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyUser || !notifyForm.content.trim()) {
      showToast("يرجى كتابة تفاصيل الإشعار", "error");
      return;
    }

    setSendingNotify(true);
    try {
      await post(`/admin/users/${notifyUser.id}/notify`, {
        title: notifyForm.title.trim() || "إشعار إداري",
        content: notifyForm.content.trim()
      });
      showToast("تم إرسال الإشعار بنجاح", "success");
      setIsNotifyModalOpen(false);
    } catch (err: any) {
      showToast(err?.message || "فشل إرسال الإشعار", "error");
    } finally {
      setSendingNotify(false);
    }
  };

  // VIP Badge helper
  const getVipBadge = (level: number) => {
    switch (level) {
      case 2:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            VIP2
          </span>
        );
      case 3:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#C8A45C]/20 text-[#FDE68A] border border-[#C8A45C]/40">
            VIP3
          </span>
        );
      case 4:
      case 5:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-900/30">
            SVIP
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
            VIP1
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-zinc-100" dir="rtl">
      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl border shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-950 border-emerald-500/50 text-emerald-300"
              : "bg-red-950 border-red-500/50 text-red-300"
          }`}
        >
          {toastMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#242424] p-5 rounded-2xl border border-[#C8A45C]/20 shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-[#FDE68A] flex items-center gap-2.5">
            <Users className="text-[#C8A45C]" size={28} />
            إدارة المستخدمين
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            إدارة حسابات الأعضاء، الأرصدة، الصلاحيات، ومستويات الـ VIP الفاخرة
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#C8A45C] to-[#B38F46] text-black font-bold rounded-xl hover:brightness-110 transition shadow-lg cursor-pointer text-xs"
          >
            <Plus size={16} />
            إضافة مستخدم جديد
          </button>
        </div>
      </div>

      {/* 4 Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-[#242424] p-4.5 rounded-2xl border border-[#C8A45C]/15 hover:border-[#C8A45C]/40 transition shadow-lg flex items-center justify-between group">
          <div>
            <span className="text-xs font-semibold text-[#9CA3AF]">إجمالي المستخدمين</span>
            <div className="text-2xl font-black text-white mt-1 group-hover:text-[#FDE68A] transition">
              {stats.total}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#C8A45C]/10 border border-[#C8A45C]/30 flex items-center justify-center text-[#C8A45C] group-hover:scale-110 transition">
            <Users size={22} />
          </div>
        </div>

        {/* New Users This Month */}
        <div className="bg-[#242424] p-4.5 rounded-2xl border border-[#C8A45C]/15 hover:border-[#C8A45C]/40 transition shadow-lg flex items-center justify-between group">
          <div>
            <span className="text-xs font-semibold text-[#9CA3AF]">الجدد (هذا الشهر)</span>
            <div className="text-2xl font-black text-[#FDE68A] mt-1">
              +{stats.newThisMonth}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition">
            <UserPlus size={22} />
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-[#242424] p-4.5 rounded-2xl border border-[#C8A45C]/15 hover:border-[#C8A45C]/40 transition shadow-lg flex items-center justify-between group">
          <div>
            <span className="text-xs font-semibold text-[#9CA3AF]">المستخدمون النشطون</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {stats.activeCount}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition">
            <UserCheck size={22} />
          </div>
        </div>

        {/* Total Wallet Balance */}
        <div className="bg-[#242424] p-4.5 rounded-2xl border border-[#C8A45C]/15 hover:border-[#C8A45C]/40 transition shadow-lg flex items-center justify-between group">
          <div>
            <span className="text-xs font-semibold text-[#9CA3AF]">إجمالي أرصدة المحافظ</span>
            <div className="text-2xl font-black text-[#C8A45C] mt-1 font-mono">
              ${stats.totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition">
            <Wallet size={22} />
          </div>
        </div>
      </div>

      {/* Advanced Toolbar */}
      <div className="bg-[#242424] p-4 rounded-2xl border border-[#C8A45C]/20 shadow-lg space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Field */}
          <div className="md:col-span-5 relative">
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="البحث بالاسم، البريد الإلكتروني، المعرف ID، أو التلغرام..."
              className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white text-xs pr-10 pl-3 py-2.5 rounded-xl outline-none transition"
            />
          </div>

          {/* Role Filter */}
          <div className="md:col-span-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white text-xs px-3 py-2.5 rounded-xl outline-none transition cursor-pointer"
            >
              <option value="all">الدور: الكل</option>
              <option value="user">مستخدم عادي</option>
              <option value="agent">وكيل معتمد</option>
              <option value="admin">مشرف النظام</option>
            </select>
          </div>

          {/* VIP Level Filter */}
          <div className="md:col-span-2">
            <select
              value={vipFilter}
              onChange={(e) => setVipFilter(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white text-xs px-3 py-2.5 rounded-xl outline-none transition cursor-pointer"
            >
              <option value="all">مستوى VIP: الكل</option>
              <option value="1">VIP 1</option>
              <option value="2">VIP 2</option>
              <option value="3">VIP 3</option>
              <option value="4">SVIP</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white text-xs px-3 py-2.5 rounded-xl outline-none transition cursor-pointer"
            >
              <option value="all">الحالة: الكل</option>
              <option value="active">نشط فقط</option>
              <option value="banned">محظور فقط</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="md:col-span-1 flex items-center gap-2 justify-end">
            <button
              onClick={() => {
                setSearch("");
                setRoleFilter("all");
                setVipFilter("all");
                setStatusFilter("all");
              }}
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition border border-zinc-700 cursor-pointer"
              title="إعادة تعيين الفلاتر"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={handleExportExcel}
              className="p-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl transition cursor-pointer"
              title="تصدير إلى Excel"
            >
              <FileSpreadsheet size={16} />
            </button>
          </div>
        </div>

        {/* Bulk Action Controls if Selected */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-[#1A1A1A] border border-[#C8A45C]/30 rounded-xl animate-fadeIn">
            <span className="text-xs font-bold text-[#FDE68A]">
              تم تحديد ({selectedIds.length}) مستخدم
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setConfirmModal({
                    isOpen: true,
                    title: "تأكيد الحظر الجماعي",
                    message: `هل أنت متأكد من حظر الحسابات الـ (${selectedIds.length}) المحددة؟`,
                    actionType: "bulk_ban"
                  })
                }
                className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                حظر المحدد
              </button>
              <button
                onClick={() =>
                  setConfirmModal({
                    isOpen: true,
                    title: "تأكيد إلغاء الحظر الجماعي",
                    message: `هل أنت متأكد من إلغاء حظر الحسابات الـ (${selectedIds.length}) المحددة؟`,
                    actionType: "bulk_unban"
                  })
                }
                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                تفعيل المحدد
              </button>
              <button
                onClick={() =>
                  setConfirmModal({
                    isOpen: true,
                    title: "تأكيد الحذف الجماعي",
                    message: `تنبيه: سيتم حذف البيانات بصفة نهائية لـ (${selectedIds.length}) مستخدم. هل أنت متأكد؟`,
                    actionType: "bulk_delete"
                  })
                }
                className="px-3 py-1.5 bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                حذف المحدد
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table / Mobile Cards */}
      <div className="bg-[#242424] rounded-2xl border border-[#C8A45C]/20 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-zinc-400 space-y-3">
            <div className="w-10 h-10 border-2 border-[#C8A45C] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold">جاري تحميل بيانات المستخدمين...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Users size={40} className="mx-auto mb-3 opacity-40 text-[#C8A45C]" />
            <p className="text-sm font-bold text-zinc-400">لا يوجد مستخدمون مطابقون للبحث الحالي</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#1A1A1A] text-zinc-400 border-b border-[#C8A45C]/20 font-semibold">
                  <tr>
                    <th className="py-3.5 px-4 text-center w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === paginatedUsers.length && paginatedUsers.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-800 text-[#C8A45C] focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-4">المعرف ID</th>
                    <th className="py-3.5 px-4">المستخدم</th>
                    <th className="py-3.5 px-4">البريد الإلكتروني / هاتف</th>
                    <th className="py-3.5 px-4">مستوى VIP</th>
                    <th className="py-3.5 px-4">الرصيد المتاح</th>
                    <th className="py-3.5 px-4 text-center">الحالة</th>
                    <th className="py-3.5 px-4">تاريخ التسجيل</th>
                    <th className="py-3.5 px-4 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {paginatedUsers.map((u) => {
                    const isSelected = selectedIds.includes(u.id);
                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-zinc-800/60 transition ${
                          isSelected ? "bg-[#C8A45C]/10" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-4 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(u.id)}
                            className="rounded border-zinc-700 bg-zinc-800 text-[#C8A45C] focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* ID */}
                        <td className="py-4 px-4 font-mono font-bold text-[#FDE68A]">
                          #{u.id}
                        </td>

                        {/* User Avatar + Username */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C8A45C]/30 to-[#1A1A1A] border border-[#C8A45C]/40 flex items-center justify-center font-bold text-[#FDE68A] text-xs shadow">
                              {(u.username || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                {u.username}
                                {u.role === "admin" && (
                                  <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded border border-red-500/30">مشرف</span>
                                )}
                                {u.role === "agent" && (
                                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">وكيل</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email/Telegram */}
                        <td className="py-4 px-4 text-zinc-300 font-mono">
                          {u.email || u.telegramId || "—"}
                        </td>

                        {/* VIP */}
                        <td className="py-4 px-4">
                          {getVipBadge(u.vipLevel)}
                        </td>

                        {/* Balance */}
                        <td className="py-4 px-4 font-bold text-emerald-400 font-mono text-sm">
                          ${Number(u.balanceUsd || 0).toFixed(2)}
                        </td>

                        {/* Status Toggle Switch */}
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleToggleBan(u)}
                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors cursor-pointer ${
                              !u.banned ? "bg-emerald-500" : "bg-zinc-700"
                            }`}
                            title={u.banned ? "حساب محظور (انقر للتفعيل)" : "حساب نشط (انقر للحظر)"}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                !u.banned ? "-translate-x-1" : "-translate-x-5"
                              }`}
                            />
                          </button>
                        </td>

                        {/* Joined Date */}
                        <td className="py-4 px-4 text-zinc-400 text-[11px]">
                          {u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : "—"}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-left">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(u)}
                              className="p-1.5 text-zinc-300 hover:text-[#FDE68A] hover:bg-[#C8A45C]/10 rounded-lg transition border border-transparent hover:border-[#C8A45C]/30 cursor-pointer"
                              title="تعديل المستخدم"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => openBalanceModal(u)}
                              className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition border border-transparent hover:border-emerald-500/30 cursor-pointer"
                              title="إدارة الرصيد"
                            >
                              <Wallet size={15} />
                            </button>
                            <button
                              onClick={() => openNotifyModal(u)}
                              className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition border border-transparent hover:border-cyan-500/30 cursor-pointer"
                              title="إرسال إشعار"
                            >
                              <Bell size={15} />
                            </button>
                            <button
                              onClick={() =>
                                setConfirmModal({
                                  isOpen: true,
                                  title: "تأكيد حذف المستخدم",
                                  message: `هل أنت متأكد من حذف حساب "${u.username}" بصفة نهائية؟`,
                                  actionType: "delete_user",
                                  targetId: u.id
                                })
                              }
                              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition border border-transparent hover:border-red-500/30 cursor-pointer"
                              title="حذف المستخدم"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (< md) */}
            <div className="block md:hidden p-4 space-y-3">
              {paginatedUsers.map((u) => (
                <div
                  key={u.id}
                  className="bg-[#1A1A1A] p-4 rounded-xl border border-zinc-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C8A45C]/30 to-[#1A1A1A] border border-[#C8A45C]/40 flex items-center justify-center font-bold text-[#FDE68A] text-xs">
                        {(u.username || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{u.username}</div>
                        <div className="text-[10px] text-zinc-400">#{u.id}</div>
                      </div>
                    </div>
                    {getVipBadge(u.vipLevel)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-800">
                    <div>
                      <span className="text-zinc-500 text-[10px]">الرصيد:</span>
                      <div className="font-bold text-emerald-400 font-mono">
                        ${Number(u.balanceUsd || 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-[10px]">الحالة:</span>
                      <div>
                        <button
                          onClick={() => handleToggleBan(u)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            !u.banned ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                          }`}
                        >
                          {!u.banned ? "نشط" : "محظور"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                    <button
                      onClick={() => openEditModal(u)}
                      className="p-2 bg-zinc-800 text-zinc-300 rounded-lg text-xs"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => openBalanceModal(u)}
                      className="p-2 bg-emerald-950 text-emerald-300 rounded-lg text-xs"
                    >
                      <Wallet size={14} />
                    </button>
                    <button
                      onClick={() => openNotifyModal(u)}
                      className="p-2 bg-cyan-950 text-cyan-300 rounded-lg text-xs"
                    >
                      <Bell size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination & Controls */}
            <div className="p-4 bg-[#1A1A1A] border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
              <div className="flex items-center gap-3">
                <span>
                  عرض {Math.min((currentPage - 1) * pageSize + 1, filteredUsers.length)} -{" "}
                  {Math.min(currentPage * pageSize, filteredUsers.length)} من إجمالي {filteredUsers.length}
                </span>

                <div className="flex items-center gap-1.5">
                  <span>لكل صفحة:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-[#242424] border border-zinc-700 text-white rounded px-2 py-1 outline-none transition cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Page buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-[#242424] hover:bg-zinc-800 text-white rounded-lg border border-zinc-700 transition disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
                <span className="px-3 font-bold text-[#FDE68A]">
                  صفحة {currentPage} من {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-[#242424] hover:bg-zinc-800 text-white rounded-lg border border-zinc-700 transition disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ========================================= */}
      {/* MODAL 1: Add / Edit User */}
      {/* ========================================= */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#242424] border border-[#C8A45C]/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 bg-[#1A1A1A] border-b border-[#C8A45C]/20 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#FDE68A] flex items-center gap-2">
                <UserIcon size={18} className="text-[#C8A45C]" />
                {editingUser ? "تعديل بيانات المستخدم" : "إضافة مستخدم جديد"}
              </h2>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  اسم المستخدم <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  placeholder="مثال: ahmed_2026"
                  className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2.5 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2.5 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  كلمة المرور {editingUser && "(اتركها فارغة للإبقاء على الحالية)"}
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2.5 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">الدور والصلاحية</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2.5 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="user">مستخدم عادي</option>
                    <option value="agent">وكيل معتمد</option>
                    <option value="admin">مشرف نظام</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">مستوى VIP</label>
                  <select
                    value={userForm.vipLevel}
                    onChange={(e) => setUserForm({ ...userForm, vipLevel: Number(e.target.value) })}
                    className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3 py-2.5 rounded-xl outline-none cursor-pointer"
                  >
                    <option value={1}>VIP 1</option>
                    <option value={2}>VIP 2</option>
                    <option value={3}>VIP 3</option>
                    <option value={4}>SVIP</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-zinc-300 font-semibold">حالة الحظر</span>
                <button
                  type="button"
                  onClick={() => setUserForm({ ...userForm, banned: !userForm.banned })}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    userForm.banned ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {userForm.banned ? "محظور" : "نشط"}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition cursor-pointer font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-5 py-2 bg-gradient-to-r from-[#C8A45C] to-[#B38F46] text-black font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  {savingUser ? "جاري الحفظ..." : editingUser ? "حفظ التعديلات" : "إنشاء المستخدم"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 2: Manage Balance */}
      {/* ========================================= */}
      {isBalanceModalOpen && balanceUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#242424] border border-emerald-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 bg-[#1A1A1A] border-b border-emerald-500/20 flex items-center justify-between">
              <h2 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                <Wallet size={18} />
                إدارة الرصيد ({balanceUser.username})
              </h2>
              <button
                onClick={() => setIsBalanceModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBalance} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-[#1A1A1A] rounded-xl border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">الرصيد الحالي:</span>
                <span className="text-emerald-400 font-mono font-bold text-base">
                  ${Number(balanceUser.balanceUsd || 0).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">نوع العملية</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBalanceForm({ ...balanceForm, operation: "add" })}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      balanceForm.operation === "add"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-[#1A1A1A] border-zinc-700 text-zinc-400"
                    }`}
                  >
                    <ArrowUpRight size={14} />
                    إيداع (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBalanceForm({ ...balanceForm, operation: "sub" })}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      balanceForm.operation === "sub"
                        ? "bg-red-500/20 border-red-500 text-red-300"
                        : "bg-[#1A1A1A] border-zinc-700 text-zinc-400"
                    }`}
                  >
                    <ArrowDownLeft size={14} />
                    سحب (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">المبلغ المطلوب ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={balanceForm.amount}
                  onChange={(e) => setBalanceForm({ ...balanceForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-emerald-500 text-white px-3 py-2.5 rounded-xl outline-none font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">ملاحظة إدارية (اختياري)</label>
                <input
                  type="text"
                  value={balanceForm.note}
                  onChange={(e) => setBalanceForm({ ...balanceForm, note: e.target.value })}
                  placeholder="سبب شحن الرصيد أو الخصم..."
                  className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-emerald-500 text-white px-3 py-2.5 rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsBalanceModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingBalance}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  {savingBalance ? "جاري العملية..." : "تأكيد تعديل الرصيد"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 3: Send Notification */}
      {/* ========================================= */}
      {isNotifyModalOpen && notifyUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#242424] border border-cyan-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 bg-[#1A1A1A] border-b border-cyan-500/20 flex items-center justify-between">
              <h2 className="text-base font-bold text-cyan-400 flex items-center gap-2">
                <Bell size={18} />
                إرسال إشعار لـ ({notifyUser.username})
              </h2>
              <button
                onClick={() => setIsNotifyModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendNotification} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">عنوان الإشعار</label>
                <input
                  type="text"
                  value={notifyForm.title}
                  onChange={(e) => setNotifyForm({ ...notifyForm, title: e.target.value })}
                  placeholder="مثال: تم إيداع الرصيد بنجاح"
                  className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-cyan-500 text-white px-3 py-2.5 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">محتوى الإشعار</label>
                <textarea
                  rows={4}
                  required
                  value={notifyForm.content}
                  onChange={(e) => setNotifyForm({ ...notifyForm, content: e.target.value })}
                  placeholder="اكتب تفاصيل الإشعار هنا..."
                  className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-cyan-500 text-white p-3 rounded-xl outline-none resize-none"
                />
              </div>

              {/* Preview Box */}
              {notifyForm.content.trim() && (
                <div className="p-3 bg-[#1A1A1A] rounded-xl border border-cyan-500/20 space-y-1">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">معاينة الإشعار:</span>
                  <div className="font-bold text-white">{notifyForm.title || "إشعار إداري"}</div>
                  <div className="text-zinc-300 text-[11px] leading-relaxed">{notifyForm.content}</div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNotifyModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={sendingNotify}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send size={14} />
                  {sendingNotify ? "جاري الإرسال..." : "إرسال الإشعار"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 4: Confirmation Dialog */}
      {/* ========================================= */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#242424] border border-red-500/40 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            <h3 className="text-base font-bold text-white">{confirmModal.title}</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">{confirmModal.message}</p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl font-semibold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={executeConfirmAction}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                تأكيد الإجراء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
