import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  Copy,
  Check,
  QrCode,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  Maximize2,
  X,
  Info,
  ShieldCheck,
  Hash
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getPublicJson, apiRequest } from "@/lib/public-api";
import { useAuth } from "@/lib/auth-context";

// Default Binance Pay ID or Paymail fallback if not configured in DB
const DEFAULT_BINANCE_PAY_ID = "xpay_binance@pay";

type DepositStep = "invoice" | "verify" | "approved" | "rejected";

export function DepositBinancePay() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Payment method configurations from DB
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [qrImage, setQrImage] = useState<string>("");
  const [showQrFromAddress, setShowQrFromAddress] = useState<boolean>(false);
  const [methodConfig, setMethodConfig] = useState<any>(null);
  const [minAmount, setMinAmount] = useState<number>(1);
  const [maxAmount, setMaxAmount] = useState<number | undefined>(undefined);
  const [loadingMethod, setLoadingMethod] = useState(true);

  // Flow states
  const [step, setStep] = useState<DepositStep>("invoice");
  const [amount, setAmount] = useState<string>("10");
  const [currency] = useState<string>("USDT");
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [copied, setCopied] = useState(false);

  // Step 2 Verification states
  const [depositId, setDepositId] = useState<number | null>(null);
  const [transactionRef, setTransactionRef] = useState<string>("");
  const [isSubmittingRef, setIsSubmittingRef] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>("pending");

  // Load payment method data
  useEffect(() => {
    let isMounted = true;
    async function loadMethod() {
      try {
        const methods = await getPublicJson<any[]>("/payment-methods");
        if (Array.isArray(methods) && isMounted) {
          const binance = methods.find(
            (m) => m.code === "binance_pay" || m.code === "binance"
          );
          if (binance) {
            if (binance.walletAddress) {
              setWalletAddress(binance.walletAddress);
            }
            if (binance.qrImage) {
              setQrImage(binance.qrImage);
            }
            if (binance.showQrFromAddress !== undefined) {
              setShowQrFromAddress(Boolean(binance.showQrFromAddress));
            }
            if (binance.displayConfig || binance.display_config) {
              setMethodConfig(binance.displayConfig || binance.display_config);
            }
            if (binance.minAmount !== undefined && binance.minAmount !== null) {
              setMinAmount(Number(binance.minAmount) || 1);
            }
            if (binance.maxAmount !== undefined && binance.maxAmount !== null && Number(binance.maxAmount) > 0) {
              setMaxAmount(Number(binance.maxAmount));
            }
          }
        }
      } catch (err) {
        console.warn("Could not load binance_pay method settings:", err);
      } finally {
        if (isMounted) setLoadingMethod(false);
      }
    }
    loadMethod();
    return () => {
      isMounted = false;
    };
  }, []);

  // Polling for deposit status when in verify / submitted state
  useEffect(() => {
    if (!depositId || step === "approved" || step === "rejected") {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const res = await apiRequest<{
          id: number;
          status: string;
          amountUsd: number;
          currency: string;
        }>(`/deposits/${depositId}/status`);

        if (res?.status) {
          setCurrentStatus(res.status);
          if (res.status === "approved") {
            setStep("approved");
            toast.success("تهانينا! تم تأكيد إيداع Binance Pay وإضافة الرصيد إلى محفظتك بنجاح.");
          } else if (res.status === "rejected") {
            setStep("rejected");
            toast.error("تم رفض طلب الإيداع. يرجى مراجعة الدعم الفني أو التأكد من رقم العملية.");
          }
        }
      } catch (err) {
        // Silently log polling errors
        console.debug("Status polling error:", err);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [depositId, step]);

  const handleCopyWallet = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success("تم نسخ رقم حساب Binance Pay بنجاح");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("فشل نسخ رقم الحساب");
    }
  };

  // Step 1: Create Invoice
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || isNaN(num) || num <= 0) {
      toast.error("يرجى إدخال مبلغ صالح");
      return;
    }
    if (minAmount && num < minAmount) {
      toast.error(`الحد الأدنى للإيداع هو ${minAmount} ${currency}`);
      return;
    }
    if (maxAmount && num > maxAmount) {
      toast.error(`الحد الأقصى للإيداع هو ${maxAmount} ${currency}`);
      return;
    }

    setIsCreatingInvoice(true);
    try {
      const res = await apiRequest<{
        success: boolean;
        depositId: number;
        invoiceId: number;
        amountUsd: number;
        currency: string;
        status: string;
      }>("/deposits/binance/create", {
        method: "POST",
        body: JSON.stringify({
          amount: num,
          currency: "USDT",
        }),
      });

      if (res?.depositId) {
        setDepositId(res.depositId);
        setStep("verify");
        toast.success("تم إنشاء الفاتورة! يرجى تحويل المبلغ ثم إدخال رقم العملية للتأكيد.");
      } else {
        toast.error("فشل إنشاء الفاتورة، يرجى المحاولة لاحقاً");
      }
    } catch (err: any) {
      console.error("Create binance invoice error:", err);
      toast.error(err?.message || "تعذر الاتصال بالخادم لإنشاء الفاتورة");
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  // Step 2: Submit Transaction Ref
  const handleSubmitRef = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRef = transactionRef.trim();
    if (!cleanRef) {
      toast.error("يرجى إدخال رقم العملية (Transaction ID / Order ID)");
      return;
    }

    if (!depositId) {
      toast.error("بيانات الفاتورة غير مكتملة، يرجى إعادة المحاولة");
      return;
    }

    setIsSubmittingRef(true);
    try {
      const res = await apiRequest<{
        success: boolean;
        depositId: number;
        status: string;
      }>("/deposits/binance/submit-ref", {
        method: "POST",
        body: JSON.stringify({
          depositId,
          transactionRef: cleanRef,
        }),
      });

      if (res?.success) {
        setIsSubmitted(true);
        toast.success("تم إرسال رقم العملية بنجاح! الطلب قيد المراجعة اليدوية من قبل الإدارة.");
      } else {
        toast.error("فشل إرسال رقم العملية");
      }
    } catch (err: any) {
      console.error("Submit transaction ref error:", err);
      toast.error(err?.message || "تعذر إرسال رقم العملية، يرجى التحقق وإعادة المحاولة");
    } finally {
      setIsSubmittingRef(false);
    }
  };

  const hasCustomQrImage = Boolean(qrImage && qrImage.trim() !== "");
  const canRenderQrFromAddress = Boolean(showQrFromAddress && walletAddress && walletAddress.trim() !== "");
  const shouldDisplayQr = hasCustomQrImage || canRenderQrFromAddress;
  const qrValue = walletAddress || "";
  const numAmount = parseFloat(amount) || 0;
  const suggestedAmounts = methodConfig?.suggested_amounts || [5, 10, 20, 50, 100, 200];

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 sm:py-8 space-y-6" dir="rtl">
      {/* Top Bar with Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/wallet">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors p-2 -mr-2 rounded-xl hover:bg-[var(--theme-card)]"
          >
            <ArrowRight className="w-4 h-4" />
            <span>الرجوع للمحفظة</span>
          </button>
        </Link>
        <span className="text-xs font-bold text-[var(--theme-binance,#F0B90B)] bg-[var(--theme-binance,#F0B90B)]/10 px-3 py-1 rounded-full border border-[var(--theme-binance,#F0B90B)]/25 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 2L6.5 7.5L8.5 9.5L12 6L15.5 9.5L17.5 7.5L12 2ZM2 12L7.5 17.5L9.5 15.5L6 12L9.5 8.5L7.5 6.5L2 12ZM12 22L17.5 16.5L15.5 14.5L12 18L8.5 14.5L6.5 16.5L12 22ZM22 12L16.5 6.5L14.5 8.5L18 12L14.5 15.5L16.5 17.5L22 12ZM12 9.5L9.5 12L12 14.5L14.5 12L12 9.5Z" />
          </svg>
          Binance Pay
        </span>
      </div>

      {/* Main Container Card */}
      <div className="bg-[var(--theme-card)] rounded-3xl border border-[var(--theme-border)] shadow-sm overflow-hidden p-5 sm:p-7 space-y-6">
        
        {/* Step Indicator Header */}
        <div className="border-b border-[var(--theme-border)] pb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[var(--theme-binance,#F0B90B)]/10 border border-[var(--theme-binance,#F0B90B)]/25 flex items-center justify-center text-[var(--theme-binance,#F0B90B)] font-bold shadow-xs">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2L6.5 7.5L8.5 9.5L12 6L15.5 9.5L17.5 7.5L12 2ZM2 12L7.5 17.5L9.5 15.5L6 12L9.5 8.5L7.5 6.5L2 12ZM12 22L17.5 16.5L15.5 14.5L12 18L8.5 14.5L6.5 16.5L12 22ZM22 12L16.5 6.5L14.5 8.5L18 12L14.5 15.5L16.5 17.5L22 12ZM12 9.5L9.5 12L12 14.5L14.5 12L12 9.5Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-[var(--theme-text-primary)] tracking-tight">
                  {step === "invoice" && "إنشاء فاتورة Binance Pay"}
                  {step === "verify" && "تأكيد عملية الدفع"}
                  {step === "approved" && "تم تأكيد الإيداع بنجاح"}
                  {step === "rejected" && "تم رفض طلب الإيداع"}
                </h2>
                <p className="text-xs text-[var(--theme-text-secondary)] mt-0.5">
                  {step === "invoice" && "حدد المبلغ المطلوب وامسح الرمز لإتمام الدفع"}
                  {step === "verify" && "أدخل رقم العملية (Transaction Ref) لتأكيد الإيداع"}
                  {step === "approved" && "تم شحن رصيد حسابك بنجاح"}
                  {step === "rejected" && "يرجى التواصل مع الدعم الفني للاستفسار"}
                </p>
              </div>
            </div>

            {/* Stepper badge */}
            {(step === "invoice" || step === "verify") && (
              <div className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-[var(--theme-input-bg)] rounded-full border border-[var(--theme-border)]">
                <span className={step === "invoice" ? "text-[var(--theme-binance,#F0B90B)] font-bold" : "text-[var(--theme-text-muted)]"}>1</span>
                <span className="text-[var(--theme-text-muted)]/60">/</span>
                <span className={step === "verify" ? "text-[var(--theme-binance,#F0B90B)] font-bold" : "text-[var(--theme-text-muted)]"}>2</span>
              </div>
            )}
          </div>

          {/* Quick Notice Banner */}
          <div className="rounded-2xl p-3.5 bg-[var(--theme-binance,#F0B90B)]/10 border border-[var(--theme-binance,#F0B90B)]/25 flex items-start gap-2.5 text-xs text-[var(--theme-text-primary)]">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[var(--theme-binance,#F0B90B)]" />
            <div className="leading-relaxed">
              <strong>ملاحظة هامة:</strong> التحقق من إيداعات Binance Pay يتم يدوياً من قِبل إدارة المنصة خلال دقائق إلى بضع ساعات. يرجى التأكد من إدخال رقم العملية بدقة.
            </div>
          </div>
        </div>

        {/* STEP 1: Invoice Creation */}
        {step === "invoice" && (
          <form onSubmit={handleCreateInvoice} className="space-y-6">
            
            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-bold text-[var(--theme-text-primary)] flex items-center justify-between">
                <span>المبلغ المطلوب إيداعه (USDT):</span>
                {minAmount > 0 && (
                  <span className="text-[11px] font-normal text-[var(--theme-text-muted)]">
                    الحد الأدنى: {minAmount} USDT
                  </span>
                )}
              </label>

              <div className="relative">
                <Input
                  type="number"
                  step="any"
                  min={minAmount}
                  max={maxAmount}
                  placeholder="أدخل المبلغ..."
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 text-lg font-bold pl-16 rounded-2xl bg-[var(--theme-input-bg)] border-[var(--theme-border)] text-[var(--theme-text-primary)] focus-visible:ring-[var(--theme-primary)]/20"
                  required
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--theme-text-secondary)] bg-[var(--theme-card)] px-2 py-1 rounded-lg border border-[var(--theme-border)]">
                  USDT
                </div>
              </div>

              {/* Suggested Amounts */}
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestedAmounts.map((val: number) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(String(val))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      parseFloat(amount) === val
                        ? "bg-[var(--theme-binance,#F0B90B)]/15 text-[var(--theme-binance,#F0B90B)] border-[var(--theme-binance,#F0B90B)]/30"
                        : "bg-[var(--theme-input-bg)] hover:bg-[var(--theme-card-hover)] text-[var(--theme-text-secondary)] border-[var(--theme-border)]"
                    }`}
                  >
                    ${val}
                  </button>
                ))}
              </div>
            </div>

            {/* QR Code and Account ID Preview */}
            <div className="bg-[var(--theme-input-bg)] border border-[var(--theme-border)] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5">
              {/* QR Rendering Section */}
              {hasCustomQrImage ? (
                <div
                  onClick={() => setShowLightbox(true)}
                  className="relative group cursor-pointer w-36 h-36 bg-white p-2.5 rounded-2xl border border-[var(--theme-border)] shadow-xs flex items-center justify-center shrink-0"
                  title="اضغط للتكبير"
                >
                  <img
                    src={qrImage}
                    alt="Binance Pay QR"
                    className="w-full h-full object-contain rounded-xl"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                    <Maximize2 className="w-4 h-4" />
                    <span>تكبير</span>
                  </div>
                </div>
              ) : canRenderQrFromAddress ? (
                <div
                  onClick={() => setShowLightbox(true)}
                  className="relative group cursor-pointer w-36 h-36 bg-white p-2.5 rounded-2xl border border-[var(--theme-border)] shadow-xs flex items-center justify-center shrink-0"
                  title="اضغط للتكبير"
                >
                  <QRCodeSVG
                    value={walletAddress}
                    size={124}
                    level="M"
                    className="w-full h-full"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                    <Maximize2 className="w-4 h-4" />
                    <span>تكبير</span>
                  </div>
                </div>
              ) : (
                <div className="w-36 h-36 bg-[var(--theme-card)] rounded-2xl border border-dashed border-[var(--theme-border)] flex flex-col items-center justify-center text-[var(--theme-text-muted)] p-3 text-center shrink-0">
                  <AlertCircle className="w-7 h-7 mb-1.5 text-[var(--theme-binance,#F0B90B)]/80" />
                  <p className="text-xs font-bold text-[var(--theme-text-primary)]">لا يوجد QR متاح</p>
                  <p className="text-[10px] text-[var(--theme-text-muted)] mt-0.5 leading-tight">
                    استخدم معرّف الحساب
                  </p>
                </div>
              )}

              {/* Account details */}
              <div className="space-y-3 flex-1 text-center sm:text-right w-full">
                <div>
                  <div className="text-xs text-[var(--theme-text-secondary)] font-medium mb-1">
                    معرّف حساب Binance Pay (Pay ID):
                  </div>
                  {walletAddress ? (
                    <div className="flex items-center justify-between bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-xl px-3 py-2">
                      <span className="font-mono text-xs sm:text-sm font-bold text-[var(--theme-text-primary)] truncate select-all">
                        {walletAddress}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyWallet}
                        className="text-xs font-semibold text-[var(--theme-binance,#F0B90B)] hover:opacity-80 p-1 rounded hover:bg-[var(--theme-binance,#F0B90B)]/10 transition-colors flex items-center gap-1 shrink-0 mr-1"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? "تم النسخ" : "نسخ"}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-xl px-3 py-2 text-xs text-[var(--theme-text-muted)] text-center">
                      يرجى التواصل مع الإدارة لتعيين معرف الدفع
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-[var(--theme-text-muted)] leading-relaxed">
                  {shouldDisplayQr
                    ? "يمكنك مسح الرمز مباشرة من تطبيق Binance أو التحويل يدويًا عبر معرّف الحساب أعلاه."
                    : "يرجى نسخ معرّف الحساب أعلاه وإتمام الدفع من داخل تطبيق Binance."}
                </p>
              </div>
            </div>

            {/* Submit Button to create invoice & go to step 2 */}
            <Button
              type="submit"
              disabled={isCreatingInvoice || numAmount <= 0}
              className="w-full h-12 text-sm font-bold rounded-2xl bg-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] text-[var(--theme-text-on-primary,var(--theme-background))] shadow-sm transition-all"
            >
              {isCreatingInvoice ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري فتح الفاتورة...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>متابعة وتأكيد الدفع ({amount || 0} USDT)</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </div>
              )}
            </Button>
          </form>
        )}

        {/* STEP 2: Invoice Verification & Transaction Ref Input */}
        {step === "verify" && (
          <div className="space-y-6">
            {/* Invoice Info Box */}
            <div className="bg-[var(--theme-input-bg)] rounded-2xl p-4 border border-[var(--theme-border)] space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[var(--theme-border)]">
                <span className="text-[var(--theme-text-secondary)]">رقم الفاتورة:</span>
                <span className="font-mono font-bold text-[var(--theme-text-primary)]">#{depositId}</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[var(--theme-border)]">
                <span className="text-[var(--theme-text-secondary)]">المبلغ المطلوب:</span>
                <span className="font-bold text-[var(--theme-binance,#F0B90B)] text-sm">{amount} USDT</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[var(--theme-border)]">
                <span className="text-[var(--theme-text-secondary)]">معرف Binance Pay:</span>
                <span className="font-mono font-bold text-[var(--theme-text-primary)]">{walletAddress}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--theme-text-secondary)]">حالة الطلب:</span>
                <span className="inline-flex items-center gap-1 font-bold text-[var(--theme-warning,#F59E0B)] bg-[var(--theme-warning,#F59E0B)]/10 px-2 py-0.5 rounded-md">
                  <Clock className="w-3 h-3" />
                  {isSubmitted ? "قيد المراجعة اليدوية" : "بانتظار التحويل ورقم العملية"}
                </span>
              </div>
            </div>

            {/* QR Code Quick View in Step 2 */}
            {shouldDisplayQr && (
              <div className="flex items-center gap-4 p-3.5 bg-[var(--theme-input-bg)] rounded-2xl border border-[var(--theme-border)]">
                <div 
                  onClick={() => setShowLightbox(true)}
                  className="w-16 h-16 bg-white p-1 rounded-xl border border-[var(--theme-border)] shrink-0 cursor-pointer overflow-hidden flex items-center justify-center"
                  title="اضغط للتكبير"
                >
                  {hasCustomQrImage ? (
                    <img
                      src={qrImage}
                      alt="Binance Pay QR"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <QRCodeSVG
                      value={walletAddress}
                      size={56}
                      level="M"
                      className="w-full h-full"
                    />
                  )}
                </div>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-[var(--theme-text-primary)]">هل أتممت عملية التحويل من تطبيق بينانس؟</div>
                  <div className="text-[var(--theme-text-secondary)] text-[11px]">
                    قم بنسخ رقم العملية (Transaction ID / Order ID) من إيصال التحويل والصقه بالأسفل.
                  </div>
                </div>
              </div>
            )}

            {/* Transaction Ref Input Form */}
            <form onSubmit={handleSubmitRef} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold text-[var(--theme-text-primary)] flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-[var(--theme-binance,#F0B90B)]" />
                  <span>رقم العملية (Transaction Reference / ID):</span>
                </label>
                <Input
                  type="text"
                  placeholder="مثال: 248910284729103"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  disabled={isSubmitted || isSubmittingRef}
                  className="h-12 font-mono text-sm rounded-2xl bg-[var(--theme-input-bg)] border-[var(--theme-border)] text-[var(--theme-text-primary)] focus-visible:ring-[var(--theme-primary)]/20 text-left"
                  dir="ltr"
                  required
                />
                <p className="text-[11px] text-[var(--theme-text-muted)]">
                  تجد رقم العملية في تفاصيل الدفعة أو الإشعار داخل تطبيق Binance.
                </p>
              </div>

              {!isSubmitted ? (
                <Button
                  type="submit"
                  disabled={isSubmittingRef || !transactionRef.trim()}
                  className="w-full h-12 text-sm font-bold rounded-2xl bg-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] text-[var(--theme-text-on-primary,var(--theme-background))] shadow-sm transition-all"
                >
                  {isSubmittingRef ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري إرسال رقم العملية...</span>
                    </div>
                  ) : (
                    <span>تأكيد وإرسال طلب الإيداع</span>
                  )}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-[var(--theme-warning,#F59E0B)]/10 border border-[var(--theme-warning,#F59E0B)]/25 text-center space-y-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--theme-warning,#F59E0B)]/20 text-[var(--theme-warning,#F59E0B)] mx-auto flex items-center justify-center animate-pulse">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="font-bold text-sm text-[var(--theme-text-primary)]">
                      طلبك قيد المراجعة اليدوية
                    </div>
                    <p className="text-xs text-[var(--theme-text-secondary)] max-w-sm mx-auto">
                      تم استلام رقم العملية بنجاح. سنقوم بتحديث رصيدك فور مراجعة التحويل من قبل فريق الإدارة. يمكنك البقاء في هذه الصفحة أو الانتقال ومتابعة الحالة من سجل الإيداعات.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs text-[var(--theme-text-muted)]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--theme-binance,#F0B90B)]" />
                    <span>يتم فحص الحالة تلقائياً كل 5 ثوانٍ...</span>
                  </div>
                </div>
              )}
            </form>

            {/* Back to Step 1 or to Wallet */}
            <div className="pt-3 border-t border-[var(--theme-border)] flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setStep("invoice")}
                className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] font-semibold"
              >
                تعديل المبلغ أو إنشاء فاتورة جديدة
              </button>
              <Link href="/deposits">
                <span className="text-[var(--theme-primary)] hover:underline font-bold cursor-pointer">
                  سجل طلبات الإيداع
                </span>
              </Link>
            </div>
          </div>
        )}

        {/* STEP: Approved State */}
        {step === "approved" && (
          <div className="text-center py-6 space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-[var(--theme-success,#10B981)]/10 border border-[var(--theme-success,#10B981)]/20 text-[var(--theme-success,#10B981)] mx-auto flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-[var(--theme-text-primary)]">
                تم قبول وإيداع الرصيد بنجاح!
              </h3>
              <p className="text-xs sm:text-sm text-[var(--theme-text-secondary)] max-w-md mx-auto">
                تمت مراجعة عملية تحويل Binance Pay بنجاح وإضافة المبلغ ({amount} USDT) إلى محفظتك.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center max-w-xs mx-auto">
              <Link href="/wallet">
                <Button className="w-full rounded-2xl bg-[var(--theme-success,#10B981)] hover:opacity-90 text-white font-bold">
                  عرض المحفظة والرصيد
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full rounded-2xl font-bold border-[var(--theme-border)] text-[var(--theme-text-primary)]">
                  الرئيسية والمتجر
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* STEP: Rejected State */}
        {step === "rejected" && (
          <div className="text-center py-6 space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-[var(--theme-error,#EF4444)]/10 border border-[var(--theme-error,#EF4444)]/20 text-[var(--theme-error,#EF4444)] mx-auto flex items-center justify-center shadow-sm">
              <XCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-[var(--theme-text-primary)]">
                تم رفض طلب الإيداع
              </h3>
              <p className="text-xs sm:text-sm text-[var(--theme-text-secondary)] max-w-md mx-auto">
                تعذر تأكيد عملية الدفع. يرجى التأكد من صحة رقم العملية والمبلغ المحول، أو التواصل مع فريق الدعم الفني.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center max-w-xs mx-auto">
              <Button
                type="button"
                onClick={() => {
                  setStep("invoice");
                  setIsSubmitted(false);
                  setTransactionRef("");
                }}
                className="w-full rounded-2xl bg-[var(--theme-primary)] text-[var(--theme-text-on-primary,var(--theme-background))] font-bold"
              >
                محاولة مرة أخرى
              </Button>
              <Link href="/contact">
                <Button variant="outline" className="w-full rounded-2xl font-bold border-[var(--theme-border)] text-[var(--theme-text-primary)]">
                  تواصل مع الدعم
                </Button>
              </Link>
            </div>
          </div>
        )}
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
              className="absolute top-3 left-3 w-8 h-8 rounded-full bg-[var(--theme-input-bg)] flex items-center justify-center text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center justify-center gap-2 text-[var(--theme-binance,#F0B90B)] font-bold text-sm">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2L6.5 7.5L8.5 9.5L12 6L15.5 9.5L17.5 7.5L12 2ZM2 12L7.5 17.5L9.5 15.5L6 12L9.5 8.5L7.5 6.5L2 12ZM12 22L17.5 16.5L15.5 14.5L12 18L8.5 14.5L6.5 16.5L12 22ZM22 12L16.5 6.5L14.5 8.5L18 12L14.5 15.5L16.5 17.5L22 12ZM12 9.5L9.5 12L12 14.5L14.5 12L12 9.5Z" />
              </svg>
              <span>رمز استجابة Binance Pay (QR)</span>
            </div>
            <div className="w-64 h-64 mx-auto p-3 bg-white rounded-2xl border flex items-center justify-center overflow-hidden">
              {hasCustomQrImage ? (
                <img
                  src={qrImage}
                  alt="Binance Pay QR"
                  className="w-full h-full object-contain rounded-xl"
                />
              ) : (
                <QRCodeSVG
                  value={walletAddress}
                  size={240}
                  level="M"
                  className="w-full h-full"
                />
              )}
            </div>
            <div className="font-mono text-xs text-[var(--theme-text-secondary)] break-all bg-[var(--theme-input-bg)] p-2.5 rounded-xl">
              {walletAddress}
            </div>
            <Button
              type="button"
              onClick={() => setShowLightbox(false)}
              className="w-full rounded-xl bg-[var(--theme-primary)] text-[var(--theme-text-on-primary,var(--theme-background))] font-bold"
            >
              إغلاق
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DepositBinancePay;
