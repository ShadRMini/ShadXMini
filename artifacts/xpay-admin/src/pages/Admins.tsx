import { useState, useEffect } from "react";
import { get, post, put, del } from "../lib/api";
import {
  ShieldCheck,
  Plus,
  Search,
  Trash2,
  Edit3,
  User,
  Mail,
  Key,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  Lock,
  UserCheck
} from "lucide-react";

interface AdminUser {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  role: "super_admin" | "admin" | "support";
  active: boolean;
  createdAt?: string;
}

export default function Admins() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"super_admin" | "admin" | "support">("admin");
  const [active, setActive] = useState(true);

  const fetchAdmins = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await get("/admins");
      setAdmins(Array.isArray(data) ? data : data.items || []);
    } catch (err: any) {
      console.error("Error loading admins:", err);
      setError(err.message || "تعذر تحميل قائمة المشرفين");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const openCreateModal = () => {
    setEditingAdmin(null);
    setUsername("");
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("admin");
    setActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setUsername(admin.username || "");
    setFullName(admin.fullName || "");
    setEmail(admin.email || "");
    setPassword("");
    setRole(admin.role || "admin");
    setActive(admin.active ?? true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setFormError("اسم المستخدم مطلوب");
      return;
    }
    if (!editingAdmin && !password.trim()) {
      setFormError("كلمة المرور مطلوبة لإضافة مشرف جديد");
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload: any = {
      username: username.trim(),
      fullName: fullName.trim() || username.trim(),
      email: email.trim() || null,
      role,
      active,
    };

    if (password.trim()) {
      payload.password = password.trim();
    }

    try {
      if (editingAdmin) {
        await put(`/admins/${editingAdmin.id}`, payload);
      } else {
        await post("/admins", payload);
      }
      setIsModalOpen(false);
      await fetchAdmins();
    } catch (err: any) {
      console.error("Error saving admin:", err);
      setFormError(err.message || "حدث خطأ أثناء حفظ بيانات المشرف");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (admin: AdminUser) => {
    if (!window.confirm(`هل أنت متأكد من حذف المشرف "${admin.fullName || admin.username}"؟`)) {
      return;
    }

    try {
      await del(`/admins/${admin.id}`);
      await fetchAdmins();
    } catch (err: any) {
      alert(err.message || "فشل في حذف المشرف");
    }
  };

  const toggleActiveStatus = async (admin: AdminUser) => {
    try {
      await put(`/admins/${admin.id}`, { active: !admin.active });
      await fetchAdmins();
    } catch (err: any) {
      alert(err.message || "فشل في تغيير حالة التفعيل");
    }
  };

  const filteredAdmins = admins.filter((a) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (a.username && a.username.toLowerCase().includes(q)) ||
      (a.fullName && a.fullName.toLowerCase().includes(q)) ||
      (a.email && a.email.toLowerCase().includes(q))
    );
  });

  const totalAdmins = admins.length;
  const superAdminsCount = admins.filter((a) => a.role === "super_admin").length;
  const activeAdminsCount = admins.filter((a) => a.active).length;

  const getRoleBadge = (roleStr: string) => {
    switch (roleStr) {
      case "super_admin":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#C8A45C]/20 text-[#FDE68A] border border-[#C8A45C]/40">
            <ShieldCheck size={12} />
            مدير عام
          </span>
        );
      case "support":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <UserCheck size={12} />
            دعم فني
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <User size={12} />
            مشرف
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#242424] p-5 rounded-2xl border border-[#C8A45C]/20 shadow-lg">
        <div>
          <h1 className="text-2xl font-black text-[#FDE68A] flex items-center gap-2">
            <ShieldCheck className="text-[#C8A45C]" size={28} />
            إدارة المشرفين
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            إدارة الحسابات ذات الصلاحيات العالية والتحكم في أدوار المشرفين
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdmins}
            className="p-2.5 text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition border border-zinc-700 cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#C8A45C] to-[#B38F46] text-black font-bold rounded-xl hover:brightness-110 transition shadow-md cursor-pointer text-sm"
          >
            <Plus size={18} />
            إضافة مشرف جديد
          </button>
        </div>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#242424] p-4 rounded-xl border border-[#C8A45C]/15 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-zinc-400">إجمالي المشرفين</div>
            <div className="text-2xl font-bold text-white mt-1">{totalAdmins}</div>
          </div>
          <div className="p-3 bg-[#C8A45C]/10 rounded-xl text-[#C8A45C]">
            <ShieldCheck size={22} />
          </div>
        </div>

        <div className="bg-[#242424] p-4 rounded-xl border border-[#C8A45C]/15 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-zinc-400">المدراء العموم</div>
            <div className="text-2xl font-bold text-[#FDE68A] mt-1">{superAdminsCount}</div>
          </div>
          <div className="p-3 bg-[#FDE68A]/10 rounded-xl text-[#FDE68A]">
            <Key size={22} />
          </div>
        </div>

        <div className="bg-[#242424] p-4 rounded-xl border border-[#C8A45C]/15 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-zinc-400">الحسابات النشطة</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{activeAdminsCount}</div>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="bg-[#242424] p-4 rounded-2xl border border-[#C8A45C]/20 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="البحث باسم المستخدم، الاسم الكامل، أو البريد الإلكتروني..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white text-sm pr-10 pl-4 py-2.5 rounded-xl outline-none transition"
          />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchAdmins} className="underline text-xs hover:text-white">إعادة المحاولة</button>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-[#242424] rounded-2xl border border-[#C8A45C]/20 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-[#1A1A1A] text-zinc-400 border-b border-[#C8A45C]/20 font-semibold">
              <tr>
                <th className="py-3.5 px-4">المشرف</th>
                <th className="py-3.5 px-4">البريد الإلكتروني</th>
                <th className="py-3.5 px-4">الدور والتأهيل</th>
                <th className="py-3.5 px-4">الحالة</th>
                <th className="py-3.5 px-4 text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-[#C8A45C]" />
                      <span>جاري تحميل بيانات المشرفين...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    لا يوجد مشرفون مطابقون للبحث.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-zinc-800/50 transition">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C8A45C]/30 to-[#1A1A1A] border border-[#C8A45C]/40 flex items-center justify-center font-bold text-[#FDE68A]">
                          {(admin.fullName || admin.username || "A").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {admin.fullName || admin.username}
                          </div>
                          <div className="text-xs text-zinc-400">@{admin.username}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-zinc-300">
                      {admin.email ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Mail size={13} className="text-zinc-500" />
                          <span>{admin.email}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      {getRoleBadge(admin.role)}
                    </td>

                    <td className="py-4 px-4">
                      <button
                        onClick={() => toggleActiveStatus(admin)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                          admin.active
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                        }`}
                      >
                        {admin.active ? (
                          <>
                            <CheckCircle2 size={13} />
                            مفعل
                          </>
                        ) : (
                          <>
                            <XCircle size={13} />
                            معطل
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-4 px-4 text-left">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(admin)}
                          className="p-2 text-zinc-300 hover:text-[#FDE68A] hover:bg-[#C8A45C]/10 rounded-lg transition border border-transparent hover:border-[#C8A45C]/30 cursor-pointer"
                          title="تعديل المشرف"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(admin)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition border border-transparent hover:border-red-500/30 cursor-pointer"
                          title="حذف المشرف"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Admin Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#242424] border border-[#C8A45C]/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-0">
            {/* Modal Header */}
            <div className="p-5 bg-[#1A1A1A] border-b border-[#C8A45C]/20 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#FDE68A] flex items-center gap-2">
                <ShieldCheck size={20} className="text-[#C8A45C]" />
                {editingAdmin ? "تعديل بيانات المشرف" : "إضافة مشرف جديد"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl text-xs">
                  {formError}
                </div>
              )}

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  اسم المستخدم <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="مثال: admin_kasem"
                    className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white text-sm pr-9 pl-3 py-2.5 rounded-xl outline-none transition"
                  />
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  الاسم الكامل
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: قاسم العمري"
                  className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white text-sm px-3 py-2.5 rounded-xl outline-none transition"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white text-sm pr-9 pl-3 py-2.5 rounded-xl outline-none transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  كلمة المرور {editingAdmin && "(اتركها فارغة للإبقاء على الحالية)"}
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingAdmin ? "••••••••" : "كلمة السر القوية..."}
                    className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white text-sm pr-9 pl-3 py-2.5 rounded-xl outline-none transition"
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">الدور والصلاحيات</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white text-sm px-3 py-2.5 rounded-xl outline-none transition cursor-pointer"
                >
                  <option value="super_admin">مدير عام (Super Admin)</option>
                  <option value="admin">مشرف (Admin)</option>
                  <option value="support">دعم فني (Support)</option>
                </select>
              </div>

              {/* Active Switch */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-zinc-300">حالة الحساب</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C8A45C]"></div>
                  <span className="mr-3 text-xs font-medium text-zinc-300">
                    {active ? "مفعل" : "معطل"}
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-gradient-to-r from-[#C8A45C] to-[#B38F46] text-black font-bold text-xs rounded-xl hover:brightness-110 transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? "جاري الحفظ..." : editingAdmin ? "تحديث المشرف" : "إنشاء المشرف"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
