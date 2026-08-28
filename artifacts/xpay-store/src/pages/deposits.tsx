import { useGetDepositsSummary, useListMyDeposits, getGetDepositsSummaryQueryKey, getListMyDepositsQueryKey } from "@workspace/api-client-react";
import { Search, Receipt, Clock, CheckCircle2, XCircle, ArrowDownToLine } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const formatDateTime = (value: string | Date) =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value)).replace(",", "");

export default function DepositsList() {
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const { data: summary, isLoading: summaryLoading } = useGetDepositsSummary({
    query: { queryKey: getGetDepositsSummaryQueryKey() }
  });

  const { data: deposits, isLoading: depositsLoading } = useListMyDeposits(
    { status: filter === "all" ? undefined : filter },
    { query: { queryKey: getListMyDepositsQueryKey({ status: filter === "all" ? undefined : filter }) } }
  );

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'approved': return <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded text-[10px] font-bold">مقبول</span>;
      case 'rejected': return <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded text-[10px] font-bold">مرفوض</span>;
      case 'pending': default: return <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded text-[10px] font-bold">قيد الانتظار</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white pb-24 p-4 animate-in fade-in duration-300" dir="rtl">
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl font-black text-[#FDE68A] mb-4">سجل الإيداعات والمحفظة</h1>

        {/* Summary Card */}
        <div className="bg-[#2D2D2D] border border-[#C8A45C]/35 rounded-3xl p-5 mb-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-[#C8A45C]/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
          
          <div className="text-xs font-bold text-[#C8A45C] mb-1">إجمالي الشحن المقبول</div>
          <div className="text-3xl font-black text-white mb-5 flex items-baseline gap-1">
            <span className="text-[#C8A45C]">$</span>
            {summaryLoading ? <Skeleton className="h-8 w-24 bg-zinc-800" /> : (summary?.totalApprovedUsd || 0).toFixed(2)}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#1A1A1A] rounded-2xl p-3 text-center border border-[#C8A45C]/20">
              <div className="text-[11px] text-zinc-400 mb-1">الكل</div>
              <div className="font-bold text-white">{summaryLoading ? <Skeleton className="h-5 w-8 mx-auto bg-zinc-800" /> : summary?.totalCount || 0}</div>
            </div>
            <div className="bg-emerald-950/40 rounded-2xl p-3 text-center border border-emerald-500/30">
              <div className="text-[11px] text-emerald-400 mb-1">مكتملة</div>
              <div className="font-bold text-emerald-400">{summaryLoading ? <Skeleton className="h-5 w-8 mx-auto bg-zinc-800" /> : summary?.approvedCount || 0}</div>
            </div>
            <div className="bg-amber-950/40 rounded-2xl p-3 text-center border border-[#C8A45C]/30">
              <div className="text-[11px] text-[#FDE68A] mb-1">بالانتظار</div>
              <div className="font-bold text-[#FDE68A]">{summaryLoading ? <Skeleton className="h-5 w-8 mx-auto bg-zinc-800" /> : summary?.pendingCount || 0}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {(["all", "pending", "approved", "rejected"] as const).map(f => {
            const labels = { all: "الكل", pending: "قيد الانتظار", approved: "مقبول", rejected: "مرفوض" };
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  filter === f 
                    ? "bg-[#C8A45C] text-[#1A1A1A] shadow-sm" 
                    : "bg-[#2D2D2D] border border-zinc-700 text-zinc-400 hover:text-white hover:border-[#C8A45C]/50"
                }`}
              >
                {labels[f]}
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="space-y-3">
          {depositsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[#2D2D2D] border border-zinc-800 p-4 rounded-2xl flex gap-3">
                <Skeleton className="w-12 h-12 rounded-xl shrink-0 bg-zinc-800" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="h-4 w-3/4 bg-zinc-800" />
                  <Skeleton className="h-3 w-1/2 bg-zinc-800" />
                </div>
              </div>
            ))
          ) : deposits && deposits.length > 0 ? (
            deposits.map((deposit) => (
              <div key={deposit.id} className="bg-[#2D2D2D] border border-[#C8A45C]/25 p-4 rounded-2xl flex items-center gap-4 transition-colors shadow-md">
                <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] border border-[#C8A45C]/30 overflow-hidden shrink-0 flex items-center justify-center">
                  <ArrowDownToLine className="w-6 h-6 text-[#C8A45C]" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-sm font-bold text-white truncate pl-2">{deposit.methodLabel}</h3>
                    <div className="text-sm font-black text-[#FDE68A] shrink-0">
                      +${deposit.amountUsd.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-xs text-zinc-400 truncate max-w-[150px]" dir="ltr">
                      Txn: {deposit.transactionId}
                    </div>
                    <StatusBadge status={deposit.status} />
                  </div>
                  
                  <div className="text-[10px] text-zinc-400">
                    {formatDateTime(deposit.createdAt)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#C8A45C]/20 rounded-3xl bg-[#2D2D2D]/60">
              <div className="w-16 h-16 bg-[#1A1A1A] rounded-2xl flex items-center justify-center mb-4 border border-[#C8A45C]/30 text-[#C8A45C]">
                <Receipt className="w-8 h-8" />
              </div>
              <p className="text-white font-bold mb-1">لا توجد عمليات إيداع</p>
              <p className="text-xs text-zinc-400 max-w-[200px]">
                لم تقم بأي عمليات شحن بعد.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
