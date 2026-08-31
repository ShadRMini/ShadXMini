import { useGetOrdersSummary, useListMyOrders, getListMyOrdersQueryKey, getGetOrdersSummaryQueryKey } from "@workspace/api-client-react";
import { Search, Package, Clock, CheckCircle2, XCircle, ChevronLeft, ArrowRight, RefreshCw, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

const formatShortDateTime = (value: string | Date) =>
  new Intl.DateTimeFormat("ar-SY", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));

export default function Orders() {
  const [filter, setFilter] = useState<"all" | "wait" | "accept" | "reject">("all");
  const [search, setSearch] = useState("");

  const { data: summary, isLoading: summaryLoading } = useGetOrdersSummary({
    query: { queryKey: getGetOrdersSummaryQueryKey() }
  });

  const { data: orders, isLoading: ordersLoading } = useListMyOrders(
    { status: filter === "all" ? undefined : filter },
    { query: { queryKey: getListMyOrdersQueryKey({ status: filter === "all" ? undefined : filter }) } }
  );

  const filteredOrders = orders?.filter(o => 
    search ? (o.orderNumber.includes(search) || o.productName.includes(search)) : true
  );

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'accept':
        return (
          <span 
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              color: "#10B981",
              border: "1px solid rgba(16, 185, 129, 0.35)",
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            مكتمل
          </span>
        );
      case 'reject':
        return (
          <span 
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "#EF4444",
              border: "1px solid rgba(239, 68, 68, 0.35)",
            }}
          >
            <XCircle className="w-3.5 h-3.5" />
            مرفوض
          </span>
        );
      case 'wait':
      default:
        return (
          <span 
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              backgroundColor: "rgba(245, 158, 11, 0.15)",
              color: "#F59E0B",
              border: "1px solid rgba(245, 158, 11, 0.35)",
            }}
          >
            <Clock className="w-3.5 h-3.5" />
            قيد الانتظار
          </span>
        );
    }
  };

  return (
    <div 
      className="min-h-screen pb-28 p-4 max-w-4xl mx-auto animate-in fade-in duration-300" 
      dir="rtl"
      style={{
        backgroundColor: "var(--bg-primary, #1A1A1A)",
        color: "var(--text-primary, #FFFFFF)",
      }}
    >
      {/* Page Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 
            className="text-2xl font-black mb-1"
            style={{ color: "var(--gold-light, #FDE68A)" }}
          >
            طلباتي
          </h1>
          <p 
            className="text-xs font-medium"
            style={{ color: "var(--text-muted, #9CA3AF)" }}
          >
            متابعة حالة جميع طلبات المشتريات والخدمات
          </p>
        </div>

        <Link href="/">
          <div 
            className="p-2.5 rounded-2xl border transition cursor-pointer flex items-center gap-1 text-xs font-bold"
            style={{
              backgroundColor: "var(--bg-card, #2D2D2D)",
              borderColor: "var(--border-color, #4B5563)",
              color: "var(--gold-primary, #C8A45C)",
            }}
          >
            <ArrowRight className="w-4 h-4" />
            الرئيسية
          </div>
        </Link>
      </div>

      {/* Summary Card */}
      <div 
        className="rounded-3xl p-5 mb-6 shadow-xl relative overflow-hidden transition"
        style={{
          backgroundColor: "var(--bg-card, #2D2D2D)",
          borderColor: "var(--border-color, rgba(200, 164, 92, 0.35))",
          borderWidth: "1px",
          borderStyle: "solid",
        }}
      >
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#C8A45C]/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <div 
          className="text-xs font-bold mb-1"
          style={{ color: "var(--text-muted, #9CA3AF)" }}
        >
          إجمالي المشتريات المكتملة
        </div>

        <div 
          className="text-3xl font-black mb-5 flex items-baseline gap-1"
          style={{ color: "var(--text-primary, #FFFFFF)" }}
        >
          <span style={{ color: "var(--gold-primary, #C8A45C)" }}>$</span>
          {summaryLoading ? (
            <Skeleton className="h-8 w-24 bg-zinc-800" />
          ) : (
            (summary?.totalAcceptedUsd || 0).toFixed(2)
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* All */}
          <div 
            className="rounded-2xl p-3 text-center border transition"
            style={{
              backgroundColor: "var(--bg-primary, #1A1A1A)",
              borderColor: "var(--border-color, #3D3D3D)",
            }}
          >
            <div className="text-xs mb-1" style={{ color: "var(--text-muted, #9CA3AF)" }}>الكل</div>
            <div className="font-black text-base" style={{ color: "var(--text-primary, #FFFFFF)" }}>
              {summaryLoading ? <Skeleton className="h-5 w-8 mx-auto bg-zinc-800" /> : summary?.totalCount || 0}
            </div>
          </div>

          {/* Accept */}
          <div 
            className="rounded-2xl p-3 text-center border transition"
            style={{
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              borderColor: "rgba(16, 185, 129, 0.3)",
            }}
          >
            <div className="text-xs mb-1 text-emerald-400">المكتملة</div>
            <div className="font-black text-base text-emerald-400">
              {summaryLoading ? <Skeleton className="h-5 w-8 mx-auto bg-zinc-800" /> : summary?.acceptCount || 0}
            </div>
          </div>

          {/* Wait */}
          <div 
            className="rounded-2xl p-3 text-center border transition"
            style={{
              backgroundColor: "rgba(245, 158, 11, 0.12)",
              borderColor: "rgba(245, 158, 11, 0.3)",
            }}
          >
            <div className="text-xs mb-1 text-amber-400">بالانتظار</div>
            <div className="font-black text-base text-amber-400">
              {summaryLoading ? <Skeleton className="h-5 w-8 mx-auto bg-zinc-800" /> : summary?.waitCount || 0}
            </div>
          </div>

          {/* Reject */}
          <div 
            className="rounded-2xl p-3 text-center border transition"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              borderColor: "rgba(239, 68, 68, 0.3)",
            }}
          >
            <div className="text-xs mb-1 text-rose-400">المرفوضة</div>
            <div className="font-black text-base text-rose-400">
              {summaryLoading ? <Skeleton className="h-5 w-8 mx-auto bg-zinc-800" /> : (summary?.rejectCount || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {(["all", "wait", "accept", "reject"] as const).map(f => {
          const labels = { all: "الكل", wait: "قيد الانتظار", accept: "مكتمل", reject: "مرفوض" };
          const isActive = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition cursor-pointer"
              style={{
                backgroundColor: isActive 
                  ? "var(--gold-primary, #C8A45C)" 
                  : "var(--bg-card, #2D2D2D)",
                color: isActive 
                  ? "#1A1A1A" 
                  : "var(--text-secondary, #E5E7EB)",
                borderColor: isActive 
                  ? "var(--gold-primary, #C8A45C)" 
                  : "var(--border-color, #4B5563)",
                borderWidth: "1px",
                borderStyle: "solid",
                boxShadow: isActive ? "0 0 12px rgba(200, 164, 92, 0.35)" : "none",
              }}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search 
          className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--gold-primary, #C8A45C)" }}
        />
        <Input 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث برقم الطلب أو اسم المنتج..." 
          className="pl-3 pr-10 h-12 rounded-2xl text-sm placeholder:text-zinc-500 border transition"
          style={{
            backgroundColor: "var(--bg-card, #2D2D2D)",
            borderColor: "var(--border-color, #4B5563)",
            color: "var(--text-primary, #FFFFFF)",
          }}
        />
      </div>

      {/* Order List */}
      <div className="space-y-3">
        {ordersLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div 
              key={i} 
              className="p-4 rounded-2xl flex gap-3 border"
              style={{
                backgroundColor: "var(--bg-card, #2D2D2D)",
                borderColor: "var(--border-color, #3D3D3D)",
              }}
            >
              <Skeleton className="w-14 h-14 rounded-xl shrink-0 bg-zinc-800" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-3/4 bg-zinc-800" />
                <Skeleton className="h-3 w-1/2 bg-zinc-800" />
              </div>
            </div>
          ))
        ) : filteredOrders && filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="p-4 rounded-2xl border transition-all duration-200 group relative overflow-hidden"
              style={{
                backgroundColor: "var(--bg-card, #2D2D2D)",
                borderColor: "var(--border-color, rgba(200, 164, 92, 0.25))",
                borderWidth: "1px",
                borderStyle: "solid",
              }}
            >
              <div className="flex items-center gap-3.5">
                {/* Product Thumbnail */}
                <div 
                  className="w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border"
                  style={{
                    backgroundColor: "var(--bg-primary, #1A1A1A)",
                    borderColor: "var(--border-color, rgba(200, 164, 92, 0.3))",
                  }}
                >
                  {order.productImage ? (
                    <img src={order.productImage} alt={order.productName} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-7 h-7" style={{ color: "var(--gold-primary, #C8A45C)" }} />
                  )}
                </div>
                
                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <Link href={`/orders/${order.id}`}>
                      <h3 
                        className="text-sm font-bold truncate transition cursor-pointer hover:underline"
                        style={{ color: "var(--text-primary, #FFFFFF)" }}
                      >
                        {order.productName}
                      </h3>
                    </Link>
                    <div 
                      className="text-sm font-black shrink-0"
                      style={{ color: "var(--gold-light, #FDE68A)" }}
                    >
                      ${order.totalUsd.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap justify-between items-center gap-2 mt-2">
                    <div 
                      className="flex items-center gap-2 text-xs"
                      style={{ color: "var(--text-muted, #9CA3AF)" }}
                    >
                      <span 
                        className="font-mono font-bold"
                        style={{ color: "var(--gold-primary, #C8A45C)" }}
                      >
                        #{order.orderNumber}
                      </span>
                      <span>•</span>
                      <span>{formatShortDateTime(order.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={order.status} />

                      <Link href={`/orders/${order.id}`}>
                        <button
                          type="button"
                          className="px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          style={{
                            backgroundColor: "var(--gold-primary, #C8A45C)",
                            color: "#1A1A1A",
                          }}
                        >
                          التفاصيل
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div 
            className="flex flex-col items-center justify-center py-16 text-center rounded-3xl p-6"
            style={{
              backgroundColor: "var(--bg-card, #2D2D2D)",
              borderColor: "var(--border-color, rgba(200, 164, 92, 0.3))",
              borderWidth: "1px",
              borderStyle: "dashed",
            }}
          >
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border"
              style={{
                backgroundColor: "var(--bg-primary, #1A1A1A)",
                borderColor: "var(--border-color, rgba(200, 164, 92, 0.3))",
                color: "var(--gold-primary, #C8A45C)",
              }}
            >
              <Package className="w-8 h-8" />
            </div>
            <p 
              className="font-bold text-base mb-1"
              style={{ color: "var(--text-primary, #FFFFFF)" }}
            >
              لا توجد طلبات متطابقة
            </p>
            <p 
              className="text-xs max-w-[240px] mb-5"
              style={{ color: "var(--text-muted, #9CA3AF)" }}
            >
              لم تقم بأي طلبات بعد في هذه الفئة. يمكنك تصفح كافة الخدمات والمنتجات المتاحة في المتجر.
            </p>

            <Link href="/">
              <button
                type="button"
                className="px-6 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-[#C8A45C]/20"
                style={{
                  backgroundColor: "var(--gold-primary, #C8A45C)",
                  color: "#1A1A1A",
                }}
              >
                <ShoppingBag className="w-4 h-4" />
                تصفح أقسام المتجر
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

