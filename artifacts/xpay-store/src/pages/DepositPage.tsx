import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Wallet,
  Smartphone,
  Landmark,
  ShieldCheck,
  CreditCard,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  Info,
  Sparkles,
  Clock,
  RefreshCw,
  Copy,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { getPublicJson } from "@/lib/public-api";
import LegacyDeposit from "./deposit-legacy";

type UiPaymentMethod = {
  id: string;
  code: string;
  name: string;
  subtitle?: string;
  instructions?: string;
  walletAddress?: string;
  qrImage?: string;
  active: boolean;
};

type TelegramIdentity = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  initDataRaw: string;
};

const TELEGRAM_IDENTITY_CACHE_KEY = "xpay_telegram_identity";

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
    // keep raw
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

export default function DepositPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<"USD" | "SYP">("USD");
  const [useLegacy, setUseLegacy] = useState<boolean>(false);
  const [paymentMethods, setPaymentMethods] = useState<UiPaymentMethod[]>([]);
  const [shamCashMethod, setShamCashMethod] = useState<UiPaymentMethod | null>(null);

  const apiBaseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getPublicJson<{ use_legacy_deposit_page?: boolean }>("/public/deposit-config").catch(() => null),
      getPublicJson<UiPaymentMethod[]>("/payment-methods").catch(() => []),
    ])
      .then(([configData, methodsData]) => {
        if (cancelled) return;
        if (configData?.use_legacy_deposit_page) {
          setUseLegacy(true);
        }

        if (Array.isArray(methodsData)) {
          setPaymentMethods(methodsData);
          const sc = methodsData.find(
            (m) => m.code === "sham_cash_auto" || m.code === "sham_cash" || m.code?.includes("sham")
          );
          if (sc) {
            setShamCashMethod(sc);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center space-y-4" dir="rtl">
        <Skeleton className="w-16 h-16 rounded-2xl bg-zinc-800 animate-pulse" />
        <Skeleton className="w-48 h-6 rounded-xl bg-zinc-800 animate-pulse" />
        <Skeleton className="w-64 h-4 rounded-xl bg-zinc-800 animate-pulse" />
      </div>
    );
  }

  if (useLegacy) {
    return <LegacyDeposit />;
  }

  const walletAddress = shamCashMethod?.walletAddress || "SHAM-CASH-PAY";

  const copyToClipboard = (text: string, label = "تم النسخ بنجاح") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const handleCreateInvoice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const numAmount = parseFloat(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      toast.error("يرجى إدخال مبلغ إيداع صحيح أكبر من 0");
      return;
    }

    try {
      setSubmitting(true);
      const tg = readTelegramIdentity();
      const webAppData = getTelegramWebAppDataFromUrl();
      const token = typeof window !== "undefined" ? localStorage.getItem("xpay_store_auth_token") : null;

      const invoiceUrl = tg?.id
        ? `${apiBaseUrl}/api/deposits/shamcash/invoice?tg_id=${encodeURIComponent(tg.id)}&tg_username=${encodeURIComponent(tg.username || "")}`
        : `${apiBaseUrl}/api/deposits/shamcash/invoice`;

      const resp = await fetch(invoiceUrl, {
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
          amount: numAmount,
          currency,
          telegramId: tg?.id || "",
          telegramUsername: tg?.username || "",
          telegramFirstName: tg?.firstName || "",
          telegramLastName: tg?.lastName || "",
          telegramInitData: tg?.initDataRaw || webAppData || "",
          tgWebAppData: webAppData || "",
        }),
      });

      const payload: any = await resp.json().catch(() => ({}));

      if (!resp.ok || !payload?.invoiceId) {
        throw new Error(payload?.message || payload?.error || `invoice_create_error_${resp.status}`);
      }

      const invoiceId = String(payload.invoiceId);
      const expiresAt = String(payload.expiresAt || "");

      // Save to localStorage for fallback offline resumption
      try {
        localStorage.setItem(
          `shamcash_pending_invoice_${invoiceId}`,
          JSON.stringify({
            invoiceId,
            depositId: payload.depositId,
            amount: numAmount,
            currency,
            expiresAt,
            createdAt: new Date().toISOString(),
          })
        );
      } catch {
        // ignore
      }

      toast.success("تم إنشاء فاتورة الإيداع بنجاح!");
      setLocation(
        `/deposit/pay/${encodeURIComponent(invoiceId)}?depositId=${encodeURIComponent(String(payload.depositId || ""))}&expiresAt=${encodeURIComponent(expiresAt)}&amount=${encodeURIComponent(String(numAmount))}&currency=${encodeURIComponent(currency)}`
      );
    } catch (err: any) {
      toast.error(err?.message || "فشل إنشاء فاتورة الإيداع، يرجى المحاولة لاحقاً");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen pb-24 p-4 sm:p-6 transition-colors duration-300 animate-in fade-in"
      style={{
        backgroundColor: "var(--theme-background)",
        color: "var(--theme-text-primary)",
      }}
      dir="rtl"
    >
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header section */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center my-4 space-y-2.5"
        >
          <div
            className="w-16 h-16 mx-auto rounded-3xl border flex items-center justify-center shadow-lg"
            style={{
              backgroundColor: "color-mix(in srgb, var(--theme-accent) 20%, transparent)",
              borderColor: "color-mix(in srgb, var(--theme-accent) 45%, transparent)",
              color: "var(--theme-primary)",
            }}
          >
            <Wallet className="w-8 h-8" />
          </div>

          <h1
            className="text-2xl sm:text-3xl font-black"
            style={{ color: "var(--theme-primary)" }}
          >
            إيداع رصيد
          </h1>

          <p className="text-xs sm:text-sm max-w-sm mx-auto leading-relaxed" style={{ color: "var(--theme-text-muted)" }}>
            اختر المبلغ والعملة لإنشاء فاتورة دفع إلكترونية عبر شام كاش
          </p>
        </motion.div>

        {/* 1️⃣ بطاقة معلومات المحفظة (Wallet Info Card) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 sm:p-6 rounded-3xl border shadow-xl space-y-4"
          style={{
            backgroundColor: "var(--theme-card)",
            borderColor: "color-mix(in srgb, var(--theme-accent) 30%, transparent)",
          }}
        >
          <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "color-mix(in srgb, var(--theme-accent) 20%, transparent)" }}>
            <div className="flex items-center gap-2">
              <Landmark className="w-5 h-5" style={{ color: "var(--theme-primary)" }} />
              <span className="font-bold text-sm sm:text-base" style={{ color: "var(--theme-primary)" }}>
                معلومات المحفظة والرصيد
              </span>
            </div>
            <span
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
              style={{
                backgroundColor: "color-mix(in srgb, var(--theme-accent) 15%, transparent)",
                borderColor: "color-mix(in srgb, var(--theme-accent) 35%, transparent)",
                color: "var(--theme-primary)",
              }}
            >
              شام كاش (Sam API)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* User Balance */}
            <div
              className="p-3.5 rounded-2xl border flex flex-col justify-center"
              style={{
                backgroundColor: "var(--theme-background)",
                borderColor: "color-mix(in srgb, var(--theme-accent) 25%, transparent)",
              }}
            >
              <span className="text-[11px] font-bold block" style={{ color: "var(--theme-text-muted)" }}>
                رصيدك الحالي في المتجر
              </span>
              <div className="text-lg font-black font-mono mt-0.5" style={{ color: "var(--theme-primary)" }}>
                ${(user?.balanceUsd ?? 0).toFixed(2)}{" "}
                <span className="text-xs font-normal opacity-80">USD</span>
              </div>
            </div>

            {/* Store Wallet Address */}
            <div
              className="p-3.5 rounded-2xl border flex items-center justify-between gap-2"
              style={{
                backgroundColor: "var(--theme-background)",
                borderColor: "color-mix(in srgb, var(--theme-accent) 25%, transparent)",
              }}
            >
              <div className="overflow-hidden">
                <span className="text-[11px] font-bold block" style={{ color: "var(--theme-text-muted)" }}>
                  عنوان محفظة المتجر
                </span>
                <span className="text-xs font-mono font-bold truncate block select-all" style={{ color: "var(--theme-text-primary)" }}>
                  {walletAddress}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(walletAddress, "تم نسخ عنوان المحفظة")}
                className="p-2 rounded-xl border hover:opacity-80 transition cursor-pointer shrink-0"
                style={{
                  backgroundColor: "var(--theme-card)",
                  borderColor: "color-mix(in srgb, var(--theme-accent) 30%, transparent)",
                  color: "var(--theme-primary)",
                }}
                title="نسخ عنوان المحفظة"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* 2️⃣ نموذج إنشاء الفاتورة (Invoice Creation Form) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-5 sm:p-6 rounded-3xl border shadow-xl space-y-5"
          style={{
            backgroundColor: "var(--theme-card)",
            borderColor: "color-mix(in srgb, var(--theme-accent) 30%, transparent)",
          }}
        >
          <form onSubmit={handleCreateInvoice} className="space-y-4">
            {/* Amount Input */}
            <div>
              <label
                className="text-xs sm:text-sm font-bold mb-2 block"
                style={{ color: "var(--theme-primary)" }}
              >
                المبلغ المراد شحنه *
              </label>
              <Input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="أدخل المبلغ..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-13 rounded-xl text-base font-bold transition focus:ring-2"
                style={{
                  backgroundColor: "var(--theme-background)",
                  borderColor: "var(--theme-accent)",
                  color: "var(--theme-text-primary)",
                }}
              />
            </div>

            {/* Currency Select */}
            <div>
              <label
                className="text-xs sm:text-sm font-bold mb-2 block"
                style={{ color: "var(--theme-primary)" }}
              >
                العملة *
              </label>
              <Select value={currency} onValueChange={(val: "USD" | "SYP") => setCurrency(val)}>
                <SelectTrigger
                  className="h-13 rounded-xl text-sm font-bold transition focus:ring-2"
                  style={{
                    backgroundColor: "var(--theme-background)",
                    borderColor: "var(--theme-accent)",
                    color: "var(--theme-text-primary)",
                  }}
                >
                  <SelectValue placeholder="اختر العملة" />
                </SelectTrigger>
                <SelectContent
                  style={{
                    backgroundColor: "var(--theme-card)",
                    borderColor: "var(--theme-accent)",
                    color: "var(--theme-text-primary)",
                  }}
                >
                  <SelectItem value="USD" className="cursor-pointer font-bold">
                    USD (دولار أمريكي)
                  </SelectItem>
                  <SelectItem value="SYP" className="cursor-pointer font-bold">
                    SYP (ليرة سورية)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 3️⃣ ملاحظة تحذيرية صغيرة */}
            <div
              className="p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs leading-relaxed"
              style={{
                backgroundColor: "color-mix(in srgb, var(--theme-secondary) 15%, transparent)",
                borderColor: "color-mix(in srgb, var(--theme-accent) 30%, transparent)",
                color: "var(--theme-text-muted)",
              }}
            >
              <Clock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--theme-primary)" }} />
              <span>
                سيتم إنشاء فاتورة صالحة لمدة <strong className="text-white">15 دقيقة</strong>. يرجى إتمام الدفع خلال هذه المدة.
              </span>
            </div>

            {/* 4️⃣ زر رئيسي كبير (تأكيد وفتح فاتورة) */}
            <Button
              type="submit"
              disabled={submitting || !amount || parseFloat(amount) <= 0}
              className="w-full h-13 rounded-2xl font-black text-base shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              style={{
                backgroundColor: "var(--theme-primary)",
                color: "var(--theme-background)",
              }}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>جاري فتح الفاتورة...</span>
                </>
              ) : (
                <>
                  <span>تأكيد وفتح فاتورة</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
