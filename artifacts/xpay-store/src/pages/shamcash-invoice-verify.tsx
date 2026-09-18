import { useState, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  ChevronRight,
  CheckCircle2,
  Clock3,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Copy,
  Wallet,
  Info,
  ShieldCheck,
  CreditCard,
  QrCode,
  Sparkles,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPublicJson } from "@/lib/public-api";

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

export default function ShamCashInvoiceVerify() {
  const [, params] = useRoute("/deposit/:method/invoice");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const query = new URLSearchParams(window.location.search || "");
  const invoiceId = String(query.get("invoiceId") || "").trim();
  const expiresAt = String(query.get("expiresAt") || "").trim();
  const urlAmount = String(query.get("amount") || "").trim();
  const urlCurrency = String(query.get("currency") || "").trim();

  // State
  const [transactionRef, setTransactionRef] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [amount, setAmount] = useState(urlAmount || "");
  const [currency, setCurrency] = useState(urlCurrency || "USD");
  const [paymentMethod, setPaymentMethod] = useState<UiPaymentMethod | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Zoom control (200px to 600px, default 320px capped at max-w-[400px])
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
    return 320;
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

  // Fetch payment method info to get the actual Sham Cash QR & wallet address
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
        console.warn("[ShamCash] Could not load payment method details:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const verifyAutoInvoice = async () => {
    if (!invoiceId) {
      toast.error("رقم الفاتورة غير موجود. ارجع وأعد تأكيد الإيداع.");
      return;
    }

    const cleanRef = transactionRef.trim();
    if (!/^\d+$/.test(cleanRef)) {
      toast.error("رقم العملية يجب أن يحتوي على أرقام فقط");
      return;
    }

    try {
      setVerifying(true);
      toast.info("تم إرسال رقم العملية للتحقق. انتظر النتيجة...");
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
      if (resp.ok && payload?.verified) {
        toast.success(payload?.message || "تم التحقق من الإيداع وإضافة الرصيد");
        queryClient.invalidateQueries({ queryKey: ["/api/me"] });
        queryClient.invalidateQueries({ queryKey: ["/api/deposits"] });
        setLocation("/deposits");
        return;
      }

      if (payload?.code === "EXPIRED") {
        toast.error("انتهت صلاحية الفاتورة. ارجع وأعد تأكيد الإيداع.");
        return;
      }

      if (payload?.code === "TRANSACTION_REF_ALREADY_USED") {
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

  if (params?.method !== "sham_cash_auto") {
    return (
      <div
        className="min-h-screen p-4 text-center pt-20"
        dir="rtl"
        style={{
          backgroundColor: "var(--theme-background)",
          color: "var(--theme-text-muted)",
        }}
      >
        صفحة التحقق مخصصة لشام كاش التلقائي فقط
      </div>
    );
  }

  const rawWallet = paymentMethod?.walletAddress || "";
  const walletAddress = rawWallet && rawWallet !== "SHAM-CASH-PAY" ? rawWallet : "";
  const displayWalletAddress = walletAddress || "يرجى التواصل مع الدعم";
  // Sham Cash QR Code image fallback if not configured in method
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
          <Link href="/deposit/sham_cash_auto">
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
              التحقق من إيداع شام كاش
            </h1>
            <p className="text-[11px]" style={{ color: "var(--theme-text-muted)" }}>
              أدخل رقم العملية لتأكيد الشحن فوراً
            </p>
          </div>
        </div>
        <span
          className="text-[11px] px-3 py-1 rounded-full font-bold border"
          style={{
            backgroundColor: "color-mix(in srgb, var(--theme-accent) 15%, transparent)",
            borderColor: "color-mix(in srgb, var(--theme-accent) 40%, transparent)",
            color: "var(--theme-primary)",
          }}
        >
          تحقق فوري تلقائي
        </span>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6 mt-2">
        {/* Layout: Responsive 1 col on mobile, 2 cols on desktop for optimal balance */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* =========================================================================
              LEFT COLUMN (or TOP on mobile):
              1️⃣ QR Code (with zoom controls and lightbox)
              2️⃣ Wallet Address directly below QR
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
              {/* Badge */}
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border mb-4"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--theme-accent) 15%, transparent)",
                  borderColor: "color-mix(in srgb, var(--theme-accent) 35%, transparent)",
                  color: "var(--theme-primary)",
                }}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>رمز الاستجابة السريعة (QR)</span>
              </div>

              {/* QR Image Container with dynamic sizing and 1:1 ratio */}
              <div className="w-full flex justify-center items-center">
                <div
                  onClick={() => {
                    if (walletAddress || qrImageSrc) setLightboxOpen(true);
                  }}
                  className={`group relative rounded-2xl bg-white p-3.5 shadow-lg border-2 transition-transform duration-200 hover:scale-[1.02] active:scale-95 flex items-center justify-center aspect-square overflow-hidden ${
                    walletAddress || qrImageSrc ? "cursor-pointer" : "cursor-default"
                  }`}
                  style={{
                    width: `${qrSize}px`,
                    maxWidth: "min(400px, 100%)",
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
                      <AlertCircle className="w-8 h-8 text-amber-500" />
                      <span>يرجى التواصل مع الدعم</span>
                    </div>
                  )}

                  {/* Hover Overlay Hint */}
                  {(walletAddress || qrImageSrc) && (
                    <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 p-2">
                      <Maximize2 className="w-7 h-7 text-amber-300 drop-shadow" />
                      <span className="text-xs font-bold bg-black/60 px-2.5 py-1 rounded-full">
                        انقر للتكبير (1080x1080)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Zoom Controls (+ / -) */}
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleZoomChange(-40)}
                  disabled={qrSize <= 200}
                  className="px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition disabled:opacity-40 cursor-pointer shadow-xs active:scale-95"
                  style={{
                    backgroundColor: "var(--theme-background)",
                    borderColor: "color-mix(in srgb, var(--theme-accent) 30%, transparent)",
                    color: "var(--theme-text-primary)",
                  }}
                  title="تصغير الرمز"
                >
                  <ZoomOut className="w-4 h-4" style={{ color: "var(--theme-primary)" }} />
                  <span>تصغير -</span>
                </button>

                <span
                  className="text-xs font-mono font-bold px-2"
                  style={{ color: "var(--theme-text-muted)" }}
                >
                  {qrSize}px
                </span>

                <button
                  type="button"
                  onClick={() => handleZoomChange(40)}
                  disabled={qrSize >= 600}
                  className="px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition disabled:opacity-40 cursor-pointer shadow-xs active:scale-95"
                  style={{
                    backgroundColor: "var(--theme-background)",
                    borderColor: "color-mix(in srgb, var(--theme-accent) 30%, transparent)",
                    color: "var(--theme-text-primary)",
                  }}
                  title="تكبير الرمز"
                >
                  <ZoomIn className="w-4 h-4" style={{ color: "var(--theme-primary)" }} />
                  <span>تكبير +</span>
                </button>
              </div>

              <p
                className="text-[11px] mt-2.5"
                style={{ color: "var(--theme-text-muted)" }}
              >
                امسح الرمز من تطبيق شام كاش أو انقر لعرضه بكامل الشاشة
              </p>
            </div>

            {/* 2️⃣ Wallet Address — Directly below QR code */}
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
                <span>عنوان المحفظة / رقم الحساب</span>
              </div>

              {/* Big, bold wallet address */}
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
                      copyToClipboard(walletAddress, "تم نسخ عنوان المحفظة بنجاح");
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
                  <span>نسخ عنوان المحفظة</span>
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              RIGHT COLUMN (or BOTTOM on mobile):
              3️⃣ Transfer Details (Amount, Currency)
              4️⃣ Primary Instructions Line
              5️⃣ Verify Option & Instructions
              6️⃣ Invoice Stage
          ========================================================================= */}
          <div className="lg:col-span-7 space-y-5">
            {/* 3️⃣ Transfer Details (Amount, Currency) */}
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
                  <span>تفاصيل التحويل</span>
                </h3>
                <span
                  className="text-xs px-2.5 py-0.5 rounded-lg border font-mono"
                  style={{
                    backgroundColor: "var(--theme-background)",
                    borderColor: "color-mix(in srgb, var(--theme-accent) 30%, transparent)",
                    color: "var(--theme-text-muted)",
                  }}
                >
                  البيانات المالية
                </span>
              </div>

              {/* Inputs side by side on desktop, stacked on mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Amount Input */}
                <div>
                  <label
                    className="text-xs sm:text-sm font-bold mb-1.5 block"
                    style={{ color: "var(--theme-primary)" }}
                  >
                    المبلغ المحول
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="أدخل المبلغ المحول..."
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-12 rounded-xl text-base font-bold transition focus:ring-2"
                      style={{
                        backgroundColor: "var(--theme-background)",
                        borderColor: "color-mix(in srgb, var(--theme-accent) 40%, transparent)",
                        color: "var(--theme-text-primary)",
                      }}
                    />
                    <div
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold px-2 py-0.5 rounded-md"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--theme-accent) 15%, transparent)",
                        color: "var(--theme-primary)",
                      }}
                    >
                      {currency}
                    </div>
                  </div>
                </div>

                {/* Currency Select */}
                <div>
                  <label
                    className="text-xs sm:text-sm font-bold mb-1.5 block"
                    style={{ color: "var(--theme-primary)" }}
                  >
                    العملة
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full h-12 rounded-xl text-base font-bold px-3 border transition cursor-pointer"
                    style={{
                      backgroundColor: "var(--theme-background)",
                      borderColor: "color-mix(in srgb, var(--theme-accent) 40%, transparent)",
                      color: "var(--theme-text-primary)",
                    }}
                  >
                    <option value="USD">دولار أمريكي (USD)</option>
                    <option value="SYP">ليرة سورية (SYP)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 4️⃣ Primary Instructions Line — After Transfer Details */}
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
                  افتح فاتورة ثم أرسل المبلغ وعد بعد نسخ رقم العملية للتحقق من مصداقية الإيداع.
                </p>
                <p>التحقق يتم بشكل تلقائي وفوري داخل المتجر.</p>
                <p className="text-[11px] font-medium opacity-90">
                  بعد إنشاء الفاتورة أدخل رقم العملية كما ظهر في شام كاش ثم اضغط تحقق.
                </p>
              </div>
            </div>

            {/* 5️⃣ Verify Option (Verify / Confirm Deposit) & Instructions */}
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
                  <span>تأكيد والتحقق من الإيداع</span>
                </h3>
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--theme-accent) 15%, transparent)",
                    color: "var(--theme-primary)",
                  }}
                >
                  إلزامي
                </span>
              </div>

              {/* Transaction Ref Input */}
              <div>
                <label
                  className="text-xs sm:text-sm font-bold mb-2 block"
                  style={{ color: "var(--theme-primary)" }}
                >
                  رقم العملية في شام كاش *
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="أدخل رقم العملية"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value.replace(/\D+/g, ""))}
                  className="h-13 rounded-xl text-base font-mono transition focus:ring-2"
                  style={{
                    backgroundColor: "var(--theme-background)",
                    borderColor: "var(--theme-accent)",
                    color: "var(--theme-text-primary)",
                  }}
                />
              </div>

              {/* Verify Button */}
              <Button
                type="button"
                onClick={verifyAutoInvoice}
                disabled={verifying || !invoiceId}
                className="w-full h-13 rounded-2xl font-black text-base transition-all shadow-lg cursor-pointer active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: "var(--theme-primary)",
                  color: "var(--theme-background)",
                }}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{verifying ? "جاري التحقق..." : "تحقق وتأكيد الإيداع"}</span>
              </Button>

              {/* Instruction Line directly below button */}
              <p
                className="text-xs text-center leading-relaxed pt-1"
                style={{ color: "var(--theme-text-muted)" }}
              >
                بعد إنشاء الفاتورة أدخل رقم العملية كما ظهر في شام كاش ثم اضغط تحقق.
              </p>
            </div>

            {/* 6️⃣ Invoice Stage (Invoice Details Card — appears when needed based on current business logic) */}
            {invoiceId ? (
              <div
                className="rounded-3xl p-5 sm:p-6 border shadow-xl space-y-3 relative overflow-hidden"
                style={{
                  backgroundColor: "var(--theme-card)",
                  borderColor: "color-mix(in srgb, var(--theme-accent) 30%, transparent)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="text-xs font-bold flex items-center gap-1.5"
                    style={{ color: "var(--theme-primary)" }}
                  >
                    <Info className="w-4 h-4" />
                    <span>مرحلة الفاتورة الحالية (Invoice Stage)</span>
                  </div>
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: "var(--theme-background)",
                      borderColor: "color-mix(in srgb, var(--theme-accent) 30%, transparent)",
                      color: "var(--theme-primary)",
                    }}
                  >
                    نشطة
                  </span>
                </div>

                {/* Invoice ID Box */}
                <div
                  className="rounded-2xl p-4 border flex items-center justify-between gap-3"
                  style={{
                    backgroundColor: "var(--theme-background)",
                    borderColor: "color-mix(in srgb, var(--theme-accent) 25%, transparent)",
                  }}
                >
                  <div className="space-y-0.5 overflow-hidden">
                    <div className="text-[11px] font-bold" style={{ color: "var(--theme-primary)" }}>
                      رقم الفاتورة (Invoice ID)
                    </div>
                    <div
                      className="font-mono text-xs sm:text-sm font-bold break-all select-all"
                      style={{ color: "var(--theme-text-primary)" }}
                    >
                      {invoiceId}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(invoiceId, "تم نسخ رقم الفاتورة")}
                    className="p-2 rounded-xl border hover:opacity-80 transition shrink-0 cursor-pointer"
                    style={{
                      backgroundColor: "var(--theme-card)",
                      borderColor: "color-mix(in srgb, var(--theme-accent) 30%, transparent)",
                      color: "var(--theme-primary)",
                    }}
                    title="نسخ رقم الفاتورة"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                {/* Expiration Timer */}
                {expiresAt ? (
                  <div
                    className="flex items-center gap-2 text-xs p-3 rounded-xl border"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--theme-secondary) 10%, transparent)",
                      borderColor: "color-mix(in srgb, var(--theme-accent) 20%, transparent)",
                      color: "var(--theme-text-muted)",
                    }}
                  >
                    <Clock3 className="w-4 h-4 shrink-0" style={{ color: "var(--theme-primary)" }} />
                    <span>تنتهي صلاحية الفاتورة في: {new Date(expiresAt).toLocaleString("ar-EG")}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* =========================================================================
          Lightbox Modal: High Resolution 1080x1080 QR Display
      ========================================================================= */}
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
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 w-10 h-10 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center shadow-lg transition active:scale-90 cursor-pointer border-2 border-white"
            >
              <X className="w-5 h-5" />
            </button>

            {walletAddress || qrImageSrc ? (
              <>
                {/* QR Title in Modal */}
                <div className="text-center mb-3">
                  <h4 className="text-base font-black text-zinc-900">
                    رمز استجابة شام كاش (1080x1080)
                  </h4>
                  <p className="text-xs font-mono font-bold text-zinc-600 mt-0.5 select-all">
                    {walletAddress}
                  </p>
                </div>

                {/* 1:1 Aspect Ratio Container */}
                <div className="w-[min(80vw,520px)] aspect-square flex items-center justify-center bg-white p-2 overflow-hidden">
                  {qrImageSrc ? (
                    <img
                      src={qrImageSrc}
                      alt="Sham Cash Full QR Code 1080x1080"
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

                {/* Modal Actions */}
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
