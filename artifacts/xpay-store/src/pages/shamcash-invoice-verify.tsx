import { useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { ChevronRight, CheckCircle2, ClipboardCheck, Clock3 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [transactionRef, setTransactionRef] = useState("");
  const [verifying, setVerifying] = useState(false);
  const apiBaseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

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
      <div className="min-h-screen bg-[#1A1A1A] p-4 text-center pt-20 text-zinc-400" dir="rtl">
        صفحة التحقق مخصصة لشام كاش التلقائي فقط
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white pb-24 animate-in slide-in-from-right-4 duration-300" dir="rtl">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-[#1A1A1A]/95 backdrop-blur-xl px-4 py-3.5 flex items-center justify-between border-b border-[#C8A45C]/20 shadow-md">
        <div className="flex items-center gap-3">
          <Link href="/deposit/sham_cash_auto">
            <div className="bg-[#2D2D2D] p-2 rounded-xl border border-[#C8A45C]/40 hover:border-[#C8A45C] text-[#C8A45C] hover:text-[#FDE68A] transition-colors cursor-pointer shadow-xs">
              <ChevronRight className="w-5 h-5" />
            </div>
          </Link>
          <h1 className="font-bold text-base sm:text-lg text-[#FDE68A]">التحقق من إيداع شام كاش</h1>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#C8A45C]/20 border border-[#C8A45C]/35 text-[#FDE68A] font-bold">
          تحقق فوري
        </span>
      </div>

      <div className="max-w-xl mx-auto p-4 sm:p-5 mt-2 space-y-5">
        {/* Info Card */}
        <div className="bg-[#2D2D2D] rounded-3xl border border-[#C8A45C]/35 p-6 text-center shadow-xl relative overflow-hidden">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C8A45C]/25 to-[#1A1A1A] border border-[#C8A45C]/50 flex items-center justify-center text-[#C8A45C] shadow-md">
            <ClipboardCheck className="w-8 h-8" />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-[#FDE68A] mb-2">أدخل رقم عملية شام كاش</h2>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-md mx-auto">
            بعد تحويل المبلغ في تطبيق شام كاش، اكتب رقم العملية كما ظهر في التطبيق ثم اضغط تحقق لتأكيد الشحن فوراً.
          </p>
        </div>

        {/* Verification Form Card */}
        <div className="bg-[#2D2D2D] border border-[#C8A45C]/35 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="rounded-2xl bg-[#1A1A1A] border border-[#C8A45C]/25 p-4 shadow-inner">
            <div className="text-xs font-bold text-[#C8A45C] mb-1">رقم الفاتورة (Invoice ID)</div>
            <div className="font-mono text-sm font-bold text-white break-all select-all">{invoiceId || "غير متوفر"}</div>
          </div>

          {expiresAt ? (
            <div className="flex items-center gap-2 text-xs text-zinc-400 bg-[#241D12] p-3 rounded-xl border border-[#C8A45C]/20">
              <Clock3 className="w-4 h-4 text-[#C8A45C]" />
              <span>تنتهي صلاحية الفاتورة: {new Date(expiresAt).toLocaleString("ar-EG")}</span>
            </div>
          ) : null}

          <div>
            <label className="text-xs sm:text-sm font-bold text-[#E5E7EB] mb-2 block">
              رقم العملية في شام كاش *
            </label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="مثال: 206259523"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value.replace(/\D+/g, ""))}
              className="h-12 bg-[#3D3D3D] border-[#4B5563] text-white placeholder:text-zinc-400 rounded-xl text-base font-mono focus:border-[#C8A45C] focus:ring-1 focus:ring-[#C8A45C]"
            />
          </div>

          <Button
            type="button"
            onClick={verifyAutoInvoice}
            disabled={verifying || !invoiceId}
            className="w-full h-13 rounded-2xl font-black text-base bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] transition-all shadow-lg shadow-[#C8A45C]/20 cursor-pointer active:scale-98 disabled:opacity-50"
          >
            <CheckCircle2 className="w-5 h-5 ml-2 text-[#1A1A1A]" />
            {verifying ? "جاري التحقق..." : "تحقق من العملية الآن"}
          </Button>
        </div>
      </div>
    </div>
  );
}
