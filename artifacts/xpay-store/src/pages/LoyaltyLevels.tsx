import React, { useEffect, useState } from "react";
import {
  Crown,
  Trophy,
  Award,
  Lock,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  ChevronLeft
} from "lucide-react";
import { getPublicJson } from "@/lib/public-api";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface LevelItem {
  id: number;
  name: string;
  name_ar?: string;
  nameAr?: string;
  level_order?: number;
  levelOrder?: number;
  required_amount?: number;
  requiredAmount?: number;
  requiredSpent?: number;
  discount_percent?: number;
  discountPercent?: number;
  discount_fixed_amount?: string | number;
  discountFixedAmount?: string | number;
  badge_color?: string;
  badgeColor?: string;
  benefits?: string[] | string;
  description?: string;
  hidden?: boolean;
}

interface LoyaltyData {
  currentLevel: LevelItem;
  totalSpent: number;
  nextLevel: LevelItem | null;
  progressPercent: number;
  amountToNextLevel?: number;
  amountRemaining?: number;
  allLevels?: LevelItem[];
  levels?: LevelItem[];
}

const DEFAULT_LEVELS: LevelItem[] = [
  { id: 1, name: "Pro", name_ar: "بروتو", nameAr: "بروتو", level_order: 1, levelOrder: 1, required_amount: 0, requiredAmount: 0, discount_percent: 0, discountPercent: 0, discount_fixed_amount: "0.00000000", discountFixedAmount: "0.00000000", badge_color: "#9CA3AF", badgeColor: "#9CA3AF", benefits: ["مستوى أساسي", "لا خصومات"], description: "المستوى الأساسي لجميع المستخدمين الجدد", hidden: false },
  { id: 2, name: "Silver", name_ar: "فضي", nameAr: "فضي", level_order: 2, levelOrder: 2, required_amount: 300, requiredAmount: 300, discount_percent: 5, discountPercent: 5, discount_fixed_amount: "0.01000000", discountFixedAmount: "0.01000000", badge_color: "#C0C0C0", badgeColor: "#C0C0C0", benefits: ["خصم $0.01 للوحدة", "دعم أولوية"], description: "مستوى فضي مع خصومات ومزايا إضافية", hidden: false },
  { id: 3, name: "Gold", name_ar: "ذهبي", nameAr: "ذهبي", level_order: 3, levelOrder: 3, required_amount: 500, requiredAmount: 500, discount_percent: 10, discountPercent: 10, discount_fixed_amount: "0.02000000", discountFixedAmount: "0.02000000", badge_color: "#C8A45C", badgeColor: "#C8A45C", benefits: ["خصم $0.02 للوحدة", "توصيل مجاني", "دعم أولوية"], description: "مستوى ذهبي مع خصومات ومزايا مميزة", hidden: false },
  { id: 4, name: "Diamond", name_ar: "ماسي", nameAr: "ماسي", level_order: 4, levelOrder: 4, required_amount: 1000, requiredAmount: 1000, discount_percent: 15, discountPercent: 15, discount_fixed_amount: "0.03000000", discountFixedAmount: "0.03000000", badge_color: "#60A5FA", badgeColor: "#60A5FA", benefits: ["خصم $0.03 للوحدة", "توصيل مجاني", "دعم مباشر", "هدايا شهرية"], description: "مستوى ماسي مع خصومات ومزايا حصرية", hidden: false },
  { id: 5, name: "VIP", name_ar: "VIP", nameAr: "VIP", level_order: 5, levelOrder: 5, required_amount: 2500, requiredAmount: 2500, discount_percent: 20, discountPercent: 20, discount_fixed_amount: "0.04000000", discountFixedAmount: "0.04000000", badge_color: "#A855F7", badgeColor: "#A855F7", benefits: ["خصم $0.04 للوحدة", "كل المزايا السابقة", "مدير حساب مخصص", "دخول مبكر للعروض"], description: "مستوى VIP مع كل المزايا الحصرية", hidden: false },
];

export default function LoyaltyLevels() {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLoyaltyData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      let fetchedData: LoyaltyData | null = null;

      // 1. Try personal loyalty details first
      try {
        const res = await getPublicJson<LoyaltyData>("/me/vip-details");
        if (res && (res.allLevels?.length || res.levels?.length || res.currentLevel)) {
          fetchedData = res;
        }
      } catch {
        // Continue to fallback
      }

      // 2. Try alternate /me/loyalty endpoint
      if (!fetchedData) {
        try {
          const fallback = await getPublicJson<LoyaltyData>("/me/loyalty");
          if (fallback && (fallback.allLevels?.length || fallback.levels?.length || fallback.currentLevel)) {
            fetchedData = fallback;
          }
        } catch {
          // Continue to fallback
        }
      }

      // 3. Try public levels endpoint if guest or visitor
      if (!fetchedData) {
        try {
          const publicLevels = await getPublicJson<LevelItem[]>("/public/vip-memberships");
          if (Array.isArray(publicLevels) && publicLevels.length > 0) {
            fetchedData = {
              currentLevel: publicLevels[0],
              totalSpent: 0,
              nextLevel: publicLevels[1] || null,
              progressPercent: 0,
              amountToNextLevel: Number(publicLevels[1]?.required_amount ?? publicLevels[1]?.requiredAmount ?? 300),
              allLevels: publicLevels,
              levels: publicLevels,
            };
          }
        } catch {
          // Continue to local fallback
        }
      }

      // 4. Default static fallback to guarantee page always renders cleanly
      if (!fetchedData) {
        fetchedData = {
          currentLevel: DEFAULT_LEVELS[0],
          totalSpent: 0,
          nextLevel: DEFAULT_LEVELS[1],
          progressPercent: 0,
          amountToNextLevel: 300,
          allLevels: DEFAULT_LEVELS,
          levels: DEFAULT_LEVELS,
        };
      }

      setData(fetchedData);
      if (isManual) {
        toast.success("تم تحديث بيانات المستويات");
      }
    } catch (err: any) {
      console.error("[fetchLoyaltyData Error]:", err);
      setData({
        currentLevel: DEFAULT_LEVELS[0],
        totalSpent: 0,
        nextLevel: DEFAULT_LEVELS[1],
        progressPercent: 0,
        amountToNextLevel: 300,
        allLevels: DEFAULT_LEVELS,
        levels: DEFAULT_LEVELS,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLoyaltyData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center bg-[#1A1A1A] text-[#C8A45C] p-6" dir="rtl">
        <div className="w-14 h-14 rounded-2xl bg-[#2D2D2D] border border-[#C8A45C]/40 flex items-center justify-center shadow-xl mb-4 animate-pulse">
          <Crown className="w-7 h-7 text-[#C8A45C]" />
        </div>
        <p className="text-sm font-bold text-[#9CA3AF]">جاري تحميل مستويات العضوية والخصومات...</p>
      </div>
    );
  }

  const currentLvl = data?.currentLevel;
  const currentLevelOrder = currentLvl?.level_order ?? currentLvl?.levelOrder ?? currentLvl?.id ?? 1;
  const currentLevelName = currentLvl?.name_ar || currentLvl?.nameAr
    ? (currentLvl.name && currentLvl.name !== (currentLvl.name_ar || currentLvl.nameAr) ? `${currentLvl.name_ar || currentLvl.nameAr} (${currentLvl.name})` : (currentLvl.name_ar || currentLvl.nameAr))
    : (currentLvl?.name || "المستوى الأساسي");
  const currentDiscount = currentLvl?.discount_percent ?? currentLvl?.discountPercent ?? 0;
  const currentFixedDiscount = Number(currentLvl?.discount_fixed_amount ?? currentLvl?.discountFixedAmount ?? 0);
  const badgeColor = currentLvl?.badge_color || currentLvl?.badgeColor || "#C8A45C";

  const totalSpent = data?.totalSpent || 0;
  const levels = data?.allLevels || data?.levels || [];
  const nextLvl = data?.nextLevel;
  const progressPercent = data?.progressPercent ?? 100;
  const amountToNext = data?.amountToNextLevel ?? data?.amountRemaining ?? 0;

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#E5E7EB] px-4 sm:px-6 pt-5 pb-24 font-sans animate-in fade-in duration-300" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Top Header Card */}
        <div className="bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="absolute top-0 left-0 w-48 h-48 bg-[var(--theme-primary)]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--theme-primary)] text-black flex items-center justify-center shadow-lg shrink-0">
              <Crown className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[var(--theme-primary)] tracking-wide">
                  المستويات والعضويات
                </h1>
                <Sparkles className="w-4 h-4 text-[var(--theme-primary)]" />
              </div>
              <p className="text-xs text-[var(--theme-text-muted)] mt-1 leading-relaxed">
                ارتقِ بمستواك مع كل عملية شراء واستمتع بخصومات حصرية لكبار العملاء VIP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center relative z-10">
            <button
              type="button"
              onClick={() => fetchLoyaltyData(true)}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl bg-[var(--theme-background)] hover:bg-[var(--theme-input-bg)] text-[var(--theme-text-muted)] hover:text-[var(--theme-primary)] text-xs font-bold border border-[var(--theme-border)] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[var(--theme-primary)]" : ""}`} />
              <span>تحديث</span>
            </button>
            <button
              type="button"
              onClick={() => setLocation("/profile")}
              className="px-3.5 py-2 rounded-xl bg-[var(--theme-background)] hover:bg-[var(--theme-input-bg)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] text-xs font-bold border border-[var(--theme-border)] transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>الملف الشخصي</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Current Level Hero Card */}
        <div className="rounded-3xl border border-[var(--theme-primary)]/50 bg-[var(--theme-card)] p-6 sm:p-7 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-44 h-44 bg-[var(--theme-primary)]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-6 relative z-10">
            {/* Level Identification & Key Numbers */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--theme-border)] pb-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--theme-text-muted)]">مستواك الحالي في المتجر</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] border border-[var(--theme-primary)]/40 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> مفعّل
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-black font-extrabold shadow-md border border-white/20 shrink-0"
                    style={{ backgroundColor: badgeColor }}
                  >
                    <Crown className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-black text-[var(--theme-text-primary)]">{currentLevelName}</h2>
                </div>
              </div>

              {/* Badges: Discount & Total Spent */}
              <div className="flex items-center gap-4 bg-[var(--theme-background)] px-4 py-3 rounded-2xl border border-[var(--theme-border)] self-start sm:self-center shadow-inner">
                <div className="text-right">
                  <span className="text-[10px] text-[var(--theme-text-muted)] block font-bold">
                    {currentFixedDiscount > 0 ? "خصم الوحدة" : "نسبة الخصم"}
                  </span>
                  <span className="text-xl font-black text-[var(--theme-primary)] font-mono">
                    {currentFixedDiscount > 0 ? `$${currentFixedDiscount}` : `${currentDiscount}%`}
                  </span>
                </div>
                <div className="h-8 w-[1px] bg-[var(--theme-border)]" />
                <div className="text-right">
                  <span className="text-[10px] text-[var(--theme-text-muted)] block font-bold">إجمالي الإنفاق</span>
                  <span className="text-base font-black text-[var(--theme-text-primary)] font-mono">${totalSpent.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {currentLvl?.description && (
              <p className="text-xs text-[var(--theme-text-muted)] leading-relaxed bg-[var(--theme-background)] p-3 rounded-xl border border-[var(--theme-border)]">
                {currentLvl.description}
              </p>
            )}

            {/* Progress to Next Level */}
            {nextLvl ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[var(--theme-text-secondary)] flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-[var(--theme-primary)]" />
                    <span>التقدم نحو المستوى التالي ({nextLvl.name})</span>
                  </span>
                  <span className="font-mono text-[var(--theme-primary)]">
                    ${totalSpent.toFixed(2)} / ${(nextLvl.required_amount ?? nextLvl.requiredAmount ?? nextLvl.requiredSpent ?? 0).toFixed(2)}
                  </span>
                </div>

                {/* Progress Track */}
                <div className="w-full bg-[var(--theme-input-bg)] h-3.5 rounded-full overflow-hidden p-0.5 border border-[var(--theme-border)] shadow-inner">
                  <div
                    className="bg-[var(--theme-primary)] h-full rounded-full transition-all duration-700 shadow-md shadow-[var(--theme-primary)]/30"
                    style={{ width: `${Math.min(100, Math.max(4, progressPercent))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[var(--theme-text-muted)]">
                  <span>نسبة الإنجاز: <strong className="text-[var(--theme-text-primary)] font-mono">{progressPercent}%</strong></span>
                  <span>
                    متبقي <strong className="text-[var(--theme-primary)] font-mono font-extrabold">${amountToNext.toFixed(2)}</strong> للوصول إلى {nextLvl.name}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/30 rounded-2xl text-center text-xs text-[var(--theme-primary)] font-bold flex items-center justify-center gap-2 shadow-sm">
                <Sparkles className="w-4 h-4" />
                <span>تهانينا! لقد وصلت إلى أعلى مستوى في نظام كبار العملاء VIP في المتجر.</span>
              </div>
            )}
          </div>
        </div>

        {/* Levels List Section Header */}
        <div className="pt-2 flex items-center justify-between">
          <h2 className="text-lg font-black text-[var(--theme-primary)] flex items-center gap-2">
            <Award className="w-5 h-5" />
            <span>كافة مستويات المنصة والمزايا</span>
          </h2>
          <span className="text-xs text-[var(--theme-text-muted)] font-bold bg-[var(--theme-card)] px-3 py-1 rounded-xl border border-[var(--theme-border)]">
            {levels.length} مستويات متاحة
          </span>
        </div>

        {/* Levels List Cards */}
        <div className="space-y-3.5">
          {levels.map((lvl) => {
            const reqAmt = Number(lvl.required_amount ?? lvl.requiredAmount ?? lvl.requiredSpent ?? 0);
            const discPct = Number(lvl.discount_percent ?? lvl.discountPercent ?? 0);
            const discFixed = Number(lvl.discount_fixed_amount ?? lvl.discountFixedAmount ?? 0);
            const orderNum = Number(lvl.level_order ?? lvl.levelOrder ?? lvl.id);
            const color = lvl.badge_color || lvl.badgeColor || "var(--theme-primary)";

            const isCurrent = orderNum === currentLevelOrder || lvl.id === currentLvl?.id;
            const isUnlocked = totalSpent >= reqAmt || isCurrent;

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
                className={`rounded-2xl p-5 sm:p-6 transition-all relative overflow-hidden border ${
                  isCurrent
                    ? "bg-[var(--theme-card)] border-2 border-[var(--theme-primary)] shadow-xl shadow-[var(--theme-primary)]/15 ring-1 ring-[var(--theme-primary)]/40"
                    : isUnlocked
                    ? "bg-[var(--theme-card)] border border-emerald-500/40 hover:border-emerald-500/70"
                    : "bg-[var(--theme-card)] border border-[var(--theme-border)] hover:border-[var(--theme-border)] opacity-80"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                  {/* Left: Icon & Title & Benefits */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner transition-all ${
                        isCurrent
                          ? "bg-[var(--theme-primary)]/20 border-[var(--theme-primary)] text-[var(--theme-primary)]"
                          : isUnlocked
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                          : "bg-[var(--theme-background)] border-[var(--theme-border)] text-[var(--theme-text-muted)]"
                      }`}
                    >
                      {isCurrent ? (
                        <Crown className="w-6 h-6 animate-pulse" />
                      ) : isUnlocked ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <Lock className="w-5 h-5" />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-black text-lg ${isCurrent ? "text-[var(--theme-primary)]" : "text-[var(--theme-text-primary)]"}`}>
                          {lvl.name_ar || lvl.nameAr
                            ? (lvl.name && lvl.name !== (lvl.name_ar || lvl.nameAr) ? `${lvl.name_ar || lvl.nameAr} (${lvl.name})` : (lvl.name_ar || lvl.nameAr))
                            : lvl.name}
                        </h3>

                        {isCurrent && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[var(--theme-primary)] text-black font-extrabold flex items-center gap-1 shadow-sm">
                            <Sparkles className="w-3 h-3" /> مستواك الحالي
                          </span>
                        )}

                        {isUnlocked && !isCurrent && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                            مكتمل
                          </span>
                        )}

                        {!isUnlocked && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--theme-background)] text-[var(--theme-text-muted)] border border-[var(--theme-border)] font-medium">
                            مستوى مغلق
                          </span>
                        )}
                      </div>

                      {lvl.description && (
                        <p className="text-xs text-[var(--theme-text-muted)] leading-relaxed">{lvl.description}</p>
                      )}

                      {/* Benefits Checklist */}
                      {parsedBenefits.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1.5">
                          {parsedBenefits.map((benefit, i) => (
                            <span
                              key={i}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                                isCurrent
                                  ? "bg-[var(--theme-background)] border-[var(--theme-primary)]/40 text-[var(--theme-primary)]"
                                  : "bg-[var(--theme-background)] border-[var(--theme-border)] text-[var(--theme-text-muted)]"
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3 text-[var(--theme-primary)]" />
                              {benefit}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Requirements & Discount */}
                  <div className="sm:text-left flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-[var(--theme-border)] pt-3 sm:pt-0 shrink-0 gap-2">
                    <div className="text-right sm:text-left">
                      <span className="text-[10px] text-[var(--theme-text-muted)] block font-bold">حد الإنفاق المطلوب</span>
                      <span className={`text-base sm:text-lg font-black font-mono ${isCurrent ? "text-[var(--theme-primary)]" : "text-[var(--theme-text-primary)]"}`}>
                        ${reqAmt.toFixed(2)}
                      </span>
                    </div>

                    <div className="text-left sm:mt-1">
                      <span className="text-[10px] text-[var(--theme-text-muted)] block font-bold">
                        {discFixed > 0 ? "خصم الوحدة" : "نسبة الخصم"}
                      </span>
                      <span className="inline-block text-xs sm:text-sm font-black text-[var(--theme-primary)] bg-[var(--theme-primary)]/15 px-2.5 py-0.5 rounded-lg border border-[var(--theme-primary)]/30 font-mono">
                        {discFixed > 0 ? `$${discFixed}` : `${Number(discPct).toFixed(0)}%`}
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
