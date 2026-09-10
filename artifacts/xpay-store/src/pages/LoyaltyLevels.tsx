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
  level_order?: number;
  levelOrder?: number;
  required_amount?: number;
  requiredAmount?: number;
  requiredSpent?: number;
  discount_percent?: number;
  discountPercent?: number;
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

export default function LoyaltyLevels() {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLoyaltyData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const res = await getPublicJson<LoyaltyData>("/me/vip-details");
      if (res) {
        setData(res);
      } else {
        const fallback = await getPublicJson<LoyaltyData>("/me/loyalty");
        if (fallback) setData(fallback);
      }
      if (isManual) {
        toast.success("تم تحديث بيانات المستويات");
      }
    } catch (err: any) {
      console.error("[fetchLoyaltyData Error]:", err);
      toast.error("فشل تحميل بيانات مستويات الولاء والعضوية");
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
  const currentLevelName = currentLvl?.name || "المستوى الأساسي";
  const currentDiscount = currentLvl?.discount_percent ?? currentLvl?.discountPercent ?? 0;
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
        <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="absolute top-0 left-0 w-48 h-48 bg-[#C8A45C]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#C8A45C] to-[#8A6D3B] text-black flex items-center justify-center shadow-lg shrink-0">
              <Crown className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#C8A45C] tracking-wide">
                  المستويات والعضويات
                </h1>
                <Sparkles className="w-4 h-4 text-[#C8A45C]" />
              </div>
              <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
                ارتقِ بمستواك مع كل عملية شراء واستمتع بخصومات حصرية لكبار العملاء VIP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center relative z-10">
            <button
              type="button"
              onClick={() => fetchLoyaltyData(true)}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#3D3D3D] text-[#9CA3AF] hover:text-[#C8A45C] text-xs font-bold border border-[#3D3D3D] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#C8A45C]" : ""}`} />
              <span>تحديث</span>
            </button>
            <button
              type="button"
              onClick={() => setLocation("/profile")}
              className="px-3.5 py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#3D3D3D] text-[#9CA3AF] hover:text-white text-xs font-bold border border-[#3D3D3D] transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>الملف الشخصي</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Current Level Hero Card */}
        <div className="rounded-3xl border border-[#C8A45C]/50 bg-[#2D2D2D] p-6 sm:p-7 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-44 h-44 bg-[#C8A45C]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-6 relative z-10">
            {/* Level Identification & Key Numbers */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3D3D3D] pb-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#9CA3AF]">مستواك الحالي في المتجر</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#C8A45C]/20 text-[#C8A45C] border border-[#C8A45C]/40 flex items-center gap-1">
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
                  <h2 className="text-2xl font-black text-white">{currentLevelName}</h2>
                </div>
              </div>

              {/* Badges: Discount & Total Spent */}
              <div className="flex items-center gap-4 bg-[#1A1A1A] px-4 py-3 rounded-2xl border border-[#3D3D3D] self-start sm:self-center shadow-inner">
                <div className="text-right">
                  <span className="text-[10px] text-[#9CA3AF] block font-bold">نسبة الخصم</span>
                  <span className="text-xl font-black text-[#C8A45C] font-mono">{currentDiscount}%</span>
                </div>
                <div className="h-8 w-[1px] bg-[#3D3D3D]" />
                <div className="text-right">
                  <span className="text-[10px] text-[#9CA3AF] block font-bold">إجمالي الإنفاق</span>
                  <span className="text-base font-black text-white font-mono">${totalSpent.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {currentLvl?.description && (
              <p className="text-xs text-[#9CA3AF] leading-relaxed bg-[#1A1A1A] p-3 rounded-xl border border-[#3D3D3D]">
                {currentLvl.description}
              </p>
            )}

            {/* Progress to Next Level */}
            {nextLvl ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#E5E7EB] flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-[#C8A45C]" />
                    <span>التقدم نحو المستوى التالي ({nextLvl.name})</span>
                  </span>
                  <span className="font-mono text-[#C8A45C]">
                    ${totalSpent.toFixed(2)} / ${(nextLvl.required_amount ?? nextLvl.requiredAmount ?? nextLvl.requiredSpent ?? 0).toFixed(2)}
                  </span>
                </div>

                {/* Progress Track */}
                <div className="w-full bg-[#3D3D3D] h-3.5 rounded-full overflow-hidden p-0.5 border border-[#4B4B4B] shadow-inner">
                  <div
                    className="bg-gradient-to-r from-[#C8A45C] via-[#E5C178] to-[#C8A45C] h-full rounded-full transition-all duration-700 shadow-md shadow-[#C8A45C]/30"
                    style={{ width: `${Math.min(100, Math.max(4, progressPercent))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#9CA3AF]">
                  <span>نسبة الإنجاز: <strong className="text-white font-mono">{progressPercent}%</strong></span>
                  <span>
                    متبقي <strong className="text-[#C8A45C] font-mono font-extrabold">${amountToNext.toFixed(2)}</strong> للوصول إلى {nextLvl.name}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-[#C8A45C]/10 border border-[#C8A45C]/30 rounded-2xl text-center text-xs text-[#C8A45C] font-bold flex items-center justify-center gap-2 shadow-sm">
                <Sparkles className="w-4 h-4" />
                <span>تهانينا! لقد وصلت إلى أعلى مستوى في نظام كبار العملاء VIP في المتجر.</span>
              </div>
            )}
          </div>
        </div>

        {/* Levels List Section Header */}
        <div className="pt-2 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#C8A45C] flex items-center gap-2">
            <Award className="w-5 h-5" />
            <span>كافة مستويات المنصة والمزايا</span>
          </h2>
          <span className="text-xs text-[#9CA3AF] font-bold bg-[#2D2D2D] px-3 py-1 rounded-xl border border-[#3D3D3D]">
            {levels.length} مستويات متاحة
          </span>
        </div>

        {/* Levels List Cards */}
        <div className="space-y-3.5">
          {levels.map((lvl) => {
            const reqAmt = Number(lvl.required_amount ?? lvl.requiredAmount ?? lvl.requiredSpent ?? 0);
            const discPct = Number(lvl.discount_percent ?? lvl.discountPercent ?? 0);
            const orderNum = Number(lvl.level_order ?? lvl.levelOrder ?? lvl.id);
            const color = lvl.badge_color || lvl.badgeColor || "#C8A45C";

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
                    ? "bg-[#2D2D2D] border-2 border-[#C8A45C] shadow-xl shadow-[#C8A45C]/15 ring-1 ring-[#C8A45C]/40"
                    : isUnlocked
                    ? "bg-[#2D2D2D] border border-emerald-500/40 hover:border-emerald-500/70"
                    : "bg-[#2D2D2D] border border-[#3D3D3D] hover:border-[#4B4B4B] opacity-80"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                  {/* Left: Icon & Title & Benefits */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner transition-all ${
                        isCurrent
                          ? "bg-[#C8A45C]/20 border-[#C8A45C] text-[#C8A45C]"
                          : isUnlocked
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                          : "bg-[#1A1A1A] border-[#3D3D3D] text-[#9CA3AF]"
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
                        <h3 className={`font-black text-lg ${isCurrent ? "text-[#C8A45C]" : "text-white"}`}>
                          {lvl.name}
                        </h3>

                        {isCurrent && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#C8A45C] text-black font-extrabold flex items-center gap-1 shadow-sm">
                            <Sparkles className="w-3 h-3" /> مستواك الحالي
                          </span>
                        )}

                        {isUnlocked && !isCurrent && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                            مكتمل
                          </span>
                        )}

                        {!isUnlocked && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1A1A1A] text-[#9CA3AF] border border-[#3D3D3D] font-medium">
                            مستوى مغلق
                          </span>
                        )}
                      </div>

                      {lvl.description && (
                        <p className="text-xs text-[#9CA3AF] leading-relaxed">{lvl.description}</p>
                      )}

                      {/* Benefits Checklist */}
                      {parsedBenefits.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1.5">
                          {parsedBenefits.map((benefit, i) => (
                            <span
                              key={i}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                                isCurrent
                                  ? "bg-[#1A1A1A] border-[#C8A45C]/40 text-[#C8A45C]"
                                  : "bg-[#1A1A1A] border-[#3D3D3D] text-[#9CA3AF]"
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3 text-[#C8A45C]" />
                              {benefit}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Requirements & Discount */}
                  <div className="sm:text-left flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-[#3D3D3D] pt-3 sm:pt-0 shrink-0">
                    <div className="text-right sm:text-left">
                      <span className="text-[10px] text-[#9CA3AF] block font-bold">حد الإنفاق المطلوب</span>
                      <span className={`text-base sm:text-lg font-black font-mono ${isCurrent ? "text-[#C8A45C]" : "text-white"}`}>
                        ${reqAmt.toFixed(0)}
                      </span>
                    </div>

                    <div className="text-left sm:mt-2">
                      <span className="text-[10px] text-[#9CA3AF] block font-bold">نسبة الخصم</span>
                      <span className="text-xs sm:text-sm font-black text-[#C8A45C] bg-[#C8A45C]/15 px-2.5 py-0.5 rounded-lg border border-[#C8A45C]/30">
                        {discPct}%
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
