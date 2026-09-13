import React, { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  Copy, 
  Check, 
  FileText, 
  ShieldCheck, 
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export function DepositInvoicePay() {
  const [, params] = useRoute("/deposit/pay/:invoiceId");
  const [, setLocation] = useLocation();
  const { refreshUser } = useAuth();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const invoiceId = params?.invoiceId ? decodeURIComponent(params.invoiceId) : "";

  // Query parameters parsing
  const searchParams = new URLSearchParams(window.location.search);
  const queryAmount = searchParams.get("amount") || "1";
  const queryCurrency = searchParams.get("currency") || "USD";
  const queryExpiresAt = searchParams.get("expiresAt") || "";

  const [transactionRef, setTransactionRef] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copiedInvoice, setCopiedInvoice] = useState(false);
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [amount, setAmount] = useState<number>(Number(queryAmount) || 1);
  const [currency, setCurrency] = useState<string>(queryCurrency);
  const [expiresAt, setExpiresAt] = useState<string>(
    queryExpiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString()
  );

  // Timer logic
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const exp = new Date(expiresAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((exp - now) / 1000));
  });

  useEffect(() => {
    const exp = new Date(expiresAt).getTime();
    const now = Date.now();
    setTimeLeft(Math.max(0, Math.floor((exp - now) / 1000)));
  }, [expiresAt]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const isExpired = timeLeft <= 0;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Poll status every 15 seconds or on demand
  useEffect(() => {
    if (!invoiceId || status === "approved") return;

    let isMounted = true;
    async function checkStatus() {
      try {
        const authToken = localStorage.getItem("xpay_store_auth_token");
        const headers: Record<string, string> = {};
        if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

        const apiBase = String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
        const pollUrl = `${apiBase}/api/deposits/shamcash/invoice/${encodeURIComponent(invoiceId)}`;

        const res = await fetch(pollUrl, {
          headers,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.ok) {
          if (data.status === "approved") {
            setStatus("approved");
            toast.success("تم تأكيد الإيداع بنجاح وإضافة الرصيد إلى محفظتك!");
            refreshUser().catch(() => null);
            setTimeout(() => {
              setLocation("/deposit");
            }, 2500);
          } else if (data.status === "rejected") {
            setStatus("rejected");
          }
          if (data.amountUsd) setAmount(data.amountUsd);
          if (data.currency) setCurrency(data.currency);
        }
      } catch {
        // silent poll error
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [invoiceId, status, refreshUser, setLocation]);

  const handleCopyInvoice = async () => {
    try {
      await navigator.clipboard.writeText(invoiceId);
      setCopiedInvoice(true);
      toast.success("تم نسخ رقم الفاتورة");
      setTimeout(() => setCopiedInvoice(false), 2000);
    } catch {
      toast.error("تعذر نسخ رقم الفاتورة");
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRef = transactionRef.trim();
    if (!cleanRef) {
      toast.error("يرجى إدخال رقم العملية (Transaction ID)");
      return;
    }

    try {
      setVerifying(true);

      const authToken = localStorage.getItem("xpay_store_auth_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

      const apiBase = String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
      const verifyUrl = `${apiBase}/api/deposits/shamcash/verify`;

      console.log("[Verify] 📤 URL:", verifyUrl);
      console.log("[Verify] 📤 Body:", { invoiceId, transactionRef: cleanRef });
      console.log("[Verify] 📤 Token:", authToken ? authToken.substring(0, 15) + "..." : "(none)");

      const res = await fetch(verifyUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          invoiceId,
          transactionRef: cleanRef,
        }),
      });

      console.log("[Verify] 📥 Status:", res.status);
      const data = await res.json().catch(() => ({}));
      console.log("[Verify] 📥 Body:", data);

      if (res.ok && (data.verified || data.ok)) {
        setStatus("approved");
        toast.success("تم التحقق بنجاح! تمت إضافة المبلغ إلى محفظتك.");
        await refreshUser().catch(() => null);
        setTimeout(() => {
          setLocation("/deposit");
        }, 2000);
      } else {
        const errorMsg =
          data.message ||
          data.error ||
          "تعذر التحقق من رقم العملية، يرجى التأكد من صحة الرقم والمحاولة مرة أخرى";
        toast.error(errorMsg);
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      toast.error("حدث خطأ أثناء الاتصال للتحقق، يرجى المحاولة لاحقاً");
    } finally {
      setVerifying(false);
    }
  };

  if (!invoiceId) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-12 text-center space-y-4" dir="rtl">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold">لم يتم العثور على الفاتورة</h2>
        <p className="text-sm text-muted-foreground">
          يرجى العودة لصفحة الإيداع وإنشاء فاتورة جديدة.
        </p>
        <Link href="/deposit">
          <Button className="rounded-xl">الرجوع لصفحة الإيداع</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6" dir="rtl">
      {/* 1. Top Header Bar (Image 2 design) */}
      <div className="flex items-center justify-between gap-4">
        {/* Right side: Back + Title + Subtitle */}
        <div className="flex items-center gap-3">
          <Link href="/deposit/shamcash">
            <button
              type="button"
              className="w-10 h-10 rounded-2xl bg-muted/70 hover:bg-muted border border-border/80 flex items-center justify-center text-foreground transition-all shadow-xs"
              title="رجوع"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[var(--theme-primary)] tracking-tight">
              تفاصيل دفع الفاتورة
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              قم بالتحويل عبر شام كاش ثم أدخل رقم العملية
            </p>
          </div>
        </div>

        {/* Left side: Pill Timer Badge (Image 2 reference) */}
        <div className="shrink-0">
          <div
            className={`px-4 py-2 rounded-2xl border text-center transition-all shadow-xs ${
              isExpired
                ? "bg-destructive/10 border-destructive/30 text-destructive"
                : "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-bold justify-center">
              <Clock className="w-3.5 h-3.5" />
              <span>الوقت المتبقي:</span>
            </div>
            <div className="text-sm sm:text-base font-black font-mono tracking-wider pt-0.5">
              {isExpired ? (
                <span className="text-xs">انتهت الصلاحية</span>
              ) : (
                `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Alert if already approved */}
      {status === "approved" && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center gap-3 shadow-md animate-in zoom-in-95">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <div>
            <div className="font-bold text-sm">تم تأكيد الإيداع بنجاح!</div>
            <div className="text-xs opacity-90">تم تحديث رصيدك بنجاح، جاري تحويلك للمحفظة...</div>
          </div>
        </div>
      )}

      {/* 2. Verification Form Card (Image 2 middle section) */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-7 shadow-xl shadow-black/5 space-y-5">
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[var(--theme-primary)]" />
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              التحقق من رقم العملية
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Sparkles className="w-3 h-3" />
            تحقق آلي فوري
          </span>
        </div>

        {/* Input & Action */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground block">
              أدخل رقم عملية شام كاش <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              required
              disabled={verifying || isExpired || status === "approved"}
              placeholder="مثال: 123456789"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              className="h-12 rounded-xl text-left font-mono font-bold text-base px-4 border-border/80 focus:border-[var(--theme-primary)] tracking-wider"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-1">
            <Button
              type="submit"
              disabled={verifying || !transactionRef.trim() || isExpired || status === "approved"}
              className="w-full h-12 rounded-2xl bg-[var(--theme-primary)] hover:opacity-90 text-white font-bold text-sm sm:text-base shadow-lg shadow-[var(--theme-primary)]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {verifying ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري التحقق الفوري...
                </span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد والتحقق من الإيداع</span>
                </>
              )}
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            سيتم التحقق عبر مزود الدفع فوراً وإضافة المبلغ لحسابك دون تأخير.
          </p>
        </form>
      </div>

      {/* 3. Steps Card (Image 2) */}
      <div className="bg-muted/40 border border-border/70 rounded-3xl p-5 sm:p-6 space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">
            خطوات إتمام الإيداع:
          </h3>
          <ShieldCheck className="w-5 h-5 text-muted-foreground/60" />
        </div>

        <ol className="space-y-2 text-xs sm:text-sm text-muted-foreground leading-relaxed list-decimal list-inside pr-1">
          <li className="font-medium text-foreground/90">
            افتح تطبيق شام كاش وحوّل المبلغ المطلوب إلى العنوان.
          </li>
          <li className="font-medium text-foreground/90">
            انسخ <strong className="text-foreground font-bold">رقم العملية (Transaction ID)</strong> بعد إتمام التحويل.
          </li>
          <li className="font-medium text-foreground/90">
            ألصق رقم العملية في الحقل أعلاه واضغط على زر التحقق.
          </li>
        </ol>
      </div>

      {/* 4. Current Invoice Details Card (Image 2 bottom section) */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-7 shadow-xl shadow-black/5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--theme-primary)]" />
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              بيانات الفاتورة الحالية
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            بانتظار التحويل
          </span>
        </div>

        {/* Invoice ID Box */}
        <div className="bg-muted/40 border border-border/70 rounded-2xl p-3.5 flex items-center justify-between gap-3">
          <div className="space-y-0.5 overflow-hidden">
            <span className="text-[11px] font-semibold text-muted-foreground block">
              رقم الفاتورة (Invoice ID)
            </span>
            <span className="font-mono font-bold text-xs sm:text-sm text-foreground truncate block select-all">
              {invoiceId}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyInvoice}
            className="shrink-0 p-2 rounded-xl bg-background border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shadow-2xs"
            title="نسخ رقم الفاتورة"
          >
            {copiedInvoice ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Amount Box */}
        <div className="bg-muted/40 border border-border/70 rounded-2xl p-3.5 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-muted-foreground block">
              المبلغ المطلوب تحويله
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-foreground font-mono">
                {currency} {amount}
              </span>
            </div>
          </div>
          <div className="shrink-0 px-3 py-1 rounded-xl bg-background border border-border font-mono font-bold text-xs text-muted-foreground">
            {currency}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DepositInvoicePay;
