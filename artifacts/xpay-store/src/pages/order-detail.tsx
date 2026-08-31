import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import { ChevronRight, Package, Clock, CheckCircle2, XCircle, HeadphonesIcon, Copy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
          backgroundColor: "var(--bg-primary, #1A1A1A)",
          color: "var(--text-primary, #FFFFFF)",
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
          backgroundColor: "var(--bg-primary, #1A1A1A)",
          color: "var(--text-muted, #9CA3AF)",
        }}
      >
        <div 
          className="p-6 rounded-3xl border mb-4 max-w-sm w-full"
          style={{
            backgroundColor: "var(--bg-card, #2D2D2D)",
            borderColor: "var(--border-color, #4B5563)",
          }}
        >
          <Package className="w-12 h-12 mx-auto mb-2" style={{ color: "var(--gold-primary, #C8A45C)" }} />
          <p className="font-bold text-lg" style={{ color: "var(--text-primary, #FFFFFF)" }}>الطلب غير موجود</p>
          <p className="text-xs mt-1">تأكد من رقم الطلب أو حاول الوصول إليه من قائمة طلباتي</p>
        </div>
        <Link href="/orders">
          <Button 
            className="rounded-2xl font-bold cursor-pointer"
            style={{
              backgroundColor: "var(--gold-primary, #C8A45C)",
              color: "#1A1A1A",
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
        backgroundColor: "var(--bg-primary, #1A1A1A)",
        color: "var(--text-primary, #FFFFFF)",
      }}
    >
      {/* Top Bar */}
      <div 
        className="sticky top-0 z-10 backdrop-blur-xl border-b px-4 py-3 flex items-center gap-3"
        style={{
          backgroundColor: "rgba(26, 26, 26, 0.9)",
          borderColor: "var(--border-color, rgba(200, 164, 92, 0.3))",
        }}
      >
        <Link href="/orders">
          <div 
            className="p-2 rounded-full cursor-pointer transition border"
            style={{
              backgroundColor: "var(--bg-card, #2D2D2D)",
              borderColor: "var(--border-color, rgba(200, 164, 92, 0.3))",
              color: "var(--gold-primary, #C8A45C)",
            }}
          >
            <ChevronRight className="w-5 h-5" />
          </div>
        </Link>
        <h1 
          className="font-black text-lg"
          style={{ color: "var(--gold-light, #FDE68A)" }}
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
                    : "#C8A45C",
                color: isAccept || isReject ? "#FFFFFF" : "#1A1A1A",
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
            backgroundColor: "var(--bg-card, #2D2D2D)",
            borderColor: "var(--border-color, rgba(200, 164, 92, 0.35))",
          }}
        >
          {/* Header Item Info */}
          <div 
            className="flex items-center gap-4 pb-5 border-b"
            style={{ borderColor: "var(--border-color, rgba(255, 255, 255, 0.1))" }}
          >
            <div 
              className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center border"
              style={{
                backgroundColor: "var(--bg-primary, #1A1A1A)",
                borderColor: "var(--border-color, rgba(200, 164, 92, 0.3))",
              }}
            >
              {order.productImage ? (
                <img src={order.productImage} alt={order.productName} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-8 h-8" style={{ color: "var(--gold-primary, #C8A45C)" }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-white mb-1 text-base truncate">{order.productName}</h3>
              <div className="text-sm" style={{ color: "var(--text-muted, #9CA3AF)" }}>
                الكمية المطلوبة: <span className="font-black" style={{ color: "var(--gold-light, #FDE68A)" }}>{order.quantity}</span>
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center">
              <span style={{ color: "var(--text-muted, #9CA3AF)" }}>رقم الطلب</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black" style={{ color: "var(--gold-primary, #C8A45C)" }}>
                  #{order.orderNumber}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(order.orderNumber, "رقم الطلب")}
                  className="transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/5"
                  style={{ color: "var(--text-muted, #9CA3AF)" }}
                  title="نسخ رقم الطلب"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span style={{ color: "var(--text-muted, #9CA3AF)" }}>تاريخ الطلب</span>
              <span className="font-bold" style={{ color: "var(--text-secondary, #E5E7EB)" }} dir="ltr">
                {formatDateTime(order.createdAt)}
              </span>
            </div>

            {order.userIdentifier && (
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--text-muted, #9CA3AF)" }}>معرف الحساب / الرقم</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white bg-[#1A1A1A] px-2.5 py-1 rounded-lg border border-[#4B5563]">
                    {order.userIdentifier}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(order.userIdentifier!, "المعرف")}
                    className="transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/5"
                    style={{ color: "var(--text-muted, #9CA3AF)" }}
                    title="نسخ المعرف"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="h-px my-2" style={{ backgroundColor: "var(--border-color, rgba(255, 255, 255, 0.1))" }} />

            <div className="flex justify-between items-center pt-1">
              <span className="font-bold text-base" style={{ color: "var(--text-primary, #FFFFFF)" }}>المبلغ الإجمالي</span>
              <div className="text-left">
                <div className="text-2xl font-black" style={{ color: "var(--gold-light, #FDE68A)" }}>
                  ${order.totalUsd.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Support Banner */}
        <div 
          className="rounded-3xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-3 border"
          style={{
            backgroundColor: "var(--bg-card, #2D2D2D)",
            borderColor: "var(--border-color, rgba(200, 164, 92, 0.35))",
          }}
        >
          <div>
            <div className="font-bold text-white mb-1 text-sm">هل تواجه استفساراً حول الطلب؟</div>
            <div className="text-xs" style={{ color: "var(--text-muted, #9CA3AF)" }}>فريق الدعم الفني المباشر جاهز لمساعدتك</div>
          </div>
          <Link href="/support">
            <Button 
              variant="outline" 
              className="rounded-2xl border text-xs h-10 px-4 cursor-pointer font-bold transition flex items-center gap-1.5"
              style={{
                backgroundColor: "var(--bg-primary, #1A1A1A)",
                borderColor: "var(--gold-primary, #C8A45C)",
                color: "var(--gold-primary, #C8A45C)",
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
