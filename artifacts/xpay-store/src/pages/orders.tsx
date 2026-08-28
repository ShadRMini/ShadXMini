import { useGetOrdersSummary, useListMyOrders, getListMyOrdersQueryKey, getGetOrdersSummaryQueryKey } from "@workspace/api-client-react";
import { Search, Package, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

const formatShortDateTime = (value: string | Date) =>
  new Intl.DateTimeFormat("en", {
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

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'accept': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'reject': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'wait': default: return <Clock className="w-4 h-4 text-amber-500" />;
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'accept': return <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded text-[10px] font-bold">مكتمل</span>;
      case 'reject': return <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded text-[10px] font-bold">مرفوض</span>;
      case 'wait': default: return <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded text-[10px] font-bold">قيد الانتظار</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white pb-24 p-4 max-w-4xl mx-auto animate-in fade-in duration-300" dir="rtl">
      <h1 className="text-2xl font-black text-[#FDE68A] mb-4">سجل الطلبات</h1>

      {/* Summary Card */}
      <div className="bg-[#2D2D2D] border border-[#C8A45C]/35 rounded-3xl p-5 mb-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C8A45C]/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <div className="text-xs text-zinc-400 font-bold mb-1">إجمالي المشتريات المكتملة</div>
        <div className="text-3xl font-black text-white mb-5 flex items-baseline gap-1">
          <span className="text-[#C8A45C]">$</span>
          {summaryLoading ? <Skeleton className="h-8 w-24 bg-zinc-800" /> : (summary?.totalAcceptedUsd || 0).toFixed(2)}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#1A1A1A] rounded-2xl p-3 text-center border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">الكل</div>
            <div className="font-black text-white text-base">{summaryLoading ? <Skeleton className="h-5 w-8 mx-auto bg-zinc-800" /> : summary?.totalCount || 0}</div>
          </div>
          <div className="bg-emerald-950/40 rounded-2xl p-3 text-center border border-emerald-800/40">
            <div className="text-xs text-emerald-400 mb-1">مكتملة</div>
            <div className="font-black text-emerald-400 text-base">{summaryLoading ? <Skeleton className="h-5 w-8 mx-auto bg-zinc-800" /> : summary?.acceptCount || 0}</div>
          </div>
          <div className="bg-amber-950/40 rounded-2xl p-3 text-center border border-amber-800/40">
            <div className="text-xs text-[#FDE68A] mb-1">بالانتظار</div>
            <div className="font-black text-[#FDE68A] text-base">{summaryLoading ? <Skeleton className="h-5 w-8 mx-auto bg-zinc-800" /> : summary?.waitCount || 0}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {(["all", "wait", "accept", "reject"] as const).map(f => {
          const labels = { all: "الكل", wait: "قيد الانتظار", accept: "مكتمل", reject: "مرفوض" };
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition cursor-pointer ${
                filter === f 
                  ? "bg-[#C8A45C] text-[#1A1A1A] shadow-md shadow-[#C8A45C]/30" 
                  : "bg-[#2D2D2D] border border-[#4B5563] text-zinc-300 hover:border-[#C8A45C]/60 hover:text-white"
              }`}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C8A45C]" />
        <Input 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث برقم الطلب أو اسم المنتج..." 
          className="pl-3 pr-10 h-12 bg-[#2D2D2D] border-[#4B5563] focus-visible:border-[#C8A45C] focus-visible:ring-[#C8A45C] text-white rounded-2xl text-sm placeholder:text-zinc-500"
        />
      </div>

      {/* List */}
      <div className="space-y-3">
        {ordersLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#2D2D2D] border border-zinc-800 p-4 rounded-2xl flex gap-3">
              <Skeleton className="w-12 h-12 rounded-xl shrink-0 bg-zinc-800" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-3/4 bg-zinc-800" />
                <Skeleton className="h-3 w-1/2 bg-zinc-800" />
              </div>
            </div>
          ))
        ) : filteredOrders && filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <div className="bg-[#2D2D2D] hover:bg-[#383838] border border-[#C8A45C]/25 hover:border-[#C8A45C] p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(200,164,92,0.15)] group">
                <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] border border-[#C8A45C]/30 overflow-hidden shrink-0 flex items-center justify-center">
                  {order.productImage ? (
                    <img src={order.productImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-6 h-6 text-[#C8A45C]/60" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-sm font-bold text-white truncate pl-2 group-hover:text-[#FDE68A] transition-colors">{order.productName}</h3>
                    <div className="text-sm font-black text-[#FDE68A] shrink-0">${order.totalUsd.toFixed(2)}</div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span className="font-mono text-[#C8A45C]">#{order.orderNumber}</span>
                      <span>•</span>
                      <span>{formatShortDateTime(order.createdAt)}</span>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#C8A45C]/30 rounded-3xl bg-[#2D2D2D]/60">
            <div className="w-16 h-16 bg-[#1A1A1A] rounded-2xl flex items-center justify-center mb-4 border border-[#C8A45C]/30 text-[#C8A45C]">
              <Package className="w-8 h-8" />
            </div>
            <p className="text-white font-bold mb-1">لا توجد طلبات</p>
            <p className="text-xs text-zinc-400 max-w-[200px]">
              لم تقم بأي طلبات بعد. ابدأ بالتسوق الآن من الصفحة الرئيسية.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
