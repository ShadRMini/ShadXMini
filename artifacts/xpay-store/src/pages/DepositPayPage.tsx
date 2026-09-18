import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  ChevronRight,
  CheckCircle2,
  Copy,
  Wallet,
  ShieldCheck,
  CreditCard,
  QrCode,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Clock,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPublicJson } from "@/lib/public-api";
import { SessionTimer } from "@/components/SessionTimer";

type TelegramIdentity = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  initDataRaw: string;
};

type UiPaymentMethod = {
  code: string;
  name: string;
  subtitle?: string;
  instructions?: string;
  walletAddress?: string;
  qrImage?: string;
};

const TELEGRAM_IDENTITY_CACHE_KEY = "xpay_telegram_identity";
const QR_ZOOM_STORAGE_KEY = "xpay_shamcash_qr_size";

function parseIdentityFromInitDataRaw(rawInitData?: string): TelegramIdentity | null {
  try {
    const raw = String(rawInitData || "").trim();
    if (!raw) return null;
    const params = new URLSearchParams(raw);
    const userRaw = params.get("user");
    if (!userRaw) return null;
    const user = JSON.parse(userRaw);
    if (!user?.id) return null;

    return {
      id: String(user.id),
      username: String(user.username || `${user.first_name || ""} ${user.last_name || ""}`.trim() || "TelegramUser"),
      firstName: String(user.first_name || ""),
      lastName: String(user.last_name || ""),
      initDataRaw: raw,
    };
  } catch {
    return null;
  }
}

function getTelegramWebAppDataFromUrl(): string {
  try {
    const search = new URLSearchParams(window.location.search || "");
    const hashRaw = String(window.location.hash || "").replace(/^#/, "");
    const hash = new URLSearchParams(hashRaw);
    return String(search.get("tgWebAppData") || hash.get("tgWebAppData") || "").trim();
  } catch {
    return "";
  }
}

function parseIdentityFromWebAppData(webAppData?: string): TelegramIdentity | null {
  const raw = String(webAppData || "").trim();
  if (!raw) return null;

  const attempts = [raw];
  try {
    attempts.push(decodeURIComponent(raw));
  } catch {
    // keep raw value
  }

  for (const item of attempts) {
    const parsed = parseIdentityFromInitDataRaw(item);
    if (parsed?.id) return parsed;
  }

  return null;
}

function readTelegramIdentity(): TelegramIdentity | null {
  try {
    const tg = (window as any)?.Telegram?.WebApp;
    if (tg?.ready) tg.ready();
    if (tg?.expand) tg.expand();
    const user = tg?.initDataUnsafe?.user;
    const initData = String(tg?.initData || "").trim();

    if (user?.id != null) {
      const identity: TelegramIdentity = {
        id: String(user.id),
        username: String(user.username || `${user.first_name || ""} ${user.last_name || ""}`.trim() || "TelegramUser"),
        firstName: String(user.first_name || ""),
        lastName: String(user.last_name || ""),
        initDataRaw: initData,
      };
      localStorage.setItem(TELEGRAM_IDENTITY_CACHE_KEY, JSON.stringify(identity));
      return identity;
    }

    const identity = parseIdentityFromWebAppData(getTelegramWebAppDataFromUrl());
    if (identity?.id) {
      localStorage.setItem(TELEGRAM_IDENTITY_CACHE_KEY, JSON.stringify(identity));
      return identity;
    }

    const cachedRaw = localStorage.getItem(TELEGRAM_IDENTITY_CACHE_KEY) || localStorage.getItem("tg_identity_cache");
    if (!cachedRaw) return null;
    const cached = JSON.parse(cachedRaw);
    return cached?.id ? (cached as TelegramIdentity) : null;
  } catch {
    return null;
  }
}

export default function DepositPayPage() {
  const [matchRoute, routeParams] = useRoute("/deposit/pay/:invoiceId");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const query = new URLSearchParams(window.location.search || "");
  const invoiceId = routeParams?.invoiceId || String(query.get("invoiceId") || "").trim();
  const expiresAtParam = String(query.get("expiresAt") || "").trim();
  const urlAmount = String(query.get("amount") || "").trim();
  const urlCurrency = String(query.get("currency") || "USD").trim();

  // Component State
  const [transactionRef, setTransactionRef] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [amount, setAmount] = useState(() => {
    if (urlAmount) return urlAmount;
    try {
      const cached = localStorage.getItem(`shamcash_pending_invoice_${invoiceId}`);
      if (cached) return JSON.parse(cached)?.amount || "";
    } catch {
      // ignore
    }
    return "";
  });
  const [currency, setCurrency] = useState(() => {
    if (urlCurrency) return urlCurrency;
    try {
      const cached = localStorage.getItem(`shamcash_pending_invoice_${invoiceId}`);
      if (cached) return JSON.parse(cached)?.currency || "USD";
    } catch {
      // ignore
    }
    return "USD";
  });
  const [expiresAt, setExpiresAt] = useState<string | null>(() => {
    if (expiresAtParam) return expiresAtParam;
    try {
      const cached = localStorage.getItem(`shamcash_pending_invoice_${invoiceId}`);
      if (cached) return JSON.parse(cached)?.expiresAt || null;
    } catch {
      // ignore
    }
    return null;
  });
  const [isExpired, setIsExpired] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<UiPaymentMethod | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [depositStatus, setDepositStatus] = useState<string>("pending");
  const [pollingActive, setPollingActive] = useState(true);

  // Zoom control (200px to 600px, default 280px capped at max-w-[320px])
  const [qrSize, setQrSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(QR_ZOOM_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 200 && parsed <= 600) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
    return 280;
  });

  const handleZoomChange = (delta: number) => {
    setQrSize((prev) => {
      const next = Math.min(600, Math.max(200, prev + delta));
      try {
        localStorage.setItem(QR_ZOOM_STORAGE_KEY, String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const copyToClipboard = (text: string, label = "تم النسخ بنجاح") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const apiBaseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

  // Load payment methods to fetch walletAddress and QR image
  useEffect(() => {
    let cancelled = false;
    getPublicJson<UiPaymentMethod[]>("/payment-methods")
      .then((rows) => {
        if (cancelled || !Array.isArray(rows)) return;
        const matched = rows.find(
          (m) => m.code === "sham_cash_auto" || m.code === "sham_cash" || m.code?.includes("sham")
        );
        if (matched) {
          setPaymentMethod(matched);
        }
      })
      .catch((err) => {
        console.warn("[DepositPay] Could not load payment method details:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Polling check invoice status every 30s as per Sam API recommendations
  const checkInvoiceStatus = useCallback(async () => {
    if (!invoiceId || !pollingActive || depositStatus !== "pending") return;

    try {
      const tg = readTelegramIdentity();
      const webAppData = getTelegramWebAppDataFromUrl();
      const token = typeof window !== "undefined" ? localStorage.getItem("xpay_store_auth_token") : null;

      const resp = await fetch(`${apiBaseUrl}/api/deposits/shamcash/invoice/${encodeURIComponent(invoiceId)}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(tg?.id ? { "x-telegram-id": tg.id } : {}),
          ...(tg?.initDataRaw || webAppData
            ? { "x-telegram-init-data": encodeURIComponent(tg?.initDataRaw || webAppData) }
            : {}),
        },
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.status === "approved") {
          setDepositStatus("approved");
          setPollingActive(false);
          toast.success("تم تأكيد الإيداع وإضافة الرصيد إلى محفظتك بنجاح!");
          queryClient.invalidateQueries({ queryKey: ["/api/me"] });
          queryClient.invalidateQueries({ queryKey: ["/api/deposits"] });
          setTimeout(() => {
            setLocation("/deposits");
          }, 1500);
        } else if (data.status === "rejected" || data.syncedStatus === "expired") {
          setDepositStatus("rejected");
          setIsExpired(true);
          setPollingActive(false);
        }
        if (data.amountUsd && !amount) {
          setAmount(String(data.currency === "SYP" ? data.amountSyp : data.amountUsd));
          setCurrency(data.currency || "USD");
        }
      }
    } catch (e) {
      console.warn("[DepositPay] Poll invoice check failed:", e);
    }
  }, [invoiceId, pollingActive, depositStatus, apiBaseUrl, queryClient, setLocation, amount]);

  // Polling interval 30s
  useEffect(() => {
    if (!invoiceId || !pollingActive || depositStatus !== "pending") return;
    const interval = setInterval(checkInvoiceStatus, 30000);
    return () => clearInterval(interval);
  }, [checkInvoiceStatus, invoiceId, pollingActive, depositStatus]);

  // Manual verify via transactionRef
  const handleVerify = async () => {
    if (!invoiceId) {
      toast.error("رقم الفاتورة غير موجود. يرجى إعادة بدء عملية الإيداع.");
      return;
    }

    const cleanRef = transactionRef.trim();
    if (!/^\d+$/.test(cleanRef)) {
      toast.error("رقم العملية يجب أن يحتوي على أرقام فقط");
      return;
    }

    try {
      setVerifying(true);
      toast.info("تم إرسال رقم العملية للتحقق، يرجى الانتظار...");
      const tg = readTelegramIdentity();
      const webAppData = getTelegramWebAppDataFromUrl();
      const token = typeof window !== "undefined" ? localStorage.getItem("xpay_store_auth_token") : null;

      const resp = await fetch(`${apiBaseUrl}/api/deposits/shamcash/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(tg?.id ? { "x-telegram-id": tg.id } : {}),
          ...(tg?.initDataRaw || webAppData
            ? { "x-telegram-init-data": encodeURIComponent(tg?.initDataRaw || webAppData) }
            : {}),
        },
        body: JSON.stringify({
          invoiceId,
          transactionRef: cleanRef,
          telegramId: tg?.id || "",
          telegramInitData: tg?.initDataRaw || webAppData || "",
          tgWebAppData: webAppData || "",
        }),
      });

      const payload: any = await resp.json().catch(() => ({}));
      if (resp.ok && (payload?.verified || payload?.success || payload?.status === "OK")) {
        setDepositStatus("approved");
        setPollingActive(false);
        toast.success(payload?.message || "تم التحقق بنجاح ✅");
        queryClient.invalidateQueries({ queryKey: ["/api/me"] });
        queryClient.invalidateQueries({ queryKey: ["/api/deposits"] });
        // Save to cache
        try {
          localStorage.removeItem(`shamcash_pending_invoice_${invoiceId}`);
        } catch {
          // ignore
        }
        setTimeout(() => {
          setLocation("/deposits");
        }, 3000);
        return;
      }

      const errCode = payload?.code || payload?.error || "";
      if (errCode === "EXPIRED" || payload?.syncedStatus === "expired") {
        setIsExpired(true);
        toast.error("انتهت صلاحية الفاتورة، يرجى إنشاء فاتورة جديدة");
        return;
      }

      if (errCode === "NOT_FOUND") {
        toast.error("الفاتورة غير موجودة");
        return;
      }

      if (errCode === "VALIDATION_ERROR") {
        toast.error("بيانات غير صحيحة، تأكد من رقم العملية");
        return;
      }

      if (errCode === "PROVIDER_ERROR" || errCode === "WALLET_UPSTREAM_ERROR") {
        toast.error("رفض المزود العملية، يرجى المحاولة مجدداً");
        return;
      }

      if (errCode === "TRANSACTION_REF_ALREADY_USED") {
        toast.error("رقم العملية غير صالح أو تم استخدامه مسبقًا.");
        return;
      }

      toast.error(payload?.message || "تعذر التحقق من رقم العملية. تأكد من الرقم وحاول مجددًا.");
    } catch (error: any) {
      toast.error(error?.message || "فشل التحقق من العملية");
    } finally {
      setVerifying(false);
    }
  };

  const rawWallet = paymentMethod?.walletAddress || "";
  const walletAddress = rawWallet && rawWallet !== "SHAM-CASH-PAY" ? rawWallet : "";
  const displayWalletAddress = walletAddress || "يرجى التواصل مع الدعم";
  const qrImageSrc = paymentMethod?.qrImage || null;

  return (
    <div
      className="min-h-screen pb-24 animate-in slide-in-from-right-4 duration-300"
      dir="rtl"
      style={{
        backgroundColor: "var(--theme-background)",
        color: "var(--theme-text-primary)",
      }}
    >
      {/* Top Header */}
      <div
        className="sticky top-0 z-20 backdrop-blur-xl px-4 py-3.5 flex items-center justify-between border-b shadow-md"
        style={{
          backgroundColor: "var(--theme-background)",
          borderColor: "color-mix(in srgb, var(--theme-accent) 25%, transparent)",
        }}
      >
        <div className="flex items-center gap-3">
          <Link href="/deposit">
            <div
              className="p-2 rounded-xl border transition-colors cursor-pointer shadow-xs flex items-center justify-center"
              style={{
                backgroundColor: "var(--theme-card)",
                borderColor: "color-mix(in srgb, var(--theme-accent) 40%, transparent)",
                color: "var(--theme-primary)",
              }}
            >
              <ChevronRight className="w-5 h-5" />
            </div>
          </Link>
          <div>
            <h1
              className="font-bold text-base sm:text-lg"
              style={{ color: "var(--theme-primary)" }}
            >
              تفاصيل دفع الفاتورة
            </h1>
            <p className="text-[11px]" style={{ color: "var(--theme-text-muted)" }}>
              قم بالتحويل عبر شام كاش ثم أدخل رقم العملية
            </p>
          </div>
        </div>

        {/* Session Timer */}
        <SessionTimer
          expiresAt={expiresAt}
          durationMinutes={15}
          onExpired={() => {
            setIsExpired(true);
            toast.error("انتهت صلاحية جلسة الفاتورة");
          }}
        />
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6 mt-2">
        {/* Expired Notification Banner */}
        {isExpired && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-between gap-4 text-red-300 animate-in fade-in">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold block">انتهت صلاحية هذه الفاتورة</span>
                يرجى العودة لصفحة الإيداع وإنشاء فاتورة جديدة.
              </div>
            </div>
            <Link href="/deposit">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl border-red-500/40 text-red-200 hover:bg-red-500/20 text-xs shrink-0"
              >
                فاتورة جديدة
              </Button>
            </Link>
          </div>
        )}

        {/* Success Banner */}
        {depositStatus === "approved" && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold block">تم تأكيد الإيداع بنجاح!</span>
              تمت إضافة الرصيد إلى محفظتك، جاري التوجيه لسجل العمليات...
            </div>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* =========================================================================
              LEFT COLUMN: QR Code & Wallet Address
          ========================================================================= */}
          <div className="lg:col-span-5 space-y-5">
            {/* 1️⃣ QR Code Card */}
            <div
              className="rounded-3xl p-5 sm:p-6 shadow-xl border flex flex-col items-center text-center relative overflow-hidden"
              style={{
                backgroundColor: "var(--theme-card)",
                borderColor: "color-mix(in srgb, var(--theme-accent) 30%, transparent)",
              }}
            >
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border mb-4"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--theme-accent) 15%, transparent)",
                  borderColor: "color-mix(in srgb, var(--theme-accent) 35%, transparent)",
                  color: "var(--theme-primary)",
                }}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>رمز التحويل (QR Code)</span>
              </div>

              {/* QR Image Container (Max 300x300 constraint compliant) */}
              <div className="w-full flex justify-center items-center">
                <div
                  onClick={() => {
                    if (walletAddress || qrImageSrc) setLightboxOpen(true);
                  }}
                  className={`group relative rounded-2xl bg-white p-3.5 shadow-lg border-2 transition-transform duration-200 hover:scale-[1.02] active:scale-95 flex items-center justify-center aspect-square overflow-hidden ${
                    walletAddress || qrImageSrc ? "cursor-pointer" : "cursor-default"
                  }`}
                  style={{
                    width: `${Math.min(300, qrSize)}px`,
                    maxWidth: "min(300px, 100%)",
                    borderColor: "color-mix(in srgb, var(--theme-accent) 40%, transparent)",
                  }}
                  title={walletAddress || qrImageSrc ? "انقر لتكبير رمز الـ QR بالحجم الكامل" : undefined}
                >
                  {qrImageSrc ? (
                    <img
                      src={qrImageSrc}
                      alt="Sham Cash QR Code"
                      width={1080}
                      height={1080}
                      className="w-full h-full object-contain rounded-xl select-none"
                      loading="eager"
                    />
                  ) : walletAddress ? (
                    <QRCodeSVG
                      value={walletAddress}
                      size={1080}
                      level="M"
                      className="w-full h-full"
                      style={{ width: "100%", height: "100%" }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-2 text-center text-amber-500 font-bold text-xs gap-1">
                      <AlertTriangle className="w-8 h-8 text-amber-500" />
                      <span>يرجى التواصل مع الدعم</span>
                    </div>
                  )}

                  {(walletAddress || qrImageSrc) && (
                    <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 p-2">
                      <Maximize2 className="w-6 h-6 text-amber-300 drop-shadow" />
                      <span className="text-[11px] font-bold bg-black/60 px-2.5 py-1 rounded-full">
                        انقر للتكبير
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Zoom Controls */}
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleZoomChange(-30)}
                  disabled={qrSize <= 200}
                  className="px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition disabled:opacity-40 cursor-pointer shadow-xs active:scale-95"
                  style={{
                    backgroundColor: "var(--theme-background)",
                    borderColor: "color-mix(in srgb, var(--theme-accent) 30%, transparent)",
                    color: "var(--theme-text-primary)",
                  }}
                  title="تصغير الرمز"
                >
                  <ZoomOut className="w-3.5 h-3.5" style={{ color: "var(--theme-primary)" }} />
                  <span>تصغير -</span>
                </button>

                <span
                  className="text-xs font-mono font-bold px-1"
                  style={{ color: "var(--theme-text-muted)" }}
                >
                  {Math.min(300, qrSize)}px
                </span>

                <button
                  type="button"
                  onClick={() => handleZoomChange(30)}
                  disabled={qrSize >= 300}
                  className="px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition disabled:opacity-40 cursor-pointer shadow-xs active:scale-95"
                  style={{
                    backgroundColor: "var(--theme-background)",
                    borderColor: "color-mix(in srgb, var(--theme-accent) 30%, transparent)",
                    color: "var(--theme-text-primary)",
                  }}
                  title="تكبير الرمز"
                >
                  <ZoomIn className="w-3.5 h-3.5" style={{ color: "var(--theme-primary)" }} />
                  <span>تكبير +</span>
                </button>
              </div>

              <p
                className="text-[11px] mt-2.5"
                style={{ color: "var(--theme-text-muted)" }}
              >
                امسح الرمز من تطبيق شام كاش أو انسخ المعرف أدناه
              </p>
            </div>

            {/* 2️⃣ Wallet Address Card */}
            <div
              className="rounded-3xl p-5 shadow-xl border text-center relative"
              style={{
                backgroundColor: "var(--theme-card)",
                borderColor: "color-mix(in srgb, var(--theme-accent) 30%, transparent)",
              }}
            >
              <div
                className="text-xs font-bold mb-2 flex items-center justify-center gap-1.5"
                style={{ color: "var(--theme-primary)" }}
              >
                <Wallet className="w-4 h-4" style={{ color: "var(--theme-primary)" }} />
                <span>عنوان المحفظة / معرف الحساب</span>
              </div>

              <div
                className="text-xl sm:text-2xl font-bold font-mono tracking-wider break-all select-all py-1"
                style={{ color: "var(--theme-primary)" }}
              >
                {displayWalletAddress}
              </div>

              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    if (walletAddress) {
                      copyToClipboard(walletAddress, "تم نسخ معرف المحفظة بنجاح");
                    } else {
                      toast.error("لا يوجد عنوان محفظة للنسخ — يرجى التواصل مع الدعم");
                    }
                  }}
                  className="px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-xs transition cursor-pointer shadow-md active:scale-95"
                  style={{
                    backgroundColor: "var(--theme-primary)",
                    color: "var(--theme-background)",
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ معرف المحفظة</span>
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              RIGHT COLUMN: Invoice details & Verification input
          ========================================================================= */}
          <div className="lg:col-span-7 space-y-5">
            {/* 3️⃣ Invoice & Financial Summary */}
            <div
              className="rounded-3xl p-5 sm:p-6 shadow-xl border space-y-4"
              style={{
                backgroundColor: "var(--theme-card)",
                borderColor: "color-mix(in srgb, var(--theme-accent) 30%, transparent)",
              }}
            >
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "color-mix(in srgb, var(--theme-accent) 20%, transparent)" }}>
                <h3
                  className="font-bold text-base sm:text-lg flex items-center gap-2"
                  style={{ color: "var(--theme-primary)" }}
                >
                  <CreditCard className="w-5 h-5" style={{ color: "var(--theme-primary)" }} />
                  <span>بيانات الفاتورة الحالية</span>
                </h3>
                <span
                  className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--theme-accent) 15%, transparent)",
                    borderColor: "color-mix(in srgb, var(--theme-accent) 35%, transparent)",
                    color: "var(--theme-primary)",
                  }}
                >
                  {depositStatus === "approved" ? "تم الدفع" : "بانتظار التحويل"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Invoice ID Box */}
                <div
                  className="p-3.5 rounded-2xl border flex items-center justify-between gap-2"
                  style={{
                    backgroundColor: "var(--theme-background)",
                    borderColor: "color-mix(in srgb, var(--theme-accent) 25%, transparent)",
                  }}
                >
                  <div className="overflow-hidden">
                    <span className="text-[11px] block font-bold" style={{ color: "var(--theme-text-muted)" }}>
                      رقم الفاتورة (Invoice ID)
                    </span>
                    <span className="text-xs font-mono font-bold truncate block select-all" style={{ color: "var(--theme-text-primary)" }}>
                      {invoiceId || "—"}
                    </span>
                  </div>
                  {invoiceId && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(invoiceId, "تم نسخ رقم الفاتورة")}
                      className="p-1.5 rounded-lg border hover:opacity-80 transition cursor-pointer shrink-0"
                      style={{
                        backgroundColor: "var(--theme-card)",
                        borderColor: "color-mix(in srgb, var(--theme-accent) 30%, transparent)",
                        color: "var(--theme-primary)",
                      }}
                      title="نسخ رقم الفاتورة"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Amount Box */}
                <div
                  className="p-3.5 rounded-2xl border flex items-center justify-between"
                  style={{
                    backgroundColor: "var(--theme-background)",
                    borderColor: "color-mix(in srgb, var(--theme-accent) 25%, transparent)",
                  }}
                >
                  <div>
                    <span className="text-[11px] block font-bold" style={{ color: "var(--theme-text-muted)" }}>
                      المبلغ المطلوب تحويله
                    </span>
                    <span className="text-base font-black font-mono" style={{ color: "var(--theme-primary)" }}>
                      {amount ? `${amount} ${currency}` : "حسب الفاتورة"}
                    </span>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-md"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--theme-accent) 15%, transparent)",
                      color: "var(--theme-primary)",
                    }}
                  >
                    {currency}
                  </span>
                </div>
              </div>
            </div>

            {/* 4️⃣ Instructions Card */}
            <div
              className="rounded-2xl p-4 sm:p-5 border shadow-md flex items-start gap-3.5"
              style={{
                backgroundColor: "color-mix(in srgb, var(--theme-secondary) 10%, transparent)",
                borderColor: "color-mix(in srgb, var(--theme-accent) 35%, transparent)",
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--theme-accent) 20%, transparent)",
                  borderColor: "color-mix(in srgb, var(--theme-accent) 40%, transparent)",
                  color: "var(--theme-primary)",
                }}
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed" style={{ color: "var(--theme-text-muted)" }}>
                <p className="font-bold" style={{ color: "var(--theme-primary)" }}>
                  خطوات إتمام الإيداع:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>افتح تطبيق شام كاش وحوّل المبلغ المطلوب إلى العنوان أعلاه.</li>
                  <li>انسخ <span className="font-bold text-white">رقم العملية (Transaction ID)</span> بعد إتمام التحويل.</li>
                  <li>ألصق رقم العملية في الحقل أدناه واضغط على زر التحقق.</li>
                </ol>
              </div>
            </div>

            {/* 5️⃣ Verification Input Card */}
            <div
              className="rounded-3xl p-5 sm:p-6 shadow-xl border space-y-4"
              style={{
                backgroundColor: "var(--theme-card)",
                borderColor: "color-mix(in srgb, var(--theme-accent) 35%, transparent)",
              }}
            >
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--theme-accent) 20%, transparent)" }}>
                <h3
                  className="font-bold text-base sm:text-lg flex items-center gap-2"
                  style={{ color: "var(--theme-primary)" }}
                >
                  <CheckCircle2 className="w-5 h-5" style={{ color: "var(--theme-primary)" }} />
                  <span>التحقق من رقم العملية</span>
                </h3>
                <span
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--theme-accent) 15%, transparent)",
                    color: "var(--theme-primary)",
                  }}
                >
                  تحقق آلي فوري
                </span>
              </div>

              {/* Transaction Ref Input */}
              <div>
                <label
                  className="text-xs sm:text-sm font-bold mb-2 block"
                  style={{ color: "var(--theme-primary)" }}
                >
                  أدخل رقم عملية شام كاش *
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="مثال: 123456789"
                  value={transactionRef}
                  disabled={verifying || isExpired || depositStatus === "approved"}
                  onChange={(e) => setTransactionRef(e.target.value.replace(/\D+/g, ""))}
                  className="h-13 rounded-xl text-base font-mono transition focus:ring-2"
                  style={{
                    backgroundColor: "var(--theme-input-bg, #3D3D3D)",
                    borderColor: "var(--theme-border, rgba(200, 164, 92, 0.4))",
                    color: "var(--theme-text-primary, #FFFFFF)",
                  }}
                />
              </div>

              {/* Verify Button */}
              <Button
                type="button"
                onClick={handleVerify}
                disabled={verifying || !transactionRef.trim() || !invoiceId || isExpired || depositStatus === "approved"}
                className="w-full h-13 rounded-2xl font-black text-base transition-all shadow-lg cursor-pointer active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: "var(--theme-primary)",
                  color: "var(--theme-background)",
                }}
              >
                {verifying ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>جاري التحقق من الفاتورة...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>تأكيد والتحقق من الإيداع</span>
                  </>
                )}
              </Button>

              {/* 6️⃣ Cancel & Return Button */}
              <Link href="/deposit">
                <button
                  type="button"
                  className="w-full mt-2 py-3 rounded-xl font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-2 hover:opacity-80 active:scale-98"
                  style={{
                    backgroundColor: "transparent",
                    borderColor: "color-mix(in srgb, var(--theme-accent) 40%, transparent)",
                    color: "var(--theme-text-muted)",
                  }}
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>إلغاء والرجوع لصفحة الإيداع</span>
                </button>
              </Link>

              <p
                className="text-xs text-center leading-relaxed pt-1"
                style={{ color: "var(--theme-text-muted)" }}
              >
                سيتم التحقق عبر مزود الدفع فوراً وإضافة المبلغ لحسابك دون تأخير.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal for QR Code */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh] bg-white rounded-3xl p-4 sm:p-6 shadow-2xl border-4 flex flex-col items-center"
            style={{
              borderColor: "var(--theme-accent)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 w-10 h-10 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center shadow-lg transition active:scale-90 cursor-pointer border-2 border-white"
            >
              <X className="w-5 h-5" />
            </button>

            {walletAddress || qrImageSrc ? (
              <>
                <div className="text-center mb-3">
                  <h4 className="text-base font-black text-zinc-900">
                    رمز استجابة شام كاش (1080x1080)
                  </h4>
                  <p className="text-xs font-mono font-bold text-zinc-600 mt-0.5 select-all">
                    {walletAddress}
                  </p>
                </div>

                <div className="w-[min(80vw,480px)] aspect-square flex items-center justify-center bg-white p-2 overflow-hidden">
                  {qrImageSrc ? (
                    <img
                      src={qrImageSrc}
                      alt="Sham Cash Full QR Code"
                      width={1080}
                      height={1080}
                      className="w-full h-full object-contain select-none"
                    />
                  ) : (
                    <QRCodeSVG
                      value={walletAddress}
                      size={1080}
                      level="M"
                      className="w-full h-full"
                      style={{ width: "100%", height: "100%" }}
                    />
                  )}
                </div>

                <div className="mt-4 flex gap-3 w-full justify-center">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(walletAddress, "تم نسخ عنوان المحفظة")}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md text-white bg-zinc-900 hover:bg-zinc-800"
                  >
                    <Copy className="w-4 h-4" />
                    <span>نسخ العنوان</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(false)}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs border border-zinc-300 text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
              </>
            ) : (
              <div className="p-8 text-center space-y-3">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
                <p className="text-sm font-bold text-zinc-900">لا توجد محفظة مُعدّة</p>
                <p className="text-xs text-zinc-500">يرجى التواصل مع الدعم</p>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  className="mt-4 px-6 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
