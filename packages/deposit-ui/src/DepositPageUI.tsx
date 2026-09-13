import React, { useState } from "react";
import { Copy, Check, Info } from "lucide-react";

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
  config: DepositPageConfig;
  amount?: string;
  onAmountChange?: (v: string) => void;
  onAmountSelect?: (v: number) => void;
  currency?: string;
  onCurrencyChange?: (v: string) => void;
  walletAddress?: string;
  onConfirm?: () => void;
  isPreview?: boolean;
  isSubmitting?: boolean;
}

const DEFAULTS: Required<DepositPageConfig> = {
  page_title: "شحن الرصيد",
  page_subtitle: "أضف رصيداً إلى محفظتك",
  confirm_button_text: "تأكيد وفتح فاتورة",
  instructions: "",
  bg_color: "#1A1A1A",
  title_color: "#C8A45C",
  text_color: "#E5E7EB",
  button_color: "#C8A45C",
  border_color: "#C8A45C",
  suggested_amounts: [10, 25, 50, 100, 250, 500],
};

export function DepositPageUI({
  config,
  amount = "",
  onAmountChange,
  onAmountSelect,
  currency = "USD",
  onCurrencyChange,
  walletAddress = "",
  onConfirm,
  isPreview = false,
  isSubmitting = false,
}: DepositPageUIProps) {
  const [copied, setCopied] = useState(false);
  const cfg = { ...DEFAULTS, ...config };

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

  return (
    <div
      className="w-full p-5 space-y-5 rounded-2xl transition-all"
      style={{ backgroundColor: cfg.bg_color, color: cfg.text_color }}
      dir="rtl"
    >
      {/* العنوان */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-black" style={{ color: cfg.title_color }}>
          {cfg.page_title}
        </h1>
        {cfg.page_subtitle && (
          <p className="text-sm opacity-90" style={{ color: cfg.text_color }}>
            {cfg.page_subtitle}
          </p>
        )}
      </div>

      {/* عنوان المحفظة */}
      {walletAddress && (
        <div
          className="p-3 rounded-xl flex items-center justify-between gap-2"
          style={{ border: `1px solid ${cfg.border_color}40`, backgroundColor: "rgba(0,0,0,0.2)" }}
        >
          <span className="text-xs font-mono break-all select-all" style={{ color: cfg.text_color }}>
            {walletAddress}
          </span>
          <button
            type="button"
            onClick={handleCopyWallet}
            className="p-1.5 rounded-lg hover:opacity-80 transition cursor-pointer shrink-0"
            title="نسخ المحفظة"
          >
            {copied ? (
              <Check size={16} style={{ color: cfg.title_color }} />
            ) : (
              <Copy size={16} style={{ color: cfg.title_color }} />
            )}
          </button>
        </div>
      )}

      {/* المبالغ المقترحة */}
      {Array.isArray(cfg.suggested_amounts) && cfg.suggested_amounts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold" style={{ color: cfg.title_color }}>
            المبالغ المقترحة
          </p>
          <div className="grid grid-cols-3 gap-2">
            {cfg.suggested_amounts.map((amt) => {
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
                  className="py-2 rounded-lg text-sm font-bold transition cursor-pointer"
                  style={{
                    border: `1px solid ${cfg.border_color}40`,
                    backgroundColor: isSelected ? cfg.button_color : "transparent",
                    color: isSelected ? "#000" : cfg.text_color,
                  }}
                >
                  ${amt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* حقل المبلغ والعملة */}
      <div className="space-y-2">
        <label className="text-xs font-bold" style={{ color: cfg.title_color }}>
          المبلغ المراد شحنه
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => onAmountChange?.(e.target.value)}
            placeholder="أدخل المبلغ..."
            readOnly={isPreview}
            className="flex-1 px-3 py-2.5 rounded-xl outline-none text-sm font-mono font-bold"
            style={{
              backgroundColor: "rgba(0,0,0,0.25)",
              border: `1px solid ${cfg.border_color}40`,
              color: cfg.text_color,
            }}
          />
          {onCurrencyChange && (
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              disabled={isPreview}
              className="px-3 py-2.5 rounded-xl outline-none text-xs font-bold"
              style={{
                backgroundColor: "rgba(0,0,0,0.25)",
                border: `1px solid ${cfg.border_color}40`,
                color: cfg.text_color,
              }}
            >
              <option value="USD" style={{ backgroundColor: "#1A1A1A", color: "#FFF" }}>USD</option>
              <option value="SYP" style={{ backgroundColor: "#1A1A1A", color: "#FFF" }}>SYP</option>
            </select>
          )}
        </div>
      </div>

      {/* التعليمات */}
      {cfg.instructions && (
        <div
          className="p-3 rounded-xl flex items-start gap-2"
          style={{ border: `1px solid ${cfg.border_color}40`, backgroundColor: "rgba(0,0,0,0.2)" }}
        >
          <Info size={16} style={{ color: cfg.title_color }} className="mt-0.5 shrink-0" />
          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: cfg.text_color }}>
            {cfg.instructions}
          </p>
        </div>
      )}

      {/* زر التأكيد */}
      <button
        type="button"
        onClick={() => !isPreview && onConfirm?.()}
        disabled={isPreview || isSubmitting}
        className="w-full py-3 rounded-xl font-bold text-sm transition cursor-pointer active:scale-98"
        style={{
          backgroundColor: cfg.button_color,
          color: "#000",
          opacity: isPreview ? 0.9 : (isSubmitting ? 0.7 : 1),
        }}
      >
        {isSubmitting ? "جاري..." : cfg.confirm_button_text}
      </button>
    </div>
  );
}
