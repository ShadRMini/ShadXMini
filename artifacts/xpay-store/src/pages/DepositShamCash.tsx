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
import { DepositPageUI } from "@workspace/deposit-ui";

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
  const [methodConfig, setMethodConfig] = useState<any>(null);

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
          if (sham?.displayConfig || sham?.display_config) {
            setMethodConfig(sham.displayConfig || sham.display_config);
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

      {/* Main Card with DepositPageUI (Matches Image 2 exactly) */}
      <div className="shadow-xs rounded-3xl overflow-hidden">
        <DepositPageUI
          config={methodConfig || {}}
          amount={amount}
          onAmountChange={setAmount}
          onAmountSelect={(v) => setAmount(String(v))}
          currency={currency}
          onCurrencyChange={(c) => setCurrency(c as "USD" | "SYP")}
          walletAddress={walletAddress}
          qrImageUrl={effectiveQrUrl}
          onConfirm={handleCreateInvoice}
          isSubmitting={submitting}
          onQrClick={() => setShowLightbox(true)}
        />
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
