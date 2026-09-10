import React, { useEffect, useState } from "react";
import { Crown, Trophy, Award, Lock, CheckCircle2, ChevronRight, Star, Gem, Sparkles, Shield, ArrowUpRight } from "lucide-react";
import { getPublicJson } from "@/lib/public-api";
import { toast } from "sonner";

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
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLoyaltyData = async () => {
    try {
      setLoading(true);
      const res = await getPublicJson<LoyaltyData>("/me/vip-details");
      if (res) {
        setData(res);
      } else {
        const fallback = await getPublicJson<LoyaltyData>("/me/loyalty");
        if (fallback) setData(fallback);
      }
    } catch {
      toast.error("فشل تحميل بيانات مستويات الولاء والعضوية");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoyaltyData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center bg-[#121212] text-[#C8A45C]" dir="rtl">
        <div className="text-center space-y-3">
          <Crown className="w-12 h-12 animate-bounce mx-auto text-[#C8A45C]" />
          <p className="text-sm font-bold text-zinc-400">جاري تحميل مستويات العضوية والخصومات...</p>
        </div>
      </div>
    );
  }

  const currentLvl = data?.currentLevel;
  const currentLevelOrder = currentLvl?.level_order ?? currentLvl?.levelOrder ?? currentLvl?.id ?? 1;
  const currentLevelName = currentLvl?.name || "بروتو (Pro)";
  const currentDiscount = currentLvl?.discount_percent ?? currentLvl?.discountPercent ?? 0;
  const badgeColor = currentLvl?.badge_color || currentLvl?.badgeColor || "#C8A45C";

  const totalSpent = data?.totalSpent || 0;
  const levels = data?.allLevels || data?.levels || [];
  const nextLvl = data?.nextLevel;
  const progressPercent = data?.progressPercent ?? 100;
  const amountToNext = data?.amountToNextLevel ?? data?.amountRemaining ?? 0;

  return (
    <div className="min-h-screen bg-[#121212] text-white pb-20 px-4 sm:px-6 pt-6 font-sans" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="text-center space-y-2.5 py-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-b from-[#C8A45C]/20 to-[#C8A45C]/5 border border-[#C8A45C]/40 text-[#C8A45C] shadow-xl shadow-[#C8A45C]/10 mb-1">
            <Crown className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#C8A45C] tracking-wide flex items-center justify-center gap-2">
            <span>المستويات والعضويات</span>
            <Sparkles className="w-5 h-5 text-[#FDE68A]" />
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
            ارتقِ بمستواك في المتجر تلقائياً مع كل عملية شراء واستمتع بخصومات حصرية ومزايا فاخرة لكبار العملاء
          </p>
        </div>

        {/* Current Level Hero Card */}
        <div className="rounded-3xl border border-[#C8A45C]/60 bg-[#1A1A1A]/95 p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#C8A45C]/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#FDE68A]/5 rounded-full blur-2xl pointer-events-none"></div>

          <div className="space-y-6 relative z-10">
            
            {/* Top Badge & Level Name */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
              <div className="space-y-1">
                <span className="text-xs font-bold text-zinc-400">مستواك الحالي في المتجر</span>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-black font-extrabold shadow-md border border-white/20"
                    style={{ backgroundColor: badgeColor }}
                  >
                    <Crown className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-black text-white">{currentLevelName}</h2>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-[#121212]/80 px-4 py-2.5 rounded-2xl border border-zinc-800 self-start sm:self-center">
                <div className="text-right">
                  <span className="text-[11px] text-zinc-400 block font-bold">نسبة الخصم الحالية</span>
                  <span className="text-xl font-black text-[#FDE68A] font-mono">{currentDiscount}%</span>
                </div>
                <div className="h-8 w-[1px] bg-zinc-800"></div>
                <div className="text-right">
                  <span className="text-[11px] text-zinc-400 block font-bold">إجمالي الإنفاق</span>
                  <span className="text-base font-black text-[#C8A45C] font-mono">${totalSpent.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {currentLvl?.description && (
              <p className="text-xs text-zinc-300 leading-relaxed bg-[#121212]/50 p-3 rounded-xl border border-zinc-800/80">
                {currentLvl.description}
              </p>
            )}

            {/* Next Level Progress Bar */}
            {nextLvl ? (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-zinc-300 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-[#C8A45C]" />
                    <span>التقدم نحو المستوى التالي ({nextLvl.name})</span>
                  </span>
                  <span className="font-mono text-[#C8A45C]">
                    ${totalSpent.toFixed(2)} / ${(nextLvl.required_amount ?? nextLvl.requiredAmount ?? nextLvl.requiredSpent ?? 0).toFixed(2)}
                  </span>
                </div>

                <div className="w-full bg-zinc-900 h-3.5 rounded-full overflow-hidden p-0.5 border border-zinc-700/80">
                  <div
                    className="bg-gradient-to-r from-[#C8A45C] via-[#E5C178] to-[#FDE68A] h-full rounded-full transition-all duration-700 shadow-md shadow-[#C8A45C]/30"
                    style={{ width: `${Math.min(100, Math.max(4, progressPercent))}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>نسبة الإنجاز: <strong className="text-white font-mono">{progressPercent}%</strong></span>
                  <span>
                    متبقي <strong className="text-[#C8A45C] font-mono font-extrabold">${amountToNext.toFixed(2)}</strong> للوصول إلى {nextLvl.name}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-[#C8A45C]/10 border border-[#C8A45C]/30 rounded-2xl text-center text-xs text-[#C8A45C] font-bold flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>تهانينا! لقد وصلت إلى أعلى مستوى كبار الشخصيات في المنصة.</span>
              </div>
            )}

          </div>
        </div>

        {/* Levels List Header */}
        <div className="pt-2 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#C8A45C] flex items-center gap-2">
            <Award className="w-5 h-5" />
            <span>كافة مستويات المنصة والمزايا</span>
          </h2>
          <span className="text-xs text-zinc-500 font-bold">{levels.length} مستويات متاحة</span>
        </div>

        {/* All Levels List */}
        <div className="space-y-4">
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
              try { parsedBenefits = JSON.parse(lvl.benefits); } catch { parsedBenefits = [lvl.benefits]; }
            }

            return (
              <div
                key={lvl.id}
                className={`rounded-2xl p-5 sm:p-6 transition-all relative overflow-hidden border ${
                  isCurrent
                    ? "bg-[#1A1A1A] border-[#C8A45C] shadow-xl shadow-[#C8A45C]/15 ring-1 ring-[#C8A45C]/40"
                    : isUnlocked
                    ? "bg-[#1A1A1A]/80 border-emerald-500/40 hover:border-emerald-500/70"
                    : "bg-[#1A1A1A]/40 border-zinc-800/80 hover:border-zinc-700 opacity-80"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* Left: Icon & Title */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner transition-all ${
                        isCurrent
                          ? "bg-[#C8A45C]/20 border-[#C8A45C] text-[#C8A45C]"
                          : isUnlocked
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                          : "bg-zinc-800/80 border-zinc-700 text-zinc-500"
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

                    <div className="space-y-1">
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
                      </div>

                      {lvl.description && (
                        <p className="text-xs text-zinc-400">{lvl.description}</p>
                      )}

                      {/* Benefits Checklist */}
                      {parsedBenefits.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {parsedBenefits.map((benefit, i) => (
                            <span
                              key={i}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                                isCurrent
                                  ? "bg-[#C8A45C]/10 border-[#C8A45C]/30 text-[#FDE68A]"
                                  : "bg-zinc-800/70 border-zinc-700 text-zinc-300"
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
                  <div className="sm:text-left flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-zinc-800/60 pt-3 sm:pt-0 shrink-0">
                    <div className="text-right sm:text-left">
                      <span className="text-[10px] text-zinc-400 block font-bold">حد الإنفاق المطلوب</span>
                      <span className={`text-base sm:text-lg font-black font-mono ${isCurrent ? "text-[#C8A45C]" : "text-zinc-200"}`}>
                        ${reqAmt.toFixed(0)}
                      </span>
                    </div>

                    <div className="text-left sm:mt-2">
                      <span className="text-[10px] text-zinc-400 block font-bold">نسبة الخصم</span>
                      <span className="text-sm font-black text-[#FDE68A] bg-[#FDE68A]/10 px-2.5 py-0.5 rounded-md border border-[#FDE68A]/20">
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
