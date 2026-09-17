import React, { useEffect, useState } from "react";
import {
  Crown,
  Trophy,
  Award,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  UserCheck,
  Search,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  Save,
  X,
  Layers,
  Users,
  Percent,
  DollarSign,
  Loader2,
  ArrowLeft,
  ExternalLink
} from "lucide-react";
import { get, post, put, del, patch } from "../lib/api";
import { useToast } from "../hooks/use-toast";

interface VipLevel {
  id: number;
  name: string;
  nameAr?: string;
  name_ar?: string;
  levelOrder?: number;
  level_order?: number;
  requiredAmount?: string | number;
  required_amount?: string | number;
  discountPercent?: string | number;
  discount_percent?: string | number;
  discountFixedAmount?: string | number;
  discount_fixed_amount?: string | number;
  profitPct?: string | number;
  badgeColor?: string;
  badge_color?: string;
  badge?: string;
  benefits?: string[] | string;
  description?: string;
  hidden?: boolean;
}

interface UserItem {
  id: number;
  username: string;
  email?: string;
  vipLevel?: number;
  totalSpent?: string | number;
  balanceUsd?: string | number;
}

export default function VipMemberships() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"levels" | "users">("levels");

  // Levels state
  const [levels, setLevels] = useState<VipLevel[]>([]);
  const [loadingLevels, setLoadingLevels] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // Edit/Create Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<VipLevel | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: "",
    nameAr: "",
    name_ar: "",
    levelOrder: 1,
    level_order: 1,
    requiredAmount: "0",
    required_amount: "0",
    discountPercent: "0",
    discount_percent: "0",
    discountFixedAmount: "0",
    discount_fixed_amount: "0",
    badgeColor: "#C8A45C",
    badge_color: "#C8A45C",
    description: "",
    benefits: [] as string[],
    hidden: false,
  });
  const [benefitsList, setBenefitsList] = useState<string[]>([]);
  const [newBenefitInput, setNewBenefitInput] = useState("");

  // Users management state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [vipLevelFilter, setVipLevelFilter] = useState<number | "all">("all");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserItem | null>(null);
  const [targetVipLevel, setTargetVipLevel] = useState<number>(1);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [isSavingUserVip, setIsSavingUserVip] = useState(false);

  // Load levels
  const fetchLevels = async () => {
    try {
      setLoadingLevels(true);
      const res = await get<VipLevel[]>("/vip-memberships");
      if (Array.isArray(res)) {
        // Sort by level_order ASC
        const sorted = [...res].sort((a, b) => {
          const ordA = Number(a.level_order ?? a.levelOrder ?? a.id);
          const ordB = Number(b.level_order ?? b.levelOrder ?? b.id);
          return ordA - ordB;
        });
        setLevels(sorted);
      }
    } catch (err: any) {
      console.error("[fetchLevels Error]:", err);
      toast({
        title: "خطأ في الجلب",
        description: err.message || "فشل تحميل مستويات VIP",
        variant: "destructive",
      });
    } finally {
      setLoadingLevels(false);
    }
  };

  // Load users
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await get<any>("/users?limit=100");
      const list = res.users || res || [];
      if (Array.isArray(list)) {
        setUsers(list);
      }
    } catch (err: any) {
      console.error("[fetchUsers Error]:", err);
      toast({
        title: "خطأ في الجلب",
        description: err.message || "فشل تحميل قائمة المستخدمين",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchLevels();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (activeTab === "users" && users.length === 0) {
      fetchUsers();
    }
  }, [activeTab]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingLevel(null);
    const maxOrder = levels.length > 0 ? Math.max(...levels.map((l) => Number(l.level_order ?? l.levelOrder ?? 0))) + 1 : 1;
    setFormData({
      name: "",
      nameAr: "",
      name_ar: "",
      levelOrder: maxOrder,
      level_order: maxOrder,
      requiredAmount: "0",
      required_amount: "0",
      discountPercent: "0",
      discount_percent: "0",
      discountFixedAmount: "0",
      discount_fixed_amount: "0",
      badgeColor: "#C8A45C",
      badge_color: "#C8A45C",
      description: "",
      benefits: [],
      hidden: false,
    });
    setBenefitsList([]);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (lvl: VipLevel) => {
    setEditingLevel(lvl);
    let parsedBenefits: string[] = [];
    if (Array.isArray(lvl.benefits)) {
      parsedBenefits = lvl.benefits;
    } else if (typeof lvl.benefits === "string") {
      try {
        parsedBenefits = JSON.parse(lvl.benefits);
      } catch {
        parsedBenefits = [lvl.benefits];
      }
    }

    const nameArVal = lvl.name_ar || lvl.nameAr || "";
    const orderVal = Number(lvl.level_order ?? lvl.levelOrder ?? lvl.id);
    const reqAmtVal = String(lvl.required_amount ?? lvl.requiredAmount ?? 0);
    const discVal = String(lvl.discount_percent ?? lvl.discountPercent ?? lvl.profitPct ?? 0);
    const fixedVal = String(lvl.discount_fixed_amount ?? lvl.discountFixedAmount ?? "0");
    const colorVal = lvl.badge_color || lvl.badgeColor || lvl.badge || "#C8A45C";

    setFormData({
      name: lvl.name || "",
      nameAr: nameArVal,
      name_ar: nameArVal,
      levelOrder: orderVal,
      level_order: orderVal,
      requiredAmount: reqAmtVal,
      required_amount: reqAmtVal,
      discountPercent: discVal,
      discount_percent: discVal,
      discountFixedAmount: fixedVal,
      discount_fixed_amount: fixedVal,
      badgeColor: colorVal,
      badge_color: colorVal,
      description: lvl.description || "",
      benefits: parsedBenefits,
      hidden: Boolean(lvl.hidden),
    });
    setBenefitsList(parsedBenefits);
    setModalOpen(true);
  };

  // Add Benefit Tag
  const handleAddBenefit = () => {
    const val = newBenefitInput.trim();
    if (val) {
      const updated = [...benefitsList, val];
      setBenefitsList(updated);
      setFormData((prev) => ({ ...prev, benefits: updated }));
      setNewBenefitInput("");
    }
  };

  const handleRemoveBenefit = (index: number) => {
    const updated = benefitsList.filter((_, i) => i !== index);
    setBenefitsList(updated);
    setFormData((prev) => ({ ...prev, benefits: updated }));
  };

  // Save Level (Create or Update)
  const handleSaveLevel = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;

    const name = (formData.name || "").trim();
    const nameAr = (formData.nameAr || formData.name_ar || "").trim();

    if (!nameAr || !name) {
      toast({
        title: "بيانات ناقصة",
        description: "الرجاء إدخال اسم المستوى بالعربية والإنجليزية",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const benefits = Array.isArray(formData.benefits) && formData.benefits.length > 0
        ? formData.benefits
        : benefitsList;

      const payload = {
        name,
        nameAr,
        name_ar: nameAr,
        levelOrder: parseInt(String(formData.levelOrder ?? formData.level_order)) || 1,
        level_order: parseInt(String(formData.levelOrder ?? formData.level_order)) || 1,
        requiredAmount: String(formData.requiredAmount ?? formData.required_amount ?? 0),
        required_amount: String(formData.requiredAmount ?? formData.required_amount ?? 0),
        discountPercent: String(formData.discountPercent ?? formData.discount_percent ?? 0),
        discount_percent: String(formData.discountPercent ?? formData.discount_percent ?? 0),
        discountFixedAmount: String(formData.discountFixedAmount ?? formData.discount_fixed_amount ?? "0"),
        discount_fixed_amount: String(formData.discountFixedAmount ?? formData.discount_fixed_amount ?? "0"),
        badgeColor: formData.badgeColor || formData.badge_color || "#C8A45C",
        badge_color: formData.badgeColor || formData.badge_color || "#C8A45C",
        benefits,
        description: formData.description || "",
        hidden: Boolean(formData.hidden),
      };

      console.log("[VIP Admin] Saving level:", editingLevel ? editingLevel.id : "new", payload);

      if (editingLevel) {
        await put(`/vip-memberships/${editingLevel.id}`, payload);
        toast({ title: "تم التحديث", description: "تم تحديث المستوى بنجاح" });
      } else {
        await post("/vip-memberships", payload);
        toast({ title: "تم الإضافة", description: "تم إضافة المستوى بنجاح" });
      }

      setModalOpen(false);
      await fetchLevels();
    } catch (err: any) {
      console.error("[VIP Admin Save Error]:", err);
      toast({
        title: "خطأ بالحفظ",
        description: "فشل الحفظ: " + (err.message || "حدث خطأ غير متوقع"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Level
  const handleDeleteLevel = async (id: number, name: string) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف المستوى "${name}"؟`)) return;
    if (isDeletingId) return;

    try {
      setIsDeletingId(id);
      console.log("[VIP Admin] Deleting level ID:", id);
      await del(`/vip-memberships/${id}`);
      toast({ title: "تم الحذف", description: `تم حذف مستوى "${name}" بنجاح` });
      await fetchLevels();
    } catch (err: any) {
      console.error("[VIP Admin Delete Error]:", err);
      toast({
        title: "خطأ بالحذف",
        description: err.message || "فشل حذف المستوى. يرجى المحاولة مجدداً.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  // Reorder level up/down
  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= levels.length) return;
    if (isReordering) return;

    const newLevels = [...levels];
    const temp = newLevels[index];
    newLevels[index] = newLevels[targetIndex];
    newLevels[targetIndex] = temp;

    // Update level_order numbers
    const itemsToUpdate = newLevels.map((lvl, idx) => ({
      id: lvl.id,
      level_order: idx + 1,
    }));

    setLevels(newLevels.map((l, idx) => ({ ...l, level_order: idx + 1, levelOrder: idx + 1 })));

    try {
      setIsReordering(true);
      console.log("[VIP Admin] Reordering items:", itemsToUpdate);
      await patch("/vip-memberships/reorder", { items: itemsToUpdate });
      toast({ title: "تم الترتيب", description: "تم حفظ ترتيب المستويات الجديد بنجاح" });
    } catch (err: any) {
      console.error("[VIP Admin Reorder Error]:", err);
      toast({
        title: "خطأ بالترتيب",
        description: err.message || "فشل حفظ الترتيب الجديد",
        variant: "destructive",
      });
      await fetchLevels();
    } finally {
      setIsReordering(false);
    }
  };

  // User VIP Level Update
  const handleOpenUserVipModal = (u: UserItem) => {
    setSelectedUserForEdit(u);
    setTargetVipLevel(u.vipLevel || 1);
    setUserModalOpen(true);
  };

  const handleSaveUserVipLevel = async () => {
    if (!selectedUserForEdit || isSavingUserVip) return;
    try {
      setIsSavingUserVip(true);
      console.log("[User VIP] Updating user", selectedUserForEdit.id, "to level", targetVipLevel);
      await patch(`/users/${selectedUserForEdit.id}/vip-level`, {
        vipLevel: targetVipLevel,
      });
      toast({
        title: "تم تحديث رتبة المستخدم",
        description: `تم تغيير رتبة المستخدم ${selectedUserForEdit.username} إلى المستوى رقم ${targetVipLevel} بنجاح.`,
      });
      setUserModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      console.error("[User VIP Error]:", err);
      toast({
        title: "خطأ بالتحديث",
        description: err.message || "فشل تحديث مستوى المستخدم",
        variant: "destructive",
      });
    } finally {
      setIsSavingUserVip(false);
    }
  };

  // Filtered users search & VIP filter
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !userSearch ||
      u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      String(u.id).includes(userSearch);
    const matchesVip =
      vipLevelFilter === "all" || Number(u.vipLevel || 1) === Number(vipLevelFilter);
    return matchesSearch && matchesVip;
  });

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-[#121212] min-h-screen text-white font-sans" dir="rtl">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#C8A45C] flex items-center gap-3">
            <Crown className="w-8 h-8 text-[#C8A45C]" />
            <span>عضويات VIP ومستويات الولاء</span>
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            إدارة وتخصيص مستويات العضوية، نسبة الخصم، وشروط ترقية المستخدمين تلقائياً أو يدوياً
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="bg-gradient-to-r from-[#C8A45C] to-[#E5C178] hover:from-[#b08e46] hover:to-[#C8A45C] text-black font-extrabold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-[#C8A45C]/20 flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة مستوى VIP جديد</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 gap-2">
        <button
          onClick={() => setActiveTab("levels")}
          className={`px-5 py-3 font-bold text-sm sm:text-base border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "levels"
              ? "border-[#C8A45C] text-[#C8A45C]"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>إدارة مستويات العضوية ({levels.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`px-5 py-3 font-bold text-sm sm:text-base border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "users"
              ? "border-[#C8A45C] text-[#C8A45C]"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>تخصيص مستويات المستخدمين</span>
        </button>
      </div>

      {/* TAB 1: LEVELS MANAGEMENT */}
      {activeTab === "levels" && (
        <div className="space-y-6">

          {/* User Distribution Widget */}
          <div className="bg-[#1A1A1A] border border-[#C8A45C]/30 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-4">
            <div className="absolute top-0 left-0 w-64 h-64 bg-[#C8A45C]/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C8A45C] to-[#8A6D3B] text-black flex items-center justify-center font-bold shadow-md shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>توزيع المستخدمين على مستويات VIP</span>
                    <Sparkles className="w-4 h-4 text-[#C8A45C]" />
                  </h2>
                  <p className="text-xs text-zinc-400">
                    إحصائيات فورية لعدد الأعضاء المنتسبين لكل مستوى عضوية في المتجر
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs bg-[#121212] text-zinc-300 px-3.5 py-1.5 rounded-xl border border-zinc-800 font-bold">
                  إجمالي الأعضاء: <strong className="text-[#C8A45C] font-mono mr-1">{users.length}</strong>
                </span>
              </div>
            </div>

            {/* Distribution Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2 relative z-10">
              {levels.map((lvl) => {
                const order = Number(lvl.level_order ?? lvl.levelOrder ?? lvl.id);
                const count = users.filter((u) => Number(u.vipLevel || 1) === order).length;
                const color = lvl.badge_color || lvl.badgeColor || "#C8A45C";
                const lvlDisplayName = lvl.name_ar || lvl.nameAr
                  ? (lvl.name && lvl.name !== (lvl.name_ar || lvl.nameAr) ? `${lvl.name_ar || lvl.nameAr} (${lvl.name})` : (lvl.name_ar || lvl.nameAr))
                  : lvl.name;
                const discPct = Number(lvl.discount_percent ?? lvl.discountPercent ?? lvl.profitPct ?? 0);
                const discFixed = Number(lvl.discount_fixed_amount ?? lvl.discountFixedAmount ?? 0);
                const discountDisplay = discFixed > 0 ? `خصم $${discFixed} / وحدة` : `خصم ${discPct}%`;

                return (
                  <div
                    key={lvl.id}
                    className="bg-[#121212] border border-zinc-800 hover:border-[#C8A45C]/50 rounded-2xl p-3.5 flex flex-col justify-between transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-black font-extrabold text-xs shadow-md shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        <Crown className="w-4 h-4 text-black" />
                      </div>
                      <span className="text-[11px] font-mono font-bold text-zinc-500">
                        #{order}
                      </span>
                    </div>

                    <div className="space-y-1 my-1">
                      <h4 className="text-xs sm:text-sm font-black text-white truncate" title={lvlDisplayName}>
                        {lvlDisplayName}
                      </h4>
                      <div className="flex items-center gap-1 text-[11px] text-[#C8A45C] font-semibold">
                        <span>{discountDisplay}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
                      <div className="flex items-baseline gap-1">
                        <span className="text-base sm:text-lg font-black text-white font-mono">{count}</span>
                        <span className="text-[10px] text-zinc-500">عضو</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setVipLevelFilter(order);
                          setActiveTab("users");
                        }}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-[#C8A45C] text-zinc-300 hover:text-black text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="عرض المستخدمين في هذا المستوى"
                      >
                        <span>عرض</span>
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {loadingLevels ? (
            <div className="text-center py-16 text-[#C8A45C] space-y-3">
              <Crown className="w-10 h-10 animate-spin mx-auto" />
              <p className="text-sm">جاري تحميل مستويات VIP...</p>
            </div>
          ) : levels.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl bg-[#1A1A1A]">
              <Crown className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-zinc-300">لا توجد مستويات معرفة بعد</h3>
              <p className="text-xs text-zinc-500 mt-1 mb-4">قم بإنشاء مستويات عضوية لمنح الخصومات للعملاء</p>
              <button
                onClick={handleOpenCreate}
                className="bg-[#C8A45C] text-black font-bold px-4 py-2 rounded-xl text-xs hover:bg-[#b08e46]"
              >
                إنشاء أول مستوى
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {levels.map((lvl, index) => {
                const reqAmt = Number(lvl.required_amount ?? lvl.requiredAmount ?? 0);
                const discPct = Number(lvl.discount_percent ?? lvl.discountPercent ?? lvl.profitPct ?? 0);
                const discFixed = Number(lvl.discount_fixed_amount ?? lvl.discountFixedAmount ?? 0);
                const discountDisplay = discFixed > 0 ? `خصم $${discFixed} لكل وحدة` : `خصم ${discPct}%`;
                const color = lvl.badge_color || lvl.badgeColor || lvl.badge || "#C8A45C";
                const isHidden = Boolean(lvl.hidden);
                const order = Number(lvl.level_order ?? lvl.levelOrder ?? index + 1);
                const userCount = users.filter((u) => Number(u.vipLevel || 1) === order).length;
                const displayName = lvl.name_ar || lvl.nameAr
                  ? (lvl.name && lvl.name !== (lvl.name_ar || lvl.nameAr) ? `${lvl.name_ar || lvl.nameAr} (${lvl.name})` : (lvl.name_ar || lvl.nameAr))
                  : lvl.name;

                let parsedBenefits: string[] = [];
                if (Array.isArray(lvl.benefits)) parsedBenefits = lvl.benefits;
                else if (typeof lvl.benefits === "string") {
                  try {
                    parsedBenefits = JSON.parse(lvl.benefits);
                  } catch {
                    parsedBenefits = [lvl.benefits];
                  }
                }

                return (
                  <div
                    key={lvl.id}
                    className={`p-5 rounded-2xl border transition-all bg-[#1A1A1A]/90 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isHidden ? "border-zinc-800 opacity-60" : "border-zinc-800 hover:border-[#C8A45C]/50"
                    }`}
                  >
                    {/* Level Details */}
                    <div className="flex items-start md:items-center gap-4">
                      {/* Reorder Buttons */}
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={index === 0 || isReordering}
                          onClick={() => handleMoveOrder(index, "up")}
                          className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 disabled:opacity-30 disabled:hover:bg-zinc-800 cursor-pointer disabled:cursor-not-allowed"
                          title="تحريك لأعلى"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] font-mono text-center text-zinc-500 font-bold">
                          #{order}
                        </span>
                        <button
                          type="button"
                          disabled={index === levels.length - 1 || isReordering}
                          onClick={() => handleMoveOrder(index, "down")}
                          className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 disabled:opacity-30 disabled:hover:bg-zinc-800 cursor-pointer disabled:cursor-not-allowed"
                          title="تحريك لأسفل"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Badge Circle */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md font-bold text-black text-lg border border-white/10"
                        style={{ backgroundColor: color }}
                      >
                        <Crown className="w-6 h-6 text-black" />
                      </div>

                      {/* Details Text */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-lg text-white">{displayName}</h3>
                          <span
                            className="text-[11px] font-bold px-2.5 py-0.5 rounded-md border"
                            style={{
                              borderColor: `${color}60`,
                              backgroundColor: `${color}20`,
                              color: color,
                            }}
                          >
                            {discountDisplay}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              setVipLevelFilter(order);
                              setActiveTab("users");
                            }}
                            className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-2.5 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-all"
                            title="تصفية المستخدمين في هذا المستوى"
                          >
                            <Users className="w-3 h-3 text-[#C8A45C]" />
                            <span>{userCount} مستخدم</span>
                          </button>

                          {isHidden ? (
                            <span className="text-[10px] bg-red-950/80 text-red-400 border border-red-800 px-2 py-0.5 rounded flex items-center gap-1">
                              <EyeOff className="w-3 h-3" /> مخفي
                            </span>
                          ) : (
                            <span className="text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded flex items-center gap-1">
                              <Eye className="w-3 h-3" /> ظاهر
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-zinc-400">
                          الإنفاق المطلوب للترقية: <strong className="text-[#C8A45C] font-mono">${reqAmt}</strong>
                        </p>

                        {lvl.description && (
                          <p className="text-xs text-zinc-500 italic line-clamp-1">{lvl.description}</p>
                        )}

                        {/* Benefits Chips */}
                        {parsedBenefits.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {parsedBenefits.map((b, i) => (
                              <span
                                key={i}
                                className="text-[10px] bg-zinc-800/80 border border-zinc-700/80 text-zinc-300 px-2 py-0.5 rounded-md flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-2.5 h-2.5 text-[#C8A45C]" />
                                {b}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(lvl)}
                        className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-zinc-700 cursor-pointer shadow-sm"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-[#C8A45C]" />
                        <span>تعديل</span>
                      </button>

                      <button
                        type="button"
                        disabled={isDeletingId === lvl.id}
                        onClick={() => handleDeleteLevel(lvl.id, lvl.name)}
                        className="px-3 py-2 rounded-xl bg-red-950/50 hover:bg-red-900/80 text-red-400 hover:text-white text-xs font-bold transition-all border border-red-900/60 flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        {isDeletingId === lvl.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span>{isDeletingId === lvl.id ? "جاري الحذف..." : "حذف"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: USER VIP MANAGEMENT */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#1A1A1A] p-4 rounded-2xl border border-zinc-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute right-3.5 top-3 text-zinc-500" />
              <input
                type="text"
                placeholder="ابحث باسم المستخدم، البريد، أو المعرف..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-[#121212] border border-zinc-700 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#C8A45C]"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {vipLevelFilter !== "all" && (
                <button
                  onClick={() => setVipLevelFilter("all")}
                  className="text-xs text-[#C8A45C] hover:underline px-2"
                >
                  إلغاء التصفية
                </button>
              )}
              <button
                onClick={fetchUsers}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-2 rounded-xl border border-zinc-700 transition-all cursor-pointer"
              >
                تحديث قائمة المستخدمين
              </button>
            </div>
          </div>

          {/* Quick Filter by VIP Level */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs text-zinc-400 font-bold shrink-0">تصفية حسب المستوى:</span>
            <button
              type="button"
              onClick={() => setVipLevelFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                vipLevelFilter === "all"
                  ? "bg-[#C8A45C] text-black shadow-md shadow-[#C8A45C]/20"
                  : "bg-[#1A1A1A] text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              الكل ({users.length})
            </button>
            {levels.map((lvl) => {
              const order = Number(lvl.level_order ?? lvl.levelOrder ?? lvl.id);
              const count = users.filter((u) => Number(u.vipLevel || 1) === order).length;
              const isSelected = vipLevelFilter === order;
              const name = lvl.name_ar || lvl.name;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setVipLevelFilter(isSelected ? "all" : order)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                    isSelected
                      ? "bg-[#C8A45C] text-black border-[#C8A45C] shadow-md shadow-[#C8A45C]/20"
                      : "bg-[#1A1A1A] text-zinc-300 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: lvl.badge_color || lvl.badgeColor || "#C8A45C" }}
                  />
                  <span>{name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${isSelected ? "bg-black/20 text-black" : "bg-zinc-800 text-zinc-400"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {loadingUsers ? (
            <div className="text-center py-12 text-[#C8A45C] space-y-2">
              <Crown className="w-8 h-8 animate-spin mx-auto" />
              <p className="text-xs">جاري تحميل قائمة المستخدمين...</p>
            </div>
          ) : (
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#121212] text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-4 font-bold"># ID</th>
                      <th className="p-4 font-bold">المستخدم</th>
                      <th className="p-4 font-bold">إجمالي الإنفاق ($)</th>
                      <th className="p-4 font-bold">المستوى الحالي</th>
                      <th className="p-4 font-bold text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-zinc-500">
                          لا يوجد مستخدمين يطابقون خيارات البحث والتصفية
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const userLevelObj = levels.find((l) => Number(l.level_order ?? l.levelOrder ?? l.id) === u.vipLevel) || levels[0];
                        const levelName = userLevelObj?.name_ar || userLevelObj?.nameAr
                          ? (userLevelObj.name && userLevelObj.name !== (userLevelObj.name_ar || userLevelObj.nameAr) ? `${userLevelObj.name_ar || userLevelObj.nameAr} (${userLevelObj.name})` : (userLevelObj.name_ar || userLevelObj.nameAr))
                          : (userLevelObj?.name || `مستوى ${u.vipLevel || 1}`);
                        const badgeColor = userLevelObj?.badge_color || userLevelObj?.badgeColor || "#C8A45C";

                        return (
                          <tr key={u.id} className="hover:bg-zinc-800/40 transition-all">
                            <td className="p-4 font-mono font-bold text-zinc-400">#{u.id}</td>
                            <td className="p-4 font-bold">
                              <div>{u.username}</div>
                              {u.email && <div className="text-[11px] text-zinc-500 font-normal">{u.email}</div>}
                            </td>
                            <td className="p-4 font-mono font-bold text-[#C8A45C]">
                              ${Number(u.totalSpent || 0).toFixed(2)}
                            </td>
                            <td className="p-4">
                              <span
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border"
                                style={{
                                  backgroundColor: `${badgeColor}20`,
                                  borderColor: `${badgeColor}50`,
                                  color: badgeColor,
                                }}
                              >
                                <Crown className="w-3.5 h-3.5" />
                                {levelName}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleOpenUserVipModal(u)}
                                className="bg-[#C8A45C]/15 hover:bg-[#C8A45C] text-[#C8A45C] hover:text-black border border-[#C8A45C]/40 px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1 mx-auto cursor-pointer"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>تعديل الرتبة</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT VIP LEVEL MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-[#1A1A1A] border border-[#C8A45C]/60 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-xl font-black text-[#C8A45C] flex items-center gap-2">
                <Crown className="w-6 h-6 text-[#C8A45C]" />
                <span>{editingLevel ? "تعديل مستوى VIP" : "إضافة مستوى VIP جديد"}</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLevel} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* اسم المستوى بالعربية */}
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    الاسم بالعربية <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nameAr || formData.name_ar || ""}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value, name_ar: e.target.value })}
                    placeholder="مثال: فضي"
                    className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3.5 py-2.5 rounded-xl outline-none"
                  />
                </div>

                {/* الاسم بالإنجليزية */}
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    الاسم بالإنجليزية <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: Silver"
                    className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3.5 py-2.5 rounded-xl outline-none"
                  />
                </div>

                {/* ترتيب المستوى */}
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    ترتيب المستوى <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.levelOrder ?? formData.level_order ?? 1}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setFormData({ ...formData, levelOrder: val, level_order: val });
                    }}
                    className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3.5 py-2.5 rounded-xl outline-none"
                  />
                </div>

                {/* حد الإنفاق - مهم */}
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    حد الإنفاق (بالدولار) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.requiredAmount ?? formData.required_amount ?? 0}
                    onChange={(e) => setFormData({ ...formData, requiredAmount: e.target.value, required_amount: e.target.value })}
                    placeholder="مثال: 500"
                    className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3.5 py-2.5 rounded-xl outline-none font-mono"
                  />
                  <p className="text-xs text-zinc-500 mt-1">المبلغ الذي يجب أن ينفقه المستخدم للوصول لهذا المستوى</p>
                </div>

                {/* خصم ثابت للوحدة ($/وحدة) - النظام الجديد */}
                <div>
                  <label className="block text-[#C8A45C] font-bold mb-1">
                    خصم ثابت لكل وحدة ($) <span className="text-zinc-400 font-normal text-[11px]">(النظام المباشر)</span>
                  </label>
                  <input
                    type="number"
                    step="0.00000001"
                    min="0"
                    value={formData.discountFixedAmount ?? formData.discount_fixed_amount ?? 0}
                    onChange={(e) => setFormData({ ...formData, discountFixedAmount: e.target.value, discount_fixed_amount: e.target.value })}
                    placeholder="مثال: 0.01000000"
                    className="w-full bg-[#1A1A1A] border border-[#C8A45C]/50 focus:border-[#C8A45C] text-[#C8A45C] font-bold px-3.5 py-2.5 rounded-xl outline-none font-mono"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">مبلغ يُطرح مباشرة من سعر الوحدة (مع ضمان عدم النزول عن سعر المزود)</p>
                </div>

                {/* نسبة الخصم (%) - للتوافق */}
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    نسبة الخصم (%) <span className="text-zinc-500 font-normal text-[11px]">(اختياري)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.discountPercent ?? formData.discount_percent ?? 0}
                    onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value, discount_percent: e.target.value })}
                    placeholder="مثال: 5"
                    className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3.5 py-2.5 rounded-xl outline-none font-mono"
                  />
                  <p className="text-xs text-zinc-500 mt-1">تُطبق إذا لم يتم تحديد خصم ثابت</p>
                </div>

                {/* لون الشارة */}
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">لون الشارة</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.badgeColor || formData.badge_color || "#C8A45C"}
                      onChange={(e) => setFormData({ ...formData, badgeColor: e.target.value, badge_color: e.target.value })}
                      className="w-12 h-10 bg-[#1A1A1A] border border-zinc-700 rounded-xl cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={formData.badgeColor || formData.badge_color || "#C8A45C"}
                      onChange={(e) => setFormData({ ...formData, badgeColor: e.target.value, badge_color: e.target.value })}
                      className="flex-1 bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3.5 py-2 rounded-xl outline-none font-mono"
                    />
                  </div>
                </div>

                {/* الوصف */}
                <div className="md:col-span-2">
                  <label className="block text-zinc-300 font-semibold mb-1">الوصف</label>
                  <textarea
                    rows={2}
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="وصف مختصر للمزايا والخصومات لهذا المستوى..."
                    className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3.5 py-2.5 rounded-xl outline-none"
                  />
                </div>

                {/* المزايا */}
                <div className="md:col-span-2">
                  <label className="block text-zinc-300 font-semibold mb-1">المزايا (كل ميزة في سطر)</label>
                  <textarea
                    rows={3}
                    value={Array.isArray(formData.benefits) ? formData.benefits.join("\n") : ""}
                    onChange={(e) => {
                      const lines = e.target.value.split("\n");
                      setFormData({ ...formData, benefits: lines });
                      setBenefitsList(lines.filter(Boolean));
                    }}
                    placeholder={"خصم 10%\nتوصيل مجاني\nدعم أولوية"}
                    className="w-full bg-[#1A1A1A] border border-zinc-700 focus:border-[#C8A45C] text-white px-3.5 py-2.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Hidden Toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hidden || false}
                    onChange={(e) => setFormData({ ...formData, hidden: e.target.checked })}
                    className="w-4 h-4 rounded accent-[#C8A45C]"
                  />
                  <span className="text-zinc-300 font-bold">إخفاء هذا المستوى من المتجر العام</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-gradient-to-r from-[#C8A45C] to-[#E5C178] hover:from-[#b08e46] hover:to-[#C8A45C] text-black font-extrabold py-3 rounded-xl transition-all shadow-lg shadow-[#C8A45C]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSaving ? "جاري الحفظ..." : editingLevel ? "حفظ التغييرات" : "إنشاء المستوى"}</span>
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setModalOpen(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 px-5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* USER VIP LEVEL EDIT MODAL */}
      {userModalOpen && selectedUserForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-[#1A1A1A] border border-[#C8A45C]/60 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-black text-[#C8A45C] flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                <span>تعديل رتبة المستخدم</span>
              </h3>
              <button
                onClick={() => setUserModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[#121212] p-4 rounded-xl border border-zinc-800 space-y-1.5">
                <div className="text-zinc-400">المستخدم: <strong className="text-white">{selectedUserForEdit.username}</strong></div>
                <div className="text-zinc-400">إجمالي الإنفاق: <strong className="text-[#C8A45C] font-mono">${Number(selectedUserForEdit.totalSpent || 0).toFixed(2)}</strong></div>
                <div className="text-zinc-400">المستوى الحالي: <strong className="text-[#FDE68A]">رقم {selectedUserForEdit.vipLevel || 1}</strong></div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-zinc-300 font-bold block">اختر المستوى الجديد للمستخدم:</label>
                <select
                  value={targetVipLevel}
                  onChange={(e) => setTargetVipLevel(Number(e.target.value))}
                  className="w-full bg-[#121212] border border-zinc-700 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-[#C8A45C]"
                >
                  {levels.map((lvl) => {
                    const orderNum = Number(lvl.level_order ?? lvl.levelOrder ?? lvl.id);
                    return (
                      <option key={lvl.id} value={orderNum}>
                        المستوى #{orderNum}: {lvl.name} (خصم {lvl.discount_percent ?? lvl.discountPercent ?? 0}%)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  disabled={isSavingUserVip}
                  onClick={handleSaveUserVipLevel}
                  className="flex-1 bg-[#C8A45C] hover:bg-[#b08e46] text-black font-extrabold py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSavingUserVip ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSavingUserVip ? "جاري الحفظ..." : "تأكيد تغيير المستوى"}</span>
                </button>
                <button
                  type="button"
                  disabled={isSavingUserVip}
                  onClick={() => setUserModalOpen(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
