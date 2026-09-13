import React, { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { 
  ArrowRight, 
  QrCode, 
  Wallet, 
  Copy, 
  Check, 
  Clock, 
  Maximize2, 
  X, 
  AlertCircle,
  ShieldCheck,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getPublicJson } from "@/lib/public-api";
import { useAuth } from "@/lib/auth-context";

// Fallback ShamCash QR image generator or SVG
const SHAMCASH_DEFAULT_WALLET = "35147b5811bdc0bf07fdb11b85c8a5d";

export function DepositShamCash() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const [walletAddress, setWalletAddress] = useState<string>(SHAMCASH_DEFAULT_WALLET);
  const [qrImageUrl, setQrImageUrl] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<"USD" | "SYP">("USD");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  // Load payment methods to get active ShamCash wallet and QR
  useEffect(() => {
    async function loadMethod() {
      try {
        const methods = await getPublicJson<any[]>("/payment-methods");
        if (Array.isArray(methods)) {
          const sham = methods.find(
            (m) => m.code === "sham_cash" || m.code === "sham_cash_auto"
          );
          if (sham?.walletAddress) {
            setWalletAddress(sham.walletAddress);
          }
          if (sham?.qrImage) {
            setQrImageUrl(sham.qrImage);
          }
        }
      } catch (e) {
        console.warn("Could not load sham_cash settings:", e);
      }
    }
    loadMethod();
  }, []);

  // Generate fallback QR URL using reliable Google Chart or QR API if custom not uploaded
  const effectiveQrUrl =
    qrImageUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      walletAddress
    )}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success("تم نسخ معرف المحفظة بنجاح");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("فشل نسخ المعرف");
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح أكبر من الصفر");
      return;
    }

    try {
      setSubmitting(true);

      // Extract Telegram identity headers if present in localStorage
      let tgHeaders: Record<string, string> = {};
      try {
        const cachedTg = localStorage.getItem("xpay_telegram_identity");
        if (cachedTg) {
          const parsed = JSON.parse(cachedTg);
          if (parsed?.id) tgHeaders["x-telegram-id"] = String(parsed.id);
          if (parsed?.initDataRaw) tgHeaders["x-telegram-init-data"] = String(parsed.initDataRaw);
        }
      } catch {
        // ignore
      }

      const authToken = localStorage.getItem("xpay_store_auth_token");
      if (authToken) {
        tgHeaders["Authorization"] = `Bearer ${authToken}`;
      }

      const requestUrl = `${String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "")}/api/deposits/shamcash/invoice`;
      const requestBody = {
        amount: numAmount,
        currency,
      };

      console.log("[Deposit] 📤 Sending request to:", requestUrl);
      console.log("[Deposit] 📦 Body:", requestBody);
      console.log("[Deposit] 🔑 Token:", authToken ? authToken.substring(0, 15) + "..." : "(none)");
      console.log("[Deposit] 🏷️ Headers:", tgHeaders);

      const res = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...tgHeaders,
        },
        body: JSON.stringify(requestBody),
      });

      console.log("[Deposit] 📥 Response Status:", res.status);
      const data = await res.json().catch(() => ({}));
      console.log("[Deposit] 📥 Response Body:", data);

      if (!res.ok || !data.ok) {
        const errMsg =
          data.message ||
          data.error ||
          "حدث خطأ أثناء فتح الفاتورة، يرجى المحاولة لاحقاً";
        toast.error(errMsg);
        return;
      }

      const invoiceId = data.invoiceId || data.transactionId;
      const expiresAt = data.expiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString();

      toast.success("تم فتح الفاتورة بنجاح! يرجى إتمام التحويل والتحقق.");

      // Navigate to Pay page (Image 2)
      setLocation(
        `/deposit/pay/${encodeURIComponent(invoiceId)}?amount=${numAmount}&currency=${currency}&expiresAt=${encodeURIComponent(
          expiresAt
        )}`
      );
    } catch (err: any) {
      console.error("Create invoice error:", err);
      toast.error(err?.message || "تعذر الاتصال بالخادم لفتح الفاتورة");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 sm:py-8 space-y-6" dir="rtl">
      {/* Top Bar with Back Button & Title */}
      <div className="flex items-center justify-between">
        <Link href="/deposit">
          <button 
            type="button"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors p-2 -mr-2 rounded-xl hover:bg-muted/50"
          >
            <ArrowRight className="w-4 h-4" />
            <span>الرجوع للمحفظة</span>
          </button>
        </Link>
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          شام كاش تلقائي
        </span>
      </div>

      {/* Main Card (Image 2.1 design) */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/5 space-y-6">
        {/* QR Code Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-xs font-semibold text-muted-foreground border border-border/60">
            <QrCode className="w-3.5 h-3.5" />
            <span>رمز التحويل (QR Code)</span>
          </div>

          <div 
            onClick={() => setShowLightbox(true)}
            className="group relative w-56 h-56 sm:w-64 sm:h-64 mx-auto p-3.5 rounded-3xl bg-white border-2 border-border/60 hover:border-[var(--theme-primary)]/80 shadow-md transition-all cursor-pointer flex items-center justify-center overflow-hidden"
            title="انقر لتكبير الرمز"
          >
            <img
              src={effectiveQrUrl}
              alt="QR Code شام كاش"
              className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded-3xl">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-xs">
                <Maximize2 className="w-4 h-4" />
                تكبير الرمز
              </span>
            </div>
          </div>
        </div>

        {/* Wallet Address / Account ID Box */}
        <div className="space-y-2 text-center pt-2">
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Wallet className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
            <span>عنوان المحفظة / معرف الحساب</span>
          </div>

          <div className="bg-muted/40 border border-border/80 rounded-2xl p-3 max-w-md mx-auto">
            <div className="font-mono font-bold text-xs sm:text-sm text-[var(--theme-primary)] select-all break-all tracking-wider">
              {walletAddress}
            </div>
          </div>

          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold border border-[var(--theme-primary)]/40 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] hover:bg-[var(--theme-primary)] hover:text-white transition-all shadow-xs active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ معرف المحفظة</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Amount & Currency Form */}
        <form onSubmit={handleCreateInvoice} className="space-y-4 pt-4 border-t border-border/60">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Amount Input */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                المبلغ المراد شحنه <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="any"
                  min="0.1"
                  required
                  placeholder="أدخل المبلغ..."
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 rounded-xl text-left font-mono font-bold text-base px-4 pr-4 border-border/80 focus:border-[var(--theme-primary)]"
                />
              </div>
            </div>

            {/* Currency Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                العملة <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as "USD" | "SYP")}
                  className="w-full h-12 rounded-xl bg-background border border-border/80 px-3 text-xs font-bold text-foreground focus:outline-hidden focus:border-[var(--theme-primary)] appearance-none cursor-pointer"
                >
                  <option value="USD">(دولار أمريكي) USD</option>
                  <option value="SYP">(ليرة سورية) SYP</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Session Note */}
          <div className="rounded-2xl p-3.5 bg-blue-500/10 border border-blue-500/20 flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-300">
            <Clock className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
            <p className="leading-relaxed">
              سيتم إنشاء فاتورة صالحة لمدة 15 دقيقة. يرجى إتمام الدفع خلال هذه المدة.
            </p>
          </div>

          {/* Action Button */}
          <Button
            type="submit"
            disabled={submitting || !amount}
            className="w-full h-12 rounded-2xl bg-[var(--theme-primary)] hover:opacity-90 text-white font-bold text-sm sm:text-base shadow-lg shadow-[var(--theme-primary)]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جاري فتح الفاتورة...
              </span>
            ) : (
              <>
                <span>تأكيد وفتح فاتورة</span>
                <span className="text-lg leading-none">←</span>
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Lightbox Modal for QR Code */}
      {showLightbox && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowLightbox(false)}
        >
          <div 
            className="relative bg-white p-6 rounded-3xl max-w-sm w-full shadow-2xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowLightbox(false)}
              className="absolute top-3 left-3 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-foreground text-sm">
              رمز الاستجابة السريعة (QR Code)
            </h3>
            <div className="w-64 h-64 mx-auto p-2 bg-white rounded-2xl border flex items-center justify-center">
              <img src={effectiveQrUrl} alt="QR Big" className="w-full h-full object-contain" />
            </div>
            <div className="font-mono text-xs text-muted-foreground break-all bg-muted/40 p-2 rounded-xl">
              {walletAddress}
            </div>
            <Button
              type="button"
              onClick={() => setShowLightbox(false)}
              className="w-full rounded-xl bg-foreground text-background"
            >
              إغلاق
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DepositShamCash;
