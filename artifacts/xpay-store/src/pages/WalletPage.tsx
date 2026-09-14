import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { 
  Wallet, 
  CreditCard, 
  Lock, 
  Zap, 
  Clock, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle,
  Coins,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { getPublicJson } from "@/lib/public-api";
import { Skeleton } from "@/components/ui/skeleton";

export interface PaymentMethodItem {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  requiresVerification?: boolean;
  instructions?: string;
  walletAddress?: string;
  logoImage?: string;
  qrImage?: string;
  minAmount?: number;
  active?: boolean;
  order?: number;
  category?: string;
}

const DEFAULT_METHODS: PaymentMethodItem[] = [
  {
    id: "1",
    code: "sham_cash",
    name: "شام كاش",
    subtitle: "instant",
    requiresVerification: true,
    instructions: "يرجى التحويل إلى عنوان المحفظة ثم إدخال رقم العملية للتأكيد الفوري.",
    walletAddress: "35147b5811bdc0bf07fdb11b85c8a5d",
    active: true,
  },
  {
    id: "2",
    code: "syriatel_cash",
    name: "سيرياتيل كاش",
    subtitle: "instant",
    requiresVerification: false,
    instructions: "يرجى التحويل إلى الرقم المعتمد وإرفاق إشعار الدفع.",
    walletAddress: "0991234567",
    active: true,
  },
  {
    id: "3",
    code: "binance_pay",
    name: "Binance Pay",
    subtitle: "instant",
    requiresVerification: false,
    instructions: "الدفع عبر معرف بينانس مع التأكيد السريع.",
    walletAddress: "xpay_binance@pay",
    active: true,
  },
  {
    id: "4",
    code: "usdt_auto",
    name: "USDT تلقائي",
    subtitle: "instant",
    requiresVerification: false,
    instructions: "تحويل شبكة TRC20 مع المعالجة التلقائية.",
    walletAddress: "TQn9Y2khEsLJW1ChVWFMSMeSTow5KaxnSE",
    active: true,
  },
  {
    id: "5",
    code: "mtn_cash",
    name: "MTN Cash",
    subtitle: "manual_review",
    requiresVerification: false,
    instructions: "يرجى التحويل عبر MTN كاش ورفع إشعار العملية للمراجعة.",
    walletAddress: "0941234567",
    active: true,
  },
];

// Helper to render method-specific icon/badge
function getMethodIcon(code: string) {
  switch (code) {
    case "sham_cash":
    case "sham_cash_auto":
      return (
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-xs">
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
            <circle cx="16" cy="15" r="1" fill="currentColor" />
          </svg>
        </div>
      );
    case "syriatel_cash":
      return (
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-600 shadow-xs">
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        </div>
      );
    case "binance_pay":
      return (
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-xs">
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L6.5 7.5L8.5 9.5L12 6L15.5 9.5L17.5 7.5L12 2ZM2 12L7.5 17.5L9.5 15.5L6 12L9.5 8.5L7.5 6.5L2 12ZM12 22L17.5 16.5L15.5 14.5L12 18L8.5 14.5L6.5 16.5L12 22ZM22 12L16.5 6.5L14.5 8.5L18 12L14.5 15.5L16.5 17.5L22 12ZM12 9.5L9.5 12L12 14.5L14.5 12L12 9.5Z" />
          </svg>
        </div>
      );
    case "usdt_auto":
      return (
        <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 shadow-xs">
          <Coins className="w-7 h-7" />
        </div>
      );
    case "mtn_cash":
      return (
        <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-600 shadow-xs">
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <path d="M12 8v8" />
            <path d="M8 12h8" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
          <CreditCard className="w-7 h-7" />
        </div>
      );
  }
}

export const STATUS_MAP: Record<string, { emoji: string; text: string; style: string }> = {
  normal: {
    emoji: "✅",
    text: "تعمل بشكل طبيعي",
    style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  instant: {
    emoji: "⚡",
    text: "شحن فوري",
    style: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  manual_review: {
    emoji: "⏳",
    text: "مراجعة يدوية",
    style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  temporarily_unavailable: {
    emoji: "🛑",
    text: "متوقف مؤقتاً",
    style: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  },
};

function getBadgeProps(subtitleRaw: string, code: string, category?: string) {
  const subtitle = subtitleRaw || "normal";
  const mappedKey =
    subtitle === "شحن فوري" || subtitle === "تأكيد فوري" || subtitle === "شحن فوري TRC20" || subtitle === "instant"
      ? "instant"
      : subtitle === "مراجعة يدوية" || subtitle === "manual_review"
      ? "manual_review"
      : subtitle === "متوقف مؤقتاً" || subtitle === "temporarily_unavailable"
      ? "temporarily_unavailable"
      : STATUS_MAP[subtitle]
      ? subtitle
      : category === "فوري"
      ? "instant"
      : category === "يدوي" || category === "مراجعة يدوية"
      ? "manual_review"
      : "normal";

  const status = STATUS_MAP[mappedKey] || STATUS_MAP.normal;

  return {
    key: mappedKey,
    emoji: status.emoji,
    text: status.text,
    className: status.style,
  };
}

export function WalletPage() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [methods, setMethods] = useState<PaymentMethodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState<string>("sham_cash");

  // الإصلاح 3: Cache حالة التوثيق لتحسين تجربة المستخدم ومنع وميض القفل
  const [cachedVerified, setCachedVerified] = useState<boolean | null>(() => {
    try {
      const stored = localStorage.getItem("xpay_user_verified");
      return stored !== null ? stored === "true" : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!authLoading && user) {
      const verified = Boolean(user.identityVerified || user.isVerified);
      setCachedVerified(verified);
      try {
        localStorage.setItem("xpay_user_verified", String(verified));
      } catch {}
    }
  }, [user, authLoading]);

  useEffect(() => {
    let isMounted = true;
    async function loadMethods() {
      try {
        setLoading(true);
        const data = await getPublicJson<PaymentMethodItem[]>("/payment-methods");
        if (isMounted) {
          if (Array.isArray(data)) {
            const activeList = data.filter((m) => m.active !== false);
            setMethods(activeList);
            if (activeList.length > 0) {
              setSelectedCode((prev) =>
                activeList.some((m) => m.code === prev) ? prev : activeList[0].code,
              );
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch payment methods:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadMethods();
    refreshUser().catch(() => null);

    return () => {
      isMounted = false;
    };
  }, [refreshUser]);

  // استخدام الكاش أثناء التحميل لتجنب معاملة الموثق كغير موثق
  const isVerified = cachedVerified !== null
    ? cachedVerified
    : Boolean(user?.identityVerified || user?.isVerified);

  const handleSelectMethod = (method: PaymentMethodItem) => {
    const badge = getBadgeProps(method.subtitle, method.code, method.category);

    // الحالة 1: متوقف مؤقتاً
    if (badge.key === "temporarily_unavailable") {
      toast.error("🛑 هذه الطريقة متوقفة مؤقتاً. سنخبرك عندما تتوفر.");
      return;
    }

    // الحالة 2: تتطلب توثيق الحساب (فحص متطلب التوثيق المنفصل)
    const requiresVer = Boolean(
      method.requiresVerification ??
      (method.subtitle === "requires_verification" || method.subtitle === "تتطلب توثيق الحساب" || method.code.includes("sham"))
    );

    if (requiresVer) {
      // إذا كان جاري التحقق ولا يوجد كاش إيجابي
      if (authLoading && cachedVerified === null) {
        toast.info("⏳ جاري التحقق من حالة حسابك...");
        return;
      }

      const isLocked = !isVerified;
      if (isLocked) {
        toast.error("يجب توثيق حسابك أولاً لاستخدام هذه الطريقة");
        setLocation("/identity-verification");
        return;
      }
    }

    // الحالة 3: مراجعة يدوية
    if (badge.key === "manual_review") {
      toast.info("⏳ هذه الطريقة تتطلب مراجعة يدوية. ستتم المراجعة من دقيقة إلى 12 ساعة.");
    }

    // الاختيار الفعلي والانتقال
    setSelectedCode(method.code);
    setTimeout(() => {
      if (method.code === "sham_cash" || method.code === "sham_cash_auto") {
        setLocation("/deposit/shamcash");
      } else {
        setLocation(`/deposit/${encodeURIComponent(method.code)}`);
      }
    }, 120);
  };

  const balanceUsd = typeof user?.balanceUsd === "number" ? user.balanceUsd : 0;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6" dir="rtl">
      {/* 1. Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/25 flex items-center justify-center text-[var(--theme-primary)] shadow-xs">
          <Wallet className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-[var(--theme-primary)] tracking-tight">
            إيداع رصيد
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            قم باختيار طريقة الدفع لشحن حسابك والبدء في الشراء
          </p>
        </div>
      </div>

      {/* 2. Current Balance Card (Image 1 reference) */}
      <div 
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-xl transition-all"
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #1d4ed8 100%)",
        }}
      >
        {/* Subtle background glow effect */}
        <div className="absolute -top-12 -left-12 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-44 h-44 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-white/80 font-medium text-sm sm:text-base">
              رصيدك الحالي
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs text-white backdrop-blur-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              محفظة آمنة
            </span>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono">
              ${balanceUsd.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
            {user?.balanceSyp ? (
              <span className="text-xs text-white/70 mr-2">
                (≈ {Math.round(user.balanceSyp).toLocaleString()} ل.س)
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* 3. Payment Methods Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 rounded-full bg-[var(--theme-primary)]" />
          <h2 className="text-lg font-bold text-foreground">
            طرق الشحن
          </h2>
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-[var(--theme-primary)]/15 text-[var(--theme-primary)]">
            {methods.length}
          </span>
        </div>

        {/* Methods List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 rounded-2xl border bg-card flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <Skeleton className="w-12 h-12 rounded-2xl" />
                  <div className="space-y-2">
                    <Skeleton className="w-28 h-4" />
                    <Skeleton className="w-20 h-3" />
                  </div>
                </div>
                <Skeleton className="w-5 h-5 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {methods.map((method) => {
              const isSelected = selectedCode === method.code;
              const badge = getBadgeProps(method.subtitle, method.code, method.category);
              const isUnavailable = badge.key === "temporarily_unavailable";
              const isRequiresVerification = Boolean(
                method.requiresVerification ??
                (method.subtitle === "requires_verification" || method.subtitle === "تتطلب توثيق الحساب" || method.code.includes("sham"))
              );
              const isLocked = !authLoading && isRequiresVerification && !isVerified;

              return (
                <div
                  key={method.code}
                  id={`method-card-${method.code}`}
                  onClick={() => handleSelectMethod(method)}
                  className={`group relative p-4 rounded-2xl border transition-all duration-200 flex flex-col gap-3 ${
                    isUnavailable
                      ? "bg-card/50 border-border/50 opacity-60 cursor-not-allowed grayscale"
                      : isLocked
                      ? "bg-card/70 border-border/70 opacity-80 cursor-not-allowed"
                      : isSelected
                      ? "bg-card border-[var(--theme-primary)] ring-2 ring-[var(--theme-primary)]/20 shadow-md cursor-pointer"
                      : "bg-card border-border/80 hover:border-[var(--theme-primary)]/50 hover:bg-muted/30 cursor-pointer"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    {/* Right side: Icon + Name & Subtitle */}
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        {method.logoImage ? (
                          <div className="w-12 h-12 rounded-2xl border border-border/60 overflow-hidden flex items-center justify-center bg-background shrink-0 p-1">
                            <img
                              src={method.logoImage}
                              alt={method.name}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>
                        ) : (
                          getMethodIcon(method.code)
                        )}
                        {isLocked && (
                          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center shadow-xs">
                            <Lock className="w-3.5 h-3.5 text-red-500" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="font-bold text-base text-foreground group-hover:text-[var(--theme-primary)] transition-colors flex items-center gap-2">
                          <span>{method.name}</span>
                          {isUnavailable && (
                            <span className="text-[11px] font-medium text-gray-500 bg-gray-500/10 px-2 py-0.5 rounded-md">
                              متوقف
                            </span>
                          )}
                          {isLocked && (
                            <span className="text-[11px] font-medium text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md">
                              مقفلة
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border ${badge.className}`}>
                            <span>{badge.emoji}</span>
                            <span>{badge.text}</span>
                          </span>
                          {/* شارة "متطلب توثيق" — تظهر فقط للمستخدمين غير الموثقين بعد انتهاء التحميل */}
                          {isRequiresVerification && !authLoading && !isVerified && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                              <Lock className="w-3 h-3" />
                              <span>يتطلب توثيق الحساب</span>
                            </span>
                          )}
                          {/* شارة للمستخدمين الموثقين تُطمئنهم */}
                          {isRequiresVerification && !authLoading && isVerified && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>حسابك موثّق</span>
                            </span>
                          )}
                          {isRequiresVerification && authLoading && cachedVerified === null && (
                            <div className="text-xs text-amber-500 flex items-center gap-1 font-medium">
                              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                              <span>جاري التحقق...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Left side: Radio indicator or Lock */}
                    <div className="shrink-0 mr-2">
                      {isUnavailable ? (
                        <div className="w-7 h-7 rounded-full bg-gray-500/10 border border-gray-500/20 flex items-center justify-center text-gray-400 text-xs">
                          🛑
                        </div>
                      ) : isLocked ? (
                        <div className="w-7 h-7 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? "border-[var(--theme-primary)] bg-[var(--theme-primary)]"
                              : "border-muted-foreground/30 bg-background group-hover:border-[var(--theme-primary)]/60"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2.5 h-2.5 rounded-full bg-white animate-in zoom-in duration-150" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* If locked, display inline action button to verify */}
                  {isLocked && (
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        يتطلب شحن هذه الطريقة توثيق الهوية أولاً
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.error("يجب توثيق حسابك أولاً لاستخدام هذه الطريقة");
                          setLocation("/identity-verification");
                        }}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl transition-opacity hover:opacity-90 flex items-center gap-1.5 shrink-0 cursor-pointer text-white shadow-xs"
                        style={{ backgroundColor: "var(--theme-primary)" }}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>توثيق الآن</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info note */}
      <div className="rounded-2xl p-4 bg-muted/40 border border-border/60 flex items-start gap-3 text-xs text-muted-foreground">
        <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          جميع عمليات الإيداع يتم تدقيقها ومعالجتها بأعلى معايير الأمان والسرعة. في حال واجهتك أي مشكلة تواصل فوراً مع الدعم الفني.
        </p>
      </div>
    </div>
  );
}

export default WalletPage;
