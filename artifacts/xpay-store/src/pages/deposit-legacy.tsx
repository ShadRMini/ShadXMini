import { useListPaymentMethods, getListPaymentMethodsQueryKey } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, Smartphone, Landmark, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { getPublicJson } from "@/lib/public-api";

type UiMethod = {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  logoImage?: string;
  qrImage?: string;
  active: boolean;
};

function getDisplayName(method: UiMethod) {
  if (method.code === "sham_cash_auto") return "شام كاش";
  return method.name;
}

function getDisplaySubtitle(method: UiMethod) {
  if (method.code === "sham_cash_auto") return "شام كاش تلقائي عبر الفاتورة";
  return method.subtitle;
}

export default function LegacyDeposit() {
  const { data: methods, isLoading } = useListPaymentMethods({
    query: { queryKey: getListPaymentMethodsQueryKey() },
  });
  const [fallbackMethods, setFallbackMethods] = useState<UiMethod[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPublicJson<UiMethod[]>("/payment-methods")
      .then((rows) => {
        if (!cancelled) setFallbackMethods(rows.filter((method) => method.active));
      })
      .catch((error) => {
        console.error("Fallback payment methods load failed:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleMethods = ((fallbackMethods && fallbackMethods.length > 0 ? fallbackMethods : methods) || []) as UiMethod[];

  const getMethodIcon = (method: Pick<UiMethod, "code" | "logoImage">) => {
    if (method.logoImage) {
      return (
        <img
          src={method.logoImage}
          alt="Payment logo"
          className="w-10 h-10 rounded-lg object-contain bg-white p-1"
          loading="lazy"
        />
      );
    }

    switch (method.code) {
      case "binance_pay":
      case "usdt_auto":
        return <ShieldCheck className="w-8 h-8 text-[#FCD535]" />;
      case "syriatel_cash":
        return <Smartphone className="w-8 h-8 text-[#E31837]" />;
      case "mtn_cash":
        return <Smartphone className="w-8 h-8 text-[#FFCC00]" />;
      case "sham_cash":
      case "sham_cash_auto":
      default:
        return <Landmark className="w-8 h-8 text-primary" />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--theme-background)] text-[var(--theme-text-primary)] pb-24 p-4 animate-in fade-in duration-300" dir="rtl">
      <div className="mb-6 mt-4 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-gradient-to-br from-[var(--theme-primary)]/25 to-[var(--theme-background)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[var(--theme-border)] shadow-lg">
          <Wallet className="w-8 h-8 text-[var(--theme-primary)]" />
        </div>
        <h1 className="text-2xl font-black text-[var(--theme-accent)] mb-2">اختر وسيلة الشحن</h1>
        <p className="text-xs sm:text-sm text-[var(--theme-text-muted)]">وسائل دفع آمنة ومباشرة لإضافة الرصيد إلى حسابك فورياً</p>
      </div>

      {isLoading && visibleMethods.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-3xl bg-[var(--theme-card)]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {visibleMethods
            ?.filter((m) => m.active)
            .map((method, i) => (
              <Link key={method.id} href={`/deposit/${method.code}`}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="p-5 rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)] hover:bg-[var(--theme-input-bg)] hover:border-[var(--theme-primary)] transition-all cursor-pointer h-full flex flex-col items-center justify-center text-center group shadow-md"
                >
                  <div className="mb-3 transform group-hover:scale-110 transition-transform duration-300">
                    {getMethodIcon(method)}
                  </div>
                  <h3 className="font-bold text-[var(--theme-accent)] text-sm mb-1">{getDisplayName(method)}</h3>
                  <p className="text-[10px] text-[var(--theme-text-muted)]">{getDisplaySubtitle(method)}</p>
                </motion.div>
              </Link>
            ))}
        </div>
      )}

      <div className="mt-8 max-w-xl mx-auto bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-2xl p-4 flex items-center gap-4 shadow-lg">
        <ShieldCheck className="w-9 h-9 text-[var(--theme-primary)] shrink-0" />
        <div>
          <h4 className="text-sm font-bold text-[var(--theme-accent)] mb-1">دفع آمن ومشفّر 100%</h4>
          <p className="text-xs text-[var(--theme-text-muted)]">جميع عمليات الدفع مشفّرة ومؤمنة بالكامل. يتم إضافة الرصيد تلقائيًا أو بعد مراجعة فورية.</p>
        </div>
      </div>
    </div>
  );
}
