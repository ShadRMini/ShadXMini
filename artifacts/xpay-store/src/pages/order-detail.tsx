import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import { ChevronRight, Package, Clock, CheckCircle2, XCircle, HeadphonesIcon, Copy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCurrency } from "@/lib/currency-context";

const formatDateTime = (value: string | Date) =>
  new Intl.DateTimeFormat("ar-SY", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));

export default function OrderDetail() {
  const [, params] = useRoute("/orders/:id");
  const id = params?.id;
  const { formatPrice, formatPriceWithSyp } = useCurrency();

  const { data: order, isLoading } = useGetOrder(id || "", {
    query: { enabled: !!id, queryKey: getGetOrderQueryKey(id || "") },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`تم نسخ ${label}`);
  };

  if (isLoading) {
    return (
      <div 
        className="min-h-screen p-4 pt-8 max-w-2xl mx-auto"
        style={{
          backgroundColor: "var(--theme-background)",
          color: "var(--theme-text-primary)",
        }}
      >
        <Skeleton className="h-8 w-32 mb-8 bg-zinc-800" />
        <Skeleton className="h-32 w-full rounded-3xl mb-4 bg-zinc-800" />
        <Skeleton className="h-64 w-full rounded-3xl bg-zinc-800" />
      </div>
    );
  }

  if (!order) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center p-4 text-center"
        style={{
          backgroundColor: "var(--theme-background)",
          color: "var(--theme-text-secondary)",
        }}
      >
        <div 
          className="p-6 rounded-3xl border mb-4 max-w-sm w-full"
          style={{
            backgroundColor: "var(--theme-card)",
            borderColor: "var(--theme-border)",
          }}
        >
          <Package className="w-12 h-12 mx-auto mb-2" style={{ color: "var(--theme-primary)" }} />
          <p className="font-bold text-lg" style={{ color: "var(--theme-text-primary)" }}>الطلب غير موجود</p>
          <p className="text-xs mt-1">تأكد من رقم الطلب أو حاول الوصول إليه من قائمة طلباتي</p>
        </div>
        <Link href="/orders">
          <Button 
            className="rounded-2xl font-bold cursor-pointer"
            style={{
              backgroundColor: "var(--theme-primary)",
              color: "var(--theme-text-on-primary)",
            }}
          >
            العودة للطلبات
          </Button>
        </Link>
      </div>
    );
  }

  const isAccept = order.status === "accept";
  const isReject = order.status === "reject";

  return (
    <div 
      className="min-h-screen animate-in slide-in-from-right-4 duration-300" 
      dir="rtl"
      style={{
        backgroundColor: "var(--theme-background)",
        color: "var(--theme-text-primary)",
      }}
    >
      {/* Top Bar */}
      <div 
        className="sticky top-0 z-10 backdrop-blur-xl border-b px-4 py-3 flex items-center gap-3"
        style={{
          backgroundColor: "rgba(26, 26, 26, 0.9)",
          borderColor: "var(--theme-border)",
        }}
      >
        <Link href="/orders">
          <div 
            className="p-2 rounded-full cursor-pointer transition border"
            style={{
              backgroundColor: "var(--theme-card)",
              borderColor: "var(--theme-border)",
              color: "var(--theme-primary)",
            }}
          >
            <ChevronRight className="w-5 h-5" />
          </div>
        </Link>
        <h1 
          className="font-black text-lg"
          style={{ color: "var(--theme-accent)" }}
        >
          تفاصيل الطلب #{order.orderNumber}
        </h1>
      </div>

      <div className="p-4 pb-24 space-y-5 max-w-2xl mx-auto">
        {/* Status Card Banner */}
        <div
          className="p-6 rounded-3xl border relative overflow-hidden transition"
          style={{
            backgroundColor: isAccept
              ? "rgba(16, 185, 129, 0.12)"
              : isReject
                ? "rgba(239, 68, 68, 0.12)"
                : "rgba(245, 158, 11, 0.12)",
            borderColor: isAccept
              ? "rgba(16, 185, 129, 0.35)"
              : isReject
                ? "rgba(239, 68, 68, 0.35)"
                : "rgba(245, 158, 11, 0.35)",
            borderWidth: "1px",
            borderStyle: "solid",
          }}
        >
          <div className="flex flex-col items-center text-center relative z-10">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-lg"
              style={{
                backgroundColor: isAccept
                  ? "#10B981"
                  : isReject
                    ? "#EF4444"
                    : "var(--theme-primary)",
                color: isAccept || isReject ? "#FFFFFF" : "var(--theme-text-on-primary)",
                boxShadow: isAccept
                  ? "0 0 20px rgba(16, 185, 129, 0.3)"
                  : isReject
                    ? "0 0 20px rgba(239, 68, 68, 0.3)"
                    : "0 0 20px rgba(200, 164, 92, 0.3)",
              }}
            >
              {isAccept ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : isReject ? (
                <XCircle className="w-8 h-8" />
              ) : (
                <Clock className="w-8 h-8" />
              )}
            </div>
            <h2 className="text-xl font-black text-white mb-1">
              {isAccept ? "اكتمل الطلب بنجاح" : isReject ? "تم رفض الطلب" : "الطلب قيد الانتظار والمعالجة"}
            </h2>
            <p className="text-sm text-zinc-300 max-w-sm">
              {isAccept
                ? "تم تنفيذ طلبك وإرسال كافة القسائم أو الشحن المطلوب بنجاح."
                : isReject
                  ? "تعذر تنفيذ الطلب. يمكنك التواصل مع فريق الدعم الفني للاستفسار."
                  : "طلبك قيد المراجعة والمعالجة الفورية، وسيتم تحديث حالته في أقرب وقت."}
            </p>
          </div>
        </div>

        {/* Order Details Card */}
        <div 
          className="rounded-3xl p-5 shadow-xl space-y-5 border"
          style={{
            backgroundColor: "var(--theme-card)",
            borderColor: "var(--theme-border)",
          }}
        >
          {/* Header Item Info */}
          <div 
            className="flex items-center gap-4 pb-5 border-b"
            style={{ borderColor: "var(--theme-border)" }}
          >
            <div 
              className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center border"
              style={{
                backgroundColor: "var(--theme-background)",
                borderColor: "var(--theme-border)",
              }}
            >
              {order.productImage ? (
                <img src={order.productImage} alt={order.productName} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-8 h-8" style={{ color: "var(--theme-primary)" }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-white mb-1 text-base truncate">{order.productName}</h3>
              <div className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                الكمية المطلوبة: <span className="font-black" style={{ color: "var(--theme-accent)" }}>{order.quantity}</span>
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center">
              <span style={{ color: "var(--theme-text-secondary)" }}>رقم الطلب</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black" style={{ color: "var(--theme-primary)" }}>
                  #{order.orderNumber}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(order.orderNumber, "رقم الطلب")}
                  className="transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/5"
                  style={{ color: "var(--theme-text-secondary)" }}
                  title="نسخ رقم الطلب"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span style={{ color: "var(--theme-text-secondary)" }}>تاريخ الطلب</span>
              <span className="font-bold" style={{ color: "var(--theme-text-primary)" }} dir="ltr">
                {formatDateTime(order.createdAt)}
              </span>
            </div>

            {order.userIdentifier && (
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--theme-text-secondary)" }}>معرف الحساب / الرقم</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white px-2.5 py-1 rounded-lg border border-[var(--theme-border)]" style={{ backgroundColor: "var(--theme-background)" }}>
                    {order.userIdentifier}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(order.userIdentifier!, "المعرف")}
                    className="transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/5"
                    style={{ color: "var(--theme-text-secondary)" }}
                    title="نسخ المعرف"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="h-px my-2" style={{ backgroundColor: "var(--theme-border)" }} />

            <div className="flex justify-between items-center pt-1">
              <span className="font-bold text-base" style={{ color: "var(--theme-text-primary)" }}>المبلغ الإجمالي</span>
              <div className="text-left">
                <div className="text-2xl font-black" style={{ color: "var(--theme-accent)" }}>
                  {formatPrice(order.totalUsd)}
                </div>
                {formatPriceWithSyp(order.totalUsd).secondary && (
                  <div className="text-xs font-medium text-zinc-400 mt-0.5">
                    {formatPriceWithSyp(order.totalUsd).secondary}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Support Banner */}
        <div 
          className="rounded-3xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-3 border"
          style={{
            backgroundColor: "var(--theme-card)",
            borderColor: "var(--theme-border)",
          }}
        >
          <div>
            <div className="font-bold text-white mb-1 text-sm">هل تواجه استفساراً حول الطلب؟</div>
            <div className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>فريق الدعم الفني المباشر جاهز لمساعدتك</div>
          </div>
          <Link href="/orders">
            <Button 
              variant="outline" 
              className="rounded-2xl border text-xs h-10 px-4 cursor-pointer font-bold transition flex items-center gap-1.5"
              style={{
                backgroundColor: "var(--theme-background)",
                borderColor: "var(--theme-primary)",
                color: "var(--theme-primary)",
              }}
            >
              <HeadphonesIcon className="w-4 h-4" />
              التواصل مع الدعم
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
