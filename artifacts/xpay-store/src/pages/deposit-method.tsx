import { useRoute, Link, useLocation } from "wouter";
import { ChevronRight, Copy, AlertTriangle } from "lucide-react";
import {
  useListPaymentMethods,
  useCreateDeposit,
  getListPaymentMethodsQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPublicJson } from "@/lib/public-api";

const depositSchema = z.object({
  currency: z.enum(["USD", "SYP"]),
  amount: z.coerce.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
  transactionId: z.string().optional(),
  proofImage: z.string().optional(),
});

type UiMethod = {
  code: string;
  name: string;
  subtitle: string;
  instructions?: string;
  walletAddress?: string;
  qrImage?: string;
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
    const p = new URLSearchParams(raw);
    const userRaw = p.get("user");
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
    // keep the raw attempt
  }

  for (const item of attempts) {
    const parsed = parseIdentityFromInitDataRaw(item);
    if (parsed?.id) return parsed;
  }

  return null;
}

type AutoInvoiceState = {
  depositId: number;
  invoiceId: string;
  expiresAt?: string | null;
};

function getMethodName(method: UiMethod) {
  if (method.code === "sham_cash_auto") return "شام كاش";
  return method.name;
}

function getMethodSubtitle(method: UiMethod) {
  if (method.code === "sham_cash_auto") return "شام كاش التلقائي";
  return method.subtitle;
}

export default function DepositMethod() {
  const [, params] = useRoute("/deposit/:method");
  const methodCode = params?.method;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: methods, isLoading } = useListPaymentMethods({
    query: { queryKey: getListPaymentMethodsQueryKey() },
  });
  const [fallbackMethods, setFallbackMethods] = useState<UiMethod[] | null>(null);

  const createDeposit = useCreateDeposit();
  const [proofImageName, setProofImageName] = useState("");
  const [autoInvoice, setAutoInvoice] = useState<AutoInvoiceState | null>(null);
  const [autoTransactionRef, setAutoTransactionRef] = useState("");
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoVerifying, setAutoVerifying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPublicJson<UiMethod[]>("/payment-methods")
      .then((rows) => {
        if (!cancelled) setFallbackMethods(rows);
      })
      .catch((error) => {
        console.error("Fallback payment method load failed:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleMethods = ((fallbackMethods && fallbackMethods.length > 0 ? fallbackMethods : methods) || []) as UiMethod[];
  const method = visibleMethods.find((m) => m.code === methodCode);
  const apiBaseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
  const isShamCashAuto = method?.code === "sham_cash_auto";
  const isShamCashManual = method?.code === "sham_cash";

  const readTelegramIdentity = (): TelegramIdentity | null => {
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

      const cachedRaw =
        localStorage.getItem(TELEGRAM_IDENTITY_CACHE_KEY) ||
        localStorage.getItem("tg_identity_cache");
      if (!cachedRaw) return null;
      const cached = JSON.parse(cachedRaw);
      return cached?.id ? (cached as TelegramIdentity) : null;
    } catch {
      return null;
    }
  };

  const form = useForm<z.infer<typeof depositSchema>>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      currency: methodCode?.includes("syriatel") || methodCode?.includes("mtn") ? "SYP" : "USD",
      amount: undefined as unknown as number,
      transactionId: "",
      proofImage: "",
    },
  });

  const onProofFileChange = (file?: File) => {
    if (!file) {
      form.setValue("proofImage", "");
      setProofImageName("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = typeof reader.result === "string" ? reader.result : "";
      form.setValue("proofImage", base64);
      setProofImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = (values: z.infer<typeof depositSchema>) => {
    if (!method) return;

    if (values.proofImage && values.proofImage.startsWith("data:") && values.proofImage.length > 1_500_000) {
      toast.error("حجم صورة الإيصال كبير، اختر صورة أصغر.");
      return;
    }

    if (method.code === "sham_cash_auto") {
      setAutoLoading(true);
      const tg = readTelegramIdentity();
      const webAppData = getTelegramWebAppDataFromUrl();
      const invoiceUrl = tg?.id
        ? `${apiBaseUrl}/api/deposits/shamcash/invoice?tg_id=${encodeURIComponent(tg.id)}&tg_username=${encodeURIComponent(tg.username || "")}`
        : `${apiBaseUrl}/api/deposits/shamcash/invoice`;

      const token = typeof window !== "undefined" ? localStorage.getItem("xpay_store_auth_token") : null;
      fetch(invoiceUrl, {
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
          amount: values.amount,
          currency: values.currency,
          telegramId: tg?.id || "",
          telegramUsername: tg?.username || "",
          telegramFirstName: tg?.firstName || "",
          telegramLastName: tg?.lastName || "",
          telegramInitData: tg?.initDataRaw || webAppData || "",
          tgWebAppData: webAppData || "",
        }),
      })
        .then(async (r) => {
          const payload = await r.json().catch(() => null);
          if (!r.ok || !payload?.invoiceId) {
            throw new Error(payload?.message || payload?.error || `invoice_http_${r.status}`);
          }

          const invoiceId = String(payload.invoiceId || "");
          setAutoInvoice({
            depositId: Number(payload.depositId),
            invoiceId,
            expiresAt: payload.expiresAt || null,
          });
          setAutoTransactionRef("");
          toast.success("تم تأكيد الإيداع. أدخل رقم العملية في صفحة التحقق.");
          queryClient.invalidateQueries({ queryKey: ["/api/deposits"] });
          setLocation(
            `/deposit/sham_cash_auto/invoice?invoiceId=${encodeURIComponent(invoiceId)}&depositId=${encodeURIComponent(String(payload.depositId || ""))}&expiresAt=${encodeURIComponent(String(payload.expiresAt || ""))}`,
          );
        })
        .catch((err: any) => {
          toast.error(err?.message || "فشل إنشاء فاتورة شام كاش");
        })
        .finally(() => {
          setAutoLoading(false);
        });
      return;
    }

    const transactionId = String(values.transactionId || "").trim();
    if (!/^\d{3,}$/.test(transactionId)) {
      toast.error("رقم العملية يجب أن يحتوي أرقام فقط وبحد أدنى 3 خانات");
      return;
    }

    createDeposit.mutate(
      {
        data: {
          method: method.code,
          currency: values.currency,
          amount: values.amount,
          transactionId,
          proofImage: isShamCashAuto ? undefined : (values.proofImage || undefined),
        } as any,
      },
      {
        onSuccess: () => {
          toast.success("تم إرسال طلب الإيداع بنجاح");
          queryClient.invalidateQueries({ queryKey: ["/api/me"] });
          queryClient.invalidateQueries({ queryKey: ["/api/deposits"] });
          setLocation("/deposits");
        },
        onError: (err: any) => {
          const apiError = err?.response?.data?.error || err?.response?.data?.message || err?.message;
          toast.error(apiError || "حدث خطأ أثناء الإرسال");
        },
      },
    );
  };

  const verifyAutoInvoice = async () => {
    if (!autoInvoice?.invoiceId) {
      toast.error("أنشئ الفاتورة أولاً");
      return;
    }

    const transactionRef = autoTransactionRef.trim();
    if (!/^\d+$/.test(transactionRef)) {
      toast.error("رقم العملية يجب أن يحتوي على أرقام فقط");
      return;
    }

    try {
      setAutoVerifying(true);
      const tg = readTelegramIdentity();
      const webAppData = getTelegramWebAppDataFromUrl();
      const resp = await fetch(`${apiBaseUrl}/api/deposits/shamcash/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(tg?.id ? { "x-telegram-id": tg.id } : {}),
          ...(tg?.initDataRaw || webAppData
            ? { "x-telegram-init-data": encodeURIComponent(tg?.initDataRaw || webAppData) }
            : {}),
        },
        body: JSON.stringify({
          invoiceId: autoInvoice.invoiceId,
          transactionRef,
          telegramId: tg?.id || "",
          telegramInitData: tg?.initDataRaw || webAppData || "",
          tgWebAppData: webAppData || "",
        }),
      });
      const payload: any = await resp.json().catch(() => ({}));

      if (resp.ok && payload?.verified) {
        toast.success(payload?.message || "تم التحقق من الدفع بنجاح");
        queryClient.invalidateQueries({ queryKey: ["/api/me"] });
        queryClient.invalidateQueries({ queryKey: ["/api/deposits"] });
        setLocation("/deposits");
        return;
      }

      if (payload?.code === "EXPIRED") {
        toast.error("انتهت صلاحية الفاتورة. ارجع واضغط تأكيد الإيداع مرة أخرى.");
        return;
      }

      if (payload?.code === "TRANSACTION_REF_ALREADY_USED") {
        toast.error("رقم العملية غير صالح أو تم استخدامه مسبقًا.");
        return;
      }

      const msg = String(payload?.message || "");
      if (msg === "verification_failed") {
        toast.error("تعذر التحقق من رقم العملية. تأكد من كتابة الرقم كما ظهر في شام كاش.");
      } else {
        toast.error(msg || "تعذر التحقق من رقم العملية");
      }
    } catch (error: any) {
      toast.error(error?.message || "فشل التحقق من العملية");
    } finally {
      setAutoVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ بنجاح");
  };

  if (isLoading && visibleMethods.length === 0) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] p-4 pt-8 text-white" dir="rtl">
        <Skeleton className="h-8 w-32 mb-8 bg-zinc-800" />
        <Skeleton className="h-48 w-full rounded-3xl mb-6 bg-zinc-800" />
        <Skeleton className="h-64 w-full rounded-3xl bg-zinc-800" />
      </div>
    );
  }

  if (!method) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] p-4 text-center pt-20 text-zinc-400" dir="rtl">
        طريقة الدفع غير موجودة
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white pb-24 animate-in slide-in-from-right-4 duration-300" dir="rtl">
      {/* Header bar */}
      <div className="sticky top-0 z-20 bg-[#1A1A1A]/95 backdrop-blur-xl px-4 py-3.5 flex items-center justify-between border-b border-[#C8A45C]/20 shadow-md">
        <div className="flex items-center gap-3">
          <Link href="/deposit">
            <div className="bg-[#2D2D2D] p-2 rounded-xl border border-[#C8A45C]/40 hover:border-[#C8A45C] text-[#C8A45C] hover:text-[#FDE68A] transition-colors cursor-pointer shadow-xs">
              <ChevronRight className="w-5 h-5" />
            </div>
          </Link>
          <div>
            <h1 className="font-bold text-base sm:text-lg text-[#FDE68A]">{getMethodName(method)}</h1>
            <p className="text-[11px] text-zinc-400">{getMethodSubtitle(method)}</p>
          </div>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#C8A45C]/20 border border-[#C8A45C]/35 text-[#FDE68A] font-bold">
          بوابة الدفع
        </span>
      </div>

      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6 mt-2">
        {/* Method Info Card */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#2D2D2D] border border-[#C8A45C]/35 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-lg sm:text-xl text-[#FDE68A]">{getMethodSubtitle(method)}</h2>
            <div className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#C8A45C]/20 text-[#FDE68A] border border-[#C8A45C]/35">
              وسيلة معتمدة
            </div>
          </div>

          {method.instructions && (
            <p className="text-xs sm:text-sm text-[#E5E7EB] mb-5 leading-relaxed whitespace-pre-wrap">
              {method.instructions}
            </p>
          )}

          {method.walletAddress && (
            <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-[#C8A45C]/25 shadow-inner">
              <div className="text-[11px] font-bold text-[#C8A45C] mb-2">عنوان المحفظة / الرقم:</div>
              <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-sm font-bold text-white truncate select-all">{method.walletAddress}</div>
                <button
                  onClick={() => copyToClipboard(method.walletAddress!)}
                  className="shrink-0 px-3 py-1.5 rounded-xl flex items-center gap-1.5 bg-[#C8A45C] text-[#1A1A1A] hover:bg-[#B8954A] transition font-bold text-xs cursor-pointer shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ</span>
                </button>
              </div>
            </div>
          )}

          {method.qrImage && (
            <div className="mt-4 flex justify-center items-center">
              <div className="w-full max-w-[180px] sm:max-w-[220px] aspect-square rounded-2xl border border-[#C8A45C]/40 p-2 bg-white shadow-md flex items-center justify-center">
                <img
                  src={method.qrImage}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {/* Alert Note Box */}
        <div className="bg-[#241D12] border border-[#C8A45C]/40 rounded-2xl p-4 flex gap-3 text-[#FDE68A] shadow-md">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-[#C8A45C]" />
          <div className="text-xs leading-relaxed space-y-1 font-medium text-[#E5E7EB]">
            {method.code === "sham_cash_auto" ? (
              <>
                <p className="font-bold text-[#FDE68A]">التحقق يتم عبر API بشكل تلقائي فوري داخل المتجر.</p>
                <p className="text-zinc-300">بعد إنشاء الفاتورة أدخل رقم العملية كما ظهر في شام كاش ثم اضغط تحقق.</p>
              </>
            ) : (
              <>
                <p className="font-bold text-[#FDE68A]">يرجى إدخال رقم عملية صحيح أو رفع إيصال واضح.</p>
                <p className="text-zinc-300">طلبات الإيداع اليدوي تُرسل للمشرفين للمراجعة السريعة وإضافة الرصيد.</p>
              </>
            )}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-[#2D2D2D] border border-[#C8A45C]/35 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-base text-[#FDE68A] pb-2 border-b border-zinc-700/80">تفاصيل التحويل</h3>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-[#E5E7EB]">العملة</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 bg-[#3D3D3D] border-[#4B5563] text-white rounded-xl focus:border-[#C8A45C] focus:ring-1 focus:ring-[#C8A45C]">
                          <SelectValue placeholder="اختر العملة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#2D2D2D] border-[#C8A45C]/40 text-white">
                        <SelectItem value="USD" className="hover:bg-[#C8A45C]/20 hover:text-[#FDE68A] focus:bg-[#C8A45C]/20 focus:text-[#FDE68A]">
                          دولار أمريكي (USD)
                        </SelectItem>
                        <SelectItem value="SYP" className="hover:bg-[#C8A45C]/20 hover:text-[#FDE68A] focus:bg-[#C8A45C]/20 focus:text-[#FDE68A]">
                          ليرة سورية (SYP)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-[#E5E7EB]">المبلغ المحول</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="أدخل المبلغ..."
                        {...field}
                        className="h-12 bg-[#3D3D3D] border-[#4B5563] text-white placeholder:text-zinc-400 rounded-xl text-base focus:border-[#C8A45C] focus:ring-1 focus:ring-[#C8A45C]"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              {method.code !== "sham_cash_auto" ? (
                <FormField
                  control={form.control}
                  name="transactionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-[#E5E7EB]">رقم العملية (Transaction ID/Ref)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="أدخل رقم عملية التحويل..."
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.replace(/\D+/g, ""))}
                          className="h-12 bg-[#3D3D3D] border-[#4B5563] text-white placeholder:text-zinc-400 rounded-xl text-base font-mono focus:border-[#C8A45C] focus:ring-1 focus:ring-[#C8A45C]"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />
              ) : null}

              {!isShamCashAuto ? (
                <FormField
                  control={form.control}
                  name="proofImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-[#E5E7EB]">صورة الإيصال (اختياري)</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => onProofFileChange(e.target.files?.[0])}
                            className="h-12 bg-[#3D3D3D] border-[#4B5563] text-white rounded-xl text-xs sm:text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#C8A45C] file:text-[#1A1A1A] hover:file:bg-[#B8954A]"
                          />
                          {!isShamCashManual ? (
                            <Input
                              placeholder="أو رابط صورة الإيصال"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="h-12 bg-[#3D3D3D] border-[#4B5563] text-white placeholder:text-zinc-400 rounded-xl text-base focus:border-[#C8A45C] focus:ring-1 focus:ring-[#C8A45C]"
                            />
                          ) : null}
                          {proofImageName ? <div className="text-xs text-[#FDE68A]">الملف المحدد: {proofImageName}</div> : null}
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />
              ) : null}

              <div className="pt-3">
                <Button
                  type="submit"
                  disabled={createDeposit.isPending || autoLoading}
                  className="w-full h-13 rounded-2xl text-base font-black text-[#1A1A1A] bg-[#C8A45C] hover:bg-[#B8954A] transition-all shadow-lg shadow-[#C8A45C]/20 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {method.code === "sham_cash_auto"
                    ? (autoLoading ? "جاري تأكيد الإيداع..." : "تأكيد الإيداع")
                    : (createDeposit.isPending ? "جاري الإرسال..." : "تأكيد الدفع")}
                </Button>
              </div>
            </form>
          </Form>

          {isShamCashAuto && autoInvoice ? (
            <div className="mt-5 space-y-3 rounded-2xl border border-[#C8A45C]/40 bg-[#1A1A1A] p-4 shadow-inner">
              <div className="text-sm font-bold text-[#FDE68A]">
                رقم الفاتورة (Invoice ID): <span className="font-mono text-white select-all">{autoInvoice.invoiceId}</span>
              </div>
              <div className="text-xs text-zinc-400">
                {autoInvoice.expiresAt
                  ? `تنتهي الفاتورة عند: ${new Date(autoInvoice.expiresAt).toLocaleString()}`
                  : "يمكنك إنشاء فاتورة جديدة في أي وقت."}
              </div>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="أدخل رقم العملية الذي ظهر في تطبيق شام كاش"
                value={autoTransactionRef}
                onChange={(e) => setAutoTransactionRef(e.target.value.replace(/\D+/g, ""))}
                className="h-12 bg-[#3D3D3D] border-[#4B5563] text-white placeholder:text-zinc-400 rounded-xl text-base font-mono focus:border-[#C8A45C] focus:ring-1 focus:ring-[#C8A45C]"
              />
              <Button
                type="button"
                onClick={verifyAutoInvoice}
                disabled={autoVerifying}
                className="w-full h-12 rounded-xl font-black bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] transition shadow-md cursor-pointer"
              >
                {autoVerifying ? "جاري التحقق..." : "تحقق من العملية"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
