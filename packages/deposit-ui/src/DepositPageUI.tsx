import React, { useState } from "react";
import { Copy, Check, Clock, QrCode, Maximize2, AlertCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export interface DepositPageConfig {
  page_title?: string;
  page_subtitle?: string;
  confirm_button_text?: string;
  instructions?: string;
  bg_color?: string;
  title_color?: string;
  text_color?: string;
  button_color?: string;
  border_color?: string;
  suggested_amounts?: number[];
  minAmount?: number;
  maxAmount?: number;
}

export interface DepositPageUIProps {
  config?: DepositPageConfig;
  amount?: string;
  onAmountChange?: (v: string) => void;
  onAmountSelect?: (v: number) => void;
  currency?: string;
  onCurrencyChange?: (v: string) => void;
  walletAddress?: string;
  qrImageUrl?: string;
  onConfirm?: (e?: React.FormEvent) => void;
  isPreview?: boolean;
  isSubmitting?: boolean;
  onQrClick?: () => void;
  loading?: boolean;
}

export function DepositPageUI({
  config = {},
  amount = "",
  onAmountChange,
  onAmountSelect,
  currency = "USD",
  onCurrencyChange,
  walletAddress = "",
  qrImageUrl,
  onConfirm,
  isPreview = false,
  isSubmitting = false,
  onQrClick,
  loading = false,
}: DepositPageUIProps) {
  const [copied, setCopied] = useState(false);

  const hasQr = Boolean(qrImageUrl || (walletAddress && walletAddress.trim() !== ""));
  const qrData = walletAddress;

  const handleCopyWallet = async () => {
    if (!walletAddress || isPreview) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const minAmount = Number(config.minAmount ?? 1);
  const maxAmount = config.maxAmount ? Number(config.maxAmount) : Infinity;
  const amountNumber = Number(amount);
  const isAmountEntered = Boolean(amount && !isNaN(amountNumber) && amountNumber > 0);
  const isAmountValid =
    isAmountEntered &&
    amountNumber >= minAmount &&
    amountNumber <= maxAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview || isSubmitting || !isAmountValid) return;
    console.log("[DepositPageUI] 🔘 Triggering onConfirm with amount:", amount);
    onConfirm?.(e);
  };

  return (
    <div
      className="w-full rounded-3xl p-5 sm:p-7 shadow-xs border space-y-6 text-right transition-colors"
      style={{
        backgroundColor: "var(--shamcash-card-bg, var(--theme-card, #2D2D2D))",
        color: "var(--shamcash-text-color, var(--theme-text-primary, #FFFFFF))",
        borderColor: "var(--shamcash-border-color, var(--theme-border, rgba(200, 164, 92, 0.25)))",
      }}
      dir="rtl"
    >
      {/* Custom Title/Subtitle if passed in config */}
      {config.page_title && (
        <div className="text-center space-y-1 pb-1">
          <h1
            className="text-xl sm:text-2xl font-black tracking-tight"
            style={{ color: config.title_color || "#2563EB" }}
          >
            {config.page_title}
          </h1>
          {config.page_subtitle && (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {config.page_subtitle}
            </p>
          )}
        </div>
      )}

      {/* 1. QR Code Section (Image 2 style) */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 dark:bg-zinc-800/60 text-xs font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-zinc-700">
          <QrCode className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          <span>رمز التحويل (QR Code)</span>
        </div>

        <div className="flex justify-center py-2">
          {loading ? (
            <div
              className="animate-pulse bg-gray-200 dark:bg-zinc-800 rounded-3xl border-2 border-gray-200 dark:border-zinc-700 p-4 shadow-sm flex items-center justify-center overflow-hidden"
              style={{
                width: "100%",
                maxWidth: "340px",
                aspectRatio: "1 / 1",
              }}
            />
          ) : (
            <div
              onClick={() => {
                if (!isPreview && hasQr && onQrClick) onQrClick();
              }}
              className={`group relative bg-white dark:bg-zinc-900 rounded-3xl border-2 border-gray-200 dark:border-zinc-700 p-4 shadow-sm hover:shadow-md hover:border-blue-500/70 transition-all flex items-center justify-center overflow-hidden ${
                hasQr ? "cursor-pointer" : "cursor-default"
              }`}
              style={{
                width: "100%",
                maxWidth: "340px",
                aspectRatio: "1 / 1",
              }}
              title={hasQr ? "انقر لتكبير الرمز (1080×1080)" : undefined}
            >
              {qrImageUrl ? (
                <img
                  src={qrImageUrl}
                  alt="QR Code"
                  className="w-full h-full object-contain rounded-2xl group-hover:scale-105 transition-transform duration-300"
                />
              ) : qrData ? (
                <QRCodeSVG
                  value={qrData}
                  size={1080}
                  level="M"
                  className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-4 text-center text-amber-500 font-bold text-xs gap-2">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                  <span>لا توجد محفظة مُعدّة — يرجى التواصل مع الدعم</span>
                </div>
              )}
              {hasQr && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded-3xl">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-xs">
                    <Maximize2 className="w-4 h-4" />
                    تكبير الرمز
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Wallet Address Section (Image 2 style) */}
      <div className="space-y-2.5 text-center pt-1">
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
          <Copy className="w-3.5 h-3.5 text-blue-600" />
          <span>عنوان المحفظة / معرف الحساب</span>
        </div>

        {loading ? (
          <div className="animate-pulse bg-gray-200 dark:bg-zinc-800 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl h-11 max-w-md mx-auto shadow-2xs" />
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl p-3 max-w-md mx-auto shadow-2xs">
            <div className="font-mono font-bold text-xs sm:text-sm text-blue-600 dark:text-blue-400 select-all break-all tracking-wider">
              {walletAddress || "لا توجد محفظة مُعدّة — يرجى التواصل مع الدعم"}
            </div>
          </div>
        )}

        <div className="flex justify-center pt-0.5">
          {loading ? (
            <div className="animate-pulse h-8 w-36 rounded-xl bg-gray-200 dark:bg-zinc-800" />
          ) : (
            <button
              type="button"
              onClick={handleCopyWallet}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/60 transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-blue-600" />
                  <span>نسخ معرف المحفظة</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Suggested amounts (if defined) */}
      {Array.isArray(config.suggested_amounts) && config.suggested_amounts.length > 0 && (
        <div className="space-y-2 pt-2">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
            اختر مبلغ مقترح:
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {config.suggested_amounts.map((amt) => {
              const isSelected = amount === String(amt);
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    if (onAmountSelect) {
                      onAmountSelect(amt);
                    } else if (onAmountChange) {
                      onAmountChange(String(amt));
                    }
                  }}
                  className={`py-2 px-1 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                      : "bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
                  }`}
                >
                  ${amt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Form: Amount & Currency + Session Note + Submit Button (Image 2 style) */}
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
            المبلغ المراد شحنه <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min={minAmount}
              max={maxAmount !== Infinity ? maxAmount : undefined}
              required
              placeholder="أدخل المبلغ..."
              value={amount}
              onChange={(e) => onAmountChange?.(e.target.value)}
              readOnly={isPreview}
              className="w-full h-12 rounded-xl px-4 text-right font-mono font-bold text-base border focus:outline-hidden focus:border-blue-500 placeholder:text-gray-400"
              style={{
                backgroundColor: "var(--theme-input-bg, #3D3D3D)",
                color: "var(--theme-text-primary, #FFFFFF)",
                borderColor: "var(--theme-border, rgba(200, 164, 92, 0.25))"
              }}
            />
          </div>
          {isAmountEntered && !isAmountValid && (
            <p className="text-xs text-red-500 font-bold mt-1">
              {amountNumber < minAmount
                ? `الحد الأدنى للشحن: $${minAmount}`
                : `الحد الأقصى للشحن: $${maxAmount}`}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
            العملة <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={currency}
              onChange={(e) => onCurrencyChange?.(e.target.value)}
              disabled={isPreview}
              className="w-full h-12 rounded-xl border px-4 text-xs font-bold focus:outline-hidden focus:border-blue-500 appearance-none cursor-pointer text-right"
              style={{
                backgroundColor: "var(--theme-input-bg, #3D3D3D)",
                color: "var(--theme-text-primary, #FFFFFF)",
                borderColor: "var(--theme-border, rgba(200, 164, 92, 0.25))"
              }}
            >
              <option value="USD" style={{ backgroundColor: "var(--theme-card, #2D2D2D)", color: "var(--theme-text-primary, #FFFFFF)" }}>(دولار أمريكي) USD</option>
              <option value="SYP" style={{ backgroundColor: "var(--theme-card, #2D2D2D)", color: "var(--theme-text-primary, #FFFFFF)" }}>(ليرة سورية) SYP</option>
            </select>
          </div>
        </div>

        {/* Session Note (Image 2 exact style) */}
        <div className="rounded-2xl p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/40 flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-300">
          <Clock className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          <p className="leading-relaxed">
            سيتم إنشاء فاتورة صالحة لمدة 15 دقيقة. يرجى إتمام الدفع خلال هذه المدة.
          </p>
        </div>

        {/* Action Button (Image 2 style: light blue disabled, vibrant blue enabled) */}
        <button
          type="submit"
          disabled={!isAmountValid || isSubmitting || isPreview}
          className={`w-full h-12 rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 ${
            isAmountValid && !isSubmitting && !isPreview
              ? "bg-[#2563EB] text-white hover:bg-[#1D4ED8] active:bg-[#1E40AF] cursor-pointer shadow-lg shadow-[#2563EB]/20"
              : "bg-[#BFDBFE] text-[#1E40AF] cursor-not-allowed"
          }`}
          style={{
            backgroundColor:
              isAmountValid && !isSubmitting && !isPreview
                ? config.button_color || "#2563EB"
                : "#BFDBFE",
            color: isAmountValid && !isSubmitting && !isPreview ? "#FFFFFF" : "#1E40AF",
          }}
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              جاري فتح الفاتورة...
            </span>
          ) : (
            <>
              <span>{config.confirm_button_text || "تأكيد وفتح فاتورة"}</span>
              <span className="text-lg leading-none">←</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
