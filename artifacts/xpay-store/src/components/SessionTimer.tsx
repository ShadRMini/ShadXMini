import React, { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface SessionTimerProps {
  expiresAt?: string | null;
  durationMinutes?: number;
  onExpired?: () => void;
  className?: string;
}

export function SessionTimer({
  expiresAt,
  durationMinutes = 15,
  onExpired,
  className = "",
}: SessionTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (expiresAt) {
      const exp = new Date(expiresAt).getTime();
      const now = Date.now();
      return Math.max(0, Math.floor((exp - now) / 1000));
    }
    return durationMinutes * 60;
  });

  useEffect(() => {
    if (expiresAt) {
      const exp = new Date(expiresAt).getTime();
      const now = Date.now();
      setTimeLeft(Math.max(0, Math.floor((exp - now) / 1000)));
    }
  }, [expiresAt]);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (onExpired) onExpired();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onExpired) onExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onExpired]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isExpired = timeLeft <= 0;
  const isRed = timeLeft < 120 && timeLeft > 0; // < 2 minutes: #EF4444
  const isOrange = timeLeft >= 120 && timeLeft <= 300; // 2-5 minutes: #F59E0B
  const isGreen = timeLeft > 300; // > 5 minutes: #10B981

  return (
    <div
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-mono font-bold transition-colors shadow-xs ${
        isExpired
          ? "border-red-500/50 bg-red-500/15 text-[#EF4444]"
          : isRed
          ? "border-red-500/60 bg-red-500/15 text-[#EF4444] animate-pulse"
          : isOrange
          ? "border-amber-500/50 bg-amber-500/15 text-[#F59E0B]"
          : "border-emerald-500/50 bg-emerald-500/15 text-[#10B981]"
      } ${className}`}
      dir="rtl"
    >
      {isExpired ? (
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <Clock className={`w-3.5 h-3.5 shrink-0 ${isRed ? "animate-spin" : ""}`} />
      )}
      <span>
        {isExpired ? (
          "انتهت صلاحية الفاتورة"
        ) : (
          <>
            الوقت المتبقي:{" "}
            <span className="tracking-wider">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
          </>
        )}
      </span>
    </div>
  );
}

export default SessionTimer;
