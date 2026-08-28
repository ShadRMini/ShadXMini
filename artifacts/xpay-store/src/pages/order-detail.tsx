import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import { ChevronRight, Package, Clock, CheckCircle2, XCircle, HeadphonesIcon, Copy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const formatDateTime = (value: string | Date) =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value)).replace(",", "");

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
      <div className="min-h-screen bg-background p-4 pt-8">
        <Skeleton className="h-8 w-32 mb-8" />
        <Skeleton className="h-32 w-full rounded-3xl mb-4" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (!order) {
    return <div className="p-4 text-center mt-20 text-muted-foreground">الطلب غير موجود</div>;
  }

  const isAccept = order.status === "accept";
  const isReject = order.status === "reject";

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white animate-in slide-in-from-right-4 duration-300" dir="rtl">
      <div className="sticky top-0 z-10 bg-[#1A1A1A]/90 backdrop-blur-xl border-b border-[#C8A45C]/30 px-4 py-3 flex items-center gap-3">
        <Link href="/orders">
          <div className="bg-[#2D2D2D] p-2 rounded-full cursor-pointer hover:bg-[#3D3D3D] border border-[#C8A45C]/30 hover:border-[#C8A45C] transition-colors">
            <ChevronRight className="w-5 h-5 text-[#C8A45C]" />
          </div>
        </Link>
        <h1 className="font-black text-lg text-[#FDE68A]">تفاصيل الطلب</h1>
      </div>

      <div className="p-4 pb-24 space-y-6 max-w-2xl mx-auto">
        <div
          className={`p-6 rounded-3xl border relative overflow-hidden ${
            isAccept
              ? "bg-emerald-950/40 border-emerald-500/40"
              : isReject
                ? "bg-red-950/40 border-red-500/40"
                : "bg-amber-950/40 border-[#C8A45C]/40"
          }`}
        >
          <div className="flex flex-col items-center text-center relative z-10">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-lg ${
                isAccept
                  ? "bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  : isReject
                    ? "bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                    : "bg-[#C8A45C] text-[#1A1A1A] shadow-[0_0_20px_rgba(200,164,92,0.3)]"
              }`}
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
              {isAccept ? "اكتمل الطلب بنجاح" : isReject ? "تم رفض الطلب" : "الطلب قيد المراجعة"}
            </h2>
            <p className="text-sm text-zinc-300">
              {isAccept
                ? "تم تنفيذ طلبك بنجاح. شكرًا لثقتك بنا."
                : isReject
                  ? "تعذر تنفيذ الطلب. يرجى مراجعة الدعم."
                  : "طلبك قيد المعالجة، وسيتم تحديث الحالة قريبًا."}
            </p>
          </div>
        </div>

        <div className="bg-[#2D2D2D] border border-[#C8A45C]/35 rounded-3xl p-5 shadow-xl space-y-5">
          <div className="flex items-center gap-4 pb-5 border-b border-zinc-700/60">
            <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] border border-[#C8A45C]/30 overflow-hidden shrink-0 flex items-center justify-center">
              {order.productImage ? (
                <img src={order.productImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <Package className="w-8 h-8 text-[#C8A45C]/60" />
              )}
            </div>
            <div>
              <h3 className="font-black text-white mb-1 text-base">{order.productName}</h3>
              <div className="text-sm text-zinc-400">
                الكمية: <span className="font-black text-[#FDE68A]">{order.quantity}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">رقم الطلب</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-black text-[#C8A45C]">#{order.orderNumber}</span>
                <button
                  onClick={() => copyToClipboard(order.orderNumber, "رقم الطلب")}
                  className="text-zinc-400 hover:text-[#FDE68A] transition-colors cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">تاريخ الطلب</span>
              <span className="text-sm font-bold text-zinc-200" dir="ltr">
                {formatDateTime(order.createdAt)}
              </span>
            </div>

            {order.userIdentifier && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">معرف الحساب / الرقم</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-bold text-white">{order.userIdentifier}</span>
                  <button
                    onClick={() => copyToClipboard(order.userIdentifier!, "المعرف")}
                    className="text-zinc-400 hover:text-[#FDE68A] transition-colors cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="h-px bg-zinc-700/60 w-full" />

            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400 font-bold">المبلغ الإجمالي</span>
              <div className="text-left">
                <div className="text-2xl font-black text-[#FDE68A]">${order.totalUsd.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#2D2D2D] border border-[#C8A45C]/35 rounded-3xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <div className="font-bold text-white mb-1 text-sm">هل واجهت مشكلة؟</div>
            <div className="text-xs text-zinc-400">فريق الدعم الفني متواجد لمساعدتك</div>
          </div>
          <Link href="/support">
            <Button variant="outline" className="rounded-xl border-[#C8A45C]/40 bg-[#1A1A1A] hover:bg-[#383838] text-[#C8A45C] hover:text-[#FDE68A] text-xs h-10 px-4 cursor-pointer font-bold">
              <HeadphonesIcon className="w-4 h-4 ml-2" />
              تواصل معنا
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
