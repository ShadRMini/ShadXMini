import React, { useEffect, useState } from "react";
import { Crown, Trophy, Award, Lock, CheckCircle2, ChevronRight, Star, Gem } from "lucide-react";
import { getPublicJson } from "@/lib/public-api";
import { toast } from "sonner";

interface LevelItem {
  id: number;
  name: string;
  requiredSpent: number;
  discountPercent: number;
  badgeColor: string;
  icon?: string;
}

interface LoyaltyData {
  currentLevel: LevelItem;
  totalSpent: number;
  nextLevel: LevelItem | null;
  progressPercent: number;
  amountRemaining: number;
  levels: LevelItem[];
}

export default function LoyaltyLevels() {
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicJson<LoyaltyData>("/me/loyalty")
      .then((res) => {
        if (res) setData(res);
      })
      .catch(() => {
        toast.error("فشل تحميل بيانات مستويات الولاء");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#121212] text-[#C8A45C]" dir="rtl">
        <div className="text-center space-y-3">
          <Crown className="w-10 h-10 animate-bounce mx-auto text-[#C8A45C]" />
          <p className="text-sm font-semibold text-zinc-400">جاري تحميل مستويات العضوية...</p>
        </div>
      </div>
    );
  }

  const currentLevelId = data?.currentLevel?.id || 1;
  const totalSpent = data?.totalSpent || 0;
  const levels = data?.levels || [];

  return (
    <div className="min-h-screen bg-[#121212] text-white pb-16 px-4 sm:px-6 pt-6" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2 py-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#C8A45C]/15 border border-[#C8A45C]/40 text-[#C8A45C] shadow-lg shadow-[#C8A45C]/10 mb-1">
            <Crown className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#C8A45C] tracking-wide flex items-center justify-center gap-2">
            <span>المستويات</span>
            <Crown className="w-6 h-6 text-[#C8A45C]" />
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            ارتقِ بمستواك في المتجر واحصل على خصومات حصرية ومزايا استثنائية مع كل عملية شراء
          </p>
        </div>

        {/* Current Level Summary Card */}
        <div className="rounded-2xl border border-[#C8A45C] bg-[#1A1A1A]/90 p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#C8A45C]/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <span className="text-sm font-bold text-zinc-400">مستواك الحالي:</span>
              <span className="text-lg font-black text-[#C8A45C] bg-[#C8A45C]/15 px-3 py-1 rounded-xl border border-[#C8A45C]/30 flex items-center gap-1.5">
                <Crown className="w-4 h-4" />
                {data?.currentLevel?.name || "برونزي"}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <span className="text-sm font-bold text-zinc-400">نسبة الخصم:</span>
              <span className="text-base font-extrabold text-[#FDE68A]">
                {data?.currentLevel?.discountPercent || 0}%
              </span>
            </div>

            <div className="flex items-center justify-between pb-1">
              <span className="text-sm font-bold text-zinc-400">إجمالي الإنفاق:</span>
              <span className="text-base font-extrabold text-[#C8A45C] font-mono">
                ${totalSpent.toFixed(3)}
              </span>
            </div>

            {/* Next Level Progress */}
            {data?.nextLevel && (
              <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>التقدم نحو المستوى التالي ({data.nextLevel.name}):</span>
                  <span className="font-mono text-[#C8A45C] font-bold">
                    ${totalSpent.toFixed(2)} / ${data.nextLevel.requiredSpent.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden p-0.5 border border-zinc-700/60">
                  <div
                    className="bg-gradient-to-r from-[#C8A45C] to-[#FDE68A] h-full rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${Math.min(100, Math.max(5, data.progressPercent || 0))}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-zinc-400 text-left">
                  متبقي <span className="text-[#C8A45C] font-bold">${(data.amountRemaining || 0).toFixed(2)}</span> للوصول إلى مستوى {data.nextLevel.name}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Levels List */}
        <div className="space-y-3.5">
          {levels.map((lvl) => {
            const isCurrent = lvl.id === currentLevelId;
            const isUnlocked = totalSpent >= lvl.requiredSpent;

            return (
              <div
                key={lvl.id}
                className={`rounded-2xl p-4 sm:p-5 transition-all relative overflow-hidden flex items-center justify-between border ${
                  isCurrent
                    ? "bg-[#1A1A1A] border-[#C8A45C] shadow-lg shadow-[#C8A45C]/15"
                    : isUnlocked
                    ? "bg-[#1A1A1A]/70 border-emerald-500/50 hover:border-emerald-500"
                    : "bg-[#1A1A1A]/40 border-zinc-800/80 hover:border-zinc-700"
                }`}
              >
                {/* Left Side: Icon & Title */}
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-inner ${
                      isCurrent
                        ? "bg-[#C8A45C]/20 border-[#C8A45C] text-[#C8A45C]"
                        : isUnlocked
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                        : "bg-zinc-800 border-zinc-700 text-zinc-500"
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

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`font-black text-base sm:text-lg ${isCurrent ? "text-[#C8A45C]" : "text-white"}`}>
                        {lvl.name}
                      </h3>
                      {isCurrent && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C8A45C] text-black font-extrabold">
                          مستواك الحالي
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                      <span>خصم: <strong className="text-[#FDE68A]">{lvl.discountPercent}%</strong></span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Required Spent */}
                <div className="text-left">
                  <span className="text-[11px] text-zinc-400 block font-medium">الحد الأدنى للإنفاق</span>
                  <span className={`text-sm sm:text-base font-extrabold font-mono ${isCurrent ? "text-[#C8A45C]" : "text-zinc-300"}`}>
                    ${lvl.requiredSpent.toFixed(0)}$
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
