import React, { useState } from "react";
import { Copy, Check, Clock, QrCode, Maximize2 } from "lucide-react";

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
}

const SHAMCASH_DEFAULT_WALLET = "35147b5811bdc0bf07fdb11b85c8a5d";

export function DepositPageUI({
  config = {},
  amount = "",
  onAmountChange,
  onAmountSelect,
  currency = "USD",
  onCurrencyChange,
  walletAddress = SHAMCASH_DEFAULT_WALLET,
  qrImageUrl,
  onConfirm,
  isPreview = false,
  isSubmitting = false,
  onQrClick,
}: DepositPageUIProps) {
  const [copied, setCopied] = useState(false);

  const effectiveQr =
    qrImageUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
      walletAddress || SHAMCASH_DEFAULT_WALLET
    )}&margin=10`;

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

  const isAmountValid = Boolean(amount && parseFloat(amount) > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview || isSubmitting || !isAmountValid) return;
    console.log("[DepositPageUI] 🔘 Triggering onConfirm with amount:", amount);
    onConfirm?.(e);
  };

  return (
    <div className="w-full bg-white dark:bg-[#1E1E1E] rounded-3xl p-5 sm:p-7 shadow-xs border border-gray-100 dark:border-zinc-800 space-y-6 text-right" dir="rtl">
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

        <div
          onClick={() => {
            if (!isPreview && onQrClick) onQrClick();
          }}
          className="group relative w-56 h-56 sm:w-64 sm:h-64 mx-auto p-3.5 rounded-2xl bg-white border-2 border-gray-200 dark:border-zinc-700 hover:border-blue-500/70 shadow-xs transition-all cursor-pointer flex items-center justify-center overflow-hidden"
          title="انقر لتكبير الرمز"
        >
          <img
            src={effectiveQr}
            alt="QR Code"
            className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded-2xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-xs">
              <Maximize2 className="w-4 h-4" />
              تكبير الرمز
            </span>
          </div>
        </div>
      </div>

      {/* 2. Wallet Address Section (Image 2 style) */}
      <div className="space-y-2.5 text-center pt-1">
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
          <Copy className="w-3.5 h-3.5 text-blue-600" />
          <span>عنوان المحفظة / معرف الحساب</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl p-3 max-w-md mx-auto shadow-2xs">
          <div className="font-mono font-bold text-xs sm:text-sm text-blue-600 dark:text-blue-400 select-all break-all tracking-wider">
            {walletAddress}
          </div>
        </div>

        <div className="flex justify-center pt-0.5">
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
              min="0.1"
              required
              placeholder="أدخل المبلغ..."
              value={amount}
              onChange={(e) => onAmountChange?.(e.target.value)}
              readOnly={isPreview}
              className="w-full h-12 bg-white dark:bg-zinc-900 rounded-xl px-4 text-right font-mono font-bold text-base border border-gray-200 dark:border-zinc-700 focus:outline-hidden focus:border-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400"
            />
          </div>
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
              className="w-full h-12 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-700 px-4 text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-hidden focus:border-blue-500 appearance-none cursor-pointer text-right"
            >
              <option value="USD">(دولار أمريكي) USD</option>
              <option value="SYP">(ليرة سورية) SYP</option>
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
          className={`w-full h-12 rounded-2xl font-bold text-sm sm:text-base shadow-xs transition-all flex items-center justify-center gap-2 ${
            isAmountValid && !isSubmitting && !isPreview
              ? "bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-blue-500/20 active:scale-98 cursor-pointer"
              : "bg-[#BFDBFE] dark:bg-blue-900/40 text-[#1E40AF] dark:text-blue-300 cursor-not-allowed opacity-80"
          }`}
          style={
            config.button_color && isAmountValid
              ? { backgroundColor: config.button_color, color: "#FFFFFF" }
              : undefined
          }
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
