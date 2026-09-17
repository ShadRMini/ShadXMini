import { useGetDepositsSummary, useListMyDeposits, getGetDepositsSummaryQueryKey, getListMyDepositsQueryKey } from "@workspace/api-client-react";
import { Search, Receipt, Clock, CheckCircle2, XCircle, ArrowDownToLine } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/lib/currency-context";

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
  const { formatPrice, formatPriceWithSyp } = useCurrency();

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
    <div 
      className="min-h-screen pb-24 p-4 animate-in fade-in duration-300" 
      dir="rtl"
      style={{
        backgroundColor: "var(--theme-background)",
        color: "var(--theme-text-primary)",
      }}
    >
      <div className="max-w-xl mx-auto">
        <h1 
          className="text-xl font-black mb-4"
          style={{ color: "var(--theme-accent)" }}
        >
          دفعاتي المالية
        </h1>

        {/* Summary Card */}
        <div 
          className="rounded-3xl p-5 mb-6 shadow-xl relative overflow-hidden transition"
          style={{
            backgroundColor: "var(--theme-card)",
            border: "1px solid var(--theme-border)",
            color: "var(--theme-text-primary)",
          }}
        >
          <div 
            className="absolute top-0 left-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 pointer-events-none"
            style={{ backgroundColor: "var(--theme-primary)", opacity: 0.15 }}
          />
          
          <div 
            className="text-xs font-bold mb-1"
            style={{ color: "var(--theme-primary)" }}
          >
            إجمالي الشحن المقبول
          </div>
          <div 
            className="text-3xl font-black mb-5 flex items-baseline gap-2 flex-wrap"
            style={{ color: "var(--theme-text-primary)" }}
          >
            {summaryLoading ? (
              <Skeleton className="h-8 w-24 bg-zinc-800" />
            ) : (
              <>
                <span>{formatPrice(summary?.totalApprovedUsd || 0)}</span>
                {formatPriceWithSyp(summary?.totalApprovedUsd || 0).secondary && (
                  <span className="text-xs font-medium" style={{ color: "var(--theme-text-muted)" }}>
                    {formatPriceWithSyp(summary?.totalApprovedUsd || 0).secondary}
                  </span>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div 
              className="rounded-2xl p-3 text-center border transition"
              style={{
                backgroundColor: "var(--theme-background)",
                borderColor: "var(--theme-border)",
              }}
            >
              <div className="text-[11px] mb-1" style={{ color: "var(--theme-text-muted)" }}>الكل</div>
              <div className="font-bold" style={{ color: "var(--theme-text-primary)" }}>
                {summaryLoading ? <Skeleton className="h-5 w-8 mx-auto bg-zinc-800" /> : summary?.totalCount || 0}
              </div>
            </div>
            <div 
              className="rounded-2xl p-3 text-center border transition"
              style={{
                backgroundColor: "rgba(16, 185, 129, 0.12)",
                borderColor: "rgba(16, 185, 129, 0.3)",
              }}
            >
              <div className="text-[11px] text-emerald-400 mb-1">مكتملة</div>
              <div className="font-bold text-emerald-400">
                {summaryLoading ? <Skeleton className="h-5 w-8 mx-auto bg-zinc-800" /> : summary?.approvedCount || 0}
              </div>
            </div>
            <div 
              className="rounded-2xl p-3 text-center border transition"
              style={{
                backgroundColor: "rgba(245, 158, 11, 0.12)",
                borderColor: "rgba(245, 158, 11, 0.3)",
              }}
            >
              <div className="text-[11px] text-amber-400 mb-1">بالانتظار</div>
              <div className="font-bold text-amber-400">
                {summaryLoading ? <Skeleton className="h-5 w-8 mx-auto bg-zinc-800" /> : summary?.pendingCount || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {(["all", "pending", "approved", "rejected"] as const).map(f => {
            const labels = { all: "الكل", pending: "قيد الانتظار", approved: "مقبول", rejected: "مرفوض" };
            const isActive = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer"
                style={{
                  backgroundColor: isActive ? "var(--theme-primary)" : "var(--theme-card)",
                  color: isActive ? "#1A1A1A" : "var(--theme-text-muted)",
                  border: `1px solid ${isActive ? "var(--theme-primary)" : "var(--theme-border)"}`,
                }}
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
              <div 
                key={i} 
                className="p-4 rounded-2xl flex gap-3 border"
                style={{
                  backgroundColor: "var(--theme-card)",
                  borderColor: "var(--theme-border)",
                }}
              >
                <Skeleton className="w-12 h-12 rounded-xl shrink-0 bg-zinc-800" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="h-4 w-3/4 bg-zinc-800" />
                  <Skeleton className="h-3 w-1/2 bg-zinc-800" />
                </div>
              </div>
            ))
          ) : deposits && deposits.length > 0 ? (
            deposits.map((deposit) => (
              <div 
                key={deposit.id} 
                className="p-4 rounded-2xl flex items-center gap-4 transition-colors shadow-md border"
                style={{
                  backgroundColor: "var(--theme-card)",
                  borderColor: "var(--theme-border)",
                  color: "var(--theme-text-primary)",
                }}
              >
                <div 
                  className="w-12 h-12 rounded-xl border overflow-hidden shrink-0 flex items-center justify-center"
                  style={{
                    backgroundColor: "var(--theme-background)",
                    borderColor: "var(--theme-border)",
                  }}
                >
                  <ArrowDownToLine className="w-6 h-6" style={{ color: "var(--theme-primary)" }} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-sm font-bold truncate pl-2" style={{ color: "var(--theme-text-primary)" }}>
                      {deposit.methodLabel}
                    </h3>
                    <div className="text-sm font-black shrink-0" style={{ color: "var(--theme-accent)" }}>
                      +{formatPrice(deposit.amountUsd)}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-xs truncate max-w-[150px]" dir="ltr" style={{ color: "var(--theme-text-muted)" }}>
                      Txn: {deposit.transactionId}
                    </div>
                    <StatusBadge status={deposit.status} />
                  </div>
                  
                  <div className="text-[10px]" style={{ color: "var(--theme-text-muted)" }}>
                    {formatDateTime(deposit.createdAt)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div 
              className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-3xl"
              style={{
                backgroundColor: "var(--theme-card)",
                borderColor: "var(--theme-border)",
                color: "var(--theme-text-primary)",
              }}
            >
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border"
                style={{
                  backgroundColor: "var(--theme-background)",
                  borderColor: "var(--theme-border)",
                  color: "var(--theme-primary)",
                }}
              >
                <Receipt className="w-8 h-8" />
              </div>
              <p className="font-bold mb-1" style={{ color: "var(--theme-text-primary)" }}>
                لا توجد عمليات إيداع
              </p>
              <p className="text-xs max-w-[200px]" style={{ color: "var(--theme-text-muted)" }}>
                لم تقم بأي عمليات شحن بعد.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
